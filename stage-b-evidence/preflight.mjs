// Private local/cloud preflight only. This script never launches browser cases,
// installs dependencies, pushes, dispatches Actions or modifies budgets.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifySource,verifyBuild} from '../full-campaign-gate/binding.mjs';
import {stageBSuites} from './suite-inventory.mjs';
const output=process.env.MOTICOS_STAGE_B_OUTPUT_ROOT;
if(!output||!path.isAbsolute(output))throw Error('Set MOTICOS_STAGE_B_OUTPUT_ROOT to a new absolute evidence directory outside this checkout');
if(path.resolve(output).startsWith(process.cwd()+path.sep)||fs.existsSync(output))throw Error('Use a new external evidence directory; do not replace existing evidence');
fs.mkdirSync(output,{recursive:true});
const source=verifySource();
const suites=stageBSuites(source.manifest.files);
function run(name,args,env={}){const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,...env}});fs.writeFileSync(path.join(output,name+'.log'),(r.stdout??'')+(r.stderr??''),{flag:'wx'});if(r.error||r.status!==0)throw Error(`${name}: ${r.error?.message??r.status}`);}
run('pinned-existing-preflight',['full-campaign-gate/preflight.mjs']);
run('stage-b-runtime',['--test','--test-reporter=tap',...suites.runtime],{MOTICOS_STAGE_B_OUTPUT_ROOT:path.join(output,'routes')});
run('stage-b-browser-contracts',['--test','--test-reporter=tap',...suites.browserContracts,...suites.executionContracts]);
verifySource();const build=verifyBuild();
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({status:'passed',sourceFingerprint:source.sourceFingerprint,buildFingerprint:build.buildFingerprint,stageBTests:suites,pieces:build.art.length,browserExecution:'not run; existing 22-case collection only',limitation:'Stage B collection/probe build are separate; native geometry, dialogs and PNG exports still require browser acceptance.'},null,2)+'\n',{flag:'wx'});
