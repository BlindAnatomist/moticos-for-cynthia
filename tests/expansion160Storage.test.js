import { describe, it, expect } from 'vitest';
import { ENVELOPES, EXPANSION160_ENVELOPES, getMatchingEngine } from '../src/matching/expansion160/registry.js';
import { readAlbumProgress, readEnvelopeProgress } from '../src/matching/progress.js';
import { openEnvelopeSession, commitEnvelopeSession } from '../src/matching/session.js';
import { denseSave, memoryStorage } from './capacity/fixtures.js';

describe('160-piece registry with lossless storage (real expansion build alias)',()=>{
 it('the album observes all sixteen envelopes read-only with exact saved data',()=>{
  const storage=memoryStorage(), originals=new Map();
  for(const e of ENVELOPES){const engine=getMatchingEngine(e.id),save=denseSave(engine,41);const raw=engine.serializeStoredSave(save);storage.bytes.set(e.storageKey,raw);originals.set(e.storageKey,{save,raw});}
  const before=storage.writes,album=readAlbumProgress(new Map(),storage);
  expect(album.entries).toHaveLength(16);expect(album.totalPieces).toBe(160);expect(album.totalPostcards).toBe(96);expect(album.totalWorlds).toBe(32);expect(album.unread).toBe(false);
  for(const e of ENVELOPES){expect(readEnvelopeProgress(e,new Map(),storage).save).toEqual(originals.get(e.storageKey).save);expect(storage.getItem(e.storageKey)).toBe(originals.get(e.storageKey).raw);}
  expect(storage.writes).toBe(before);
 });
 it.each(EXPANSION160_ENVELOPES.map(e=>[e.id]))('%s reads complete v1 state and retains every one of 100 successive Undos',id=>{
  const engine=getMatchingEngine(id),storage=memoryStorage(),original=denseSave(engine,81);expect(original.history).toHaveLength(100);
  const raw=' \n'+JSON.stringify(original,null,1)+'\n';storage.bytes.set(engine.STORAGE_KEY,raw);
  for(const e of ENVELOPES)if(e.id!==id)storage.bytes.set(e.storageKey,`untouched-${e.id}`);
  const session=openEnvelopeSession(engine,new Map(),storage);expect(storage.writes).toBe(0);expect(session.save).toEqual(original);
  // Sound changes only the setting and triggers storage migration without trimming history.
  let expected=engine.act(original,{type:'sound',enabled:!original.sound});expect(commitEnvelopeSession(engine,session,expected,storage)).toBe(true);
  expect(engine.readSave(storage.getItem(engine.STORAGE_KEY)).save).toEqual(expected);expect(expected.history).toHaveLength(100);
  for(let i=0;i<100;i++){expected=engine.act(expected,{type:'undo'});const next=engine.act(session.save,{type:'undo'});expect(commitEnvelopeSession(engine,session,next,storage)).toBe(true);expect(engine.readSave(storage.getItem(engine.STORAGE_KEY)).save).toEqual(expected);}
  expect(engine.act(session.save,{type:'undo'})).toBeNull();for(const e of ENVELOPES)if(e.id!==id)expect(storage.getItem(e.storageKey)).toBe(`untouched-${e.id}`);
 },30000);
 it('new-envelope quota and stale-write failures preserve original bytes and all histories',()=>{
  const engine=getMatchingEngine(EXPANSION160_ENVELOPES[0].id),storage=memoryStorage(),save=denseSave(engine),raw=engine.serializeSave(save);storage.bytes.set(engine.STORAGE_KEY,raw);
  const session=openEnvelopeSession(engine,new Map(),storage),next=engine.act(save,{type:'sound',enabled:!save.sound});storage.failWrite(true);commitEnvelopeSession(engine,session,next,storage);expect(session.blocked).toBe(true);expect(session.save.history).toEqual(save.history);expect(storage.getItem(engine.STORAGE_KEY)).toBe(raw);
  storage.failWrite(false);const stale=openEnvelopeSession(engine,new Map(),storage);const winner=engine.act(engine.act(save,{type:'undo'}),{type:'undo'}),winraw=engine.serializeStoredSave(winner);storage.bytes.set(engine.STORAGE_KEY,winraw);
  const staleNext=engine.act(save,{type:'undo'});expect(engine.serializeStoredSave(staleNext)).not.toBe(winraw);commitEnvelopeSession(engine,stale,staleNext,storage);expect(stale.blocked).toBe(true);expect(storage.getItem(engine.STORAGE_KEY)).toBe(winraw);
 });
});

it('fits all sixteen authored dense saves with every history inside the simulated 5 MiB budget', () => {
 const storage = memoryStorage({ limit: 5 * 1024 * 1024 });
 for (const [index, envelope] of ENVELOPES.entries()) {
  const engine = getMatchingEngine(envelope.id), save = denseSave(engine, index + 92);
  const session = openEnvelopeSession(engine, new Map(), storage);
  expect(commitEnvelopeSession(engine, session, save, storage)).toBe(true);
  expect(session.blocked).toBe(false);
  expect(session.save.history).toHaveLength(100);
  expect(engine.readSave(storage.getItem(envelope.storageKey)).save).toEqual(save);
 }
 expect(storage.bytes.size).toBe(16);
});
