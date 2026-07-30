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
    if (value === null) continue;
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

export function chooseSpawnTier(board, rng = Math.random) {
  if (hasMerge(board)) return 0;

  const rescueCandidates = board.filter(
    (value) => value !== null && value < MAX_TIER
  );
  if (rescueCandidates.length === 0) return 0;
  return rescueCandidates[Math.floor(rng() * rescueCandidates.length)];
}

export function spawnTileAt(board, rng = Math.random) {
  const next = board.slice();
  const index = randomEmptyIndex(next, rng);
  if (index === -1) return { board: next, index, tier: null };

  const tier = chooseSpawnTier(next, rng);
  next[index] = tier;
  return { board: next, index, tier };
}

export function initialBoard(rng = Math.random) {
  let board = emptyBoard();
  for (let count = 0; count < 8; count += 1) {
    board = spawnTileAt(board, rng).board;
  }
  return board;
}

export function resolveMerge(board, fromIndex, toIndex, rng = Math.random) {
  const fromTier = board[fromIndex];
  if (
    fromTier === null ||
    fromIndex === toIndex ||
    board[toIndex] !== fromTier
  ) {
    return null;
  }

  const next = board.slice();
  let scoreDelta;
  let newTier = null;
  let bonus = false;

  if (fromTier === MAX_TIER) {
    next[fromIndex] = null;
    next[toIndex] = null;
    scoreDelta = 500;
    bonus = true;
  } else {
    newTier = fromTier + 1;
    next[fromIndex] = null;
    next[toIndex] = newTier;
    scoreDelta = (fromTier + 2) * 10;
  }

  const spawned = spawnTileAt(next, rng);
  return {
    board: spawned.board,
    spawnedIndex: spawned.index,
    spawnedTier: spawned.tier,
    mergedIndex: toIndex,
    newTier,
    scoreDelta,
    bonus,
  };
}
