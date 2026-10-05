import { it, expect } from 'vitest';
import { ENVELOPES,getMatchingEngine,EXPANSION_ENVELOPES } from '../src/matching/expansion/registry.js';
import { fullDiscoveryDenseSave } from './expansion-browser/fullDiscoveryFixture.js';
it('creates all twelve fully discovered 24-tile fixtures through legal actions, with 100 retained histories',()=>{
 for(const e of ENVELOPES){const engine=getMatchingEngine(e.id),save=fullDiscoveryDenseSave(engine,21);expect(engine.validSave(save)).toBe(true);expect(save.history).toHaveLength(100);expect(save.round.board.filter(Boolean)).toHaveLength(24);expect(new Set(save.discoveries)).toEqual(new Set(engine.PIECES.map(p=>p.id)));expect(engine.readSave(engine.serializeStoredSave(save)).save).toEqual(save);}
});
it('pins exactly 24 new postcard identities and 72 in the whole collection',()=>{
 expect(EXPANSION_ENVELOPES.flatMap(e=>e.catalog.PIECES.filter(p=>p.tier>=3))).toHaveLength(24);
 expect(ENVELOPES.flatMap(e=>e.catalog.PIECES.filter(p=>p.tier>=3))).toHaveLength(72);
});
