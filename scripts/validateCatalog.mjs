import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ENVELOPES, getMatchingEngine } from '../src/matching/registry.js';
import { BOARD_ART_BOUNDS, COMPACT_BOARD_LABELS } from '../src/matching/boardArt.js';

// Content admission checks grow with the registry, not a frozen piece count.
// Actual raster pixels and browser-rendered legibility remain separate gates.
const ids = new Set(), keys = new Set(), assetPaths = new Set(), hashes = new Set();
const records = [];
for (const envelope of ENVELOPES) {
  assert.ok(!keys.has(envelope.storageKey), 'Each envelope needs its own save key.');
  keys.add(envelope.storageKey);
  const engine = getMatchingEngine(envelope.id);
  assert.equal(engine.PACK_ID, envelope.id);
  assert.equal(engine.STORAGE_KEY, envelope.storageKey);
  for (const family of envelope.catalog.FAMILIES) {
    assert.equal(family.pieceIds.length, 5);
    assert.deepEqual(family.pieceIds.map(id => engine.CATALOG[id].mass), [1, 2, 4, 8, 16]);
  }
  for (const piece of envelope.catalog.PIECES) {
    assert.ok(!ids.has(piece.id), `${piece.id} is reused.`); ids.add(piece.id);
    assert.match(piece.art, /^\/art\/[a-zA-Z0-9_/-]+\.webp$/);
    assert.ok(!piece.art.includes('..'), 'Asset paths remain inside the art directory.');
    assert.ok(!assetPaths.has(piece.art), `${piece.art} is reused as another piece.`); assetPaths.add(piece.art);
    const asset = new URL(`../public${piece.art}`, import.meta.url);
    const bytes = await readFile(asset), sha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(!hashes.has(sha256), `${piece.id} duplicates existing raster bytes.`); hashes.add(sha256);
    const bounds = BOARD_ART_BOUNDS[piece.id];
    assert.ok(bounds, `${piece.id} has no board crop.`);
    const { source: [sw, sh], crop: [x, y, w, h], ink: [ix, iy, iw, ih] } = bounds;
    assert.ok([sw, sh, w, h, iw, ih].every(value => Number.isInteger(value) && value > 0));
    assert.ok([x, y, ix, iy].every(value => Number.isInteger(value) && value >= 0));
    assert.ok(x + w <= sw && y + h <= sh && ix >= x && iy >= y && ix + iw <= x + w && iy + ih <= y + h);
    const compactScale = Math.min(45.515625 / w, 34.515625 / h);
    const compactPaintedLongEdge = Math.max(iw, ih) * compactScale;
    assert.ok(compactPaintedLongEdge >= 30, `${piece.id} predicts undersized compact-board ink (${compactPaintedLongEdge}).`);
    const label = COMPACT_BOARD_LABELS[piece.id] ?? piece.shortName;
    assert.ok(label.length <= 9 && !/[\n\r]/.test(label), `${piece.id} needs a concise compact label.`);
    records.push({ id: piece.id, envelope: envelope.id, path: `public${piece.art}`, bytes: (await stat(asset)).size, sha256, compactPaintedLongEdge });
  }
}
assert.deepEqual(Object.keys(BOARD_ART_BOUNDS).sort(), [...ids].sort(), 'Every board crop belongs to an active piece.');
for (const id of Object.keys(COMPACT_BOARD_LABELS)) assert.ok(ids.has(id));
console.log(JSON.stringify({ envelopes: ENVELOPES.length, pieces: ids.size, worlds: ENVELOPES.length * 2,
  postcards: ENVELOPES.reduce((count, envelope) => count + envelope.catalog.PIECES.filter(piece => piece.tier >= 3).length, 0),
  assetBytes: records.reduce((sum, record) => sum + record.bytes, 0), records }, null, 2));
