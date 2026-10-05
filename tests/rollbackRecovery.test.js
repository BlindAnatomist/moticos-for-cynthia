import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { RECOVERY_ENVELOPES, PRESERVED_ENVELOPES, getRecoveryEngine } from '../src/matching/recovery/recoveryRegistry.js';
import { ENVELOPES as PLAYABLE, getEnvelope } from '../src/matching/batch/registry.js';
import { captureRecovery, summarizeRecoveryEntry, recoveryDownload, recoveryRequested, recoveryLocation } from '../src/matching/recovery/snapshot.js';
import { openEnvelopeSession, commitEnvelopeSession } from '../src/matching/session.js';
import { createMatchingEngine as legacyEngine } from './fixtures/legacy-matching-engine-v1.js';
import { memoryStorage, denseSave } from './capacity/fixtures.js';
function completedHistory(engine, seed) {
 let save = engine.newSave();
 for (const family of engine.FAMILIES) { let limit = 0;
  while (!save.discoveries.includes(family.finalId)) {
   if (++limit > 42) throw new Error('Fixture progression failed');
   const pair = engine.mergePairs(save.round.board).find(([index]) => engine.CATALOG[save.round.board[index].pieceId].familyId === family.id);
   save = engine.act(save, pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: family.id });
  }
 }
 // Legal dense history after a reset, which retains every previous discovery.
 save = { ...denseSave(engine, seed), discoveries: save.discoveries, sound: seed % 2 === 0 };
 expect(engine.validSave(save)).toBe(true); return save;
}
function storedCollection(version) {
 const storage = memoryStorage(), saves = new Map();
 RECOVERY_ENVELOPES.forEach((e, i) => { const engine = getRecoveryEngine(e.id), save = completedHistory(engine, i + 7); saves.set(e.id, save);
  storage.bytes.set(e.storageKey, version === 1 ? ' \n' + JSON.stringify(save, null, 1) + '\n' : engine.serializeStoredSave(save)); });
 storage.bytes.set('unrelated', 'leave exactly alone'); return { storage, saves };
}
const digest = data => createHash('sha256').update(data).digest('hex');
describe('rollback authority and retained metadata', () => {
 it('uses exact reviewed decoder bytes and unchanged assets/dependency versions', () => {
  const reviewed = JSON.parse(fs.readFileSync('tests/verification/rollback-authority.json')).reviewedRuntime;
  for (const f of reviewed.filter(f => f.path.startsWith('src/'))) expect(digest(fs.readFileSync(f.path))).toBe(f.sha256);
  const base = {files:JSON.parse(fs.readFileSync('tests/verification/rollback-authority.json')).originalAssets};
  for (const f of base.files.filter(f => /^(public\/|src\/matching\/batch\/art\/)/.test(f.path) || f.path === 'package-lock.json')) expect(digest(fs.readFileSync(f.path))).toBe(f.sha256);
  const pkg = JSON.parse(fs.readFileSync('package.json')), lock = JSON.parse(fs.readFileSync('package-lock.json'));
  expect(pkg.dependencies).toEqual(lock.packages[''].dependencies); expect(pkg.devDependencies).toEqual(lock.packages[''].devDependencies);
 });
 it('keeps exactly 80 playable pieces and 40 metadata-only recoverable pieces', () => {
  expect(PLAYABLE).toHaveLength(8); expect(PLAYABLE.flatMap(e => e.catalog.PIECES)).toHaveLength(80); expect(PRESERVED_ENVELOPES).toHaveLength(4);
  expect(RECOVERY_ENVELOPES).toHaveLength(12); expect(PRESERVED_ENVELOPES.flatMap(e => e.catalog.FAMILIES)).toHaveLength(8);
  for (const e of PRESERVED_ENVELOPES) { expect(getEnvelope(e.id)).toBeNull(); expect(e.catalog.PIECES.every(p => p.art === '')).toBe(true); expect(getRecoveryEngine(e.id).STORAGE_KEY).toBe(e.storageKey); }
 });
 it('routes every newer-envelope saved URL to explicit read-only recovery', () => {
  expect(recoveryRequested('')).toBe(false); expect(recoveryRequested('?save-recovery')).toBe(true);
  for (const e of PRESERVED_ENVELOPES) expect(recoveryRequested(`?envelope=${e.id}`)).toBe(true);
  expect(recoveryRequested('?envelope=__proto__')).toBe(false);
  const url = recoveryLocation('https://example.test/moticos?envelope=expansion-small-talk&other=keep', false);
  expect(url.pathname).toBe('/moticos'); expect(url.search).toBe('?other=keep');
  const same = recoveryLocation('https://example.test/moticos?envelope=lantern-studio', true);
  expect(same.searchParams.get('envelope')).toBe('lantern-studio'); expect(same.searchParams.get('save-recovery')).toBe('1');
 });
});
for (const version of [1, 2]) describe(`complete twelve-envelope v${version} rollback preservation`, () => {
 it('reads, names and exports all 120 discoveries and every original source byte without writes', () => {
  const { storage, saves } = storedCollection(version), before = [...storage.bytes], backup = captureRecovery(storage, new Map(), 'fixed-time');
  expect(backup.entries).toHaveLength(12); expect(storage.writes).toBe(0); expect([...storage.bytes]).toEqual(before);
  for (const entry of JSON.parse(JSON.stringify(backup)).entries) {
   const original = saves.get(entry.envelopeId), engine = getRecoveryEngine(entry.envelopeId);
   expect(entry.sourceRaw).toBe(storage.getItem(entry.storageKey)); expect(entry.status).toBe('loaded');
   expect(JSON.parse(entry.decodedV1)).toEqual(original); expect(engine.readSave(entry.decodedV1).save).toEqual(original);
   expect(entry.catalog.pieces).toHaveLength(10); expect(entry.catalog.families).toHaveLength(2);
   const summary = summarizeRecoveryEntry(entry); expect(summary.discovered).toBe(10); expect(summary.worlds).toBe(2); expect(summary.postcards).toBe(6);
   expect(summary.families.map(f => f.discovered)).toEqual([5, 5]); expect(summary.save.history).toHaveLength(100); expect(entry.temporaryV1).toBeNull();
  }
 });
 it.each(RECOVERY_ENVELOPES.map(e => [e.id]))('%s keeps all 100 Undos identical through stored and exported readers', id => {
  const envelope = RECOVERY_ENVELOPES.find(e => e.id === id), engine = getRecoveryEngine(id), old = legacyEngine({ catalog: envelope.catalog, storageKey: envelope.storageKey });
  let expected = completedHistory(engine, 37), loaded = engine.readSave(version === 1 ? old.serializeSave(expected) : engine.serializeStoredSave(expected)).save;
  expect(loaded).toEqual(expected);
  for (let i = 0; i < 100; i++) { expected = old.act(expected, { type: 'undo' }); loaded = engine.act(loaded, { type: 'undo' }); expect(loaded).toEqual(expected);
   loaded = engine.readSave(engine.serializeStoredSave(loaded)).save; expect(loaded).toEqual(expected); expect(old.readSave(engine.serializeSave(loaded)).save).toEqual(expected); }
  expect(engine.act(loaded, { type: 'undo' })).toBeNull(); expect(loaded.discoveries).toHaveLength(10);
 }, 30000);
 it('migrates only acted-on playable keys; all four newer raw sources stay exact', () => {
  const { storage } = storedCollection(version), cache = new Map(), old = new Map(storage.bytes);
  for (const e of PLAYABLE) { const engine = getRecoveryEngine(e.id), session = openEnvelopeSession(engine, cache, storage);
   expect(storage.getItem(e.storageKey)).toBe(old.get(e.storageKey)); commitEnvelopeSession(engine, session, engine.act(session.save, { type: 'sound', enabled: !session.save.sound }), storage);
   expect(engine.readSave(storage.getItem(e.storageKey)).save.history).toHaveLength(100); }
  for (const e of PRESERVED_ENVELOPES) expect(storage.getItem(e.storageKey)).toBe(old.get(e.storageKey));
  expect(storage.getItem('unrelated')).toBe('leave exactly alone'); expect(storage.writes).toBe(8);
 });
});
describe('recovery failures and fresh snapshots', () => {
 it('retains stale and quota-blocked temporary work separately from stored progress', () => {
  const { storage } = storedCollection(2), cache = new Map(), engine = getRecoveryEngine(PLAYABLE[0].id), stale = openEnvelopeSession(engine, cache, storage);
  const winning = engine.act(engine.act(stale.save, { type: 'undo' }), { type: 'undo' }), winningRaw = engine.serializeStoredSave(winning); storage.bytes.set(engine.STORAGE_KEY, winningRaw);
  const staleNext = engine.act(stale.save, { type: 'undo' }); commitEnvelopeSession(engine, stale, staleNext, storage); expect(stale.conflict).toBe(true); expect(storage.writes).toBe(0);
  let exported = captureRecovery(storage, cache).entries[0]; expect(exported.sourceRaw).toBe(winningRaw); expect(JSON.parse(exported.decodedV1)).toEqual(winning);
  expect(JSON.parse(exported.temporaryV1)).toEqual(staleNext); expect(exported.sessionConflict).toBe(true); expect(exported.originalAtSessionOpenRaw).not.toBe(exported.sourceRaw);
  const quotaEngine = getRecoveryEngine(PLAYABLE[1].id), quotaSession = openEnvelopeSession(quotaEngine, cache, storage), original = storage.getItem(quotaEngine.STORAGE_KEY); storage.failWrite(true);
  const next = quotaEngine.act(quotaSession.save, { type: 'undo' }); commitEnvelopeSession(quotaEngine, quotaSession, next, storage); storage.failWrite(false);
  exported = captureRecovery(storage, cache).entries[1]; expect(exported.sourceRaw).toBe(original); expect(JSON.parse(exported.temporaryV1)).toEqual(next); expect(JSON.parse(exported.decodedV1).history).toHaveLength(100);
 });
 it('exports invalid/future raw bytes honestly and labels unavailable storage', () => {
  const storage = memoryStorage(); storage.bytes.set(PRESERVED_ENVELOPES[0].storageKey, '{broken'); storage.bytes.set(PRESERVED_ENVELOPES[1].storageKey, '{"version":99}');
  let entries = captureRecovery(storage).entries.slice(8); expect(entries.map(e => e.status)).toEqual(['invalid', 'unsupported', 'empty', 'empty']);
  expect(entries[0].sourceRaw).toBe('{broken'); expect(entries[1].sourceRaw).toBe('{"version":99}'); expect(entries.every(e => e.decodedV1 === null)).toBe(true); expect(storage.writes).toBe(0);
  storage.failRead(true); entries = captureRecovery(storage).entries; expect(entries.every(e => e.status === 'unavailable' && !e.sourceCaptured && e.sourceRaw === null)).toBe(true);
  expect(captureRecovery(null).entries.every(e => e.status === 'unavailable')).toBe(true);
 });
 it('rechecks every key without returning an earlier cached snapshot', () => {
  const storage = memoryStorage(), e = PRESERVED_ENVELOPES[0], engine = getRecoveryEngine(e.id), original = completedHistory(engine, 7); storage.bytes.set(e.storageKey, engine.serializeStoredSave(original)); const first = captureRecovery(storage);
  storage.bytes.set(e.storageKey, engine.serializeStoredSave(engine.act(original, { type: 'undo' }))); const second = captureRecovery(storage);
  expect(JSON.parse(first.entries[8].decodedV1).history).toHaveLength(100); expect(JSON.parse(second.entries[8].decodedV1).history).toHaveLength(99); expect(storage.writes).toBe(0);
 });
 it('creates a local complete JSON download and releases its object URL', async () => {
  const { storage } = storedCollection(2), snapshot = captureRecovery(storage), before = [...storage.bytes]; let blob, revoke; const link = { click: vi.fn(), remove: vi.fn() };
  const browser = { document: { createElement: () => link, body: { appendChild: vi.fn() } }, URL: { createObjectURL: value => { blob = value; return 'blob:test'; }, revokeObjectURL: vi.fn() }, setTimeout: fn => { revoke = fn; } };
  recoveryDownload(snapshot, browser); expect(link.download).toBe('moticos-preserved-saves.json'); expect(link.click).toHaveBeenCalledOnce(); expect(link.remove).toHaveBeenCalledOnce();
  expect(JSON.parse(await blob.text())).toEqual(snapshot); revoke(); expect(browser.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test'); expect([...storage.bytes]).toEqual(before); expect(storage.writes).toBe(0);
 });
});
