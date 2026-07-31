import {
  cutTileArtwork,
  createFoundTile,
  mergeTileArtwork,
  tileTier,
} from "./collageArt.js";

export const SIZE = 5;
export const CELLS = SIZE * SIZE;
export const MAX_TIER = 7;

export const MODE_FOUND = "found";
export const MODE_SCRAPS = "scraps";

// Twenty-five inherited pieces carry exactly 128 source scraps. With no
// automatic refill, the board condenses to one Moticos in twenty-four merges.
export const FOUND_COMPOSITION_TIERS = Object.freeze([
  0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 1,
  2, 2, 2, 2, 2, 2,
  3, 3, 3, 3, 3,
  4, 4, 4,
]);

export const SCRAPS_COMPOSITION_TIERS = Object.freeze(Array(CELLS).fill(0));

// From Scraps begins with 25 individual Clips. Seven earned found pieces add
// the remaining 103 scraps required for the same 128-scrap Moticos. The route
// takes 31 merges and remains solvable under the deterministic highest-pair gate.
export const SCRAPS_DISCOVERY_SCHEDULE = Object.freeze({
  3: 6,
  6: 4,
  9: 3,
  12: 3,
  15: 2,
  18: 1,
  21: 0,
});

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

export function spawnSpecificTier(board, tier, rng = Math.random) {
  const next = board.slice();
  const index = randomEmptyIndex(next, rng);
  if (index === -1) return { board: next, index, tier: null, tile: null };
  const tile = createFoundTile(tier, rng, { discovered: true });
  next[index] = tile;
  return { board: next, index, tier, tile };
}

// Preserved for the later procedural composer. Human rounds deliberately do
// not call this after every merge.
export function spawnTileAt(board, rng = Math.random) {
  return spawnSpecificTier(board, chooseSpawnTier(board, rng), rng);
}

export function initialBoard(rng = Math.random, mode = MODE_FOUND) {
  const tiers = mode === MODE_SCRAPS
    ? SCRAPS_COMPOSITION_TIERS
    : FOUND_COMPOSITION_TIERS;
  const board = emptyBoard();
  tiers.forEach((tier) => {
    const index = randomEmptyIndex(board, rng);
    board[index] = createFoundTile(tier, rng, {
      discovered: mode === MODE_FOUND && tier > 0,
    });
  });
  return board;
}

export function scheduledDiscoveryTier(mode, completedMerges) {
  if (mode !== MODE_SCRAPS) return null;
  return SCRAPS_DISCOVERY_SCHEDULE[completedMerges] ?? null;
}

export function addScheduledDiscovery(board, mode, completedMerges, rng = Math.random) {
  const tier = scheduledDiscoveryTier(mode, completedMerges);
  if (tier === null) return null;
  return spawnSpecificTier(board, tier, rng);
}

export function resolveMerge(
  board,
  fromIndex,
  toIndex,
  rng = Math.random,
  options = {}
) {
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
    mergedTile = mergeTileArtwork(fromTile, toTile, newTier, rng, {
      preserveMotifId: options.preserveMotifId ?? null,
      correspondence: Boolean(options.correspondence),
    });
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

export function canCut(board) {
  return board.some((tile) => tile?.tier > 0) && board.some((tile) => tile === null);
}

export function resolveCut(board, rng = Math.random) {
  if (!canCut(board)) return null;

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

  const [first, second] = cutTileArtwork(sourceTile, rng);
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

// Compatibility aliases for documentation-only commits and old evidence.
export const canChop = canCut;
export const resolveChop = resolveCut;
