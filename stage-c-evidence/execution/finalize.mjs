import fs from 'node:fs';
import {resolve,join,isAbsolute,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {boundedProcess,classifyPngNames,enforceImageCounts} from './bounded-process.mjs';
import {filesUnder,regularBytes,digest} from '../../full-campaign-gate/evidence.mjs';
import {LIMITS} from './policy.mjs';
import {SETUP_ROOT} from './job-clock.mjs';
import {REPO_ROOT,RESULTS_ROOT,requireRepoCwd} from './paths.mjs';
const smallError=e=>String(e?.message??e).slice(0,8192);
function diagnostic(output,name,value) {
  let bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');
  if(bytes.length>4*1024*1024)bytes=Buffer.from(JSON.stringify({...value,files:value.files?.slice(0,512),inventoryTruncated:true},null,2)+'\n');
  if(bytes.length>4*1024*1024)throw Error('Diagnostic exceeds 4 MiB');
  fs.writeFileSync(join(output,name),bytes,{flag:'wx'});
}
export async function finalizeEvidence({output=process.env.MOTICOS_280_UPLOAD,resultsRoot=RESULTS_ROOT,setupRoot=join(REPO_ROOT,SETUP_ROOT),validator={command:process.execPath,args:[join(REPO_ROOT,'stage-c-evidence/execution/validate.mjs')],cwd:REPO_ROOT}}={}) {
  if(!output||!isAbsolute(output)||resolve(output)===resolve(REPO_ROOT)||resolve(output).startsWith(resolve(REPO_ROOT)+'/')||fs.existsSync(output))throw Error('New external upload directory required');
  fs.mkdirSync(output,{recursive:true});let result=null;
  try {
    fs.mkdirSync(resultsRoot,{recursive:true});
    // Installation and clock failures precede prepare.mjs. Preserve their exact
    // phase logs before validation so 'missing build' cannot hide the cause.
    if(fs.existsSync(setupRoot)){for(const path of filesUnder(setupRoot)){const bytes=regularBytes(setupRoot,path),at=join(resultsRoot,'setup',path);fs.mkdirSync(dirname(at),{recursive:true});fs.writeFileSync(at,bytes,{flag:'wx'});}}
    const log=join(resultsRoot,'validator.log'),fd=fs.openSync(log,'wx');
    try{result=await boundedProcess(validator.command,validator.args,{timeout:30000,cwd:validator.cwd,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
    let acceptance;try{acceptance=JSON.parse(fs.readFileSync(join(resultsRoot,'acceptance.json'),'utf8'));}catch(e){acceptance={status:'incomplete-or-failed',error:'Acceptance unavailable: '+smallError(e)};}
    const buffer=Buffer.alloc(8192),input=fs.openSync(log,'r');let length;try{length=fs.readSync(input,buffer,0,buffer.length,0);}finally{fs.closeSync(input);}
    const passed=result.status===0&&!result.error&&!result.timedOut&&acceptance.status==='passed';
    fs.writeFileSync(join(resultsRoot,'finalizer.json'),JSON.stringify({status:passed?'passed':'incomplete-or-failed',validation:result,acceptanceStatus:acceptance.status,error:acceptance.error,validatorOutput:buffer.subarray(0,length).toString('utf8')},null,2)+'\n',{flag:'wx'});
    const inventory=filesUnder(resultsRoot).map(path=>{const b=regularBytes(resultsRoot,path);return {path,bytes:b.length,sha256:digest(b)};}),total=inventory.reduce((n,r)=>n+r.bytes,0),manifest=Buffer.from(JSON.stringify(inventory,null,2)+'\n');
    const pngPaths=inventory.filter(r=>r.path.toLowerCase().endsWith('.png')).map(r=>r.path),imageCounts={pngs:pngPaths.length,traces:inventory.filter(r=>r.path.endsWith('trace.zip')).length,...classifyPngNames(pngPaths)};
    let countsOK=true;try{enforceImageCounts(imageCounts);}catch{countsOK=false;}
    if(total+manifest.length+65536>LIMITS.artifactBytes||!countsOK) {
      diagnostic(output,'over-cap.json',{status:'incomplete-or-failed',reason:'Evidence exceeds byte or PNG/trace cap, or has unknown PNG names; raw files untouched',totalBytes:total,imageCounts,cap:LIMITS.artifactBytes,validation:result,files:inventory});
      // Keep useful startup/assertion diagnostics even if a raw artifact breaches
      // the cap. Omitted binaries are explicitly never reported as accepted.
      let copied=0;for(const r of inventory.filter(r=>/\.(log|jsonl|json)$/.test(r.path)&&r.bytes<=2*1024*1024)){if(copied+r.bytes>8*1024*1024)break;const at=join(output,'diagnostics',r.path);fs.mkdirSync(dirname(at),{recursive:true});fs.writeFileSync(at,regularBytes(resultsRoot,r.path),{flag:'wx'});copied+=r.bytes;}
      return false;
    }
    for(const r of inventory){const at=join(output,r.path);fs.mkdirSync(dirname(at),{recursive:true});fs.writeFileSync(at,regularBytes(resultsRoot,r.path),{flag:'wx'});}
    fs.writeFileSync(join(output,'inventory.json'),manifest,{flag:'wx'});return passed;
  }catch(error){diagnostic(output,'failure-summary.json',{status:'incomplete-or-failed',error:smallError(error),validation:result,rawFilesUntouched:true});return false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){requireRepoCwd();if(!await finalizeEvidence())process.exitCode=1;}
