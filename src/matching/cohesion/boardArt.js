import { BOARD_ART_BOUNDS as PREVIOUS_BOUNDS, COMPACT_BOARD_LABELS as PREVIOUS_LABELS } from '../expansion160/boardArt.js';
import { COHESION_BOUNDS, COHESION_LABELS } from './bounds.js';

// Only the matching-only revised pictures receive new measured framing.
export const BOARD_ART_BOUNDS = Object.freeze({ ...PREVIOUS_BOUNDS, ...COHESION_BOUNDS });
export const COMPACT_BOARD_LABELS = Object.freeze({ ...PREVIOUS_LABELS, ...COHESION_LABELS });
