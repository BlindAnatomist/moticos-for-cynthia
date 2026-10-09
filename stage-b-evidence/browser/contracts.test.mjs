import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {C,E,oldEndpoint,completed240,all240} from './fixtures.mjs';
import {verifyGallery,verifyExport,digest} from './proofs.mjs';
import {collectionView} from '../../src/career/collectionNavigation.js';
import {CONTINUATIONS,VOLUMES} from '../../src/career/volumes.js';
test('real reducer fixtures retain historical boundary version and complete all 164 letters',()=>{
 const old=oldEndpoint(),raw=JSON.stringify(old),s=completed240();E.validateCareer(s);
 assert.equal(s.milestones.length,164);assert.equal(s.enteredChapters.length,24);assert.equal(s.xp,9000);assert.equal(s.coinsEarned,3820);
 assert.equal(s.continuationEntries[CONTINUATIONS[0].id].contentVersion,5);assert.equal(s.continuationEntries[CONTINUATIONS[1].id].contentVersion,6);assert.equal(JSON.stringify(old),raw);
 assert.deepEqual(E.upgradeCareer(s),s);
});
test('real 240-discovery fixture supports twelve pages and 160/40/40 volume scopes without mutation',()=>{
 const s=all240(),raw=JSON.stringify(s);assert.equal(s.discoveries.length,240);const seen=[];
 for(let page=0;page<12;page++){const v=collectionView(s,{volume:'all',chapter:'all',family:'all',page});assert.equal(v.pageCount,12);assert.equal(v.visibleIds.length,20);seen.push(...v.visibleIds);}
 assert.deepEqual(seen,C.CATALOG.PIECES.map(p=>p.id));assert.deepEqual(VOLUMES.map(v=>collectionView(s,{volume:v.id}).pieceIds.length),[160,40,40]);assert.equal(JSON.stringify(s),raw);
});
test('gallery proof validator rejects empty, missing, repeated, substituted and unreadable image records',()=>{
 // Synthetic rows exercise validator rejection only; they are not browser evidence.
 const expected=C.CATALOG.PIECES.map(p=>p.id),art=C.CATALOG.PIECES.map(p=>{const b=fs.readFileSync(new URL(p.art));return{id:p.id,sha256:digest(b),bytes:b.length};});
 const proof={seen:expected,images:art.map(a=>({pieceId:a.id,location:'collection',sha256:a.sha256,bytes:a.bytes,natural:[100,100],display:[100,100],src:'http://127.0.0.1:4198/unit-validator.webp'}))};assert(verifyGallery(proof,expected,art));
 const mutations=[p=>p.images=[],p=>p.seen.pop(),p=>p.images.pop(),p=>p.images[1]=p.images[0],p=>p.images[239].sha256=p.images[0].sha256,p=>p.images[0].display=[0,0],p=>p.images[0].natural=[NaN,100],p=>p.images[0].bytes=0,p=>p.images[0].src='https://example.com/art.webp'];
 for(const mutate of mutations){const p=structuredClone(proof);mutate(p);assert.throws(()=>verifyGallery(p,expected,art));}
});
test('download proof rejects empty bytes, fabricated PNG metadata and wrong identity',()=>{
 for(const bytes of [Buffer.alloc(0),Buffer.from('not a PNG')]){const row={pieceId:'b240-tr5',bytes:bytes.length,sha256:digest(bytes),dimensions:[1536,1120]};assert.throws(()=>verifyExport(bytes,row,'b240-tr5'));assert.throws(()=>verifyExport(bytes,row,'b240-ac5'));}
});
test('Stage B config cannot execute and does not borrow frozen run approval',()=>{
 const config=fs.readFileSync(new URL('./playwright.config.mjs',import.meta.url),'utf8');assert(config.includes("if(!args.includes('--list'))throw Error("));assert(!config.includes('MOTICOS_FULL_BROWSER_APPROVED'));assert(!config.includes('verifyApproval('));
});
