import {BOARD_ART_BOUNDS as OLD, COMPACT_BOARD_LABELS as LABELS} from '../matching/cohesion/boardArt.js';
import {EXPANSION200_BOUNDS,EXPANSION200_LABELS} from '../matching/expansion200/bounds.js';
import {EXPANSION240_BOUNDS,EXPANSION240_LABELS} from '../matching/expansion240/bounds.js';
import {EXPANSION280_BOUNDS,EXPANSION280_LABELS} from '../matching/expansion280/bounds.js';
import {EXPANSION320_BOUNDS,EXPANSION320_LABELS} from '../matching/expansion320/bounds.js';
export const BOARD_ART_BOUNDS=Object.freeze({...OLD,...EXPANSION200_BOUNDS,...EXPANSION240_BOUNDS,...EXPANSION280_BOUNDS,...EXPANSION320_BOUNDS});
export const COMPACT_BOARD_LABELS=Object.freeze({...LABELS,...EXPANSION200_LABELS,...EXPANSION240_LABELS,...EXPANSION280_LABELS,...EXPANSION320_LABELS});
