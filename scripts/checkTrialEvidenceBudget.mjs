import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
const manifestPath = 'bounded-evidence/parts/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')), metadataBytes = statSync(manifestPath).size;
assert.ok(manifest.parts.length <= 5);
let upperBound = 0;
for (const part of manifest.parts) {
  const size = part.bytes + metadataBytes + 4096;
  assert.ok(size <= 40 * 1024 * 1024, 'Each uploaded part, metadata and ZIP overhead must fit 40 MiB.');
  upperBound += size;
}
assert.ok(upperBound <= 200 * 1024 * 1024, 'The total uploaded evidence must fit 200 MiB.');
console.log(`Evidence upload upper bound: ${upperBound} bytes across ${manifest.parts.length} parts.`);
