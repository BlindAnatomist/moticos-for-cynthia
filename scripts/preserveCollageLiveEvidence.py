#!/usr/bin/env python3
"""Lossless hosted evidence: all original paths/bytes, one part <=30 MiB.

Reuse the reviewed RC object encoding to avoid duplicate attachment payloads.
This wrapper never invokes the RC's larger two-part packing budget.
"""
import argparse
import json
from pathlib import Path
import sys
import tempfile
import preserveEvidence as evidence
import contentAddressedEvidence as objects

LIMIT = 30 * 1024 * 1024
CHUNK = LIMIT - 1024 * 1024  # Reserve ample space for manifest + ZIP framing.

def check_budget(manifest, metadata_bytes):
    if manifest['part_count'] != 1 or len(manifest['parts']) != 1:
        raise evidence.EvidenceError('Hosted evidence must use exactly one part')
    total = manifest['parts'][0]['bytes'] + metadata_bytes + 4096
    if total > LIMIT:
        raise evidence.EvidenceError('Hosted evidence exceeds its 30 MiB upload ceiling')
    return total

def pack(source='.', output='bounded-evidence', github_output=None):
    source, output = Path(source).resolve(), Path(output).absolute()
    if output == source or any(output == source/directory or source/directory in output.parents for directory in objects.DIRECTORIES):
        raise evidence.EvidenceError('Package output must be outside included evidence trees')
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='moticos-hosted-objects-') as temp:
        payload=Path(temp); index=objects.build_payload(source,payload)
        cli=['pack','--archive',str(output/'live-evidence.tar.gz'),'--out',str(output/'parts'),
             '--root',str(payload),'--include','preflight-results','--chunk-bytes',str(CHUNK),'--max-parts','1']
        if github_output:cli+=['--github-output',github_output]
        manifest=evidence.preserve(evidence.parser().parse_args(cli))
        total=check_budget(manifest,(output/'parts/manifest.json').stat().st_size)
        return {key:index[key] for key in ['encoding','complete','logicalFiles','uniquePayloads','rawBytes','uniqueBytes','duplicateBytes']} | {
            'archiveBytes':manifest['archive']['bytes'],'archiveSha256':manifest['archive']['sha256'],
            'uploadUpperBound':total,'partCount':1}

def restore(parts, output):
    manifest_path=Path(parts)/'manifest.json'
    with evidence._open_regular(manifest_path) as stream:encoded=stream.read()
    check_budget(json.loads(encoded),len(encoded))
    # Verify the bounded archive, then recreate independent copies at EVERY
    # original evidence path from the checked object index.
    return objects.restore(parts,output)

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--github-output');parser.add_argument('--restore-parts');parser.add_argument('--restore-output')
    args=parser.parse_args(argv)
    if bool(args.restore_parts) != bool(args.restore_output):parser.error('Both restore arguments are required')
    if args.restore_parts and args.github_output:parser.error('Restoration cannot emit upload flags')
    try:
        proof=restore(args.restore_parts,args.restore_output) if args.restore_parts else pack(github_output=args.github_output)
    except (AssertionError,OSError,ValueError,evidence.EvidenceError) as error:
        print(f'Hosted evidence incomplete: {error}',file=sys.stderr);return 1
    print(json.dumps(proof,indent=2));return 0
if __name__=='__main__':sys.exit(main())
