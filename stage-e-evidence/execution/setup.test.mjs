import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {LIMITS} from './policy.mjs';
import {SETUP_ROOT,PLAYWRIGHT_IMAGE,BROWSERS_PATH,setupDeadline,containerPreflight,browserPreflight,createSetupDirectory,verifySetupClock,runSetup} from './setup.mjs';

const epoch=1700000000;
const env={GITHUB_ACTIONS:'true',MOTICOS_STAGE_E_EPOCH:String(epoch),PLAYWRIGHT_BROWSERS_PATH:BROWSERS_PATH};
const good={status:0,signal:null,error:null,timedOut:false,groupCleanup:'not-required'};
const dockerInfo={driverVersion:'1.61.1',dockerImageName:PLAYWRIGHT_IMAGE};
const clockProof={status:'bound',epoch,jobSeconds:LIMITS.jobSeconds,clockIncludesContainerProvisioning:true};
function fixture(t,withClock=true) {
  const repoRoot=fs.mkdtempSync(join(os.tmpdir(),'e-drag-setup-'));t.after(()=>fs.rmSync(repoRoot,{recursive:true,force:true}));
  const bytes=Buffer.from('{"fixture":"source"}\n');fs.writeFileSync(join(repoRoot,'stage-e-source.json'),bytes);
  if(withClock){fs.mkdirSync(join(repoRoot,SETUP_ROOT));fs.writeFileSync(join(repoRoot,SETUP_ROOT,'job-clock.json'),JSON.stringify(clockProof)+'\n');}
  const sourceFingerprint=createHash('sha256').update(bytes).digest('hex');
  return {repoRoot,env,now:()=>epoch*1000+1000,sourceCheck:()=>({sourceFingerprint}),containerCheck:()=>({...dockerInfo,browsersPath:BROWSERS_PATH}),sourceFingerprint};
}
const readState=f=>JSON.parse(fs.readFileSync(join(f.repoRoot,SETUP_ROOT,'setup.json')));

test('container preflight requires exact Node image metadata and browser directory without launching',async()=>{
  const options={env,nodeVersion:'24.19.0',readFile:(path)=>{if(path==='/proc/1/comm')return 'docker-init\n';assert.equal(path,'/ms-playwright/.docker-info');return JSON.stringify(dockerInfo);}};
  assert.equal(containerPreflight(options).dockerImageName,PLAYWRIGHT_IMAGE);assert.deepEqual(containerPreflight(options).initProcess,{pid:1,comm:'docker-init'});
  for(const change of [{nodeVersion:'22.0.0'},{env:{...env,PLAYWRIGHT_BROWSERS_PATH:'/tmp/browsers'}},{readFile:()=>JSON.stringify({...dockerInfo,driverVersion:'1.61.0'})},{readFile:()=>JSON.stringify({...dockerInfo,dockerImageName:'untrusted:1.61.1'})}])assert.throws(()=>containerPreflight({...options,...change}));
  let versions=0,loads=0;const accesses=[];
  const browserOptions={env,containerCheck:()=>containerPreflight(options),versionCheck:()=>{versions++;},loadPlaywright:async()=>{loads++;return Object.fromEntries(['chromium','webkit'].map(name=>[name,{executablePath:()=>`${BROWSERS_PATH}/${name}/browser`,launch:()=>assert.fail('No browser launch permitted')}]))},stat:()=>({isFile:()=>true}),realpath:path=>path,access:(path,mode)=>{assert.equal(mode,fs.constants.X_OK);accesses.push(path);}};
  const result=await browserPreflight(browserOptions);assert.equal(versions,1);assert.equal(loads,1);assert.equal(result.browserLaunches,0);assert.equal(accesses.length,2);
  await assert.rejects(browserPreflight({...browserOptions,versionCheck:()=>{throw Error('Pinned package required');}}),/Pinned package/);
  await assert.rejects(browserPreflight({...browserOptions,realpath:()=>'/tmp/untrusted'}),/escapes/);
  await assert.rejects(browserPreflight({...browserOptions,access:()=>{throw Error('Missing browser executable');}}),/Missing browser/);
});

test('setup preserves the immutable job clock, exact commands, logs and a single shared deadline',async t=>{
  const f=fixture(t),clock=fs.readFileSync(join(f.repoRoot,SETUP_ROOT,'job-clock.json'),'utf8');
  let current=epoch*1000+1000;const calls=[];
  const result=await runSetup({...f,now:()=>current,command:async(executable,args,options)=>{
    calls.push({executable,args,options});fs.writeSync(options.stdio[1],`synthetic ${calls.length}\n`);current+=100;
    assert.equal(options.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD,'1');assert.equal(options.cwd,f.repoRoot);assert.equal(options.artifactRoot,join(f.repoRoot,SETUP_ROOT));return good;
  }});
  assert.equal(result.status,'passed');assert.equal(result.browserStarted,false);assert.equal(result.sourceFingerprint,f.sourceFingerprint);assert.equal(result.sourceVerified,true);assert.equal(result.lastStage,'prepare');assert.equal(result.deadlineMs,(epoch+LIMITS.setupSeconds)*1000);
  assert.equal(calls.length,3);assert.equal(calls[0].executable,'npm');assert.deepEqual(calls[0].args,['ci','--no-audit','--no-fund']);assert.equal(calls[1].args.at(-1),'--browser-preflight');assert.equal(calls[2].args[0],join(f.repoRoot,'stage-e-evidence/execution/prepare-run.mjs'));
  assert.deepEqual(calls.map(c=>c.options.timeout),[LIMITS.setupSeconds*1000-1000,LIMITS.setupSeconds*1000-1100,LIMITS.setupSeconds*1000-1200]);
  assert(result.steps.every(step=>step.status==='passed'));assert.deepEqual(readState(f),result);assert.equal(fs.readFileSync(join(f.repoRoot,SETUP_ROOT,'job-clock.json'),'utf8'),clock);
  for(const name of ['npm-ci.log','browser-preflight.log','prepare.log'])assert.match(fs.readFileSync(join(f.repoRoot,SETUP_ROOT,name),'utf8'),/synthetic/);
  assert(!fs.existsSync(join(f.repoRoot,'stage-e-browser-results')),'Only prepare may create browser results');
  await assert.rejects(runSetup({...f,command:()=>assert.fail('Must not rerun')}),/Never overwrite/);assert.deepEqual(readState(f),result);
});

test('exit 124, bounded timeout, interruption and unconfirmed cleanup stop before downstream phases',async t=>{
  const phases=['npm-ci','browser-preflight','prepare'];
  for(const failedPhase of phases)for(const processResult of [{...good,status:124},{...good,status:null,signal:'SIGTERM',timedOut:true,error:'Hard child deadline reached',groupCleanup:'terminated'},{...good,status:null,signal:'SIGTERM'},{...good,groupCleanup:'unconfirmed'}]){
    const f=fixture(t);let calls=0;
    const result=await runSetup({...f,command:async()=>phases[calls++]===failedPhase?processResult:good});
    assert.equal(calls,phases.indexOf(failedPhase)+1);assert.equal(result.status,'incomplete-or-failed');assert.equal(result.browserStarted,false);assert.equal(result.lastStage,failedPhase);assert.equal(result.timedOut,processResult.status===124||processResult.timedOut);assert.equal(result.sourceFingerprint,f.sourceFingerprint);
    assert.equal(result.steps.at(-1).status,result.timedOut?'timed-out':'failed');assert.equal(result.steps.at(-1).timedOut,result.timedOut);assert.deepEqual(result.steps.at(-1).process,processResult);assert.deepEqual(readState(f),result);
    assert(result.steps.slice(0,-1).every(step=>step.status==='passed'));
    if(processResult.status===124)assert.equal(result.timeoutMeaning,'command-exit-124');if(processResult.timedOut)assert.equal(result.timeoutMeaning,'bounded-process-deadline');
    if(failedPhase!=='prepare')assert.match(fs.readFileSync(join(f.repoRoot,SETUP_ROOT,'prepare.log'),'utf8'),new RegExp(`not started.*${failedPhase}`));
  }
});

test('expired or malformed clocks and source/container failures produce explicit diagnostics without installing',async t=>{
  assert.equal(setupDeadline(env,epoch*1000+1000),(epoch+LIMITS.setupSeconds)*1000);
  for(const change of [{MOTICOS_STAGE_E_EPOCH:''},{MOTICOS_STAGE_E_EPOCH:'1.5'},{MOTICOS_STAGE_E_EPOCH:String(epoch+10)},{GITHUB_ACTIONS:'false'}])assert.throws(()=>setupDeadline({...env,...change},epoch*1000+1000));
  for(const options of [{now:()=>(epoch+LIMITS.setupSeconds)*1000},{env:{...env,MOTICOS_STAGE_E_EPOCH:''}},{sourceCheck:()=>{throw Error('Source mutated');}},{containerCheck:()=>{throw Error('Wrong image');}}]){
    const f=fixture(t);const result=await runSetup({...f,...options,command:()=>assert.fail('No install is permitted')});
    assert.equal(result.status,'incomplete-or-failed');assert(result.error);assert.deepEqual(readState(f),result);
    for(const name of ['npm-ci.log','browser-preflight.log','prepare.log'])assert.match(fs.readFileSync(join(f.repoRoot,SETUP_ROOT,name),'utf8'),/not started/);
    if(options.now){assert.equal(result.timedOut,true);assert.equal(result.timeoutMeaning,'shared-setup-deadline-before-stage');}
    if(options.sourceCheck)assert.equal(result.sourceFingerprint,f.sourceFingerprint);
  }
  const f=fixture(t);let current=epoch*1000+1000,calls=0;
  const result=await runSetup({...f,now:()=>current,command:async()=>{calls++;current=(epoch+LIMITS.setupSeconds)*1000;return good;}});
  assert.equal(calls,1);assert.equal(result.status,'incomplete-or-failed');assert.equal(result.timeoutMeaning,'shared-setup-deadline-after-stage');assert.equal(result.steps.at(-1).status,'timed-out');
  for(const invalid of [{...clockProof,status:'incomplete-or-failed'},{...clockProof,epoch:epoch+1},{...clockProof,clockIncludesContainerProvisioning:false}]){
    const f=fixture(t);fs.writeFileSync(join(f.repoRoot,SETUP_ROOT,'job-clock.json'),JSON.stringify(invalid));
    assert.throws(()=>verifySetupClock(join(f.repoRoot,SETUP_ROOT),env));
    const result=await runSetup({...f,command:()=>assert.fail('Unbound clock cannot install')});assert.equal(result.lastStage,'job-clock-verification');assert.equal(result.status,'incomplete-or-failed');assert.equal(result.sourceFingerprint,f.sourceFingerprint);
  }
  const missing=fixture(t,false),failed=await runSetup({...missing,command:()=>assert.fail('Missing clock cannot install')});assert.equal(failed.status,'incomplete-or-failed');assert.equal(failed.lastStage,'job-clock-verification');
});

test('setup never replaces existing evidence, empty existing roots, or symlinked clock files',t=>{
  for(const kind of ['empty','old','clock-link','root-link']){
    const f=fixture(t,false),root=join(f.repoRoot,SETUP_ROOT),outside=join(f.repoRoot,'outside');fs.mkdirSync(outside);
    if(kind==='root-link')fs.symlinkSync(outside,root);else {fs.mkdirSync(root);if(kind==='old')fs.writeFileSync(join(root,'npm-ci.log'),'old evidence');if(kind==='clock-link')fs.symlinkSync(join(f.repoRoot,'stage-e-source.json'),join(root,'job-clock.json'));}
    assert.throws(()=>createSetupDirectory(f.repoRoot));assert(!fs.existsSync(join(outside,'setup.json')));
    if(kind==='old')assert.equal(fs.readFileSync(join(root,'npm-ci.log'),'utf8'),'old evidence');
  }
});
