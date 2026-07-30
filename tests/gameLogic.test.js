import { describe, expect, it } from "vitest";
import { createFoundTile, makeSeededRng, titleForTile } from "../src/collageArt.js";
import {
  CELLS,
  FOUND_COMPOSITION_TIERS,
  MAX_TIER,
  canChop,
  hasMerge,
  initialBoard,
  resolveChop,
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

describe("Moticos game logic", () => {
  it("starts with a five-by-five found composition carrying exactly 128 scraps", () => {
    const board = initialBoard(makeSeededRng(1));
    expect(board).toHaveLength(CELLS);
    expect(board.filter(Boolean)).toHaveLength(FOUND_COMPOSITION_TIERS.length);
    expect(board.filter((tile) => tile === null)).toHaveLength(5);
    expect(board.filter((tile) => tile?.tier === 0)).toHaveLength(4);
    expect(board.filter((tile) => tile?.tier === 1)).toHaveLength(4);
    expect(board.filter((tile) => tile?.tier === 2)).toHaveLength(3);
    expect(board.filter((tile) => tile?.tier === 3)).toHaveLength(5);
    expect(board.filter((tile) => tile?.tier === 4)).toHaveLength(4);
    expect(new Set(board.filter(Boolean).map((tile) => tile.seed)).size).toBe(20);
    expect(totalLineage(board)).toBe(128);
    expect(hasMerge(board)).toBe(true);
  });

  it("detects whether any equal tier remains", () => {
    expect(hasMerge([tierTile(0, 1), tierTile(1, 2), tierTile(2, 3), null])).toBe(false);
    expect(hasMerge([tierTile(0, 1), tierTile(1, 2), tierTile(1, 3), null])).toBe(true);
  });

  it("preserves the rescue-spawn primitive for future procedural composition", () => {
    const board = Array(CELLS).fill(null);
    [0, 1, 2, 3, 4, 5, 6].forEach((tier, index) => {
      board[index] = tierTile(tier, 100 + index);
    });

    const spawned = spawnTileAt(board, makeSeededRng(22));
    expect(spawned.tier).toBeGreaterThanOrEqual(0);
    expect(spawned.tier).toBeLessThan(MAX_TIER);
    expect(hasMerge(spawned.board)).toBe(true);
  });

  it("merges equal pieces without refilling the human board", () => {
    const board = initialBoard(makeSeededRng(33));
    const [leftIndex, rightIndex] = board
      .map((tile, index) => (tile?.tier === 0 ? index : -1))
      .filter((index) => index !== -1)
      .slice(0, 2);
    const left = board[leftIndex];
    const right = board[rightIndex];
    const result = resolveMerge(board, leftIndex, rightIndex, makeSeededRng(44));

    expect(result).not.toBeNull();
    expect(result.newTier).toBe(1);
    expect(result.scoreDelta).toBe(20);
    expect(result.spawnedIndex).toBe(-1);
    expect(result.board.filter(Boolean)).toHaveLength(19);
    expect(totalLineage(result.board)).toBe(128);
    expect(result.mergedTile.lineage).toBe(left.lineage + right.lineage);
    expect(result.mergedTile.motifs.some((motif) => motif.originSeed === left.seed)).toBe(true);
    expect(result.mergedTile.motifs.some((motif) => motif.originSeed === right.seed)).toBe(true);
    expect(titleForTile(result.mergedTile)).toMatch(/\S+/);
  });

  it("always condenses the curated composition into one Motico in 19 merges", () => {
    let board = initialBoard(makeSeededRng(72));
    let mergeCount = 0;

    while (board.filter(Boolean).length > 1) {
      const pair = highestPair(board);
      expect(pair).not.toBeNull();
      const result = resolveMerge(board, pair[0], pair[1], makeSeededRng(800 + mergeCount));
      expect(result).not.toBeNull();
      board = result.board;
      mergeCount += 1;
    }

    const [motico] = board.filter(Boolean);
    expect(mergeCount).toBe(19);
    expect(motico.tier).toBe(MAX_TIER);
    expect(motico.lineage).toBe(128);
    expect(totalLineage(board)).toBe(128);
  });

  it("merges two Correspondence pieces into one 128-scrap Motico", () => {
    const board = Array(CELLS).fill(null);
    board[0] = tierTile(MAX_TIER - 1, 70);
    board[1] = tierTile(MAX_TIER - 1, 71);

    const result = resolveMerge(board, 0, 1, makeSeededRng(72));
    expect(result.bonus).toBe(false);
    expect(result.newTier).toBe(MAX_TIER);
    expect(result.mergedTile.tier).toBe(MAX_TIER);
    expect(result.mergedTile.lineage).toBe(128);
    expect(result.board.filter((tile) => tile?.tier === MAX_TIER)).toHaveLength(1);
  });

  it("turns two top-tier Moticos into the 500-point clear bonus", () => {
    const board = Array(CELLS).fill(null);
    board[0] = tierTile(MAX_TIER, 1);
    board[1] = tierTile(MAX_TIER, 2);

    const result = resolveMerge(board, 0, 1, makeSeededRng(55));
    expect(result.bonus).toBe(true);
    expect(result.scoreDelta).toBe(500);
    expect(result.newTier).toBeNull();
    expect(result.board.filter(Boolean)).toHaveLength(0);
  });

  it("Chop preserves total lineage while adding one later merge", () => {
    const board = initialBoard(makeSeededRng(90));
    expect(canChop(board)).toBe(true);
    const result = resolveChop(board, makeSeededRng(66));
    expect(result.sourceTile.tier).toBe(4);
    expect(result.first.tier).toBe(3);
    expect(result.second.tier).toBe(3);
    expect(result.board.filter(Boolean)).toHaveLength(21);
    expect(totalLineage(result.board)).toBe(128);
    expect(hasMerge(result.board)).toBe(true);
  });

  it("rejects unequal and self merges", () => {
    const board = Array(CELLS).fill(null);
    board[0] = tierTile(0, 1);
    board[1] = tierTile(1, 2);
    expect(resolveMerge(board, 0, 1, makeSeededRng(1))).toBeNull();
    expect(resolveMerge(board, 0, 0, makeSeededRng(1))).toBeNull();
  });
});
