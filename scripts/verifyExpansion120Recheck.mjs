import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {digest, validateContract, verifyCompleted, verifyExports, verifyVisualEvidence} from './verifyExpansion120Coverage.mjs';
import {harnessInventory} from './verifyExpansion120Build.mjs';
import {TRACE_POLICY, verifyCollectionJournal} from './collectionEvidence.mjs';
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const contractPath = 'tests/verification/expansion120-large-recheck-contract.json';
const priorPath = 'tests/verification/expansion120-prior-coverage-contract.json';
const currentPath = 'tests/verification/expansion120-coverage-contract.json';
const lines = path => readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));

export function verifyRecheckContracts(policy, prior, current, priorBytes) {
  validateContract(prior); validateContract(current);
  assert.equal(policy.schemaVersion, 1); assert.equal(policy.recheckedProfile, 'webkit-iphone-large');
  assert.deepEqual(policy.retainedProfiles, ['chromium-desktop','webkit-iphone-13']);
  assert.equal(digest(priorBytes), policy.priorContractSha256, 'Original evidence contract must remain frozen');
  for (const value of [prior, current]) assert.equal(value.sourceFingerprint, policy.runtimeFingerprint);
  for (const field of ['cases','pieceIds','postcardIds','envelopeIds']) assert.deepEqual(current[field], prior[field], `Coverage changed: ${field}`);
}

export function verifyProfileEvidence(root, profile, contract) {
  const folder = join(root, 'batch-test-results'), preflight = join(root, 'preflight-results');
  const saved = json(join(preflight, 'completed-proof.json')), build = json(join(preflight, 'build-proof.json'));
  const raw = verifyCompleted(contract, profile, lines(join(folder, 'progress/browser-events.jsonl')), json(join(folder, 'results.json')));
  assert.deepEqual(saved.results, raw.results);
  assert.deepEqual(saved.exports, verifyExports(contract, profile, join(folder, 'review')));
  assert.deepEqual(saved.visualEvidence, verifyVisualEvidence(contract, profile, folder));
  assert.equal(saved.runCommit, build.runCommit); assert.equal(saved.sourceFingerprint, contract.sourceFingerprint);
  assert.equal(build.sourceFingerprint, contract.sourceFingerprint);
  assert.equal(build.manifestSha256, digest(readFileSync(join(preflight,'expansion-manifest.json'))));
  return {profile, runCommit: build.runCommit, sourceFingerprint:build.sourceFingerprint,
    harnessFingerprint:digest(JSON.stringify(build.harness)),buildFilesFingerprint:digest(JSON.stringify(build.files)),
    cases:raw.uniqueCases,actualExports:saved.exports.length};
}

export function verifyRecheckedProfile(root, policy, current) {
  const profile = policy.recheckedProfile, proof = verifyProfileEvidence(root, profile, current);
  assert.equal(proof.harnessFingerprint, digest(JSON.stringify(harnessInventory('.'))), 'New evidence must match the exact new harness');
  assert.equal(proof.buildFilesFingerprint, policy.priorBuildFilesFingerprint, 'Runtime output bytes must match the prior run');
  const folder=join(root,'batch-test-results');
  proof.collectionProgress=verifyCollectionJournal(lines(join(folder,`progress/${profile}-collections.jsonl`)),profile,current.envelopeIds);
  for (const name of ['collage','save-capacity']) {
    const environment=json(join(folder,`environment/${profile}-${name}.json`));
    assert.deepEqual(environment.tracePolicy,TRACE_POLICY);assert.equal(environment.runCommit,proof.runCommit);
    assert.match(environment.runId,/^[1-9][0-9]*$/);assert.equal(environment.runAttempt,1);
    if(proof.runId)assert.equal(environment.runId,proof.runId);proof.runId=environment.runId;
  }
  proof.contractSha256=digest(readFileSync(currentPath));
  return proof;
}

export function verifyCrossRunProvenance(policy, priorProfiles, rechecked) {
  assert.deepEqual(priorProfiles.map(p=>p.profile).sort(), [...policy.retainedProfiles].sort());
  assert.equal(rechecked.profile, policy.recheckedProfile);
  assert.match(rechecked.runId,/^[1-9][0-9]*$/);assert.notEqual(rechecked.runId,policy.priorRunId);
  assert.match(rechecked.contractSha256,/^[a-f0-9]{64}$/);
  for (const proof of priorProfiles) {
    assert.equal(proof.runCommit,policy.priorRunCommit); assert.equal(proof.harnessFingerprint,policy.priorHarnessFingerprint);
    assert.equal(proof.buildFilesFingerprint,policy.priorBuildFilesFingerprint);
  }
  for (const proof of [...priorProfiles,rechecked]) {
    assert.equal(proof.sourceFingerprint,policy.runtimeFingerprint);assert.equal(proof.cases,18);assert.equal(proof.actualExports,24);
    assert.equal(proof.buildFilesFingerprint,policy.priorBuildFilesFingerprint);assert.match(proof.runCommit,/^[a-f0-9]{40}$/);
  }
  assert.deepEqual(rechecked.collectionProgress,{envelopes:12,decodedImages:120,captures:12,savedBytesUnchanged:true});
  return {status:'machine-evidence-complete',sourceFingerprint:policy.runtimeFingerprint,cases:54,actualExports:72,
    provenance:'Two original profiles plus one separately approved large-iPhone recheck; different harnesses and commits are intentional and explicit.',
    profiles:[...priorProfiles.map(p=>({...p,runId:policy.priorRunId,contractSha256:policy.priorContractSha256})),rechecked],
    visualAcceptance:'Requires the preserved prior visual verdict and direct review of all new large-profile artifacts; this record cannot approve visuals.'};
}

function main() {
  const [mode, root, newRoot, output] = process.argv.slice(2);
  const policy=json(contractPath), prior=json(priorPath), current=json(currentPath);
  verifyRecheckContracts(policy,prior,current,readFileSync(priorPath));
  let proof;
  if (mode==='profile') proof=verifyRecheckedProfile(root,policy,current);
  else {
    assert.equal(mode,'cross-run');
    const retained=policy.retainedProfiles.map(profile=>verifyProfileEvidence(join(root,profile),profile,prior));
    proof=verifyCrossRunProvenance(policy,retained,verifyRecheckedProfile(newRoot,policy,current));
  }
  if(output)writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof,null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
