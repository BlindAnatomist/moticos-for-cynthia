#!/usr/bin/env python3
"""Lossless SHA-256 payload deduplication over the existing bounded packer.

Every original path and byte is restored. No images, exports, reports or traces
are recompressed individually, omitted, truncated, or downsampled.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tempfile
import preserveEvidence as bounded
import restoreCollageEvidence as bounded_restore

DIRECTORIES = ('preflight-results', 'batch-test-results', 'rollback-test-results', 'test-results')
INDEX = 'preflight-results/objects-index.json'
ENCODING = 'moticos-lossless-sha256-objects-v1'
MIB = 1024 * 1024
# Eight MiB per profile is reserved for an independently uploaded diagnosis.
PART_LIMIT = 45 * MIB
TOTAL_LIMIT = 90 * MIB

def build_payload(source, stage):
    source, stage = Path(source).resolve(), Path(stage)
    members, missing = bounded._source_members(source, DIRECTORIES)
    objects = stage / 'preflight-results/objects'; objects.mkdir(parents=True)
    records, unique = [], {}
    for relative, path, signature in members:
        for parent in path.parents:
            if parent == source: break
            if parent.is_symlink() or not parent.is_dir(): raise bounded.EvidenceError('Source ancestry changed')
        fd, name = tempfile.mkstemp(dir=objects, prefix='.pending-')
        temporary = Path(name)
        try:
            digest, count = hashlib.sha256(), 0
            with bounded._open_regular(path) as original, os.fdopen(fd, 'wb') as copy:
                if bounded._signature(os.fstat(original.fileno())) != signature: raise bounded.EvidenceError('Source changed before read')
                while True:
                    block = original.read(1024 * 1024)
                    if not block: break
                    copy.write(block); digest.update(block); count += len(block)
                if bounded._signature(os.fstat(original.fileno())) != signature: raise bounded.EvidenceError('Source changed during read')
            sha = digest.hexdigest(); destination = objects / f'{sha}.bin'
            if sha in unique:
                if unique[sha] != count: raise bounded.EvidenceError('Digest/size mismatch')
                temporary.unlink()
            else:
                os.replace(temporary, destination); unique[sha] = count
            records.append({'path': relative, 'bytes': count, 'sha256': sha})
        finally:
            temporary.unlink(missing_ok=True)
    index = {'encoding': ENCODING, 'complete': True, 'included_directories': list(DIRECTORIES),
             'missing_directories': missing, 'source_members': records,
             'logicalFiles': len(records), 'uniquePayloads': len(unique),
             'rawBytes': sum(record['bytes'] for record in records), 'uniqueBytes': sum(unique.values())}
    index['duplicateBytes'] = index['rawBytes'] - index['uniqueBytes']
    (stage / INDEX).write_text(json.dumps(index, indent=2) + '\n')
    return index

def pack(source, output, github_output=None):
    source, output = Path(source).resolve(), Path(output).absolute()
    if output.exists(): raise bounded.EvidenceError('Use a new output directory')
    if output == source or any(output == source/directory or source/directory in output.parents for directory in DIRECTORIES):
        raise bounded.EvidenceError('Keep package output outside included source trees')
    output.mkdir(parents=True)
    with tempfile.TemporaryDirectory(prefix='moticos-evidence-payload-') as temp:
        stage = Path(temp); index = build_payload(source, stage)
        args = ['pack','--archive',str(output/'evidence.tar.gz'),'--out',str(output/'parts'),
                '--root',str(stage),'--include','preflight-results','--chunk-bytes',str(PART_LIMIT-MIB),'--max-parts','2']
        if github_output: args += ['--github-output',github_output]
        manifest = bounded.preserve(bounded.parser().parse_args(args))
        metadata = (output/'parts/manifest.json').stat().st_size
        upper = sum(part['bytes'] + metadata + 4096 for part in manifest['parts'])
        if any(part['bytes'] + metadata + 4096 > PART_LIMIT for part in manifest['parts']) or upper > TOTAL_LIMIT:
            raise bounded.EvidenceError('Manifest/ZIP-inclusive upload budget exceeded')
        proof = {**{key:index[key] for key in ['encoding','complete','logicalFiles','uniquePayloads','rawBytes','uniqueBytes','duplicateBytes']},
                 'archiveBytes':manifest['archive']['bytes'],'archiveSha256':manifest['archive']['sha256'],
                 'uploadUpperBound':upper,'partCount':manifest['part_count']}
        (output/'proof.json').write_text(json.dumps(proof,indent=2)+'\n')
        return proof

def safe_path(value):
    path = PurePosixPath(value)
    if not value or str(path) != value or path.is_absolute() or '..' in path.parts or path.parts[0] not in DIRECTORIES:
        raise bounded.EvidenceError('Unsafe logical restore path')
    return path

def restore(parts, output):
    output = Path(output).absolute()
    if output.exists(): raise bounded.EvidenceError('Restore destination must be new')
    with tempfile.TemporaryDirectory(prefix='moticos-evidence-restore-') as temp:
        payload = Path(temp)/'payload'
        bounded_restore.restore(parts, payload)
        index = json.loads((payload/INDEX).read_text())
        if index.get('encoding') != ENCODING or index.get('complete') is not True: raise bounded.EvidenceError('Not complete lossless evidence')
        if index.get('included_directories') != list(DIRECTORIES): raise bounded.EvidenceError('Logical root inventory changed')
        missing=index.get('missing_directories',[])
        if len(missing)!=len(set(missing)) or any(name not in DIRECTORIES for name in missing): raise bounded.EvidenceError('Invalid missing-root inventory')
        if index['rawBytes'] != sum(record['bytes'] for record in index['source_members']): raise bounded.EvidenceError('Incorrect raw byte total')
        if index['duplicateBytes'] != index['rawBytes']-index['uniqueBytes']: raise bounded.EvidenceError('Incorrect deduplication total')
        seen, hashes = set(), set(); stage=Path(temp)/'logical';stage.mkdir()
        for record in index['source_members']:
            path=safe_path(record['path']);sha=record['sha256']
            if path in seen or len(sha)!=64 or any(c not in '0123456789abcdef' for c in sha): raise bounded.EvidenceError('Duplicate path or invalid SHA')
            if path.parts[0] in missing: raise bounded.EvidenceError('A missing root contains logical files')
            seen.add(path); hashes.add(sha)
            blob=payload/'preflight-results/objects'/f'{sha}.bin'
            with bounded._open_regular(blob) as stream:
                size,actual=bounded._hash_stream(stream)
            if size!=record['bytes'] or actual!=sha: raise bounded.EvidenceError('Logical payload verification failed')
            destination=stage/str(path);destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(blob,destination)
        actual_blobs={p.stem for p in (payload/'preflight-results/objects').iterdir()}
        if actual_blobs!=hashes or len(seen)!=index['logicalFiles'] or len(hashes)!=index['uniquePayloads']:
            raise bounded.EvidenceError('Omitted/extra payloads or inconsistent inventory')
        if sum(blob.stat().st_size for blob in (payload/'preflight-results/objects').iterdir()) != index['uniqueBytes']: raise bounded.EvidenceError('Incorrect unique byte total')
        shutil.copytree(stage,output)
        return {'complete':True,'logicalFiles':len(seen),'uniquePayloads':len(hashes),'rawBytes':index['rawBytes']}

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='mode',required=True)
    p=sub.add_parser('pack');p.add_argument('--source',required=True);p.add_argument('--output',required=True);p.add_argument('--github-output')
    r=sub.add_parser('restore');r.add_argument('--parts',required=True);r.add_argument('--output',required=True)
    args=parser.parse_args()
    result=pack(args.source,args.output,args.github_output) if args.mode=='pack' else restore(args.parts,args.output)
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
