import {
  chopTileArtwork,
  createFoundTile,
  mergeTileArtwork,
  tileTier,
} from "./collageArt.js";

export const SIZE = 5;
export const CELLS = SIZE * SIZE;
export const MAX_TIER = 7;

// Twenty inherited pieces carry exactly 128 source scraps. With no automatic
// refill, every legal merge condenses the field until one Motico remains.
// Nineteen merges complete a round; each optional Chop adds one action and
// one later merge, keeping the full session inside the intended 15–30 actions.
export const FOUND_COMPOSITION_TIERS = Object.freeze([
  0, 0, 0, 0,
  1, 1, 1, 1,
  2, 2, 2,
  3, 3, 3, 3, 3,
  4, 4, 4, 4,
]);

export function emptyBoard() {
  return Array(CELLS).fill(null);
}

export function totalLineage(board) {
  return board.reduce((total, tile) => total + (tile?.lineage ?? 0), 0);
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

// Preserved for later procedural-composer work. Human rounds deliberately do
// not call this after every merge; the board should thin and reveal residue.
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
  const board = emptyBoard();
  FOUND_COMPOSITION_TIERS.forEach((tier) => {
    const index = randomEmptyIndex(board, rng);
    board[index] = createFoundTile(tier, rng);
  });
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

  return {
    board: next,
    spawnedIndex: -1,
    spawnedTier: null,
    spawnedTile: null,
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
