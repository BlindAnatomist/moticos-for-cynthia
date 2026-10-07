import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyEntry200, digest200 } from '../../scripts/expansion200Candidate.mjs';
import { createHash } from 'node:crypto';
import { ENVELOPES, EXPANSION200_ENVELOPES, getEnvelope, getMatchingEngine } from '../../src/matching/expansion200/registry.js';
import { ENVELOPES as OLD_ENVELOPES, getMatchingEngine as oldEngine } from '../../src/matching/cohesion/registry.js';
import { BOARD_ART_BOUNDS, COMPACT_BOARD_LABELS } from '../../src/matching/expansion200/boardArt.js';
import { BOARD_ART_BOUNDS as OLD_BOUNDS, COMPACT_BOARD_LABELS as OLD_LABELS } from '../../src/matching/cohesion/boardArt.js';
import { readAlbumProgress, readEnvelopeProgress, nextEnvelopeSuggestion, idleDiscovery } from '../../src/matching/progress.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from '../../src/matching/session.js';
import { denseSave, memoryStorage, actions, random } from '../capacity/fixtures.js';
import { fullDiscoveryDenseSave } from '../expansion160-browser/fullDiscoveryFixture.js';

const pieces = ENVELOPES.flatMap(e => e.catalog.PIECES);
const expectedRoutes = [['im1','im2','im3','im4','im5'],['pn1','pn2','pn3','pn4','pn5'],['sg1','sg2','sg3','sg4','sg5'],['cm1','cm2','cm3','cm4','cm5'],['sp1','sp2','sp3','sp4','sp5'],['zp1','zp2','zp3','zp4','zp5'],['ru1','ru2','ru3','ru4','ru5'],['th1','th2','th3','th4','th5']];
function finish(engine, initial, family) {
  let save = initial, merges = 0, draws = 0;
  while (!save.round.board.some(tile => tile?.pieceId === family.finalId)) {
    assert(merges + draws < 22);
    const pair = engine.mergePairs(save.round.board).find(([from]) => engine.CATALOG[save.round.board[from].pieceId].familyId === family.id);
    const previous = structuredClone(save);
    const action = pair ? { type: 'merge', from: pair[0], to: pair[1] } : { type: 'supply', familyId: family.id };
    save = engine.act(save, action); assert(save); assert(engine.validSave(save));
    assert.deepEqual(engine.act(save, { type: 'undo' }).round, previous.round);
    assert.deepEqual(engine.readSave(engine.serializeStoredSave(save)).save, save);
    if (pair) merges++; else draws++;
  }
  assert.equal(merges, 15); assert.equal(draws, 6); return save;
}

test('200 identities and routes are unique; exactly 32 new same-piece edges and 24 new postcards', () => {
  assert.equal(ENVELOPES.length, 20); assert.equal(EXPANSION200_ENVELOPES.length, 4); assert.equal(pieces.length, 200);
  assert.equal(new Set(pieces.map(p=>p.id)).size, 200);
  assert.equal(new Set(ENVELOPES.map(e=>e.id)).size, 20);
  assert.equal(new Set(ENVELOPES.map(e=>e.storageKey)).size, 20);
  assert.equal(new Set(ENVELOPES.flatMap(e=>e.catalog.FAMILIES.map(f=>f.id))).size, 40);
  assert.deepEqual(EXPANSION200_ENVELOPES.flatMap(e=>e.catalog.FAMILIES.map(f=>f.pieceIds)), expectedRoutes);
  assert.equal(EXPANSION200_ENVELOPES.flatMap(e=>e.catalog.PIECES.filter(p=>e.catalog.nextPiece(p.id))).length, 32);
  assert.equal(EXPANSION200_ENVELOPES.flatMap(e=>e.catalog.PIECES.filter(p=>p.tier>=3)).length, 24);
  assert.equal(pieces.filter(p=>p.tier>=3).length, 120);
  for (const id of ['__proto__','constructor','missing',null,{},1]) {assert.equal(getEnvelope(id),null);assert.equal(getMatchingEngine(id),null);}
});
test('all sixteen accepted descriptors, engines and board-art identities are preserved', () => {
  assert.deepEqual(ENVELOPES.slice(0,16), OLD_ENVELOPES);
  for(const e of OLD_ENVELOPES){assert.equal(getEnvelope(e.id),e);assert.equal(getMatchingEngine(e.id),oldEngine(e.id));}
  for(const [id,b] of Object.entries(OLD_BOUNDS))assert.equal(BOARD_ART_BOUNDS[id],b);
  for(const [id,label] of Object.entries(OLD_LABELS))assert.equal(COMPACT_BOARD_LABELS[id],label);
});
test('all art URLs resolve, new crops fit their sources and labels are compact', () => {
  const filenames=[];
  for (const e of EXPANSION200_ENVELOPES) for(const p of e.catalog.PIECES){
    assert(existsSync(new URL(p.art)));const b=BOARD_ART_BOUNDS[p.id];assert.deepEqual(b.source,[768,768]);
    const [x,y,w,h]=b.crop,[ix,iy,iw,ih]=b.ink;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=768&&y+h<=768);assert(ix>=x&&iy>=y&&ix+iw<=x+w&&iy+ih<=y+h);
    assert.equal(typeof COMPACT_BOARD_LABELS[p.id],'string');assert(COMPACT_BOARD_LABELS[p.id].length<=9);assert(p.shortName.length<=12);assert(!/[/\\:*?"<>|]/.test(p.name));
  }
  for(const p of pieces.filter(p=>p.tier>=3))filenames.push(`moticos-${p.name.toLowerCase().replaceAll(' ','-')}.png`);
  assert.equal(new Set(filenames).size,120);
});
test('empty 200 album is read-only and does not initialize or credit any saves', () => {
  const storage=memoryStorage(),cache=new Map(),album=readAlbumProgress(cache,storage);
  assert.equal(album.entries.length,20);assert.equal(album.totalPieces,200);assert.equal(album.totalWorlds,40);assert.equal(album.totalPostcards,120);
  assert.equal(album.discovered,0);assert.equal(album.postcards,0);assert.equal(storage.writes,0);assert.equal(cache.size,0);
});
test('all twenty full-discovery, 100-history saves fit 5 MiB and are summarized without rewriting', () => {
  const storage=memoryStorage({limit:5*1024*1024}), originals=new Map();
  for(const [index,e]of ENVELOPES.entries()){
    const engine=getMatchingEngine(e.id),save=fullDiscoveryDenseSave(engine,index+41),session=openEnvelopeSession(engine,new Map(),storage);
    assert.equal(commitEnvelopeSession(engine,session,save,storage),true);assert.equal(session.blocked,false);assert.equal(save.history.length,100);
    originals.set(e.storageKey,{raw:storage.getItem(e.storageKey),save});
  }
  const before=storage.writes,album=readAlbumProgress(new Map(),storage);
  assert.equal(album.discovered,200);assert.equal(album.worlds,40);assert.equal(album.postcards,120);
  for(const entry of album.entries){const original=originals.get(entry.envelope.storageKey);assert.deepEqual(entry.save,original.save);assert.equal(storage.getItem(entry.envelope.storageKey),original.raw);assert.equal(nextEnvelopeSuggestion(album,entry.envelope.id),null);}
  assert.equal(storage.writes,before);assert.equal(storage.bytes.size,20);
});
for(const e of ENVELOPES)test(`${e.id}: legacy JSON and compact saves survive reload and 100 consecutive Undos`,()=>{
  const engine=getMatchingEngine(e.id),storage=memoryStorage(),original=denseSave(engine,81),cache=new Map();assert.equal(original.history.length,100);
  const raw=' \n'+JSON.stringify(original,null,1)+'\n';storage.bytes.set(e.storageKey,raw);
  for(const other of ENVELOPES)if(other.id!==e.id)storage.bytes.set(other.storageKey,`untouched-${other.id}`);
  const session=openEnvelopeSession(engine,cache,storage);assert.equal(storage.writes,0);assert.deepEqual(session.save,original);assert.equal(storage.getItem(e.storageKey),raw);
  let expected=engine.act(original,{type:'sound',enabled:!original.sound});assert(commitEnvelopeSession(engine,session,expected,storage));
  for(let i=0;i<100;i++){expected=engine.act(expected,{type:'undo'});assert(expected);const next=engine.act(session.save,{type:'undo'});assert(commitEnvelopeSession(engine,session,next,storage));assert.deepEqual(engine.readSave(storage.getItem(e.storageKey)).save,expected);}
  assert.equal(engine.act(session.save,{type:'undo'}),null);
  for(const other of ENVELOPES)if(other.id!==e.id)assert.equal(storage.getItem(other.storageKey),`untouched-${other.id}`);
});
for(const e of EXPANSION200_ENVELOPES){const engine=getMatchingEngine(e.id);
  test(`${e.id}: every pair accepts only identical nonfinal IDs, no other envelope can match`,()=>{
    for(const a of engine.PIECES)for(const b of pieces)assert.equal(engine.compatible(a.id,b.id),a.id===b.id&&a.tier<5);
    assert.equal(engine.FAMILIES.length,2);for(const f of engine.FAMILIES)assert.equal(f.material,16);
  });
  for(const reverse of [false,true])test(`${e.id}: both routes complete with 30 merges, 12 draws, six earned postcards; order ${reverse}`,()=>{
    let save=engine.newSave();const families=reverse?[...engine.FAMILIES].reverse():engine.FAMILIES;
    save=finish(engine,save,families[0]);assert.equal(idleDiscovery(e,save).family.id,families[1].id);
    save=finish(engine,save,families[1]);assert.equal(save.round.moves,42);assert.equal(save.round.merges,30);assert.equal(engine.completedFinals(save.round.board).length,2);
    assert.deepEqual(new Set(save.discoveries),new Set(engine.PIECES.map(p=>p.id)));assert.equal(engine.PIECES.filter(p=>p.tier>=3&&save.discoveries.includes(p.id)).length,6);
    for(const action of [{type:'undo'},{type:'reset'},{type:'cut',index:save.round.board.findIndex(Boolean)}]){const next=engine.act(save,action);assert(next);assert.deepEqual(next.discoveries,save.discoveries);assert.equal(idleDiscovery(e,next).complete,true);}
    for(const other of ENVELOPES)if(other.id!==e.id)assert.equal(getMatchingEngine(other.id).readSave(engine.serializeStoredSave(save)).status,'invalid');
    const storage=memoryStorage(),album=readAlbumProgress(new Map(),storage,{id:e.id,save});assert(nextEnvelopeSuggestion(album,e.id));assert.equal(storage.writes,0);
  });
  test(`${e.id}: invalid/future save, quota, stale tab and storage-clear protections retain original bytes`,()=>{
    for(const raw of ['invalid bytes',JSON.stringify({...engine.newSave(),version:99})]){
      const storage=memoryStorage();storage.bytes.set(e.storageKey,raw);const session=openEnvelopeSession(engine,new Map(),storage);assert(session.blocked);assert(session.invalid);
      assert(commitEnvelopeSession(engine,session,engine.act(session.save,{type:'merge',from:6,to:7}),storage));assert.equal(storage.getItem(e.storageKey),raw);assert.equal(storage.writes,0);
    }
    const storage=memoryStorage(),save=denseSave(engine),raw=engine.serializeStoredSave(save);storage.bytes.set(e.storageKey,raw);
    const session=openEnvelopeSession(engine,new Map(),storage);storage.failWrite(true);const next=engine.act(save,{type:'sound',enabled:!save.sound});assert(commitEnvelopeSession(engine,session,next,storage));assert(session.blocked);assert.equal(storage.getItem(e.storageKey),raw);assert.deepEqual(session.save.history,save.history);
    storage.failWrite(false);const stale=openEnvelopeSession(engine,new Map(),storage),winner=engine.act(engine.act(save,{type:'undo'}),{type:'undo'}),winraw=engine.serializeStoredSave(winner);storage.bytes.set(e.storageKey,winraw);commitEnvelopeSession(engine,stale,engine.act(save,{type:'undo'}),storage);assert(stale.conflict);assert.equal(storage.getItem(e.storageKey),winraw);
    const clear=openEnvelopeSession(engine,new Map(),storage);assert(observeEnvelopeStorage(engine,clear,{key:null,newValue:null}));assert(clear.blocked);
  });
  test(`${e.id}: 100 varied legal actions preserve material, codec and reversible rounds`,()=>{
    const r=random(819);let save=engine.newSave();
    for(let n=0;n<100;n++){const list=actions(engine,save),action=list[Math.floor(r()*list.length)],previous=structuredClone(save);assert(action);const next=engine.act(save,action);assert(next);assert.deepEqual(save,previous);assert(engine.validSave(next));assert.deepEqual(engine.readSave(engine.serializeStoredSave(next)).save,next);assert.deepEqual(engine.act(next,{type:'undo'}).round,save.round);save=next;}
  });
}

// Labeled synthetic entry fixtures test the manifest guard, not browser rendering.
test('200 build manifest rejects empty, foreign, missing and unstamped entry fixtures',()=>{
 const root=mkdtempSync(join(tmpdir(),'moticos-200-manifest-'));mkdirSync(join(root,'dist-expansion200/assets'),{recursive:true});
 const js='console.log("synthetic entry guard fixture")',css='body{color:black}';writeFileSync(join(root,'dist-expansion200/assets/index-test.js'),js);writeFileSync(join(root,'dist-expansion200/assets/index-test.css'),css);
 const emitted=[{file:'assets/index-test.js',bytes:Buffer.byteLength(js),sha256:digest200(js)},{file:'assets/index-test.css',bytes:Buffer.byteLength(css),sha256:digest200(css)}];
 const good='<script type="module" src="/assets/index-test.js"></script><link rel="stylesheet" href="/assets/index-test.css"><div id="root"></div>';
 const check=html=>{writeFileSync(join(root,'dist-expansion200/index.html'),html);return verifyEntry200(root,emitted);};
 try{assert.deepEqual(check(good),{entryScripts:['/assets/index-test.js'],stylesheets:['/assets/index-test.css']});for(const bad of ['', '<div id="root"></div>',good.replace('type="module"','type="text/plain"'),good.replace('/assets/index-test.js','https://example.invalid/x.js'),good.replace('/assets/index-test.js','/assets/../index-test.js'),good.replace('/assets/index-test.js','/assets/missing.js'),good.replace('<link rel="stylesheet" href="/assets/index-test.css">',''),good.replace('<div id="root"></div>',''),good+'<script type="module" src="/assets/index-test.js"></script>'])assert.throws(()=>check(bad));writeFileSync(join(root,'dist-expansion200/assets/index-test.js'),'');assert.throws(()=>check(good));}finally{rmSync(root,{recursive:true,force:true});}
});

for(const envelope of EXPANSION200_ENVELOPES)test(`${envelope.id}: compact-stage fixture uses sixteen units and a fully legal reversible cascade`,async()=>{
 const {mixedStageFixture}=await import('./mixedStageFixture.js');const engine=getMatchingEngine(envelope.id),{finals,mixed}=mixedStageFixture(engine);
 assert.equal(engine.completedFinals(finals.round.board).length,2);assert(engine.validSave(mixed));assert.equal(mixed.history.length,50);
 let save=mixed;
 for(const family of engine.FAMILIES){
  const familyPieces=mixed.round.board.filter(tile=>tile&&engine.CATALOG[tile.pieceId].familyId===family.id).map(tile=>tile.pieceId);
  assert.deepEqual(familyPieces.sort(),[family.pieceIds[0],family.pieceIds[0],...family.pieceIds.slice(1,4)].sort());
  assert.equal(familyPieces.reduce((sum,id)=>sum+engine.CATALOG[id].mass,0),16);
  for(let tier=0;tier<4;tier++){const id=family.pieceIds[tier],indices=save.round.board.flatMap((tile,index)=>tile?.pieceId===id?[index]:[]);assert.equal(indices.length,2);save=engine.act(save,{type:'merge',from:indices[0],to:indices[1]});assert(save);}
 }
 assert.equal(engine.completedFinals(save.round.board).length,2);assert.deepEqual(new Set(save.discoveries),new Set(finals.discoveries));assert.deepEqual(engine.readSave(engine.serializeStoredSave(mixed)).save,mixed);
});
