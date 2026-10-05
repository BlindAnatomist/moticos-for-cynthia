import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ENVELOPES } from '../src/matching/batch/registry.js';
import { RECOVERY_ENVELOPES, PRESERVED_ENVELOPES } from '../src/matching/recovery/recoveryRegistry.js';
import { RUNTIME_FINGERPRINT, BUILD_FINGERPRINT } from '../tests/rollback-browser/plan.js';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    assert(!entry.isSymbolicLink(), `Symlink in frozen input: ${entry.name}`);
    return entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)];
  }).sort();
}
export const authority = () => JSON.parse(fs.readFileSync('tests/verification/rollback-authority.json'));
export function verifyRuntime() {
  const pinned = authority();
  assert.equal(pinned.runtimeFingerprint, RUNTIME_FINGERPRINT);
  assert.equal(pinned.buildFingerprint, BUILD_FINGERPRINT);
  const source = [...walk('src'), ...walk('public'), 'package.json', 'package-lock.json', 'vite.config.js', 'index.html'].sort()
    .map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
  assert.deepEqual(source, pinned.source, 'Runtime inventory or bytes changed');
  assert.equal(hash(JSON.stringify(source)), RUNTIME_FINGERPRINT);
  for (const row of [...pinned.reviewedRuntime, ...pinned.originalAssets]) assert.equal(hash(fs.readFileSync(row.path)), row.sha256, row.path);
  assert.equal(ENVELOPES.length, 8); assert.equal(ENVELOPES.flatMap(e => e.catalog.PIECES).length, 80);
  assert.equal(RECOVERY_ENVELOPES.length, 12); assert.equal(PRESERVED_ENVELOPES.length, 4);
  for (const e of PRESERVED_ENVELOPES) assert(e.catalog.PIECES.every(p => p.art === ''));
  return pinned;
}
export function verifyBuild(directory = 'dist-rollback') {
  const pinned = verifyRuntime();
  const files = walk(directory).map(file => ({ file: file.slice(directory.length + 1), bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) }));
  assert.deepEqual(files, pinned.build, 'Build file set or bytes changed');
  assert.equal(hash(JSON.stringify(files)), BUILD_FINGERPRINT);
  assert.equal(files.filter(file => /^assets\/.*\.webp$/.test(file.file)).length, 40);
  return { runtimeFingerprint: RUNTIME_FINGERPRINT, buildFingerprint: BUILD_FINGERPRINT, files: files.length, playablePictures: 80, preservedEnvelopes: 4 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [directory = 'dist-rollback', output] = process.argv.slice(2), proof = verifyBuild(directory);
  if (output) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n'); }
  console.log(JSON.stringify(proof));
}
