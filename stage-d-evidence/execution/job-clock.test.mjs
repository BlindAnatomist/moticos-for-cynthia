import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import {join} from 'node:path';
import {selectClock,establishClock} from './job-clock.mjs';import {TARGET} from './policy.mjs';import {requireSetup} from './validate-all.mjs';import {finalizeEvidence} from './finalize.mjs';
const now=Date.parse('2026-10-09T15:50:00Z'),start='2026-10-09T15:48:00Z';
const env={GITHUB_ACTIONS:'true',MOTICOS_320_PUBLIC_REPO:'true',GITHUB_REPOSITORY:TARGET.repository,GITHUB_REF:TARGET.ref,GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'push',GITHUB_RUN_ID:'123',GITHUB_JOB:'verification',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',RUNNER_NAME:'exact standard runner'};
const payload={total_count:1,jobs:[{id:456,run_id:123,head_sha:env.GITHUB_SHA,name:'verification',runner_name:env.RUNNER_NAME,status:'in_progress',started_at:start,run_attempt:1}]};
test('actual current-job start includes container startup and rejects substituted identities',()=>{
 const r=selectClock(payload,env,now);assert.equal(r.initialElapsedSeconds,120);assert.equal(r.epoch,Date.parse(start)/1000);assert(r.clockIncludesContainerProvisioning);
 for(const [key,value]of Object.entries({run_id:124,head_sha:'b'.repeat(40),name:'other',runner_name:'other',status:'completed',started_at:'2026-10-09T15:51:00Z',run_attempt:2})){const p=structuredClone(payload);p.jobs[0][key]=value;assert.throws(()=>selectClock(p,env,now));}
 assert.throws(()=>selectClock({...payload,total_count:2},env,now));assert.throws(()=>selectClock(payload,env,now+420000));
});
test('public clock lookup is bounded, single-attempt and fails closed with saved diagnostics',async()=>{
 for(const status of [200,403]){const dir=fs.mkdtempSync(join(os.tmpdir(),'d320-clock-'));try{const root=join(dir,'setup'),e={...env,GITHUB_ENV:join(dir,'env'),RUNNER_TEMP:join(dir,'temp')};let calls=0;const fetcher=async(url,options)=>{calls++;assert(url.includes('/runs/123/attempts/1/jobs?per_page=100'));assert(options.signal);assert(!Object.keys(options.headers).some(k=>k.toLowerCase()==='authorization'));return{ok:status===200,status,json:async()=>payload};};
 if(status===200){await establishClock({env:e,fetcher,now:()=>now,root});assert.match(fs.readFileSync(e.GITHUB_ENV,'utf8'),/MOTICOS_320_EPOCH=1791560880/);assert.equal(JSON.parse(fs.readFileSync(join(root,'job-clock.json'))).status,'bound');}
 else{await assert.rejects(()=>establishClock({env:e,fetcher,now:()=>now,root}),/HTTP 403/);assert.equal(fs.existsSync(e.GITHUB_ENV),false);assert.equal(JSON.parse(fs.readFileSync(join(root,'job-clock.json'))).phase,'current-job-clock');}
 assert.equal(calls,1);await assert.rejects(()=>establishClock({env:e,fetcher,now:()=>now,root}),/Never overwrite/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}}
});
test('setup timeout cause is preserved and takes priority over missing application build',async()=>{
 const dir=fs.mkdtempSync(join(os.tmpdir(),'d320-setup-finalize-'));try{const setupRoot=join(dir,'setup'),results=join(dir,'results'),output=join(dir,'upload');fs.mkdirSync(setupRoot);fs.writeFileSync(join(setupRoot,'job-clock.json'),JSON.stringify({status:'bound',epoch:123}));fs.writeFileSync(join(setupRoot,'setup.json'),JSON.stringify({status:'incomplete-or-failed',lastStage:'npm-ci',timedOut:true,error:'Hard child deadline reached',browserStarted:false}));const log=Buffer.from('Exact package-download timeout output\n');fs.writeFileSync(join(setupRoot,'npm-ci.log'),log);
 const validator={command:process.execPath,args:['-e',"process.exitCode=1"],cwd:dir};assert.equal(await finalizeEvidence({output,resultsRoot:results,setupRoot,validator}),false);assert.deepEqual(fs.readFileSync(join(output,'setup/npm-ci.log')),log);assert.throws(()=>requireSetup(results,{MOTICOS_320_EPOCH:'123'}),/Setup failed during npm-ci: setup deadline exceeded/);assert(!fs.existsSync(join(results,'stage-d-build.json')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
