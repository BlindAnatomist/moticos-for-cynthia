import { ENVELOPES as PLAYABLE } from '../../src/matching/batch/registry.js';
import { PRESERVED_ENVELOPES } from '../../src/matching/recovery/recoveryRegistry.js';
export const RUNTIME_FINGERPRINT = 'cc5fe6e073d41f20d0a97eb1af782d5e6094b61a82af91c60610bda4ccc9c960';
export const BUILD_FINGERPRINT = '07aa05334317c814f1bb450a7e9dd155f8fead91db19ece8e83af5e3f02e7046';
export const PROFILES = [
  { name: 'chromium-desktop', width: 1280, height: 720 },
  { name: 'webkit-iphone-13', width: 390, height: 664 },
  { name: 'webkit-iphone-large', width: 430, height: 932 },
];
export const CORE_CASES = [
  'visibly reads all four newer-envelope records and downloads exact raw/v1 history',
  'returns to a non-default board through both recovery entry points and history navigation',
  'exports fresh recovery bytes after another tab changes a source without writing',
  'exports empty corrupt future and read-denied sources honestly without writing',
  'exports distinct stale winner and temporary loser without overwriting either',
  'exports quota-blocked temporary work separately and resumes it after recovery',
  'retains every one of 100 Garden Undo states across reloads',
  'resumes a batch v2 board with Undo reload and untouched newer-envelope saves',
];
export const POSTCARD_SAMPLES = PLAYABLE.map((envelope, index) => {
  const tier = 3 + index % 3, family = envelope.catalog.FAMILIES[index % 2];
  return { envelopeId: envelope.id, title: envelope.title, pieceId: family.pieceIds[tier - 1], tier,
    familyId: family.id, assetClass: index < 4 ? 'original-public' : 'accepted-batch' };
});
export const postcardCase = sample => `decodes all ten ${sample.envelopeId} artworks and exports ${sample.pieceId} postcard`;
export const ALL_CASES = [...CORE_CASES, ...POSTCARD_SAMPLES.map(postcardCase)];

const screenshot = name => ({ name: `screenshot-${name}`, contentType: 'image/png' });
const json = name => ({ name: `json-${name}`, contentType: 'application/json' });
// Explicit per-case evidence contract. Repeated navigation captures are distinct.
const plannedArtifacts = Object.fromEntries([
  [CORE_CASES[0], [screenshot('recovery-top-controls'), ...PRESERVED_ENVELOPES.flatMap(e => [
    screenshot(`recovery-${e.id}-summary`), ...e.catalog.FAMILIES.map(f => screenshot(`recovery-${e.id}-family-${f.id}`)),
    screenshot(`recovery-${e.id}-board-details`), screenshot(`recovery-${e.id}-history-end`),
  ]), json('all-12-saves')]],
  [CORE_CASES[1], [screenshot('navigation-envelopes-1-recovery'), screenshot('navigation-collection-2-recovery'), screenshot('navigation-envelopes-3-recovery'), screenshot('non-default-restored-board')]],
  [CORE_CASES[2], [json('freshness-before'), json('freshness-after')]],
  [CORE_CASES[3], [screenshot('download-initiation-failure'), ...PRESERVED_ENVELOPES.map(e => screenshot(`failure-${e.id}`)), json('empty-corrupt-future-read-denied'), json('whole-storage-read-denied')]],
  [CORE_CASES[4], [json('stale-winner-and-temporary-loser')]],
  [CORE_CASES[5], [json('quota-preservation')]],
  [CORE_CASES[6], []],
  [CORE_CASES[7], [json('batch-v2-after-undo'), screenshot('batch-v2-restored-board')]],
  ...POSTCARD_SAMPLES.map(sample => [postcardCase(sample), [
    screenshot(`playable-board-${sample.envelopeId}`),
    ...PLAYABLE.find(e => e.id === sample.envelopeId).catalog.FAMILIES.map(f => screenshot(`playable-collection-${sample.envelopeId}-${f.id}`)),
    screenshot(`postcard-view-${sample.envelopeId}`),
    { name: `postcard-${sample.envelopeId}-${sample.pieceId}`, contentType: 'image/png' },
  ]]),
]);
export const REQUIRED_ARTIFACTS = Object.freeze(Object.fromEntries(Object.entries(plannedArtifacts).map(([title,artifacts])=>[title,[...artifacts,{name:'observations',contentType:'application/x-ndjson'}]])));
