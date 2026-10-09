// Container provisioning happens before workflow steps. Use the public, exact
// current-job timestamp so image pull/startup counts toward the 36-minute cap.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TARGET,LIMITS,environment} from './policy.mjs';
import {requireRepoCwd} from './paths.mjs';
export const SETUP_ROOT='stage-d-setup-results';
export function selectClock(payload,env,now=Date.now()) {
  environment(env,env.GITHUB_SHA);assert.match(env.GITHUB_SHA,/^[a-f0-9]{40}$/);
  assert.equal(env.GITHUB_JOB,'verification');assert(env.RUNNER_NAME);
  assert.equal(payload.total_count,1,'Exact one-job workflow required');assert.equal(payload.jobs?.length,1);
  const job=payload.jobs[0];assert.equal(String(job.run_id),env.GITHUB_RUN_ID);assert.equal(job.head_sha,env.GITHUB_SHA);
  assert.equal(job.name,env.GITHUB_JOB);assert.equal(job.runner_name,env.RUNNER_NAME);assert.equal(job.status,'in_progress');
  if(job.run_attempt!==undefined)assert.equal(String(job.run_attempt),env.GITHUB_RUN_ATTEMPT);
  assert(Number.isSafeInteger(job.id)&&job.id>0);const started=Date.parse(job.started_at);
  assert(Number.isFinite(started)&&started<=now,'Invalid current job start');
  const epoch=Math.floor(started/1000),elapsed=Math.ceil(now/1000)-epoch;
  assert(elapsed>=0&&elapsed<LIMITS.setupSeconds,'Container/startup already exhausted bounded setup');
  return {status:'bound',jobId:job.id,runId:job.run_id,attempt:Number(env.GITHUB_RUN_ATTEMPT),commit:env.GITHUB_SHA,job:job.name,startedAt:job.started_at,epoch,initialElapsedSeconds:elapsed,jobSeconds:LIMITS.jobSeconds,clockIncludesContainerProvisioning:true};
}
export async function establishClock({env=process.env,fetcher=fetch,now=()=>Date.now(),root=SETUP_ROOT}={}) {
  assert(!fs.existsSync(root),'Never overwrite setup diagnostics');fs.mkdirSync(root);
  const url=`https://api.github.com/repos/${TARGET.repository}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}/jobs?per_page=100`;
  try {
    environment(env,env.GITHUB_SHA);assert(env.GITHUB_ENV&&env.RUNNER_TEMP);
    const response=await fetcher(url,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(10000)});
    assert(response.ok,`Public current-job clock lookup failed: HTTP ${response.status}`);
    const record=selectClock(await response.json(),env,now());
    fs.appendFileSync(env.GITHUB_ENV,`MOTICOS_320_EPOCH=${record.epoch}\nMOTICOS_STAGE_D_PROBE_OUTPUT=${env.RUNNER_TEMP}/moticos-320-probe\nMOTICOS_320_UPLOAD=${env.RUNNER_TEMP}/moticos-320-upload\n`);
    fs.writeFileSync(`${root}/job-clock.json`,JSON.stringify({...record,source:url},null,2)+'\n',{flag:'wx'});return record;
  } catch(error) {
    fs.writeFileSync(`${root}/job-clock.json`,JSON.stringify({status:'incomplete-or-failed',phase:'current-job-clock',source:url,error:String(error.message).slice(0,8192),browserStarted:false},null,2)+'\n',{flag:'wx'});throw error;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){requireRepoCwd();assert.equal(process.argv.length,2);console.log(JSON.stringify(await establishClock()));}
