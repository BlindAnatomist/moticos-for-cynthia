import { ENVELOPES as PREVIOUS_ENVELOPES, DEFAULT_ENVELOPE_ID, getEnvelope as getPreviousEnvelope, getMatchingEngine as getPreviousEngine } from '../cohesion/registry.js';
import { createMatchingCatalog } from '../catalogFactory.js';
import { createMatchingEngine } from '../engine.js';
import { EXPANSION200_DEFINITIONS } from './definitions.js';

export { DEFAULT_ENVELOPE_ID };
export const EXPANSION200_ENVELOPES = Object.freeze(EXPANSION200_DEFINITIONS.map(definition => Object.freeze({
  ...definition.envelope, catalog: createMatchingCatalog(definition.catalog),
})));
// Compose above the accepted visual revisions. Every prior descriptor, engine,
// asset identity and save key remains the same object, with no migration.
export const ENVELOPES = Object.freeze([...PREVIOUS_ENVELOPES, ...EXPANSION200_ENVELOPES]);
const engines = Object.freeze(Object.fromEntries(EXPANSION200_ENVELOPES.map(envelope => [
  envelope.id, createMatchingEngine({ catalog: envelope.catalog, storageKey: envelope.storageKey }),
])));
const descriptors = Object.freeze(Object.fromEntries(EXPANSION200_ENVELOPES.map(envelope => [envelope.id, envelope])));
const ids = ENVELOPES.flatMap(envelope => envelope.catalog.PIECES.map(piece => piece.id));
const familyIds = ENVELOPES.flatMap(envelope => envelope.catalog.FAMILIES.map(family => family.id));
if (new Set(ids).size !== ids.length || new Set(familyIds).size !== familyIds.length ||
    new Set(ENVELOPES.map(envelope => envelope.id)).size !== ENVELOPES.length ||
    new Set(ENVELOPES.map(envelope => envelope.storageKey)).size !== ENVELOPES.length) {
  throw new TypeError('200-piece expansion identities and save keys must not collide with the accepted collection.');
}
export function getEnvelope(id) { return typeof id === 'string' && Object.hasOwn(descriptors, id) ? descriptors[id] : getPreviousEnvelope(id); }
export function getMatchingEngine(id) { return typeof id === 'string' && Object.hasOwn(engines, id) ? engines[id] : getPreviousEngine(id); }
