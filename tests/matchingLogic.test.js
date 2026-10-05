import { describe, it, expect } from 'vitest';
import { validateConservativeInventories, validateSeededOperations } from '../scripts/validateMatching.mjs';
import { BOARD_SIZE, CATALOG, PIECES, FAMILIES, FINALS, STARTERS, nextPiece, nameOf } from '../src/matching/catalog.js';
import { STORAGE_KEY, HISTORY_LIMIT, MAX_SAVE_BYTES, createRound, newSave, validRound, validSave, readSave, serializeSave, act, compatible, mergePairs, completedFinals } from '../src/matching/game.js';
const clone = value => structuredClone(value);
const occupied = save => save.round.board.filter(Boolean);
const find = (save, id) => save.round.board.findIndex(tile => tile?.pieceId === id);
function expectMaterial(save) {
  for (const family of FAMILIES) expect(save.round.supply[family.id] + occupied(save).filter(tile => CATALOG[tile.pieceId].familyId === family.id).reduce((sum, tile) => sum + CATALOG[tile.pieceId].mass, 0)).toBe(16);
}
function finishFamily(save, familyId) {
  const family = FAMILIES.find(f => f.id === familyId);
  while (find(save, family.finalId) === -1) {
    const pair = mergePairs(save.round.board).find(([from]) => CATALOG[save.round.board[from].pieceId].familyId === familyId);
    save = act(save, pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId });
    expect(save).not.toBeNull();
  }
  return save;
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

describe('isolated equal-picture matching catalog', () => {
  it('has two authored five-tier families with one exact next picture', () => {
    expect(BOARD_SIZE).toBe(5); expect(PIECES).toHaveLength(10); expect(STARTERS).toEqual(['b1', 'f1']); expect(FINALS).toEqual(['b5', 'f5']);
    expect(new Set(PIECES.map(p => p.art)).size).toBe(10);
    for (const family of FAMILIES) {
      expect(family.pieceIds).toHaveLength(5);
      for (const [i, id] of family.pieceIds.entries()) {
        expect(CATALOG[id]).toMatchObject({ familyId: family.id, tier: i + 1, mass: 2 ** i });
        expect(nextPiece(id)?.id ?? null).toBe(family.pieceIds[i + 1] ?? null);
      }
    }
    expect(CATALOG.b4.name).toBe('Aviary Gate'); expect(CATALOG.b5.name).toBe('Wandering Aviary');
    expect(CATALOG.f4.name).toBe('Moonlit Arbor'); expect(CATALOG.f5.name).toBe('Lunar Conservatory');
    expect(CATALOG.b3.art).toContain('/art/garden/e03_wayfinder_garden.webp'); expect(CATALOG.f5.art).toContain('/art/matching/f5.webp');
    expect(nameOf({ pieceId: 'b1' })).toBe('Coral Bird'); expect(nameOf({ pieceId: '__proto__' })).toBe('');
  });
  it('checks every catalog pair: equal exact pictures only and no cross-object recipe', () => {
    for (const a of PIECES) for (const b of PIECES) expect(compatible({ pieceId: a.id }, { pieceId: b.id })).toBe(a.id === b.id && a.tier < 5);
    for (const id of ['__proto__', 'constructor', 'toString', 'unknown', 1, null, undefined]) {
      expect(nextPiece(id)).toBeNull(); expect(compatible({ pieceId: id }, { pieceId: id })).toBe(false);
    }
    expect(compatible(Object.create({ pieceId: 'b1' }), { pieceId: 'b1' })).toBe(false);
    expect(compatible({ get pieceId() { throw Error('Unexpected getter'); } }, { pieceId: 'b1' })).toBe(false);
  });
});

describe('finite, reversible matching round', () => {
  it('starts with four visible units and twelve supplied units per family in eight readable cells', () => {
    const save = newSave();
    expect(validSave(save)).toBe(true); expect(save.round.board).toHaveLength(25); expect(occupied(save)).toHaveLength(8);
    expect([6, 7, 12, 16].every(i => save.round.board[i]?.pieceId === 'b1')).toBe(true);
    expect([8, 11, 13, 17].every(i => save.round.board[i]?.pieceId === 'f1')).toBe(true);
    expect(save.round.supply).toEqual({ bird: 12, fern: 12 }); expectMaterial(save);
    expect(STORAGE_KEY).toBe('moticos.matching.garden.v1');
    expect(STORAGE_KEY).not.toBe('moticos.collection.garden.v1');
  });
  it('finishes either family first and both finales in exactly 30 merges plus 12 supply-pair taps', () => {
    for (const order of [['bird', 'fern'], ['fern', 'bird']]) {
      let save = newSave();
      for (const familyId of order) { save = finishFamily(save, familyId); expectMaterial(save); }
      expect(save.round.merges).toBe(30); expect(save.round.moves).toBe(42); expect(save.round.supply).toEqual({ bird: 0, fern: 0 });
      expect(occupied(save).map(tile => tile.pieceId).sort()).toEqual([...FINALS].sort());
      expect(completedFinals(save.round.board).sort()).toEqual([...FINALS].sort());
      expect(mergePairs(save.round.board)).toEqual([]); expect(save.discoveries).toHaveLength(10);
      expect(validSave(save)).toBe(true); expect(readSave(serializeSave(save)).save).toEqual(save);
    }
  });
  it('only adds a chosen pair on request and undoes both supply and board atomically', () => {
    const start = deepFreeze(newSave()); const save = act(start, { type: 'supply', familyId: 'fern', index: 24 });
    expect(save.round.board[24].pieceId).toBe('f1'); expect(save.round.board[0].pieceId).toBe('f1');
    expect(save.round.supply).toEqual({ bird: 12, fern: 10 }); expect(occupied(save)).toHaveLength(10); expectMaterial(save);
    expect(act(save, { type: 'undo' })).toEqual(start);
    const merged = act(start, { type: 'merge', from: 6, to: 7 });
    expect(occupied(merged)).toHaveLength(7); expect(merged.round.supply).toEqual(start.round.supply);
    expect(merged.round.board[7].pieceId).toBe('b2');
    expect(act(start, { type: 'supply', familyId: 'bird', to: 1 }).round.board[1].pieceId).toBe('b1');
  });
  it('refuses supply on one-empty and full boards with no lost inventory or history', () => {
    let save = newSave();
    for (let i = 0; i < 8; i++) save = act(save, { type: 'supply', familyId: i < 6 ? 'bird' : 'fern' });
    expect(occupied(save)).toHaveLength(24);
    const raw = serializeSave(save);
    expect(act(save, { type: 'supply', familyId: 'fern' })).toBeNull(); expect(serializeSave(save)).toBe(raw);
    const [from, to] = mergePairs(save.round.board)[0]; save = act(save, { type: 'merge', from, to });
    save = act(save, { type: 'supply', familyId: 'fern' }); expect(occupied(save)).toHaveLength(25);
    const fullRaw = serializeSave(save);
    expect(act(save, { type: 'supply', familyId: 'fern' })).toBeNull(); expect(act(save, { type: 'cut', index: to })).toBeNull();
    expect(serializeSave(save)).toBe(fullRaw); expect(mergePairs(save.round.board).length).toBeGreaterThan(0);
  });
  it('cuts every crafted tier into two identical preceding pictures, including retained finale discoveries', () => {
    let save = finishFamily(newSave(), 'bird');
    for (let tier = 5; tier > 1; tier--) {
      const index = find(save, `b${tier}`); const before = save; save = act(save, { type: 'cut', index });
      expect(save.round.board[index].pieceId).toBe(`b${tier - 1}`);
      expect(occupied(save).filter(tile => tile.pieceId === `b${tier - 1}`).length).toBeGreaterThanOrEqual(2);
      expectMaterial(save); expect(validSave(save)).toBe(true);
      expect(act(save, { type: 'undo' }).round).toEqual(before.round);
    }
    expect(save.discoveries).toContain('b5');
    expect(act(save, { type: 'cut', index: find(save, 'b1') })).toBeNull();
    expect(readSave(serializeSave(save)).save).toEqual(save);
  });
  it('moves only into empties and preserves instance identity without mutating source', () => {
    const start = deepFreeze(newSave()); const moved = act(start, { type: 'move', from: 6, to: 0 });
    expect(moved.round.board[0]).toEqual(start.round.board[6]); expect(moved.round.board[6]).toBeNull();
    expect(act(moved, { type: 'undo' }).round).toEqual(start.round); expectMaterial(moved);
    expect(act(start, { type: 'move', from: 6, to: 8 })).toBeNull();
  });
  it('retains discoveries across Undo and reset, preserves sound, and bounds Undo to 100 operations', () => {
    const discovered = act(newSave(), { type: 'merge', from: 6, to: 7 });
    const undone = act(discovered, { type: 'undo' }); expect(undone.discoveries).toContain('b2'); expect(undone.round).toEqual(createRound());
    const quiet = act(undone, { type: 'sound', enabled: false }); expect(quiet.history).toEqual(undone.history);
    const reset = act(quiet, { type: 'reset' }); expect(reset.round).toEqual(createRound()); expect(reset.sound).toBe(false); expect(reset.discoveries).toContain('b2');
    let save = newSave();
    for (let i = 0; i < 130; i++) save = act(save, { type: 'move', from: i % 2 ? 0 : 6, to: i % 2 ? 6 : 0 });
    expect(save.history).toHaveLength(HISTORY_LIMIT); expect(validSave(save)).toBe(true);
    for (let i = 0; i < HISTORY_LIMIT; i++) save = act(save, { type: 'undo' });
    expect(save.round.moves).toBe(30); expect(act(save, { type: 'undo' })).toBeNull();
  });
  it('rejects malformed, out-of-range, mismatched and unavailable actions at no cost', () => {
    const save = newSave(); const raw = serializeSave(save);
    const actions = [null, {}, { type: 'unknown' }, { type: 'merge', from: 6, to: 8 }, { type: 'merge', from: 6, to: 6 }, { type: 'merge', from: 6, to: 0 }, { type: 'cut', index: 6 }, { type: 'undo' }, { type: 'sound', enabled: 1 }, { type: 'supply', familyId: '__proto__' }, { type: 'supply', familyId: 'bird', index: 6 }, { type: 'supply', familyId: 'bird', index: 0, to: 1 }, Object.create({ type: 'reset' }), { get type() { throw Error('Unexpected getter'); } }];
    for (const value of [-1, 25, 0.1, '6', NaN, Infinity, null, undefined]) actions.push({ type: 'merge', from: value, to: 7 }, { type: 'move', from: 6, to: value }, { type: 'supply', familyId: 'bird', index: value }, { type: 'cut', index: value });
    for (const action of actions) expect(act(save, action)).toBeNull();
    expect(serializeSave(save)).toBe(raw);
    const done = finishFamily(newSave(), 'bird'); expect(act(done, { type: 'supply', familyId: 'bird' })).toBeNull();
  });
});

describe('strict non-destructive persistence boundary', () => {
  it('distinguishes absent, valid, damaged and future saves while retaining original raw input', () => {
    expect(readSave(null)).toEqual({ status: 'empty', save: null, sourceRaw: null });
    expect(readSave(undefined).status).toBe('empty');
    const raw = serializeSave(newSave()); expect(readSave(raw)).toEqual({ status: 'loaded', save: newSave(), sourceRaw: raw });
    for (const raw of ['', '{', '{}', 'null', '[]', 'false', '{"version":1}', '{"version":0}', 5, ' '.repeat(MAX_SAVE_BYTES + 1)]) expect(readSave(raw)).toEqual({ status: 'invalid', save: null, sourceRaw: raw });
    const future = JSON.stringify({ ...newSave(), version: 2 }); expect(readSave(future)).toEqual({ status: 'unsupported', save: null, sourceRaw: future });
  });
  it('rejects damaged records without discarding history, repairing discoveries, or normalizing fields', () => {
    const mutations = [
      s => { s.round.board[0] = clone(s.round.board[6]); },
      s => { s.round.board[6] = null; },
      s => { s.round.board[6].pieceId = 'f1'; },
      s => { s.round.board[6].pieceId = '__proto__'; },
      s => { s.round.board[6].pieceId = 'constructor'; },
      s => { s.round.board[6].instanceId = s.round.board[7].instanceId; },
      s => { s.round.board[6].instanceId = 999; },
      s => { s.round.board[6].extra = 1; },
      s => { s.round.board[6] = Object.create(s.round.board[6]); },
      s => { s.round.board[6] = Object.assign(Object.create(null), s.round.board[6]); },
      s => { s.round.supply.bird = 11; },
      s => { s.round.supply.bird = 14; },
      s => { s.round.supply.bird = '12'; },
      s => { s.round.supply.bird = -0; },
      s => { s.round.moves = 0.5; },
      s => { s.round.moves = 1_000_001; },
      s => { s.round.merges = 1; },
      s => { s.round.nextInstanceId = 10; },
      s => { s.round.supply = Object.create(s.round.supply); },
      s => { s.round = Object.create(s.round); },
      s => { s.sound = 'yes'; },
      s => { delete s.sound; },
      s => { s.extra = true; },
      s => { s.discoveries = ['b1']; },
      s => { s.discoveries.push('b1'); },
      s => { s.discoveries.push('b3'); },
      s => { s.discoveries.push('toString'); },
      s => { s.history.push({}); },
      s => { s.history.push(clone(s.round)); },
      s => { s.round.board.length = 26; },
      s => { delete s.round.board[0]; },
      s => { s.round.board.extra = true; },
      s => { Object.defineProperty(s.round.board[6], 'pieceId', { get() { throw Error('getter invoked'); }, enumerable: true }); },
      s => { Object.defineProperty(s, 'secret', { value: 1 }); },
    ];
    for (const mutate of mutations) {
      const save = newSave(); mutate(save); expect(validSave(save)).toBe(false); expect(() => serializeSave(save)).toThrow(); expect(act(save, { type: 'reset' })).toBeNull();
    }
    for (const id of ['__proto__', 'constructor', 'toString']) {
      const save = newSave(); save.round.board[6].pieceId = id; const raw = JSON.stringify(save); expect(readSave(raw)).toEqual({ status: 'invalid', save: null, sourceRaw: raw });
    }
    const raw = serializeSave(newSave()).replace('{"version":1', '{"__proto__":{"polluted":true},"version":1');
    expect(readSave(raw).status).toBe('invalid'); expect({}.polluted).toBeUndefined();
  });
  it('validates every snapshot, chronological transitions, and active/previous discovery membership', () => {
    const first = act(newSave(), { type: 'merge', from: 6, to: 7 }); const second = act(first, { type: 'move', from: 7, to: 0 });
    expect(validSave(second)).toBe(true);
    const missed = clone(second); missed.history.splice(1, 1); expect(validSave(missed)).toBe(false);
    const same = clone(second); same.round.board = clone(same.history.at(-1).board); expect(validRound(same.round)).toBe(true); expect(validSave(same)).toBe(false);
    const damaged = clone(second); damaged.history[0].round = {}; expect(validSave(damaged)).toBe(false);
    const undiscovered = clone(second); undiscovered.discoveries = [...STARTERS]; expect(validSave(undiscovered)).toBe(false);
    const tooMuch = newSave(); tooMuch.history = Array.from({ length: 101 }, () => createRound()); expect(validSave(tooMuch)).toBe(false);
  });
});

describe('finite-supply reachability and adversarial repeated play', () => {
  it('exhaustively proves recovery and completion for every conservative pair of family inventories that fits the board', () => {
    const result = validateConservativeInventories();
    expect(result.perFamilyInventories).toBeGreaterThan(100);
    expect(result.fittingTwoFamilyStates).toBeGreaterThan(10_000);
    expect(result.maxCompletionOperations).toBeLessThanOrEqual(42);
  });
  it('conserves every unit through 10,000 seeded legal/invalid moves, merges, cuts, supplies, Undo and reloads', () => {
    const result = validateSeededOperations();
    expect(result.operations).toBe(10_000);
    for (const type of ['merge', 'move', 'cut', 'supply', 'undo']) expect(result.successful[type]).toBeGreaterThan(50);
    expect(result.reloads).toBe(271);
  }, 60_000);
});

// Expansion tests deliberately keep the original garden suite above unchanged.
import { readFileSync } from 'node:fs';
import { GARDEN_CATALOG } from '../src/matching/catalog.js';
import { GARDEN_ENGINE } from '../src/matching/game.js';
import { createMatchingCatalog } from '../src/matching/catalogFactory.js';
import { createMatchingEngine } from '../src/matching/engine.js';
import { DEFAULT_ENVELOPE_ID, ENVELOPES, getEnvelope, getMatchingEngine } from '../src/matching/registry.js';
const engines = ENVELOPES.map(envelope => getMatchingEngine(envelope.id));
const moonlit = getMatchingEngine('moonlit-passage');
function finishEngineFamily(engine, initial, familyId) {
  const family = engine.FAMILIES.find(item => item.id === familyId);
  let save = initial;
  while (find(save, family.finalId) === -1) {
    const pair = engine.mergePairs(save.round.board).find(([from]) => engine.CATALOG[save.round.board[from].pieceId].familyId === familyId);
    save = engine.act(save, pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId });
    expect(save).not.toBeNull();
  }
  return save;
}
function expectEngineMaterial(engine, save) {
  for (const family of engine.FAMILIES) {
    const onBoard = occupied(save).filter(tile => engine.CATALOG[tile.pieceId].familyId === family.id).reduce((sum, tile) => sum + engine.CATALOG[tile.pieceId].mass, 0);
    expect(save.round.supply[family.id] + onBoard).toBe(16);
  }
}

describe('bounded envelope registry and garden compatibility', () => {
  it('preserves the garden default, original exports, exact schema, and a real pre-expansion v1 save', () => {
    expect(DEFAULT_ENVELOPE_ID).toBe('matching-garden');
    expect(getMatchingEngine(DEFAULT_ENVELOPE_ID)).toBe(GARDEN_ENGINE);
    expect(GARDEN_ENGINE.CATALOG).toBe(CATALOG);
    expect(GARDEN_ENGINE.newSave).toBe(newSave);
    expect(GARDEN_ENGINE.nextPiece).toBe(nextPiece);
    expect(getEnvelope(DEFAULT_ENVELOPE_ID).catalog).toBe(GARDEN_CATALOG);
    const raw = readFileSync(new URL('./fixtures/matching-garden-v1.json', import.meta.url), 'utf8').trimEnd();
    const loaded = readSave(raw);
    expect(loaded.status).toBe('loaded'); expect(serializeSave(loaded.save)).toBe(raw);
    let save = newSave();
    for (let i = 0; i < 12; i++) {
      const pair = mergePairs(save.round.board)[0];
      save = act(save, pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: i % 2 ? 'bird' : 'fern' });
    }
    save = act(save, { type: 'sound', enabled: false });
    expect(serializeSave(save)).toBe(raw);
    expect(Object.keys(save)).toEqual(['version', 'round', 'history', 'discoveries', 'sound']);
    expect(Object.keys(save.round)).toEqual(['board', 'supply', 'moves', 'merges', 'nextInstanceId']);
  });
  it('has four immutable descriptors, forty unique IDs and four independent save keys', () => {
    expect(ENVELOPES.map(envelope => envelope.id)).toEqual(['matching-garden', 'moonlit-passage', 'riverside-reverie', 'lantern-studio']);
    expect(getEnvelope('moonlit-passage').title).toBe('Moonlit Passage');
    expect(moonlit.STORAGE_KEY).toBe('moticos.matching.moonlit-passage.v1');
    expect(new Set(ENVELOPES.map(envelope => envelope.storageKey)).size).toBe(4);
    expect(Object.isFrozen(ENVELOPES)).toBe(true);
    for (const envelope of ENVELOPES) {
      const engine = getMatchingEngine(envelope.id);
      expect(Object.isFrozen(envelope)).toBe(true); expect(Object.isFrozen(engine)).toBe(true);
      expect(envelope.catalog.CATALOG).toBe(engine.CATALOG); expect(envelope.catalog.FAMILIES).toBe(engine.FAMILIES);
      expect(engine.FAMILIES).toHaveLength(2); expect(engine.PIECES).toHaveLength(10);
      expect(Object.isFrozen(engine.FAMILIES[0].pieceIds)).toBe(true);
      expect(engine.HISTORY_LIMIT).toBe(100); expect(engine.MAX_SAVE_BYTES).toBe(512 * 1024);
    }
    const pieces = engines.flatMap(engine => engine.PIECES);
    expect(new Set(pieces.map(piece => piece.id)).size).toBe(40);
    expect(new Set(pieces.map(piece => piece.art)).size).toBe(40);
    for (const id of ['__proto__', 'constructor', 'toString', 'missing', undefined, null, 1, {}]) {
      expect(getEnvelope(id)).toBeNull(); expect(getMatchingEngine(id)).toBeNull();
    }
    expect(moonlit.CATALOG.k1.art).toContain('/art/garden/s03_round_key.webp');
    expect(moonlit.CATALOG.k2.art).toContain('/art/garden/e02_frond_key.webp');
    expect(moonlit.CATALOG.m1.art).toContain('/art/garden/s05_cobalt_moon.webp');
    expect(moonlit.CATALOG.m2.art).toContain('/art/garden/e04_crescent_courier.webp');
  });
  it('checks all 1600 collection pairings against each active envelope without cross-envelope recipes', () => {
    const pieces = engines.flatMap(engine => engine.PIECES);
    let pairings = 0;
    for (const a of pieces) for (const b of pieces) {
      pairings++;
      for (const engine of engines) {
        const expected = a.packId === engine.PACK_ID && b.packId === engine.PACK_ID && a.id === b.id && a.tier < 5;
        expect(engine.compatible(a.id, b.id)).toBe(expected);
        expect(engine.compatible({ pieceId: a.id }, { pieceId: b.id })).toBe(expected);
      }
    }
    expect(pairings).toBe(1600);
  });
  it('follows explicit routes even when IDs have no prefix or numeric-tier convention', () => {
    const routes = [
      ['seedling', 'paper-cup', 'leaf-map', 'gatehouse', 'whole-garden'],
      ['loose-letter', 'ink-wing', 'riverboat', 'cloud-tower', 'night-port'],
    ];
    const families = GARDEN_CATALOG.FAMILIES.map((family, index) => ({ ...family, pieceIds: routes[index] }));
    const rows = families.flatMap((family, familyIndex) => family.pieceIds.map((id, tier) => [id, family.id, tier + 1, id, id, `A distinct ${id}.`, `test/${familyIndex}/${id}`]));
    const catalog = createMatchingCatalog({ id: 'explicit-routes', rows, families });
    const engine = createMatchingEngine({ catalog, storageKey: 'moticos.matching.explicit-routes.v1' });
    for (const family of engine.FAMILIES) for (const [tier, id] of family.pieceIds.entries()) {
      expect(engine.nextPiece(id)?.id ?? null).toBe(family.pieceIds[tier + 1] ?? null);
      expect(engine.previousPiece(id)?.id ?? null).toBe(family.pieceIds[tier - 1] ?? null);
    }
    let save = finishEngineFamily(engine, engine.newSave(), families[0].id);
    save = finishEngineFamily(engine, save, families[1].id);
    expect(engine.validSave(save)).toBe(true); expect(save.round.merges).toBe(30);
    const cut = engine.act(save, { type: 'cut', index: find(save, families[0].pieceIds[4]) });
    expect(occupied(cut).filter(tile => tile.pieceId === families[0].pieceIds[3])).toHaveLength(2);
    expect(engine.validSave(cut)).toBe(true);
    const missing = clone(save); missing.discoveries = missing.discoveries.filter(id => id !== families[0].pieceIds[2]);
    expect(engine.validSave(missing)).toBe(false);
    expect(() => createMatchingCatalog({ id: 'wrong', rows: rows.slice(1), families })).toThrow();
    expect(() => createMatchingCatalog({ id: 'wrong', rows, families: [families[0], families[0]] })).toThrow();
    expect(() => createMatchingCatalog({ id: 'wrong', rows, families: [{ ...families[0], pieceIds: [...routes[0]].reverse() }, families[1]] })).toThrow();
    expect(() => createMatchingEngine({ catalog, storageKey: 'moticos.collection.garden.v1' })).toThrow();
  });
  it('keeps histories, discoveries, sound and resets independent when serialized under separate keys', () => {
    const stored = new Map(engines.map(engine => [engine.STORAGE_KEY, engine.serializeSave(engine.newSave())]));
    const originalGarden = stored.get(STORAGE_KEY);
    let save = moonlit.readSave(stored.get(moonlit.STORAGE_KEY)).save;
    save = moonlit.act(save, { type: 'merge', from: 6, to: 7 });
    save = moonlit.act(save, { type: 'sound', enabled: false });
    stored.set(moonlit.STORAGE_KEY, moonlit.serializeSave(save));
    expect(stored.get(STORAGE_KEY)).toBe(originalGarden);
    expect(newSave().discoveries).toEqual(['b1', 'f1']); expect(newSave().history).toHaveLength(0); expect(newSave().sound).toBe(true);
    expect(save.discoveries).toContain('k2'); expect(save.history).toHaveLength(1);
    const moonlitRaw = stored.get(moonlit.STORAGE_KEY);
    const garden = act(newSave(), { type: 'merge', from: 8, to: 11 });
    stored.set(STORAGE_KEY, serializeSave(garden));
    expect(stored.get(moonlit.STORAGE_KEY)).toBe(moonlitRaw);
    expect(moonlit.readSave(moonlitRaw).save).toEqual(save);
    expect(moonlit.act(save, { type: 'reset' })).toMatchObject({ round: moonlit.createRound(), history: [], discoveries: ['k1', 'm1', 'k2'], sound: false });
    expect(readSave(stored.get(STORAGE_KEY)).save).toEqual(garden);
  });
});

for (const engine of engines) describe(`${engine.PACK_ID}: complete bounded gameplay and save isolation`, () => {
  it('preserves both family finish orders at 30 merges, 12 pair draws, and complete independent discoveries', () => {
    for (const families of [engine.FAMILIES, [...engine.FAMILIES].reverse()]) {
      let save = engine.newSave();
      expect(occupied(save)).toHaveLength(8); expect(save.discoveries).toEqual([...engine.STARTERS]);
      expect(Object.keys(save.round.supply)).toEqual(engine.FAMILIES.map(family => family.id));
      for (const family of families) save = finishEngineFamily(engine, save, family.id);
      expect(save.round.merges).toBe(30); expect(save.round.moves).toBe(42);
      expect(Object.values(save.round.supply)).toEqual([0, 0]); expectEngineMaterial(engine, save);
      expect(engine.completedFinals(save.round.board)).toEqual(engine.FINALS);
      expect(save.discoveries).toHaveLength(10); expect(engine.mergePairs(save.round.board)).toEqual([]);
      expect(engine.readSave(engine.serializeSave(save)).save).toEqual(save);
      expect(engine.act(save, { type: 'supply', familyId: families[0].id })).toBeNull();
    }
  });
  it('cuts and exactly undoes every tier in both families using explicit previous-piece identity', () => {
    for (const family of engine.FAMILIES) {
      let save = finishEngineFamily(engine, engine.newSave(), family.id);
      for (let tier = 4; tier >= 1; tier--) {
        const before = save; const index = find(save, family.pieceIds[tier]);
        save = engine.act(save, { type: 'cut', index });
        expect(save.round.board[index].pieceId).toBe(family.pieceIds[tier - 1]);
        expect(occupied(save).filter(tile => tile.pieceId === family.pieceIds[tier - 1]).length).toBeGreaterThanOrEqual(2);
        expectEngineMaterial(engine, save); expect(engine.validSave(save)).toBe(true);
        expect(engine.act(save, { type: 'undo' })).toEqual(before);
      }
      expect(engine.act(save, { type: 'cut', index: find(save, family.starterId) })).toBeNull();
      expect(save.discoveries).toContain(family.finalId);
      expect(engine.readSave(engine.serializeSave(save)).save).toEqual(save);
    }
  });
  it('refuses one-empty and full-board supplies and undoes valid pair draws with no unit loss', () => {
    let save = engine.newSave();
    for (let i = 0; i < 8; i++) save = engine.act(save, { type: 'supply', familyId: engine.FAMILIES[i < 6 ? 0 : 1].id });
    expect(occupied(save)).toHaveLength(24);
    const raw = engine.serializeSave(save);
    expect(engine.act(save, { type: 'supply', familyId: engine.FAMILIES[1].id })).toBeNull(); expect(engine.serializeSave(save)).toBe(raw);
    const pair = engine.mergePairs(save.round.board)[0];
    save = engine.act(save, { type: 'merge', from: pair[0], to: pair[1] });
    const before = save;
    save = engine.act(save, { type: 'supply', familyId: engine.FAMILIES[1].id });
    expect(occupied(save)).toHaveLength(25); expectEngineMaterial(engine, save);
    expect(engine.act(save, { type: 'supply', familyId: engine.FAMILIES[1].id })).toBeNull();
    expect(engine.act(save, { type: 'cut', index: pair[1] })).toBeNull();
    expect(engine.act(save, { type: 'undo' })).toEqual(before);
  });
  it('rejects foreign family supply, active pieces, discoveries, history and whole saves without repair', () => {
    const foreign = engines.find(item => item !== engine);
    const initial = engine.newSave(); const raw = engine.serializeSave(initial);
    for (const family of foreign.FAMILIES) expect(engine.act(initial, { type: 'supply', familyId: family.id })).toBeNull();
    expect(engine.serializeSave(initial)).toBe(raw);
    const invalids = [
      save => { save.round.supply[foreign.FAMILIES[0].id] = 0; },
      save => { delete save.round.supply[engine.FAMILIES[0].id]; },
      save => { save.round.board[6].pieceId = foreign.STARTERS[0]; },
      save => { save.discoveries.push(foreign.STARTERS[0]); },
      save => { save.history = [foreign.createRound()]; },
    ];
    for (const mutate of invalids) {
      const save = clone(initial); mutate(save); const sourceRaw = JSON.stringify(save);
      expect(engine.validSave(save)).toBe(false); expect(engine.readSave(sourceRaw)).toEqual({ status: 'invalid', save: null, sourceRaw });
      expect(engine.act(save, { type: 'reset' })).toBeNull(); expect(() => engine.serializeSave(save)).toThrow();
    }
    const foreignRaw = foreign.serializeSave(foreign.newSave());
    expect(engine.readSave(foreignRaw)).toEqual({ status: 'invalid', save: null, sourceRaw: foreignRaw });
    const progressed = engine.act(initial, { type: 'merge', from: 6, to: 7 });
    progressed.history[0].board[6].pieceId = foreign.STARTERS[0];
    expect(engine.validSave(progressed)).toBe(false);
  });
  it('retains strict hostile-input rejection, exact chronology and raw-byte preservation', () => {
    const familyId = engine.FAMILIES[0].id;
    const malformed = [
      s => { s.round.board[0] = clone(s.round.board[6]); },
      s => { s.round.board[6] = null; },
      s => { s.round.board[6].instanceId = s.round.board[7].instanceId; },
      s => { s.round.board[6].instanceId = 999; },
      s => { s.round.board[6].extra = true; },
      s => { s.round.board[6] = Object.create(s.round.board[6]); },
      s => { s.round.board[6] = Object.assign(Object.create(null), s.round.board[6]); },
      s => { s.round.board[6].pieceId = '__proto__'; },
      s => { s.round.board[6].pieceId = 'constructor'; },
      s => { s.round.supply[familyId] = 11; },
      s => { s.round.supply[familyId] = 14; },
      s => { s.round.supply[familyId] = '12'; },
      s => { s.round.supply[familyId] = -0; },
      s => { s.round.supply = Object.create(s.round.supply); },
      s => { s.round = Object.create(s.round); },
      s => { s.round.moves = 0.5; },
      s => { s.round.moves = engine.MAX_MOVES + 1; },
      s => { s.round.merges = 1; },
      s => { s.round.nextInstanceId = 10; },
      s => { s.sound = 'yes'; },
      s => { delete s.sound; },
      s => { s.version = 0; },
      s => { s.extra = true; },
      s => { s.discoveries = [engine.STARTERS[0]]; },
      s => { s.discoveries.push(engine.STARTERS[0]); },
      s => { s.discoveries.push(engine.FAMILIES[0].pieceIds[2]); },
      s => { s.discoveries.push('toString'); },
      s => { s.history.push({}); },
      s => { s.history.push(clone(s.round)); },
      s => { s.history = Array.from({ length: 101 }, () => engine.createRound()); },
      s => { s.round.board.length = 26; },
      s => { delete s.round.board[0]; },
      s => { s.round.board.extra = true; },
      s => { Object.defineProperty(s.round.board[6], 'pieceId', { get() { throw Error('getter invoked'); }, enumerable: true }); },
      s => { Object.defineProperty(s, 'hidden', { value: 1 }); },
      s => { Object.defineProperty(s.discoveries, 0, { get() { throw Error('getter invoked'); }, enumerable: true }); },
      s => { s[Symbol('secret')] = true; },
    ];
    for (const mutate of malformed) {
      const save = engine.newSave(); mutate(save);
      expect(engine.validSave(save)).toBe(false); expect(() => engine.serializeSave(save)).toThrow(); expect(engine.act(save, { type: 'reset' })).toBeNull();
    }
    const merged = engine.act(engine.newSave(), { type: 'merge', from: 6, to: 7 });
    const moved = engine.act(merged, { type: 'move', from: 7, to: 0 });
    const missingStep = clone(moved); missingStep.history.splice(1, 1); expect(engine.validSave(missingStep)).toBe(false);
    const wrongStep = clone(moved); wrongStep.round.board = clone(merged.round.board); expect(engine.validRound(wrongStep.round)).toBe(true); expect(engine.validSave(wrongStep)).toBe(false);
    const missingDiscovery = clone(moved); missingDiscovery.discoveries = [...engine.STARTERS]; expect(engine.validSave(missingDiscovery)).toBe(false);
    for (const sourceRaw of ['', '{', '{}', 'null', '[]', 'false', ' '.repeat(engine.MAX_SAVE_BYTES + 1)]) expect(engine.readSave(sourceRaw)).toEqual({ status: 'invalid', save: null, sourceRaw });
    const future = JSON.stringify({ ...engine.newSave(), version: 2 }); expect(engine.readSave(future)).toEqual({ status: 'unsupported', save: null, sourceRaw: future });
    const multibyte = JSON.stringify({ version: 2, padding: 'é'.repeat(engine.MAX_SAVE_BYTES / 2) });
    expect(multibyte.length).toBeLessThan(engine.MAX_SAVE_BYTES); expect(engine.readSave(multibyte).status).toBe('invalid');
  });
  it('caps Undo at 100 and board actions at the move bound while allowing recovery', () => {
    let save = engine.newSave();
    for (let i = 0; i < 130; i++) save = engine.act(save, { type: 'move', from: i % 2 ? 0 : 6, to: i % 2 ? 6 : 0 });
    expect(save.history).toHaveLength(100); expect(engine.readSave(engine.serializeSave(save)).save).toEqual(save);
    for (let i = 0; i < 100; i++) save = engine.act(save, { type: 'undo' });
    expect(save.round.moves).toBe(30); expect(engine.act(save, { type: 'undo' })).toBeNull();
    const capped = engine.newSave(); capped.round.moves = engine.MAX_MOVES;
    expect(engine.validSave(capped)).toBe(true);
    expect(engine.act(capped, { type: 'move', from: 6, to: 0 })).toBeNull();
    expect(engine.act(capped, { type: 'merge', from: 6, to: 7 })).toBeNull();
    expect(engine.act(capped, { type: 'reset' })).toEqual(engine.newSave());
    expect(engine.act(capped, { type: 'sound', enabled: false }).sound).toBe(false);
  });
  it('proves completion for all 13,341 conservative two-family inventories', () => {
    expect(validateConservativeInventories(engine)).toEqual({ perFamilyInventories: 116, fittingTwoFamilyStates: 13_341, maxCompletionOperations: 42 });
  });
});

describe('Moonlit Passage repeated-play regression', () => {
  it('survives 10,000 deterministic mixed operations and 271 exact save/reload checks', () => {
    const result = validateSeededOperations(10_000, 0x4d4f5449, moonlit);
    expect(result.operations).toBe(10_000); expect(result.reloads).toBe(271);
    for (const type of ['merge', 'move', 'cut', 'supply', 'undo']) expect(result.successful[type]).toBeGreaterThan(50);
  }, 60_000);
});
