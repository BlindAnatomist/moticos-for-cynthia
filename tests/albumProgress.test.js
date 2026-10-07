import { describe, expect, it, vi } from 'vitest';
import { ENVELOPES, getEnvelope, getMatchingEngine } from '../src/matching/registry.js';
import { readAlbumProgress, readEnvelopeProgress, summarizeEnvelope } from '../src/matching/progress.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from '../src/matching/session.js';

// Read-model tests use real engines and sessions. No DOM or browser coverage is
// implied. In particular, reading the album must never initialize another board.
function fixture() {
  const bytes = new Map();
  return { bytes, cache: new Map(), storage: {
    getItem: vi.fn(key => bytes.get(key) ?? null),
    setItem: vi.fn((key, raw) => bytes.set(key, raw)),
    removeItem: vi.fn(key => bytes.delete(key)),
    clear: vi.fn(() => bytes.clear()),
  } };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function finish(engine, initial, family) {
  let save = initial;
  for (let steps = 0; !save.round.board.some(tile => tile?.pieceId === family.finalId); steps++) {
    expect(steps).toBeLessThan(43);
    const pair = engine.mergePairs(save.round.board).find(([from]) => engine.CATALOG[save.round.board[from].pieceId].familyId === family.id);
    save = engine.act(save, pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: family.id });
    expect(save).not.toBeNull();
  }
  return save;
}
const summarize = (envelope, save) => summarizeEnvelope(envelope, { save, opened: true, temporary: false, unread: false, conflict: false, unavailable: false });
function expectNoWrites(f) {
  expect(f.storage.setItem).not.toHaveBeenCalled();
  expect(f.storage.removeItem).not.toHaveBeenCalled();
  expect(f.storage.clear).not.toHaveBeenCalled();
}

describe('read-only whole-album progress', () => {
  it('counts no starter pictures or worlds in unvisited envelopes and creates no sessions or saves', () => {
    const f = fixture(), cacheSet = vi.spyOn(f.cache, 'set');
    const album = readAlbumProgress(f.cache, f.storage);
    expect(album).toMatchObject({ discovered: 0, totalPieces: 40, postcards: 0, totalPostcards: 24, worlds: 0, totalWorlds: 8, temporary: false, unread: false });
    expect(album.entries.map(entry => entry.envelope.id)).toEqual(ENVELOPES.map(envelope => envelope.id));
    for (const entry of album.entries) {
      expect(entry).toMatchObject({ save: null, opened: false, discovered: 0, postcards: 0, worlds: 0, boardWorlds: 0, complete: false });
      expect(entry.families.map(family => family.discovered)).toEqual([0, 0]);
      expect(entry.nextFamily.next.id).toBe(entry.envelope.catalog.STARTERS[0]);
      expect(entry.nextFamily.previous).toBeNull();
    }
    expect(f.cache.size).toBe(0); expect(f.bytes.size).toBe(0); expect(cacheSet).not.toHaveBeenCalled();
    expectNoWrites(f);
  });

  it('credits only the explicitly active new board, without adding its session or any storage', () => {
    const f = fixture(), engine = getMatchingEngine('lantern-studio'), active = freeze(engine.newSave());
    const album = readAlbumProgress(f.cache, f.storage, { id: engine.PACK_ID, save: active });
    expect(album).toMatchObject({ discovered: 2, postcards: 0, worlds: 0 });
    const opened = album.entries.filter(entry => entry.opened);
    expect(opened).toHaveLength(1); expect(opened[0].save).toBe(active);
    expect(opened[0].nextFamily.next.id).toBe('l2'); expect(opened[0].nextFamily.previous.id).toBe('l1');
    expect(f.cache.size).toBe(0); expect(f.bytes.size).toBe(0); expectNoWrites(f);
  });

  it('reads exact existing storage without normalization, migration, cache initialization or writes', () => {
    const f = fixture();
    for (const envelope of ENVELOPES) {
      const engine = getMatchingEngine(envelope.id);
      const save = engine.act(engine.newSave(), { type: 'merge', from: 6, to: 7 });
      f.bytes.set(envelope.storageKey, `\n ${JSON.stringify(save, null, 1)} \n`);
    }
    f.bytes.set('moticos.collection.garden.v1', 'unrelated collection bytes');
    f.bytes.set('moticos.classic.v1', 'unrelated classic bytes');
    const before = new Map(f.bytes), album = readAlbumProgress(f.cache, f.storage);
    expect(album).toMatchObject({ discovered: 12, postcards: 0, worlds: 0, temporary: false, unread: false });
    expect(album.entries.every(entry => entry.opened)).toBe(true);
    expect(f.storage.getItem.mock.calls.map(([key]) => key)).toEqual(ENVELOPES.map(envelope => envelope.storageKey));
    expect(f.bytes).toEqual(before); expect(f.cache.size).toBe(0); expectNoWrites(f);
  });

  it('uses the active in-memory snapshot once without mutating or replacing a cached snapshot', () => {
    const f = fixture(), engine = getMatchingEngine('lantern-studio');
    const session = openEnvelopeSession(engine, f.cache, f.storage);
    freeze(session); const cachedBefore = structuredClone(session);
    const active = freeze(engine.act(session.save, { type: 'merge', from: 6, to: 7 }));
    const album = readAlbumProgress(f.cache, f.storage, { id: engine.PACK_ID, save: active });
    expect(album.discovered).toBe(3);
    expect(album.entries.find(entry => entry.envelope.id === engine.PACK_ID).save).toBe(active);
    expect(f.cache.get(engine.STORAGE_KEY)).toBe(session); expect(session).toEqual(cachedBefore);
    expect(f.cache.size).toBe(1); expectNoWrites(f);
  });

  it('keeps complete, partial and unopened envelopes distinct and totals catalogued discoveries once', () => {
    const f = fixture();
    for (const [index, envelope] of ENVELOPES.entries()) {
      if (index === 3) continue;
      const engine = getMatchingEngine(envelope.id); let save = engine.newSave();
      if (index < 2) save = finish(engine, save, engine.FAMILIES[0]);
      if (index === 0) save = finish(engine, save, engine.FAMILIES[1]);
      f.bytes.set(envelope.storageKey, engine.serializeSave(save));
    }
    const album = readAlbumProgress(f.cache, f.storage);
    expect(album.entries.map(entry => entry.discovered)).toEqual([10, 6, 2, 0]);
    expect(album.entries.map(entry => entry.worlds)).toEqual([2, 1, 0, 0]);
    expect(album.entries.map(entry => entry.postcards)).toEqual([6, 3, 0, 0]);
    expect(album.entries.map(entry => entry.complete)).toEqual([true, false, false, false]);
    expect(album.entries.map(entry => entry.opened)).toEqual([true, true, true, false]);
    expect(album).toMatchObject({ discovered: 18, postcards: 9, worlds: 3 }); expectNoWrites(f);
  });
});

describe('permanent discoveries and next-discovery guidance', () => {
  it.each(ENVELOPES.map(envelope => [envelope.id]))('%s retains every earned world after finale Undo, Cut and reset', id => {
    const envelope = getEnvelope(id), engine = getMatchingEngine(id);
    for (const order of [engine.FAMILIES, [...engine.FAMILIES].reverse()]) {
      let save = engine.newSave();
      for (const [index, family] of order.entries()) {
        save = finish(engine, save, family);
        expect(summarize(envelope, save)).toMatchObject({ worlds: index + 1, boardWorlds: index + 1, postcards: (index + 1) * 3 });
        const undone = engine.act(save, { type: 'undo' });
        expect(summarize(envelope, undone)).toMatchObject({ worlds: index + 1, boardWorlds: index, postcards: (index + 1) * 3 });
        const cut = engine.act(save, { type: 'cut', index: save.round.board.findIndex(tile => tile?.pieceId === family.finalId) });
        expect(summarize(envelope, cut)).toMatchObject({ worlds: index + 1, boardWorlds: index, postcards: (index + 1) * 3 });
        expect(summarize(envelope, engine.act(cut, { type: 'undo' })).worlds).toBe(index + 1);
      }
      const reset = engine.act(save, { type: 'reset' }), summary = summarize(envelope, reset);
      expect(summary).toMatchObject({ discovered: 10, worlds: 2, boardWorlds: 0, postcards: 6, complete: true, nextFamily: null });
      expect(summary.families.every(family => family.complete && family.next === null && family.previous === null)).toBe(true);
      const f = fixture(); f.bytes.set(engine.STORAGE_KEY, engine.serializeSave(reset));
      expect(readAlbumProgress(f.cache, f.storage)).toMatchObject({ discovered: 10, worlds: 2, postcards: 6 });
      expectNoWrites(f);
    }
  });

  it('selects the closest unfinished family, breaks ties by authored order, and never suggests a completed family', () => {
    const envelope = getEnvelope('lantern-studio'), engine = getMatchingEngine(envelope.id);
    let save = engine.newSave();
    expect(summarize(envelope, save).nextFamily.id).toBe('lantern');
    save = engine.act(save, { type: 'merge', from: 8, to: 11 });
    expect(summarize(envelope, save).nextFamily).toMatchObject({ id: 'spool', next: { id: 's3' }, previous: { id: 's2' } });
    save = engine.act(save, { type: 'merge', from: 6, to: 7 });
    expect(summarize(envelope, save).nextFamily).toMatchObject({ id: 'lantern', next: { id: 'l3' } });
    save = finish(engine, save, engine.FAMILIES[0]);
    expect(summarize(envelope, save).nextFamily.id).toBe('spool');
    save = finish(engine, save, engine.FAMILIES[1]);
    expect(summarize(envelope, save).nextFamily).toBeNull();
  });
});

describe('truthful album fault states without destructive recovery', () => {
  it.each(ENVELOPES.map(envelope => [envelope.id]))('%s refuses imported final discoveries with missing earlier route steps', id => {
    const f = fixture(), engine = getMatchingEngine(id);
    for (const family of engine.FAMILIES) {
      const complete = engine.act(finish(engine, engine.newSave(), family), { type: 'reset' });
      for (const missing of family.pieceIds.slice(1, -1)) {
        const gapped = structuredClone(complete);
        gapped.discoveries = gapped.discoveries.filter(pieceId => pieceId !== missing);
        expect(gapped.discoveries).toContain(family.finalId);
        expect(engine.validSave(gapped)).toBe(false);
        const raw = JSON.stringify(gapped); f.bytes.set(engine.STORAGE_KEY, raw);
        const album = readAlbumProgress(f.cache, f.storage), entry = album.entries.find(item => item.envelope.id === id);
        expect(entry).toMatchObject({ save: null, opened: false, unread: true, temporary: true, discovered: 0, worlds: 0, complete: false });
        expect(album.worlds).toBe(0); expect(f.bytes.get(engine.STORAGE_KEY)).toBe(raw);
      }
    }
    expect(f.cache.size).toBe(0); expectNoWrites(f);
  });

  it.each(['', '{ broken', '{"version":99,"keep":"exactly"}', '{"version":1}'])('does not credit or replace an unopened unread save: %s', raw => {
    const f = fixture(), envelope = getEnvelope('lantern-studio');
    f.bytes.set(envelope.storageKey, raw);
    const album = readAlbumProgress(f.cache, f.storage), entry = album.entries.at(-1);
    expect(entry).toMatchObject({ save: null, opened: false, temporary: true, unread: true, conflict: false, unavailable: false, discovered: 0, worlds: 0 });
    expect(album).toMatchObject({ temporary: true, unread: true, discovered: 0 });
    expect(f.bytes.get(envelope.storageKey)).toBe(raw); expect(f.cache.size).toBe(0); expectNoWrites(f);
  });

  it('marks inaccessible unopened saves unread and temporary, instead of treating them as new envelopes', () => {
    const f = fixture(); f.storage.getItem.mockImplementation(() => { throw new DOMException('Read denied', 'SecurityError'); });
    const album = readAlbumProgress(f.cache, f.storage);
    expect(album).toMatchObject({ discovered: 0, worlds: 0, postcards: 0, temporary: true, unread: true });
    for (const entry of album.entries) expect(entry).toMatchObject({ opened: false, save: null, unread: true, temporary: true, unavailable: true });
    expect(f.cache.size).toBe(0); expectNoWrites(f);
  });

  it('tolerates a missing storage interface without creating any sessions or inventing progress', () => {
    const cache = new Map(), album = readAlbumProgress(cache, undefined);
    expect(album).toMatchObject({ discovered: 0, temporary: true, unread: true });
    expect(album.entries.every(entry => entry.unavailable && !entry.opened)).toBe(true);
    expect(cache.size).toBe(0);
  });

  it.each(['broken {', '{"version":999}'])('retains protected practice snapshots and histories when the source is unread: %s', raw => {
    const f = fixture(), envelope = getEnvelope('lantern-studio'), engine = getMatchingEngine(envelope.id);
    f.bytes.set(engine.STORAGE_KEY, raw);
    const session = openEnvelopeSession(engine, f.cache, f.storage);
    const completed = finish(engine, session.save, engine.FAMILIES[0]);
    expect(commitEnvelopeSession(engine, session, completed, f.storage)).toBe(true);
    freeze(session); const before = structuredClone(session);
    for (let visit = 0; visit < 4; visit++) {
      const album = readAlbumProgress(f.cache, f.storage), entry = album.entries.at(-1);
      expect(entry).toMatchObject({ opened: true, temporary: true, unread: true, discovered: 6, postcards: 3, worlds: 1 });
      expect(entry.save).toBe(session.save); expect(album.worlds).toBe(1);
    }
    expect(session).toEqual(before); expect(session.save.history.length).toBeGreaterThan(0);
    expect(session.sourceRaw).toBe(raw); expect(f.bytes.get(engine.STORAGE_KEY)).toBe(raw);
    expect(f.cache.size).toBe(1); expectNoWrites(f);
  });

  it.each(['external-save', 'clear', 'corrupt', 'future'])('detects %s replacing a cached save without mutating its session or accepting external discoveries', change => {
    const f = fixture(), envelope = getEnvelope('lantern-studio'), engine = getMatchingEngine(envelope.id);
    const session = openEnvelopeSession(engine, f.cache, f.storage);
    commitEnvelopeSession(engine, session, engine.act(session.save, { type: 'merge', from: 6, to: 7 }), f.storage);
    const savedBytes = session.raw;
    let external = change === 'clear' ? null : change === 'corrupt' ? '{ broken' : change === 'future' ? '{"version":44}' : engine.serializeSave(finish(engine, engine.newSave(), engine.FAMILIES[1]));
    if (external === null) f.bytes.delete(engine.STORAGE_KEY); else f.bytes.set(engine.STORAGE_KEY, external);
    freeze(session); const before = structuredClone(session), writes = f.storage.setItem.mock.calls.length;
    const entry = readEnvelopeProgress(envelope, f.cache, f.storage);
    expect(entry).toMatchObject({ opened: true, temporary: true, conflict: true, unavailable: false });
    expect(entry.save).toBe(session.save); expect(summarizeEnvelope(envelope, entry)).toMatchObject({ discovered: 3, worlds: 0 });
    expect(session).toEqual(before); expect(session.raw).toBe(savedBytes); expect(session.conflict).toBe(false);
    expect(f.bytes.get(engine.STORAGE_KEY) ?? null).toBe(external); expect(f.storage.setItem).toHaveBeenCalledTimes(writes);
    expect(f.storage.removeItem).not.toHaveBeenCalled(); expect(f.storage.clear).not.toHaveBeenCalled();
  });

  it('preserves a previously reported conflict even if external bytes later return to the cached value', () => {
    const f = fixture(), envelope = getEnvelope('lantern-studio'), engine = getMatchingEngine(envelope.id);
    const session = openEnvelopeSession(engine, f.cache, f.storage);
    observeEnvelopeStorage(engine, session, { key: engine.STORAGE_KEY, newValue: 'external write' });
    freeze(session); const before = structuredClone(session);
    expect(readEnvelopeProgress(envelope, f.cache, f.storage)).toMatchObject({ temporary: true, conflict: true });
    expect(session).toEqual(before); expectNoWrites(f);
  });

  it('marks a current cached storage-read denial temporary while preserving all practice discoveries', () => {
    const f = fixture(), envelope = getEnvelope('lantern-studio'), engine = getMatchingEngine(envelope.id);
    const session = openEnvelopeSession(engine, f.cache, f.storage);
    commitEnvelopeSession(engine, session, finish(engine, session.save, engine.FAMILIES[0]), f.storage);
    const before = structuredClone(session), raw = f.bytes.get(engine.STORAGE_KEY), writes = f.storage.setItem.mock.calls.length;
    freeze(session); f.storage.getItem.mockImplementation(() => { throw Error('Read blocked'); });
    const entry = readEnvelopeProgress(envelope, f.cache, f.storage);
    expect(entry).toMatchObject({ save: session.save, opened: true, temporary: true, unavailable: true });
    expect(summarizeEnvelope(envelope, entry).worlds).toBe(1);
    expect(session).toEqual(before); expect(f.bytes.get(engine.STORAGE_KEY)).toBe(raw); expect(f.storage.setItem).toHaveBeenCalledTimes(writes);
  });

  it('reports quota-blocked cached practice as temporary even when storage remains readable', () => {
    const f = fixture(), envelope = getEnvelope('lantern-studio'), engine = getMatchingEngine(envelope.id);
    const session = openEnvelopeSession(engine, f.cache, f.storage);
    commitEnvelopeSession(engine, session, engine.act(session.save, { type: 'merge', from: 6, to: 7 }), f.storage);
    const raw = f.bytes.get(engine.STORAGE_KEY);
    f.storage.setItem.mockImplementation(() => { throw Error('Quota exceeded'); });
    commitEnvelopeSession(engine, session, finish(engine, session.save, engine.FAMILIES[0]), f.storage);
    freeze(session); const before = structuredClone(session), writes = f.storage.setItem.mock.calls.length;
    const entry = readEnvelopeProgress(envelope, f.cache, f.storage);
    expect(entry).toMatchObject({ opened: true, temporary: true, save: session.save });
    expect(summarizeEnvelope(envelope, entry).worlds).toBe(1);
    expect(session).toEqual(before); expect(f.bytes.get(engine.STORAGE_KEY)).toBe(raw); expect(f.storage.setItem).toHaveBeenCalledTimes(writes);
  });
});
