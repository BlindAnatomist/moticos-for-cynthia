import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {decodeMatchingSave} from './capacity/readStoredSave.js';
import {ENVELOPES as PREVIOUS_ENVELOPES,getMatchingEngine as getPreviousEngine} from '../src/matching/expansion/registry.js';
import {ENVELOPES,EXPANSION160_ENVELOPES,getMatchingEngine} from '../src/matching/expansion160/registry.js';
import {fullDiscoveryDenseSave} from './expansion160-browser/fullDiscoveryFixture.js';
it.each(ENVELOPES.map(e=>[e.id]))('%s legally creates its dense 100-history fixture and survives every exact Undo',id=>{
 expect(ENVELOPES).toHaveLength(16);const e=ENVELOPES.find(e=>e.id===id);{const engine=getMatchingEngine(e.id);let save=fullDiscoveryDenseSave(engine,21);expect(engine.validSave(save)).toBe(true);expect(save.history).toHaveLength(100);expect(save.round.board.filter(Boolean)).toHaveLength(24);expect(new Set(save.discoveries)).toEqual(new Set(engine.PIECES.map(p=>p.id)));const originalSave=JSON.stringify(save);for(const raw of [engine.serializeSave(save),engine.serializeStoredSave(save)]){expect(decodeMatchingSave(raw,e.storageKey)).toEqual(save);expect(JSON.stringify(save)).toBe(originalSave);}expect(engine.readSave(engine.serializeStoredSave(save)).save).toEqual(save);for(let remaining=99;remaining>=0;remaining--){const before=structuredClone(save.history.at(-1));save=engine.act(save,{type:'undo'});expect(save.round).toEqual(before);expect(save.history).toHaveLength(remaining);expect(engine.readSave(engine.serializeStoredSave(save)).save).toEqual(save);expect(decodeMatchingSave(engine.serializeStoredSave(save),e.storageKey)).toEqual(save);}}
});
it('pins forty additions, eight families, 24 new postcards and 96 total',()=>{expect(EXPANSION160_ENVELOPES).toHaveLength(4);expect(EXPANSION160_ENVELOPES.flatMap(e=>e.catalog.PIECES)).toHaveLength(40);expect(EXPANSION160_ENVELOPES.flatMap(e=>e.catalog.FAMILIES)).toHaveLength(8);expect(EXPANSION160_ENVELOPES.flatMap(e=>e.catalog.PIECES.filter(p=>p.tier>=3))).toHaveLength(24);expect(ENVELOPES.flatMap(e=>e.catalog.PIECES.filter(p=>p.tier>=3))).toHaveLength(96);});
it('current preflight tests source behavior, then builds once and only lists browser cases',()=>{const s=readFileSync('scripts/preflightExpansion160.sh','utf8');expect(s.indexOf('bash scripts/testCurrentCandidate.sh')).toBeLessThan(s.indexOf('vite build'));expect(s.indexOf('node scripts/stampExpansion160.mjs')).toBeLessThan(s.indexOf('verifyExpansion160Build.mjs freeze'));for(const line of s.split('\n').filter(line=>line.includes('playwright test')))expect(line).toContain('--list');});

it('save decoder preserves original engines and rejects unknown, malformed, future and wrong-envelope saves',()=>{
 expect(PREVIOUS_ENVELOPES).toHaveLength(12);
 for(const e of PREVIOUS_ENVELOPES){expect(ENVELOPES.find(current=>current.id===e.id)).toBe(e);expect(getMatchingEngine(e.id)).toBe(getPreviousEngine(e.id));}
 const garden=getMatchingEngine('matching-garden'),gardenSave=garden.newSave();
 expect(decodeMatchingSave(garden.serializeStoredSave(gardenSave))).toEqual(gardenSave);
 expect(decodeMatchingSave(null)).toBeNull();
 expect(()=>decodeMatchingSave(garden.serializeSave(gardenSave),'unknown-key')).toThrow('Unknown matching test save key');
 for(const [index,e] of ENVELOPES.entries()){
  const engine=getMatchingEngine(e.id),save=engine.newSave(),before=JSON.stringify(save),other=ENVELOPES[(index+1)%ENVELOPES.length];
  for(const raw of ['bad-json',JSON.stringify({...save,version:999}),getMatchingEngine(other.id).serializeStoredSave(getMatchingEngine(other.id).newSave())])expect(()=>decodeMatchingSave(raw,e.storageKey)).toThrow('Unread matching test save');
  expect(JSON.stringify(save)).toBe(before);
 }
});
