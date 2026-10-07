import { BOARD_ART_BOUNDS as PREVIOUS_BOUNDS, COMPACT_BOARD_LABELS as PREVIOUS_LABELS } from '../batch/boardArt.js';
import { EXPANSION_BOUNDS, EXPANSION_LABELS } from './bounds.js';
export const BOARD_ART_BOUNDS = Object.freeze({ ...PREVIOUS_BOUNDS, ...EXPANSION_BOUNDS });
export const COMPACT_BOARD_LABELS = Object.freeze({ ...PREVIOUS_LABELS, ...EXPANSION_LABELS });
