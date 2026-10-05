import { BOARD_ART_BOUNDS as BASE_BOUNDS, COMPACT_BOARD_LABELS as BASE_LABELS } from '../boardArt.js';
import { BATCH_BOUNDS, BATCH_LABELS } from './bounds.js';
export const BOARD_ART_BOUNDS = Object.freeze({ ...BASE_BOUNDS, ...BATCH_BOUNDS });
export const COMPACT_BOARD_LABELS = Object.freeze({ ...BASE_LABELS, ...BATCH_LABELS });
