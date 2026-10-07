import { BOARD_SIZE, CATALOG, STARTERS, FINALS, RECIPES, BIRD, MAP, KEY, FERN, MOON, CUP, PACK_ID, PACK_VERSION, recipeFor } from './catalog.js';
export const STORAGE_KEY = 'moticos.collection.garden.v1';
export const INITIAL_IDS = Object.freeze([BIRD, MAP, KEY, FERN, BIRD, MOON, CUP, FERN]);
const initialPositions = [6, 8, 10, 12, 14, 16, 18, 22];
export function createRound() {
  const board = Array(BOARD_SIZE ** 2).fill(null);
  INITIAL_IDS.forEach((pieceId, i) => { board[initialPositions[i]] = { pieceId, parents: null }; });
  return { board, moves: 0, merges: 0 };
}
export function compatible(a, b) { return Boolean(recipeFor(a?.pieceId, b?.pieceId)); }
export function mergePieces(round, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return null;
  const a = round.board[from], b = round.board[to];
  const recipe = recipeFor(a?.pieceId, b?.pieceId);
  if (!recipe) return null;
  const board = round.board.slice();
  board[from] = null;
  board[to] = { pieceId: recipe.result, parents: [a, b] };
  return { ...round, board, moves: round.moves + 1, merges: round.merges + 1 };
}
export function movePiece(round, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || to < 0 || to >= round.board.length || !round.board[from] || round.board[to]) return null;
  const board = round.board.slice();
  board[to] = board[from]; board[from] = null;
  return { ...round, board, moves: round.moves + 1 };
}
export function cutPiece(round, index) {
  const source = round.board[index];
  const empty = round.board.findIndex(tile => !tile);
  if (!source?.parents || empty === -1) return null;
  const board = round.board.slice();
  [board[index], board[empty]] = source.parents;
  return { ...round, board, moves: round.moves + 1 };
}
export function availableRecipes(board) {
  return RECIPES.filter(recipe => recipe.parents.every(id => board.some(tile => tile?.pieceId === id)));
}
export function mergePairs(board) {
  const result = [];
  board.forEach((a, i) => board.forEach((b, j) => { if (j > i && compatible(a, b)) result.push([i, j]); }));
  return result;
}
export function completedFinals(board) { return FINALS.filter(id => board.some(tile => tile?.pieceId === id)); }
export function leafIds(tile) { return tile.parents ? tile.parents.flatMap(leafIds) : [tile.pieceId]; }
function validTile(tile, depth = 0) {
  if (tile === null) return true;
  if (!tile || depth > 4 || !CATALOG[tile.pieceId]) return false;
  if (CATALOG[tile.pieceId].rank === 0) return tile.parents === null;
  return Array.isArray(tile.parents) && tile.parents.length === 2 && tile.parents.every(p => p && validTile(p, depth + 1)) && recipeFor(tile.parents[0].pieceId, tile.parents[1].pieceId)?.result === tile.pieceId;
}
export function validRound(round) {
  if (!round || !Array.isArray(round.board) || round.board.length !== BOARD_SIZE ** 2 || !round.board.every(t => validTile(t))) return false;
  if (!Number.isSafeInteger(round.moves) || round.moves < 0 || !Number.isSafeInteger(round.merges) || round.merges < 0 || round.merges > round.moves) return false;
  const actual = round.board.filter(Boolean).flatMap(leafIds).sort().join('|');
  return actual === [...INITIAL_IDS].sort().join('|');
}
export function newSave() { return { packId: PACK_ID, version: PACK_VERSION, round: createRound(), discoveries: [...STARTERS], history: [], sound: true }; }
export function parseSave(raw) {
  if (!raw) return null;
  try {
    const save = JSON.parse(raw);
    if (save.packId !== PACK_ID || save.version !== PACK_VERSION || !validRound(save.round)) return null;
    return { ...newSave(), round: save.round,
      discoveries: [...new Set([...STARTERS, ...(Array.isArray(save.discoveries) ? save.discoveries.filter(id => typeof id === 'string' && Object.hasOwn(CATALOG, id)) : []), ...save.round.board.filter(Boolean).map(t => t.pieceId)])],
      history: Array.isArray(save.history) ? save.history.slice(-100).filter(validRound) : [],
      sound: typeof save.sound === 'boolean' ? save.sound : true,
    };
  } catch { return null; }
}
