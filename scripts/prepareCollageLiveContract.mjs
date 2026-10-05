import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const [preflightRoot, aggregateProofPath, visualAcceptancePath, expectedReleaseCommit] = process.argv.slice(2);
assert(preflightRoot && aggregateProofPath && visualAcceptancePath && expectedReleaseCommit,
  'Use exact restored RC preflight, verified aggregate proof, explicit visual acceptance receipt, and RC commit.');
assert.match(expectedReleaseCommit, /^[a-f0-9]{40}$/);
const build = read(join(preflightRoot, 'build-proof.json'));
const manifestBytes = readFileSync(join(preflightRoot, 'batch-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const aggregate = read(aggregateProofPath), visual = read(visualAcceptancePath);
assert.equal(build.runCommit, expectedReleaseCommit);
assert.equal(build.manifestSha256, sha(manifestBytes));
assert.equal(build.sourceFingerprint, manifest.sourceFingerprint);
assert.equal(build.normalBuildIsolated, true);
assert.equal(aggregate.status, 'passed'); assert.equal(aggregate.runCommit, expectedReleaseCommit);
assert.equal(aggregate.sourceFingerprint, build.sourceFingerprint);
assert.equal(aggregate.uniqueCases, 36); assert.equal(aggregate.actualExports, 72);
for (const field of ['retries', 'failed', 'skipped']) assert.equal(aggregate[field], 0);
assert.equal(visual.accepted, true, 'Independent visual review must explicitly accept this exact RC');
assert.equal(visual.runCommit, expectedReleaseCommit); assert.equal(visual.sourceFingerprint, build.sourceFingerprint);
assert.equal(manifest.assets.length, 40);
assert(build.files.some(file => file.file === 'dist-batch/index.html'));
for (const file of build.files) {
  assert(/^dist-batch\/[a-zA-Z0-9_./-]+$/.test(file.file) && !file.file.split('/').includes('..'));
  assert.equal(sha(readFileSync(join(preflightRoot, 'build', file.file))), file.sha256, `Restored build byte changed: ${file.file}`);
}
const contract = { schemaVersion: 1, status: 'release-candidate-accepted',
  liveUrl: 'https://moticos-garden-preview.blind-anatomist.chatgpt.site', releaseCommit: expectedReleaseCommit,
  sourceFingerprint: build.sourceFingerprint, manifestSha256: build.manifestSha256, manifest, files: build.files,
  aggregateProofSha256: sha(readFileSync(aggregateProofPath)), visualAcceptanceSha256: sha(readFileSync(visualAcceptancePath)) };
writeFileSync('tests/verification/collage-live-contract.json', JSON.stringify(contract, null, 2) + '\n');
console.log(`Pinned accepted RC ${expectedReleaseCommit}; hosted execution still requires separate deployment and execution approval.`);
