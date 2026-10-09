import assert from 'node:assert/strict';
import fs from 'node:fs';

export const APPROVED_SCOPE = JSON.parse(fs.readFileSync(new URL('./approved-scope.json', import.meta.url)));
export const ORDER = Object.freeze(['stage-c-chromium-desktop', 'stage-c-webkit-phone']);
export const CASES = Object.freeze(Object.fromEntries(ORDER.map(p => [p, APPROVED_SCOPE.cases.map(c => [c.id, c.title, c.timeoutSeconds * 1000])])));
export const SCREENSHOTS = Object.freeze(APPROVED_SCOPE.cases.flatMap(c => c.routineScreenshotNames));
export const POSTCARDS = Object.freeze(APPROVED_SCOPE.postcardOutputsPerProfile);
export const BUDGETS = Object.freeze(Object.fromEntries(ORDER.map(p => [p, 870000])));
export const LIMITS = Object.freeze({jobSeconds:2160, setupSeconds:600, cleanupSeconds:60, reserveSeconds:120, artifactBytes:134217728, routinePngs:60, postcardPngs:22, failurePngs:1, traces:1, workers:1, retries:0, repeatEach:1, maxFailures:1, runStarts:1});
export const CONFIG = 'stage-c-evidence/execution/playwright.config.mjs';
export const ROOT = 'stage-c-browser-results';
export const TARGET = Object.freeze({repository:'BlindAnatomist/moticos-for-cynthia', ref:'refs/heads/verify/full-campaign-280-20261009', parent:'8c12d874b27ce6108b1fb770037d99d3444bf0d0', parentTree:'d3a7e9f1243013418c16b418458b677353a84cdb'});
export const AUTHORIZATION_REFERENCE = 'Sentinel_832f67454c148191a1de412f69b2d0bf';
export function invocation(args) {
  assert(Array.isArray(args));
  const listing = JSON.stringify(args) === JSON.stringify(['test', `--config=${CONFIG}`, '--list', '--reporter=json']);
  const profile = ORDER.find(p => JSON.stringify(args) === JSON.stringify(['test', `--config=${CONFIG}`, `--project=${p}`]));
  assert(listing || profile, 'Only exact 20-instance collection or one complete bounded profile is permitted');
  return {listing, profile};
}
// Per-case allowances overlap with each profile's fixed870-second cap. The shared
// job deadline may shorten a profile, which is an honest incomplete failure,
// never permission to skip cases or promote partial evidence.
export function remaining(profile) {
  assert(ORDER.includes(profile));return LIMITS.cleanupSeconds+LIMITS.reserveSeconds;
}
export function admit(profile, elapsed) {
  assert(Number.isSafeInteger(elapsed) && elapsed >= 0);assert(ORDER.includes(profile));
  const available=LIMITS.jobSeconds-elapsed-remaining(profile);
  assert(available>0,'No browser time remains before cleanup/reserve');
  return Math.min(BUDGETS[profile],available*1000);
}
export function environment(env, commit) {
  assert.equal(env.GITHUB_ACTIONS, 'true'); assert.equal(env.MOTICOS_280_PUBLIC_REPO, 'true');
  assert.equal(env.GITHUB_REPOSITORY, TARGET.repository); assert.equal(env.GITHUB_REF, TARGET.ref);
  assert.equal(env.GITHUB_SHA, commit); assert.equal(env.GITHUB_RUN_ATTEMPT, '1');
  assert.equal(env.GITHUB_EVENT_NAME, 'push'); assert.match(env.GITHUB_RUN_ID ?? '', /^\d+$/);
  assert.equal(env.RUNNER_ENVIRONMENT, 'github-hosted'); assert.equal(env.RUNNER_OS, 'Linux');
}
export function approval(a, identity, env) {
  assert.equal(a.status, 'explicit-owner-approved'); assert.equal(a.scope, 'moticos-280-20-cases');
  assert.deepEqual(a.limits, LIMITS); assert.deepEqual(a.profiles, ORDER);
  for (const k of ['sourceFingerprint','buildFingerprint','probeFingerprint','commit','parent','parentTree']) assert.equal(a[k], identity[k], k);
  assert.equal(a.authorizationReference, AUTHORIZATION_REFERENCE); environment(env, identity.commit);
  return true;
}
