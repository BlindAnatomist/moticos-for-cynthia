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
