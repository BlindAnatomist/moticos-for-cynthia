import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { ALL_CASES,CORE_CASES,REQUIRED_ARTIFACTS,POSTCARD_SAMPLES,PROFILES,RUNTIME_FINGERPRINT,BUILD_FINGERPRINT,postcardCase } from './rollback-browser/plan.js';
import { auditResults } from '../scripts/rollbackEvidenceReporter.mjs';
import { ENVELOPES } from '../src/matching/batch/registry.js';
import { RECOVERY_ENVELOPES,PRESERVED_ENVELOPES,getRecoveryEngine } from '../src/matching/recovery/recoveryRegistry.js';
import { denseSave, memoryStorage } from './capacity/fixtures.js';
import { captureRecovery } from '../src/matching/recovery/snapshot.js';
import { assertCompleteBackup, originals } from './rollback-browser/helpers.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
function completeRecords(){return PROFILES.flatMap(p=>ALL_CASES.map((title,index)=>({profile:p.name,title,status:'passed',retry:0,artifacts:REQUIRED_ARTIFACTS[title].map(a=>({...a,file:`${p.name}/case-${index}/${a.name}`,bytes:1,sha256:hash('x')}))})));}
function completeBackup(){const storage=memoryStorage();for(const[key,raw]of Object.entries(originals))storage.bytes.set(key,raw);return captureRecovery(storage,new Map(),'synthetic-offline-proof');}
describe('focused rollback browser contract only; no browser launch',()=>{
 it('pins the unchanged runtime and compiled output',()=>{
  const proof=JSON.parse(fs.readFileSync('tests/verification/rollback-authority.json'));expect(proof.runtimeFingerprint).toBe(RUNTIME_FINGERPRINT);expect(proof.buildFingerprint).toBe(BUILD_FINGERPRINT);
  for(const row of proof.source)expect(hash(fs.readFileSync(row.file))).toBe(row.sha256);
 });
 it('has exactly sixteen cases per profile and the required phone viewports',()=>{
  expect(CORE_CASES).toHaveLength(8);expect(ALL_CASES).toHaveLength(16);expect(new Set(ALL_CASES).size).toBe(16);expect(PROFILES).toHaveLength(3);
  expect(PROFILES.map(p=>[p.width,p.height])).toEqual([[1280,720],[390,664],[430,932]]);expect(ALL_CASES.length*PROFILES.length).toBe(48);
 });
 it('samples exactly one real tier-three/four/five postcard from every playable envelope',()=>{
  expect(POSTCARD_SAMPLES.map(s=>s.envelopeId)).toEqual(ENVELOPES.map(e=>e.id));expect(POSTCARD_SAMPLES).toHaveLength(8);
  expect(new Set(POSTCARD_SAMPLES.map(s=>s.tier))).toEqual(new Set([3,4,5]));expect(POSTCARD_SAMPLES.filter(s=>s.assetClass==='original-public')).toHaveLength(4);expect(POSTCARD_SAMPLES.filter(s=>s.assetClass==='accepted-batch')).toHaveLength(4);
  for(const s of POSTCARD_SAMPLES){const e=ENVELOPES.find(e=>e.id===s.envelopeId);expect(e.catalog.CATALOG[s.pieceId].tier).toBe(s.tier);expect(e.catalog.CATALOG[s.pieceId].familyId).toBe(s.familyId);}
  expect(POSTCARD_SAMPLES.length*PROFILES.length).toBe(24);
 });
 it('retains valid 100-history browser fixtures across all twelve exact identities',()=>{
  for(const [i,e] of RECOVERY_ENVELOPES.entries()){const engine=getRecoveryEngine(e.id),save=denseSave(engine,i+7);save.discoveries=engine.PIECES.map(p=>p.id);save.sound=i%2===0;expect(engine.validSave(save)).toBe(true);expect(save.history).toHaveLength(100);}
  expect(PRESERVED_ENVELOPES).toHaveLength(4);
 });
 it('accepts one zero-retry terminal pass per case and exactly 24 native postcard attachments',()=>{expect(auditResults(completeRecords())).toEqual([]);});
 it.each(['failed','timedOut','skipped','interrupted'])('rejects a %s case instead of treating partial coverage as acceptance',status=>{const r=completeRecords();r[0].status=status;expect(auditResults(r).length).toBeGreaterThan(0);});
 it('rejects retries, missing cases and missing or duplicate native PNGs',()=>{
  const retries=completeRecords();retries[0].retry=1;expect(auditResults(retries).length).toBeGreaterThan(0);
  const missing=completeRecords();missing.pop();expect(auditResults(missing).length).toBeGreaterThan(0);
  const noPng=completeRecords();noPng.find(r=>r.artifacts.length).artifacts=[];expect(auditResults(noPng).length).toBeGreaterThan(0);
  const duplicate=completeRecords(),r=duplicate.find(r=>r.artifacts.length);r.artifacts.push({...r.artifacts[0]});expect(auditResults(duplicate).length).toBeGreaterThan(0);
 });
 it('requires every planned screenshot and JSON attachment, not only postcard PNGs',()=>{
  const records=completeRecords();for(const r of records)r.artifacts=r.artifacts.filter(a=>a.name.startsWith('postcard-'));
  expect(auditResults(records).length).toBeGreaterThan(0);
  expect(Object.values(REQUIRED_ARTIFACTS).flat().filter(a=>a.name.startsWith('screenshot-'))).toHaveLength(63);
  expect(Object.values(REQUIRED_ARTIFACTS).flat().filter(a=>a.name.startsWith('json-'))).toHaveLength(8);
 });
 it('rejects each individually missing required artifact and duplicate/wrong-type/unreadable descriptors',()=>{
  const records=completeRecords();
  for(const record of records){for(let i=0;i<record.artifacts.length;i++){const [removed]=record.artifacts.splice(i,1);expect(auditResults(records).length).toBeGreaterThan(0);record.artifacts.splice(i,0,removed);}}
  for(const kind of ['duplicate','wrong-type','read-error','missing-hash','zero-byte','reused-path']){
    const rows=completeRecords(),r=rows[0];
    if(kind==='duplicate')r.artifacts.push({...r.artifacts[0]});
    if(kind==='wrong-type')r.artifacts[0].contentType='text/plain';
    if(kind==='read-error')r.artifacts[0].error='ENOENT: file missing';
    if(kind==='missing-hash')delete r.artifacts[0].sha256;
    if(kind==='zero-byte')r.artifacts[0].bytes=0;
    if(kind==='reused-path')r.artifacts[1].file=r.artifacts[0].file;
    expect(auditResults(rows).length).toBeGreaterThan(0);
  }
 });
 it('rechecks actual attachment bytes and rejects missing or changed files at finalization',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rollback-reporter-unit-')),records=completeRecords().filter(r=>r.profile===PROFILES[0].name);
  try{
    for(const a of records.flatMap(r=>r.artifacts)){const file=path.join(root,a.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'x');}
    expect(auditResults(records,[PROFILES[0].name],root)).toEqual([]);
    const victim=path.join(root,records[0].artifacts[0].file);fs.unlinkSync(victim);
    expect(auditResults(records,[PROFILES[0].name],root).some(e=>e.includes('Unreadable or changed evidence file'))).toBe(true);
    fs.writeFileSync(victim,'y');expect(auditResults(records,[PROFILES[0].name],root).some(e=>e.includes('Attachment bytes changed'))).toBe(true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
 });
 it('assigns distinct repeated Envelopes captures and an explicit single h3 family locator',()=>{
  const names=REQUIRED_ARTIFACTS[CORE_CASES[1]].map(a=>a.name);expect(new Set(names).size).toBe(names.length);
  expect(names).toContain('screenshot-navigation-envelopes-1-recovery');expect(names).toContain('screenshot-navigation-envelopes-3-recovery');
  const source=fs.readFileSync('tests/rollback-browser/recovery.spec.js','utf8');expect(source).toContain("section.getByRole('heading',{level:3})");expect(source).not.toContain("section.getByRole('heading').scrollIntoViewIfNeeded()");
 });
 it('accepts exactly twelve unique complete exported envelope/catalog records',()=>{expect(()=>assertCompleteBackup(completeBackup())).not.toThrow();});
 it('rejects the demonstrated twelve-duplicate-Garden counterexample and missing/duplicated IDs or keys',()=>{
  const duplicates=completeBackup();duplicates.entries=Array.from({length:12},()=>structuredClone(duplicates.entries[0]));expect(()=>assertCompleteBackup(duplicates)).toThrow();
  const missing=completeBackup();missing.entries.pop();expect(()=>assertCompleteBackup(missing)).toThrow();
  const duplicateKey=completeBackup();duplicateKey.entries[1].storageKey=duplicateKey.entries[0].storageKey;expect(()=>assertCompleteBackup(duplicateKey)).toThrow();
  const duplicateId=completeBackup();duplicateId.entries[1].envelopeId=duplicateId.entries[0].envelopeId;expect(()=>assertCompleteBackup(duplicateId)).toThrow();
 });
 it('rejects altered or incomplete full catalog fields instead of validating piece IDs alone',()=>{
  for(const mutate of [e=>{e.catalog.pieces[0].name='wrong';},e=>{delete e.catalog.pieces[0].description;},e=>{e.catalog.pieces[0].mass=999;},e=>{e.catalog.pieces[0].tier=5;},e=>{e.catalog.families[0].color='wrong';},e=>{e.catalog.pieces[0].unexpected='extra';},e=>{e.catalog.families[0].pieceIds.reverse();}]){
    const backup=completeBackup();mutate(backup.entries[8]);expect(()=>assertCompleteBackup(backup)).toThrow();
  }
 });
 it('supports explicitly scoped single-profile execution without claiming other profiles passed',()=>{
  const records=completeRecords().filter(r=>r.profile===PROFILES[0].name);expect(auditResults(records,[PROFILES[0].name])).toEqual([]);expect(auditResults(records).length).toBeGreaterThan(0);
 });
 it('keeps browser execution guarded and runtime scripts frozen',()=>{
  const config=fs.readFileSync('playwright.rollback.config.js','utf8');expect(config).toContain('MOTICOS_ROLLBACK_BROWSER_APPROVED');expect(config).toContain("readPlaywrightInvocation");expect(config).toContain('retries: 0');expect(config).toContain('maxFailures: 1');
  const before=JSON.parse(fs.readFileSync('tests/verification/rollback-authority.json'));for(const row of before.source)expect(hash(fs.readFileSync(row.file))).toBe(row.sha256);
 });
});
