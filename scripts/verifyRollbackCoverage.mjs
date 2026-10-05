import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditResults } from './rollbackEvidenceReporter.mjs';
import { verifySource } from './verifyRollbackInventory.mjs';
import { hash } from './verifyRollbackBuild.mjs';
import { ALL_CASES, REQUIRED_ARTIFACTS, POSTCARD_SAMPLES, PROFILES, RUNTIME_FINGERPRINT, BUILD_FINGERPRINT } from '../tests/rollback-browser/plan.js';
import { originals, assertBackupIdentity, RECOVERY_ENVELOPES, getRecoveryEngine } from '../tests/rollback-browser/helpers.js';
import { collectionViolations, captureViolations } from './rollbackDiagnostics.mjs';
import { verifyPng } from './verifyPng.mjs';
const profiles=PROFILES.map(p=>p.name),read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const contractFile='tests/verification/rollback-browser-contract.json';
const ordered=rows=>rows.map(row=>JSON.stringify(row)).sort();
export function collectedCases(report) {
  assert.equal(report.errors?.length??0,0);const rows=[];
  const visit=suite=>{for(const spec of suite.specs??[])for(const test of spec.tests??[]){assert.equal(test.expectedStatus,'passed');rows.push({id:test.id??spec.id,profile:test.projectName,file:spec.file,title:spec.title});}for(const child of suite.suites??[])visit(child);};
  for(const suite of report.suites??[])visit(suite);return rows;
}
export function verifyCollection(report, profile='all') {
  const contract=read(contractFile);assert.deepEqual(contract.profiles,PROFILES);assert.deepEqual(contract.artifacts,REQUIRED_ARTIFACTS);assert.deepEqual(contract.postcards,POSTCARD_SAMPLES);
  assert(profile==='all'||profiles.includes(profile));
  const expected=contract.cases.filter(row=>profile==='all'||row.profile===profile);
  assert.equal(expected.length,profile==='all'?48:16);
  assert.deepEqual(ordered(collectedCases(report)),ordered(expected),'Exact frozen test identities changed');return expected;
}
export function validateNativeBackup(name, backup) {
  assertBackupIdentity(backup);
  const expected={...originals};let temporary=null;
  const undo=(id,count)=>{const engine=getRecoveryEngine(id);let save=engine.readSave(originals[engine.STORAGE_KEY]).save;for(let i=0;i<count;i++)save=engine.act(save,{type:'undo'});return {engine,save,raw:engine.serializeStoredSave(save)};};
  if(name==='freshness-after'){const value=undo(RECOVERY_ENVELOPES[8].id,1);expected[value.engine.STORAGE_KEY]=value.raw;}
  if(name==='stale-winner-and-temporary-loser'){const value=undo('moonlit-passage',2);expected[value.engine.STORAGE_KEY]=value.raw;temporary=undo('moonlit-passage',1);}
  if(name==='quota-preservation')temporary=undo('matching-garden',1);
  if(name==='batch-v2-after-undo'){const value=undo(RECOVERY_ENVELOPES[5].id,1);expected[value.engine.STORAGE_KEY]=value.raw;}
  if(name==='empty-corrupt-future-read-denied'){
    for(const [index,value] of [null,'{broken','{"version":99}',null].entries())expected[RECOVERY_ENVELOPES[index+8].storageKey]=value;
    assert.deepEqual(backup.entries.slice(8).map(e=>e.status),['empty','invalid','unsupported','unavailable']);
  }
  if(name==='whole-storage-read-denied')for(const key of Object.keys(expected))expected[key]=null;
  const known=['all-12-saves','freshness-before','freshness-after','empty-corrupt-future-read-denied','whole-storage-read-denied','stale-winner-and-temporary-loser','quota-preservation','batch-v2-after-undo'];assert(known.includes(name));
  for(const entry of backup.entries){
    assert.equal(entry.sourceRaw,expected[entry.storageKey],`Changed native raw source ${name}/${entry.envelopeId}`);
    const denied=name==='whole-storage-read-denied'||name==='empty-corrupt-future-read-denied'&&entry.envelopeId===RECOVERY_ENVELOPES[11].id;
    assert.equal(entry.sourceCaptured,!denied);
    const expectedTemporary=temporary?.engine.STORAGE_KEY===entry.storageKey?temporary.engine.serializeSave(temporary.save):null;
    assert.equal(entry.temporaryV1,expectedTemporary);
    assert.equal(entry.sessionConflict,name==='stale-winner-and-temporary-loser'&&entry.storageKey===temporary.engine.STORAGE_KEY);
    if(expectedTemporary)assert.equal(entry.originalAtSessionOpenRaw,originals[entry.storageKey]);
  }
  return {entries:12,exactRawSources:true,canonicalV1:true,temporaryWorkExact:true};
}
export function verifyObservations(rows, record) {
  assert.equal(rows[0]?.event,'begin');assert.equal(rows.at(-1)?.event,'end');assert.equal(rows.at(-1).status,'passed');
  assert.equal(rows.filter(r=>r.event==='begin').length,1);assert.equal(rows.filter(r=>r.event==='end').length,1);
  assert(rows.every(r=>r.profile===record.profile&&r.title===record.title));
  let elapsed=-1;const pendingImages=new Map();
  const allowed=['begin','seed-ready','capture-before','capture-after','image-start','image-decoded','json-download-start','json-download-complete','png-download-start','png-download-complete','end'];
  for(const row of rows){assert(allowed.includes(row.event));assert(Number.isFinite(row.elapsedMs)&&row.elapsedMs>=elapsed);elapsed=row.elapsedMs;
    if(row.event==='image-start'){const key=`${row.group}::${row.index}`;assert(!pendingImages.has(key));pendingImages.set(key,row);}
    if(row.event==='image-decoded'){assert(pendingImages.delete(`${row.group}::${row.index}`),'Image decode without matching start');}}
  assert.equal(pendingImages.size,0);assert(elapsed<=205000,'Case evidence exceeded the largest case and diagnosis allowance');
  assert.equal(rows[0].runCommit,process.env.GITHUB_SHA??rows[0].runCommit);assert.match(rows[0].runCommit,/^[a-f0-9]{40}$/);
  assert.equal(typeof rows[0].browserVersion,'string');assert(rows[0].browserVersion.length>0);
  assert.deepEqual(rows[0].guardedArguments,['test','--config=playwright.rollback.config.js',`--project=${record.profile}`]);
  assert(rows[0].budgetMs>=480000&&rows[0].budgetMs<=540000);
  const captures=REQUIRED_ARTIFACTS[record.title].filter(a=>a.name.startsWith('screenshot-'));
  for(const artifact of captures){const name=artifact.name.slice(11),before=rows.filter(r=>r.event==='capture-before'&&r.name===name),after=rows.filter(r=>r.event==='capture-after'&&r.name===name);assert.equal(before.length,1);assert.equal(after.length,1);assert(rows.indexOf(before[0])<rows.indexOf(after[0]));assert.deepEqual(captureViolations(before[0].state,after[0].state),[]);if(name.startsWith('playable-collection-')){assert.deepEqual(collectionViolations(before[0].state),[]);assert.deepEqual(collectionViolations(after[0].state),[]);}}
  for(const artifact of REQUIRED_ARTIFACTS[record.title].filter(a=>a.name.startsWith('json-'))){const name=artifact.name.slice(5);assert.equal(rows.filter(r=>r.event==='json-download-start'&&r.name===name).length,1);assert.equal(rows.filter(r=>r.event==='json-download-complete'&&r.name===name&&r.entries===12&&r.suggestedFilename==='moticos-preserved-saves.json').length,1);}
  const sample=POSTCARD_SAMPLES.find(sample=>record.title.includes(`decodes all ten ${sample.envelopeId} artworks`));
  if(sample){
    const decoded=rows.filter(r=>r.event==='image-decoded'&&r.group===`collection-${sample.envelopeId}`);
    assert.deepEqual(decoded.map(r=>r.index),[0,1,2,3,4,5,6,7,8,9]);assert(decoded.every(r=>r.complete&&r.width>0&&r.height>0&&r.source));assert.equal(new Set(decoded.map(r=>r.source)).size,10);
    const png=rows.filter(r=>r.event==='png-download-complete'&&r.name===`postcard-${sample.envelopeId}-${sample.pieceId}`);assert.equal(png.length,1);assert.equal(png[0].width,1536);assert.equal(png[0].height,1120);assert(png[0].colors>10);assert.equal(png[0].suggestedFilename,`moticos-${getRecoveryEngine(sample.envelopeId).CATALOG[sample.pieceId].name.toLowerCase().replaceAll(' ','-')}.png`);
  }
}
export function verifyCompleted(profile, root='.') {
  assert(profiles.includes(profile));const source=verifySource(),base=path.join(root,'rollback-test-results');
  const report=read(path.join(base,'results.json')),expected=verifyCollection(report,profile),manifest=read(path.join(base,'evidence-manifest.json'));
  assert.equal(manifest.runStatus,'passed');assert.equal(manifest.terminalAcceptance,'passed-awaiting-content-review');assert.deepEqual(manifest.errors,[]);assert.deepEqual(manifest.profiles,[profile]);
  assert.equal(manifest.identity.runtimeFingerprint,RUNTIME_FINGERPRINT);assert.equal(manifest.identity.buildFingerprint,BUILD_FINGERPRINT);assert.equal(manifest.identity.sourceFingerprint,source.sourceFingerprint);assert.equal(manifest.identity.sourceManifestSha256,source.sourceManifestSha256);assert.match(manifest.identity.commit,/^[a-f0-9]{40}$/);
  assert.deepEqual(auditResults(manifest.records,[profile],base),[]);
  const events=fs.readFileSync(path.join(base,'progress/browser-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(events[0].event,'begin');assert.equal(events.at(-1).event,'end');assert.equal(events.at(-1).status,'passed');assert.equal(events.filter(e=>e.event==='begin').length,1);assert.equal(events.filter(e=>e.event==='end').length,1);
  assert.deepEqual(events[0].projects,[profile]);assert.equal(events[0].tests,16);assert.equal(events[0].workers,1);assert.equal(events[0].maxFailures,1);assert.deepEqual(events[0].retries,[0]);assert.deepEqual(events[0].identity,manifest.identity);
  const identity=record=>({id:record.id,profile:record.profile,file:'recovery.spec.js',title:record.title});
  const starts=events.filter(e=>e.event==='test-begin'),ends=events.filter(e=>e.event==='test-end');
  for(const rows of [starts,ends,manifest.records])assert.deepEqual(ordered(rows.map(identity)),ordered(expected));
  assert.deepEqual(ends.map(({event,at,...record})=>record),manifest.records);
  let pending=null;for(const e of events){assert(['begin','test-begin','test-end','end'].includes(e.event));if(e.event==='test-begin'){assert.equal(pending,null);assert.equal(e.retry,0);pending=e.id;}if(e.event==='test-end'){assert.equal(pending,e.id);pending=null;assert.equal(e.status,'passed');assert.equal(e.expectedStatus,'passed');assert.equal(e.retry,0);assert.deepEqual(e.errors,[]);}}assert.equal(pending,null);
  let terminals=0;const visit=suite=>{for(const spec of suite.specs??[])for(const test of spec.tests??[]){assert.equal(test.status,'expected');assert.equal(test.results.length,1);assert.equal(test.results[0].status,'passed');assert.equal(test.results[0].retry,0);assert.deepEqual(test.results[0].errors,[]);terminals++;}for(const child of suite.suites??[])visit(child);};for(const suite of report.suites??[])visit(suite);assert.equal(terminals,16);assert.equal(report.stats.expected,16);for(const key of ['unexpected','flaky','skipped'])assert.equal(report.stats[key],0);
  const postcards=manifest.records.flatMap(r=>r.artifacts).filter(a=>a.name.startsWith('postcard-'));assert.equal(new Set(postcards.map(a=>a.sha256)).size,8,'Every native postcard must have distinct actual bytes');
  for(const record of manifest.records)for(const artifact of record.artifacts){const file=path.join(base,artifact.file),bytes=fs.readFileSync(file);
    if(artifact.name.startsWith('json-')){const value=JSON.parse(bytes.toString('utf8'));assert.equal(bytes.toString('utf8'),JSON.stringify(value,null,2)+'\n');validateNativeBackup(artifact.name.slice(5),value);}
    if(artifact.name==='observations'){const rows=bytes.toString('utf8').trim().split('\n').map(JSON.parse);assert.equal(rows[0].runCommit,manifest.identity.commit);verifyObservations(rows,record);}
    if(artifact.contentType==='image/png'){const p=PROFILES.find(p=>p.name===profile);verifyPng(bytes,artifact.name.startsWith('postcard-')?[1536,1120]:[p.width*(profile.startsWith('webkit')?3:1),p.height*(profile.startsWith('webkit')?3:1)]);}
  }
  return {status:'passed-awaiting-content-review',profile,identity:manifest.identity,cases:16,screenshots:63,jsonDownloads:8,nativePostcards:8,decodedCollectionImages:80,manifestSha256:hash(fs.readFileSync(path.join(base,'evidence-manifest.json')))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [mode,profile,input]=process.argv.slice(2);
  if(mode==='collected')console.log(JSON.stringify({profile,cases:verifyCollection(read(input),profile).length}));
  else if(mode==='completed')console.log(JSON.stringify(verifyCompleted(profile,input??'.'),null,2));
  else if(mode==='aggregate'){const proofs=profiles.map(p=>verifyCompleted(p,path.join(profile,p)));assert.equal(new Set(proofs.map(p=>JSON.stringify(p.identity))).size,1);console.log(JSON.stringify({status:'passed-awaiting-content-review',cases:48,screenshots:189,jsonDownloads:24,nativePostcards:24,profiles:proofs},null,2));}
  else throw Error('Use collected, completed or aggregate.');
}
