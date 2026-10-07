import { describe, it, expect } from 'vitest';
import { applyVisualRevision } from '../src/matching/cohesion/catalogOverlay.js';
import { ENVELOPES, getMatchingEngine } from '../src/matching/registry.js';
import { createMatchingEngine } from '../src/matching/engine.js';
import { denseSave, random, actions } from './capacity/fixtures.js';

const revisions = catalog => catalog.PIECES.map(piece => ({
  id: piece.id, art: `/art/cohesion-v1/${piece.id}.webp`,
  description: `Reviewed printed collage for ${piece.name}.`,
  ...(piece.id === 'f5' ? { shortName: 'Lunar' } : {}),
}));

describe('matching-only visual revisions', () => {
  it.each(ENVELOPES.map(envelope => [envelope.id, envelope]))('%s preserves all identities, routes and original catalog data', (id, envelope) => {
    const before = JSON.stringify(envelope.catalog);
    const revised = applyVisualRevision(envelope.catalog, revisions(envelope.catalog));
    expect(JSON.stringify(envelope.catalog)).toBe(before);
    expect(revised).not.toBe(envelope.catalog);
    for (const key of ['BOARD_SIZE', 'PACK_ID', 'PACK_VERSION', 'FAMILY_MATERIAL', 'FAMILIES', 'STARTERS', 'FINALS']) {
      expect(revised[key]).toEqual(envelope.catalog[key]);
    }
    for (const piece of envelope.catalog.PIECES) {
      const next = revised.CATALOG[piece.id];
      for (const key of ['id', 'familyId', 'tier', 'rank', 'name', 'packId', 'mass']) expect(next[key]).toEqual(piece[key]);
      expect(revised.nextPiece(piece.id)?.id).toBe(envelope.catalog.nextPiece(piece.id)?.id);
      expect(revised.previousPiece(piece.id)?.id).toBe(envelope.catalog.previousPiece(piece.id)?.id);
      expect(next.art).toContain('/art/cohesion-v1/');
      expect(next.shortName).toBe(piece.id === 'f5' ? 'Lunar' : piece.shortName);
    }
  });

  it.each(ENVELOPES.map(envelope => [envelope.id, envelope]))('%s decodes both save encodings and all 100 exact Undo states identically', (id, envelope) => {
    const original = getMatchingEngine(id);
    const revised = createMatchingEngine({ catalog: applyVisualRevision(envelope.catalog, revisions(envelope.catalog)), storageKey: envelope.storageKey });
    let save = denseSave(original, 51);
    expect(revised.STORAGE_KEY).toBe(original.STORAGE_KEY);
    expect(save.history).toHaveLength(100);
    for (const raw of [original.serializeSave(save), original.serializeStoredSave(save), ` \n${JSON.stringify(save, null, 1)}\n`]) {
      expect(revised.readSave(raw)).toEqual(original.readSave(raw));
    }
    let restored = revised.readSave(original.serializeStoredSave(save)).save;
    for (let index = 0; index < 100; index++) {
      save = original.act(save, { type: 'undo' });
      restored = revised.act(restored, { type: 'undo' });
      expect(restored).toEqual(save);
      expect(revised.serializeStoredSave(restored)).toBe(original.serializeStoredSave(save));
    }
    expect(revised.act(restored, { type: 'undo' })).toBeNull();
  });

  it.each(ENVELOPES.map(envelope => [envelope.id, envelope]))('%s retains move, merge, Cut, supply, sound and reset behavior', (id, envelope) => {
    const original = getMatchingEngine(id);
    const revised = createMatchingEngine({ catalog: applyVisualRevision(envelope.catalog, revisions(envelope.catalog)), storageKey: envelope.storageKey });
    let before = original.newSave(), after = revised.newSave();
    const nextRandom = random(91);
    const successful = new Set();
    for (let index = 0; index < 180; index++) {
      const options = actions(original, before);
      const required = ['merge', 'cut', 'move', 'supply'][index];
      const action = required ? options.find(option => option.type === required)
        : index === 177 ? { type: 'sound', enabled: !before.sound }
        : index === 178 ? { type: 'undo' }
        : index === 179 ? { type: 'reset' } : options[Math.floor(nextRandom() * options.length)];
      expect(action).toBeDefined();
      const oldResult = original.act(before, action), newResult = revised.act(after, action);
      expect(newResult).toEqual(oldResult);
      if (oldResult) { successful.add(action.type); before = oldResult; after = newResult; }
    }
    expect(successful).toEqual(new Set(['merge', 'cut', 'move', 'supply', 'sound', 'undo', 'reset']));
  });

  it('fails closed on partial, repeated, unknown or identity-changing rows', () => {
    const catalog = ENVELOPES[0].catalog, items = revisions(catalog);
    for (const invalid of [items.slice(1), [...items.slice(1), items[1]], items.map((item, i) => i ? item : { ...item, id: 'unknown' }),
      items.map((item, i) => i ? item : { ...item, familyId: 'changed' }),
      items.map((item, i) => i ? item : { ...item, art: '' }),
      items.map((item, i) => i ? item : { ...item, shortName: '' })]) {
      expect(() => applyVisualRevision(catalog, invalid)).toThrow(TypeError);
    }
  });
});
