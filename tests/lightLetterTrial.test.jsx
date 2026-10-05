import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createMatchingCatalog, createSingleFamilyTrialCatalog } from '../src/matching/catalogFactory.js';
import { createMatchingEngine, createSingleFamilyTrialEngine } from '../src/matching/engine.js';
import { ENVELOPES, getEnvelope, getMatchingEngine } from '../src/matching/registry.js';
import { readAlbumProgress } from '../src/matching/progress.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from '../src/matching/session.js';
import { LIGHT_LETTER_CATALOG as catalog, LIGHT_LETTER_ENGINE as engine } from '../src/matching/trial/catalog.js';
import { LIGHT_LETTER_BOUNDS as bounds } from '../src/matching/trial/boardArt.js';
import { TrialCollection, TrialHelp } from '../src/matching/trial/LightLetterTrial.jsx';

const pieceIds = ['ll1', 'll2', 'll3', 'll4', 'll5'];
function finish(start = engine.newSave()) {
  let save = start;
  const checkpoints = [], actions = [];
  while (!save.round.board.some(tile => tile?.pieceId === 'll5')) {
    if (actions.length >= 21) throw Error('Expected the single family to finish in 21 legal actions.');
    const pair = engine.mergePairs(save.round.board).sort((a, b) => catalog.pieceOf(save.round.board[b[0]].pieceId).tier - catalog.pieceOf(save.round.board[a[0]].pieceId).tier)[0];
    const action = pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: 'light-letter' };
    const next = engine.act(save, action);
    expect(next).not.toBeNull(); expect(engine.validSave(next)).toBe(true);
    expect(engine.readSave(engine.serializeSave(next))).toMatchObject({ status: 'loaded', save: next });
    if (next.discoveries.length > save.discoveries.length) checkpoints.push({ tier: next.discoveries.length, merges: next.round.merges });
    actions.push(action); save = next;
  }
  return { save, checkpoints, actions };
}
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial)), reads = [], writes = [];
  return { values, reads, writes, getItem: key => { reads.push(key); return values.get(key) ?? null; }, setItem: (key, value) => { writes.push(key); values.set(key, value); } };
}

describe('private single-family Light / Letter trial', () => {
  it('contains exactly the five canonical pieces and four transformations', () => {
    expect(catalog.PIECES.map(piece => piece.id)).toEqual(pieceIds);
    expect(catalog.FAMILIES).toHaveLength(1); expect(catalog.FINALS).toEqual(['ll5']);
    expect(catalog.PIECES.map(piece => piece.mass)).toEqual([1, 2, 4, 8, 16]);
    expect(catalog.PIECES.map(piece => catalog.nextPiece(piece.id)?.id ?? null)).toEqual(['ll2', 'll3', 'll4', 'll5', null]);
    expect(catalog.pieceOf('ll3').description).toContain('eye fragment on its open triangular flap above the lantern window');
  });
  it('starts with four real copies, six finite pair draws and only the first discovery', () => {
    const save = engine.newSave(); expect(engine.validSave(save)).toBe(true);
    expect(save.discoveries).toEqual(['ll1']); expect(save.round.board.filter(Boolean)).toHaveLength(4);
    expect(new Set(save.round.board.filter(Boolean).map(tile => tile.pieceId))).toEqual(new Set(['ll1']));
    expect(save.round.supply).toEqual({ 'light-letter': 12 }); expect(save.round.nextInstanceId).toBe(5);
  });
  it('uses identical-picture matching through all 15 merges and six draws with serializable history', () => {
    const { save, actions, checkpoints } = finish();
    expect(save.round).toMatchObject({ moves: 21, merges: 15, supply: { 'light-letter': 0 } });
    expect(save.discoveries).toEqual(pieceIds); expect(save.round.board.filter(Boolean)).toEqual([{ pieceId: 'll5', instanceId: 31 }]);
    expect(actions.filter(action => action.type === 'supply')).toHaveLength(6);
    expect(checkpoints).toEqual([{ tier: 2, merges: 1 }, { tier: 3, merges: 3 }, { tier: 4, merges: 7 }, { tier: 5, merges: 15 }]);
    expect(engine.act(save, { type: 'supply', familyId: 'light-letter' })).toBeNull();
  });
  it('rejects unequal levels, foreign pieces and final-to-final matches without a new state', () => {
    for (const a of pieceIds) for (const b of [...pieceIds, 'b1', 'l1', '__proto__']) {
      expect(engine.compatible(a, b)).toBe(a === b && a !== 'll5');
    }
    const made = engine.act(engine.newSave(), { type: 'merge', from: 6, to: 7 });
    expect(engine.act(made, { type: 'merge', from: 7, to: 12 })).toBeNull();
    expect(engine.act(made, { type: 'supply', familyId: 'bird' })).toBeNull();
    expect(engine.act(made, { type: 'merge', from: 7, to: 7 })).toBeNull();
  });
  it('retains earned trial discoveries through Undo, Cut and reset without adding public credit', () => {
    const { save } = finish(); const finalIndex = save.round.board.findIndex(tile => tile?.pieceId === 'll5');
    const cut = engine.act(save, { type: 'cut', index: finalIndex });
    expect(cut.round.board.filter(Boolean).map(tile => tile.pieceId)).toEqual(['ll4', 'll4']);
    expect(engine.act(cut, { type: 'undo' }).round).toEqual(save.round);
    const reset = engine.act(cut, { type: 'reset' });
    expect(reset.discoveries).toEqual(pieceIds); expect(reset.history).toEqual([]); expect(reset.round).toEqual(engine.createRound());
    expect(engine.validSave(reset)).toBe(true);
  });
  it('keeps the public factory and engine two-family-only', () => {
    const options = { id: 'trial-light-letter', rows: catalog.PIECES.map(p => [p.id, p.familyId, p.tier, p.name, p.shortName, p.description, p.id]), families: catalog.FAMILIES };
    expect(() => createMatchingCatalog(options)).toThrow();
    expect(() => createMatchingEngine({ catalog, storageKey: engine.STORAGE_KEY })).toThrow();
    expect(() => createSingleFamilyTrialCatalog({ ...options, id: 'matching-garden', artUrl: id => id })).toThrow();
    expect(() => createSingleFamilyTrialEngine({ catalog, storageKey: ENVELOPES[0].storageKey })).toThrow();
    expect(() => createSingleFamilyTrialEngine({ catalog: ENVELOPES[0].catalog, storageKey: engine.STORAGE_KEY })).toThrow();
  });
  it('does not register a fifth envelope or permit trial ids through the public registry', () => {
    expect(ENVELOPES).toHaveLength(4); expect(ENVELOPES.flatMap(e => e.catalog.PIECES)).toHaveLength(40);
    expect(getEnvelope('trial-light-letter')).toBeNull(); expect(getMatchingEngine('trial-light-letter')).toBeNull();
    expect(ENVELOPES.some(e => e.storageKey === engine.STORAGE_KEY)).toBe(false);
  });
  it('rejects public saves in the trial and trial saves in every public envelope', () => {
    const trialRaw = engine.serializeSave(finish().save);
    for (const envelope of ENVELOPES) {
      const publicEngine = getMatchingEngine(envelope.id), publicRaw = publicEngine.serializeSave(publicEngine.newSave());
      expect(engine.readSave(publicRaw).status).toBe('invalid'); expect(publicEngine.readSave(trialRaw).status).toBe('invalid');
    }
  });
  it('writes and reloads only its own storage key; the album never reads its save or credits it', () => {
    const storage = memoryStorage(Object.fromEntries(ENVELOPES.map(e => [e.storageKey, getMatchingEngine(e.id).serializeSave(getMatchingEngine(e.id).newSave())])));
    const before = new Map(storage.values), cache = new Map(); const session = openEnvelopeSession(engine, cache, storage);
    expect(commitEnvelopeSession(engine, session, finish().save, storage)).toBe(true);
    expect(storage.writes).toEqual([engine.STORAGE_KEY]);
    for (const [key, value] of before) expect(storage.values.get(key)).toBe(value);
    expect(openEnvelopeSession(engine, new Map(), storage).save).toEqual(session.save);
    storage.reads.length = 0;
    const album = readAlbumProgress(cache, storage, { id: 'trial-light-letter', save: session.save });
    expect(album).toMatchObject({ discovered: 8, totalPieces: 40, worlds: 0, totalWorlds: 8, postcards: 0, totalPostcards: 24 });
    expect(storage.reads).not.toContain(engine.STORAGE_KEY);
  });
  it.each(['not json', '{"version":999,"other":true}'])('preserves existing unreadable trial bytes: %s', original => {
    const storage = memoryStorage({ [engine.STORAGE_KEY]: original }), session = openEnvelopeSession(engine, new Map(), storage);
    commitEnvelopeSession(engine, session, engine.act(session.save, { type: 'supply', familyId: 'light-letter' }), storage);
    expect(session.blocked).toBe(true); expect(session.save.round.moves).toBe(1); expect(storage.writes).toEqual([]); expect(storage.values.get(engine.STORAGE_KEY)).toBe(original);
  });
  it('blocks stale-tab overwrites and ignores public-envelope storage changes', () => {
    const storage = memoryStorage(), cache = new Map(), first = openEnvelopeSession(engine, cache, storage), second = openEnvelopeSession(engine, new Map(), storage);
    expect(observeEnvelopeStorage(engine, first, { key: ENVELOPES[0].storageKey, newValue: 'changed' })).toBe(false);
    commitEnvelopeSession(engine, first, engine.act(first.save, { type: 'supply', familyId: 'light-letter' }), storage);
    const original = storage.values.get(engine.STORAGE_KEY);
    commitEnvelopeSession(engine, second, engine.act(second.save, { type: 'merge', from: 6, to: 7 }), storage);
    expect(second.conflict).toBe(true); expect(storage.values.get(engine.STORAGE_KEY)).toBe(original);
  });
  it('withholds postcards until earned at tier three and exposes only the three earned cards', () => {
    const initial = renderToStaticMarkup(<TrialCollection save={engine.newSave()} onPostcard={() => {}} />);
    expect(initial).toContain('1 of 5 artworks'); expect(initial).toContain('0 of 3 postcards'); expect(initial).not.toContain('Open postcard');
    expect(initial.match(/is-undiscovered/g)).toHaveLength(4);
    let save = engine.newSave();
    for (const action of [{ type: 'merge', from: 6, to: 7 }, { type: 'merge', from: 12, to: 16 }, { type: 'merge', from: 7, to: 16 }]) save = engine.act(save, action);
    const tier3 = renderToStaticMarkup(<TrialCollection save={save} onPostcard={() => {}} />);
    expect(tier3.match(/Open postcard/g)).toHaveLength(1); expect(tier3).toContain('Letter Window');
    const final = renderToStaticMarkup(<TrialCollection save={finish().save} onPostcard={() => {}} />);
    expect(final.match(/Open postcard/g)).toHaveLength(3); expect(final).toContain('World collected'); expect(final).toContain('lantern-shaped absence');
    expect(renderToStaticMarkup(<TrialHelp />)).toContain('six pair draws');
  });
  it('retains the reviewed five WebP files byte for byte and preserves alpha-crop metadata', () => {
    const receipt = JSON.parse(readFileSync(new URL('../docs/LIGHT_LETTER_ASSET_RECEIPT.json', import.meta.url)));
    for (const { id, sourceSha256 } of receipt.assets) {
      const bytes = readFileSync(new URL(`../src/matching/trial/art/p${id.slice(2)}.webp`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sourceSha256);
      const { source, crop: [x, y, w, h], ink: [ix, iy, iw, ih] } = bounds[id];
      expect(source).toEqual([768, 768]); expect(ix).toBeGreaterThanOrEqual(x); expect(iy).toBeGreaterThanOrEqual(y);
      expect(ix + iw).toBeLessThanOrEqual(x + w); expect(iy + ih).toBeLessThanOrEqual(y + h);
      const scale = Math.min(45.515625 / w, 34.515625 / h);
      expect(scale * w).toBeLessThanOrEqual(45.515626); expect(scale * h).toBeLessThanOrEqual(34.515626);
      expect(Math.max(iw, ih) * scale).toBeGreaterThanOrEqual(30);
    }
  });
});
