import {verifyRenderedArt} from '../scripts/expansion160RenderedArt.mjs';
import {it,expect} from 'vitest';
import {verifyJourneyJournal} from '../scripts/expansion160JourneyEvidence.mjs';
import {journeyEvents} from './expansion160EvidenceFixtures.js';
const envelope={id:'example',pieceIds:['a1','a2','a3','a4','a5','b1','b2','b3','b4','b5'],starters:['a1','b1'],finals:['a5','b5']};
it('requires fresh-save, 30 earned merges, 12 pair draws, every tier and six real exports',()=>expect(verifyJourneyJournal(journeyEvents(envelope),'profile',envelope)).toMatchObject({earnedPieces:10,postcards:6,geometryViews:24}));
it.each(['fresh-save','merge','supply','stage-start','stage-complete','export-start','export-complete','complete'])('rejects missing journey phase %s',phase=>expect(()=>verifyJourneyJournal(journeyEvents(envelope).filter(e=>e.event!==phase),'profile',envelope)).toThrow());
it.each([e=>e[1].raw='seeded',e=>e.at(-1).elapsedMs=180000,e=>e.find(x=>x.event==='merge').to='b2',e=>e.find(x=>x.event==='stage-complete').sizes=['native'],e=>e.find(x=>x.event==='export-complete').sha256='not-a-hash',e=>e.splice(2,0,{event:'unknown',elapsedMs:2}),e=>e.splice(2,0,{event:'fresh-save',elapsedMs:1,raw:null}),e=>e.find(x=>x.event==='stage-complete').id='b1'])('fails closed on malformed journey evidence',mutate=>{const events=journeyEvents(envelope);mutate(events);expect(()=>verifyJourneyJournal(events,'profile',envelope)).toThrow();});

const assets=[{id:'a1',file:'assets/a1-exact.webp',sha256:'b'.repeat(64)}],art={source:'http://127.0.0.1:4197/assets/a1-exact.webp',naturalWidth:768,naturalHeight:768};
it('binds rendered artwork to exact manifest source and tested origin',()=>expect(verifyRenderedArt(art,'a1',assets).id).toBe('a1'));
it.each(['https://other.invalid/assets/a1-exact.webp','http://127.0.0.1:4198/assets/a1-exact.webp','http://127.0.0.1:4197/assets/a2-exact.webp','http://127.0.0.1:4197/assets/a1-exact.webp?stale=1','http://127.0.0.1:4197/assets/a1-exact.webp#old'])('rejects mismatched rendered source %s',source=>expect(()=>verifyRenderedArt({...art,source},'a1',assets)).toThrow());

import {verifyGeometry} from '../scripts/expansion160GeometryEvidence.mjs';
import {geometryFixture} from './expansion160EvidenceFixtures.js';
const viewport={width:320,height:568},geometryAssets=[{id:'a1',file:'a1.webp',sha256:'b'.repeat(64)}];
it('revalidates saved geometry with exact piece, source and requested viewport',()=>expect(verifyGeometry(geometryFixture(viewport,'a1'),viewport,'a1',geometryAssets).controls).toHaveLength(36));
it.each([g=>g.viewport.width=390,g=>g.controls.pop(),g=>g.regions.pop(),g=>g.controls[0].hitTests[0].clear=false,g=>g.artwork[0].source='http://127.0.0.1:4197/other.webp',g=>g.artwork[0].pieceId='b1',g=>g.body.height=700,g=>g.text=[],g=>g.artwork=[]])('rejects malformed saved geometry',mutate=>{const geometry=geometryFixture(viewport,'a1');mutate(geometry);expect(()=>verifyGeometry(geometry,viewport,'a1',geometryAssets)).toThrow();});
