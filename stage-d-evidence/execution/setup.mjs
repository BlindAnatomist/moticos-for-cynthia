import {verifyFixtureClosure,assertReconstructionReviewed} from './fixture-closure.mjs';
// Install only JavaScript dependencies. Browsers and their OS dependencies are
// supplied by the pinned job container; this module never launches a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {boundedProcess} from './bounded-process.mjs';
import {verifySource,verifyVersions} from './binding.mjs';
import {LIMITS} from './policy.mjs';
import {REPO_ROOT,requireRepoCwd} from './paths.mjs';

export const SETUP_ROOT='stage-d-setup-results';
export const PLAYWRIGHT_IMAGE='mcr.microsoft.com/playwright:v1.61.1-noble';
export const BROWSERS_PATH='/ms-playwright';
const MODULE=fileURLToPath(import.meta.url);
const LOGS=Object.freeze({'npm-ci':'npm-ci.log','browser-preflight':'browser-preflight.log',prepare:'prepare.log'});

export function setupDeadline(env,startedMs) {
  assert.equal(env.GITHUB_ACTIONS,'true','Container setup requires GitHub Actions');
  assert.match(env.MOTICOS_320_EPOCH??'',/^\d+$/,'Immutable job epoch is required');
  const epoch=Number(env.MOTICOS_320_EPOCH);
  assert(Number.isSafeInteger(epoch)&&epoch>0&&epoch*1000<=startedMs,'Invalid or future job epoch');
  const deadlineMs=(epoch+LIMITS.setupSeconds)*1000;
  assert(Number.isSafeInteger(deadlineMs),'Invalid setup deadline');
  return deadlineMs;
}

export function containerPreflight({env=process.env,nodeVersion=process.versions.node,readFile=fs.readFileSync}={}) {
  assert.equal(Number(nodeVersion.split('.')[0]),24,'Pinned Node major 24 required');
  assert.equal(env.PLAYWRIGHT_BROWSERS_PATH,BROWSERS_PATH,'Pinned browser directory required');
  const info=JSON.parse(readFile(join(BROWSERS_PATH,'.docker-info'),'utf8'));
  assert.equal(info.driverVersion,'1.61.1','Pinned Playwright image driver required');
  assert.equal(info.dockerImageName,PLAYWRIGHT_IMAGE,'Exact official Playwright image required');
  return {nodeVersion,driverVersion:info.driverVersion,dockerImageName:info.dockerImageName,browsersPath:BROWSERS_PATH};
}

export async function browserPreflight({env=process.env,containerCheck=containerPreflight,versionCheck=verifyVersions,loadPlaywright=()=>import('playwright'),stat=fs.statSync,access=fs.accessSync,realpath=fs.realpathSync}={}) {
  const container=containerCheck({env});
  versionCheck();
  const playwright=await loadPlaywright(),executables={};
  for(const name of ['chromium','webkit']) {
    const path=playwright[name].executablePath();
    assert(isAbsolute(path)&&resolve(path).startsWith(BROWSERS_PATH+'/'),`${name} must use container browsers`);
    assert(realpath(path).startsWith(BROWSERS_PATH+'/'),`${name} executable escapes container browser directory`);
    assert(stat(path).isFile(),`${name} executable is not a regular file`);
    access(path,fs.constants.X_OK);
    executables[name]=path;
  }
  return {...container,versionsVerified:true,executables,browserLaunches:0};
}

// An earlier attempt must never be mistaken for this attempt. The clock step
// alone may have created this directory before setup begins.
export function createSetupDirectory(repoRoot) {
  const root=join(repoRoot,SETUP_ROOT);
  let existing;
  try { existing=fs.lstatSync(root); } catch(error) { if(error.code!=='ENOENT')throw error; }
  if(existing) {
    assert(existing.isDirectory()&&!existing.isSymbolicLink(),'Setup evidence root must be a real directory');
    assert.deepEqual(fs.readdirSync(root),['job-clock.json'],'Never overwrite prior setup evidence');
    const clock=fs.lstatSync(join(root,'job-clock.json'));
    assert(clock.isFile()&&!clock.isSymbolicLink(),'Job clock must be a regular file');
  } else fs.mkdirSync(root);
  return root;
}

export function verifySetupClock(root,env) {
  const clock=JSON.parse(fs.readFileSync(join(root,'job-clock.json'),'utf8'));
  assert.equal(clock.status,'bound','Current job clock was not bound');
  assert.equal(clock.epoch,Number(env.MOTICOS_320_EPOCH),'Job clock and setup epoch disagree');
  assert.equal(clock.jobSeconds,LIMITS.jobSeconds,'Current job ceiling changed');
  assert.equal(clock.clockIncludesContainerProvisioning,true,'Job clock must include container provisioning');
  return clock;
}

function message(error) { return String(error?.message??error).slice(0,8192); }

// Inject the process runner, clock, and read-only checks for contracts. Tests
// need no npm invocation, dependency installation, application build or browser.
export async function runSetup({repoRoot=REPO_ROOT,env=process.env,command=boundedProcess,now=Date.now,sourceCheck=verifySource,containerCheck=containerPreflight}={}) {
  const root=createSetupDirectory(repoRoot),startedMs=now();
  const state={schemaVersion:1,status:'running',startedMs,deadlineMs:null,setupSeconds:LIMITS.setupSeconds,sourceFingerprint:null,sourceVerified:false,lastStage:'initialization',browserStarted:false,timedOut:false,timeoutMeaning:null,steps:[],error:null};
  const fds={},stateFd=fs.openSync(join(root,'setup.json'),'wx');
  function save() {
    state.elapsedMs=now()-startedMs;
    const bytes=Buffer.from(JSON.stringify(state,null,2)+'\n');
    fs.writeSync(stateFd,bytes,0,bytes.length,0);fs.ftruncateSync(stateFd,bytes.length);fs.fsyncSync(stateFd);
  }
  function deadlineError(meaning) {
    state.timedOut=true;state.timeoutMeaning=meaning;
    return Error('Combined setup deadline reached');
  }
  async function stage(name,action) {
    state.lastStage=name;
    const step={name,status:'running',startedMs:now(),deadlineMs:state.deadlineMs,timedOut:false,timeoutMeaning:null};state.steps.push(step);save();
    try {
      const remaining=Math.floor(state.deadlineMs-now());
      if(remaining<=0)throw deadlineError('shared-setup-deadline-before-stage');
      await action(step,remaining);
      if(now()>=state.deadlineMs)throw deadlineError('shared-setup-deadline-after-stage');
      step.status='passed';
    } catch(error) {
      step.status=state.timedOut?'timed-out':'failed';step.error=message(error);step.timedOut=state.timedOut;step.timeoutMeaning=state.timeoutMeaning;
      throw error;
    } finally { step.finishedMs=now();step.elapsedMs=step.finishedMs-step.startedMs;save(); }
  }
  async function processStage(name,executable,args) {
    await stage(name,async(step,timeout)=>{
      step.command=executable;step.args=args;step.timeoutMs=timeout;step.log=LOGS[name];save();
      const result=await command(executable,args,{timeout,env:{...env,PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:'1'},cwd:repoRoot,artifactRoot:root,stdio:['ignore',fds[name],fds[name]]});
      step.process=result;
      if(result.timedOut||result.status===124) {
        state.timedOut=true;state.timeoutMeaning=result.timedOut?'bounded-process-deadline':'command-exit-124';
      }
      assert(result.status===0&&!result.signal&&!result.error&&!state.timedOut&&['not-required','terminated'].includes(result.groupCleanup),`${name} failed or interrupted; inspect ${SETUP_ROOT}/${LOGS[name]}`);
    });
  }
  try {
    for(const [name,file] of Object.entries(LOGS))fds[name]=fs.openSync(join(root,file),'wx');
    save();
    state.sourceFingerprint=createHash('sha256').update(fs.readFileSync(join(repoRoot,'stage-d-source.json'))).digest('hex');save();
    state.deadlineMs=setupDeadline(env,startedMs);save();
    await stage('job-clock-verification',async()=>{state.jobClock=verifySetupClock(root,env);});
    await stage('source-verification',async()=>{
      const source=sourceCheck();
      assert.equal(source.sourceFingerprint,state.sourceFingerprint,'Verified source fingerprint mismatch');
      state.sourceVerified=true;
    });
    await stage('container-preflight',async(step)=>{
      step.container=containerCheck({env});
      fs.writeSync(fds['browser-preflight'],JSON.stringify({stage:'container-preflight',...step.container})+'\n');
    });
    await processStage('npm-ci','npm',['ci','--no-audit','--no-fund']);
    await processStage('browser-preflight',process.execPath,[MODULE,'--browser-preflight']);
    await processStage('prepare',process.execPath,[join(repoRoot,'stage-d-evidence/execution/prepare-run.mjs')]);
    state.status='passed';
  } catch(error) {
    state.status='incomplete-or-failed';state.error=message(error);
    for(const [name,fd] of Object.entries(fds))if(!state.steps.some(step=>step.name===name))fs.writeSync(fd,`${name} not started: setup failed at ${state.lastStage}: ${state.error}\n`);
  } finally {
    state.finishedMs=now();save();
    for(const fd of Object.values(fds))fs.closeSync(fd);
    fs.closeSync(stateFd);
  }
  return state;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    requireRepoCwd();
    if(process.argv.length===3&&process.argv[2]==='--browser-preflight')console.log(JSON.stringify(await browserPreflight(),null,2));
    else {
      assert.equal(process.argv.length,2,'No setup arguments are permitted');assertReconstructionReviewed();
      const result=await runSetup();
      console.log(JSON.stringify({status:result.status,lastStage:result.lastStage,timedOut:result.timedOut,timeoutMeaning:result.timeoutMeaning,error:result.error}));
      if(result.status!=='passed')process.exitCode=result.timedOut?124:1;
    }
  } catch(error) { console.error(message(error));process.exitCode=1; }
}
