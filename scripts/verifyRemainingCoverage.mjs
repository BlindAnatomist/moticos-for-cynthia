import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = value => JSON.stringify([value.id, value.project, value.file, value.title]);
const fail = message => assert.fail(message);

export function caseMap(cases, label) {
  const result = new Map();
  for (const value of cases) {
    for (const key of ['id', 'project', 'file', 'title']) assert.equal(typeof value[key], 'string', `${label}: missing ${key}`);
    assert(!result.has(value.id), `${label}: duplicate ID ${value.id}`);
    result.set(value.id, identity(value));
  }
  return result;
}
export function assertSameCases(actual, expected, label) {
  assert.deepEqual([...caseMap(actual, label)].sort(), [...caseMap(expected, 'expected')].sort(), `${label}: identity set differs`);
}
export function validateContract(contract) {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.expectedTotal, 246);
  assert.equal(contract.priorPassed.length, 170);
  assert.equal(contract.remaining.length, 76);
  const all = [...contract.priorPassed, ...contract.remaining];
  assert.equal(caseMap(all, 'coverage union').size, contract.expectedTotal);
  return all;
}
function filesWithin(root, folder) {
  return readdirSync(join(root, folder), { withFileTypes: true }).flatMap(entry => {
    const name = `${folder}/${entry.name}`;
    assert(!entry.isSymbolicLink(), `Pinned source symlink: ${name}`);
    return entry.isDirectory() ? filesWithin(root, name) : [name];
  });
}
export function verifyPinnedFiles(contract, root) {
  validateContract(contract);
  const seen = new Set();
  for (const record of [...contract.pinnedFiles, contract.remainingManifest]) {
    assert(!seen.has(record.path), `Duplicate pinned path: ${record.path}`);
    seen.add(record.path);
    assert(record.path && !record.path.split('/').includes('..') && !record.path.startsWith('/'), 'Unsafe pinned path');
    const bytes = readFileSync(join(root, record.path));
    assert.equal(bytes.length, record.bytes, `Pinned bytes changed: ${record.path}`);
    assert.equal(digest(bytes), record.sha256, `Pinned SHA changed: ${record.path}`);
  }
  for (const folder of ['src', 'public', 'tests/e2e']) {
    const expected = contract.pinnedFiles.filter(item => item.path.startsWith(`${folder}/`)).map(item => item.path).sort();
    assert.deepEqual(filesWithin(root, folder).sort(), expected, `Pinned ${folder} inventory changed`);
  }
}
export function collectedCases(report) {
  assert.equal(report.errors?.length ?? 0, 0, 'Collection has errors');
  const result = [];
  const visit = suites => {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        assert.equal(spec.tests.length, 1, 'Expected one project per collected spec');
        result.push({ id: spec.id, project: spec.tests[0].projectName, file: spec.file, title: spec.title });
      }
      visit(suite.suites ?? []);
    }
  };
  visit(report.suites ?? []);
  return result;
}
export function verifyCollection(contract, fullReport, remainingReport) {
  const all = validateContract(contract);
  assertSameCases(collectedCases(fullReport), all, 'Full 246-case collection');
  assertSameCases(collectedCases(remainingReport), contract.remaining, 'Remaining 76-case collection');
  return { priorPassed: 170, selected: 76, total: 246, duplicates: 0, omitted: 0 };
}
export function verifyCompleted(contract, events) {
  validateContract(contract);
  const begins = events.filter(event => event.event === 'begin');
  const ends = events.filter(event => event.event === 'end');
  assert.equal(begins.length, 1, 'Expected one run begin');
  assert.equal(begins[0].tests, 76);
  assert.equal(begins[0].workers, 2);
  assert.equal(ends.length, 1, 'Missing or repeated terminal run result');
  assert.equal(ends[0].status, 'passed', 'Run did not pass');
  const normalize = event => ({ id: event.id, project: event.project, file: basename(event.file), title: event.title.at(-1) });
  const starts = events.filter(event => event.event === 'test-begin');
  const results = events.filter(event => event.event === 'test-end');
  for (const event of [...starts, ...results]) assert.equal(event.retry, 0, 'Retry is not authorized');
  for (const event of results) {
    assert.equal(event.status, 'passed', `Unpassed case: ${event.id}`);
    assert.equal(event.expectedStatus, 'passed', 'Unexpected expected-failure case');
    assert.deepEqual(event.errors, [], 'Terminal case has errors');
  }
  assertSameCases(starts.map(normalize), contract.remaining, 'Started cases');
  assertSameCases(results.map(normalize), contract.remaining, 'Terminal passes');
  assert.equal(caseMap([...contract.priorPassed, ...results.map(normalize)], 'Final union').size, 246);
  return { complete: true, priorRunId: contract.priorRunId, priorPassed: 170, continuationPassed: 76, uniquePassed: 246, retries: 0 };
}
export function run(args, root = process.cwd()) {
  const [mode, ...paths] = args;
  const contractPath = 'tests/verification/lantern-coverage-contract.json';
  const contractBytes = readFileSync(join(root, contractPath));
  const contract = JSON.parse(contractBytes);
  verifyPinnedFiles(contract, root);
  let result;
  if (mode === 'collected' && paths.length === 3) {
    result = verifyCollection(contract, ...paths.slice(0, 2).map(path => JSON.parse(readFileSync(resolve(root, path)))));
  } else if (mode === 'completed' && paths.length === 2) {
    const bytes = readFileSync(resolve(root, paths[0]));
    result = { ...verifyCompleted(contract, bytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line))), eventSha256: digest(bytes) };
  } else fail('Usage: collected full.json remaining.json proof.json OR completed browser-events.jsonl proof.json');
  const proof = { ...result, contractSha256: digest(contractBytes), pinnedFiles: contract.pinnedFiles.length, runtimeAndArtUnchanged: true };
  writeFileSync(resolve(root, paths.at(-1)), `${JSON.stringify(proof, null, 2)}\n`);
  return proof;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
