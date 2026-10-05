export const HISTORY_LIMIT = 100;
export const MAX_SAVE_BYTES = 512 * 1024;
export const MAX_MOVES = 1_000_000;
const POSITION_GROUPS = Object.freeze([Object.freeze([6, 7, 12, 16]), Object.freeze([8, 11, 13, 17])]);
const RESERVE_UNITS = 12;
const own = (value, key) => Object.hasOwn(value, key);
const integer = (value, min, max) => Number.isSafeInteger(value) && !Object.is(value, -0) && value >= min && value <= max;

// An engine closes over just one bounded, immutable catalog. Saves keep their
// exact v1 schema; envelope identity comes from the independent storage key.
export function createMatchingEngine({ catalog, storageKey }) {
  return createEngine({ catalog, storageKey }, 2);
}

export function createSingleFamilyTrialEngine({ catalog, storageKey }) {
  if (catalog?.PACK_ID !== 'trial-light-letter' || storageKey !== 'moticos.matching.trial-light-letter.v1') {
    throw new TypeError('Trial engines must use their isolated catalog and save key.');
  }
  return createEngine({ catalog, storageKey }, 1);
}

function createEngine({ catalog, storageKey }, familyCount) {
  if (!catalog || catalog.FAMILIES?.length !== familyCount || catalog.PIECES?.length !== familyCount * 5 ||
      catalog.BOARD_SIZE !== 5 || catalog.PACK_VERSION !== 1 || catalog.FAMILY_MATERIAL !== 16 ||
      !catalog.FAMILIES.every(family => family.pieceIds.length === 5) ||
      typeof storageKey !== 'string' || !/^moticos\.matching\.[a-z][a-z0-9-]*\.v1$/.test(storageKey)) {
    throw new TypeError('Matching engines require one bounded two-family, five-tier envelope and a v1 storage key.');
  }
  const { BOARD_SIZE, CATALOG, FAMILIES, STARTERS, FINALS, FAMILY_MATERIAL, PACK_VERSION, pieceOf, idOf, nextPiece, previousPiece } = catalog;
  const STORAGE_KEY = storageKey;
  const INITIAL_PIECES = familyCount * 4;
  const FIRST_INSTANCE = INITIAL_PIECES + 1;
  const MAX_INSTANCE = 2 * MAX_MOVES + FIRST_INSTANCE;
  const FAMILY_IDS = Object.freeze(FAMILIES.map(family => family.id));
  const INITIAL_POSITIONS = Object.freeze(Object.fromEntries(FAMILY_IDS.map((id, index) => [id, POSITION_GROUPS[index]])));
  const CELLS = BOARD_SIZE ** 2;
  const indexOK = value => integer(value, 0, CELLS - 1);

  // Strict data-only schemas reject inherited records, hidden/extra keys, getters,
  // sparse arrays, and prototype-looking IDs before any catalog lookup occurs.
  function record(value, keys) {
    if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
    const actual = Reflect.ownKeys(value);
    return actual.length === keys.length && actual.every(key => typeof key === 'string' && keys.includes(key)) && keys.every(key => {
      const d = Object.getOwnPropertyDescriptor(value, key);
      return d && own(d, 'value') && d.enumerable;
    });
  }
  function denseArray(value, max, exact = false) {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max || (exact && value.length !== max)) return false;
    if (Reflect.ownKeys(value).length !== value.length + 1) return false;
    for (let i = 0; i < value.length; i++) {
      const d = Object.getOwnPropertyDescriptor(value, String(i));
      if (!d || !own(d, 'value') || !d.enumerable) return false;
    }
    return true;
  }
  function tileOK(tile, nextInstanceId) {
    return record(tile, ['pieceId', 'instanceId']) && pieceOf(tile.pieceId) !== null && integer(tile.instanceId, 1, nextInstanceId - 1);
  }
  function roundOK(round) {
    if (!record(round, ['board', 'supply', 'moves', 'merges', 'nextInstanceId']) || !denseArray(round.board, CELLS, true) || !record(round.supply, FAMILY_IDS)) return false;
    if (!integer(round.moves, 0, MAX_MOVES) || !integer(round.merges, 0, round.moves) || !integer(round.nextInstanceId, FIRST_INSTANCE, MAX_INSTANCE)) return false;
    if (!FAMILIES.every(family => integer(round.supply[family.id], 0, RESERVE_UNITS) && round.supply[family.id] % 2 === 0)) return false;
    const mass = { ...round.supply };
    const ids = new Set();
    let count = 0;
    for (const tile of round.board) {
      if (tile === null) continue;
      if (!tileOK(tile, round.nextInstanceId) || ids.has(tile.instanceId)) return false;
      ids.add(tile.instanceId); count++;
      const piece = CATALOG[tile.pieceId];
      mass[piece.familyId] += piece.mass;
    }
    if (!FAMILIES.every(family => mass[family.id] === FAMILY_MATERIAL)) return false;
    const drawn = RESERVE_UNITS * FAMILIES.length - FAMILY_IDS.reduce((sum, id) => sum + round.supply[id], 0);
    const cuts = count - INITIAL_PIECES - drawn + round.merges;
    return cuts >= 0 && round.moves >= drawn / 2 + cuts + round.merges && round.nextInstanceId === FIRST_INSTANCE + drawn + round.merges + 2 * cuts;
  }
  function validRound(round) { try { return roundOK(round); } catch { return false; } }
  function createRound() {
    const board = Array(CELLS).fill(null);
    let nextInstanceId = 1;
    for (const family of FAMILIES) for (const index of INITIAL_POSITIONS[family.id]) board[index] = { pieceId: family.starterId, instanceId: nextInstanceId++ };
    return { board, supply: Object.fromEntries(FAMILY_IDS.map(id => [id, RESERVE_UNITS])), moves: 0, merges: 0, nextInstanceId };
  }
  function newSave() { return { version: PACK_VERSION, round: createRound(), history: [], discoveries: [...STARTERS], sound: true }; }
  function compatible(a, b) {
    const aId = idOf(a);
    const bId = idOf(b);
    return typeof aId === 'string' && aId === bId && nextPiece(aId) !== null;
  }
  function mergePairs(board) {
    if (!Array.isArray(board) || board.length !== CELLS) return [];
    const pairs = [];
    for (let i = 0; i < board.length; i++) for (let j = i + 1; j < board.length; j++) if (compatible(board[i], board[j])) pairs.push([i, j]);
    return pairs;
  }
  function completedFinals(board) { return FINALS.filter(id => Array.isArray(board) && board.some(tile => idOf(tile) === id)); }

  // This reducer assumes a validated round, never mutates it, and never supplies
  // automatically. A rejected action has no cost and does not create Undo history.
  function reduceRound(round, action) {
    if (round.moves === MAX_MOVES) return null;
    const board = round.board.slice();
    let { nextInstanceId, merges } = round;
    let supply = round.supply;
    const tile = pieceId => ({ pieceId, instanceId: nextInstanceId++ });
    if (action.type === 'merge') {
      const { from, to } = action;
      if (!indexOK(from) || !indexOK(to) || from === to || !compatible(board[from], board[to])) return null;
      board[to] = tile(nextPiece(board[from].pieceId).id); board[from] = null; merges++;
    } else if (action.type === 'move') {
      const { from, to } = action;
      if (!indexOK(from) || !indexOK(to) || from === to || !board[from] || board[to] !== null) return null;
      board[to] = board[from]; board[from] = null;
    } else if (action.type === 'cut') {
      const { index } = action;
      const to = own(action, 'to') ? action.to : board.findIndex(t => t === null);
      if (!indexOK(index) || !indexOK(to) || !board[index] || board[to] !== null) return null;
      const piece = pieceOf(board[index].pieceId);
      if (!piece || piece.tier <= 1) return null;
      const previous = previousPiece(piece.id).id;
      board[index] = tile(previous); board[to] = tile(previous);
    } else if (action.type === 'supply') {
      const family = FAMILIES.find(f => f.id === action.familyId);
      const index = own(action, 'index') ? action.index : own(action, 'to') ? action.to : board.findIndex(t => t === null);
      const second = board.findIndex((value, i) => value === null && i !== index);
      if (!family || !indexOK(index) || !indexOK(second) || board[index] !== null || supply[family.id] < 2) return null;
      supply = { ...supply, [family.id]: supply[family.id] - 2 };
      board[index] = tile(family.starterId); board[second] = tile(family.starterId);
    } else return null;
    return { board, supply, moves: round.moves + 1, merges, nextInstanceId };
  }
  function sameTile(a, b) { return a === b || (a !== null && b !== null && a.pieceId === b.pieceId && a.instanceId === b.instanceId); }
  function sameRound(a, b) {
    return a.moves === b.moves && a.merges === b.merges && a.nextInstanceId === b.nextInstanceId && FAMILY_IDS.every(id => a.supply[id] === b.supply[id]) && a.board.every((tile, i) => sameTile(tile, b.board[i]));
  }
  function follows(before, after) {
    if (after.moves !== before.moves + 1) return false;
    const changed = before.board.map((tile, i) => sameTile(tile, after.board[i]) ? -1 : i).filter(i => i !== -1);
    if (changed.length === 2) {
      for (const [from, to] of [changed, [...changed].reverse()]) {
        for (const family of FAMILIES) {
          const candidate = reduceRound(before, { type: 'supply', familyId: family.id, index: from });
          if (candidate && sameRound(candidate, after)) return true;
        }
        for (const type of ['merge', 'move', 'cut']) {
          const candidate = reduceRound(before, { type, from, to, index: from });
          if (candidate && sameRound(candidate, after)) return true;
        }
      }
    }
    return false;
  }
  function validSave(save) {
    try {
      if (!record(save, ['version', 'round', 'history', 'discoveries', 'sound']) || save.version !== PACK_VERSION || typeof save.sound !== 'boolean' || !roundOK(save.round)) return false;
      if (!denseArray(save.history, HISTORY_LIMIT) || !save.history.every(roundOK) || !denseArray(save.discoveries, Object.keys(CATALOG).length)) return false;
      const discovered = new Set(save.discoveries);
      if (discovered.size !== save.discoveries.length || !save.discoveries.every(id => pieceOf(id) !== null) || !STARTERS.every(id => discovered.has(id))) return false;
      // Every higher discovery requires its actual same-family route to be known.
      for (const family of FAMILIES) for (const [index, id] of family.pieceIds.entries()) {
        if (discovered.has(id) && !family.pieceIds.slice(0, index).every(previous => discovered.has(previous))) return false;
      }
      const rounds = [...save.history, save.round];
      if (!rounds.every(round => round.board.every(tile => tile === null || discovered.has(tile.pieceId)))) return false;
      for (let i = 1; i < rounds.length; i++) if (!follows(rounds[i - 1], rounds[i])) return false;
      return true;
    } catch { return false; }
  }
  function serializeSave(save) {
    if (!validSave(save)) throw new TypeError('Invalid matching save; existing storage must be preserved.');
    const raw = JSON.stringify(save);
    if (new TextEncoder().encode(raw).length > MAX_SAVE_BYTES) throw new RangeError('Matching save exceeds the storage size limit.');
    return raw;
  }
  function readSave(raw) {
    const result = (status, save = null) => ({ status, save, sourceRaw: raw });
    if (raw === null || raw === undefined) return result('empty');
    if (typeof raw !== 'string' || raw.length > MAX_SAVE_BYTES || new TextEncoder().encode(raw).length > MAX_SAVE_BYTES) return result('invalid');
    try {
      const save = JSON.parse(raw);
      if (save && typeof save === 'object' && !Array.isArray(save) && own(save, 'version') && integer(save.version, PACK_VERSION + 1, Number.MAX_SAFE_INTEGER)) return result('unsupported');
      return validSave(save) ? result('loaded', save) : result('invalid');
    } catch { return result('invalid'); }
  }
  function actionOK(action) {
    if (!action || typeof action !== 'object') return false;
    const type = Object.getOwnPropertyDescriptor(action, 'type');
    if (!type || !own(type, 'value')) return false;
    if (['move', 'merge'].includes(type.value)) return record(action, ['type', 'from', 'to']);
    if (type.value === 'cut') return record(action, own(action, 'to') ? ['type', 'index', 'to'] : ['type', 'index']);
    if (type.value === 'supply') {
      if (own(action, 'index') && own(action, 'to')) return false;
      return record(action, ['type', 'familyId', ...(own(action, 'index') ? ['index'] : own(action, 'to') ? ['to'] : [])]);
    }
    if (type.value === 'sound') return record(action, ['type', 'enabled']);
    return ['undo', 'reset'].includes(type.value) && record(action, ['type']);
  }
  function act(save, action) {
    if (!validSave(save) || !actionOK(action)) return null;
    if (action.type === 'sound') return typeof action.enabled === 'boolean' && action.enabled !== save.sound ? { ...save, sound: action.enabled } : null;
    if (action.type === 'reset') return { ...newSave(), discoveries: save.discoveries.slice(), sound: save.sound };
    if (action.type === 'undo') {
      if (!save.history.length) return null;
      return { ...save, round: save.history.at(-1), history: save.history.slice(0, -1) };
    }
    const round = reduceRound(save.round, action);
    if (!round) return null;
    const discoveries = [...new Set([...save.discoveries, ...round.board.filter(Boolean).map(tile => tile.pieceId)])];
    return { ...save, round, discoveries, history: [...save.history, save.round].slice(-HISTORY_LIMIT) };
  }

  return Object.freeze({
    ...catalog, STORAGE_KEY, HISTORY_LIMIT, MAX_SAVE_BYTES, MAX_MOVES, INITIAL_POSITIONS,
    createRound, newSave, validRound, validSave, readSave, serializeSave, act,
    compatible, mergePairs, completedFinals,
  });
}
