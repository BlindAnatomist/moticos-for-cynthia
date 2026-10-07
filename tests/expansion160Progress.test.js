import { describe, it, expect } from 'vitest';
import { ENVELOPES, EXPANSION160_ENVELOPES, getMatchingEngine } from '../src/matching/expansion160/registry.js';
import { readAlbumProgress, idleDiscovery, nextEnvelopeSuggestion } from '../src/matching/progress.js';
import { fullDiscoveryDenseSave } from './expansion-browser/fullDiscoveryFixture.js';
import { memoryStorage } from './capacity/fixtures.js';

function finish(engine, initial, family) {
  let save = initial;
  for (let step = 0; !save.round.board.some(tile => tile?.pieceId === family.finalId); step++) {
    expect(step).toBeLessThan(21);
    const pair = engine.mergePairs(save.round.board).find(([from]) => engine.CATALOG[save.round.board[from].pieceId].familyId === family.id);
    save = engine.act(save, pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: family.id });
    expect(save).not.toBeNull();
  }
  return save;
}

describe('160-piece read-only whole-album view', () => {
  it('exposes all sixteen envelopes and correct empty totals without saves or artificial discoveries', () => {
    const storage = memoryStorage(), cache = new Map(), album = readAlbumProgress(cache, storage);
    expect(album).toMatchObject({ discovered: 0, totalPieces: 160, worlds: 0, totalWorlds: 32, postcards: 0, totalPostcards: 96 });
    expect(album.entries.map(entry => entry.envelope.id)).toEqual(ENVELOPES.map(envelope => envelope.id));
    expect(album.entries.every(entry => !entry.opened && !entry.unread)).toBe(true);
    expect(storage.writes).toBe(0); expect(storage.bytes.size).toBe(0); expect(cache.size).toBe(0);
  });
  it('summarizes fully discovered dense 100-history saves without trimming or rewriting any of them', () => {
    const storage = memoryStorage(), original = new Map();
    for (const [index, envelope] of ENVELOPES.entries()) {
      const engine = getMatchingEngine(envelope.id), save = fullDiscoveryDenseSave(engine, index + 41);
      const raw = engine.serializeStoredSave(save); storage.bytes.set(envelope.storageKey, raw); original.set(envelope.id, { raw, save });
    }
    const album = readAlbumProgress(new Map(), storage);
    expect(album).toMatchObject({ discovered: 160, totalPieces: 160, worlds: 32, totalWorlds: 32, postcards: 96, totalPostcards: 96 });
    for (const entry of album.entries) {
      expect(entry.save).toEqual(original.get(entry.envelope.id).save); expect(entry.save.history).toHaveLength(100);
      expect(storage.getItem(entry.envelope.storageKey)).toBe(original.get(entry.envelope.id).raw);
      expect(nextEnvelopeSuggestion(album, entry.envelope.id)).toBeNull();
    }
    expect(storage.writes).toBe(0);
  }, 30_000);
  it.each(EXPANSION160_ENVELOPES.map(envelope => [envelope.id]))('%s guides either family order and never rewrites another envelope', id => {
    const envelope = ENVELOPES.find(item => item.id === id), engine = getMatchingEngine(id), storage = memoryStorage();
    for (const families of [engine.FAMILIES, [...engine.FAMILIES].reverse()]) {
      let save = engine.newSave();
      save = finish(engine, save, families[0]);
      expect(idleDiscovery(envelope, save).family.id).toBe(families[1].id);
      let album = readAlbumProgress(new Map(), storage, { id, save });
      expect(nextEnvelopeSuggestion(album, id)).toBeNull();
      save = finish(engine, save, families[1]);
      expect(idleDiscovery(envelope, save)).toMatchObject({ complete: true, next: null });
      album = readAlbumProgress(new Map(), storage, { id, save });
      expect(nextEnvelopeSuggestion(album, id)?.envelope.id).not.toBe(id);
      expect(nextEnvelopeSuggestion(album, id)).not.toBeNull();
      for (const action of [{ type: 'undo' }, { type: 'reset' }]) {
        expect(idleDiscovery(envelope, engine.act(save, action))).toMatchObject({ complete: true, next: null });
      }
      expect(storage.writes).toBe(0); expect(storage.bytes.size).toBe(0);
    }
  });
});
