import fs from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {boundedProcess} from '../../full-campaign-gate/bounded-process.mjs';
import {filesUnder,regularBytes,digest} from '../../full-campaign-gate/evidence.mjs';
import {LIMITS} from './policy.mjs';
import {REPO_ROOT,RESULTS_ROOT,EXECUTION_ROOT,requireRepoCwd} from './paths.mjs';
const smallError=e=>String(e?.message??e).slice(0,4096);
function diagnostic(output,name,value){let bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');if(bytes.length>4*1024*1024){value={...value,files:value.files?.slice(0,256),inventoryTruncated:true};bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');}if(bytes.length>4*1024*1024)throw Error('Diagnostic exceeds 4 MiB');fs.writeFileSync(join(output,name),bytes,{flag:'wx'});}
export async function finalizeEvidence({output=process.env.MOTICOS_240_UPLOAD,resultsRoot=RESULTS_ROOT,executionRoot=EXECUTION_ROOT,validator={command:process.execPath,args:[join(REPO_ROOT,'stage-b-evidence/execution/validate.mjs')],cwd:REPO_ROOT}}={}){
 if(!output||!isAbsolute(output)||resolve(output)===resolve(REPO_ROOT)||resolve(output).startsWith(resolve(REPO_ROOT)+'/')||fs.existsSync(output))throw Error('New external upload directory required');
 fs.mkdirSync(output,{recursive:true});let result=null;
 try{
  const sub=relative(resultsRoot,executionRoot);if(!sub||sub.startsWith('..')||isAbsolute(sub))throw Error('Execution evidence must be beneath result root');
  fs.mkdirSync(executionRoot,{recursive:true});const log=join(executionRoot,'validator.log'),fd=fs.openSync(log,'wx');
  try{result=await boundedProcess(validator.command,validator.args,{timeout:90000,cwd:validator.cwd,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  let acceptance;try{acceptance=JSON.parse(fs.readFileSync(join(executionRoot,'acceptance.json'),'utf8'));}catch(error){acceptance={status:'incomplete-or-failed',error:'Acceptance record unavailable: '+smallError(error)};}
  const preview=Buffer.alloc(8192),input=fs.openSync(log,'r');let length;try{length=fs.readSync(input,preview,0,preview.length,0);}finally{fs.closeSync(input);}
  const passed=result.status===0&&!result.error&&!result.timedOut&&acceptance.status==='passed';
  fs.writeFileSync(join(executionRoot,'finalizer.json'),JSON.stringify({status:passed?'passed':'incomplete-or-failed',validation:result,acceptanceStatus:acceptance.status,error:acceptance.error,validatorOutput:preview.subarray(0,length).toString('utf8')},null,2)+'\n',{flag:'wx'});
  const inventory=filesUnder(resultsRoot).map(path=>{const b=regularBytes(resultsRoot,path);return{path,bytes:b.length,sha256:digest(b)};});const total=inventory.reduce((n,r)=>n+r.bytes,0),manifest=Buffer.from(JSON.stringify(inventory,null,2)+'\n');
  const countsOK=inventory.filter(r=>r.path.endsWith('.png')).length<=LIMITS.regularPngs+LIMITS.failurePngs&&inventory.filter(r=>r.path.endsWith('trace.zip')).length<=LIMITS.traces;
  if(total+manifest.length+16384>LIMITS.artifactBytes||!countsOK){diagnostic(output,'over-cap.json',{status:'incomplete-or-failed',reason:'Evidence exceeds byte or image/trace cap; raw files untouched',totalBytes:total,inventoryBytes:manifest.length,cap:LIMITS.artifactBytes,validation:result,files:inventory});return false;}
  for(const row of inventory){const at=join(output,row.path);fs.mkdirSync(at.slice(0,at.lastIndexOf('/')),{recursive:true});fs.writeFileSync(at,regularBytes(resultsRoot,row.path),{flag:'wx'});}fs.writeFileSync(join(output,'inventory.json'),manifest,{flag:'wx'});return passed;
 }catch(error){diagnostic(output,'failure-summary.json',{status:'incomplete-or-failed',error:smallError(error),validation:result,rawFilesUntouched:true});return false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){requireRepoCwd();if(!await finalizeEvidence())process.exitCode=1;}
