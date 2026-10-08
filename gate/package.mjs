import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdirSync,copyFileSync,existsSync,openSync,readSync,closeSync} from 'node:fs';
import {join,dirname,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inspectFullEvidence} from './package-full.mjs';
import {verifyBuild} from './binding.mjs';
import {flatten} from './results.mjs';
import {verifyPng} from './png.mjs';
import {isWorkingTrace} from './evidence-policy.mjs';
import {MAX_ARTIFACT_BYTES,CASES} from './scope.mjs';
export {verifyCaps,validateOriginalPng,verifyRequiredEvidence} from './package-full.mjs';
export const DIAGNOSTIC_CAP=2*1024*1024;
const MANIFEST_RESERVE=256*1024,MAX_DIAGNOSTIC_FILES=100;
export function hashFile(path){const hash=createHash('sha256'),buffer=Buffer.alloc(256*1024),fd=openSync(path,'r');try{let count;while((count=readSync(fd,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,count));return hash.digest('hex');}finally{closeSync(fd);}}
const sha=b=>createHash('sha256').update(b).digest('hex');
export function scanSizes(root){if(!existsSync(root))return [];assert(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());const rows=[];function walk(dir){for(const name of readdirSync(dir).sort()){const path=join(dir,name),stat=lstatSync(path);assert(!stat.isSymbolicLink(),`Symlink refused: ${path}`);if(stat.isDirectory())walk(path);else{assert(stat.isFile());rows.push({file:relative(root,path).replaceAll('\\','/'),bytes:stat.size});}}}walk(root);return rows;}
function priority(file){if(file==='campaign-source.json'||file==='campaign-build.json')return 0;if(file.endsWith('/progress/browser-events.jsonl'))return 1;if(file.endsWith('/results.json'))return 2;if(file==='working-trace-omissions.json'||file==='collection-proof.json'||file.endsWith('/execution-started.json'))return 3;if(file.includes('/raw/')&&file.endsWith('/error-context.md'))return 4;if(file.includes('/raw/')&&file.endsWith('/test-failed-1.png'))return 5;if(file==='preflight.log')return 6;if(/^campaign-(?:chromium|webkit-phone)\/[CP]\d\d-[^/]+\.json$/.test(file))return 7;if(file==='collection.json')return 8;return 99;}
export function diagnosticOutcome(inputRoot){
 const groups=[],totals={passed:0,failed:0,skipped:0,notObserved:0};
 for(const[profile,declared]of Object.entries(CASES)){
  const expected=new Set(declared.map(([id,title])=>`${id} ${title}`));let rows=null,reportError=null,kind='raw-report',runnerErrors=[];
  const reportPath=join(inputRoot,profile,'results.json');
  try{assert(existsSync(reportPath),'Raw report missing');const stat=lstatSync(reportPath);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=2*1024*1024,'Raw report exceeds diagnostic parse boundary');const report=JSON.parse(readFileSync(reportPath));rows=flatten(report.suites);runnerErrors=(Array.isArray(report.errors)?report.errors:[]).slice(0,3).map(e=>String(e.message??e).slice(0,1000));}catch(error){reportError=error.message.slice(0,1000);}
  if(rows===null){kind='progress-only';const progressPath=join(inputRoot,profile,'progress/browser-events.jsonl');try{assert(existsSync(progressPath),'Progress ledger missing');const stat=lstatSync(progressPath);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=1024*1024,'Progress ledger exceeds diagnostic parse boundary');rows=readFileSync(progressPath,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(e=>e.event==='test-end').map(e=>({id:e.id,title:Array.isArray(e.title)?e.title.at(-1):e.title,project:e.project,results:[{status:e.status,retry:e.retry,errors:e.errors}]}));}catch(error){reportError=`${reportError}; ${error.message}`.slice(0,1500);}}
  try{
   assert(Array.isArray(rows),'No readable case evidence');assert(rows.length<=declared.length,'Unexpected case count');assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'Duplicate opaque case IDs');assert.equal(new Set(rows.map(r=>r.title)).size,rows.length,'Duplicate declared case titles');
   const local={passed:0,failed:0,skipped:0,notObserved:declared.length-rows.length};
   const cases=rows.map(row=>{assert(row.project===profile&&expected.has(row.title)&&typeof row.id==='string'&&row.id.length>0,'Unknown case identity or profile');assert(Array.isArray(row.results),'Invalid case results');const result=row.results.at(-1),status=result?.status??'not-observed';assert(['passed','failed','timedOut','interrupted','skipped','not-observed'].includes(status),'Unknown result status');if(status==='passed')local.passed++;else if(['failed','timedOut','interrupted'].includes(status))local.failed++;else if(status==='skipped')local.skipped++;else local.notObserved++;const errors=Array.isArray(result?.errors)?result.errors:[];return{id:row.id.slice(0,128),title:row.title.slice(0,300),status,retry:result?.retry??null,errors:errors.slice(0,1).map(e=>String(e?.message??e?.value??e).slice(0,750))};});
   assert.equal(Object.values(local).reduce((n,v)=>n+v,0),declared.length);for(const key of Object.keys(totals))totals[key]+=local[key];groups.push({profile,status:`${kind}-observed-not-accepted`,declaredCases:declared.length,reportError,cases,runnerErrors});
  }catch(error){totals.notObserved+=declared.length;groups.push({profile,status:'evidence-unreadable',error:error.message.slice(0,1000),reportError,declaredCases:declared.length});}
 }
 const declaredCases=Object.values(CASES).flat().length;assert.equal(Object.values(totals).reduce((n,v)=>n+v,0),declaredCases);
 return{declaredCases,...totals,incompleteCases:totals.skipped+totals.notObserved,groups,caveat:'Counts describe available raw evidence only. No complete gate or visual acceptance is inferred.'};
}
export function stageDiagnostic({inputRoot='campaign-results',outputRoot='campaign-upload',reason,rows=scanSizes(inputRoot),binding=null}){
 mkdirSync(outputRoot,{recursive:true});assert.equal(scanSizes(outputRoot).length,0,'Diagnostic output must start empty');
 const files=[],omitted=[],reserved=DIAGNOSTIC_CAP-MANIFEST_RESERVE;let total=0;
 const ordered=[...rows].sort((a,b)=>priority(a.file)-priority(b.file)||a.file.localeCompare(b.file));
 for(const row of ordered){const p=priority(row.file);if(p===99||files.length>=MAX_DIAGNOSTIC_FILES){omitted.push({...row,sha256:hashFile(join(inputRoot,row.file)),reason:p===99?'optional binary or unrequested diagnostic':'file-count bound'});continue;}
  const perFile=p<=2?256*1024:p===5?512*1024:p===6?128*1024:64*1024;
  if(row.bytes>perFile||row.bytes>reserved-total){omitted.push({...row,sha256:hashFile(join(inputRoot,row.file)),reason:'diagnostic byte bound; original not included'});continue;}
  const src=join(inputRoot,row.file),dest=join(outputRoot,row.file);if(p===5){try{const png=readFileSync(src);verifyPng(png,[png.readUInt32BE(16),png.readUInt32BE(20)]);}catch(error){omitted.push({...row,sha256:hashFile(src),reason:`PNG validation failed: ${error.message}`.slice(0,400)});continue;}}mkdirSync(dirname(dest),{recursive:true});copyFileSync(src,dest);const data=readFileSync(dest);assert.equal(data.length,row.bytes);files.push({...row,sha256:sha(data),original:true});total+=row.bytes;
 }
 const outcome=diagnosticOutcome(inputRoot);const outcomeBytes=Buffer.from(JSON.stringify(outcome,null,2)+'\n');assert(outcomeBytes.length<=64*1024);writeFileSync(join(outputRoot,'diagnostic-outcome.json'),outcomeBytes);files.push({file:'diagnostic-outcome.json',bytes:outcomeBytes.length,sha256:sha(outcomeBytes),original:false});total+=outcomeBytes.length;
 const large=rows.slice().sort((a,b)=>b.bytes-a.bytes).slice(0,12);const manifest={schemaVersion:2,status:'incomplete',kind:'bounded-diagnostic-only',fullEvidenceAvailable:false,binding:binding??{status:'not-established-in-fallback'},reason:String(reason).slice(0,4096),outcome,inputBytes:rows.reduce((n,r)=>n+r.bytes,0),inputFiles:rows.length,largestInputFiles:large,diagnosticCap:DIAGNOSTIC_CAP,files,omittedFiles:omitted.slice(0,100).map(row=>({...row,file:row.file.slice(0,512),pathTruncated:row.file.length>512})),omittedCount:omitted.length,omittedInventoryTruncated:omitted.length>100,retentionDays:1,caveat:'No omitted screenshot, postcard or trace is verified or recoverable from this diagnostic bundle. No browser pass is claimed.'};
 let bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');assert(total+bytes.length<=DIAGNOSTIC_CAP,'Diagnostic manifest cap');writeFileSync(join(outputRoot,'evidence-manifest.json'),bytes);assert(scanSizes(outputRoot).reduce((n,r)=>n+r.bytes,0)<=DIAGNOSTIC_CAP);return manifest;
}
export function packageEvidence(){
 mkdirSync('campaign-results',{recursive:true});for(const name of['campaign-source.json','campaign-build.json'])if(existsSync(name))copyFileSync(name,`campaign-results/${name}`);
 let rows=scanSizes('campaign-results'),measured=rows.reduce((n,r)=>n+r.bytes,0),working=rows.filter(row=>isWorkingTrace(row.file));
 let manifest,reason,binding;try{binding={status:'verified',sourceFingerprint:verifyBuild(true).sourceFingerprint};}catch(error){binding={status:'failed',error:error.message.slice(0,4096)};}
 const omissions={kind:'unfinalized-playwright-working-traces',reason:'Canonical case trace.zip, raw results, progress, original images and runner metadata remain eligible; only exact known recorder working-file paths are excluded.',sourceFingerprint:binding.sourceFingerprint??null,files:working.map(row=>({...row,sha256:hashFile(join('campaign-results',row.file))})),bytes:working.reduce((n,row)=>n+row.bytes,0),originalsModified:false};
 if(working.length)writeFileSync('campaign-results/working-trace-omissions.json',JSON.stringify(omissions,null,2)+'\n');
 rows=scanSizes('campaign-results');const eligible=rows.filter(row=>!isWorkingTrace(row.file)),eligibleBytes=eligible.reduce((n,row)=>n+row.bytes,0);
 console.log(JSON.stringify({event:'evidence-size-precheck',bytes:measured,eligibleBytes,workingTraceBytes:omissions.bytes,cap:MAX_ARTIFACT_BYTES,largestFiles:rows.slice().sort((a,b)=>b.bytes-a.bytes).slice(0,12)}));
 if(eligibleBytes+MANIFEST_RESERVE>MAX_ARTIFACT_BYTES)reason=`Eligible full evidence is ${eligibleBytes} bytes before final manifest; capped diagnostic fallback selected`;
 else try{manifest=inspectFullEvidence();}catch(error){reason=`Full evidence verification failed: ${error.message}`;}
 if(reason){manifest=stageDiagnostic({reason,rows,binding});}
 else{mkdirSync('campaign-upload',{recursive:true});assert.equal(scanSizes('campaign-upload').length,0);for(const row of scanSizes('campaign-results').filter(row=>!isWorkingTrace(row.file))){const dest=join('campaign-upload',row.file);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join('campaign-results',row.file),dest);}assert(scanSizes('campaign-upload').reduce((n,r)=>n+r.bytes,0)<=MAX_ARTIFACT_BYTES);}
 console.log(JSON.stringify({event:'evidence-ready',status:manifest.status,kind:manifest.kind??'full',files:scanSizes('campaign-upload').length,bytes:scanSizes('campaign-upload').reduce((n,r)=>n+r.bytes,0)}));return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('gate/package.mjs'))packageEvidence();
