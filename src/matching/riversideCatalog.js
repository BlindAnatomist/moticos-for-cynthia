import { createMatchingCatalog } from './catalogFactory.js';

export const RIVERSIDE_CATALOG = createMatchingCatalog({
  id: 'riverside-reverie',
  rows: [
    ['r1', 'map', 1, 'River Map', 'Map', 'A folded cream paper map with teal land and a bold cobalt river.', 'matching/r1'],
    ['r2', 'map', 2, 'River Ridge', 'Ridge', 'The river map folds into two unequal paper peaks.', 'matching/r2'],
    ['r3', 'map', 3, 'River Crossing', 'Crossing', 'The folded map rises into a broad paper arch over an open passage.', 'matching/r3'],
    ['r4', 'map', 4, 'River Cascade', 'Cascade', 'A stepped cream paper tower carries a flowing cobalt waterfall.', 'matching/r4'],
    ['r5', 'map', 5, 'River Citadel', 'Citadel', 'Three folded-map towers gather around a bold central river.', 'matching/r5'],
    ['t1', 'teacup', 1, 'Cream Teacup', 'Teacup', 'A cream paper teacup with a gold rim and an open gold handle.', 'matching/t1'],
    ['t2', 'teacup', 2, 'Ribbon Sip', 'Sip', 'A bold cobalt ribbon of steam curls above the cream teacup.', 'matching/t2'],
    ['t3', 'teacup', 3, 'Tea Chorus', 'Chorus', 'Two teal and coral steam curls open outward above the gold-handled cup.', 'matching/t3'],
    ['t4', 'teacup', 4, 'Pleated Steam', 'Pleats', 'A broad upright fan of pleated paper steam rises from the cream cup.', 'matching/t4'],
    ['t5', 'teacup', 5, 'Ribbon Reverie', 'Reverie', 'An open crown of looping colored paper ribbons rises from the gold-handled cup.', 'matching/t5'],
  ],
  families: [
    { id: 'map', name: 'Map journey', shortName: 'Map', color: '#255f9f', pieceIds: ['r1', 'r2', 'r3', 'r4', 'r5'] },
    { id: 'teacup', name: 'Teacup journey', shortName: 'Teacup', color: '#8f651f', pieceIds: ['t1', 't2', 't3', 't4', 't5'] },
  ],
});
