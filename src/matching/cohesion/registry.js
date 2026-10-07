import { ENVELOPES as PREVIOUS_ENVELOPES, DEFAULT_ENVELOPE_ID, getEnvelope as getPreviousEnvelope, getMatchingEngine as getPreviousEngine } from '../expansion160/registry.js';
import { createMatchingEngine } from '../engine.js';
import { applyVisualRevision } from './catalogOverlay.js';
import { COHESION_REVISIONS } from './definitions.js';

export { DEFAULT_ENVELOPE_ID };
const expectedIds = ['matching-garden', 'moonlit-passage', 'riverside-reverie', 'lantern-studio'];
if (Object.keys(COHESION_REVISIONS).length !== 4 || expectedIds.some(id => !Object.hasOwn(COHESION_REVISIONS, id))) {
  throw new TypeError('The visual revision must cover exactly the four original envelopes.');
}
export const COHESION_ENVELOPES = Object.freeze(expectedIds.map(id => {
  const original = getPreviousEnvelope(id);
  return Object.freeze({ ...original, visualRevision: 1,
    catalog: applyVisualRevision(original.catalog, COHESION_REVISIONS[id]),
  });
}));
const descriptors = Object.freeze(Object.fromEntries(COHESION_ENVELOPES.map(envelope => [envelope.id, envelope])));
const engines = Object.freeze(Object.fromEntries(COHESION_ENVELOPES.map(envelope => [
  envelope.id, createMatchingEngine({ catalog: envelope.catalog, storageKey: envelope.storageKey }),
])));
export const ENVELOPES = Object.freeze(PREVIOUS_ENVELOPES.map(envelope => descriptors[envelope.id] ?? envelope));
export function getEnvelope(id) {
  return typeof id === 'string' && Object.hasOwn(descriptors, id) ? descriptors[id] : getPreviousEnvelope(id);
}
export function getMatchingEngine(id) {
  return typeof id === 'string' && Object.hasOwn(engines, id) ? engines[id] : getPreviousEngine(id);
}
