import { createMatchingCatalog } from './catalogFactory.js';

// This garden definition and its legacy exports remain stable for version-one saves.
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
export const GARDEN_CATALOG = createMatchingCatalog({
  id: 'matching-garden', rows,
  families: [
    { id: 'bird', name: 'Bird journey', shortName: 'Bird', color: '#c96653', pieceIds: ['b1', 'b2', 'b3', 'b4', 'b5'] },
    { id: 'fern', name: 'Fern journey', shortName: 'Fern', color: '#28796f', pieceIds: ['f1', 'f2', 'f3', 'f4', 'f5'] },
  ],
});
export const {
  BOARD_SIZE, PACK_ID, PACK_VERSION, FAMILY_MATERIAL,
  PIECES, CATALOG, FAMILIES, STARTERS, FINALS,
  pieceOf, idOf, nextPiece, previousPiece, nameOf,
} = GARDEN_CATALOG;
