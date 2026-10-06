import { ENVELOPES, getMatchingEngine } from '../../src/matching/expansion160/registry.js';
// Storage bytes have a versioned transport. Assert against the real decoder;
// rawSave remains exact raw bytes for stale-tab and preservation assertions.
export function decodeMatchingSave(raw, key = 'moticos.matching.garden.v1') {
  if (raw === null) return null;
  const envelope = ENVELOPES.find(item => item.storageKey === key);
  if (!envelope) throw Error(`Unknown matching test save key: ${key}`);
  const result = getMatchingEngine(envelope.id).readSave(raw);
  if (result.status !== 'loaded') throw Error(`Unread matching test save: ${result.status}`);
  return result.save;
}
