import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {digest,runIdentity} from './currentCandidate200Postcards.mjs';
import {PROFILES,NEW_ENVELOPE_IDS,CASES_PER_PROFILE,TOTAL_CASES,MIN_BROWSER_BUDGET_MS,MAX_BROWSER_BUDGET_MS} from './expansion200PostcardScope.mjs';
import {POSTCARD_VIEWPORTS,verifyFocusedPostcardState} from './expansion200FocusedPostcardEvidence.mjs';
import {verifyExports} from './verifyExpansion200GateCoverage.mjs';
import {verifyRenderedArt} from './expansion200GateRenderedArt.mjs';
import {verifyPng} from './expansion200GatePng.mjs';
import {PROFILE_RENDERING} from './expansion200GateGeometryEvidence.mjs';
import {ENVELOPES} from '../src/matching/expansion200/registry.js';
export {PROFILES,verifyExports};
const contractPath='tests/verification/expansion200-postcards-contract.json';
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const ordered=values=>values.map(value=>JSON.stringify(value)).sort();
const identity=test=>({id:test.id,project:test.project,file:test.file,title:test.title});
export function validateContract(contract){
 assert.equal(contract.schemaVersion,1);assert.equal(contract.scope,'fixture-driven-postcard-presentation');assert.equal(contract.expectedTotal,12);assert.equal(contract.cases.length,12);assert.equal(new Set(contract.cases.map(c=>c.id)).size,12);
 for(const profile of PROFILES)assert.equal(contract.cases.filter(c=>c.project===profile).length,4);
 for(const c of contract.cases){assert.deepEqual(Object.keys(c).sort(),['file','id','project','title']);assert.equal(c.file,'postcards.spec.js');assert(PROFILES.includes(c.project));}
 const envelopes=ENVELOPES.filter(e=>NEW_ENVELOPE_IDS.includes(e.id)).map(e=>({id:e.id,postcards:e.catalog.PIECES.filter(p=>p.tier>=3).map(p=>({id:p.id,name:p.name}))}));assert.deepEqual(contract.envelopes,envelopes);assert.deepEqual(contract.postcardIds,envelopes.flatMap(e=>e.postcards.map(p=>p.id)));assert.equal(new Set(contract.postcardIds).size,24);assert.equal(contract.postcardIds.length,24);assert.deepEqual(contract.testFiles,['postcard-evidence.js','postcards.spec.js']);return contract;
}
export function verifyPinnedCases(contract,root='.') {validateContract(contract);assert.deepEqual(readdirSync(join(root,'tests/expansion200-postcards')).sort(),contract.testFiles);}
export function verifyCollection(contract,report,profile='all'){validateContract(contract);assert(profile==='all'||PROFILES.includes(profile));const expected=contract.cases.filter(c=>profile==='all'||c.project===profile);assert.deepEqual(ordered(collectedCases(report)),ordered(expected));return{profile,cases:expected.length};}
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
export function verifyVisualEvidence(contract,profile,root,build,manifest){
 validateContract(contract);assert(PROFILES.includes(profile));assert.equal(manifest.catalogAssets.length,200);assert.deepEqual(build.identity,manifest.identity);assert.equal(build.sourceFingerprint,manifest.sourceFingerprint);assert.match(build.runCommit,/^[a-f0-9]{40}$/);assert.equal(build.runCommit,manifest.identity.runCommit);
 const files=[],rendering=PROFILE_RENDERING[profile],expected=[];
 for(const e of contract.envelopes)for(const piece of e.postcards)for(const viewport of POSTCARD_VIEWPORTS)for(const view of ['art','actions']){
  const prefix=`postcard-views/${profile}-${piece.id}-${viewport.width}-${view}`,jsonFile=prefix+'.json',pngFile=prefix+'.png';expected.push(basename(jsonFile),basename(pngFile));const bytes=readFileSync(join(root,jsonFile)),state=JSON.parse(bytes);verifyFocusedPostcardState(state,viewport,piece.name,view);verifyRenderedArt(state.art,piece.id,manifest.catalogAssets);assert.equal(state.image.source,state.art.source);assert.match(state.art.observedSha256??'',/^[a-f0-9]{64}$/);files.push({file:jsonFile,bytes:bytes.length,sha256:digest(bytes)});const png=readFileSync(join(root,pngFile));verifyPng(png,[viewport.width*rendering.scale,viewport.height*rendering.scale]);files.push({file:pngFile,bytes:png.length,sha256:digest(png)});
 }
 assert.deepEqual(readdirSync(join(root,'postcard-views')).sort(),expected.sort(),'Missing or extra presentation views');
 for(const envelope of contract.envelopes){const file=`fixture-checks/${profile}-${envelope.id}.json`,bytes=readFileSync(join(root,file)),e=JSON.parse(bytes);assert.equal(e.scope,'legal full-discovery fixture, not fresh UI progression');assert.deepEqual(e.identity,manifest.identity);assert.equal(e.profile,profile);assert.equal(e.envelope,envelope.id);assert.match(e.initialAllSavesSha256,/^[a-f0-9]{64}$/);assert.equal(e.finalAllSavesSha256,e.initialAllSavesSha256);assert.equal(e.initialBoard.length,25);assert.deepEqual(e.finalBoard,e.initialBoard);assert.equal(e.reloadRetained,true);assert.deepEqual(e.records.map(r=>r.id),envelope.postcards.map(p=>p.id));for(const record of e.records){for(const key of ['back','escape','reopen','focusRestored','savesRetained','boardRetained'])assert.equal(record[key],true);assert.deepEqual(record.viewports,[320,390,430]);assert.deepEqual(record.views,['art','actions']);const png=readFileSync(join(root,`review/${profile}-${record.id}-export.png`));assert.equal(record.bytes,png.length);assert.equal(record.sha256,digest(png));}files.push({file,bytes:bytes.length,sha256:digest(bytes)});}
 assert.deepEqual(readdirSync(join(root,'fixture-checks')).sort(),contract.envelopes.map(e=>`${profile}-${e.id}.json`).sort());
 const file=`environment/${profile}-postcards.json`,bytes=readFileSync(join(root,file)),e=JSON.parse(bytes);assert.deepEqual(e.identity,manifest.identity);assert.equal(e.profile,profile);assert.equal(e.sourceFingerprint,manifest.sourceFingerprint);assert.equal(e.buildManifestSha256,build.manifestSha256);assert.equal(e.contractSha256,digest(readFileSync(contractPath)));assert.equal(e.scope,'fixture-driven postcard presentation, not fresh gameplay journeys');assert.deepEqual(e.viewport,rendering.viewport);assert.equal(e.deviceScaleFactor,rendering.scale);assert.equal(typeof e.browserVersion,'string');assert(e.browserVersion.length);assert.match(e.nodeVersion,/^v[0-9]+/);assert.deepEqual(e.guardedArguments,['test','--config=playwright.expansion200-postcards.config.js',`--project=${profile}`]);assert(e.browserBudgetMs>=MIN_BROWSER_BUDGET_MS&&e.browserBudgetMs<=MAX_BROWSER_BUDGET_MS);files.push({file,bytes:bytes.length,sha256:digest(bytes)});
 return{scope:'fixture-driven-postcard-presentation',postcardViews:144,postcardGeometryRecords:144,legalFixtures:4,files};
}
function auditProfile(contract,profile,root){
 const directory=join(root,'expansion200-test-results'),preflight=join(root,'preflight-results'),build=readJson(join(preflight,'build-proof.json')),manifest=readJson(join(preflight,'expansion200-manifest.json'));
 assert.equal(build.manifestSha256,digest(readFileSync(join(preflight,'expansion200-manifest.json'))));const events=readFileSync(join(directory,'progress/browser-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse),proof=verifyCompleted(contract,profile,events,readJson(join(directory,'results.json')));
 return{...proof,identity:build.identity,runCommit:build.runCommit,sourceFingerprint:manifest.sourceFingerprint,exports:verifyExports(contract,profile,join(directory,'review')),visualEvidence:verifyVisualEvidence(contract,profile,directory,build,manifest)};
}
function main(){const[mode,profile,input,journal,output]=process.argv.slice(2),contract=readJson(contractPath);verifyPinnedCases(contract);
 if(mode==='collected'){console.log(JSON.stringify(verifyCollection(contract,readJson(input),profile)));return;}
 if(mode==='aggregate'){const proofs=PROFILES.map(name=>{const root=join(profile,name),actual=auditProfile(contract,name,root),saved=readJson(join(root,'preflight-results/completed-proof.json'));assert.deepEqual(saved,actual);return actual;});const result={...verifyAggregate(contract,proofs),scope:'12 fixture-driven presentation cases; not a new99-case gameplay run'};if(input)writeFileSync(input,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));return;}
 assert.equal(mode,'completed');assert.equal(input,'expansion200-test-results/results.json');assert.equal(journal,'expansion200-test-results/progress/browser-events.jsonl');const proof=auditProfile(contract,profile,'.');assert.deepEqual(proof.identity,runIdentity());writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(`${profile}: four exact fixture-driven cases,144 complete header/art/action views,24 actual postcard exports;zero retries.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
