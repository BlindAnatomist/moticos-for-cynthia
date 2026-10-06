import { describe, expect, it, vi } from 'vitest';
import { ENVELOPES, getMatchingEngine } from '../src/matching/registry.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from '../src/matching/session.js';
import { validateSeededOperations } from '../scripts/validateMatching.mjs';

// Independent engine/session audit. These checks do not claim browser, native
// touch, visual-layout, audio, or simultaneous cross-tab transaction coverage.
const envelopeIds = ['matching-garden', 'moonlit-passage', 'riverside-reverie'];
const engines = envelopeIds.map(getMatchingEngine);
const riverside = getMatchingEngine('riverside-reverie');
const foreignPairs = engines.flatMap(target => engines.filter(source => source !== target)
  .map(source => [target.PACK_ID, source.PACK_ID]));
const visitOrders = envelopeIds.flatMap(first => envelopeIds.filter(id => id !== first)
  .map(second => [first, second, envelopeIds.find(id => id !== first && id !== second)]));

function fixture() {
  const bytes = new Map();
  const storage = {
    getItem: vi.fn(key => bytes.get(key) ?? null),
    setItem: vi.fn((key, raw) => { bytes.set(key, raw); }),
  };
  return { bytes, storage, cache: new Map() };
}

function perform(engine, session, storage, action) {
  const next = engine.act(session.save, action);
  expect(next).not.toBeNull();
  expect(commitEnvelopeSession(engine, session, next, storage)).toBe(true);
  expect(engine.validSave(session.save)).toBe(true);
  for (const family of engine.FAMILIES) {
    const mass = session.save.round.board.filter(Boolean)
      .filter(tile => engine.CATALOG[tile.pieceId].familyId === family.id)
      .reduce((sum, tile) => sum + engine.CATALOG[tile.pieceId].mass, session.save.round.supply[family.id]);
    expect(mass).toBe(16);
  }
  return session;
}

describe('independent three-envelope boundaries', () => {
  it('binds three descriptors to three exact save keys and keeps all routes envelope-local', () => {
    expect(ENVELOPES.filter(envelope => envelopeIds.includes(envelope.id)).map(envelope => envelope.id)).toEqual(envelopeIds);
    expect(new Set(ENVELOPES.filter(envelope => envelopeIds.includes(envelope.id)).map(envelope => envelope.id)).size).toBe(3);
    expect(engines.map(engine => engine.STORAGE_KEY)).toEqual([
      'moticos.matching.garden.v1',
      'moticos.matching.moonlit-passage.v1',
      'moticos.matching.riverside-reverie.v1',
    ]);
    expect(riverside.FAMILIES.map(family => [family.id, family.pieceIds])).toEqual([
      ['map', ['r1', 'r2', 'r3', 'r4', 'r5']],
      ['teacup', ['t1', 't2', 't3', 't4', 't5']],
    ]);
    for (const envelope of ENVELOPES) {
      const engine = getMatchingEngine(envelope.id);
      expect(envelope.catalog.PACK_ID).toBe(envelope.id);
      expect(envelope.storageKey).toBe(engine.STORAGE_KEY);
      expect(engine.PIECES.every(piece => piece.packId === envelope.id)).toBe(true);
      expect(engine.PIECES.filter(piece => piece.tier >= 3)).toHaveLength(6);
    }
  });

  it.each(foreignPairs)('%s rejects every save, history, discovery, and supply from %s', (targetId, sourceId) => {
    const target = getMatchingEngine(targetId), source = getMatchingEngine(sourceId);
    const original = target.newSave(), originalRaw = target.serializeSave(original);
    const foreign = source.act(source.newSave(), { type: 'merge', from: 6, to: 7 });
    const foreignRaw = source.serializeSave(foreign);
    expect(target.readSave(foreignRaw)).toEqual({ status: 'invalid', save: null, sourceRaw: foreignRaw });
    for (const family of source.FAMILIES) {
      expect(target.act(original, { type: 'supply', familyId: family.id })).toBeNull();
    }
    const malformed = [
      save => { save.round.board[6].pieceId = source.STARTERS[0]; },
      save => { save.round.supply = structuredClone(foreign.round.supply); },
      save => { save.discoveries.push(source.STARTERS[0]); },
      save => { save.history = structuredClone(foreign.history); },
    ];
    for (const mutate of malformed) {
      const save = structuredClone(original); mutate(save);
      const sourceRaw = JSON.stringify(save);
      expect(target.validSave(save)).toBe(false);
      expect(target.readSave(sourceRaw)).toEqual({ status: 'invalid', save: null, sourceRaw });
      expect(target.act(save, { type: 'reset' })).toBeNull();
      expect(() => target.serializeSave(save)).toThrow();
    }
    expect(target.serializeSave(original)).toBe(originalRaw);

    const f = fixture(); f.bytes.set(target.STORAGE_KEY, foreignRaw);
    const session = openEnvelopeSession(target, f.cache, f.storage);
    expect(session.blocked).toBe(true); expect(session.invalid).toBe(true);
    perform(target, session, f.storage, { type: 'merge', from: 6, to: 7 });
    perform(target, session, f.storage, { type: 'reset' });
    expect(openEnvelopeSession(target, f.cache, f.storage)).toBe(session);
    expect(session.sourceRaw).toBe(foreignRaw);
    expect(f.bytes.get(target.STORAGE_KEY)).toBe(foreignRaw);
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it.each(visitOrders)('retains three independent boards through visits %s → %s → %s', (...order) => {
    const f = fixture();
    const sessions = new Map(), expected = new Map(), stored = new Map();
    for (const id of order) {
      const engine = getMatchingEngine(id), session = openEnvelopeSession(engine, f.cache, f.storage);
      perform(engine, session, f.storage, { type: 'merge', from: 6, to: 7 });
      if (id !== envelopeIds[0]) perform(engine, session, f.storage, { type: 'move', from: 7, to: 0 });
      if (id === envelopeIds[2]) {
        perform(engine, session, f.storage, { type: 'supply', familyId: 'teacup' });
        perform(engine, session, f.storage, { type: 'sound', enabled: false });
      }
      sessions.set(id, session); expected.set(id, structuredClone(session.save));
      stored.set(id, f.bytes.get(engine.STORAGE_KEY));
    }
    expect(f.cache.size).toBe(3); expect(f.bytes.size).toBe(3);
    const writes = f.storage.setItem.mock.calls.length;
    for (const id of [...order].reverse().concat(order, [...order].reverse())) {
      const engine = getMatchingEngine(id);
      expect(openEnvelopeSession(engine, f.cache, f.storage).save).toEqual(expected.get(id));
      expect(f.bytes.get(engine.STORAGE_KEY)).toBe(stored.get(id));
    }
    expect(f.storage.setItem).toHaveBeenCalledTimes(writes);
    const resetEngine = getMatchingEngine(order[0]);
    perform(resetEngine, sessions.get(order[0]), f.storage, { type: 'reset' });
    expect(sessions.get(order[0]).save.history).toHaveLength(0);
    expect(sessions.get(order[0]).save.discoveries).toEqual(expected.get(order[0]).discoveries);
    expect(sessions.get(order[0]).save.sound).toBe(expected.get(order[0]).sound);
    const undoEngine = getMatchingEngine(order[1]);
    perform(undoEngine, sessions.get(order[1]), f.storage, { type: 'undo' });
    expect(sessions.get(order[1]).save.round).toEqual(expected.get(order[1]).history.at(-1));
    const untouchedEngine = getMatchingEngine(order[2]);
    expect(sessions.get(order[2]).save).toEqual(expected.get(order[2]));
    expect(f.bytes.get(untouchedEngine.STORAGE_KEY)).toBe(stored.get(order[2]));
    for (const engine of engines) {
      const freshCache = new Map();
      expect(openEnvelopeSession(engine, freshCache, f.storage).save).toEqual(sessions.get(engine.PACK_ID).save);
    }
  });
});

describe('third-envelope persistence pressure and recovery', () => {
  it('contains a third-envelope quota failure without retrying it or evicting the other two boards', () => {
    const f = fixture();
    const sessions = engines.map(engine => perform(engine, openEnvelopeSession(engine, f.cache, f.storage), f.storage,
      { type: 'merge', from: 6, to: 7 }));
    const oldBytes = new Map(f.bytes);
    f.storage.setItem.mockImplementation((key, raw) => {
      if (key === riverside.STORAGE_KEY) throw new Error('Quota exceeded');
      f.bytes.set(key, raw);
    });
    perform(riverside, sessions[2], f.storage, { type: 'move', from: 7, to: 0 });
    expect(sessions[2].unavailable).toBe(true); expect(sessions[2].blocked).toBe(true);
    const temporary = structuredClone(sessions[2].save);
    for (const engine of engines) openEnvelopeSession(engine, f.cache, f.storage);
    expect(sessions[2].save).toEqual(temporary);
    expect(f.bytes).toEqual(oldBytes);
    const thirdWrites = () => f.storage.setItem.mock.calls.filter(([key]) => key === riverside.STORAGE_KEY).length;
    const attempted = thirdWrites();
    perform(riverside, sessions[2], f.storage, { type: 'undo' });
    expect(thirdWrites()).toBe(attempted);
    expect(f.bytes.get(riverside.STORAGE_KEY)).toBe(oldBytes.get(riverside.STORAGE_KEY));
    for (let i = 0; i < 2; i++) {
      perform(engines[i], sessions[i], f.storage, { type: 'supply', familyId: engines[i].FAMILIES[1].id });
      expect(f.bytes.get(engines[i].STORAGE_KEY)).not.toBe(oldBytes.get(engines[i].STORAGE_KEY));
    }
  });

  it.each(envelopeIds)('blocks a sequential stale write only in %s after the other two envelopes were visited', id => {
    const f = fixture();
    const sessions = new Map(engines.map(engine => [engine.PACK_ID,
      perform(engine, openEnvelopeSession(engine, f.cache, f.storage), f.storage, { type: 'merge', from: 6, to: 7 })]));
    const engine = getMatchingEngine(id), session = sessions.get(id);
    const original = structuredClone(session.save), otherKeys = engines.filter(item => item !== engine).map(item => item.STORAGE_KEY);
    const untouched = otherKeys.map(key => f.bytes.get(key));
    for (const other of engines.filter(item => item !== engine)) openEnvelopeSession(other, f.cache, f.storage);
    const newer = engine.serializeSave(engine.act(engine.newSave(), { type: 'supply', familyId: engine.FAMILIES[1].id }));
    f.bytes.set(engine.STORAGE_KEY, newer);
    expect(openEnvelopeSession(engine, f.cache, f.storage)).toBe(session);
    expect(session.conflict).toBe(true); expect(session.save).toEqual(original);
    perform(engine, session, f.storage, { type: 'supply', familyId: engine.FAMILIES[0].id });
    expect(f.bytes.get(engine.STORAGE_KEY)).toBe(newer);
    expect(otherKeys.map(key => f.bytes.get(key))).toEqual(untouched);
    for (const other of engines.filter(item => item !== engine)) {
      expect(sessions.get(other.PACK_ID).blocked).toBe(false);
      expect(observeEnvelopeStorage(other, sessions.get(other.PACK_ID), { key: engine.STORAGE_KEY, newValue: newer })).toBe(false);
    }
  });

  it('gives each of three visited boards its own 100-action Undo limit and preserves exact reloads', () => {
    const f = fixture();
    const sessions = engines.map(engine => openEnvelopeSession(engine, f.cache, f.storage));
    for (let step = 0; step < 110; step++) for (const [i, engine] of engines.entries()) {
      perform(engine, sessions[i], f.storage, { type: 'move', from: step % 2 ? 0 : 6, to: step % 2 ? 6 : 0 });
    }
    expect(sessions.reduce((sum, session) => sum + session.save.history.length, 0)).toBe(300);
    for (const [i, engine] of engines.entries()) {
      expect(sessions[i].save.history).toHaveLength(100);
      const raw = f.bytes.get(engine.STORAGE_KEY);
      expect(new TextEncoder().encode(raw).length).toBeLessThan(engine.MAX_SAVE_BYTES);
      expect(engine.serializeStoredSave(engine.readSave(raw).save)).toBe(raw);
      expect(openEnvelopeSession(engine, new Map(), f.storage).save).toEqual(sessions[i].save);
    }
    const olderBytes = engines.slice(0, 2).map(engine => f.bytes.get(engine.STORAGE_KEY));
    for (let i = 0; i < 100; i++) perform(riverside, sessions[2], f.storage, { type: 'undo' });
    expect(sessions[2].save.round.moves).toBe(10);
    expect(riverside.act(sessions[2].save, { type: 'undo' })).toBeNull();
    expect(engines.slice(0, 2).map(engine => f.bytes.get(engine.STORAGE_KEY))).toEqual(olderBytes);
  });

  it('at the third-envelope move limit refuses board changes while Undo, sound, and reset stay available', () => {
    const nearLimit = riverside.newSave(); nearLimit.round.moves = riverside.MAX_MOVES - 1;
    expect(riverside.validSave(nearLimit)).toBe(true);
    const capped = riverside.act(nearLimit, { type: 'merge', from: 6, to: 7 });
    const raw = riverside.serializeSave(capped);
    expect(capped.round.moves).toBe(riverside.MAX_MOVES);
    for (const action of [
      { type: 'move', from: 7, to: 0 }, { type: 'merge', from: 12, to: 16 },
      { type: 'cut', index: 7 }, { type: 'supply', familyId: 'map' }, { type: 'supply', familyId: 'teacup' },
    ]) expect(riverside.act(capped, action)).toBeNull();
    expect(riverside.serializeSave(capped)).toBe(raw);
    const undone = riverside.act(capped, { type: 'undo' });
    expect(undone.round).toEqual(nearLimit.round); expect(undone.discoveries).toContain('r2');
    expect(riverside.act(capped, { type: 'sound', enabled: false }).sound).toBe(false);
    expect(riverside.act(capped, { type: 'reset' })).toMatchObject({ round: riverside.createRound(), history: [], discoveries: capped.discoveries });
  });

  it.each([0x72697665, 0x74656163, 0x20261004])('retains third-envelope units and exact saves during additional mixed-action seed %i', seed => {
    const result = validateSeededOperations(2_048, seed, riverside);
    expect(result.operations).toBe(2_048); expect(result.reloads).toBe(56);
    for (const type of ['merge', 'move', 'cut', 'supply', 'undo', 'reset']) expect(result.successful[type]).toBeGreaterThan(0);
  }, 60_000);
});
