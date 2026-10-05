import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const PROFILES = ['webkit-iphone-13', 'webkit-iphone-large', 'chromium-desktop'];
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ordered = values => values.map(value => JSON.stringify(value)).sort();
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const contractPath = 'tests/verification/collage-coverage-contract.json';
const identity = test => ({ id: test.id, project: test.project, file: test.file, title: test.title });

export function validateContract(contract) {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.expectedTotal, 36);
  assert.equal(contract.cases.length, 36);
  assert.equal(new Set(contract.cases.map(test => test.id)).size, 36);
  assert.deepEqual([...new Set(contract.cases.map(test => test.project))].sort(), [...PROFILES].sort());
  for (const profile of PROFILES) assert.equal(contract.cases.filter(test => test.project === profile).length, 12);
  for (const test of contract.cases) {
    assert.deepEqual(Object.keys(test).sort(), ['file', 'id', 'project', 'title']);
    for (const key of ['id', 'project', 'file', 'title']) assert.equal(typeof test[key], 'string');
    assert.equal(test.file, 'collage.spec.js');
  }
  assert.match(contract.sourceFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(contract.postcardIds.length, 24);
  assert.equal(new Set(contract.postcardIds).size, 24);
  return contract;
}
export function verifyPinnedCases(contract, root = '.') {
  validateContract(contract);
  const actual = readdirSync(join(root, 'tests/batch')).sort();
  assert.deepEqual(actual, contract.testFiles.map(file => basename(file.path)).sort(), 'Batch test inventory changed');
  for (const record of contract.testFiles) {
    assert.match(record.path, /^tests\/batch\/[^/]+\.js$/);
    assert.equal(digest(readFileSync(join(root, record.path))), record.sha256, `Changed scenario: ${record.path}`);
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
  assert.equal(expected.length, 12, 'Exactly one approved profile');
  const begins = events.filter(event => event.event === 'begin');
  const ends = events.filter(event => event.event === 'end');
  const starts = events.filter(event => event.event === 'test-begin');
  const results = events.filter(event => event.event === 'test-end');
  assert.equal(begins.length, 1); assert.equal(ends.length, 1);
  assert.equal(events[0].event, 'begin'); assert.equal(events.at(-1).event, 'end');
  assert.equal(begins[0].tests, 12); assert.equal(begins[0].workers, 1);
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
  assert.equal(terminalCount, 12);
  assert.equal(report.stats?.expected, 12);
  for (const field of ['unexpected', 'flaky', 'skipped']) assert.equal(report.stats[field], 0);
  return { status: 'passed', profile, uniqueCases: 12, workers: 1, retries: 0, failed: 0, skipped: 0, results };
}
export function verifyExports(contract, profile, directory) {
  const names = readdirSync(directory).filter(name => name.endsWith('-export.png')).sort();
  const expected = contract.postcardIds.map(id => `${profile}-${id}-export.png`).sort();
  assert.deepEqual(names, expected, 'Exactly 24 actual postcard exports per profile');
  const exports = names.map(file => {
    const bytes = readFileSync(join(directory, file));
    assert(bytes.length > 10000); assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1536); assert.equal(bytes.readUInt32BE(20), 1120);
    return { file, bytes: bytes.length, sha256: digest(bytes) };
  });
  assert.equal(new Set(exports.map(item => item.sha256)).size, 24, 'Distinct actual exports');
  return exports;
}
export function verifyAggregate(contract, proofs) {
  validateContract(contract);
  assert.equal(proofs.length, 3);
  assert.deepEqual(proofs.map(proof => proof.profile).sort(), [...PROFILES].sort());
  assert.equal(new Set(proofs.map(proof => proof.runCommit)).size, 1);
  assert.match(proofs[0].runCommit, /^[a-f0-9]{40}$/);
  for (const proof of proofs) {
    assert.equal(proof.status, 'passed'); assert.equal(proof.uniqueCases, 12);
    assert.equal(proof.sourceFingerprint, contract.sourceFingerprint);
    assert.equal(proof.exports.length, 24);
    for (const field of ['retries', 'failed', 'skipped']) assert.equal(proof[field], 0);
  }
  const cases = proofs.flatMap(proof => proof.results.map(event => identity({ ...event, file: basename(event.file), title: event.title.at(-1) })));
  assert.deepEqual(ordered(cases), ordered(contract.cases));
  return { status: 'passed', runCommit: proofs[0].runCommit, sourceFingerprint: contract.sourceFingerprint,
    uniqueCases: 36, actualExports: 72, retries: 0, failed: 0, skipped: 0,
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
      const events = readFileSync(join(root, 'batch-test-results/progress/browser-events.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
      const raw = verifyCompleted(contract, name, events, readJson(join(root, 'batch-test-results/results.json')));
      assert.deepEqual(saved.results, raw.results);
      assert.deepEqual(saved.exports, verifyExports(contract, name, join(root, 'batch-test-results/review')));
      const build = readJson(join(prefix, 'build-proof.json'));
      assert.equal(saved.runCommit, build.runCommit);
      assert.equal(saved.sourceFingerprint, build.sourceFingerprint);
      assert.equal(build.manifestSha256, digest(readFileSync(join(prefix, 'batch-manifest.json'))));
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
  const manifest = readJson('dist-batch/batch-manifest.json');
  assert.equal(manifest.sourceFingerprint, contract.sourceFingerprint);
  Object.assign(proof, { runCommit: process.env.GITHUB_SHA ?? null, sourceFingerprint: manifest.sourceFingerprint,
    exports: verifyExports(contract, profile, 'batch-test-results/review') });
  writeFileSync(output, JSON.stringify(proof, null, 2) + '\n');
  console.log(`${profile}: exactly 12 terminal zero-retry passes and 24 actual postcard exports.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
