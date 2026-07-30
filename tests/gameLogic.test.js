import { describe, expect, it } from "vitest";
import { createFoundTile, makeSeededRng, titleForTile } from "../src/collageArt.js";
import {
  CELLS,
  MAX_TIER,
  canChop,
  hasMerge,
  initialBoard,
  resolveChop,
  resolveMerge,
  spawnTileAt,
} from "../src/gameLogic.js";

function tierTile(tier, seed) {
  return createFoundTile(tier, makeSeededRng(seed));
}

describe("Moticos game logic", () => {
  it("starts with eight unique Clip artworks", () => {
    const board = initialBoard(makeSeededRng(1));
    expect(board).toHaveLength(CELLS);
    expect(board.filter((tile) => tile?.tier === 0)).toHaveLength(8);
    expect(board.filter((tile) => tile === null)).toHaveLength(CELLS - 8);
    expect(new Set(board.filter(Boolean).map((tile) => tile.seed)).size).toBe(8);
  });

  it("detects whether any equal tier remains", () => {
    expect(hasMerge([tierTile(0, 1), tierTile(1, 2), tierTile(2, 3), null])).toBe(false);
    expect(hasMerge([tierTile(0, 1), tierTile(1, 2), tierTile(1, 3), null])).toBe(true);
  });

  it("creates a rescue match instead of allowing a dead board", () => {
    const board = Array(CELLS).fill(null);
    [0, 1, 2, 3, 4, 5, 6].forEach((tier, index) => {
      board[index] = tierTile(tier, 100 + index);
    });

    const spawned = spawnTileAt(board, makeSeededRng(22));
    expect(spawned.tier).toBeGreaterThanOrEqual(0);
    expect(spawned.tier).toBeLessThan(MAX_TIER);
    expect(hasMerge(spawned.board)).toBe(true);
  });

  it("merges equal pieces and visibly preserves both parents", () => {
    const board = initialBoard(makeSeededRng(33));
    const [leftIndex, rightIndex] = board
      .map((tile, index) => (tile ? index : -1))
      .filter((index) => index !== -1)
      .slice(0, 2);
    const left = board[leftIndex];
    const right = board[rightIndex];
    const result = resolveMerge(board, leftIndex, rightIndex, makeSeededRng(44));

    expect(result).not.toBeNull();
    expect(result.newTier).toBe(1);
    expect(result.scoreDelta).toBe(20);
    expect(result.board.filter(Boolean)).toHaveLength(8);
    expect(result.mergedTile.lineage).toBe(left.lineage + right.lineage);
    expect(result.mergedTile.motifs.some((motif) => motif.originSeed === left.seed)).toBe(true);
    expect(result.mergedTile.motifs.some((motif) => motif.originSeed === right.seed)).toBe(true);
    expect(titleForTile(result.mergedTile)).toMatch(/\S+/);
  });

  it("turns two top-tier Moticos into the 500-point clear bonus", () => {
    const board = Array(CELLS).fill(null);
    board[0] = tierTile(MAX_TIER, 1);
    board[1] = tierTile(MAX_TIER, 2);

    const result = resolveMerge(board, 0, 1, makeSeededRng(55));
    expect(result.bonus).toBe(true);
    expect(result.scoreDelta).toBe(500);
    expect(result.newTier).toBeNull();
    expect(result.board.filter(Boolean)).toHaveLength(1);
  });

  it("Chop splits the highest artwork into a matching lower-tier pair", () => {
    const board = Array(CELLS).fill(null);
    board[0] = tierTile(3, 90);
    board[1] = tierTile(0, 91);

    expect(canChop(board)).toBe(true);
    const result = resolveChop(board, makeSeededRng(66));
    expect(result.sourceTile.tier).toBe(3);
    expect(result.first.tier).toBe(2);
    expect(result.second.tier).toBe(2);
    expect(result.board.filter((tile) => tile?.tier === 2)).toHaveLength(2);
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
