import { GARDEN_CATALOG } from './catalog.js';
import { GARDEN_ENGINE } from './game.js';
import { MOONLIT_CATALOG } from './moonlitCatalog.js';
import { RIVERSIDE_CATALOG } from './riversideCatalog.js';
import { LANTERN_CATALOG } from './lanternCatalog.js';
import { createMatchingEngine } from './engine.js';

export const DEFAULT_ENVELOPE_ID = 'matching-garden';
const moonlitEngine = createMatchingEngine({ catalog: MOONLIT_CATALOG, storageKey: 'moticos.matching.moonlit-passage.v1' });
const riversideEngine = createMatchingEngine({ catalog: RIVERSIDE_CATALOG, storageKey: 'moticos.matching.riverside-reverie.v1' });
const lanternEngine = createMatchingEngine({ catalog: LANTERN_CATALOG, storageKey: 'moticos.matching.lantern-studio.v1' });
export const ENVELOPES = Object.freeze([
  Object.freeze({
    id: DEFAULT_ENVELOPE_ID, contentRevision: 1, saveSchemaVersion: 1, title: 'Garden Correspondence', subtitle: 'Garden correspondence',
    description: 'Follow two little garden journeys, one matching pair at a time.',
    storageKey: GARDEN_ENGINE.STORAGE_KEY, catalog: GARDEN_CATALOG,
  }),
  Object.freeze({
    id: 'moonlit-passage', contentRevision: 1, saveSchemaVersion: 1, title: 'Moonlit Passage', subtitle: 'Moonlit passage',
    description: 'Grow a golden key passage and send a crescent voyager into the moonlight.',
    storageKey: moonlitEngine.STORAGE_KEY, catalog: MOONLIT_CATALOG,
  }),
  Object.freeze({
    id: 'riverside-reverie', contentRevision: 1, saveSchemaVersion: 1, title: 'Riverside Reverie', subtitle: 'Riverside reverie',
    description: 'Fold a river into a little world and let a teacup dream in ribbons.',
    storageKey: riversideEngine.STORAGE_KEY, catalog: RIVERSIDE_CATALOG,
  }),
  Object.freeze({
    id: 'lantern-studio', contentRevision: 1, saveSchemaVersion: 1, title: 'Lantern Studio', subtitle: 'Lantern studio',
    description: 'Build a little world of paper light and weave a home from a spool of ribbon.',
    storageKey: lanternEngine.STORAGE_KEY, catalog: LANTERN_CATALOG,
  }),
]);
const engines = Object.freeze({ [DEFAULT_ENVELOPE_ID]: GARDEN_ENGINE, 'moonlit-passage': moonlitEngine, 'riverside-reverie': riversideEngine, 'lantern-studio': lanternEngine });
const descriptors = Object.freeze(Object.fromEntries(ENVELOPES.map(envelope => [envelope.id, envelope])));
// Fail during development rather than allowing a later pack to steal an ID or key.
const ids = ENVELOPES.flatMap(envelope => envelope.catalog.PIECES.map(piece => piece.id));
if (new Set(ids).size !== ids.length || new Set(ENVELOPES.map(envelope => envelope.storageKey)).size !== ENVELOPES.length ||
    new Set(ENVELOPES.map(envelope => envelope.id)).size !== ENVELOPES.length) {
  throw new TypeError('Envelope IDs, piece IDs and save keys must be unique across the collection.');
}
export function getEnvelope(id) { return typeof id === 'string' && Object.hasOwn(descriptors, id) ? descriptors[id] : null; }
export function getMatchingEngine(id) { return typeof id === 'string' && Object.hasOwn(engines, id) ? engines[id] : null; }
