import { describe, it, expect } from 'vitest';
import { ENVELOPES as ORIGINALS, getMatchingEngine as originalEngine } from '../src/matching/expansion160/registry.js';
import { ENVELOPES, COHESION_ENVELOPES, getEnvelope, getMatchingEngine } from '../src/matching/cohesion/registry.js';
import { BOARD_ART_BOUNDS, COMPACT_BOARD_LABELS } from '../src/matching/cohesion/boardArt.js';
import { BOARD_ART_BOUNDS as ORIGINAL_BOUNDS } from '../src/matching/expansion160/boardArt.js';
import { readAlbumProgress } from '../src/matching/progress.js';
import { openEnvelopeSession, commitEnvelopeSession } from '../src/matching/session.js';
import { denseSave, memoryStorage } from './capacity/fixtures.js';

describe('the integrated 160-piece matching-only cohesion build', () => {
  it('revises exactly the original four catalogs and leaves all later 120 identities and engines unchanged', () => {
    expect(ENVELOPES.map(envelope => envelope.id)).toEqual(ORIGINALS.map(envelope => envelope.id));
    expect(COHESION_ENVELOPES.map(envelope => envelope.id)).toEqual(ORIGINALS.slice(0, 4).map(envelope => envelope.id));
    expect(ENVELOPES).toHaveLength(16);
    expect(ENVELOPES.flatMap(envelope => envelope.catalog.PIECES)).toHaveLength(160);
    for (const [index, original] of ORIGINALS.entries()) {
      const current = ENVELOPES[index];
      expect(current.storageKey).toBe(original.storageKey);
      expect(current.contentRevision).toBe(original.contentRevision);
      expect(current.saveSchemaVersion).toBe(original.saveSchemaVersion);
      expect(current.catalog.FAMILIES).toEqual(original.catalog.FAMILIES);
      expect(getEnvelope(current.id)).toBe(current);
      for (const piece of current.catalog.PIECES) {
        const before = original.catalog.CATALOG[piece.id];
        for (const field of ['id', 'familyId', 'tier', 'rank', 'mass', 'packId', 'name']) expect(piece[field]).toBe(before[field]);
        if (index < 4) expect(piece.art).toContain('/cohesion/art-v1/');
        else { expect(piece).toBe(before); expect(BOARD_ART_BOUNDS[piece.id]).toBe(ORIGINAL_BOUNDS[piece.id]); }
      }
      if (index >= 4) { expect(current).toBe(original); expect(getMatchingEngine(current.id)).toBe(originalEngine(current.id)); }
    }
    for (const invalid of [null, {}, '__proto__', 'constructor', 'unknown']) {
      expect(getEnvelope(invalid)).toBeNull(); expect(getMatchingEngine(invalid)).toBeNull();
    }
  });

  it('uses the reviewed Lunar label without renaming the saved piece or postcard title', () => {
    const piece = getEnvelope('matching-garden').catalog.CATALOG.f5;
    expect(piece.id).toBe('f5'); expect(piece.name).toBe('Lunar Conservatory');
    expect(piece.shortName).toBe('Lunar'); expect(COMPACT_BOARD_LABELS.f5).toBe('Lunar');
    expect(ORIGINALS[0].catalog.CATALOG.f5.shortName).toBe('Moonhouse');
  });

  it.each(ENVELOPES.map(envelope => [envelope.id]))('%s retains both prior save formats and all 100 exact Undo states without affecting another key', id => {
    const original = originalEngine(id), revised = getMatchingEngine(id), storage = memoryStorage();
    let expected = denseSave(original, 97);
    expect(expected.history).toHaveLength(100);
    for (const raw of [original.serializeStoredSave(expected), original.serializeSave(expected), `\n${JSON.stringify(expected, null, 1)} `]) {
      expect(revised.readSave(raw)).toEqual(original.readSave(raw));
    }
    for (const envelope of ENVELOPES) storage.bytes.set(envelope.storageKey, envelope.id === id ? original.serializeStoredSave(expected) : `keep-${envelope.id}`);
    const session = openEnvelopeSession(revised, new Map(), storage);
    expect(storage.writes).toBe(0); expect(session.save).toEqual(expected);
    for (let index = 0; index < 100; index++) {
      expected = original.act(expected, { type: 'undo' });
      const actual = revised.act(session.save, { type: 'undo' });
      expect(actual).toEqual(expected);
      expect(commitEnvelopeSession(revised, session, actual, storage)).toBe(true);
      expect(storage.getItem(revised.STORAGE_KEY)).toBe(original.serializeStoredSave(expected));
      expect(revised.readSave(storage.getItem(revised.STORAGE_KEY)).save).toEqual(expected);
    }
    expect(revised.act(session.save, { type: 'undo' })).toBeNull();
    for (const envelope of ENVELOPES) if (envelope.id !== id) expect(storage.getItem(envelope.storageKey)).toBe(`keep-${envelope.id}`);
  }, 30000);

  it('reads all 160 pieces, 32 families and 96 postcards through the actual build alias with no storage write', () => {
    const storage = memoryStorage();
    const before = new Map();
    for (const [index, envelope] of ORIGINALS.entries()) {
      const engine = originalEngine(envelope.id), raw = engine.serializeStoredSave(denseSave(engine, index + 11));
      storage.bytes.set(envelope.storageKey, raw); before.set(envelope.storageKey, raw);
    }
    const album = readAlbumProgress(new Map(), storage);
    expect(album.entries).toHaveLength(16); expect(album.totalPieces).toBe(160);
    expect(album.totalWorlds).toBe(32); expect(album.totalPostcards).toBe(96);
    expect(storage.writes).toBe(0); expect(storage.bytes).toEqual(before);
  });
});
