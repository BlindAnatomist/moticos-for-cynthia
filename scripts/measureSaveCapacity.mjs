import { performance } from 'node:perf_hooks';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createMatchingEngine as createLegacyEngine } from '../tests/fixtures/legacy-matching-engine-v1.js';
import { makeScaleEngine, denseSave, memoryStorage } from '../tests/capacity/fixtures.js';
import { readObservedSave, summarizeEnvelope } from '../src/matching/progress.js';
import { openEnvelopeSession, commitEnvelopeSession } from '../src/matching/session.js';
const samples = (run, count = 30) => {
  for (let i = 0; i < 5; i++) run();
  const values = Array.from({ length: count }, () => { const start = performance.now(); run(); return performance.now() - start; }).sort((a, b) => a - b);
  return { samples: count, medianMs: values[Math.floor(count / 2)], p95Ms: values[Math.ceil(count * .95) - 1], maximumMs: values.at(-1) };
};
const fixtures = Array.from({ length: 30 }, (_, i) => {
  const { engine, envelope } = makeScaleEngine(i), save = denseSave(engine, 20261005 + i), raw = engine.serializeSave(save), compact = engine.serializeStoredSave(save);
  const legacy = createLegacyEngine({ catalog: envelope.catalog, storageKey: envelope.storageKey });
  if (JSON.stringify(engine.readSave(compact).save) !== raw || !legacy.validSave(save)) throw Error('Lossless legacy parity failure');
  return { engine, envelope, legacy, save, raw, compact };
});
const report = {
  generatedAt: new Date().toISOString(), runtime: process.version, platform: process.platform,
  caveat: 'Node timings and a simulated UTF-16 aggregate quota only. Synthetic catalog IDs are longer than shipped IDs. Not phone, WebKit, browser quota, disk durability, authored 300-piece content, or full UI responsiveness proof.',
  legacyEngineSha256: createHash('sha256').update(await readFile(new URL('../tests/fixtures/legacy-matching-engine-v1.js', import.meta.url))).digest('hex'),
  historyEntriesPerEnvelope: 100, occupiedCellsPerEnvelope: 24, scale: [],
};
for (const count of [8, 12, 30]) {
  const set = fixtures.slice(0, count); const utf8 = value => Buffer.byteLength(value);
  const utf16Total = key => set.reduce((n, f) => n + 2 * (f.engine.STORAGE_KEY.length + f[key].length), 0);
  const gzip = set.map(f => gzipSync(f.raw));
  for (let i = 0; i < set.length; i++) if (gunzipSync(gzip[i]).toString() !== set[i].raw) throw Error('gzip comparison mismatch');
  const storage = memoryStorage(); for (const f of set) storage.bytes.set(f.engine.STORAGE_KEY, f.compact);
  const summary = f => summarizeEnvelope(f.envelope, { save: readObservedSave(f.engine, storage).save, opened: true, temporary: false, unread: false, conflict: false, unavailable: false });
  report.scale.push({ envelopes: count, syntheticPieces: count * 10, legacyUtf8Bytes: set.reduce((n, f) => n + utf8(f.raw), 0), legacyUtf16BytesIncludingKeys: utf16Total('raw'),
    compactUtf8Bytes: set.reduce((n, f) => n + utf8(f.compact), 0), compactUtf16BytesIncludingKeys: utf16Total('compact'),
    gzipBase64Utf16BytesIncludingKeys: gzip.reduce((n, bytes, i) => n + 2 * (bytes.toString('base64').length + set[i].engine.STORAGE_KEY.length), 0),
    losslessRoundTrips: set.length,
    legacyColdReadAll: samples(() => set.forEach(f => f.legacy.readSave(f.raw))),
    compactColdReadAll: samples(() => set.forEach(f => f.engine.readSave(f.compact))),
    compactWarmAlbumSummaryAll: samples(() => set.map(summary)),
  });
}
const f = fixtures.at(-1), { engine, save, legacy } = f;
const action = { type: 'move', from: save.round.board.findIndex(Boolean), to: save.round.board.findIndex(tile => tile === null) };
report.activeEnvelope = {
  legacyActAndSerialize: samples(() => legacy.serializeSave(legacy.act(save, action)), 100),
  compactActAndSerialize: samples(() => engine.serializeStoredSave(engine.act(save, action)), 100),
  gzipSerializationOnly: samples(() => gzipSync(f.raw).toString('base64'), 100),
};
for (const transport of ['legacy', 'compact']) {
  const storage = memoryStorage({ limit: 5 * 1024 * 1024 }); let blockedAt = null;
  for (const f of fixtures) {
    try { storage.setItem(f.engine.STORAGE_KEY, transport === 'legacy' ? f.raw : f.compact); }
    catch { blockedAt = storage.bytes.size + 1; break; }
  }
  report[`${transport}Simulated5MiB`] = { storedEnvelopes: storage.bytes.size, blockedAt, preservePolicy: 'No deletes or pruning' };
}
// A full legacy budget migrates one played envelope at a time, never all at startup.
const migration = memoryStorage({ limit: 5 * 1024 * 1024 });
for (const f of fixtures) { try { migration.setItem(f.engine.STORAGE_KEY, f.raw); } catch { break; } }
const initial = migration.bytes.size;
for (const f of fixtures.slice(0, initial)) {
  const session = openEnvelopeSession(f.engine, new Map(), migration);
  const next = f.engine.act(session.save, { type: 'undo' });
  commitEnvelopeSession(f.engine, session, next, migration);
  if (session.blocked || JSON.stringify(f.engine.readSave(migration.getItem(f.engine.STORAGE_KEY)).save) !== JSON.stringify(next)) throw Error('Migration failed');
}
report.nearQuotaMigration = { legacyEnvelopes: initial, migratedEnvelopes: initial, remainingUndoPerEnvelope: 99, exactRoundTrips: true };
await writeFile(new URL('../../evidence/capacity-measurements.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
