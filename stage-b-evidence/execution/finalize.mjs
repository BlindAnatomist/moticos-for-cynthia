import fs from 'node:fs';
import {resolve} from 'node:path';
import {boundedProcess} from '../../full-campaign-gate/bounded-process.mjs';
import {filesUnder,regularBytes,digest} from '../../full-campaign-gate/evidence.mjs';
import {ROOT,LIMITS} from './policy.mjs';
fs.mkdirSync(ROOT,{recursive:true});const result=await boundedProcess(process.execPath,['stage-b-evidence/execution/validate.mjs'],{timeout:90000});
// Preserve raw evidence in place. Only a bounded projection is uploaded.
const output=process.env.MOTICOS_240_UPLOAD;if(!output||!output.startsWith('/')||resolve(output)===process.cwd()||resolve(output).startsWith(process.cwd()+'/')||fs.existsSync(output))throw Error('New external upload directory required');fs.mkdirSync(output,{recursive:true});const files=filesUnder('full-browser-results');let total=0;const inventory=files.map(path=>{const b=regularBytes('full-browser-results',path);total+=b.length;return{path,bytes:b.length,sha256:digest(b)};});
const countsOK=inventory.filter(r=>r.path.endsWith('.png')).length<=LIMITS.regularPngs+LIMITS.failurePngs&&inventory.filter(r=>r.path.endsWith('trace.zip')).length<=LIMITS.traces;
if(total+65536<=LIMITS.artifactBytes&&countsOK){for(const row of inventory){const at=resolve(output,row.path);fs.mkdirSync(at.slice(0,at.lastIndexOf('/')),{recursive:true});fs.writeFileSync(at,regularBytes('full-browser-results',row.path),{flag:'wx'});}fs.writeFileSync(output+'/inventory.json',JSON.stringify(inventory,null,2),{flag:'wx'});}else{const diagnostic={status:'incomplete-or-failed',reason:'Evidence exceeds proposed byte or image/trace count cap; raw files left unchanged on runner',totalBytes:total,cap:LIMITS.artifactBytes,files:inventory};fs.writeFileSync(output+'/over-cap.json',JSON.stringify(diagnostic,null,2),{flag:'wx'});if(fs.statSync(output+'/over-cap.json').size>4*1024*1024)throw Error('Diagnostic exceeds 4 MiB');}
const passed=result.status===0&&!result.timedOut&&!result.error&&total+65536<=LIMITS.artifactBytes&&countsOK;if(!passed)process.exitCode=1;
