import {
  chopTileArtwork,
  createFoundTile,
  mergeTileArtwork,
  tileTier,
} from "./collageArt.js";

export const SIZE = 6;
export const CELLS = SIZE * SIZE;
export const MAX_TIER = 7;

export function emptyBoard() {
  return Array(CELLS).fill(null);
}

export function randomEmptyIndex(board, rng = Math.random) {
  const empties = [];
  board.forEach((value, index) => {
    if (value === null) empties.push(index);
  });
  if (empties.length === 0) return -1;
  return empties[Math.floor(rng() * empties.length)];
}

export function hasMerge(board) {
  const seen = new Set();
  for (const value of board) {
    const tier = tileTier(value);
    if (tier === null) continue;
    if (seen.has(tier)) return true;
    seen.add(tier);
  }
  return false;
}

export function chooseSpawnTier(board, rng = Math.random) {
  if (hasMerge(board)) return 0;

  const rescueCandidates = board
    .map(tileTier)
    .filter((tier) => tier !== null && tier < MAX_TIER);
  if (rescueCandidates.length === 0) return 0;
  return rescueCandidates[Math.floor(rng() * rescueCandidates.length)];
}

export function spawnTileAt(board, rng = Math.random) {
  const next = board.slice();
  const index = randomEmptyIndex(next, rng);
  if (index === -1) return { board: next, index, tier: null, tile: null };

  const tier = chooseSpawnTier(next, rng);
  const tile = createFoundTile(tier, rng);
  next[index] = tile;
  return { board: next, index, tier, tile };
}

export function initialBoard(rng = Math.random) {
  let board = emptyBoard();
  for (let count = 0; count < 8; count += 1) {
    board = spawnTileAt(board, rng).board;
  }
  return board;
}

export function resolveMerge(board, fromIndex, toIndex, rng = Math.random) {
  const fromTile = board[fromIndex];
  const toTile = board[toIndex];
  if (
    fromTile === null ||
    toTile === null ||
    fromIndex === toIndex ||
    fromTile.tier !== toTile.tier
  ) {
    return null;
  }

  const next = board.slice();
  let scoreDelta;
  let newTier = null;
  let mergedTile = null;
  let bonus = false;

  if (fromTile.tier === MAX_TIER) {
    next[fromIndex] = null;
    next[toIndex] = null;
    scoreDelta = 500;
    bonus = true;
  } else {
    newTier = fromTile.tier + 1;
    mergedTile = mergeTileArtwork(fromTile, toTile, newTier, rng);
    next[fromIndex] = null;
    next[toIndex] = mergedTile;
    scoreDelta = (fromTile.tier + 2) * 10;
  }

  const spawned = spawnTileAt(next, rng);
  return {
    board: spawned.board,
    spawnedIndex: spawned.index,
    spawnedTier: spawned.tier,
    spawnedTile: spawned.tile,
    mergedIndex: toIndex,
    mergedTile,
    fromTile,
    toTile,
    newTier,
    scoreDelta,
    bonus,
  };
}

export function canChop(board) {
  return board.some((tile) => tile?.tier > 0) && board.some((tile) => tile === null);
}

export function resolveChop(board, rng = Math.random) {
  if (!canChop(board)) return null;

  let targetIndex = -1;
  let targetTier = -1;
  board.forEach((tile, index) => {
    if (tile && tile.tier > targetTier) {
      targetTier = tile.tier;
      targetIndex = index;
    }
  });

  if (targetIndex === -1) return null;
  const sourceTile = board[targetIndex];
  const emptyIndex = randomEmptyIndex(board, rng);
  if (emptyIndex === -1) return null;

  const [first, second] = chopTileArtwork(sourceTile, rng);
  const next = board.slice();
  next[targetIndex] = first;
  next[emptyIndex] = second;

  return {
    board: next,
    sourceTile,
    targetIndex,
    spawnedIndex: emptyIndex,
    newTier: first.tier,
    first,
    second,
  };
}
