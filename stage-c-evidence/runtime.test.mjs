import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import * as C from '../src/career/content.js';import * as E from '../src/career/engine.js';import * as V from '../src/career/volumes.js';
import * as C6 from '../src/career/content.v6.js';import * as E6 from '../src/career/engine.v6.js';import * as V6 from '../src/career/volumes.v6.js';
import * as E5 from '../src/career/engine.v5.js';import * as C5 from '../src/career/content.v5.js';
import {createCareerSession} from '../src/career/session.js';import {createCareerSession as session6} from '../src/career/session.v6.js';import {createCareerSession as session5} from '../src/career/session.v5.js';
import {BOARD_ART_BOUNDS,COMPACT_BOARD_LABELS} from '../src/career/boardArt.js';import {collectionView} from '../src/career/collectionNavigation.js';
import {zeroXPRewardPrefix,storyMilestoneNote,goalAccessibleLabel,progressCue,postcardSubtitle,orderPresentation} from '../src/career/feedback.js';
import {driver,storageHarness,legacyFixtures} from '../tests/campaign-browser/save-fixtures.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),clone=structuredClone;
const P=read('./proposal.frozen.json'),old=read('./v6-endpoints.frozen.json'),D=driver(),D6=driver(E6,C6),D5=driver(E5,C5),boundary=V.CONTINUATIONS[2];
const retained=['board','chapterId','enteredChapters','xp','coinsEarned','coinsSpent','revision','nextOrderSeq','nextTileSeq','discoveries','orders','heldOrders','suspendedStory','resumedOptionalId','focusedOrderId','activeSourceIds','unlockedSources','chapterEntryVersions','purchases','upgrades','storyCompletions','milestones','receipts','continuationEntries','ordinaryCursor','sound','largeText'];
const same=(a,b,keys=retained)=>{for(const k of keys)assert.deepEqual(b[k],a[k],k);};
const initial=key=>E.upgradeCareer(clone(old[key??'conservative'])),enter=s=>D.act(s,{type:'enter-continuation',boundaryId:boundary.id});
const outstanding=s=>[...s.orders,...s.heldOrders,...(s.suspendedStory?[s.suspendedStory]:[])];
let canonical;const entryStates=new Map,afterStates=new Map;
function route({reverse=false,purchases=false,retain=false}={}){
 let s=initial(),prepared=0,events=0,spent=0; s.coinsEarned=0;s.coinsSpent=0;s.receipts=[];E.validateCareer(s);
 if(retain)for(const id of ['f2','k2']){const before=s.revision;[s]=D.acquire(s,id);prepared+=s.revision-before;}
 const start=clone(s),records=[];
 for(const [i,ch]of P.chapters.entries()){
  s=i===0?enter(s):D.act(s,{type:'start-next-chapter',chapterId:ch.id});if(!reverse&&!purchases&&!retain)entryStates.set(ch.id,clone(s));
  const second=P.sourceRules.find(r=>r.chapterId===ch.id&&r.milestones.length).id;assert(!s.unlockedSources.includes(second));
  const ids=reverse?[...ch.storyIds.slice(0,2).reverse(),...(i===0?ch.storyIds.slice(2).reverse():i===2?[...ch.storyIds.slice(2,4).reverse(),ch.storyIds[4]]:ch.storyIds.slice(2))]:ch.storyIds;
  for(const id of ids){
   if(purchases)for(const u of C.availableUpgrades(s).filter(u=>!s.upgrades[u.id]&&u.level<=C.levelDefinition(s).level).sort((a,b)=>a.price-b.price))if(C.coinBalance(s)>=u.price){s=D.act(s,{type:'purchase',upgradeId:u.id,expectedLevel:0});spent+=u.price;}
   const o=s.orders.find(o=>o.storyLetterId===id);assert(o,id);s=D.act(s,{type:'focus-order',orderId:o.id});assert.equal(s.activeSourceIds.length,2);
   if(id==='a-little-tending-letter-5')assert.deepEqual(s.activeSourceIds,['garden-trowel','fern']);
   if(id==='next-move-letter-4')assert.deepEqual(s.activeSourceIds,['paper-cogwheel','key']);
   if(id==='next-move-letter-5')assert.deepEqual(s.activeSourceIds,['paper-chess-knight','paper-cogwheel']);
   const before=s.revision,xp=s.xp,coins=C.coinBalance(s);s=D.ready(s,o);events+=s.revision-before;s=D.act(s,{type:'complete',orderId:o.id,tileIds:E.matchingTiles(s,o)});
   assert.equal(s.xp-xp,o.xp);assert.equal(C.coinBalance(s)-coins,o.coins);assert.equal(s.unlockedSources.includes(second),ch.storyIds.slice(0,2).every(id=>s.milestones.includes(id)));
   records.push({id,makes:s.revision-before-1,xp:o.xp,coins:o.coins});if(!reverse&&!purchases&&!retain)afterStates.set(id,clone(s));
  }assert(E.chapterComplete(s));
 }
 assert.equal(s.xp-start.xp,395);assert.equal(s.coinsEarned-start.coinsEarned,175);assert.equal(s.coinsSpent-start.coinsSpent,spent);assert(C.coinBalance(s)>=0);assert(E.allAuthoredContentComplete(s));
 return {state:s,records,makeActions:events,preparationActions:prepared,spent};
}
function main(){return canonical??=(route());}

test('280 catalog and reviewed additions are exact; old 164 stories, packs, endings and prices remain intact',()=>{
 assert.equal(sha(fs.readFileSync(new URL('./proposal.frozen.json',import.meta.url))),'89d3d304bf6ef22948a59645deea77c1464ee2fe77cb856f8e8f3fa828349598');
 assert.deepEqual([C.CATALOG.PIECES.length,C.FAMILIES.length,C.CHAPTERS.length,C.STORY_ORDERS.length],[280,56,28,183]);
 for(let v=1;v<=6;v++)assert.equal(C.CONTENT_PACKS[v],C6.CONTENT_PACKS[v]);
 for(const k of ['story','ordinary','levels','upgrades','chapters','sourceRules']){assert.deepEqual(C.CONTENT_PACKS[7][k].slice(0,C6.CONTENT_PACKS[6][k].length),C6.CONTENT_PACKS[6][k]);assert.deepEqual(C.CONTENT_PACKS[7][k].slice(C6.CONTENT_PACKS[6][k].length),P[k]);}
 assert.deepEqual(C.CATALOG.PIECES.slice(0,240),C6.CATALOG.PIECES);assert.deepEqual(C.UPGRADES,C6.UPGRADES);assert.deepEqual(C.REWARDS,C6.REWARDS);assert.deepEqual(V.VOLUMES.slice(0,3),V6.VOLUMES);assert.deepEqual(V.CONTINUATIONS.slice(0,2),V6.CONTINUATIONS);assert.deepEqual(boundary,P.boundary);assert.deepEqual(V.VOLUMES[3],P.volume);
 for(const index of [15,19,23,27])assert.equal(C.CHAPTERS[index].nextId,null);for(const ch of C6.CHAPTERS)assert.deepEqual(C.CHAPTER_COPY[ch.id],C6.CHAPTER_COPY[ch.id]);assert.deepEqual(C.POSTCARD_POSTSCRIPTS.slice(-8),P.postscripts);
 for(const p of P.catalog){const runtime=C.CATALOG.pieceOf(p.id);for(const k of ['id','familyId','tier','mass','name'])assert.equal(runtime[k],p[k]);assert.equal(runtime.shortName,p.compactBoardLabel);assert(runtime.description.length>20);}
 assert.equal(C.STORAGE_KEY,C6.STORAGE_KEY);assert.equal(C.LOCK_NAME,C6.LOCK_NAME);assert.equal(C.RULES_VERSION,2);
});

test('40 exact selected WebPs, framing choices, decoded bounds and compact labels are wired',()=>{
 const bounds=read('./bounds.frozen.json'),assets=read('./art.frozen.json');assert.equal(assets.length,40);
 assert.deepEqual(assets.filter(a=>a.framing.kind==='window').map(a=>a.id).sort(),['c280-fi5','c280-wc1','c280-wc2','c280-wc3']);
 for(const a of assets){const bytes=fs.readFileSync(fileURLToPath(C.CATALOG.pieceOf(a.id).art));assert.equal(bytes.length,a.bytes);assert.equal(sha(bytes),a.sha256);assert.deepEqual(BOARD_ART_BOUNDS[a.id],bounds[a.id]);assert.equal(COMPACT_BOARD_LABELS[a.id],P.catalog.find(p=>p.id===a.id).compactBoardLabel);}
});

test('v1-v6 saves migrate purely and idempotently without entry, stock, promises, cursor or earned-access loss',()=>{
 const input=[...Object.values(legacyFixtures()),E5.createCareer('stage-c-v5-fresh'),D5.route(5,'stage-c-v5-partial'),read('../stage-b-evidence/v5-complete.frozen.json').state,read('../stage-b-evidence/v5-purchases.frozen.json'),E6.createCareer('stage-c-v6-fresh'),D6.route(5,'stage-c-v6-partial'),...Object.values(old)];
 for(const prior of input){const bytes=JSON.stringify(prior),baseline=E6.upgradeCareer(prior),s=E.upgradeCareer(prior);assert.equal(JSON.stringify(prior),bytes);assert.deepEqual(E.upgradeCareer(s),s);assert.equal(s.schemaVersion,7);same(baseline,s);assert.deepEqual(C.levelDefinition(s),C6.levelDefinition(baseline));assert.equal(s.history.length,baseline.history.length);
  for(const [a,b]of [[baseline,s],...baseline.history.map((h,i)=>[h,s.history[i]])])for(const family of C.FAMILIES){if(C6.FAMILIES.some(f=>f.id===family.id)){assert.deepEqual(b.sources[family.id],a.sources[family.id]);assert.deepEqual(b.material[family.id],a.material[family.id]);}else{assert.deepEqual(b.sources[family.id],{sorter:0,cursor:0});assert.deepEqual(b.material[family.id],{initial:0,generated:0,delivered:0,recycled:0});}}
  for(const ch of C6.CHAPTERS)assert.equal(s.ordinaryChapterCursors[ch.id],baseline.ordinaryChapterCursors[ch.id]);for(const ch of P.chapters)assert.equal(s.ordinaryChapterCursors[ch.id],0);
 }
 const bad=clone(old.basic);bad.material.bird.generated++;assert.throws(()=>E.upgradeCareer(bad));assert.throws(()=>E6.upgradeCareer(initial()));
});

test('historical reversible snapshots retain stock/material; migration does not clear Undo',()=>{
 let s=D6.act(clone(old.purchases),{type:'supply',familyId:'fern'});s=D6.act(s,{type:'large-text',enabled:true});const prior=clone(s),m=E.upgradeCareer(s);assert.equal(m.history.length,prior.history.length);const undone=D.act(m,{type:'undo'}),expected=D6.act(prior,{type:'undo'});same(expected,undone,retained.filter(k=>!['sources','material'].includes(k)));for(const f of C6.FAMILIES){assert.deepEqual(undone.sources[f.id],expected.sources[f.id]);assert.deepEqual(undone.material[f.id],expected.material[f.id]);}
});

test('third continuation is explicit, atomic and preserves all held promises, purchases and stock',()=>{
 for(const key of ['purchases','basic','conservative']){let before=initial(key);[before]=D.acquire(before,'f2');const entered=enter(before);same(before,entered,['board','material','sources','xp','coinsEarned','coinsSpent','purchases','upgrades','discoveries','storyCompletions','receipts']);assert.equal(entered.history.length,0);assert.equal(entered.chapterId,'sideways-company');assert.equal(entered.chapterEntryVersions['sideways-company'],7);assert.equal(entered.continuationEntries[boundary.id].contentVersion,7);assert.equal(entered.activeSourceIds.length,2);assert.equal(entered.activeSourceIds[0],'paper-crab');assert(!entered.unlockedSources.includes('paper-snail'));assert.equal(entered.orders.filter(o=>o.origin==='story').length,2);for(const o of outstanding(before))assert.deepEqual(outstanding(entered).find(n=>n.id===o.id),o);for(const a of [E.commandFor(before,{type:'enter-continuation',boundaryId:boundary.id}),E.commandFor(entered,{type:'enter-continuation',boundaryId:boundary.id})]){const r=E.reduceCareer(entered,a);assert(!r.ok);assert.deepEqual(r.state,entered);}}
 const s=initial();assert(E.campaignComplete(s));assert(!E.allAuthoredContentComplete(s));assert.equal(V.collectionScope(s).total,240);assert(E.canEnterContinuation(s));assert.equal(JSON.stringify(E.upgradeCareer(s)),JSON.stringify(s));
 for(const change of [s=>delete s.continuationEntries[boundary.id],s=>s.continuationEntries[boundary.id].contentVersion=6,s=>s.continuationEntries[boundary.id].revision=s.continuationEntries[V.CONTINUATIONS[1].id].revision]){const bad=enter(initial());change(bad);assert.throws(()=>E.validateCareer(bad));}
});

test('integrated forward/reverse, retained callback and optional old-upgrade routes finish with exact economics',()=>{
 const a=main(),b=route({reverse:true}),c=route({reverse:true,retain:true}),d=route({purchases:true});assert.equal(a.makeActions,116);assert.equal(b.makeActions,116);assert(c.preparationActions>0);assert(d.spent<=175);for(const r of [a,b,c,d]){assert.equal(r.records.length,19);assert.equal(r.state.milestones.length,183);assert.equal(r.state.xp,9375);assert.equal(r.state.coinsEarned,175);assert(V.VOLUMES.every(v=>E.volumeComplete(r.state,v.id)));assert.equal(r.state.receipts.filter(r=>r.type==='order'&&r.id?.includes('ordinary')).length,0);}assert.equal(a.spent,0);assert.equal(b.spent,0);assert.equal(c.spent,0);
 const dir=process.env.MOTICOS_STAGE_C_OUTPUT_ROOT;if(dir){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/routes.json',JSON.stringify([a,b,c,d],null,2));}
});

test('real optional XP cannot substitute for two actual opening milestones',()=>{
 let s=enter(initial());s=D.act(s,{type:'purchase',upgradeId:'order-desk',expectedLevel:0});const second=clone(s.orders.find(o=>o.storyLetterId==='sideways-company-letter-2'));s=D.complete(s,s.orders.find(o=>o.storyLetterId==='sideways-company-letter-1'));
 const held=s.heldOrders[0];s=D.act(s,{type:'resume-optional',orderId:held.id});s=D.complete(s,s.orders.find(o=>o.id===held.id));
 let n=0;while(s.xp<9095){const o=s.orders.find(o=>o.origin==='ordinary'&&o.contentVersion===7);assert(o);assert(++n<10);s=D.complete(s,o);}
 assert(!s.unlockedSources.includes('paper-snail'));assert(!E.chapterComplete(s));assert.deepEqual(s.orders.find(o=>o.storyLetterId===second.storyLetterId),second);for(const a of [{type:'supply',familyId:'paper-snail'},{type:'select-source',sourceSlot:1,familyId:'paper-snail'},{type:'start-next-chapter',chapterId:'a-little-tending'}])assert(!E.reduceCareer(s,E.commandFor(s,a)).ok);
});

test('zero reward story milestones and source notices tell the truth, ordinary coin-only remains optional',()=>{
 main();assert.equal(P.story.filter(o=>o.xp===0&&o.coins===0).length,4);assert.throws(()=>C.target('paper-crab',1));assert.throws(()=>C.rewardsFor([{pieceId:'c280-cr1',quantity:1}]));
 for(const ch of P.chapters){const s=entryStates.get(ch.id),o=s.orders.find(o=>o.origin==='story'&&o.xp===0&&o.coins===0);assert.equal(zeroXPRewardPrefix(o,s.mode),'0 XP · ');assert.match(storyMilestoneNote(o,s),/Send both opening story letters to unlock/);assert.match(storyMilestoneNote(o,s),/2 remaining/);assert.match(goalAccessibleLabel(s,o),/0 XP and 0 coins/);assert.match(progressCue(s).cue,/2 letters opens/);const one=afterStates.get(ch.storyIds[0]),next=one.orders.find(o=>o.storyLetterId===ch.storyIds[1]);assert.match(storyMilestoneNote(next,one),/1 remaining/);assert.equal(storyMilestoneNote(o,{...s,mode:'replay'}),'');}
 assert.equal(zeroXPRewardPrefix({origin:'ordinary'}),'Coins only · ');assert.equal(zeroXPRewardPrefix({origin:'practice'},'replay'),'0 XP · ');assert.equal(storyMilestoneNote(initial().heldOrders[0],initial()),'');assert.equal(storyMilestoneNote({origin:'story',contentVersion:7,storyLetterId:'moon-letter-1'},{mode:'career',milestones:[]}), '');
});

test('callback focus, held/resumed/suspended promises and deliberate source selection survive session reload',async()=>{
 main();let s=afterStates.get('a-little-tending-letter-4');const o=s.orders.find(o=>o.storyLetterId==='a-little-tending-letter-5');s=D.act(s,{type:'focus-order',orderId:o.id});assert.deepEqual(s.activeSourceIds,['garden-trowel','fern']);const before=clone(s),seq=s.nextOrderSeq,held=s.heldOrders[0];s=D.act(s,{type:'resume-optional',orderId:held.id});assert.deepEqual(s.suspendedStory,o);const h=storageHarness(s),session=createCareerSession(h);assert.equal((await session.open()).status,'saved');assert.deepEqual(session.snapshot().state,s);s=D.act(s,{type:'return-to-story'});assert.deepEqual(s.orders.find(x=>x.id===o.id),o);assert.equal(s.nextOrderSeq,seq);same(before,s,['board','sources','material','xp','coinsEarned','coinsSpent']);s=D.act(s,{type:'select-source',sourceSlot:0,familyId:'key'});const chosen=storageHarness(s),reopened=createCareerSession(chosen);await reopened.open();assert.deepEqual(reopened.snapshot().state,s);assert.deepEqual(s.activeSourceIds,['key','fern']);
});

test('suspended v6 work migrates untouched and returns to its original story',()=>{
 let s=D6.act(E6.upgradeCareer(read('../stage-b-evidence/v5-complete.frozen.json').state),{type:'enter-continuation',boundaryId:V6.CONTINUATIONS[1].id});s=D6.act(s,{type:'resume-optional',orderId:s.heldOrders[0].id});const migrated=E.upgradeCareer(s);same(s,migrated);assert(!E.canEnterContinuation(migrated,boundary.id));const restored=D.act(migrated,{type:'return-to-story'});assert.deepEqual(restored.orders.find(o=>o.id===s.suspendedStory.id),s.suspendedStory);
});

test('session migration commits once under one writer; v5/v6 readers protect v7 and future bytes',async()=>{
 const h=storageHarness(old.conservative),a=createCareerSession(h),b=createCareerSession(h);await Promise.all([a.open(),b.open()]);const s=a.snapshot().state;assert.equal(s.schemaVersion,7);assert.equal(s.chapterId,'paper-duet');assert.deepEqual(s.continuationEntries,old.conservative.continuationEntries);const cmd=E.commandFor(s,{type:'enter-continuation',boundaryId:boundary.id}),r=await Promise.all([a.commit(cmd),b.commit(cmd)]);assert.equal(r.filter(x=>x.ok).length,1);assert.equal(r.filter(x=>x.code==='stale').length,1);const saved=h.map.get(C.STORAGE_KEY);for(const make of [session5,session6]){assert.equal((await make(h).open()).status,'practice');assert.equal(h.map.get(C.STORAGE_KEY),saved);}assert.equal((await createCareerSession(h).open()).status,'saved');
 for(const [state,flags]of [[old.conservative,{failWrite:true}],[initial(),{failRead:true}],[' '.repeat(1000001),{}],[{...initial(),schemaVersion:8},{}]]){const h=storageHarness(state,flags),before=h.map.get(C.STORAGE_KEY);assert.equal((await createCareerSession(h).open()).status,'practice');assert.equal(h.map.get(C.STORAGE_KEY),before);}
});

test('collection exposes 240 before entry and exactly 280 after; optional postscripts need their own discovery',()=>{
 const s=main().state;for(const [state,total]of [[initial(),240],[enter(initial()),280],[s,280]]){const before=JSON.stringify(state),ids=[],view=collectionView(state);assert.equal(view.scope.total,total);for(let page=0;page<view.pageCount;page++)ids.push(...collectionView(state,{volume:'all',chapter:'all',family:'all',page}).visibleIds);assert.equal(new Set(ids).size,total);assert.equal(JSON.stringify(state),before);}
 assert.equal(V.collectionScope(s,V.VOLUMES[3].id).total,40);for(const ch of P.chapters){const view=collectionView(s,{volume:'all',chapter:ch.id,family:'all',page:0});assert.equal(view.pieceIds.length,10);assert.equal(view.families.length,2);}assert.equal(C.CHAPTERS.at(-1).nextId,null);assert(!E.canStartNextChapter(s));assert(!E.canEnterContinuation(s));assert.match(C.CHAPTER_COPY['next-move'].ending,/280-picture checkpoint on the way to 320/);
 for(const card of P.postscripts){assert(!s.discoveries.includes(card.pieceId));assert.equal(C.CATALOG.pieceOf(card.pieceId).tier,5);assert.equal(postcardSubtitle(card.pieceId),P.chapters.find(c=>c.storyIds.some(id=>C.orderTemplate(id).requirements.some(r=>C.CATALOG.pieceOf(r.pieceId).familyId===C.CATALOG.pieceOf(card.pieceId).familyId))).title);}
});

test('historical and Stage C practice preserve pinned promises and give no career rewards',()=>{
 const before=JSON.stringify(main().state);for(const [id,v]of [['garden-letter-1',1],['short-measure-letter-6',5],['paper-duet-letter-6',6],['sideways-company-letter-1',7],['a-little-tending-letter-5',7],['next-move-letter-5',7]]){let s=E.createReplay(id,`stage-c-practice-${id}`,v);const o=s.orders[0];assert.deepEqual(o.requirements,C.orderTemplate(id,v).requirements);assert.equal(orderPresentation(o).template.title,C.orderTemplate(id,v).title);s=D.complete(s);assert.equal(s.xp,0);assert.equal(s.coinsEarned,0);assert.deepEqual(s.continuationEntries,{});}assert.equal(JSON.stringify(main().state),before);
});

test('exact tier/quantity rejection and full-board Cut/Undo remain valid with new material',()=>{
 let s=enter(initial());const o=s.orders.find(o=>o.storyLetterId==='sideways-company-letter-1');[s]=D.acquire(s,'c280-cr2');const tile=s.board.find(t=>t?.pieceId==='c280-cr2');assert(!E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:o.id,tileIds:[tile.id]})).ok);while(s.board.includes(null))s=D.act(s,{type:'supply',familyId:'paper-crab',basic:true});assert(!E.reduceCareer(s,E.commandFor(s,{type:'cut',at:s.board.findIndex(t=>t?.id===tile.id),tileId:tile.id})).ok);const[from,to]=E.compatiblePairs(s).find(([i])=>s.board[i].pieceId==='c280-cr1');s=D.act(s,{type:'move',from,to,tileId:s.board[from].id,targetTileId:s.board[to].id});const before=clone(s);s=D.act(s,{type:'cut',at:s.board.findIndex(t=>t?.id===tile.id),tileId:tile.id});s=D.act(s,{type:'undo'});same(before,s,['board','sources','material','xp','coinsEarned','coinsSpent']);
});

test('fresh v7 career completes all 183 stories through three explicit boundaries without mandatory purchases',()=>{
 let s=E.createCareer('stage-c-fresh-v7-all');const crossed=[];
 for(const ch of C.CHAPTERS){if(ch.number>1){const boundary=V.boundaryAt(s);if(boundary){assert(E.campaignComplete(s));assert(E.canEnterContinuation(s));const before=clone(s);s=D.act(s,{type:'enter-continuation',boundaryId:boundary.id});same(before,s,['board','sources','material','xp','coinsEarned','coinsSpent','purchases','upgrades','discoveries']);crossed.push(boundary.id);}else s=D.act(s,{type:'start-next-chapter',chapterId:ch.id});}for(const id of ch.storyIds){const o=s.orders.find(o=>o.storyLetterId===id);assert(o,id);s=D.complete(s,o);}}
 assert.deepEqual(crossed,V.CONTINUATIONS.map(b=>b.id));assert.equal(s.xp,9395);assert.equal(s.coinsEarned,3995);assert.equal(s.coinsSpent,0);assert.equal(s.milestones.length,183);assert(Object.values(s.continuationEntries).every(r=>r.contentVersion===7));assert(E.allAuthoredContentComplete(s));
 const dir=process.env.MOTICOS_STAGE_C_OUTPUT_ROOT;if(dir)fs.writeFileSync(dir+'/fresh-v7-final.json',JSON.stringify(s,null,2));
});
