import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ENVELOPES } from '../src/matching/registry.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function walk(root, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(root, relative)); else files.push(relative);
  }
  return files.sort();
}
const receipt = JSON.parse(await readFile('docs/LIGHT_LETTER_ASSET_RECEIPT.json', 'utf8'));
const normalFiles = await walk('dist'), trialFiles = await walk('dist-trial');
const normalHashes = new Set(await Promise.all(normalFiles.map(async file => hash(await readFile(path.join('dist', file))))));
const trialHashes = new Set(await Promise.all(trialFiles.map(async file => hash(await readFile(path.join('dist-trial', file))))));
assert.ok(normalFiles.every(file => !file.includes('LightLetterTrial')), 'Normal output must not contain the trial module.');
for (const asset of receipt.assets) {
  assert.equal(hash(await readFile(asset.file)), asset.sourceSha256, `${asset.id}: canonical source changed`);
  assert.ok(!normalHashes.has(asset.sourceSha256), `${asset.id}: private art leaked into normal output`);
  assert.ok(trialHashes.has(asset.sourceSha256), `${asset.id}: canonical art missing from trial output`);
}
const publicFiles = await walk('public/art');
assert.equal(ENVELOPES.flatMap(envelope => envelope.catalog.PIECES).length, 40);
for (const file of publicFiles) {
  const source = await readFile(path.join('public/art', file));
  assert.equal(hash(await readFile(path.join('dist/art', file))), hash(source));
  assert.equal(hash(await readFile(path.join('dist-trial/art', file))), hash(source));
}
const normalJs = (await Promise.all(normalFiles.filter(file => file.endsWith('.js')).map(file => readFile(path.join('dist', file), 'utf8')))).join('\n');
assert.ok(!normalJs.includes('Private Light / Letter trial:') && !normalJs.includes('eye fragment on its open triangular flap'), 'Trial collection/catalog leaked into ordinary build.');
const result = { status: 'passed', baselineCommit: receipt.baselineCommit, publicArtworkCount: 40, preservedPublicArtFiles: publicFiles.length, canonicalPrivateArtworkCount: 5, normalFileCount: normalFiles.length, trialFileCount: trialFiles.length, normalIncludesTrialAssets: false, normalIncludesTrialModule: false, trialIncludesAllCanonicalAssets: true };
await writeFile('evidence/light-letter/build-isolation.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
