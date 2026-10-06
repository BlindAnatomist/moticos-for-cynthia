// Focused diagnosis only. Historical input identity never replaces GITHUB_*.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,cpSync,readdirSync,appendFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const FROZEN=join(ROOT,'frozen-v6');
export const REPORT=join(ROOT,'preflight-report');
export const RESULTS=join(ROOT,'test-results');
export const PROJECT='webkit-iphone-13-diagnostic-chooser';
export const TITLE='diagnostic: matching-garden: collection, 100 Undo histories and all save boundaries';
export const CONFIG_ARG='--config=../diagnostics/chooser-v6/playwright.config.mjs';
export const EXEC_ARGS=['test',CONFIG_ARG,`--project=${PROJECT}`];
export const LIST_ARGS=[...EXEC_ARGS,'--list','--reporter=json'];
export const ORIGINAL={repository:'BlindAnatomist/moticos-for-cynthia',runCommit:'14701d5db89b44a8a935821c455c72c535046d81',runId:'37541756631',runAttempt:1,workflowRef:'BlindAnatomist/moticos-for-cynthia/.github/workflows/verify-expansion-160.yml@refs/heads/verify/current-160-20261006'};
export const TREE='6f643c366f6c421d38076b99006e9c3a488f6408';
export const ADDED=['.github/workflows/diagnose-chooser-v6.yml','diagnostics/chooser-v6/chooser.spec.js','diagnostics/chooser-v6/playwright.config.mjs','diagnostics/chooser-v6/run.mjs'];
export const ARTIFACTS=[
 {id:11448906651,name:'moticos-current-preflight-000',size_in_bytes:24205229,digest:'sha256:d8003dd706d3613502b5fe80a8de3f3a199a1425f3e4e835b111bce4f4aff380'},
 {id:11449500924,name:'moticos-current-preflight-001',size_in_bytes:22904800,digest:'sha256:f27477210bc2fe8adc409d43a6cfa7914fcc89793d9f7cd3cdc9a380c2633cf5'},
 {id:11449456104,name:'moticos-current-preflight-receipt',size_in_bytes:1117,digest:'sha256:3b64b74b1c4c59992d8be542e6092de24a52995dd9bb82fc85ce78e277b0788d'},
];
const require=createRequire(import.meta.url);
const json=file=>JSON.parse(readFileSync(file,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>{mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const frozenModule=name=>import(pathToFileURL(join(FROZEN,'scripts',name)).href);
export function diagnosticIdentity(env=process.env) {
 assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GITHUB_REPOSITORY,ORIGINAL.repository);
 assert.equal(env.GITHUB_REF,'refs/heads/diagnostic/chooser-v6-20261006');assert.equal(env.GITHUB_EVENT_NAME,'push');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
 assert.equal(env.GITHUB_WORKFLOW_REF,`${ORIGINAL.repository}/.github/workflows/diagnose-chooser-v6.yml@refs/heads/diagnostic/chooser-v6-20261006`);
 assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.notEqual(env.GITHUB_SHA,ORIGINAL.runCommit);
 assert.match(env.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);assert.notEqual(env.GITHUB_RUN_ID,ORIGINAL.runId);
 return {repository:env.GITHUB_REPOSITORY,runCommit:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:1,workflowRef:env.GITHUB_WORKFLOW_REF,branch:env.GITHUB_REF,event:env.GITHUB_EVENT_NAME};
}
export function validateInvocation(args,env=process.env) {
 const listing=JSON.stringify(args)===JSON.stringify(LIST_ARGS);
 assert(listing||JSON.stringify(args)===JSON.stringify(EXEC_ARGS),'Only exact one-case diagnostic execution or exact read-only collection is admitted');
 if(!listing){assert.equal(env.MOTICOS_CHOOSER_V6_APPROVED,'1');diagnosticIdentity(env);}
 return listing;
}
export function verifyArtifactMetadata(actual,expected) {
 for(const key of ['id','name','size_in_bytes','digest'])assert.equal(actual[key],expected[key],`Original artifact ${key} differs`);
 assert.equal(actual.expired,false);assert.equal(actual.workflow_run.id,Number(ORIGINAL.runId));
 assert.equal(actual.workflow_run.repository_id,1316742795);assert.equal(actual.workflow_run.head_repository_id,1316742795);
 assert.equal(actual.workflow_run.head_branch,'verify/current-160-20261006');assert.equal(actual.workflow_run.head_sha,ORIGINAL.runCommit);
 assert.equal(actual.archive_download_url,`https://api.github.com/repos/${ORIGINAL.repository}/actions/artifacts/${expected.id}/zip`);
 return actual;
}
export function verifyReceipt(receipt) {
 assert.deepEqual(Object.keys(receipt).sort(),['schemaVersion','identity','artifacts'].sort());assert.equal(receipt.schemaVersion,1);assert.deepEqual(receipt.identity,ORIGINAL);
 assert.deepEqual(receipt.artifacts,ARTIFACTS.slice(0,2).map(a=>({name:a.name,id:String(a.id),sha256:a.digest.slice(7),url:`https://github.com/${ORIGINAL.repository}/actions/runs/${ORIGINAL.runId}/artifacts/${a.id}`})));
 return receipt;
}
export function verifyOriginalRun(run) {
 assert.equal(run.id,Number(ORIGINAL.runId));assert.equal(run.head_sha,ORIGINAL.runCommit);assert.equal(run.head_branch,'verify/current-160-20261006');assert.equal(run.event,'push');assert.equal(run.run_attempt,1);assert.equal(run.path,'.github/workflows/verify-expansion-160.yml');assert.equal(run.status,'completed');assert.equal(run.repository.id,1316742795);assert.equal(run.repository.full_name,ORIGINAL.repository);
 return run;
}
async function api(path,redirect='error') {
 assert(process.env.GH_TOKEN,'Read-only Actions token is required');
 const response=await fetch(`https://api.github.com/repos/${ORIGINAL.repository}/${path}`,{headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect,signal:AbortSignal.timeout(15000)});
 if(redirect==='manual')assert.equal(response.status,302,'Artifact download must be a signed redirect');else assert(response.ok,`GitHub read returned ${response.status}`);
 return response;
}
function command(program,args,{cwd=ROOT,log,timeout=55000}={}) {
 const result=spawnSync(program,args,{cwd,encoding:'utf8',timeout,maxBuffer:8*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 if(log)writeFileSync(join(REPORT,log),JSON.stringify({program,args,cwd,status:result.status,signal:result.signal,error:result.error?.message??null})+'\n'+(result.stdout??'')+(result.stderr??''));
 assert.equal(result.status,0,`${program} failed (${result.signal??result.error?.message??result.status}); see ${log}`);
 return result.stdout;
}
async function retrieve() {
 diagnosticIdentity();mkdirSync(REPORT,{recursive:true});
 const run=verifyOriginalRun(await (await api(`actions/runs/${ORIGINAL.runId}`)).json());save(join(REPORT,'original-run.json'),run);
 const downloadRoot=join(ROOT,'.chooser-input');assert(!existsSync(downloadRoot));mkdirSync(downloadRoot);
 for(const expected of ARTIFACTS){
  const actual=verifyArtifactMetadata(await (await api(`actions/artifacts/${expected.id}`)).json(),expected);save(join(REPORT,`artifact-${expected.id}.json`),actual);
  const location=new URL((await api(`actions/artifacts/${expected.id}/zip`,'manual')).headers.get('location'));
  assert.equal(location.protocol,'https:');assert(!location.username&&!location.password);
  // The bearer token stays on api.github.com; signed storage receives no auth header.
  const response=await fetch(location,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(response.ok,`Archive read returned ${response.status}`);
  const reader=response.body.getReader(),parts=[];let count=0;
  while(true){const next=await reader.read();if(next.done)break;count+=next.value.length;assert(count<=expected.size_in_bytes,'Archive exceeds authenticated size');parts.push(next.value);}
  const bytes=Buffer.concat(parts);assert.equal(bytes.length,expected.size_in_bytes);assert.equal(`sha256:${sha(bytes)}`,expected.digest);
  writeFileSync(join(downloadRoot,`${expected.id}.zip`),bytes,{flag:'wx'});
 }
 // Extract only the exact verified archive member sets, without trusting paths.
 command('python3',['-c',`import pathlib,zipfile,stat,sys
root=pathlib.Path(sys.argv[1]); ids=['11448906651','11449500924','11449456104']
for i,aid in enumerate(ids):
 destination=root/('parts-downloads/'+aid if i<2 else 'receipt');destination.mkdir(parents=True)
 expected={'manifest.json',f'part-{i:03d}.bin'} if i<2 else {'current-artifact-receipt.json'}
 with zipfile.ZipFile(root/(aid+'.zip')) as z:
  entries=z.infolist();assert len(entries)==len(expected) and {e.filename for e in entries}==expected
  for e in entries:
   assert not e.is_dir() and not stat.S_ISLNK(e.external_attr>>16) and e.file_size<=24*1024*1024
   (destination/e.filename).write_bytes(z.read(e))
`,downloadRoot],{log:'extract-original-archives.log'});
 const receipt=verifyReceipt(json(join(downloadRoot,'receipt/current-artifact-receipt.json')));save(join(REPORT,'original-upload-receipt.json'),receipt);
 command('python3',[join(FROZEN,'scripts/assembleExpansion160Parts.py'),'--downloads',join(downloadRoot,'parts-downloads'),'--output',join(downloadRoot,'parts'),'--kind','preflight'],{log:'assemble-original-parts.log'});
 command('python3',[join(FROZEN,'scripts/expansion160Evidence.py'),'restore','--parts',join(downloadRoot,'parts'),'--output',join(downloadRoot,'restored')],{log:'restore-original-input.log'});
}
export async function verifyInput() {
 const execution=diagnosticIdentity();assert.equal(git(ROOT,'rev-parse','HEAD'),execution.runCommit);assert.equal(git(FROZEN,'rev-parse','HEAD'),ORIGINAL.runCommit);assert.equal(git(FROZEN,'rev-parse','HEAD^{tree}'),TREE);
 const {trackedInventory,inventory}=await frozenModule('currentCandidate.mjs');
 const source=trackedInventory(FROZEN);assert.equal(source.length,344);
 const current=trackedInventory(ROOT);assert.equal(current.length,348);
 assert.deepEqual(current.filter(r=>!ADDED.includes(r.file)),source,'Only the four added diagnostic files may differ');assert.deepEqual(current.filter(r=>ADDED.includes(r.file)).map(r=>r.file).sort(),ADDED.slice().sort());
 const inputs=join(ROOT,'.chooser-input');verifyOriginalRun(json(join(REPORT,'original-run.json')));
 for(const expected of ARTIFACTS){verifyArtifactMetadata(json(join(REPORT,`artifact-${expected.id}.json`)),expected);const bytes=readFileSync(join(inputs,`${expected.id}.zip`));assert.equal(bytes.length,expected.size_in_bytes);assert.equal(`sha256:${sha(bytes)}`,expected.digest);}
 verifyReceipt(json(join(inputs,'receipt/current-artifact-receipt.json')));
 const restored=join(inputs,'restored/preflight-results');
 const returnedSource=inventory(restored,'source').map(r=>({...r,file:r.file.slice('source/'.length)}));
 assert.deepEqual(returnedSource.sort((a,b)=>a.file.localeCompare(b.file)),source.map(({mode,...r})=>r).sort((a,b)=>a.file.localeCompare(b.file)),'Restored original source bytes must equal the exact frozen checkout');
 for(const record of source){const stat=lstatSync(join(restored,'source',record.file));assert.equal(stat.mode&0o111?'100755':'100644',record.mode);}
 const proof=json(join(restored,'build-proof.json'));assert.deepEqual(proof.identity,ORIGINAL);assert.deepEqual(proof.source,source);
 const returnedBuild=['dist','dist-batch','dist-expansion','dist-expansion160'].flatMap(folder=>inventory(join(restored,'build'),folder));assert.deepEqual(returnedBuild,proof.files,'All original restored build inventories must match their proof');
 const target=join(FROZEN,'dist-expansion160');if(!existsSync(target))cpSync(join(restored,'build/dist-expansion160'),target,{recursive:true,errorOnExist:true,force:false});
 const {verifyBuild}=await frozenModule('verifyExpansion160Build.mjs');const verified=await verifyBuild(proof,FROZEN,ORIGINAL);
 assert(readFileSync(join(restored,'expansion160-manifest.json')).equals(readFileSync(join(target,'expansion160-manifest.json'))));
 const record={purpose:'diagnostic-only-not-release-acceptance',originalInput:{identity:ORIGINAL,tree:TREE,artifacts:ARTIFACTS,verifiedBuild:verified,buildProofSha256:sha(readFileSync(join(restored,'build-proof.json'))),sourceInventory:source,buildInventory:proof.files},diagnosticExecution:execution};
 save(join(REPORT,'input-verification.json'),record);return record;
}
export function verifyCollected(report) {
 assert.deepEqual(report.errors??[],[]);const specs=[];
 const walk=suites=>{for(const suite of suites??[]){specs.push(...suite.specs??[]);walk(suite.suites);}};walk(report.suites);
 assert.equal(specs.length,1);const spec=specs[0];assert.equal(spec.title,TITLE);assert.equal(spec.file.split('/').at(-1),'chooser.spec.js');assert.equal(spec.tests.length,1);assert.equal(spec.tests[0].projectName,PROJECT);assert.equal(spec.tests[0].repeatEachIndex??0,0);
 assert.equal(report.config.fullyParallel,false);assert.equal(report.config.shard,null);assert.equal(report.config.workers,1);assert.equal(report.config.maxFailures,1);assert.equal(report.config.globalTimeout,90000);assert.equal(report.config.forbidOnly,true);assert.equal(report.config.projects.length,1);assert.equal(report.config.projects[0].retries,0);assert.equal(report.config.projects[0].repeatEach,1);assert.equal(report.config.projects[0].timeout,45000);
 return {title:spec.title,file:spec.file,project:PROJECT,testId:spec.id,caseCount:1};
}
async function collect() {
 diagnosticIdentity();const cli=join(dirname(require.resolve('playwright/package.json')),'cli.js');
 const stdout=command(process.execPath,[cli,...LIST_ARGS],{cwd:FROZEN,log:'collection-command.log',timeout:15000});
 const report=JSON.parse(stdout);save(join(REPORT,'collected-case.json'),report);save(join(REPORT,'collection-verification.json'),verifyCollected(report));
}
export async function recordDiagnosticEnvironment(browser,info) {
 const input=json(join(REPORT,'input-verification.json'));const execution=diagnosticIdentity();assert.deepEqual(input.diagnosticExecution,execution);
 const record={purpose:'diagnostic-only-not-release-acceptance',originalInput:input.originalInput.identity,originalManifestSha256:input.originalInput.verifiedBuild.manifestSha256,diagnosticExecution:execution,profile:info.project.name,browserName:info.project.use.browserName,browserVersion:browser.version(),playwrightVersion:require('@playwright/test/package.json').version,nodeVersion:process.version,platform:process.platform,architecture:process.arch,device:info.project.use,guardedArguments:JSON.parse(process.env.MOTICOS_CHOOSER_V6_ARGV??'null'),browserBudgetMs:90000,caseTimeoutMs:45000,tracePolicy:info.project.use.trace,collectedCase:json(join(REPORT,'collection-verification.json'))};
 assert.equal(record.playwrightVersion,'1.61.1');assert.equal(record.profile,PROJECT);assert.deepEqual(record.device.viewport,{width:390,height:664});assert.equal(record.device.deviceScaleFactor,3);
 save(join(RESULTS,'environment.json'),record);
}
async function runCase() {
 assert.equal(process.env.MOTICOS_CHOOSER_V6_APPROVED,'1');await verifyInput();verifyCollected(json(join(REPORT,'collected-case.json')));
 const elapsed=Date.now()-Number(process.env.MOTICOS_CHOOSER_JOB_EPOCH)*1000;assert(Number.isFinite(elapsed)&&elapsed>=0&&elapsed<330000,'Not enough approved job time for one run plus complete packaging/upload');
 process.chdir(FROZEN);mkdirSync(RESULTS,{recursive:true});
 const vite=join(dirname(require.resolve('vite/package.json')),'bin/vite.js'),cli=join(dirname(require.resolve('playwright/package.json')),'cli.js');
 let server,runner,serverError=null,runnerError=null,runnerResult=null,ready=false,interrupted=false;
 const start=new Date().toISOString();
 const stop=child=>{if(child?.pid){try{process.kill(-child.pid,'SIGTERM');}catch{};}};
 const kill=child=>{if(child?.pid){try{process.kill(-child.pid,'SIGKILL');}catch{};}};
 const log=(file,chunk)=>appendFileSync(join(REPORT,file),chunk);
 const onSignal=()=>{interrupted=true;stop(runner);stop(server);};process.once('SIGTERM',onSignal);process.once('SIGINT',onSignal);
 try{
  server=spawn(process.execPath,[vite,'preview','--outDir','dist-expansion160','--host','127.0.0.1','--port','4197','--strictPort'],{cwd:FROZEN,detached:true,stdio:['ignore','pipe','pipe']});server.on('error',error=>{serverError=String(error);});server.stdout.on('data',chunk=>log('server.log',chunk));server.stderr.on('data',chunk=>log('server.log',chunk));
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){assert(!interrupted&&!serverError&&server.exitCode===null,'Diagnostic preview server stopped or interrupted');try{const response=await fetch('http://127.0.0.1:4197/expansion160-manifest.json',{signal:AbortSignal.timeout(1000)});if(response.ok){const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),json(join(REPORT,'input-verification.json')).originalInput.verifiedBuild.manifestSha256);ready=true;break;}}catch(error){if(error.code==='ERR_ASSERTION')throw error;}await new Promise(resolve=>setTimeout(resolve,100));}
  assert(ready&&!interrupted,'Verified original build server was unavailable or interrupted within 10 seconds');
  runner=spawn(process.execPath,[cli,...EXEC_ARGS],{cwd:FROZEN,detached:true,stdio:['ignore','pipe','pipe']});runner.stdout.on('data',chunk=>{process.stdout.write(chunk);log('browser-command.log',chunk);});runner.stderr.on('data',chunk=>{process.stderr.write(chunk);log('browser-command.log',chunk);});
  runnerResult=await new Promise(resolve=>{const timer=setTimeout(()=>{runnerError='Outer browser command exceeded 100 seconds';kill(runner);},100000);runner.once('error',error=>{runnerError=String(error);clearTimeout(timer);resolve({code:null,signal:null});});runner.once('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});});
 }finally{
  stop(runner);stop(server);await new Promise(resolve=>setTimeout(resolve,250));kill(runner);kill(server);process.removeListener('SIGTERM',onSignal);process.removeListener('SIGINT',onSignal);
  save(join(REPORT,'runner-outcome.json'),{purpose:'diagnostic-only-not-release-acceptance',diagnosticExecution:diagnosticIdentity(),startedAt:start,finishedAt:new Date().toISOString(),ready,serverError,runnerError,runnerResult,command:{executable:process.execPath,args:[cli,...EXEC_ARGS],cwd:FROZEN},serverCommand:{executable:process.execPath,args:[vite,'preview','--outDir','dist-expansion160','--host','127.0.0.1','--port','4197','--strictPort'],cwd:FROZEN}});
 }
 const report=json(join(RESULTS,'results.json')),collected=verifyCollected(report);
 assert.equal(collected.testId,json(join(REPORT,'collection-verification.json')).testId,'Executed case identity differs from read-only collection');
 const specs=[];const walk=suites=>{for(const suite of suites??[]){specs.push(...suite.specs??[]);walk(suite.suites);}};walk(report.suites);
 const test=specs[0].tests[0];assert.equal(test.results.length,1,'There must be exactly one actual attempt');assert.equal(test.results[0].retry,0);assert(['passed','failed','timedOut','interrupted'].includes(test.results[0].status),'A skipped case is not a completed diagnostic');
 save(join(REPORT,'terminal-result.json'),{purpose:'diagnostic-only-not-release-acceptance',...collected,status:test.results[0].status,retry:test.results[0].retry,duration:test.results[0].duration,process:runnerResult,firstObservationPresent:existsSync(join(RESULTS,'chooser-first-observation.json'))});
 assert.equal(runnerResult?.code,0,'The single diagnostic case failed; retain and inspect its first sample and complete evidence');assert(!runnerError);
}
export function verifyPackageBound(manifest,manifestBytes,proofBytes) {
 assert.equal(manifest.part_count,1);assert.equal(manifest.parts.length,1);assert.equal(manifest.chunk_bytes,23*1024*1024);assert.equal(manifest.max_parts,1);assert.deepEqual(manifest.missing_directories,[]);assert.deepEqual(manifest.included_directories,['preflight-report','test-results']);
 const payload=manifest.parts[0];assert.equal(payload.filename,'part-000.bin');assert(payload.bytes>0&&payload.bytes<=23*1024*1024);assert.equal(payload.bytes,manifest.archive.bytes);assert.equal(payload.sha256,manifest.archive.sha256);
 assert(manifestBytes<128*1024&&proofBytes<128*1024);const nativeZipOverheadReserve=128*1024;const upper=payload.bytes+manifestBytes+proofBytes+nativeZipOverheadReserve;assert(upper<=24*1024*1024,'Complete native ZIP would exceed the approved 24 MiB ceiling');return {uploadUpperBound:upper,nativeZipOverheadReserve,limitBytes:24*1024*1024};
}
function packageEvidence() {
 diagnosticIdentity();mkdirSync(RESULTS,{recursive:true});mkdirSync(REPORT,{recursive:true});
 save(join(REPORT,'workflow-outcomes.json'),{purpose:'diagnostic-only-not-release-acceptance',diagnosticExecution:diagnosticIdentity(),steps:JSON.parse(process.env.MOTICOS_CHOOSER_STEP_OUTCOMES??'null'),capturedAt:new Date().toISOString(),originalInputReferences:ARTIFACTS});
 const output=join(ROOT,'chooser-evidence');assert(!existsSync(output));mkdirSync(output);
 const args=[join(ROOT,'scripts/preserveEvidence.py'),'pack','--root',ROOT,'--include','preflight-report','--include','test-results','--archive',join(output,'evidence.tar.gz'),'--out',join(output,'parts'),'--chunk-bytes',String(23*1024*1024),'--max-parts','1'];
 const result=spawnSync('python3',args,{cwd:ROOT,encoding:'utf8',timeout:45000,maxBuffer:1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 const proof={purpose:'diagnostic-only-not-release-acceptance',complete:result.status===0,command:{program:'python3',args,status:result.status,signal:result.signal,error:result.error?.message??null,stdout:result.stdout,stderr:result.stderr},nativeZipLimitBytes:24*1024*1024};
 assert.equal(result.status,0,`Complete evidence packaging failed; no partial artifact is eligible: ${result.stderr}`);
 const parts=join(output,'parts'),manifestBytes=readFileSync(join(parts,'manifest.json')),manifest=JSON.parse(manifestBytes);
 proof.bounds=verifyPackageBound(manifest,manifestBytes.length,16*1024);const encoded=Buffer.from(JSON.stringify(proof,null,2)+'\n');assert(encoded.length<=16*1024);
 const bound=verifyPackageBound(manifest,manifestBytes.length,encoded.length);writeFileSync(join(parts,'packaging-proof.json'),encoded,{flag:'wx'});
 const bytes=readFileSync(join(parts,'part-000.bin'));assert.equal(bytes.length,manifest.parts[0].bytes);assert.equal(sha(bytes),manifest.parts[0].sha256);
 assert.deepEqual(readdirSync(parts).sort(),['manifest.json','packaging-proof.json','part-000.bin']);console.log(JSON.stringify({complete:true,...bound}));
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'complete=true\n');
}
async function verifyUpload() {
 const identity=diagnosticIdentity(),id=process.env.MOTICOS_CHOOSER_ARTIFACT_ID;assert.match(id??'',/^[1-9][0-9]*$/);
 const artifact=await (await api(`actions/artifacts/${id}`)).json();assert.equal(artifact.workflow_run.id,Number(identity.runId));assert.equal(artifact.workflow_run.head_sha,identity.runCommit);assert.equal(artifact.name,'moticos-chooser-v6-diagnostic');assert.equal(artifact.expired,false);assert(artifact.size_in_bytes<=24*1024*1024);assert.equal(artifact.digest,`sha256:${process.env.MOTICOS_CHOOSER_ARTIFACT_DIGEST}`);console.log(JSON.stringify({diagnosticExecution:identity,nativeUploadedArtifact:artifact}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [mode,...extra]=process.argv.slice(2);assert.equal(extra.length,0);
 const modes={identity:async()=>{mkdirSync(REPORT,{recursive:true});save(join(REPORT,'diagnostic-identity.json'),diagnosticIdentity());},retrieve,'verify-input':verifyInput,collect,run:runCase,package:packageEvidence,'verify-upload':verifyUpload};assert(Object.hasOwn(modes,mode),'Unknown diagnostic operation');
 try{await modes[mode]();}catch(error){mkdirSync(REPORT,{recursive:true});save(join(REPORT,`${mode}-failure.json`),{purpose:'diagnostic-only-not-release-acceptance',operation:mode,error:String(error),stack:error.stack,time:new Date().toISOString()});console.error(error);process.exitCode=1;}
}
