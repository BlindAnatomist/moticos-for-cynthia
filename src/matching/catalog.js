// Matching identity is explicit: equal piece IDs only, within one authored family.
export const BOARD_SIZE = 5;
export const PACK_ID = 'matching-garden';
export const PACK_VERSION = 1;
export const FAMILY_MATERIAL = 16;
const base = import.meta.env?.BASE_URL ?? '/';
const rows = [
  ['b1', 'bird', 1, 'Coral Bird', 'Bird', 'A coral paper bird with a dark teal wing.', 'garden/s01_coral_bird'],
  ['b2', 'bird', 2, 'Riverwing', 'Riverwing', 'The coral bird carries a blue river inside its paper wing.', 'garden/e01_riverwing'],
  ['b3', 'bird', 3, 'Wayfinder', 'Wayfinder', 'The map-winged bird finds a leafy garden gate.', 'garden/e03_wayfinder_garden'],
  ['b4', 'bird', 4, 'Aviary Gate', 'Gate', 'A garden arch gathers the bird, river, and foliage into a growing aviary.', 'matching/b4'],
  ['b5', 'bird', 5, 'Wandering Aviary', 'Aviary', 'The bird’s journey becomes a complete wandering garden.', 'matching/b5'],
  ['f1', 'fern', 1, 'Teal Fern', 'Fern', 'An unfurling dark teal paper fern.', 'garden/s04_teal_fern'],
  ['f2', 'fern', 2, 'Fern Cup', 'Fern Cup', 'The fern grows from a cream paper teacup.', 'garden/e05_fern_cup'],
  ['f3', 'fern', 3, 'Nightgarden', 'Nightgarden', 'The fern-filled cup becomes a small moonlit garden.', 'garden/e06_nightgarden_nest'],
  ['f4', 'fern', 4, 'Moonlit Arbor', 'Arbor', 'An arbor of paper fronds opens around the moonlit garden.', 'matching/f4'],
  ['f5', 'fern', 5, 'Lunar Conservatory', 'Moonhouse', 'Fern, cup, and moon become a complete luminous conservatory.', 'matching/f5'],
];
export const PIECES = Object.freeze(rows.map(([id, familyId, tier, name, shortName, description, asset]) => Object.freeze({
  id, familyId, tier, rank: tier - 1, name, shortName, description, packId: PACK_ID,
  mass: 2 ** (tier - 1), art: `${base}art/${asset}.webp`,
})));
export const CATALOG = Object.freeze(Object.fromEntries(PIECES.map(piece => [piece.id, piece])));
export const FAMILIES = Object.freeze([
  { id: 'bird', name: 'Bird journey', shortName: 'Bird', color: '#c96653', prefix: 'b' },
  { id: 'fern', name: 'Fern journey', shortName: 'Fern', color: '#28796f', prefix: 'f' },
].map(({ prefix, ...family }) => Object.freeze({
  ...family, pieceIds: Object.freeze([1, 2, 3, 4, 5].map(tier => `${prefix}${tier}`)),
  starterId: `${prefix}1`, finalId: `${prefix}5`, material: FAMILY_MATERIAL,
})));
export const STARTERS = Object.freeze(FAMILIES.map(family => family.starterId));
export const FINALS = Object.freeze(FAMILIES.map(family => family.finalId));
export function pieceOf(id) { return typeof id === 'string' && Object.hasOwn(CATALOG, id) ? CATALOG[id] : null; }
export function nextPiece(id) {
  const piece = pieceOf(id);
  return piece && piece.tier < 5 ? pieceOf(`${id[0]}${piece.tier + 1}`) : null;
}
export function idOf(tile) {
  if (typeof tile === 'string') return pieceOf(tile)?.id ?? null;
  if (!tile || typeof tile !== 'object' || Object.getPrototypeOf(tile) !== Object.prototype) return null;
  const property = Object.getOwnPropertyDescriptor(tile, 'pieceId');
  return property && Object.hasOwn(property, 'value') ? pieceOf(property.value)?.id ?? null : null;
}
export function nameOf(tile) { return pieceOf(idOf(tile))?.name ?? ''; }
