// NEW recovery contracts. Passing these is reducer/session evidence, never native browser acceptance.
import test from 'node:test';import assert from 'node:assert/strict';
import * as C from '../src/career/content.js';import * as E from '../src/career/engine.js';import * as V from '../src/career/volumes.js';
import * as C7 from '../src/career/content.v7.js';import * as E7 from '../src/career/engine.v7.js';
import P from '../src/career/continuation.v8.js';
import {createCareerSession} from '../src/career/session.js';import {createCareerSession as session7} from '../src/career/session.v7.js';
import {BOARD_ART_BOUNDS,COMPACT_BOARD_LABELS} from '../src/career/boardArt.js';import {collectionView} from '../src/career/collectionNavigation.js';
import {zeroXPRewardPrefix,storyMilestoneNote,goalAccessibleLabel,postcardSubtitle,orderPresentation} from '../src/career/feedback.js';
import {storageHarness,legacyFixtures} from '../tests/campaign-browser/save-fixtures.mjs';
import {D,clone,initial,enter,route,historical280,purchased280} from './fixtures.mjs';
const retained=['board','chapterId','enteredChapters','xp','coinsEarned','coinsSpent','revision','nextOrderSeq','nextTileSeq','discoveries','orders','heldOrders','suspendedStory','resumedOptionalId','focusedOrderId','activeSourceIds','unlockedSources','chapterEntryVersions','purchases','upgrades','storyCompletions','milestones','receipts','continuationEntries','ordinaryCursor','sound','largeText'];
const same=(a,b,keys=retained)=>{for(const k of keys)assert.deepEqual(b[k],a[k],k);};
let canonical;const main=()=>canonical??=route();

test('catalog is append-only 320 pieces,64 families,32 chapters and202 stories at schema8/rules2',()=>{
 assert.equal(C.CATALOG.PIECES.length,320);assert.equal(C.FAMILIES.length,64);assert.equal(C.CHAPTERS.length,32);assert.equal(C.STORY_ORDERS.length,202);assert.equal(C.SCHEMA_VERSION,8);assert.equal(C.CONTENT_VERSION,8);assert.equal(C.RULES_VERSION,2);
 for(const old of C7.CATALOG.PIECES){const now=C.CATALOG.pieceOf(old.id);for(const k of ['id','name','shortName','description','familyId','tier','mass','packId'])assert.deepEqual(now[k],old[k]);assert.equal(now.art,old.art);}
 for(const old of C7.STORY_ORDERS)assert.deepEqual(C.orderTemplate(old.id,7),C7.orderTemplate(old.id,7));
 assert.equal(P.story.length,19);assert.equal(P.story.reduce((n,o)=>n+o.xp,0),455);assert.equal(P.story.reduce((n,o)=>n+o.coins,0),200);
 assert.equal(P.postscripts.length,8);assert(P.story.every(o=>o.requirements.every(r=>C.CATALOG.pieceOf(r.pieceId).tier<5)));
 for(const p of C.CATALOG.PIECES.slice(280)){assert(p.name&&p.description&&COMPACT_BOARD_LABELS[p.id]);assert(BOARD_ART_BOUNDS[p.id]);assert.equal(p.shortName,COMPACT_BOARD_LABELS[p.id]);}
});

test('v7 migration preserves state and exposes an explicit unentered fourth boundary',()=>{
 for(const old of [historical280(),purchased280()]){const s=E.upgradeCareer(clone(old));E.validateCareer(s);same(old,s);assert.equal(s.schemaVersion,8);assert(!s.continuationEntries[V.CONTINUATIONS[3].id]);}
 const b=V.CONTINUATIONS[3],s=initial();assert.equal(b.minimumXP,9375);assert.equal(b.requiredPreviousStoryIds.length,183);assert.equal(b.fromChapterId,'next-move');assert.equal(C.CHAPTERS[27].nextId,null);assert(E.canEnterContinuation(s,b.id));assert(!E.canStartNextChapter(s));assert(!s.unlockedSources.includes('paper-rabbit'));const before=clone(s),next=enter(s);same(before,next,['board','sources','material','xp','coinsEarned','coinsSpent','purchases','upgrades','discoveries']);assert.equal(next.chapterId,'a-place-to-pause');assert.equal(Object.keys(next.continuationEntries).length,4);
});

test('authored,reverse parallel and purchased final routes add exact455XP/200coins',()=>{
 for(const r of [main(),route({reverse:true}),route({purchases:true})]){assert.equal(r.state.xp,9830);assert.equal(r.records.length,19);assert.equal(r.state.milestones.length,202);assert.equal(r.state.coinsEarned-r.start.coinsEarned,200);assert(C.coinBalance(r.state)>=0);assert(!E.canStartNextChapter(r.state));assert(!E.canEnterContinuation(r.state));}assert.equal(main().spent,0);
});

test('each second source requires both openers; four zero-reward letters truthfully announce milestones',()=>{
 const r=main();for(const ch of P.chapters){const second=P.sourceRules.find(x=>x.chapterId===ch.id&&x.milestones.length).id;let s=r.entries[ch.id];assert(!s.unlockedSources.includes(second));for(const id of ch.storyIds.slice(0,2)){const o=r.before[id].orders.find(o=>o.storyLetterId===id);if(o.xp===0&&o.coins===0){assert.equal(zeroXPRewardPrefix(o,'career'),'0 XP · ');assert.match(goalAccessibleLabel(r.before[id],o),/0 XP and 0 coins/);assert.match(storyMilestoneNote(o,r.before[id]),/Send both opening story letters/);}}assert(!r.after[ch.storyIds[0]].unlockedSources.includes(second));assert(r.after[ch.storyIds[1]].unlockedSources.includes(second));}
});

test('highXP ordinary work cannot skip mushroom milestone or next chapter',()=>{
 let s=enter(initial());s=D.act(s,{type:'purchase',upgradeId:'order-desk',expectedLevel:0});s=D.complete(s,s.orders.find(o=>o.storyLetterId==='a-place-to-pause-letter-1'));s=D.act(s,{type:'resume-optional',orderId:s.heldOrders[0].id});s=D.complete(s,s.orders.find(o=>o.id===s.resumedOptionalId));let n=0;while(s.xp<9445){assert(++n<40);s=D.complete(s,s.orders.find(o=>o.origin==='ordinary'&&o.xp>0));}assert(!s.unlockedSources.includes('paper-mushroom'));for(const a of [{type:'supply',familyId:'paper-mushroom'},{type:'select-source',sourceSlot:1,familyId:'paper-mushroom'},{type:'start-next-chapter',chapterId:'room-for-rhythm'}])assert(!E.reduceCareer(s,E.commandFor(s,a)).ok);
});

test('callbacks preserve retained stock and held/resumed/suspended work through reload',async()=>{
 const r=route({retain:true});for(const [id,sources]of [['room-for-rhythm-letter-5',['paper-drum','trumpet']],['weight-and-breath-letter-5',['hearth-bellows','paper-flatiron']],['along-the-grain-letter-4',['open-jaw-wrench','ruler']]]){let s=r.before[id];const o=s.orders.find(o=>o.storyLetterId===id);assert.equal(s.activeSourceIds.length,2);assert.deepEqual(s.activeSourceIds,sources);const prior=clone(s),held=s.heldOrders[0],seq=s.nextOrderSeq;s=D.act(s,{type:'resume-optional',orderId:held.id});assert.deepEqual(s.suspendedStory,o);const h=storageHarness(s),session=createCareerSession(h);assert.equal((await session.open()).status,'saved');assert.deepEqual(session.snapshot().state,s);s=D.act(s,{type:'return-to-story'});assert.deepEqual(s.orders.find(x=>x.id===o.id),o);assert.equal(s.nextOrderSeq,seq);same(prior,s,['board','sources','material','xp','coinsEarned','coinsSpent']);}
});

test('one migration writer wins boundary race; already-open v7 writer refuses v8 bytes',async()=>{
 const h=storageHarness(historical280()),old=session7(h);assert.equal((await old.open()).status,'saved');const oldState=old.snapshot().state;const a=createCareerSession(h),b=createCareerSession(h);await Promise.all([a.open(),b.open()]);const s=a.snapshot().state;assert.equal(s.schemaVersion,8);const cmd=E.commandFor(s,{type:'enter-continuation',boundaryId:V.CONTINUATIONS[3].id});const rr=await Promise.all([a.commit(cmd),b.commit(cmd)]);assert.equal(rr.filter(x=>x.ok).length,1);assert.equal(rr.filter(x=>x.code==='stale').length,1);const bytes=h.map.get(C.STORAGE_KEY);assert(!(await old.commit(E7.commandFor(oldState,{type:'large-text',enabled:true}))).ok);assert.equal(h.map.get(C.STORAGE_KEY),bytes);assert.equal((await session7(h).open()).status,'practice');assert.equal(h.map.get(C.STORAGE_KEY),bytes);
});

test('corrupt,future,unreadable andquota-refused saves remain byte-preserved',async()=>{
 for(const [state,flags]of [['{bad',{}],[' '.repeat(1000001),{}],[{...initial(),schemaVersion:9},{}],[historical280(),{failWrite:true}],[initial(),{failRead:true}]]){const h=storageHarness(state,flags),bytes=h.map.get(C.STORAGE_KEY);assert.equal((await createCareerSession(h).open()).status,'practice');assert.equal(h.map.get(C.STORAGE_KEY),bytes);for(const [key,value]of h.protectedKeys)assert.equal(h.map.get(key),value);}
});

test('collection covers all16pages and five scopes without mutating saves',()=>{
 const s=main().state;for(const [state,total]of [[initial(),280],[enter(initial()),320],[s,320]]){const bytes=JSON.stringify(state),ids=[],view=collectionView(state);for(let page=0;page<view.pageCount;page++)ids.push(...collectionView(state,{volume:'all',chapter:'all',family:'all',page}).visibleIds);assert.equal(new Set(ids).size,total);assert.equal(view.pageCount,total/20);assert.equal(JSON.stringify(state),bytes);}assert.equal(V.VOLUMES.length,5);for(const v of V.VOLUMES)assert(V.collectionScope(s,v.id).total>0);for(const ch of P.chapters){assert.equal(collectionView(s,{chapter:ch.id,volume:'all',family:'all',page:0}).pieceIds.length,10);}for(const f of C.FAMILIES.slice(56)){assert.equal(collectionView(s,{chapter:'all',volume:'all',family:f.id,page:0}).pieceIds.length,5);}
});

test('eight finales are optional, non-consuming and not needed for story completion',()=>{
 const r=main();for(const p of P.postscripts){assert(!r.state.discoveries.includes(p.pieceId));assert.equal(C.CATALOG.pieceOf(p.pieceId).tier,5);assert(postcardSubtitle(p.pieceId));let s=clone(r.state);const xp=s.xp,coins=s.coinsEarned;[s]=D.acquire(s,p.pieceId);assert(s.discoveries.includes(p.pieceId));assert.equal(s.xp,xp);assert.equal(s.coinsEarned,coins);assert(E.allAuthoredContentComplete(s));}
});

test('pinned v1/v6/v7/v8 practice keeps promised recipes and awards no career XP',()=>{
 const career=JSON.stringify(main().state);for(const[id,v]of [['garden-letter-1',1],['paper-duet-letter-6',6],['next-move-letter-5',7],['along-the-grain-letter-5',8]]){let s=E.createReplay(id,'recovery-practice-'+id,v);const o=s.orders[0];assert.deepEqual(o.requirements,C.orderTemplate(id,v).requirements);assert.equal(orderPresentation(o).template.title,C.orderTemplate(id,v).title);s=D.complete(s,o);assert.equal(s.xp,0);assert.equal(s.coinsEarned,0);assert.deepEqual(s.continuationEntries,{});}assert.equal(JSON.stringify(main().state),career);
});

test('wrong tier,full board and duplicate tile IDs reject; valid freeCutUndo preserves material',()=>{
 let s=enter(initial());const order=s.orders.find(o=>o.storyLetterId==='a-place-to-pause-letter-1');[s]=D.acquire(s,'d320-rb2');const tile=s.board.find(t=>t?.pieceId==='d320-rb2');assert(!E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:order.id,tileIds:[tile.id]})).ok);while(s.board.includes(null))s=D.act(s,{type:'supply',familyId:'paper-rabbit',basic:true});assert(!E.reduceCareer(s,E.commandFor(s,{type:'cut',at:s.board.findIndex(t=>t?.id===tile.id),tileId:tile.id})).ok);const[from,to]=E.compatiblePairs(s).find(([i])=>s.board[i].pieceId==='d320-rb1');s=D.act(s,{type:'move',from,to,tileId:s.board[from].id,targetTileId:s.board[to].id});const before=clone(s);s=D.act(s,{type:'cut',at:s.board.findIndex(t=>t?.id===tile.id),tileId:tile.id});s=D.act(s,{type:'undo'});same(before,s,['board','sources','material','xp','coinsEarned','coinsSpent']);
 s=clone(main().before['room-for-rhythm-letter-3']);const o=s.orders.find(o=>o.storyLetterId==='room-for-rhythm-letter-3');s=D.ready(s,o);const matches=E.matchingTiles(s,o);assert(matches.length>=3);assert(!E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:o.id,tileIds:[matches[0],matches[1],matches[1]]})).ok);assert(!E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:o.id,tileIds:matches.slice(1)})).ok);assert(E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:o.id,tileIds:matches})).ok);
});

test('fresh v8 route completes all202 letters across four explicit boundaries with9850XP/4195coins and no purchases',()=>{
 let s=E.createCareer('stage-d-rebuilt-fresh-202');const crossed=[];for(const ch of C.CHAPTERS){if(ch.number>1){const b=V.boundaryAt(s);if(b){assert(E.canEnterContinuation(s));s=D.act(s,{type:'enter-continuation',boundaryId:b.id});crossed.push(b.id);}else s=D.act(s,{type:'start-next-chapter',chapterId:ch.id});}for(const id of ch.storyIds){const o=s.orders.find(o=>o.storyLetterId===id);assert(o,id);s=D.complete(s,o);}}assert.deepEqual(crossed,V.CONTINUATIONS.map(b=>b.id));assert.equal(s.xp,9850);assert.equal(s.coinsEarned,4195);assert.equal(s.coinsSpent,0);assert.equal(s.milestones.length,202);assert(E.allAuthoredContentComplete(s));
});
