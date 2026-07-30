import { describe, expect, it } from "vitest";
import {
  CELLS,
  MAX_TIER,
  hasMerge,
  initialBoard,
  resolveMerge,
  spawnTileAt,
} from "../src/gameLogic.js";

const fixed = (value) => () => value;

describe("Moticos game logic", () => {
  it("starts with eight Clip tiles", () => {
    const board = initialBoard(fixed(0));
    expect(board).toHaveLength(CELLS);
    expect(board.filter((value) => value === 0)).toHaveLength(8);
    expect(board.filter((value) => value === null)).toHaveLength(CELLS - 8);
  });

  it("detects whether any merge remains", () => {
    expect(hasMerge([0, 1, 2, 3, null])).toBe(false);
    expect(hasMerge([0, 1, 2, 1, null])).toBe(true);
  });

  it("creates a rescue match instead of allowing a dead board", () => {
    const board = Array(CELLS).fill(null);
    [0, 1, 2, 3, 4, 5, 6].forEach((tier, index) => {
      board[index] = tier;
    });

    const spawned = spawnTileAt(board, fixed(0));
    expect(spawned.tier).toBe(0);
    expect(hasMerge(spawned.board)).toBe(true);
  });

  it("merges equal tiles, scores them, and preserves eight occupied cells", () => {
    const board = initialBoard(fixed(0));
    const result = resolveMerge(board, 0, 1, fixed(0));

    expect(result).not.toBeNull();
    expect(result.newTier).toBe(1);
    expect(result.scoreDelta).toBe(20);
    expect(result.board.filter((value) => value !== null)).toHaveLength(8);
    expect(result.board[1]).toBe(1);
  });

  it("turns two top-tier Moticos into the 500-point clear bonus", () => {
    const board = Array(CELLS).fill(null);
    board[0] = MAX_TIER;
    board[1] = MAX_TIER;

    const result = resolveMerge(board, 0, 1, fixed(0));
    expect(result.bonus).toBe(true);
    expect(result.scoreDelta).toBe(500);
    expect(result.newTier).toBeNull();
    expect(result.board.filter((value) => value !== null)).toHaveLength(1);
  });

  it("rejects unequal and self merges", () => {
    const board = Array(CELLS).fill(null);
    board[0] = 0;
    board[1] = 1;
    expect(resolveMerge(board, 0, 1, fixed(0))).toBeNull();
    expect(resolveMerge(board, 0, 0, fixed(0))).toBeNull();
  });
});
