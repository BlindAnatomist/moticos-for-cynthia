import { ENVELOPES as BASE_ENVELOPES, DEFAULT_ENVELOPE_ID, getEnvelope as getBaseEnvelope, getMatchingEngine as getBaseEngine } from '../registry.js';
import { createMatchingCatalog } from '../catalogFactory.js';
import { createMatchingEngine } from '../engine.js';
import { BATCH_DEFINITIONS } from './definitions.js';

export { DEFAULT_ENVELOPE_ID };
// Definitions reference only reviewed canonical files under this source tree.
// Separate private save keys prevent writes to the four shipped envelopes.
export const BATCH_ENVELOPES = Object.freeze(BATCH_DEFINITIONS.map(definition => {
  const catalog = createMatchingCatalog(definition.catalog);
  return Object.freeze({ ...definition.envelope, catalog });
}));
export const ENVELOPES = Object.freeze([...BASE_ENVELOPES, ...BATCH_ENVELOPES]);
const engines = Object.freeze(Object.fromEntries(BATCH_ENVELOPES.map(envelope => [
  envelope.id, createMatchingEngine({ catalog: envelope.catalog, storageKey: envelope.storageKey }),
])));
const descriptors = Object.freeze(Object.fromEntries(BATCH_ENVELOPES.map(envelope => [envelope.id, envelope])));
const ids = ENVELOPES.flatMap(envelope => envelope.catalog.PIECES.map(piece => piece.id));
if (new Set(ids).size !== ids.length || new Set(ENVELOPES.map(envelope => envelope.id)).size !== ENVELOPES.length ||
    new Set(ENVELOPES.map(envelope => envelope.storageKey)).size !== ENVELOPES.length) {
  throw new TypeError('Private batch and existing collection identities must never collide.');
}
export function getEnvelope(id) { return typeof id === 'string' && Object.hasOwn(descriptors, id) ? descriptors[id] : getBaseEnvelope(id); }
export function getMatchingEngine(id) { return typeof id === 'string' && Object.hasOwn(engines, id) ? engines[id] : getBaseEngine(id); }
