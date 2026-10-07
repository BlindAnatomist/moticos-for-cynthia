#!/usr/bin/env python3
"""Assemble separately downloaded artifact directories without losing manifests."""
import argparse,json,shutil
from pathlib import Path
import expansion200GateEvidence as evidence

def assemble(downloads,output,kind):
 downloads,output=Path(downloads).absolute(),Path(output).absolute()
 if downloads.is_symlink() or not downloads.is_dir() or output.exists() or output.is_symlink() or downloads==output or downloads in output.parents:raise evidence.bounded.EvidenceError('Use real input and a separate new output')
 expected=None;manifest_bytes=None;found={}
 children=list(downloads.iterdir())
 if not children:raise evidence.bounded.EvidenceError('No downloaded artifacts')
 for directory in children:
  if directory.is_symlink() or not directory.is_dir():raise evidence.bounded.EvidenceError('Unexpected artifact input')
  with evidence.bounded._open_regular(directory/'manifest.json') as stream:encoded=stream.read()
  if manifest_bytes is None:
   manifest_bytes=encoded;manifest=json.loads(encoded,object_pairs_hook=evidence._unique_object)
   if manifest.get('kind')!=kind or manifest.get('encoding')!=evidence.ENCODING or not 1<=manifest.get('part_count',0)<=evidence.MAX_PARTS[kind]:raise evidence.bounded.EvidenceError('Wrong artifact kind or bounds')
   expected={p['filename']:p for p in manifest['parts']}
   if len(expected)!=manifest['part_count']:raise evidence.bounded.EvidenceError('Duplicate part identity')
  elif encoded!=manifest_bytes:raise evidence.bounded.EvidenceError('Downloaded artifacts disagree on manifest')
  files=list(directory.iterdir());parts=[p for p in files if p.name!='manifest.json']
  if len(parts)!=1 or len(files)!=2:raise evidence.bounded.EvidenceError('Each artifact must contain one part plus manifest')
  part=parts[0]
  if part.name not in expected or part.name in found:raise evidence.bounded.EvidenceError('Unknown or duplicate downloaded part')
  with evidence.bounded._open_regular(part) as stream:size,digest=evidence.bounded._hash_stream(stream)
  if size!=expected[part.name]['bytes'] or digest!=expected[part.name]['sha256']:raise evidence.bounded.EvidenceError('Downloaded part digest differs')
  found[part.name]=part
 if set(found)!=set(expected):raise evidence.bounded.EvidenceError('Downloaded parts incomplete')
 output.mkdir(parents=True);(output/'manifest.json').write_bytes(manifest_bytes)
 for name,source in found.items():shutil.copyfile(source,output/name)
 return {'kind':kind,'parts':len(found),'allManifestsIdentical':True}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--downloads',required=True);p.add_argument('--output',required=True);p.add_argument('--kind',choices=['preflight','browser'],required=True);a=p.parse_args();print(json.dumps(assemble(a.downloads,a.output,a.kind)))
