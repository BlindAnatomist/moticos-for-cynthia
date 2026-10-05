import { createSingleFamilyTrialCatalog } from '../catalogFactory.js';
import { createSingleFamilyTrialEngine } from '../engine.js';

// Imported source assets are emitted only by the explicitly enabled trial build.
const art = Object.freeze({
  p1: new URL('./art/p1.webp', import.meta.url).href,
  p2: new URL('./art/p2.webp', import.meta.url).href,
  p3: new URL('./art/p3.webp', import.meta.url).href,
  p4: new URL('./art/p4.webp', import.meta.url).href,
  p5: new URL('./art/p5.webp', import.meta.url).href,
});
export const LIGHT_LETTER_CATALOG = createSingleFamilyTrialCatalog({
  id: 'trial-light-letter',
  artUrl: asset => art[asset],
  families: [{ id: 'light-letter', name: 'Light / Letter', shortName: 'Light', color: '#486977', pieceIds: ['ll1', 'll2', 'll3', 'll4', 'll5'] }],
  rows: [
  [
    "ll1",
    "light-letter",
    1,
    "Light",
    "Light",
    "A broad black lantern print on an irregular ivory clipping, with an oval handle, lozenge flame and red strip.",
    "p1"
  ],
  [
    "ll2",
    "light-letter",
    2,
    "See Light",
    "Eye",
    "A long halftone eye holds the inherited lantern as an off-center pupil.",
    "p2"
  ],
  [
    "ll3",
    "light-letter",
    3,
    "Letter Window",
    "Letter",
    "A tall blue-and-ivory envelope carries an eye fragment on its open triangular flap above the lantern window.",
    "p3"
  ],
  [
    "ll4",
    "light-letter",
    4,
    "Reply",
    "Reply",
    "Two open letter fragments face across an empty V: an eye on one side and the lantern on the other.",
    "p4"
  ],
  [
    "ll5",
    "light-letter",
    5,
    "Light Letter",
    "Moticos",
    "A C-shaped collage recycles the handle, eye, envelope and base around a lantern-shaped absence, with its flame projecting into the opening.",
    "p5"
  ]
]
});
export const LIGHT_LETTER_ENGINE = createSingleFamilyTrialEngine({ catalog: LIGHT_LETTER_CATALOG, storageKey: 'moticos.matching.trial-light-letter.v1' });
export const LIGHT_LETTER_ENVELOPE = Object.freeze({
  id: 'trial-light-letter', title: 'Light / Letter private trial', subtitle: 'Light / Letter · private trial',
  storageKey: LIGHT_LETTER_ENGINE.STORAGE_KEY, catalog: LIGHT_LETTER_CATALOG,
});
