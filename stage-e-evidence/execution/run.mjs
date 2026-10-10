import {observeBoundedProcess} from './resource-diagnostics.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {boundedProcess} from './bounded-process.mjs';
import {requireApproval} from './binding.mjs';
import {validateCompletedProfile} from './validate.mjs';
import {ORDER,ROOT,CONFIG,LIMITS,admit} from './policy.mjs';
import {requireRepoCwd} from './paths.mjs';
export async function runProfile(profile,binding){
 const epoch=Number(process.env.MOTICOS_STAGE_E_EPOCH);assert(Number.isSafeInteger(epoch)&&epoch>0);
 const budget=admit(profile,Math.ceil(Date.now()/1000)-epoch),dir=`${ROOT}/${profile}`;
 fs.mkdirSync(dir);fs.writeFileSync(`${dir}/launcher.json`,JSON.stringify({status:'started',profile,budget,...binding}),{flag:'wx'});
 let result={status:null,error:null,timedOut:false},receipt;
 try{const fd=fs.openSync(`${dir}/launcher.log`,'wx');try{const launched=boundedProcess(process.execPath,['node_modules/@playwright/test/cli.js','test',`--config=${CONFIG}`,`--project=${profile}`],{timeout:budget,artifactRoot:ROOT,stdio:['ignore',fd,fd],env:{...process.env,MOTICOS_STAGE_E_PROFILE:profile}});result=await observeBoundedProcess(launched,{path:`${dir}/resource-diagnostics.json`,binding,profile});}finally{fs.closeSync(fd);}assert(result.status===0&&!result.error&&!result.timedOut&&!result.signal&&['not-required','terminated'].includes(result.groupCleanup),'Profile failed, interrupted, exceeded cap, or cleanup unconfirmed');receipt=validateCompletedProfile(profile,binding);}catch(error){result.error??=String(error.message).slice(0,8192);}
 const record={status:receipt?'passed':'incomplete-or-failed',profile,budget,...binding,exitCode:result.status,signal:result.signal,error:result.error,timedOut:result.timedOut,groupCleanup:result.groupCleanup,resourceObserver:result.resourceObserver,...(result.cleanupDiagnostics?{cleanupDiagnostics:result.cleanupDiagnostics}:{}),receipt};
 fs.writeFileSync(`${dir}/launcher.json`,JSON.stringify(record,null,2)+'\n');assert.equal(record.status,'passed',`Stop after nonpass: ${profile}: ${record.error}`);return record;
}
export async function serialProfiles(binding,runner=runProfile){const rows=[];for(const profile of ORDER)rows.push(await runner(profile,binding));return rows;}
export async function runAll(){requireRepoCwd();assert.equal(process.argv.length,2);const binding=requireApproval();fs.writeFileSync(`${ROOT}/run-start.json`,JSON.stringify({binding,limits:LIMITS,profiles:ORDER},null,2)+'\n',{flag:'wx'});await serialProfiles(binding);fs.writeFileSync(`${ROOT}/completed.json`,JSON.stringify({status:'FOCUSED_BROWSER_PASS_PENDING_VISUAL_REVIEW',binding,profiles:ORDER,requiredOriginalPNGs:5,publicationAuthorized:false},null,2)+'\n',{flag:'wx'});}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{await runAll();}catch(error){console.error(String(error.message));process.exitCode=1;}}
