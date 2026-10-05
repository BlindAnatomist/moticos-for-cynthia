import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { exerciseWorker } from '../scripts/checkWorkerReload.mjs';
import { verifyRuntime,verifyBuild } from '../scripts/verifyRollbackBuild.mjs';
import {verifyPng} from '../scripts/verifyPng.mjs';
import { verifySource } from '../scripts/verifyRollbackInventory.mjs';
import { verifyCollection,validateNativeBackup,collectedCases } from '../scripts/verifyRollbackCoverage.mjs';
import { collectionViolations,captureViolations,journal } from '../scripts/rollbackDiagnostics.mjs';
import { boundedObservation,preserveFailureDiagnosis } from './rollback-browser/diagnostics.js';
import { originals,RECOVERY_ENVELOPES,getRecoveryEngine } from './rollback-browser/helpers.js';
import { captureRecovery } from '../src/matching/recovery/snapshot.js';
import { memoryStorage } from './capacity/fixtures.js';
const config=pathToFileURL(path.resolve('playwright.rollback.config.js')).href;
function inspect(args,approved=true,budget='540000',extra={}){
 const program=`process.argv=['node','playwright',...${JSON.stringify(args)}];const {default:c}=await import(${JSON.stringify(config)});console.log(JSON.stringify({workers:c.workers,retries:c.retries,maxFailures:c.maxFailures,globalTimeout:c.globalTimeout,trace:c.use.trace}));`;
 return spawnSync(process.execPath,['--input-type=module','-e',program],{encoding:'utf8',env:{...process.env,...extra,MOTICOS_ROLLBACK_BROWSER_APPROVED:approved?'1':'',MOTICOS_ROLLBACK_BROWSER_BUDGET_MS:budget},timeout:10000});
}
const command=profile=>['test','--config=playwright.rollback.config.js',`--project=${profile}`];
describe('rollback exact invocation without a browser or socket',()=>{
 it.each(['chromium-desktop','webkit-iphone-13','webkit-iphone-large'])('admits the single exact %s command and real IPC reload',profile=>{
  const result=inspect(command(profile));expect(result.status).toBe(0);expect(JSON.parse(result.stdout)).toEqual({workers:1,retries:0,maxFailures:1,globalTimeout:540000,trace:{mode:'retain-on-failure',screenshots:false,snapshots:false,sources:true,attachments:false}});
  const previous=process.env.MOTICOS_ROLLBACK_BROWSER_APPROVED;process.env.MOTICOS_ROLLBACK_BROWSER_APPROVED='1';
  try{const proof=exerciseWorker('playwright.rollback.config.js',true,profile);expect(proof.stats.expected).toBe(1);expect(proof.noBrowserFixture&&proof.noWebServer).toBe(true);}finally{if(previous===undefined)delete process.env.MOTICOS_ROLLBACK_BROWSER_APPROVED;else process.env.MOTICOS_ROLLBACK_BROWSER_APPROVED=previous;}
 },20000);
 it('allows exact all-profile and single-profile listing without approval',()=>{
  const list=['test','--config=playwright.rollback.config.js','--list','--reporter=json'];expect(inspect(list,false).status).toBe(0);expect(inspect([...list,'--project=webkit-iphone-large'],false).status).toBe(0);
 });
 it.each(['--workers=2','--retries=1','--repeat-each=2','--grep=Undo','--project=webkit-iphone-13','--reporter=json','--timeout=0','--max-failures=0','--global-timeout=0','--debug','--ui','recovery.spec.js'])('rejects %s override',arg=>expect(inspect([...command('chromium-desktop'),arg]).status).not.toBe(0));
 it.each([[],['test','--config=playwright.rollback.config.js'],command('*'),command('unknown'),['test','--config=playwright.rollback.config.js','--list'],['test','--list','--reporter=json','--config=playwright.rollback.config.js']])('rejects noncanonical invocation %j',(...args)=>expect(inspect(args).status).not.toBe(0));
 it('does not authorize a forged worker or an unapproved outer call',()=>{
  const extra={TEST_WORKER_INDEX:'0',TEST_PARALLEL_INDEX:'0',MOTICOS_ROLLBACK_GUARDED_ARGV:JSON.stringify(command('chromium-desktop'))};
  expect(inspect(command('chromium-desktop'),false,'540000',extra).status).not.toBe(0);
  expect(inspect([...command('chromium-desktop'),'--workers=5'],true,'540000',extra).status).not.toBe(0);
 });
 it.each(['479999','540001','NaN','Infinity','480000.1','0'])('rejects budget %s',budget=>expect(inspect(command('chromium-desktop'),true,budget).status).not.toBe(0));
 it('accepts the lower eight-minute budget',()=>expect(JSON.parse(inspect(command('chromium-desktop'),true,'480000').stdout).globalTimeout).toBe(480000));
});
const goodState=()=>({url:'http://127.0.0.1:4189/?envelope=matching-garden',scrollX:0,scrollY:0,bodyOverflow:'hidden',dialogCount:1,dialog:{open:true,modal:true,visible:true,rect:{x:0,y:0,width:390,height:664},scrollTop:0,hitTests:[{insideDialog:true},{insideDialog:true},{insideDialog:true}],images:Array.from({length:10},(_,i)=>({source:`${i}.webp`,complete:true,width:512,height:512}))}});
describe('visible modal capture and bounded failure evidence',()=>{
 it('accepts a visibly open modal and stable surrounding observations',()=>{const state=goodState();expect(collectionViolations(state)).toEqual([]);expect(captureViolations(state,structuredClone(state))).toEqual([]);});
 it.each(['absent','non-modal','invisible','occluded','undecoded','missing-image','body-unlocked'])('rejects %s evidence',kind=>{const state=goodState();if(kind==='absent')state.dialogCount=0;if(kind==='non-modal')state.dialog.modal=false;if(kind==='invisible')state.dialog.visible=false;if(kind==='occluded')state.dialog.hitTests[1].insideDialog=false;if(kind==='undecoded')state.dialog.images[0].width=0;if(kind==='missing-image')state.dialog.images.pop();if(kind==='body-unlocked')state.bodyOverflow='auto';expect(collectionViolations(state).length).toBeGreaterThan(0);});
 it.each(['url','scrollY','dialogCount','rect','scrollTop','images'])('rejects %s capture drift',key=>{const before=goodState(),after=goodState();if(['url','scrollY','dialogCount'].includes(key))after[key]='changed';else after.dialog[key]='changed';expect(captureViolations(before,after).length).toBeGreaterThan(0);});
 it('flushes partial observations before completion',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'rollback-journal-'));try{const file=path.join(root,'events.jsonl'),write=journal(file,{project:{name:'webkit-iphone-large'},title:'case'});write('image-start',{index:3});expect(JSON.parse(fs.readFileSync(file,'utf8'))).toMatchObject({event:'image-start',index:3});}finally{fs.rmSync(root,{recursive:true,force:true});}});
 it('bounds a hung browser observation outside the browser protocol',async()=>{await expect(boundedObservation(()=>new Promise(()=>{}),5)).rejects.toThrow('exceeded 5ms');await expect(boundedObservation(()=>({modal:true}),50)).resolves.toEqual({modal:true});});
 it('keeps the original failure and records a failed screenshot separately',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rollback-failure-')),info={project:{name:'webkit-iphone-large'},title:'case',status:'timedOut',expectedStatus:'passed',outputPath:name=>path.join(root,name)};
  const page={locator:()=>({evaluate:async()=>goodState(),ariaSnapshot:async()=>'- dialog: Collection'}),screenshot:async()=>{throw Error('capture unavailable');}};
  try{await preserveFailureDiagnosis(page,info);const result=JSON.parse(fs.readFileSync(path.join(root,'failure-diagnosis/failure-state.json')));expect(result.status).toBe('timedOut');expect(result.observations.map(r=>r.name)).toEqual(['before-image','failure-image','after-image','accessibility']);expect(result.observations[1].unavailable).toContain('capture unavailable');}finally{fs.rmSync(root,{recursive:true,force:true});}
 });
});
function backup(){const storage=memoryStorage();for(const [key,value] of Object.entries(originals))storage.bytes.set(key,value);return captureRecovery(storage,new Map(),'2026-10-05T00:00:00.000Z');}
describe('native recovery JSON is exact across all download kinds',()=>{
 it.each(['all-12-saves','freshness-before','freshness-after','empty-corrupt-future-read-denied','whole-storage-read-denied','stale-winner-and-temporary-loser','quota-preservation','batch-v2-after-undo'])('validates every source in %s',name=>{
  const storage=memoryStorage();for(const [key,value] of Object.entries(originals))storage.bytes.set(key,value);const sessions=new Map();
  const change=(id,count)=>{const engine=getRecoveryEngine(id);let save=engine.readSave(originals[engine.STORAGE_KEY]).save;for(let i=0;i<count;i++)save=engine.act(save,{type:'undo'});return {engine,save};};
  if(name==='freshness-after'||name==='batch-v2-after-undo'){const value=change(RECOVERY_ENVELOPES[name==='freshness-after'?8:5].id,1);storage.bytes.set(value.engine.STORAGE_KEY,value.engine.serializeStoredSave(value.save));}
  if(name==='stale-winner-and-temporary-loser'||name==='quota-preservation'){const value=change(name.startsWith('stale')?'moonlit-passage':'matching-garden',1);if(name.startsWith('stale'))storage.bytes.set(value.engine.STORAGE_KEY,value.engine.serializeStoredSave(change('moonlit-passage',2).save));sessions.set(value.engine.STORAGE_KEY,{save:value.save,blocked:true,raw:originals[value.engine.STORAGE_KEY],sourceRaw:originals[value.engine.STORAGE_KEY],conflict:name.startsWith('stale')});}
  if(name==='empty-corrupt-future-read-denied'){storage.bytes.delete(RECOVERY_ENVELOPES[8].storageKey);storage.bytes.set(RECOVERY_ENVELOPES[9].storageKey,'{broken');storage.bytes.set(RECOVERY_ENVELOPES[10].storageKey,'{"version":99}');const get=storage.getItem;storage.getItem=key=>{if(key===RECOVERY_ENVELOPES[11].storageKey)throw Error('read denied');return get(key);};}
  if(name==='whole-storage-read-denied')storage.failRead(true);
  const result=captureRecovery(storage,sessions,'2026-10-05T00:00:00.000Z');expect(()=>validateNativeBackup(name,result)).not.toThrow();
  const changed=structuredClone(result);changed.entries[0].sourceRaw='changed';expect(()=>validateNativeBackup(name,changed)).toThrow();
 });
 it.each(['raw','canonical','catalog','sourceCaptured','duplicate','temporary','conflict','extra-key'])('rejects %s native content tampering',kind=>{const value=backup();if(kind==='raw')value.entries[0].sourceRaw+=' ';if(kind==='canonical')value.entries[0].decodedV1+=' ';if(kind==='catalog')value.entries[0].catalog.pieces[0].name='wrong';if(kind==='sourceCaptured')value.entries[0].sourceCaptured=false;if(kind==='duplicate')value.entries[1]=value.entries[0];if(kind==='temporary')value.entries[0].temporaryV1=value.entries[0].decodedV1;if(kind==='conflict')value.entries[0].sessionConflict=true;if(kind==='extra-key')value.surprise=true;expect(()=>validateNativeBackup('all-12-saves',value)).toThrow();});
});
describe('frozen public authority',()=>{
 it('keeps the exact accepted runtime and complete build',()=>{expect(verifyRuntime().source.length).toBeGreaterThan(80);expect(verifyBuild().files).toBe(89);});
 it('pins the complete public file set',()=>expect(verifySource().sourceFiles).toBeGreaterThan(200));
 it('rejects missing, duplicate and changed frozen case identities',()=>{
  const contract=JSON.parse(fs.readFileSync('tests/verification/rollback-browser-contract.json'));
  const report={errors:[],suites:[{specs:contract.cases.map(row=>({file:row.file,title:row.title,tests:[{id:row.id,projectName:row.profile,expectedStatus:'passed'}]}))}]};
  expect(verifyCollection(report).length).toBe(48);report.suites[0].specs.pop();expect(()=>verifyCollection(report)).toThrow();report.suites[0].specs.push(report.suites[0].specs[0]);expect(()=>verifyCollection(report)).toThrow();
 });
 it('declares one guarded workflow, 52 runner minutes, bounded artifacts and no broader trigger',()=>{
  const workflow=fs.readFileSync('.github/workflows/verify-rollback-browser.yml','utf8');
  expect(workflow).toContain('branches: [verify/rollback-browser-80-20261005]');expect(workflow).not.toMatch(/^  (workflow_dispatch|pull_request|schedule|workflow_call):/m);
  expect(workflow.match(/runs-on: ubuntu-latest/g)).toHaveLength(2);expect(workflow.match(/if: github.run_attempt == 1/g)).toHaveLength(2);
  expect(workflow).toContain('timeout-minutes: 7');expect(workflow).toContain('timeout-minutes: 15');expect(7+3*15).toBe(52);
  expect(workflow.match(/- profile:/g)).toHaveLength(3);expect(workflow.match(/npm run build:rollback/g)).toHaveLength(1);
  expect(workflow).toContain(' - 180 - 15');expect(workflow).toContain('retention-days: 1');expect(workflow).not.toMatch(/contents: write|actions: write|id-token: write|netlify|deploy|gh run rerun/);
 });
});

it('rejects unreadable PNG payloads after a valid signature and dimensions',()=>{
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
 expect(verifyPng(bytes,[1,1]).width).toBe(1);
 const changed=Buffer.from(bytes);changed[changed.length-16]^=1;expect(()=>verifyPng(changed,[1,1])).toThrow();
 expect(()=>verifyPng(bytes.subarray(0,bytes.length-4),[1,1])).toThrow();expect(()=>verifyPng(bytes,[2,1])).toThrow();
});
