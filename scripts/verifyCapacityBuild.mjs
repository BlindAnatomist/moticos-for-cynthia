import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inventory, sourceInventory } from './verifyCollageBuild.mjs';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = ['playwright.capacity.config.js', 'scripts/verifyCapacityBuild.mjs', 'scripts/serveCapacity.mjs', 'scripts/playwrightInvocation.mjs', 'tests/batch/shared-helpers.js'];
function identify(root, commit) {
  assert.match(commit, /^[a-f0-9]{40}$/, 'An exact staged commit is required for browser evidence');
  const source = sourceInventory(root), manifest = JSON.parse(readFileSync(resolve(root, 'dist-batch/batch-manifest.json'), 'utf8'));
  assert.deepEqual(manifest.source, source);
  assert.equal(manifest.sourceFingerprint, digest(JSON.stringify(source)));
  const index = readFileSync(resolve(root, 'dist-batch/index.html'), 'utf8');
  assert(index.includes(`<meta name="moticos-private-collage-source" content="${manifest.sourceFingerprint}" />`));
  const files = [...inventory(root, 'tests/capacity'), ...inventory(root, 'tests/capacity-browser'), ...checks.map(file => ({ file, sha256: digest(readFileSync(resolve(root, file))) }))];
  return { kind: 'moticos-save-capacity-build-v1', commit, sourceFingerprint: manifest.sourceFingerprint, source, tests: files, build: inventory(root, 'dist-batch') };
}
export function freezeCapacityBuild(root, commit) { return identify(root, commit); }
export function verifyCapacityBuild(proof, root, commit) { assert.deepEqual(identify(root, commit), proof); return proof; }
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, path = 'preflight-results/capacity-build-proof.json'] = process.argv.slice(2);
  const commit = process.env.GITHUB_SHA;
  if (mode === 'freeze') writeFileSync(path, JSON.stringify(freezeCapacityBuild('.', commit), null, 2) + '\n');
  else { assert.equal(mode, 'verify'); verifyCapacityBuild(JSON.parse(readFileSync(path, 'utf8')), '.', commit); }
}
