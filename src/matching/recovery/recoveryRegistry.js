import { ENVELOPES as PLAYABLE_ENVELOPES, getMatchingEngine as getPlayableEngine } from '../batch/registry.js';
import { createMatchingCatalog } from '../catalogFactory.js';
import { createMatchingEngine } from '../engine.js';
import definitions from './expansion-metadata.json' with { type: 'json' };

// Metadata only: the forty newer pictures are never imported or made playable.
// Exact IDs, routes and save keys let the reviewed decoder validate their saves.
export const PRESERVED_ENVELOPES = Object.freeze(definitions.map(definition => Object.freeze({
  ...definition.envelope, catalog: createMatchingCatalog({ ...definition.catalog, artUrl: () => '' }),
})));
export const RECOVERY_ENVELOPES = Object.freeze([...PLAYABLE_ENVELOPES, ...PRESERVED_ENVELOPES]);
const preservedEngines = Object.freeze(Object.fromEntries(PRESERVED_ENVELOPES.map(envelope => [
  envelope.id, createMatchingEngine({ catalog: envelope.catalog, storageKey: envelope.storageKey }),
])));
const preservedIds = new Set(PRESERVED_ENVELOPES.map(envelope => envelope.id));
if (RECOVERY_ENVELOPES.length !== 12 || new Set(RECOVERY_ENVELOPES.map(e => e.storageKey)).size !== 12 ||
    new Set(RECOVERY_ENVELOPES.flatMap(e => e.catalog.PIECES.map(p => p.id))).size !== 120) {
  throw new TypeError('Rollback recovery must retain every distinct 120-piece save identity.');
}
export const isPreservedEnvelope = id => preservedIds.has(id);
export const getRecoveryEngine = id => Object.hasOwn(preservedEngines, id) ? preservedEngines[id] : getPlayableEngine(id);
