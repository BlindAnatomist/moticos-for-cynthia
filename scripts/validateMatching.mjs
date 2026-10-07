import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { GARDEN_ENGINE } from '../src/matching/game.js';
import { ENVELOPES, getMatchingEngine } from '../src/matching/registry.js';
const clone = value => structuredClone(value);
export function allFamilyInventories() {
  const states = [];
  for (let supply = 0; supply <= 12; supply += 2) {
    const visit = (tier, left, counts) => {
      if (tier === 5) { if (left === 0) states.push({ supply, counts }); return; }
      for (let count = 0; count * 2 ** tier <= left; count++) visit(tier + 1, left - count * 2 ** tier, [...counts, count]);
    };
    visit(0, 16 - supply, []);
  }
  return states;
}
const countPieces = inventory => inventory.counts.reduce((sum, count) => sum + count, 0);
const hasPair = inventory => inventory.counts.slice(0, 4).some(count => count >= 2);
const isFinal = inventory => inventory.supply === 0 && inventory.counts.join(',') === '0,0,0,0,1';
export function validateConservativeInventories(engine = GARDEN_ENGINE) {
  // The inventory proof applies only after checking each authored envelope uses
  // the same bounded material, board, tier weights, starting pieces and reserve.
  assert.equal(engine.BOARD_SIZE, 5);
  assert.equal(engine.FAMILIES.length, 2);
  assert.equal(engine.FAMILY_MATERIAL, 16);
  assert.equal(engine.createRound().board.filter(Boolean).length, 8);
  for (const family of engine.FAMILIES) {
    assert.equal(engine.createRound().supply[family.id], 12);
    assert.equal(family.material, 16);
    assert.deepEqual(family.pieceIds.map(id => engine.CATALOG[id].mass), [1, 2, 4, 8, 16]);
    assert.deepEqual(family.pieceIds.map(id => engine.nextPiece(id)?.id ?? null), [...family.pieceIds.slice(1), null]);
  }
  const families = allFamilyInventories(); let checked = 0; let maxSteps = 0;
  for (const first of families) for (const second of families) {
    if (countPieces(first) + countPieces(second) > 25) continue;
    checked++;
    const inventories = [clone(first), clone(second)]; let steps = 0;
    while (!inventories.every(isFinal)) {
      const pairFamily = inventories.find(hasPair);
      if (pairFamily) {
        const tier = pairFamily.counts.findIndex((count, tier) => tier < 4 && count >= 2);
        pairFamily.counts[tier] -= 2; pairFamily.counts[tier + 1]++;
      } else {
        const supplyFamily = inventories.find(inventory => inventory.supply >= 2);
        assert.ok(supplyFamily, 'An unfinished no-pair state must have visible supply.');
        assert.ok(inventories.reduce((n, inventory) => n + countPieces(inventory), 0) <= 23, 'The supply pair must fit.');
        supplyFamily.supply -= 2; supplyFamily.counts[0] += 2;
      }
      assert.ok(++steps <= 42, 'Finite completion must finish within 42 supply/merge operations.');
    }
    maxSteps = Math.max(maxSteps, steps);
  }
  return { perFamilyInventories: families.length, fittingTwoFamilyStates: checked, maxCompletionOperations: maxSteps };
}
export function validateSeededOperations(operations = 10_000, initialSeed = 0x4d4f5449, engine = GARDEN_ENGINE) {
  const { CATALOG, FAMILIES, newSave, act, mergePairs, validRound, validSave, serializeSave, readSave } = engine;
  let seed = initialSeed;
  const random = max => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed % max; };
  let save = newSave(); let reloads = 0;
  const successful = { merge: 0, move: 0, cut: 0, supply: 0, undo: 0, reset: 0 };
  for (let step = 0; step < operations; step++) {
    const board = save.round.board;
    const live = board.map((tile, index) => tile ? index : -1).filter(index => index !== -1);
    const empty = board.map((tile, index) => tile === null ? index : -1).filter(index => index !== -1);
    const pairs = mergePairs(board); const cuts = live.filter(index => CATALOG[board[index].pieceId].tier > 1);
    // The extra pair draw deliberately keeps this seed compatible with the
    // original test sequence recorded in MATCHING_ENGINE.md.
    const choices = [
      pairs.length ? { type: 'merge', from: pairs[random(pairs.length)][0], to: -1 } : null,
      empty.length ? { type: 'move', from: live[random(live.length)], to: empty[random(empty.length)] } : null,
      cuts.length ? { type: 'cut', index: cuts[random(cuts.length)] } : null,
      { type: 'supply', familyId: FAMILIES[random(2) ? 0 : 1].id },
      { type: 'undo' }, { type: 'merge', from: -1, to: 999 },
    ];
    if (pairs.length) { const pair = pairs[random(pairs.length)]; choices[0] = { type: 'merge', from: pair[0], to: pair[1] }; }
    const action = step % 251 === 250 ? { type: 'reset' } : choices[random(choices.length)];
    const before = step % 100 === 0 ? serializeSave(save) : null;
    const next = act(save, action);
    if (next) { successful[action.type]++; save = next; }
    else if (before !== null) assert.equal(serializeSave(save), before, 'Rejected actions must not mutate any state.');
    for (const family of FAMILIES) {
      const mass = save.round.supply[family.id] + save.round.board.filter(Boolean).filter(tile => CATALOG[tile.pieceId].familyId === family.id).reduce((sum, tile) => sum + CATALOG[tile.pieceId].mass, 0);
      assert.equal(mass, 16, 'Each family must retain exactly sixteen starter units.');
    }
    assert.ok(validRound(save.round));
    if (step % 37 === 0) {
      const raw = serializeSave(save); const restored = readSave(raw);
      assert.equal(restored.status, 'loaded'); assert.deepEqual(restored.save, save); save = restored.save; reloads++;
    }
  }
  assert.ok(validSave(save));
  return { seed: `0x${initialSeed.toString(16)}`, operations, successful, reloads, finalSaveBytes: new TextEncoder().encode(serializeSave(save)).length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(Object.fromEntries(ENVELOPES.map(envelope => {
    const engine = getMatchingEngine(envelope.id);
    return [envelope.id, { reachability: validateConservativeInventories(engine), seededPlay: validateSeededOperations(10_000, 0x4d4f5449, engine) }];
  })), null, 2));
}
