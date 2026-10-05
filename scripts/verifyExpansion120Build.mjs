import assert from 'node:assert/strict';
import { readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { digest, verifyPinnedCases } from './verifyExpansion120Coverage.mjs';
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
export function inventory(root, folder) {
  assert(lstatSync(join(root, folder)).isDirectory());
  return readdirSync(join(root, folder), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = `${folder}/${entry.name}`;
    assert(!entry.isSymbolicLink(), `Symlink forbidden: ${file}`);
    assert(entry.isDirectory() || entry.isFile(), `Not a regular file: ${file}`);
    return entry.isDirectory() ? inventory(root, file) : [{ file, sha256: digest(readFileSync(join(root, file))) }];
  });
}
export function sourceInventory(root) {
  return [...inventory(root, 'src'), ...inventory(root, 'public'), ...['package.json', 'package-lock.json', 'vite.config.js', 'index.html'].map(file => ({file, sha256: digest(readFileSync(join(root, file)))}))].sort((a,b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
export function verifyManifest(root = '.') {
  const contract = readJson(join(root, 'tests/verification/expansion120-coverage-contract.json'));
  verifyPinnedCases(contract, root);
  const manifest = readJson(join(root, 'dist-expansion/expansion-manifest.json'));
  const source = sourceInventory(root);
  assert.deepEqual(manifest.source, source, 'Build source inventory differs from this checkout');
  assert.equal(manifest.sourceFingerprint, digest(JSON.stringify(source)));
  assert.equal(manifest.sourceFingerprint, contract.sourceFingerprint, 'Frozen runtime source changed');
  const index = readFileSync(join(root, 'dist-expansion/index.html'), 'utf8');
  assert(index.includes(`<meta name="moticos-private-expansion-source" content="${manifest.sourceFingerprint}" />`));
  assert.deepEqual(manifest.entryScripts, [...index.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1]));
  const emitted = inventory(root, 'dist-expansion/assets').map(item => ({ ...item, file: item.file.slice('dist-expansion/'.length) }));
  const entryFiles = emitted.filter(item => /\.(js|css)$/.test(item.file));
  assert(entryFiles.some(item => item.file.endsWith('.js')) && entryFiles.some(item => item.file.endsWith('.css')));
  const ordered = records => records.map(item => JSON.stringify(item)).sort();
  assert.deepEqual(ordered(manifest.entryFiles), ordered(entryFiles), 'Exact emitted JS/CSS proof');
  const receipt = readJson(join(root, 'evidence/expansion-assets/asset-receipt.json'));
  assert.equal(receipt.records.length, 40); assert.equal(manifest.assets.length, 40);
  assert.equal(new Set(receipt.records.map(item => item.id)).size, 40);
  for (const record of receipt.records) {
    assert.match(record.id, /^[a-z]+[1-5]$/);
    assert.equal(digest(readFileSync(join(root, `src/matching/expansion/art/${record.id}.webp`))), record.canonicalWebpSha256);
    const matches = emitted.filter(item => item.sha256 === record.canonicalWebpSha256);
    assert.equal(matches.length, 1, `Exact canonical new art: ${record.id}`);
    assert.deepEqual(manifest.assets.find(item => item.id === record.id), { id: record.id, ...matches[0] });
  }
  // Every original public byte, including all old artworks, survives unchanged.
  for (const item of inventory(root, 'public')) {
    assert.equal(digest(readFileSync(join(root, 'dist-expansion', item.file.slice('public/'.length)))), item.sha256, `Preserved public asset: ${item.file}`);
  }
  return { sourceFingerprint: manifest.sourceFingerprint, sourceFiles: source.length,
    canonicalNewArt: 40, preservedPublicFiles: inventory(root, 'public').length,
    entryFiles: manifest.entryFiles, manifestSha256: digest(readFileSync(join(root, 'dist-expansion/expansion-manifest.json'))) };
}
export function verifyIsolation(root = '.') {
  const proof = verifyManifest(root);
  const manifest = readJson(join(root, 'dist-expansion/expansion-manifest.json'));
  const normal = inventory(root, 'dist');
  const normalHashes = new Set(normal.map(item => item.sha256));
  for (const item of manifest.assets) assert(!normalHashes.has(item.sha256), `New art leaked into normal build: ${item.id}`);
  for (const item of normal.filter(item => /\.(js|html)$/.test(item.file))) {
    const content = readFileSync(join(root, item.file), 'utf8');
    assert(!content.includes('moticos.matching.expansion-'), 'Batch save key leaked into normal build');
    assert(!content.includes('moticos-private-expansion-source'), 'Batch marker leaked into normal build');
  }
  for (const item of inventory(root, 'public')) assert.equal(digest(readFileSync(join(root, 'dist', item.file.slice('public/'.length)))), item.sha256);
  return { ...proof, normalBuildIsolated: true };
}
export function harnessInventory(root) {
  const files = ['playwright.expansion120.config.js','.github/workflows/verify-expansion-120.yml',
    'scripts/verifyExpansion120Coverage.mjs','scripts/verifyExpansion120Build.mjs','scripts/serveExpansion120.mjs',
    'scripts/stampExpansion.mjs','scripts/playwrightInvocation.mjs','scripts/checkWorkerReload.mjs',
    'scripts/progress-reporter.mjs','scripts/batch-progress-reporter.mjs','scripts/preserveExpansion120Evidence.py',
    'scripts/preserveEvidence.py','scripts/restoreCollageEvidence.py','scripts/contentAddressedEvidence.py','scripts/packEvidenceDiagnosis.py',
    'tests/verification/expansion120-coverage-contract.json','evidence/expansion-assets/asset-receipt.json',
    'tests/capacity/fixtures.js','tests/capacity/readStoredSave.js'];
  return [...files.map(file=>({file,sha256:digest(readFileSync(join(root,file)))})),...inventory(root,'tests/expansion-browser')].sort((a,b)=>a.file.localeCompare(b.file));
}
export function freezeBuild(root = '.', runCommit) {
  assert.match(runCommit, /^[a-f0-9]{40}$/);
  return { schemaVersion: 1, runCommit, ...verifyIsolation(root), files: inventory(root, 'dist-expansion'), harness: harnessInventory(root) };
}
export function verifyBuild(proof, root = '.', runCommit) {
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.runCommit, runCommit, 'Build is from a different commit');
  assert.deepEqual(proof.harness, harnessInventory(root), 'Browser harness/evidence bytes changed');
  const actual = verifyManifest(root);
  assert.equal(proof.sourceFingerprint, actual.sourceFingerprint);
  assert.equal(proof.manifestSha256, actual.manifestSha256);
  assert.equal(proof.normalBuildIsolated, true);
  assert.deepEqual(inventory(root, 'dist-expansion'), proof.files, 'Prebuilt output has added, omitted or changed bytes');
  return actual;
}
function main() {
  const [mode, proofPath = 'preflight-results/build-proof.json'] = process.argv.slice(2);
  const runCommit = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (mode === 'freeze') writeFileSync(proofPath, JSON.stringify(freezeBuild('.', runCommit), null, 2) + '\n');
  else { assert.equal(mode, 'verify'); verifyBuild(readJson(proofPath), '.', runCommit); }
  console.log(`${mode}: exact source, 40 canonical new artworks, protected old public files, entry JS/CSS and all build bytes verified.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
