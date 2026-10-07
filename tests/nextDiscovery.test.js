import { describe, it, expect } from 'vitest';
import { ENVELOPES, getMatchingEngine } from '../src/matching/registry.js';
import { idleDiscovery, nextEnvelopeSuggestion, readAlbumProgress } from '../src/matching/progress.js';
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
const envelope = ENVELOPES[0], engine = getMatchingEngine(envelope.id);
const completeSave = () => engine.FAMILIES.reduce((save, family) => finish(engine, save, family), engine.newSave());

describe('read-only idle discovery guidance', () => {
  it('starts at the first pair, then follows the more advanced unfinished family', () => {
    let save = engine.newSave();
    expect(idleDiscovery(envelope, save)).toMatchObject({ complete: false, piece: { id: 'b1' }, next: { id: 'b2' } });
    save = engine.act(save, { type: 'merge', from: 8, to: 11 });
    expect(idleDiscovery(envelope, save)).toMatchObject({ piece: { id: 'f2' }, next: { id: 'f3' } });
    save = engine.act(save, { type: 'merge', from: 6, to: 7 });
    expect(idleDiscovery(envelope, save)).toMatchObject({ piece: { id: 'b2' }, next: { id: 'b3' } });
  });
  it('switches away from a completed first family and respects collected progress after Undo', () => {
    const save = finish(engine, engine.newSave(), engine.FAMILIES[0]);
    for (const state of [save, engine.act(save, { type: 'undo' }), engine.act(save, { type: 'reset' })]) {
      expect(idleDiscovery(envelope, state)).toMatchObject({ complete: false, family: { id: 'fern' }, piece: { id: 'f1' }, next: { id: 'f2' } });
    }
  });
  it('keeps completed discoveries after Cut, Undo and fresh envelope without a fictitious next tier', () => {
    const save = completeSave();
    const cut = engine.act(save, { type: 'cut', index: save.round.board.findIndex(tile => tile?.pieceId === 'b5') });
    for (const state of [save, cut, engine.act(save, { type: 'undo' }), engine.act(save, { type: 'reset' })]) {
      const before = structuredClone(state);
      expect(idleDiscovery(envelope, state)).toMatchObject({ complete: true, family: null, next: null });
      expect(state).toEqual(before);
    }
  });
});

describe('optional next-envelope suggestion', () => {
  it('does not suggest an envelope until both current families have been collected', () => {
    const storage = memoryStorage();
    for (const save of [engine.newSave(), finish(engine, engine.newSave(), engine.FAMILIES[0])]) {
      const album = readAlbumProgress(new Map(), storage, { id: envelope.id, save });
      expect(nextEnvelopeSuggestion(album, envelope.id)).toBeNull();
      expect(storage.writes).toBe(0); expect(storage.bytes.size).toBe(0);
    }
  });
  it('suggests the next eligible authored envelope without opening or writing it', () => {
    const storage = memoryStorage(), cache = new Map();
    const album = readAlbumProgress(cache, storage, { id: envelope.id, save: completeSave() });
    const before = JSON.stringify(album);
    expect(nextEnvelopeSuggestion(album, envelope.id).envelope.id).toBe(ENVELOPES[1].id);
    expect(JSON.stringify(album)).toBe(before); expect(cache.size).toBe(0); expect(storage.writes).toBe(0); expect(storage.bytes.size).toBe(0);
  });
  it('skips complete, unread and temporary entries without hiding ordinary free access', () => {
    const storage = memoryStorage();
    const album = readAlbumProgress(new Map(), storage, { id: envelope.id, save: completeSave() });
    const allIds = album.entries.map(entry => entry.envelope.id);
    album.entries[1].unread = true;
    album.entries[2].temporary = true;
    expect(nextEnvelopeSuggestion(album, envelope.id).envelope.id).toBe(ENVELOPES[3].id);
    album.entries[3].complete = true;
    expect(nextEnvelopeSuggestion(album, envelope.id)).toBeNull();
    expect(album.entries.map(entry => entry.envelope.id)).toEqual(allIds);
  });
  it('does not encourage leaving completed temporary play before the save warning is resolved', () => {
    const album = readAlbumProgress(new Map(), memoryStorage(), { id: envelope.id, save: completeSave() });
    album.entries[0].temporary = true;
    expect(nextEnvelopeSuggestion(album, envelope.id)).toBeNull();
    album.entries[0].temporary = false; album.entries[0].unread = true;
    expect(nextEnvelopeSuggestion(album, envelope.id)).toBeNull();
  });
  it('wraps once in authored order and returns null when no eligible envelope remains', () => {
    const storage = memoryStorage(), album = readAlbumProgress(new Map(), storage);
    const last = album.entries.at(-1); last.complete = true;
    expect(nextEnvelopeSuggestion(album, last.envelope.id).envelope.id).toBe(envelope.id);
    for (const entry of album.entries) entry.complete = true;
    expect(nextEnvelopeSuggestion(album, last.envelope.id)).toBeNull();
    expect(nextEnvelopeSuggestion(album, 'unknown')).toBeNull();
  });
});
