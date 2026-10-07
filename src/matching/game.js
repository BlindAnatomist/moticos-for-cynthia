import { GARDEN_CATALOG } from './catalog.js';
import { createMatchingEngine } from './engine.js';

// Backward-compatible garden-only API. The registry owns additional envelopes.
export const GARDEN_ENGINE = createMatchingEngine({ catalog: GARDEN_CATALOG, storageKey: 'moticos.matching.garden.v1' });
export const {
  STORAGE_KEY, HISTORY_LIMIT, MAX_SAVE_BYTES, MAX_MOVES, INITIAL_POSITIONS,
  BOARD_SIZE, nextPiece, createRound, newSave, validRound, validSave, readSave,
  serializeSave, act, compatible, mergePairs, completedFinals,
} = GARDEN_ENGINE;
