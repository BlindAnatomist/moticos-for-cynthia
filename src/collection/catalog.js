// Catalog identity is independent of rank, arrangement, and artwork filenames.
// New packs supply data; recipe validation and interaction rules stay shared.
export const PACK_ID = 'garden-correspondence';
export const PACK_VERSION = 1;
export const BOARD_SIZE = 5;
export const BIRD = 's01_coral_bird';
export const MAP = 's02_river_map';
export const KEY = 's03_round_key';
export const FERN = 's04_teal_fern';
export const MOON = 's05_cobalt_moon';
export const CUP = 's06_cream_teacup';

const rows = [
  [BIRD, 'Coral bird', 'Bird', 0, 'A coral paper bird with a dark teal wing.'],
  [MAP, 'River map', 'Map', 0, 'A folded cream map with a blue river.'],
  [KEY, 'Round key', 'Key', 0, 'A golden key with a round handle.'],
  [FERN, 'Teal fern', 'Fern', 0, 'An unfurling dark teal paper fern.'],
  [MOON, 'Cobalt moon', 'Moon', 0, 'A vivid cobalt crescent moon.'],
  [CUP, 'Cream teacup', 'Cup', 0, 'A cream cup edged in golden yellow.'],
  ['e01_riverwing', 'Riverwing', 'Riverwing', 1, 'The bird carries the river map inside its wing.'],
  ['e02_frond_key', 'Frond Key', 'Frond Key', 1, 'A fern grows from a golden key.'],
  ['e04_crescent_courier', 'Crescent Courier', 'Moonbird', 1, 'A coral bird carries a cobalt crescent.'],
  ['e05_fern_cup', 'Fern Cup', 'Fern Cup', 1, 'A small fern grows from a cream teacup.'],
  ['e03_wayfinder_garden', 'Wayfinder Garden', 'Wayfinder', 2, 'A map-winged bird perches on a golden key beneath a fern.'],
  ['e06_nightgarden_nest', 'Nightgarden Nest', 'Nightgarden', 2, 'A moon-bearing bird rests in a fern-filled teacup.'],
];
export const PIECES = Object.freeze(rows.map(([id, name, shortName, rank, description]) => Object.freeze({
  id, name, shortName, rank, description, packId: PACK_ID,
  art: `${import.meta.env?.BASE_URL ?? '/'}art/garden/${id}.webp`,
})));
export const CATALOG = Object.freeze(Object.fromEntries(PIECES.map(piece => [piece.id, piece])));
export const STARTERS = Object.freeze(PIECES.filter(p => p.rank === 0).map(p => p.id));
export const FINALS = Object.freeze(PIECES.filter(p => p.rank === 2).map(p => p.id));
export const RECIPES = Object.freeze([
  { parents: [BIRD, MAP], result: 'e01_riverwing', clue: 'A traveler needs a map.' },
  { parents: [KEY, FERN], result: 'e02_frond_key', clue: 'A key to a growing garden.' },
  { parents: [BIRD, MOON], result: 'e04_crescent_courier', clue: 'A traveler of the night.' },
  { parents: [CUP, FERN], result: 'e05_fern_cup', clue: 'A little garden in a cup.' },
  { parents: ['e01_riverwing', 'e02_frond_key'], result: 'e03_wayfinder_garden', clue: 'Bring the traveler to the garden gate.' },
  { parents: ['e04_crescent_courier', 'e05_fern_cup'], result: 'e06_nightgarden_nest', clue: 'Give the night traveler a place to rest.' },
].map(r => Object.freeze({ ...r, parents: Object.freeze(r.parents) })));
const pairKey = (a, b) => [a, b].sort().join('|');
const recipesByPair = new Map(RECIPES.map(r => [pairKey(...r.parents), r]));
export function recipeFor(a, b) {
  return a && b ? recipesByPair.get(pairKey(a, b)) ?? null : null;
}
export function nameOf(tile) { return CATALOG[tile?.pieceId]?.name ?? ''; }
