import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENVELOPES, getMatchingEngine } from '../src/matching/registry.js';
import { createMatchingCatalog } from '../src/matching/catalogFactory.js';
import { createMatchingEngine } from '../src/matching/engine.js';
import { openEnvelopeSession, commitEnvelopeSession } from '../src/matching/session.js';
import { readAlbumProgress, summarizeEnvelope } from '../src/matching/progress.js';
import { validateConservativeInventories, validateSeededOperations } from '../scripts/validateMatching.mjs';

const ids = ['matching-garden', 'moonlit-passage', 'riverside-reverie', 'lantern-studio'];
const engines = ids.map(getMatchingEngine), lantern = engines.at(-1);
const foreignPairs = engines.flatMap(target => engines.filter(source => source !== target).map(source => [target.PACK_ID, source.PACK_ID]));
const permutations = values => values.length ? values.flatMap(value => permutations(values.filter(item => item !== value)).map(rest => [value, ...rest])) : [[]];
const occupied = save => save.round.board.filter(Boolean);
function material(engine, save) {
  expect(engine.validSave(save)).toBe(true);
  for (const family of engine.FAMILIES) {
    const onBoard = occupied(save).filter(tile => engine.CATALOG[tile.pieceId].familyId === family.id)
      .reduce((sum, tile) => sum + engine.CATALOG[tile.pieceId].mass, 0);
    expect(save.round.supply[family.id] + onBoard).toBe(16);
  }
}
function finish(engine, initial, family) {
  let save = initial;
  for (let steps = 0; !save.round.board.some(tile => tile?.pieceId === family.finalId); steps++) {
    expect(steps).toBeLessThan(43);
    const pair = engine.mergePairs(save.round.board).find(([from]) => engine.CATALOG[save.round.board[from].pieceId].familyId === family.id);
    save = engine.act(save, pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: family.id });
    expect(save).not.toBeNull(); material(engine, save);
  }
  return save;
}
function fixture() {
  const bytes = new Map();
  return { bytes, cache: new Map(), storage: {
    getItem: vi.fn(key => bytes.get(key) ?? null),
    setItem: vi.fn((key, raw) => bytes.set(key, raw)),
  } };
}
function perform(engine, session, storage, action) {
  const next = engine.act(session.save, action); expect(next).not.toBeNull();
  expect(commitEnvelopeSession(engine, session, next, storage)).toBe(true); material(engine, session.save);
}

describe('independent fourth-envelope catalog and engine audit', () => {
  it('registers forty unique authored IDs, routes, assets and four stable independent keys', () => {
    expect(ENVELOPES.map(envelope => envelope.id)).toEqual(ids);
    expect(engines.map(engine => engine.STORAGE_KEY)).toEqual([
      'moticos.matching.garden.v1', 'moticos.matching.moonlit-passage.v1',
      'moticos.matching.riverside-reverie.v1', 'moticos.matching.lantern-studio.v1',
    ]);
    const pieces = engines.flatMap(engine => engine.PIECES);
    expect(pieces).toHaveLength(40); expect(new Set(pieces.map(piece => piece.id)).size).toBe(40);
    expect(new Set(pieces.map(piece => piece.art)).size).toBe(40);
    expect(lantern.FAMILIES.map(family => [family.id, family.pieceIds])).toEqual([
      ['lantern', ['l1', 'l2', 'l3', 'l4', 'l5']], ['spool', ['s1', 's2', 's3', 's4', 's5']],
    ]);
    for (const envelope of ENVELOPES) {
      const engine = getMatchingEngine(envelope.id);
      expect(envelope.storageKey).toBe(engine.STORAGE_KEY); expect(envelope.catalog.CATALOG).toBe(engine.CATALOG);
      expect(engine.PIECES.every(piece => piece.packId === envelope.id)).toBe(true);
      for (const family of engine.FAMILIES) for (const [index, id] of family.pieceIds.entries()) {
        expect(engine.CATALOG[id]).toMatchObject({ familyId: family.id, tier: index + 1, mass: 2 ** index });
        expect(engine.nextPiece(id)?.id ?? null).toBe(family.pieceIds[index + 1] ?? null);
        expect(engine.previousPiece(id)?.id ?? null).toBe(family.pieceIds[index - 1] ?? null);
      }
    }
  });

  it('checks every one of 1,600 global pairings against each of four active scopes', () => {
    const pieces = engines.flatMap(engine => engine.PIECES); let pairs = 0;
    for (const a of pieces) for (const b of pieces) {
      pairs++;
      for (const engine of engines) {
        const allowed = a.packId === engine.PACK_ID && b.packId === engine.PACK_ID && a.id === b.id && a.tier < 5;
        expect(engine.compatible(a.id, b.id)).toBe(allowed);
        expect(engine.compatible({ pieceId: a.id }, { pieceId: b.id })).toBe(allowed);
      }
    }
    expect(pairs).toBe(1_600);
  });

  it.each([['lantern', 'spool'], ['spool', 'lantern']])('finishes %s then %s with exactly thirty merges and twelve finite pair draws', (first, second) => {
    let save = lantern.newSave(); material(lantern, save);
    for (const id of [first, second]) save = finish(lantern, save, lantern.FAMILIES.find(family => family.id === id));
    expect(save.round).toMatchObject({ moves: 42, merges: 30, supply: { lantern: 0, spool: 0 } });
    expect(occupied(save).map(tile => tile.pieceId).sort()).toEqual(['l5', 's5']);
    expect(save.discoveries).toHaveLength(10); expect(lantern.mergePairs(save.round.board)).toEqual([]);
    expect(lantern.readSave(lantern.serializeSave(save)).save).toEqual(save);
  });

  it.each(['lantern', 'spool'])('cuts and exactly undoes all four crafted %s tiers, while retaining the earned finale', id => {
    const family = lantern.FAMILIES.find(item => item.id === id); let save = finish(lantern, lantern.newSave(), family);
    for (let tier = 4; tier > 0; tier--) {
      const before = save, index = save.round.board.findIndex(tile => tile?.pieceId === family.pieceIds[tier]);
      save = lantern.act(save, { type: 'cut', index }); material(lantern, save);
      expect(save.round.board[index].pieceId).toBe(family.pieceIds[tier - 1]);
      expect(occupied(save).filter(tile => tile.pieceId === family.pieceIds[tier - 1]).length).toBeGreaterThanOrEqual(2);
      expect(lantern.act(save, { type: 'undo' })).toEqual(before);
      expect(save.discoveries).toContain(family.finalId);
      expect(lantern.readSave(lantern.serializeSave(save)).save).toEqual(save);
    }
    const raw = lantern.serializeSave(save);
    expect(lantern.act(save, { type: 'cut', index: save.round.board.findIndex(tile => tile?.pieceId === family.starterId) })).toBeNull();
    expect(lantern.serializeSave(save)).toBe(raw);
  });

  it('keeps the earlier Garden v1 fixture byte-identical and does not add envelope identity to its schema', () => {
    const raw = readFileSync(new URL('./fixtures/matching-garden-v1.json', import.meta.url), 'utf8').trimEnd();
    const garden = engines[0], loaded = garden.readSave(raw);
    expect(loaded.status).toBe('loaded'); expect(garden.serializeSave(loaded.save)).toBe(raw);
    expect(Object.keys(loaded.save)).toEqual(['version', 'round', 'history', 'discoveries', 'sound']);
    expect(lantern.readSave(raw)).toEqual({ status: 'invalid', save: null, sourceRaw: raw });
  });

  it.each(foreignPairs)('%s rejects all foreign save fields from %s without altering either original', (targetId, sourceId) => {
    const target = getMatchingEngine(targetId), source = getMatchingEngine(sourceId), save = target.newSave();
    const targetRaw = target.serializeSave(save), foreign = source.act(source.newSave(), { type: 'merge', from: 6, to: 7 });
    const sourceRaw = source.serializeSave(foreign);
    expect(target.readSave(sourceRaw)).toEqual({ status: 'invalid', save: null, sourceRaw });
    for (const family of source.FAMILIES) expect(target.act(save, { type: 'supply', familyId: family.id })).toBeNull();
    for (const mutate of [
      candidate => { candidate.round.board[6].pieceId = source.STARTERS[0]; },
      candidate => { candidate.round.supply = structuredClone(foreign.round.supply); },
      candidate => { candidate.discoveries.push(source.STARTERS[0]); },
      candidate => { candidate.history = structuredClone(foreign.history); },
    ]) {
      const candidate = structuredClone(save); mutate(candidate); const raw = JSON.stringify(candidate);
      expect(target.validSave(candidate)).toBe(false); expect(target.readSave(raw)).toEqual({ status: 'invalid', save: null, sourceRaw: raw });
      expect(target.act(candidate, { type: 'reset' })).toBeNull(); expect(() => target.serializeSave(candidate)).toThrow();
    }
    expect(target.serializeSave(save)).toBe(targetRaw); expect(source.serializeSave(foreign)).toBe(sourceRaw);
  });
});

describe('four independent resumable sessions', () => {
  it.each(permutations(ids))('keeps boards isolated across visit order %s → %s → %s → %s', (...order) => {
    const f = fixture(), sessions = new Map(), expected = new Map();
    for (const [index, id] of order.entries()) {
      const engine = getMatchingEngine(id), session = openEnvelopeSession(engine, f.cache, f.storage);
      perform(engine, session, f.storage, { type: 'merge', from: 6, to: 7 });
      if (index % 2) perform(engine, session, f.storage, { type: 'supply', familyId: engine.FAMILIES[1].id });
      if (index > 1) perform(engine, session, f.storage, { type: 'sound', enabled: false });
      sessions.set(id, session); expected.set(id, structuredClone(session.save));
    }
    const bytes = new Map(f.bytes), writes = f.storage.setItem.mock.calls.length;
    for (const id of [...order].reverse().concat(order)) {
      const engine = getMatchingEngine(id);
      expect(openEnvelopeSession(engine, f.cache, f.storage).save).toEqual(expected.get(id));
      expect(readAlbumProgress(f.cache, f.storage).discovered).toBe(12);
    }
    expect(f.bytes).toEqual(bytes); expect(f.storage.setItem).toHaveBeenCalledTimes(writes);
    expect(f.cache.size).toBe(4); expect(f.bytes.size).toBe(4);
    const resetEngine = getMatchingEngine(order[0]); perform(resetEngine, sessions.get(order[0]), f.storage, { type: 'reset' });
    const undoEngine = getMatchingEngine(order[1]); perform(undoEngine, sessions.get(order[1]), f.storage, { type: 'undo' });
    for (const id of order.slice(2)) {
      const engine = getMatchingEngine(id);
      expect(sessions.get(id).save).toEqual(expected.get(id)); expect(f.bytes.get(engine.STORAGE_KEY)).toBe(bytes.get(engine.STORAGE_KEY));
    }
    for (const engine of engines) expect(openEnvelopeSession(engine, new Map(), f.storage).save).toEqual(sessions.get(engine.PACK_ID).save);
  });

  it('fourth-envelope play, reset and quota pressure leave every earlier stored byte untouched', () => {
    const f = fixture();
    for (const engine of engines.slice(0, 3)) {
      const save = engine.act(engine.newSave(), { type: 'merge', from: 6, to: 7 });
      f.bytes.set(engine.STORAGE_KEY, ` ${JSON.stringify(save, null, 2)}\n`);
    }
    const oldBytes = new Map(f.bytes), session = openEnvelopeSession(lantern, f.cache, f.storage);
    perform(lantern, session, f.storage, { type: 'merge', from: 6, to: 7 });
    perform(lantern, session, f.storage, { type: 'supply', familyId: 'spool' });
    perform(lantern, session, f.storage, { type: 'undo' });
    perform(lantern, session, f.storage, { type: 'reset' });
    const raw = f.bytes.get(lantern.STORAGE_KEY);
    f.storage.setItem.mockImplementation(() => { throw Error('Quota exceeded'); });
    perform(lantern, session, f.storage, { type: 'supply', familyId: 'lantern' });
    const attempts = f.storage.setItem.mock.calls.length;
    perform(lantern, session, f.storage, { type: 'supply', familyId: 'spool' });
    expect(session.blocked).toBe(true); expect(session.unavailable).toBe(true);
    expect(readAlbumProgress(f.cache, f.storage).temporary).toBe(true);
    expect(f.storage.setItem).toHaveBeenCalledTimes(attempts); expect(f.bytes.get(lantern.STORAGE_KEY)).toBe(raw);
    for (const [key, bytes] of oldBytes) expect(f.bytes.get(key)).toBe(bytes);
  });
});

describe('fourth-envelope recovery proof and future catalog headroom', () => {
  it('retains finite completion for all 13,341 fitting conservative inventories', () => {
    expect(validateConservativeInventories(lantern)).toEqual({ perFamilyInventories: 116, fittingTwoFamilyStates: 13_341, maxCompletionOperations: 42 });
  });

  it.each([0x6c616e74, 0x73706f6f, 0x20261004])('conserves units and exact persistence during mixed-action seed %i', seed => {
    const result = validateSeededOperations(2_048, seed, lantern);
    expect(result.operations).toBe(2_048); expect(result.reloads).toBe(56);
    for (const action of ['merge', 'move', 'cut', 'supply', 'undo', 'reset']) expect(result.successful[action]).toBeGreaterThan(0);
  }, 60_000);

  it('supports 210 distinct explicitly routed pieces without changing the bounded engine or read model', () => {
    // Synthetic metadata is an extensibility check, never an authored-art count
    // or a browser/performance claim. Publication still needs real unique art.
    const summaries = [], pieceIds = new Set(), keys = new Set();
    for (let pack = 0; pack < 21; pack++) {
      const id = `future-envelope-${pack}`;
      const families = ['a', 'b'].map(letter => ({ id: `family-${letter}`, name: `Journey ${letter}`, shortName: letter, color: '#765432',
        pieceIds: ['seed', 'fold', 'house', 'tower', 'world'].map(word => `pack-${pack}-${letter}-${word}`) }));
      const rows = families.flatMap(family => family.pieceIds.map((pieceId, index) => [pieceId, family.id, index + 1, pieceId, pieceId, `Synthetic ${pieceId}`, `synthetic/${pieceId}`]));
      const catalog = createMatchingCatalog({ id, rows, families }), storageKey = `moticos.matching.${id}.v1`;
      const engine = createMatchingEngine({ catalog, storageKey });
      const save = engine.act(engine.newSave(), { type: 'merge', from: 6, to: 7 }); material(engine, save);
      expect(engine.readSave(engine.serializeSave(save)).save).toEqual(save);
      summaries.push(summarizeEnvelope({ id, catalog, storageKey }, { save, opened: true, temporary: false, unread: false }));
      catalog.PIECES.forEach(piece => pieceIds.add(piece.id)); keys.add(storageKey);
    }
    expect(pieceIds.size).toBe(210); expect(keys.size).toBe(21);
    expect(summaries.reduce((sum, entry) => sum + entry.totalPieces, 0)).toBe(210);
    expect(summaries.reduce((sum, entry) => sum + entry.totalPostcards, 0)).toBe(126);
    expect(summaries.reduce((sum, entry) => sum + entry.totalWorlds, 0)).toBe(42);
    expect(summaries.every(entry => entry.discovered === 3 && entry.worlds === 0 && entry.families.length === 2)).toBe(true);
  });
});
