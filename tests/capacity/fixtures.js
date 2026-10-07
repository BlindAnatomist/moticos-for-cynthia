import { createMatchingCatalog } from '../../src/matching/catalogFactory.js';
import { createMatchingEngine } from '../../src/matching/engine.js';

export function makeScaleEngine(pack) {
  const id = `capacity-envelope-${pack}`;
  const families = ['a', 'b'].map(letter => ({ id: `family-${letter}`, name: `Journey ${letter}`, shortName: letter, color: '#765432',
    pieceIds: ['seed', 'fold', 'house', 'tower', 'world'].map(word => `pack-${pack}-${letter}-${word}`) }));
  const rows = families.flatMap(family => family.pieceIds.map((pieceId, index) => [pieceId, family.id, index + 1, pieceId, pieceId, `Synthetic ${pieceId}`, `synthetic/${pieceId}`]));
  const catalog = createMatchingCatalog({ id, rows, families });
  const storageKey = `moticos.matching.${id}.v1`;
  return { engine: createMatchingEngine({ catalog, storageKey }), envelope: { id, catalog, storageKey } };
}
export function random(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function actions(engine, save) {
  const board = save.round.board, empty = board.flatMap((tile, index) => tile === null ? [index] : []);
  const list = engine.mergePairs(board).map(([from, to]) => ({ type: 'merge', from, to }));
  board.forEach((tile, from) => {
    if (!tile) return;
    for (const to of empty) list.push({ type: 'move', from, to });
    if (engine.CATALOG[tile.pieceId].tier > 1 && empty.length) list.push({ type: 'cut', index: from, to: empty[0] });
  });
  if (empty.length >= 2) for (const family of engine.FAMILIES) if (save.round.supply[family.id]) list.push({ type: 'supply', familyId: family.id });
  return list;
}
export function denseSave(engine, seed = 1) {
  const nextRandom = random(seed); let save = engine.newSave();
  // Reach 24 occupied cells legally. Preserve one empty cell for random moves.
  for (let i = 0; i < 8; i++) save = engine.act(save, { type: 'supply', familyId: engine.FAMILIES[i % 2].id });
  for (let i = 0; i < engine.HISTORY_LIMIT + 10; i++) {
    const occupied = save.round.board.flatMap((tile, index) => tile ? [index] : []);
    const from = occupied[Math.floor(nextRandom() * occupied.length)], to = save.round.board.findIndex(tile => tile === null);
    save = engine.act(save, { type: 'move', from, to });
  }
  return save;
}
export function memoryStorage({ limit = Infinity } = {}) {
  const bytes = new Map(); let readError = false, writeError = false, writes = 0;
  return { bytes, get writes() { return writes; }, failRead: value => { readError = value; }, failWrite: value => { writeError = value; },
    getItem(key) { if (readError) throw Error('Read denied'); return bytes.get(key) ?? null; },
    setItem(key, raw) {
      writes++;
      const total = [...bytes].reduce((size, [k, v]) => size + (k === key ? 0 : 2 * (k.length + v.length)), 0) + 2 * (key.length + raw.length);
      if (writeError || total > limit) throw new DOMException('Simulated aggregate quota', 'QuotaExceededError');
      bytes.set(key, raw);
    },
  };
}
