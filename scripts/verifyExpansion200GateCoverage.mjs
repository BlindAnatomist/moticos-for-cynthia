import {POSTCARD_VIEWPORTS,verifyPostcardState,verifyMixedInteractionState} from './expansion200PostcardEvidence.mjs';
import {verifyRenderedArt} from './expansion200GateRenderedArt.mjs';
import {runIdentity} from './currentCandidate200.mjs';
import {verifyGeometry,PROFILE_RENDERING} from './expansion200GateGeometryEvidence.mjs';
import {verifyJourneyJournal} from './expansion200GateJourneyEvidence.mjs';
import {CASES_PER_PROFILE,TOTAL_CASES,MIN_BROWSER_BUDGET_MS,MAX_BROWSER_BUDGET_MS,JOURNEY_ENVELOPE_IDS,NEW_ENVELOPE_IDS,ORIGINAL_ENVELOPE_IDS} from './expansion200GateScope.mjs';
import {verifyPng} from './expansion200GatePng.mjs';
import assert from 'node:assert/strict';
import {verifyEnvelopeJournal} from './expansion200GateCollectionEvidence.mjs';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const PROFILES = ['webkit-iphone-13', 'webkit-iphone-large', 'chromium-desktop'];
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ordered = values => values.map(value => JSON.stringify(value)).sort();
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const contractPath = 'tests/verification/expansion200-coverage-contract.json';
const identity = test => ({ id: test.id, project: test.project, file: test.file, title: test.title });

export function validateContract(contract) {
  assert.equal(contract.schemaVersion, 3);
  assert.equal(contract.expectedTotal, TOTAL_CASES);
  assert.equal(contract.cases.length, TOTAL_CASES);
  assert.equal(new Set(contract.cases.map(test => test.id)).size, TOTAL_CASES);
  assert.deepEqual([...new Set(contract.cases.map(test => test.project))].sort(), [...PROFILES].sort());
  for (const profile of PROFILES) assert.equal(contract.cases.filter(test => test.project === profile).length, CASES_PER_PROFILE);
  for (const test of contract.cases) {
    assert.deepEqual(Object.keys(test).sort(), ['file', 'id', 'project', 'title']);
    for (const key of ['id', 'project', 'file', 'title']) assert.equal(typeof test[key], 'string');
    assert(['collage.spec.js','collections.spec.js'].includes(test.file));
  }
  assert(!Object.hasOwn(contract,'sourceFingerprint'), 'Case contract contains behavior identities only');
  assert.equal(contract.postcardIds.length, 24);
  assert.equal(new Set(contract.postcardIds).size, 24);
  assert.equal(contract.pieceIds.length,40);assert.equal(new Set(contract.pieceIds).size,40);
  assert.equal(contract.envelopeIds.length,20);assert.equal(new Set(contract.envelopeIds).size,20);
  assert(contract.pieceIds.every(id=>/^[a-z]+[1-5]$/.test(id)));
  assert.deepEqual([...contract.postcardIds].sort(),contract.pieceIds.filter(id=>Number(id.at(-1))>=3).sort());
  assert.equal(contract.idleFinalIds.length,8);assert.deepEqual([...contract.idleFinalIds].sort(),contract.pieceIds.filter(id=>id.endsWith('5')).sort());
  assert.deepEqual(contract.journeyEnvelopeIds,JOURNEY_ENVELOPE_IDS);
  assert.equal(contract.postcardNames.length,24);assert.deepEqual(contract.postcardNames.map(p=>p.id).sort(),[...contract.postcardIds].sort());for(const p of contract.postcardNames){assert.equal(typeof p.name,'string');assert(p.name.length>0);}
  assert.equal(contract.newPieceIds.length,40);assert.equal(contract.revisedPieceIds.length,0);
  assert.deepEqual([...contract.pieceIds].sort(),[...contract.newPieceIds,...contract.revisedPieceIds].sort());
  assert.equal(contract.envelopePieces.length,20);assert.deepEqual(contract.envelopePieces.map(e=>e.id),contract.envelopeIds);
  for(const envelope of contract.envelopePieces){assert.equal(envelope.pieceIds.length,10);assert.equal(new Set(envelope.pieceIds).size,10);assert.deepEqual(envelope.starters,envelope.pieceIds.filter(id=>id.endsWith('1')));assert.deepEqual(envelope.finals,envelope.pieceIds.filter(id=>id.endsWith('5')));}
  assert.deepEqual([...contract.newPieceIds].sort(),contract.envelopePieces.filter(e=>NEW_ENVELOPE_IDS.includes(e.id)).flatMap(e=>e.pieceIds).sort());
  assert.deepEqual(contract.revisedPieceIds,[]);
  const allIds=contract.envelopePieces.flatMap(e=>e.pieceIds);assert.equal(allIds.length,200);assert.equal(new Set(allIds).size,200);
  assert.equal(contract.preservedPieceIds.length,160);assert.deepEqual([...contract.preservedPieceIds].sort(),allIds.filter(id=>!contract.newPieceIds.includes(id)).sort());
  return contract;
}
export function verifyPinnedCases(contract, root = '.') {
  validateContract(contract);
  const actual = readdirSync(join(root, 'tests/expansion200-browser')).sort();
  assert.deepEqual(actual, contract.testFiles.map(file => basename(file.path)).sort(), 'Batch test inventory changed');
  for (const record of contract.testFiles) {
    assert.match(record.path, /^tests\/expansion200-browser\/[^/]+\.js$/);
    assert.deepEqual(Object.keys(record),['path']);
  }
}
export function collectedCases(report) {
  assert.equal(report.errors?.length ?? 0, 0, 'Collection errors');
  const result = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      assert.equal(spec.tests.length, 1, 'One project per collected spec');
      const test = spec.tests[0];
      assert.equal(test.expectedStatus, 'passed', 'Skipped/expected-failure case');
      result.push({ id: test.id ?? spec.id, project: test.projectName, file: spec.file, title: spec.title });
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  return result;
}
export function verifyCollection(contract, report, profile = 'all') {
  validateContract(contract);
  assert(profile === 'all' || PROFILES.includes(profile), 'Unknown profile');
  const expected = contract.cases.filter(test => profile === 'all' || test.project === profile);
  assert.deepEqual(ordered(collectedCases(report)), ordered(expected), 'Collected identities differ from frozen set');
  return { profile, cases: expected.length };
}
export function verifyCompleted(contract, profile, events, report) {
  verifyCollection(contract, report, profile);
  const expected = contract.cases.filter(test => test.project === profile);
  assert.equal(expected.length, CASES_PER_PROFILE, 'Exactly one approved profile');
  const begins = events.filter(event => event.event === 'begin');
  const ends = events.filter(event => event.event === 'end');
  const starts = events.filter(event => event.event === 'test-begin');
  const results = events.filter(event => event.event === 'test-end');
  assert.equal(begins.length, 1); assert.equal(ends.length, 1);
  assert.equal(events[0].event, 'begin'); assert.equal(events.at(-1).event, 'end');
  assert.equal(begins[0].tests, CASES_PER_PROFILE); assert.equal(begins[0].workers, 1);
  assert.equal(begins[0].maxFailures, 1); assert.deepEqual(begins[0].retries, [0]);
  assert.deepEqual(begins[0].projects, [profile]); assert.equal(ends[0].status, 'passed');
  assert.equal(events.filter(event => event.event === 'error').length, 0);
  const normalize = event => identity({ ...event, file: basename(event.file), title: event.title.at(-1) });
  assert.deepEqual(ordered(starts.map(normalize)), ordered(expected), 'Started identities differ');
  assert.deepEqual(ordered(results.map(normalize)), ordered(expected), 'Terminal identities differ');
  assert(starts.every(event => event.retry === 0));
  assert(results.every(event => event.status === 'passed' && event.expectedStatus === 'passed' && event.retry === 0 && event.errors.length === 0));
  const pending = new Set();
  for (const event of events) {
    assert(['begin', 'test-begin', 'test-end', 'end'].includes(event.event), 'Unknown/error journal event');
    if (event.event === 'test-begin') { assert.equal(pending.size, 0); pending.add(event.id); }
    if (event.event === 'test-end') { assert(pending.delete(event.id), 'Terminal result without start'); }
  }
  assert.equal(pending.size, 0);
  let terminalCount = 0;
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      assert.equal(test.status, 'expected'); assert.equal(test.results.length, 1);
      const result = test.results[0];
      assert.equal(result.status, 'passed'); assert.equal(result.retry, 0);
      assert.equal(result.errors?.length ?? 0, 0); terminalCount++;
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  assert.equal(terminalCount, CASES_PER_PROFILE);
  assert.equal(report.stats?.expected, CASES_PER_PROFILE);
  for (const field of ['unexpected', 'flaky', 'skipped']) assert.equal(report.stats[field], 0);
  return { status: 'passed', profile, uniqueCases: CASES_PER_PROFILE, workers: 1, retries: 0, failed: 0, skipped: 0, results };
}
export function verifyExports(contract, profile, directory) {
  const names = readdirSync(directory).filter(name => name.endsWith('-export.png')).sort();
  const expected = contract.postcardIds.map(id => `${profile}-${id}-export.png`).sort();
  assert.deepEqual(names, expected, 'Exactly 24 actual postcard exports per profile');
  const exports = names.map(file => {
    const bytes = readFileSync(join(directory, file));
    assert(bytes.length > 10000); verifyPng(bytes,[1536,1120]);
    return { file, bytes: bytes.length, sha256: digest(bytes) };
  });
  assert.equal(new Set(exports.map(item => item.sha256)).size, 24, 'Distinct actual exports');
  return exports;
}
export function verifyVisualEvidence(contract, profile, root, provenance,manifest) {
  assert.match(provenance?.runCommit??'',/^[a-f0-9]{40}$/);assert.match(provenance?.manifestSha256??'',/^[a-f0-9]{64}$/);
  validateContract(contract);assert(PROFILES.includes(profile));assert.equal(manifest.catalogAssets.length,200);const files=[];const rendering=PROFILE_RENDERING[profile];const pixelSize=viewport=>[viewport.width*rendering.scale,viewport.height*rendering.scale];
  const png=(file,dimensions=pixelSize(rendering.viewport))=>{const bytes=readFileSync(join(root,file));assert(bytes.length>100);verifyPng(bytes,dimensions);files.push({file,bytes:bytes.length,sha256:digest(bytes)});};
  for(const label of [...contract.pieceIds,...contract.idleFinalIds.map(id=>`idle-${id}`)])for(const size of ['native','320x568']) {
    const id=label.replace(/^idle-/,''),viewport=size==='native'?rendering.viewport:{width:320,height:568},prefix=`screenshots/${profile}-matching-layout-${label}-${size}`;png(prefix+'.png',pixelSize(viewport));
    const bytes=readFileSync(join(root,prefix+'.json')),geometry=JSON.parse(bytes);verifyGeometry(geometry,viewport,id,manifest.catalogAssets);files.push({file:prefix+'.json',bytes:bytes.length,sha256:digest(bytes)});
  }
  const collectionProofs=contract.envelopePieces.map(envelope=>verifyEnvelopeJournal(readFileSync(join(root,`progress/${profile}-${envelope.id}-collection.jsonl`),'utf8').trim().split('\n').map(JSON.parse),profile,envelope.id,envelope.pieceIds,envelope.starters,manifest.catalogAssets,PROFILE_RENDERING[profile].viewport));
  for(const proof of collectionProofs){for(const path of [...proof.paths,proof.chooserPath])png(path.replace(/^expansion200-test-results\//,''));}
  const journeyProofs=contract.envelopePieces.filter(e=>contract.journeyEnvelopeIds.includes(e.id)).map(envelope=>verifyJourneyJournal(readFileSync(join(root,`progress/${profile}-${envelope.id}-journey.jsonl`),'utf8').trim().split('\n').map(JSON.parse),profile,envelope,manifest.catalogAssets));
  for(const envelope of contract.envelopePieces.filter(e=>contract.journeyEnvelopeIds.includes(e.id))){const events=readFileSync(join(root,`progress/${profile}-${envelope.id}-journey.jsonl`),'utf8').trim().split('\n').map(JSON.parse);for(const event of events.filter(e=>e.event==='export-complete')){const bytes=readFileSync(join(root,`review/${profile}-${event.id}-export.png`));assert.equal(event.bytes,bytes.length);assert.equal(event.sha256,digest(bytes));}}
  const finalIds=contract.envelopePieces.flatMap(envelope=>envelope.finals);assert.equal(finalIds.length,40);assert(finalIds.every(id=>collectionProofs.some(proof=>proof.pieceIds.includes(id))));
  for(const id of contract.postcardIds)for(const viewport of POSTCARD_VIEWPORTS)for(const view of ['art','actions']){
    const prefix=`postcard-views/${profile}-${id}-${viewport.width}-${view}`,bytes=readFileSync(join(root,prefix+'.json')),state=JSON.parse(bytes);
    const piece=contract.postcardNames.find(piece=>piece.id===id);assert(piece);verifyPostcardState(state,viewport,piece.name,view);verifyRenderedArt(state.art,id,manifest.catalogAssets);assert.equal(state.image.source,state.art.source);assert.match(state.art.observedSha256??'',/^[a-f0-9]{64}$/);files.push({file:prefix+'.json',bytes:bytes.length,sha256:digest(bytes)});png(prefix+'.png',pixelSize(viewport));
  }
  for(const envelope of contract.envelopePieces.filter(e=>NEW_ENVELOPE_IDS.includes(e.id))){
    const viewport={width:320,height:568},prefix=`screenshots/${profile}-matching-layout-${envelope.id}-mixed-stages`;png(prefix+'.png',pixelSize(viewport));const bytes=readFileSync(join(root,prefix+'.json')),geometry=JSON.parse(bytes);verifyGeometry(geometry,viewport,envelope.starters[0],manifest.catalogAssets);const expected=envelope.starters.flatMap(id=>[id,id,...[2,3,4].map(tier=>id.slice(0,-1)+tier)]);assert.deepEqual(geometry.artwork.map(a=>a.pieceId).sort(),expected.sort());files.push({file:prefix+'.json',bytes:bytes.length,sha256:digest(bytes)});
    const board=geometry.controls.filter(control=>control.cell!==null).sort((a,b)=>Number(a.cell)-Number(b.cell)).map(control=>control.piece);let prior;
    for(const kind of ['selected','hint']){const path=`review/${profile}-${envelope.id}-mixed-${kind}`,bytes=readFileSync(join(root,path+'.json')),state=JSON.parse(bytes),proof=verifyMixedInteractionState(state,envelope,kind);assert.deepEqual(proof.board,board);if(prior)assert.equal(proof.saveSha256,prior.saveSha256,'Mixed-state inspection changed save bytes');prior=proof;files.push({file:path+'.json',bytes:bytes.length,sha256:digest(bytes)});png(path+'.png',pixelSize(viewport));}
  }
  for(const name of ['restored-board'])png(`storage-views/${profile}-${name}.png`);
  for(const name of ['collage','collections']) {
    const file=`environment/${profile}-${name}.json`,bytes=readFileSync(join(root,file)),value=JSON.parse(bytes);
    assert.equal(value.sourceFingerprint,manifest.sourceFingerprint);assert.deepEqual(value.identity,provenance.identity);assert.deepEqual(manifest.identity,provenance.identity);assert.equal(value.caseContractSha256,digest(readFileSync(contractPath)));assert.equal(value.buildManifestSha256,provenance.manifestSha256);assert.equal(value.runCommit,provenance.runCommit);
    assert.equal(value.profile,profile);assert.deepEqual(value.viewport,rendering.viewport);assert.equal(value.deviceScaleFactor,rendering.scale);assert.equal(typeof value.browserVersion,'string');assert(value.browserVersion.length>0);assert.equal(typeof value.playwrightVersion,'string');assert.match(value.nodeVersion,/^v[0-9]+/);assert.match(value.runCommit,/^[a-f0-9]{40}$/);
    assert.deepEqual(value.guardedArguments,['test','--config=playwright.expansion200.config.js',`--project=${profile}`]);assert(value.browserBudgetMs>=MIN_BROWSER_BUDGET_MS&&value.browserBudgetMs<=MAX_BROWSER_BUDGET_MS);
    files.push({file,bytes:bytes.length,sha256:digest(bytes)});
  }
  return {earnedPieceViewports:80,earnedGeometryRecords:80,idleGuidanceViewports:16,idleGeometryRecords:16,collectionViewports:collectionProofs.reduce((n,p)=>n+p.captures,0),collectionImages:200,chooserViewports:20,chooserStarterImages:40,finaleImages:40,storageViewports:1,postcardViewports:144,mixedStageViewports:12,environmentRecords:2,journeyProofs,files};
}
export function verifyAggregate(contract, proofs) {
  validateContract(contract);
  assert.equal(proofs.length, 3);
  assert.deepEqual(proofs.map(proof => proof.profile).sort(), [...PROFILES].sort());
  assert.equal(new Set(proofs.map(proof => proof.runCommit)).size, 1);assert.match(proofs[0].sourceFingerprint,/^[a-f0-9]{64}$/);
  assert.match(proofs[0].runCommit, /^[a-f0-9]{40}$/);
  for (const proof of proofs) {
    assert.equal(proof.status, 'passed'); assert.equal(proof.uniqueCases, CASES_PER_PROFILE);
    assert.equal(proof.sourceFingerprint, proofs[0].sourceFingerprint);assert.deepEqual(proof.identity,proofs[0].identity);
    assert.equal(proof.exports.length, 24);
    for (const field of ['retries', 'failed', 'skipped']) assert.equal(proof[field], 0);
  }
  const cases = proofs.flatMap(proof => proof.results.map(event => identity({ ...event, file: basename(event.file), title: event.title.at(-1) })));
  assert.deepEqual(ordered(cases), ordered(contract.cases));
  return { status: 'passed', identity:proofs[0].identity, runCommit: proofs[0].runCommit, sourceFingerprint: proofs[0].sourceFingerprint,
    uniqueCases: TOTAL_CASES, actualExports: 72, retries: 0, failed: 0, skipped: 0,
    visualReview: 'Required separately; machine coverage is not visual acceptance', profiles: proofs.map(proof => proof.profile) };
}
function main() {
  const [mode, profile, input, journal, output] = process.argv.slice(2);
  const contract = readJson(contractPath); verifyPinnedCases(contract);
  if (mode === 'aggregate') {
    // After reconstructing every profile under ROOT/<profile>, recheck the raw
    // journals, JSON results and exact exported PNGs, not just job summaries.
    const proofs = PROFILES.map(name => {
      const root = join(profile, name), prefix = join(root, 'preflight-results');
      const saved = readJson(join(prefix, 'completed-proof.json'));
      const events = readFileSync(join(root, 'expansion200-test-results/progress/browser-events.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
      const raw = verifyCompleted(contract, name, events, readJson(join(root, 'expansion200-test-results/results.json')));
      assert.deepEqual(saved.results, raw.results);
      assert.deepEqual(saved.exports, verifyExports(contract, name, join(root, 'expansion200-test-results/review')));
      const build = readJson(join(prefix, 'build-proof.json'));
      assert.deepEqual(saved.visualEvidence,verifyVisualEvidence(contract,name,join(root,'expansion200-test-results'),build,readJson(join(prefix,'expansion200-manifest.json'))));
      assert.deepEqual(saved.collectionProgress, contract.envelopePieces.map(envelope => verifyEnvelopeJournal(readFileSync(join(root, `expansion200-test-results/progress/${name}-${envelope.id}-collection.jsonl`), 'utf8').trim().split('\n').map(line => JSON.parse(line)), name, envelope.id,envelope.pieceIds,envelope.starters,readJson(join(prefix,'expansion200-manifest.json')).catalogAssets,PROFILE_RENDERING[name].viewport)));
      assert.equal(saved.runCommit, build.runCommit);
      assert.equal(saved.sourceFingerprint, build.sourceFingerprint);
      assert.equal(build.manifestSha256, digest(readFileSync(join(prefix, 'expansion200-manifest.json'))));
      return saved;
    });
    const proof = verifyAggregate(contract, proofs);
    if (input) writeFileSync(input, JSON.stringify(proof, null, 2) + '\n');
    console.log(JSON.stringify(proof)); return;
  }
  if (mode === 'collected') {
    console.log(JSON.stringify(verifyCollection(contract, readJson(input), profile))); return;
  }
  assert.equal(mode, 'completed');
  const events = readFileSync(journal, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const proof = verifyCompleted(contract, profile, events, readJson(input));
  const manifest = readJson('dist-expansion200/expansion200-manifest.json');
  assert.deepEqual(manifest.identity,runIdentity());
  const build=readJson('preflight-results/build-proof.json');assert.equal(build.sourceFingerprint,manifest.sourceFingerprint);assert.deepEqual(build.identity,runIdentity());assert.equal(build.runCommit,process.env.GITHUB_SHA??build.runCommit);assert.equal(build.manifestSha256,digest(readFileSync('dist-expansion200/expansion200-manifest.json')));
  Object.assign(proof, { identity:build.identity, runCommit: build.runCommit, sourceFingerprint: manifest.sourceFingerprint,
    visualEvidence:verifyVisualEvidence(contract,profile,'expansion200-test-results',build,manifest),
    exports: verifyExports(contract, profile, 'expansion200-test-results/review') });
  proof.collectionProgress = contract.envelopePieces.map(envelope => verifyEnvelopeJournal(readFileSync(`expansion200-test-results/progress/${profile}-${envelope.id}-collection.jsonl`, 'utf8').trim().split('\n').map(line => JSON.parse(line)), profile, envelope.id,envelope.pieceIds,envelope.starters,manifest.catalogAssets,PROFILE_RENDERING[profile].viewport));
  writeFileSync(output, JSON.stringify(proof, null, 2) + '\n');
  console.log(`${profile}: exactly 33 terminal zero-retry passes and 24 actual postcard exports.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
