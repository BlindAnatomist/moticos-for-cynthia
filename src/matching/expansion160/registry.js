import { ENVELOPES as PREVIOUS_ENVELOPES, DEFAULT_ENVELOPE_ID, getEnvelope as getPreviousEnvelope, getMatchingEngine as getPreviousEngine } from '../expansion/registry.js';
import { createMatchingCatalog } from '../catalogFactory.js';
import { createMatchingEngine } from '../engine.js';
import { EXPANSION160_DEFINITIONS } from './definitions.js';
export { DEFAULT_ENVELOPE_ID };
export const EXPANSION160_ENVELOPES = Object.freeze(EXPANSION160_DEFINITIONS.map(definition => Object.freeze({
  ...definition.envelope, catalog: createMatchingCatalog(definition.catalog),
})));
export const ENVELOPES = Object.freeze([...PREVIOUS_ENVELOPES, ...EXPANSION160_ENVELOPES]);
const engines = Object.freeze(Object.fromEntries(EXPANSION160_ENVELOPES.map(envelope => [
  envelope.id, createMatchingEngine({ catalog: envelope.catalog, storageKey: envelope.storageKey }),
])));
const descriptors = Object.freeze(Object.fromEntries(EXPANSION160_ENVELOPES.map(envelope => [envelope.id, envelope])));
const ids = ENVELOPES.flatMap(envelope => envelope.catalog.PIECES.map(piece => piece.id));
if (new Set(ids).size !== ids.length || new Set(ENVELOPES.map(envelope => envelope.id)).size !== ENVELOPES.length ||
    new Set(ENVELOPES.map(envelope => envelope.storageKey)).size !== ENVELOPES.length ||
    new Set(ENVELOPES.flatMap(envelope => envelope.catalog.FAMILIES.map(family => family.id))).size !== 32) {
  throw new TypeError('160-piece expansion identities and save keys must not collide with the accepted collection.');
}
export function getEnvelope(id) { return typeof id === 'string' && Object.hasOwn(descriptors, id) ? descriptors[id] : getPreviousEnvelope(id); }
export function getMatchingEngine(id) { return typeof id === 'string' && Object.hasOwn(engines, id) ? engines[id] : getPreviousEngine(id); }
