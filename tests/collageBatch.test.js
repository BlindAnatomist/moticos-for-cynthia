import { describe, expect, it } from 'vitest';
import { BATCH_ENVELOPES, ENVELOPES, getEnvelope, getMatchingEngine } from '../src/matching/batch/registry.js';
import { ENVELOPES as BASE_ENVELOPES, getMatchingEngine as baseEngine } from '../src/matching/registry.js';
import { createMatchingCatalog } from '../src/matching/catalogFactory.js';
import { openEnvelopeSession, commitEnvelopeSession } from '../src/matching/session.js';
import { BATCH_BOUNDS, BATCH_LABELS } from '../src/matching/batch/bounds.js';

function finish(engine, initial, family) {
 let save = initial, merges = 0, draws = 0;
 while (!save.round.board.some(tile => tile?.pieceId === family.finalId)) {
  expect(merges + draws).toBeLessThan(22);
  const pair = engine.mergePairs(save.round.board).find(([from]) => engine.CATALOG[save.round.board[from].pieceId].familyId === family.id);
  const action = pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: family.id };
  const before = structuredClone(save);
  const next = engine.act(save, action);
  expect(save).toEqual(before); expect(next).not.toBeNull(); save = next;
  if (pair) merges++; else draws++;
  if (save.discoveries.includes(family.pieceIds[2])) expect(merges).toBeGreaterThanOrEqual(3);
 }
 expect(merges).toBe(15); expect(draws).toBe(6);
 return save;
}

describe('private forty-piece collage catalog', () => {
 it('adds exactly four complete envelopes and preserves existing descriptors and engines', () => {
  expect(BATCH_ENVELOPES).toHaveLength(4); expect(ENVELOPES).toHaveLength(8);
  expect(ENVELOPES.slice(0, 4)).toEqual(BASE_ENVELOPES);
  for (const old of BASE_ENVELOPES) { expect(getEnvelope(old.id)).toBe(old); expect(getMatchingEngine(old.id)).toBe(baseEngine(old.id)); }
  const pieces = ENVELOPES.flatMap(e => e.catalog.PIECES), families = ENVELOPES.flatMap(e => e.catalog.FAMILIES);
  expect(pieces).toHaveLength(80); expect(new Set(pieces.map(p => p.id)).size).toBe(80);
  expect(new Set(families.map(f => f.id)).size).toBe(16);
  expect(new Set(ENVELOPES.map(e => e.storageKey)).size).toBe(8);
  expect(getEnvelope('__proto__')).toBeNull(); expect(getMatchingEngine('missing')).toBeNull();
 });
 it('source-binds all forty images and covers their exact board bounds and compact labels', () => {
  const pieces = BATCH_ENVELOPES.flatMap(e => e.catalog.PIECES);
  expect(pieces).toHaveLength(40); expect(new Set(pieces.map(p => p.art)).size).toBe(40);
  for (const p of pieces) {
   expect(p.art).toMatch(/\.webp$/); expect(p.art).not.toMatch(/public\/art|undefined/);
   const b = BATCH_BOUNDS[p.id]; expect(b.source).toEqual([768, 768]);
   const [x, y, w, h] = b.crop; expect(Math.min(x, y)).toBeGreaterThanOrEqual(0); expect(x+w).toBeLessThanOrEqual(768); expect(y+h).toBeLessThanOrEqual(768);
   expect(Math.min(w,h)).toBeGreaterThan(0);
   const scale=Math.min((47.515625-2)/w,(36.515625-2)/h); expect(Math.max(b.ink[2],b.ink[3])*scale).toBeGreaterThanOrEqual(33); expect(BATCH_LABELS[p.id].length).toBeGreaterThan(0); expect(BATCH_LABELS[p.id].length).toBeLessThanOrEqual(6);
   expect(p.shortName.length).toBeLessThanOrEqual(12);
   expect(p.name).not.toMatch(/[\/\\:*?"<>|]/); // Export uses this exact authored title.
  }
 });
 it('retains the ordinary catalog factory contract and rejects an invalid URL resolver', () => {
  expect(() => createMatchingCatalog({ id: 'bad', rows: [], families: [], artUrl: null })).toThrow();
 });
});

for (const envelope of BATCH_ENVELOPES) describe(envelope.title, () => {
 const engine = getMatchingEngine(envelope.id);
 it('only matches identical canonical pictures at the same nonfinal tier', () => {
  expect(envelope.id).toMatch(/^batch-/); expect(envelope.storageKey).toMatch(/^moticos\.matching\.batch-/);
  for (const a of engine.PIECES) for (const b of engine.PIECES) expect(engine.compatible(a.id,b.id)).toBe(a.id===b.id && a.tier<5);
 });
 it('completes both authored routes with 30 merges and twelve pair draws', () => {
  for (const order of [engine.FAMILIES,[...engine.FAMILIES].reverse()]) {
   let save = engine.newSave();
   for (const family of order) save = finish(engine, save, family);
   expect(save.round.merges).toBe(30); expect(save.round.moves).toBe(42);
   expect(new Set(save.discoveries)).toEqual(new Set(engine.PIECES.map(p=>p.id)));
   expect(engine.completedFinals(save.round.board)).toHaveLength(2);
   const raw = engine.serializeSave(save); expect(engine.readSave(raw)).toMatchObject({status:'loaded',save});
   expect(engine.readSave(JSON.stringify({...save,version:2})).status).toBe('unsupported');
   expect(baseEngine(BASE_ENVELOPES[0].id).readSave(raw).status).toBe('invalid');
   const other = BATCH_ENVELOPES.find(e=>e.id!==envelope.id); expect(getMatchingEngine(other.id).readSave(raw).status).toBe('invalid');
   for(const action of [{type:'undo'},{type:'cut',index:save.round.board.findIndex(Boolean)},{type:'reset'}]) {
    const next = engine.act(save,action); expect(next).not.toBeNull(); expect(next.discoveries).toEqual(save.discoveries);
   }
  }
 });
 it('saves only its own key and preserves original stored bytes on quota/conflict', () => {
  const bytes = new Map(BASE_ENVELOPES.map(e=>[e.storageKey,'original published bytes'])), cache = new Map();
  const storage = {getItem:key=>bytes.get(key)??null,setItem:(key,value)=>bytes.set(key,value)};
  const session = openEnvelopeSession(engine,cache,storage),next = engine.act(session.save,{type:'merge',from:6,to:7});
  expect(commitEnvelopeSession(engine,session,next,storage)).toBe(true);
  const saved = bytes.get(engine.STORAGE_KEY); expect(engine.readSave(saved).status).toBe('loaded');
  for(const e of BASE_ENVELOPES)expect(bytes.get(e.storageKey)).toBe('original published bytes');
  const second=engine.act(next,{type:'move',from:7,to:6});
  storage.setItem=()=>{throw new Error('quota fixture');};
  expect(commitEnvelopeSession(engine,session,second,storage)).toBe(true);expect(session.blocked).toBe(true);expect(session.save).toBe(second);expect(bytes.get(engine.STORAGE_KEY)).toBe(saved);
 });
});
