import {BOARD_ART_BOUNDS as OLD, COMPACT_BOARD_LABELS as LABELS} from '../matching/cohesion/boardArt.js';
import {EXPANSION200_BOUNDS,EXPANSION200_LABELS} from '../matching/expansion200/bounds.js';
import {EXPANSION240_BOUNDS,EXPANSION240_LABELS} from '../matching/expansion240/bounds.js';
export const BOARD_ART_BOUNDS=Object.freeze({...OLD,...EXPANSION200_BOUNDS,...EXPANSION240_BOUNDS});
export const COMPACT_BOARD_LABELS=Object.freeze({...LABELS,...EXPANSION200_LABELS,...EXPANSION240_LABELS});
