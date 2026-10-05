#!/usr/bin/env python3
"""Retain bounded reports/inventory and actual failure PNGs independently.

This is diagnostic salvage, NEVER a complete-evidence or release-pass claim.
Together with the 90 MiB complete object archive it stays within 98 MiB/profile.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import zipfile
import preserveEvidence as evidence

DIRECTORIES=('preflight-results','batch-test-results','test-results')
LIMIT=8*1024*1024

def make_archive(source, output):
    source,output=Path(source).resolve(),Path(output).absolute()
    if output.exists():raise evidence.EvidenceError('Diagnosis output must be new')
    if output==source or any(output==source/d or source/d in output.parents for d in DIRECTORIES):raise evidence.EvidenceError('Output must be outside included trees')
    members,missing=evidence._source_members(source,DIRECTORIES)
    records=[];paths={}
    for name,path,signature in members:
        with evidence._open_regular(path) as stream:
            size,digest=evidence._hash_stream(stream)
        if evidence._signature(path.stat())!=signature:raise evidence.EvidenceError('Source changed during inventory')
        record={'path':name,'bytes':size,'sha256':digest};records.append(record);paths[name]=(path,record)
    chosen=[]
    priority=['batch-test-results/results.json','batch-test-results/progress/browser-events.jsonl']
    priority += sorted(name for name in paths if name.endswith('-collections.jsonl'))
    priority += sorted(name for name in paths if name.endswith('/failure-diagnosis/failure-state.json'))
    priority += sorted(name for name in paths if name.endswith('/failure-diagnosis/failure-view.png'))
    priority += sorted(name for name in paths if name.endswith('error-context.md'))
    priority += sorted(name for name in paths if Path(name).name.startswith('test-failed-') and name.endswith('.png'))
    priority += ['preflight-results/browser.log','preflight-results/build-proof.json','preflight-results/browser-budget.json']
    priority=list(dict.fromkeys(name for name in priority if name in paths))
    inventory={'purpose':'diagnostic-only-not-release-acceptance','completeRawEvidence':False,
               'sourceFiles':records,'missingDirectories':missing,'totalSourceBytes':sum(r['bytes'] for r in records),
               'includedDiagnosticFiles':[],'notIncluded':[],'budgetBytes':LIMIT,
               'completePackage':'Independently required. This artifact never converts missing full evidence into a pass.'}
    output.parent.mkdir(parents=True,exist_ok=True)
    def write(target,selected):
        record={**inventory,'includedDiagnosticFiles':selected,
                'notIncluded':[{'path':name,'reason':'not selected for bounded diagnosis; full object package remains required'} for name in paths if name not in selected]}
        with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1) as package:
            package.writestr('diagnosis-inventory.json',json.dumps(record,indent=2)+'\n')
            for name in selected:
                path,expected=paths[name]
                with evidence._open_regular(path) as stream:data=stream.read()
                if len(data)!=expected['bytes'] or hashlib.sha256(data).hexdigest()!=expected['sha256']:raise evidence.EvidenceError('Source changed before diagnosis packaging')
                package.writestr(name,data)
    with tempfile.TemporaryDirectory(prefix='moticos-diagnosis-') as temp:
        trial=Path(temp)/'trial.zip';write(trial,[])
        if trial.stat().st_size+4096>LIMIT:raise evidence.EvidenceError('Inventory alone exceeds the bounded diagnosis limit')
        for name in priority:
            write(trial,[*chosen,name])
            if trial.stat().st_size+4096<=LIMIT:chosen.append(name)
        write(output,chosen)
    size=output.stat().st_size
    if size+4096>LIMIT:raise evidence.EvidenceError('Diagnosis exceeds upload ceiling')
    return {'diagnosticOnly':True,'completeRawEvidence':False,'archiveBytes':size,'uploadUpperBound':size+4096,
            'includedFiles':chosen,'sourceFiles':len(records),'includedFailureScreenshots':sum(Path(name).name.startswith('test-failed-') for name in chosen),
            'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
    print(json.dumps(make_archive(args.source,args.output),indent=2))
if __name__=='__main__':main()
