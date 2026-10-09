import fs from 'node:fs';
import assert from 'node:assert/strict';
import {boundedProcess} from './bounded-process.mjs';
import {requireApproval} from './binding.mjs';
import {validateCompletedProfile} from './validate.mjs';
import {ORDER,ROOT,CONFIG,admit} from './policy.mjs';
import {requireRepoCwd} from './paths.mjs';
requireRepoCwd();const profile=process.argv[2];assert.equal(process.argv.length,3);assert(ORDER.includes(profile));
const binding=requireApproval();assert.match(process.env.MOTICOS_280_EPOCH??'',/^\d+$/);
const elapsed=Math.ceil(Date.now()/1000)-Number(process.env.MOTICOS_280_EPOCH),budget=admit(profile,elapsed);
for(const p of ORDER.slice(0,ORDER.indexOf(profile)))assert.equal(JSON.parse(fs.readFileSync(`${ROOT}/${p}/launcher.json`)).status,'passed','Whole run stopped after first nonpass');
const dir=`${ROOT}/${profile}`;fs.mkdirSync(dir);fs.writeFileSync(`${dir}/launcher.json`,JSON.stringify({status:'started',profile,budget,...binding}),{flag:'wx'});
let result={status:null,error:null,timedOut:false},receipt;
try {
  const fd=fs.openSync(`${dir}/launcher.log`,'wx');
  try{result=await boundedProcess(process.execPath,['node_modules/@playwright/test/cli.js','test',`--config=${CONFIG}`,`--project=${profile}`],{timeout:budget,artifactRoot:ROOT,stdio:['ignore',fd,fd],env:{...process.env,MOTICOS_280_PROFILE:profile}});}finally{fs.closeSync(fd);}
  assert(result.status===0&&!result.error&&!result.timedOut,'Profile failed, interrupted, exceeded cap or timed out');
  receipt=validateCompletedProfile(profile,binding);
}catch(error){result.error??=String(error.message).slice(0,8192);}
const status=receipt?'passed':'incomplete-or-failed';
fs.writeFileSync(`${dir}/launcher.json`,JSON.stringify({status,profile,budget,...binding,exitCode:result.status,signal:result.signal,error:result.error,timedOut:result.timedOut,groupCleanup:result.groupCleanup,receipt},null,2)+'\n');
if(status!=='passed'){
  // Startup failures can precede both Playwright JSON and reporter callbacks.
  // Preserve exact stdout/stderr above and expose its bounded tail in job logs.
  if(fs.existsSync(`${dir}/launcher.log`)){const fd=fs.openSync(`${dir}/launcher.log`,'r'),size=fs.fstatSync(fd).size,tail=Buffer.alloc(Math.min(size,16384));try{fs.readSync(fd,tail,0,tail.length,Math.max(0,size-tail.length));}finally{fs.closeSync(fd);}process.stderr.write(tail);}
  process.exitCode=1;
}
