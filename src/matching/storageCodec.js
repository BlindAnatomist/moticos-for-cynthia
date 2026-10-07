// Lossless storage transport only. Game saves and the reducer remain v1.
// Version 2 makes older readers protect these bytes as an unsupported save.
export const STORAGE_FORMAT = 'moticos-round-delta-v1';
export const STORAGE_VERSION = 2;

const tuple = (value, length) => Array.isArray(value) && value.length === length;
const uint = value => Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const fail = () => { throw new TypeError('Invalid compact matching save.'); };
const packTile = tile => tile === null ? null : [tile.pieceId, tile.instanceId];
const unpackTile = tile => {
  if (tile === null) return null;
  if (!tuple(tile, 2) || typeof tile[0] !== 'string' || !uint(tile[1])) return fail();
  return { pieceId: tile[0], instanceId: tile[1] };
};
const sameTile = (a, b) => a === b || (a !== null && b !== null && a.pieceId === b.pieceId && a.instanceId === b.instanceId);

// A corruption detector, not authentication. The strict game validator remains
// authoritative after decoding. Work and expansion are bounded independently.
function checksum(raw) {
  let value = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) value = Math.imul(value ^ raw.charCodeAt(i), 0x01000193);
  return (value >>> 0).toString(16).padStart(8, '0');
}

export function encodeStoredSave(save, familyIds) {
  const rounds = [...save.history, save.round];
  const stats = round => [familyIds.map(id => round.supply[id]), round.moves, round.merges, round.nextInstanceId];
  const first = rounds[0];
  const changes = rounds.slice(1).map((round, index) => [
    round.board.flatMap((tile, cell) => sameTile(rounds[index].board[cell], tile) ? [] : [[cell, packTile(tile)]]),
    ...stats(round),
  ]);
  const data = [save.version, [...familyIds], [first.board.map(packTile), ...stats(first)], changes, [...save.discoveries], save.sound];
  return JSON.stringify({ version: STORAGE_VERSION, format: STORAGE_FORMAT, data, checksum: checksum(JSON.stringify(data)) });
}

export function decodeStoredSave(value, { familyIds, cells, historyLimit }) {
  if (!value || Object.keys(value).length !== 4 || value.version !== STORAGE_VERSION || value.format !== STORAGE_FORMAT ||
      typeof value.checksum !== 'string' || value.checksum !== checksum(JSON.stringify(value.data))) return fail();
  const data = value.data;
  if (!tuple(data, 6) || data[0] !== 1 || !tuple(data[1], familyIds.length) || !data[1].every((id, i) => id === familyIds[i]) ||
      !Array.isArray(data[3]) || data[3].length > historyLimit || !Array.isArray(data[4]) || typeof data[5] !== 'boolean') return fail();
  const unpackRound = (packed, board) => {
    if (!tuple(packed, 5) || !tuple(packed[1], familyIds.length) || !packed[1].every(uint) || !packed.slice(2).every(uint)) return fail();
    return { board, supply: Object.fromEntries(familyIds.map((id, i) => [id, packed[1][i]])), moves: packed[2], merges: packed[3], nextInstanceId: packed[4] };
  };
  if (!tuple(data[2], 5) || !tuple(data[2][0], cells)) return fail();
  const rounds = [unpackRound(data[2], data[2][0].map(unpackTile))];
  for (const packed of data[3]) {
    // Every legal move changes exactly two cells; sound/Undo are not new rounds.
    if (!tuple(packed, 5) || !tuple(packed[0], 2)) return fail();
    const board = rounds.at(-1).board.slice();
    const seen = new Set();
    for (const change of packed[0]) {
      if (!tuple(change, 2) || !uint(change[0]) || change[0] >= cells || seen.has(change[0])) return fail();
      seen.add(change[0]); board[change[0]] = unpackTile(change[1]);
    }
    rounds.push(unpackRound(packed, board));
  }
  return { version: data[0], round: rounds.at(-1), history: rounds.slice(0, -1), discoveries: data[4], sound: data[5] };
}
