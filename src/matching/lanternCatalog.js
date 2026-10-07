import { createMatchingCatalog } from './catalogFactory.js';

export const LANTERN_CATALOG = createMatchingCatalog({
  id: 'lantern-studio',
  rows: [
    ['l1', 'lantern', 1, 'Paper Lantern', 'Lantern', 'A squat ochre paper lantern with an open handle and a warm cream window.', 'matching/l1'],
    ['l2', 'lantern', 2, 'Folded Glow', 'Glow', 'The lantern opens into broad pleated sides beneath a triangular top.', 'matching/l2'],
    ['l3', 'lantern', 3, 'Lantern House', 'House', 'A small glowing paper house keeps its lantern handle above a bold roof.', 'matching/l3'],
    ['l4', 'lantern', 4, 'Lantern Tower', 'Tower', 'Two stacked lantern rooms make a tall paper tower with warm windows.', 'matching/l4'],
    ['l5', 'lantern', 5, 'Lantern Palace', 'Palace', 'Three ochre paper turrets gather into a broad palace of glowing windows.', 'matching/l5'],
    ['s1', 'spool', 1, 'Coral Spool', 'Spool', 'A sturdy cream spool is wrapped in a wide band of coral thread.', 'matching/s1'],
    ['s2', 'spool', 2, 'Ribbon Spool', 'Loop', 'One thick colored ribbon loops above the coral-wrapped spool.', 'matching/s2'],
    ['s3', 'spool', 3, 'Ribbon Bloom', 'Bloom', 'Three broad folded ribbon petals blossom from the cream spool.', 'matching/s3'],
    ['s4', 'spool', 4, 'Ribbon Loom', 'Loom', 'A small arched loom grows from the spool with broad woven colored bands.', 'matching/s4'],
    ['s5', 'spool', 5, 'Ribbon Pavilion', 'Pavilion', 'An open-sided ribbon pavilion has a striped folded canopy and a spool-like base.', 'matching/s5'],
  ],
  families: [
    { id: 'lantern', name: 'Lantern journey', shortName: 'Lantern', color: '#93651d', pieceIds: ['l1', 'l2', 'l3', 'l4', 'l5'] },
    { id: 'spool', name: 'Spool journey', shortName: 'Spool', color: '#a04d43', pieceIds: ['s1', 's2', 's3', 's4', 's5'] },
  ],
});
