import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const digest = data => createHash('sha256').update(data).digest('hex');
async function walk(root) {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await walk(file)); else out.push(file);
  }
  return out.sort();
}
const runtimePaths = [...await walk('src'), ...await walk('public'), 'package.json', 'package-lock.json', 'vite.config.js', 'index.html'].sort();
const source = await Promise.all(runtimePaths.map(async file => ({ file, sha256: digest(await readFile(file)) })));
const sourceFingerprint = digest(JSON.stringify(source));
const receipt = JSON.parse(await readFile('docs/LIGHT_LETTER_ASSET_RECEIPT.json', 'utf8'));
const emitted = await Promise.all((await walk('dist-trial/assets')).map(async file => ({ file: file.slice('dist-trial/'.length), sha256: digest(await readFile(file)) })));
const assets = receipt.assets.map(asset => {
  const candidates = emitted.filter(file => file.sha256 === asset.sourceSha256);
  assert.equal(candidates.length, 1, `${asset.id} must have one exact emitted canonical sprite.`);
  return { id: asset.id, ...candidates[0] };
});
const indexPath = 'dist-trial/index.html';
let index = await readFile(indexPath, 'utf8');
assert.ok(emitted.some(file => file.file.includes('LightLetterTrial') && file.file.endsWith('.js')), 'This script must run only on the explicitly enabled trial output.');
index = index.replace('</head>', `  <meta name="moticos-private-trial-source" content="${sourceFingerprint}" />\n  </head>`);
await writeFile(indexPath, index);
const result = { kind: 'private-light-letter-trial', baselineCommit: receipt.baselineCommit, sourceFingerprint, entryScripts: [...index.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1]), assets, source };
await writeFile('dist-trial/trial-manifest.json', JSON.stringify(result, null, 2) + '\n');
console.log(`Private trial source fingerprint: ${sourceFingerprint}`);
