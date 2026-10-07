import { describe, expect, it } from "vitest";
import { AUDIO_PROFILE, MAX_GENTLE_FREQUENCY } from "../src/audioProfile.js";
import { createFoundTile, makeSeededRng, titleForTile } from "../src/collageArt.js";
import {
  CELLS,
  FOUND_COMPOSITION_TIERS,
  MAX_TIER,
  MODE_FOUND,
  MODE_SCRAPS,
  SCRAPS_DISCOVERY_SCHEDULE,
  addScheduledDiscovery,
  canCut,
  hasMerge,
  initialBoard,
  resolveCut,
  resolveMerge,
  spawnTileAt,
  totalLineage,
} from "../src/gameLogic.js";

function tierTile(tier, seed) {
  return createFoundTile(tier, makeSeededRng(seed));
}

function highestPair(board) {
  const indicesByTier = new Map();
  board.forEach((tile, index) => {
    if (!tile) return;
    const indices = indicesByTier.get(tile.tier) ?? [];
    indices.push(index);
    indicesByTier.set(tile.tier, indices);
  });
  const tier = [...indicesByTier.entries()]
    .filter(([, indices]) => indices.length >= 2)
    .map(([value]) => value)
    .sort((a, b) => b - a)[0];
  return tier === undefined ? null : indicesByTier.get(tier).slice(0, 2);
}

function completeRoute(mode, seed = 72) {
  let board = initialBoard(makeSeededRng(seed), mode);
  let mergeCount = 0;
  while (board.filter(Boolean).length > 1) {
    const pair = highestPair(board);
    expect(pair).not.toBeNull();
    const result = resolveMerge(
      board,
      pair[0],
      pair[1],
      makeSeededRng(800 + mergeCount),
      { correspondence: (mergeCount + 1) % 6 === 0 }
    );
    expect(result).not.toBeNull();
    board = result.board;
    mergeCount += 1;
    const discovery = addScheduledDiscovery(
      board,
      mode,
      mergeCount,
      makeSeededRng(1600 + mergeCount)
    );
    if (discovery) board = discovery.board;
  }
  return { board, mergeCount };
}

describe("Moticos game logic", () => {
  it("starts Found Pieces with a full five-by-five 128-scrap composition", () => {
    const board = initialBoard(makeSeededRng(1), MODE_FOUND);
    expect(board).toHaveLength(CELLS);
    expect(board.filter(Boolean)).toHaveLength(FOUND_COMPOSITION_TIERS.length);
    expect(board.filter(Boolean)).toHaveLength(25);
    expect(board.filter((tile) => tile?.tier === 0)).toHaveLength(6);
    expect(board.filter((tile) => tile?.tier === 1)).toHaveLength(5);
    expect(board.filter((tile) => tile?.tier === 2)).toHaveLength(6);
    expect(board.filter((tile) => tile?.tier === 3)).toHaveLength(5);
    expect(board.filter((tile) => tile?.tier === 4)).toHaveLength(3);
    expect(totalLineage(board)).toBe(128);
    expect(hasMerge(board)).toBe(true);
    expect(canCut(board)).toBe(false);
  });

  it("condenses Found Pieces into one Moticos in 24 merges", () => {
    const { board, mergeCount } = completeRoute(MODE_FOUND);
    const [moticos] = board.filter(Boolean);
    expect(mergeCount).toBe(24);
    expect(moticos.tier).toBe(MAX_TIER);
    expect(moticos.lineage).toBe(128);
    expect(totalLineage(board)).toBe(128);
  });

  it("starts From Scraps with 25 individual Clips", () => {
    const board = initialBoard(makeSeededRng(2), MODE_SCRAPS);
    expect(board.filter(Boolean)).toHaveLength(25);
    expect(board.filter((tile) => tile?.tier === 0)).toHaveLength(25);
    expect(totalLineage(board)).toBe(25);
  });

  it("earns seven found pieces and completes From Scraps in 31 merges", () => {
    expect(SCRAPS_DISCOVERY_SCHEDULE).toEqual({
      3: 6,
      6: 4,
      9: 3,
      12: 3,
      15: 2,
      18: 1,
      21: 0,
    });
    const { board, mergeCount } = completeRoute(MODE_SCRAPS, 81);
    const [moticos] = board.filter(Boolean);
    expect(mergeCount).toBe(31);
    expect(moticos.tier).toBe(MAX_TIER);
    expect(moticos.lineage).toBe(128);
  });

  it("preserves ancestry while recomposing a controlled number of motifs", () => {
    const board = initialBoard(makeSeededRng(33), MODE_FOUND);
    const [leftIndex, rightIndex] = board
      .map((tile, index) => (tile?.tier === 0 ? index : -1))
      .filter((index) => index !== -1)
      .slice(0, 2);
    const left = board[leftIndex];
    const right = board[rightIndex];
    const result = resolveMerge(board, leftIndex, rightIndex, makeSeededRng(44));

    expect(result.mergedTile.motifs.length).toBeLessThanOrEqual(5);
    expect(result.mergedTile.motifs[0].role).toBe("focal");
    expect(result.mergedTile.motifs.some((motif) => motif.originSeed === left.seed)).toBe(true);
    expect(result.mergedTile.motifs.some((motif) => motif.originSeed === right.seed)).toBe(true);
    expect(result.board.filter(Boolean)).toHaveLength(24);
    expect(totalLineage(result.board)).toBe(128);
  });

  it("uses a Keepsake to preserve the dragged piece's focal fragment", () => {
    const board = initialBoard(makeSeededRng(41), MODE_FOUND);
    const [leftIndex, rightIndex] = board
      .map((tile, index) => (tile?.tier === 0 ? index : -1))
      .filter((index) => index !== -1)
      .slice(0, 2);
    const focalId = board[leftIndex].focalMotifId;
    const result = resolveMerge(board, leftIndex, rightIndex, makeSeededRng(42), {
      preserveMotifId: focalId,
      correspondence: true,
    });
    const kept = result.mergedTile.motifs.find((motif) => motif.id === focalId);
    expect(kept).toBeTruthy();
    expect(kept.kept).toBe(true);
    expect(result.mergedTile.correspondenceCount).toBeGreaterThan(0);
  });

  it("generates editorial titles without bare numbers, slashes, or Cynthia as debris", () => {
    for (let seed = 1; seed <= 80; seed += 1) {
      const tile = createFoundTile(seed % 8, makeSeededRng(seed));
      const title = titleForTile(tile);
      expect(title).not.toMatch(/\d/);
      expect(title).not.toContain("/");
      expect(title.toUpperCase()).not.toContain("CYNTHIA");
    }
  });

  it("uses only gentle audio filters and low fundamentals", () => {
    Object.values(AUDIO_PROFILE).forEach((profile) => {
      if (profile.frequency) expect(profile.frequency).toBeLessThanOrEqual(MAX_GENTLE_FREQUENCY);
      if (profile.filterType) expect(profile.filterType).not.toBe("highpass");
    });
  });

  it("enables Cut after space exists and preserves total lineage", () => {
    let board = initialBoard(makeSeededRng(90), MODE_FOUND);
    const pair = highestPair(board);
    board = resolveMerge(board, pair[0], pair[1], makeSeededRng(91)).board;
    expect(canCut(board)).toBe(true);
    const result = resolveCut(board, makeSeededRng(66));
    expect(result.board.filter(Boolean)).toHaveLength(25);
    expect(totalLineage(result.board)).toBe(128);
    expect(hasMerge(result.board)).toBe(true);
  });

  it("preserves the rescue-spawn primitive for the later procedural composer", () => {
    const board = Array(CELLS).fill(null);
    [0, 1, 2, 3, 4, 5, 6].forEach((tier, index) => {
      board[index] = tierTile(tier, 100 + index);
    });
    const spawned = spawnTileAt(board, makeSeededRng(22));
    expect(spawned.tier).toBeGreaterThanOrEqual(0);
    expect(spawned.tier).toBeLessThan(MAX_TIER);
    expect(hasMerge(spawned.board)).toBe(true);
  });

  it("rejects unequal and self merges", () => {
    const board = Array(CELLS).fill(null);
    board[0] = tierTile(0, 1);
    board[1] = tierTile(1, 2);
    expect(resolveMerge(board, 0, 1, makeSeededRng(1))).toBeNull();
    expect(resolveMerge(board, 0, 0, makeSeededRng(1))).toBeNull();
  });
});
