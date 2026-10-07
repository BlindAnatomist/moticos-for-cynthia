#!/usr/bin/env python3
"""Lossless, strict <=24 MiB multipart packing/restoration. Never uploads.

Preflight carries logs plus the frozen build; browser carries every raw evidence
byte with content-addressed deduplication. Missing trees stay explicit. Complete
transport is not a claim that the tests themselves passed.
"""
import argparse, hashlib, json, os, shutil, sys, tarfile, tempfile
from pathlib import Path, PurePosixPath
import preserveEvidence as bounded
MIB=1024*1024
PART_LIMIT=24*MIB
CHUNK_BYTES=23*MIB
ENCODING='moticos-current-lossless-sha256-objects-v2'
DIRECTORIES={'preflight':('preflight-results',),'browser':('preflight-results','expansion200-test-results','test-results'),'recovery':('recovery-payload',)}
MAX_PARTS={'preflight':4,'browser':11,'recovery':16}

def sha(data): return hashlib.sha256(data).hexdigest()
def _unique_object(pairs):
    result={}
    for key,value in pairs:
        if key in result: raise bounded.EvidenceError('Duplicate JSON key')
        result[key]=value
    return result
def read_json(stream): return json.load(stream,object_pairs_hook=_unique_object)
def safe_path(value, directories):
    if not isinstance(value,str): raise bounded.EvidenceError('Invalid path type')
    path=PurePosixPath(value)
    if not value or str(path)!=value or path.is_absolute() or '..' in path.parts or path.parts[0] not in directories or len(path.parts)<2: raise bounded.EvidenceError('Unsafe logical path')
    return path

def _kind(kind):
    if kind not in DIRECTORIES: raise bounded.EvidenceError('Unknown evidence kind')
    return DIRECTORIES[kind]

def inventory(source,kind):
    members,missing=bounded._source_members(source,_kind(kind))
    return members,missing

def build_payload(source,stage,kind):
    members,missing=inventory(source,kind)
    if kind=='browser' and any(relative.startswith('preflight-results/build/') for relative,_,_ in members):raise bounded.EvidenceError('Browser evidence must not duplicate the sole preflight build')
    objects=stage/'preflight-results/objects';objects.mkdir(parents=True)
    records=[];unique={}
    for relative,path,signature in members:
        for parent in path.parents:
            if parent==source: break
            if parent.is_symlink() or not parent.is_dir(): raise bounded.EvidenceError('Source ancestry changed')
        if relative.startswith('preflight-results/source/') and path.stat().st_mode & 0o777 != 0o644:raise bounded.EvidenceError('Current source snapshot requires exact 100644 mode')
        with bounded._open_regular(path) as original:
            if bounded._signature(os.fstat(original.fileno()))!=signature: raise bounded.EvidenceError('Source changed before read')
            fd,name=tempfile.mkstemp(dir=objects,prefix='.pending-');temporary=Path(name)
            try:
                digest=hashlib.sha256();count=0
                with os.fdopen(fd,'wb') as output:
                    for block in iter(lambda:original.read(MIB),b''): output.write(block);digest.update(block);count+=len(block)
                if bounded._signature(os.fstat(original.fileno()))!=signature: raise bounded.EvidenceError('Source changed during read')
                digest=digest.hexdigest()
                if digest in unique:
                    if unique[digest]!=count: raise bounded.EvidenceError('Digest/size mismatch')
                    temporary.unlink()
                else: os.replace(temporary,objects/f'{digest}.bin');unique[digest]=count
                records.append({'path':relative,'bytes':count,'sha256':digest})
            finally: temporary.unlink(missing_ok=True)
    index={'sourceFileMode':'100644','encoding':ENCODING,'kind':kind,'complete':True,'included_directories':list(_kind(kind)),'missing_directories':missing,'source_members':records,'logicalFiles':len(records),'uniquePayloads':len(unique),'rawBytes':sum(r['bytes'] for r in records),'uniqueBytes':sum(unique.values())}
    index['duplicateBytes']=index['rawBytes']-index['uniqueBytes']
    (stage/'preflight-results/objects-index.json').write_text(json.dumps(index,indent=2)+'\n');return index

def pack(source,output,kind,github_output=None):
    source=Path(source).absolute();output=Path(output).absolute();directories=_kind(kind)
    if source.is_symlink() or not source.is_dir(): raise bounded.EvidenceError('Source must be a real directory')
    source=source.resolve()
    if output.exists() or output.is_symlink(): raise bounded.EvidenceError('Use a new output directory')
    if output==source or any(output==source/d or source/d in output.parents for d in directories): raise bounded.EvidenceError('Output overlaps source')
    if github_output:
        flags=Path(github_output).absolute()
        if flags==output or output in flags.parents or any(flags==source/d or source/d in flags.parents for d in directories):raise bounded.EvidenceError('Step output overlaps evidence')
        bounded._atomic_outputs(flags,0)
    output.mkdir(parents=True)
    with tempfile.TemporaryDirectory(prefix='moticos160-payload-') as temp:
        stage=Path(temp);index=build_payload(source,stage,kind)
        args=['pack','--root',str(stage),'--include','preflight-results','--archive',str(output/'evidence.tar.gz'),'--out',str(output/'parts'),'--chunk-bytes',str(CHUNK_BYTES),'--max-parts',str(MAX_PARTS[kind])]
        manifest=bounded.preserve(bounded.parser().parse_args(args))
        manifest.update(encoding=ENCODING,kind=kind)
        encoded=(json.dumps(manifest,indent=2)+'\n').encode();(output/'parts/manifest.json').write_bytes(encoded)
        upper=sum(p['bytes']+len(encoded)+4096 for p in manifest['parts'])
        if any(p['bytes']+len(encoded)+4096>PART_LIMIT for p in manifest['parts']) or upper>MAX_PARTS[kind]*PART_LIMIT: raise bounded.EvidenceError('24 MiB transport budget exceeded')
        proof={k:index[k] for k in ['encoding','kind','complete','logicalFiles','uniquePayloads','rawBytes','uniqueBytes','duplicateBytes']}
        proof.update(archiveBytes=manifest['archive']['bytes'],archiveSha256=manifest['archive']['sha256'],partCount=manifest['part_count'],uploadUpperBound=upper,partLimitBytes=PART_LIMIT)
        (output/'proof.json').write_text(json.dumps(proof,indent=2)+'\n')
        if github_output: bounded._atomic_outputs(Path(github_output),manifest['part_count'])
        return proof

def _check_record(record):
    if set(record)!=set(['path','bytes','sha256']) or type(record['bytes']) is not int or record['bytes']<0 or not isinstance(record['sha256'],str) or len(record['sha256'])!=64 or any(c not in '0123456789abcdef' for c in record['sha256']): raise bounded.EvidenceError('Invalid source record')

def restore(parts,output):
    parts=Path(parts).absolute();output=Path(output).absolute()
    if parts.is_symlink() or not parts.is_dir() or output.exists() or output.is_symlink(): raise bounded.EvidenceError('Parts must be real; output must be new')
    with bounded._open_regular(parts/'manifest.json') as stream: manifest=read_json(stream)
    if set(manifest)!=set(['schema_version','mode','chunk_bytes','max_parts','source_members','included_directories','missing_directories','archive_format','archive','parts','part_count','encoding','kind']):raise bounded.EvidenceError('Unexpected manifest fields')
    if manifest['included_directories']!=['preflight-results'] or manifest['missing_directories']!=[]:raise bounded.EvidenceError('Invalid transport payload scope')
    kind=manifest.get('kind');directories=_kind(kind)
    if manifest.get('encoding')!=ENCODING or manifest.get('schema_version')!=1 or manifest.get('archive_format')!='tar.gz' or manifest.get('mode')!='pack': raise bounded.EvidenceError('Unsupported manifest')
    if manifest.get('chunk_bytes')!=CHUNK_BYTES or manifest.get('max_parts')!=MAX_PARTS[kind] or type(manifest.get('part_count')) is not int or not 1<=manifest['part_count']<=MAX_PARTS[kind] or manifest['part_count']!=len(manifest['parts']): raise bounded.EvidenceError('Invalid part bounds')
    expected_names={'manifest.json'}|{f'part-{i:03d}.bin' for i in range(manifest['part_count'])}
    if {p.name for p in parts.iterdir()}!=expected_names: raise bounded.EvidenceError('Missing or extra part file')
    with tempfile.TemporaryDirectory(prefix='moticos160-restore-') as temp:
        temp=Path(temp);archive=temp/'archive.tar.gz';digest=hashlib.sha256();count=0
        with archive.open('xb') as destination:
            for index,record in enumerate(manifest['parts']):
                if set(record)!=set(['filename','bytes','sha256']) or record['filename']!=f'part-{index:03d}.bin' or type(record['bytes']) is not int or not 0<record['bytes']<=CHUNK_BYTES or (index<manifest['part_count']-1 and record['bytes']!=CHUNK_BYTES): raise bounded.EvidenceError('Invalid ordered part')
                if record['bytes']+(parts/'manifest.json').stat().st_size+4096>PART_LIMIT:raise bounded.EvidenceError('Oversize part')
                part_hash=hashlib.sha256();part_bytes=0
                with bounded._open_regular(parts/record['filename']) as stream:
                    for block in iter(lambda:stream.read(MIB),b''):destination.write(block);digest.update(block);part_hash.update(block);part_bytes+=len(block);count+=len(block)
                if part_bytes!=record['bytes'] or part_hash.hexdigest()!=record['sha256']:raise bounded.EvidenceError('Part digest mismatch')
        if count!=manifest['archive']['bytes'] or digest.hexdigest()!=manifest['archive']['sha256']: raise bounded.EvidenceError('Archive digest mismatch')
        expected={}
        for record in manifest['source_members']:
            _check_record(record);safe_path(record['path'],('preflight-results',))
            if record['path'] in expected:raise bounded.EvidenceError('Duplicate archive member')
            expected[record['path']]=record
        payload=temp/'payload';payload.mkdir();seen=set()
        with tarfile.open(archive,'r:gz') as bundle:
            for member in bundle:
                if not member.isfile() or member.name not in expected or member.name in seen:raise bounded.EvidenceError('Unsafe, extra or duplicate archive member')
                record=expected[member.name]
                if member.size!=record['bytes']:raise bounded.EvidenceError('Archive member size differs')
                target=payload/member.name;target.parent.mkdir(parents=True,exist_ok=True);h=hashlib.sha256();n=0
                with bundle.extractfile(member) as original,target.open('xb') as copy:
                    for block in iter(lambda:original.read(MIB),b''):copy.write(block);h.update(block);n+=len(block)
                if n!=record['bytes'] or h.hexdigest()!=record['sha256']:raise bounded.EvidenceError('Archive member digest differs')
                seen.add(member.name)
        if seen!=set(expected):raise bounded.EvidenceError('Archive omits payload')
        with (payload/'preflight-results/objects-index.json').open() as stream:index=read_json(stream)
        if set(index)!=set(['sourceFileMode','encoding','kind','complete','included_directories','missing_directories','source_members','logicalFiles','uniquePayloads','rawBytes','uniqueBytes','duplicateBytes']):raise bounded.EvidenceError('Unexpected object-index fields')
        if index.get('sourceFileMode')!='100644' or index.get('encoding')!=ENCODING or index.get('kind')!=kind or index.get('complete') is not True or index.get('included_directories')!=list(directories):raise bounded.EvidenceError('Invalid object index')
        logical=temp/'logical';logical.mkdir();names=set();hashes={}
        for record in index['source_members']:
            _check_record(record);path=safe_path(record['path'],directories)
            if kind=='browser' and str(path).startswith('preflight-results/build/'):raise bounded.EvidenceError('Browser archive duplicates the sole preflight build')
            if str(path) in names:raise bounded.EvidenceError('Duplicate logical path')
            names.add(str(path));hashes[record['sha256']]=record['bytes'];blob=payload/'preflight-results/objects'/f"{record['sha256']}.bin"
            with bounded._open_regular(blob) as stream:n,h=bounded._hash_stream(stream)
            if n!=record['bytes'] or h!=record['sha256']:raise bounded.EvidenceError('Object mismatch')
            target=logical/path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(blob,target)
            if str(path).startswith('preflight-results/source/'):target.chmod(0o644)
        actual={p.name for p in (payload/'preflight-results/objects').iterdir()}
        if actual!={h+'.bin' for h in hashes} or len(names)!=index['logicalFiles'] or len(hashes)!=index['uniquePayloads'] or sum(r['bytes'] for r in index['source_members'])!=index['rawBytes'] or sum(hashes.values())!=index['uniqueBytes'] or index['rawBytes']-index['uniqueBytes']!=index['duplicateBytes']:raise bounded.EvidenceError('Object inventory/counters differ')
        if set(expected)!={'preflight-results/objects-index.json'}|{'preflight-results/objects/'+h+'.bin' for h in hashes}:raise bounded.EvidenceError('Extra payload outside index')
        if any(d not in directories for d in index['missing_directories']) or len(set(index['missing_directories']))!=len(index['missing_directories']):raise bounded.EvidenceError('Invalid missing-directory record')
        if any(any(name.startswith(d+'/') for name in names) for d in index['missing_directories']):raise bounded.EvidenceError('Missing directory contains restored files')
        shutil.copytree(logical,output)
        return {'complete':True,'kind':kind,'archiveSha256':manifest['archive']['sha256'],'logicalFiles':len(names),'uniquePayloads':len(hashes),'rawBytes':index['rawBytes'],'partCount':manifest['part_count']}

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='mode',required=True)
    p=sub.add_parser('pack');p.add_argument('--source',required=True);p.add_argument('--output',required=True);p.add_argument('--kind',choices=list(DIRECTORIES),required=True);p.add_argument('--github-output')
    r=sub.add_parser('restore');r.add_argument('--parts',required=True);r.add_argument('--output',required=True)
    args=parser.parse_args();print(json.dumps(pack(args.source,args.output,args.kind,args.github_output) if args.mode=='pack' else restore(args.parts,args.output),indent=2))
if __name__=='__main__':main()
