import { describe, it, expect } from 'vitest';
import { ENVELOPES, EXPANSION200_ENVELOPES, getMatchingEngine } from '../src/matching/expansion200/registry.js';
import { readAlbumProgress, nextEnvelopeSuggestion } from '../src/matching/progress.js';
import { memoryStorage } from './capacity/fixtures.js';
import { fullDiscoveryDenseSave } from './expansion160-browser/fullDiscoveryFixture.js';
import { envelopeFromSearch } from '../src/matching/MatchingCollection.jsx';
import { catalog200 } from '../scripts/expansion200Candidate.mjs';

describe('the real Vite 200 alias, separate from the historical 160 gate',()=>{
 it('routes and summarizes all twenty envelopes read-only',()=>{
  const storage=memoryStorage(),album=readAlbumProgress(new Map(),storage);
  expect(album.entries.map(e=>e.envelope.id)).toEqual(ENVELOPES.map(e=>e.id));
  expect(album).toMatchObject({totalPieces:200,totalWorlds:40,totalPostcards:120,discovered:0,postcards:0,worlds:0});
  expect(storage.writes).toBe(0);
  for(const e of ENVELOPES)expect(envelopeFromSearch(`?envelope=${e.id}`)).toBe(e.id);
  expect(envelopeFromSearch('?envelope=__proto__')).toBe(ENVELOPES[0].id);
 });
 it.each(EXPANSION200_ENVELOPES.map(e=>[e.id]))('%s contributes ten discoveries and six postcards without writing neighboring keys',id=>{
  const storage=memoryStorage(),engine=getMatchingEngine(id),save=fullDiscoveryDenseSave(engine,100);const raw=engine.serializeStoredSave(save);storage.bytes.set(engine.STORAGE_KEY,raw);
  const album=readAlbumProgress(new Map(),storage),entry=album.entries.find(e=>e.envelope.id===id);
  expect(album).toMatchObject({discovered:10,postcards:6,worlds:2});expect(entry.save).toEqual(save);expect(nextEnvelopeSuggestion(album,id)).not.toBeNull();
  expect(storage.writes).toBe(0);expect(storage.bytes.size).toBe(1);expect(storage.getItem(engine.STORAGE_KEY)).toBe(raw);
 });
 it('binds all two hundred distinct source-art identities',async()=>{
  const catalog=await catalog200();expect(catalog.assets).toHaveLength(200);expect(catalog.envelopes).toHaveLength(20);
 });
});
