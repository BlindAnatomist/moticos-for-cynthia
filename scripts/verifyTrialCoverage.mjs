import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const [mode, collectedPath, journalPath, output] = process.argv.slice(2);
const collected = JSON.parse(readFileSync(collectedPath, 'utf8'));
const expected = [];
function visit(suite) {
  for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) expected.push({ id: test.id ?? spec.id, project: test.projectName });
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of collected.suites ?? []) visit(suite);
assert.equal(expected.length, 36); assert.equal(new Set(expected.map(test => test.id)).size, 36);
assert.deepEqual(Object.fromEntries(['webkit-iphone-13', 'webkit-iphone-large', 'chromium-desktop'].map(project => [project, expected.filter(test => test.project === project).length])), { 'webkit-iphone-13': 12, 'webkit-iphone-large': 12, 'chromium-desktop': 12 });
if (mode === 'collected') { console.log('Collected exactly 36 unique cases across three browser profiles.'); process.exit(0); }
assert.equal(mode, 'completed');
const events = readFileSync(journalPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const begin = events.filter(e => e.event === 'begin'), end = events.filter(e => e.event === 'end'), results = events.filter(e => e.event === 'test-end');
assert.equal(begin.length, 1); assert.equal(begin[0].tests, 36); assert.equal(begin[0].workers, 1);
assert.equal(end.length, 1); assert.equal(end[0].status, 'passed');
assert.equal(results.length, 36); assert.equal(new Set(results.map(result => result.id)).size, 36);
assert.deepEqual(results.map(result => result.id).sort(), expected.map(test => test.id).sort());
assert.ok(results.every(result => result.status === 'passed' && result.expectedStatus === 'passed' && result.retry === 0));
const proof = { status: 'passed', uniqueCases: 36, workers: 1, retries: 0, skipped: 0, failed: 0, runCommit: process.env.GITHUB_SHA ?? null, sourceFingerprint: JSON.parse(readFileSync('dist-trial/trial-manifest.json', 'utf8')).sourceFingerprint, results };
writeFileSync(output, JSON.stringify(proof, null, 2) + '\n');
console.log('All 36 distinct browser cases passed once, with no skipped or retried cases.');
