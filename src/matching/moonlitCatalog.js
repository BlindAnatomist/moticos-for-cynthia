import { createMatchingCatalog } from './catalogFactory.js';

export const MOONLIT_CATALOG = createMatchingCatalog({
  id: 'moonlit-passage',
  rows: [
    ['k1', 'key', 1, 'Round Key', 'Key', 'A brass-colored paper key with a round open bow.', 'garden/s03_round_key'],
    ['k2', 'key', 2, 'Frond Key', 'Frond Key', 'A dark teal frond grows from a horizontal gold paper key.', 'garden/e02_frond_key'],
    ['k3', 'key', 3, 'Drawbridge Key', 'Bridge', 'The leafy key opens into a small paper drawbridge.', 'matching/k3'],
    ['k4', 'key', 4, 'Stairway Key', 'Stairkey', 'A cream-and-coral paper stairway wraps an upright gold key.', 'matching/k4'],
    ['k5', 'key', 5, 'Elsewhere Key', 'Elsewhere', 'A folded paper stair-ribbon travels through the round bow of a diagonal gold key.', 'matching/k5'],
    ['m1', 'moon', 1, 'Cobalt Moon', 'Moon', 'A deep cobalt crescent cut from textured paper.', 'garden/s05_cobalt_moon'],
    ['m2', 'moon', 2, 'Crescent Courier', 'Courier', 'A coral bird with a cream belly carries a large cobalt crescent.', 'garden/e04_crescent_courier'],
    ['m3', 'moon', 3, 'Lunar Skiff', 'Skiff', 'A cobalt crescent becomes a small paper skiff with a cream sail and a tiny coral bird.', 'matching/m3'],
    ['m4', 'moon', 4, 'Crescent Balloon', 'Balloon', 'A crescent balloon lifts a little paper basket into the night.', 'matching/m4'],
    ['m5', 'moon', 5, 'Orbit Voyager', 'Voyager', 'A cream paper sky-vessel carries a huge cobalt crescent sail and a tiny coral bird.', 'matching/m5'],
  ],
  families: [
    { id: 'key', name: 'Key journey', shortName: 'Key', color: '#ab793f', pieceIds: ['k1', 'k2', 'k3', 'k4', 'k5'] },
    { id: 'moon', name: 'Moon journey', shortName: 'Moon', color: '#505f99', pieceIds: ['m1', 'm2', 'm3', 'm4', 'm5'] },
  ],
});
