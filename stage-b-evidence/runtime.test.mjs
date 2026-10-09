import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as E from '../src/career/engine.js';
import * as C from '../src/career/content.js';
import * as E5 from '../src/career/engine.v5.js';
import * as C5 from '../src/career/content.v5.js';
import * as V5 from '../src/career/volumes.v5.js';
import {CONTINUATIONS,VOLUMES,boundaryAt,collectionScope,availableVolumes} from '../src/career/volumes.js';
import {collectionView} from '../src/career/collectionNavigation.js';
import {goalAccessibleLabel,orderPresentation,completedLetter,postcardSubtitle,progressCue} from '../src/career/feedback.js';
import {createCareerSession} from '../src/career/session.js';
import {createCareerSession as oldSession} from '../src/career/session.v5.js';
import {driver,storageHarness,legacyFixtures} from '../tests/campaign-browser/save-fixtures.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),clone=structuredClone;
const proposal=read('./proposal.frozen.json'),frozen=read('./original-139.frozen.json'),endpoint=read('./v5-complete.frozen.json').state;
const d=driver(),d5=driver(E5,C5),boundary=CONTINUATIONS[1];
const initial=()=>E.upgradeCareer(endpoint),enter=s=>d.act(s,{type:'enter-continuation',boundaryId:boundary.id});
const outstanding=s=>[...s.orders,...s.heldOrders,...(s.suspendedStory?[s.suspendedStory]:[])];
const entries=new Map,after=new Map,ends=new Map;let basic;
function route(){if(basic)return clone(basic);let s=initial(),records=[];for(const c of C.CHAPTERS.slice(20)){s=c.number===21?enter(s):d.act(s,{type:'start-next-chapter',chapterId:c.id});entries.set(c.id,clone(s));for(const id of c.storyIds){const o=s.orders.find(o=>o.storyLetterId===id);assert(o,id);let rev=s.revision;s=d.ready(s,o);const makes=s.revision-rev;s=d.act(s,{type:'complete',orderId:o.id,tileIds:E.matchingTiles(s,o)});records.push({id,makes,xp:s.xp,coins:s.coinsEarned});after.set(id,clone(s));}ends.set(c.id,clone(s));}basic={state:s,records};return clone(basic);}
function unchanged(a,b,keys){for(const k of keys)assert.deepEqual(b[k],a[k],k);}
const retained=['board','xp','coinsEarned','coinsSpent','revision','nextOrderSeq','nextTileSeq','discoveries','orders','heldOrders','suspendedStory','resumedOptionalId','focusedOrderId','activeSourceIds','chapterEntryVersions','purchases','storyCompletions','receipts','continuationEntries'];

test('exact reviewed additions preserve all 139 promises, earlier prices, endings, volumes and art identities',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('./proposal.frozen.json',import.meta.url))).digest('hex'),'90b67d67b09c3504f3dcbe0eadc7a6b1f0f986292105e6b900846f53ee45e4dc');
 assert.deepEqual([C.CATALOG.PIECES.length,C.FAMILIES.length,C.CHAPTERS.length,C.STORY_ORDERS.length],[240,48,24,164]);
 assert.deepEqual(C.CONTENT_PACKS[5],C5.CONTENT_PACKS[5]);
 for(const k of ['story','ordinary','levels','upgrades','chapters','sourceRules']){assert.deepEqual(C.CONTENT_PACKS[6][k].slice(0,frozen[k].length),frozen[k]);assert.deepEqual(C.CONTENT_PACKS[6][k].slice(frozen[k].length),proposal.additions[k]);}
 assert.deepEqual(VOLUMES.slice(0,2),V5.VOLUMES);assert.deepEqual(CONTINUATIONS[0],V5.CONTINUATION);assert.deepEqual(CONTINUATIONS[1],proposal.continuationBoundary);
 assert.equal(C.CHAPTERS[15].nextId,null);assert.equal(C.CHAPTERS[19].nextId,null);assert.deepEqual(C.CHAPTER_COPY['short-measure'],C5.CHAPTER_COPY['short-measure']);
 assert.deepEqual(C.CATALOG.PIECES.slice(0,200),C5.CATALOG.PIECES);assert.equal(C.STORAGE_KEY,C5.STORAGE_KEY);assert.equal(C.LOCK_NAME,C5.LOCK_NAME);
 for(const a of read('./art.frozen.json').assets){const bytes=fs.readFileSync(fileURLToPath(C.CATALOG.pieceOf(a.pieceId).art));assert.equal(bytes.length,a.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);}
});

test('v1-v5 saves validate before pure idempotent extension; all new structural fields remain dormant',()=>{
 const input=[...Object.values(legacyFixtures()),E5.createCareer('v5-fresh'),d5.route(5,'v5-progress'),endpoint];
 for(const old of input){const raw=JSON.stringify(old),prior=E5.upgradeCareer(old),s=E.upgradeCareer(old);assert.equal(JSON.stringify(old),raw);assert.deepEqual(E.upgradeCareer(s),s);assert.equal(s.schemaVersion,6);unchanged(prior,s,retained);assert.equal(s.history.length,prior.history.length);for(let n=0;n<=prior.history.length;n++){const a=n?prior.history[n-1]:prior,b=n?s.history[n-1]:s;for(const f of C5.FAMILIES){assert.deepEqual(b.sources[f.id],a.sources[f.id]);assert.deepEqual(b.material[f.id],a.material[f.id]);}for(const f of C.FAMILIES.slice(40)){assert.deepEqual(b.sources[f.id],{sorter:0,cursor:0});assert.deepEqual(b.material[f.id],{initial:0,generated:0,delivered:0,recycled:0});}}for(const c of C.CHAPTERS.slice(20))assert.equal(s.ordinaryChapterCursors[c.id],0);}
 const bad=clone(endpoint);bad.material.bird.generated++;assert.throws(()=>E.upgradeCareer(bad));assert.throws(()=>E5.upgradeCareer(initial()));
});

test('second entry is atomic and preserves all ordinary promises, desk order, retained stock and partial cursor',()=>{
 for(const desk of [false,true]){let old=clone(desk?read('./v5-purchases.frozen.json'):endpoint);if(!old.upgrades['bird-sorter'])old=d5.act(old,{type:'purchase',upgradeId:'bird-sorter',expectedLevel:0});old=d5.act(old,{type:'supply',familyId:'bird'});const s=E.upgradeCareer(old),next=enter(s);unchanged(s,next,['board','material','sources','xp','coinsEarned','coinsSpent','purchases','upgrades','discoveries','storyCompletions','receipts']);assert.equal(next.history.length,0);assert.equal(next.chapterId,'cross-currents');assert.deepEqual(next.activeSourceIds,['survey-compass','paper-kite']);assert.equal(next.orders.filter(o=>o.origin==='story').length,1);assert.deepEqual(next.continuationEntries[V5.CONTINUATION.id],old.continuationEntries[V5.CONTINUATION.id]);for(const o of outstanding(s))assert.deepEqual(outstanding(next).find(n=>n.id===o.id),o);if(desk)assert(next.orders.some(o=>o.slot===2));for(const command of [E.commandFor(s,{type:'enter-continuation',boundaryId:boundary.id}),E.commandFor(next,{type:'enter-continuation',boundaryId:boundary.id})]){const fail=E.reduceCareer(next,command);assert(!fail.ok);assert.deepEqual(fail.state,next);}assert.deepEqual(E.upgradeCareer(next),next);}
 for(const id of ['unknown',CONTINUATIONS[0].id])assert(!E.reduceCareer(initial(),E.commandFor(initial(),{type:'enter-continuation',boundaryId:id})).ok);
});

test('boundary receipts must form the entered prefix with increasing revisions and defining content versions',()=>{
 const s=enter(initial());for(const mutate of [x=>delete x.continuationEntries[CONTINUATIONS[0].id],x=>delete x.continuationEntries[boundary.id],x=>x.continuationEntries.extra={revision:1,contentVersion:6},x=>x.continuationEntries[boundary.id].contentVersion=5,x=>x.continuationEntries[boundary.id].revision=x.continuationEntries[CONTINUATIONS[0].id].revision,x=>x.continuationEntries[CONTINUATIONS[0].id].contentVersion=6]){const bad=clone(s);mutate(bad);assert.throws(()=>E.validateCareer(bad));}
 const premature=initial();premature.continuationEntries[boundary.id]={revision:premature.revision,contentVersion:6};assert.throws(()=>E.validateCareer(premature));
});

test('actual basic route completes 25 letters with no purchases or repeats and preserves both earlier completions',()=>{
 const r=route();assert.deepEqual([r.state.xp,r.state.coinsEarned,r.state.coinsSpent,r.state.milestones.length],[9000,3820,0,164]);assert.equal(r.records.reduce((n,x)=>n+x.makes,0),314);assert.equal(r.records.length,25);assert(E.allAuthoredContentComplete(r.state));for(const v of VOLUMES)assert(E.volumeComplete(r.state,v.id));assert.equal(collectionScope(initial()).total,200);assert(E.campaignComplete(initial()));assert(!E.allAuthoredContentComplete(initial()));assert.equal(collectionScope(r.state).total,240);assert.equal(E.campaignComplete(entries.get('cross-currents')),false);
 const dir=process.env.MOTICOS_STAGE_B_OUTPUT_ROOT;if(dir){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/basic-runtime-route.json',JSON.stringify(r,null,2));}
});

test('high optional XP cannot open gated second sources or skip authored story milestones',()=>{
 route();for(const [chapter,family] of [['safe-keeping','tied-parcel'],['paper-duet','trumpet']]){let s=clone(entries.get(chapter));s.xp=99999;E.validateCareer(s);assert(!s.unlockedSources.includes(family));assert(!E.reduceCareer(s,E.commandFor(s,{type:'supply',familyId:family})).ok);assert(!E.canStartNextChapter(s));s=d.complete(s,s.orders.find(o=>o.storyLetterId===chapter+'-letter-1'));assert(s.unlockedSources.includes(family));assert.equal(s.material[family].generated,0);}
 for(const c of ['cross-currents','give-and-take'])assert(C.CHAPTERS.find(x=>x.id===c).entrySources.every(id=>entries.get(c).unlockedSources.includes(id)));
 assert.equal(entries.get('give-and-take').orders.filter(o=>o.origin==='story').length,2);
});

test('two separate Unequal Pans cannot be replaced by their merged Cross Measure',()=>{
 route();let s=clone(after.get('give-and-take-letter-1'));const exact=s.orders.find(o=>o.storyLetterId==='give-and-take-letter-2');assert.equal(exact.requirements.find(r=>r.pieceId==='b240-bs2').quantity,2);s=d.ready(s,exact);const ids=s.board.flatMap((t,i)=>t?.pieceId==='b240-bs2'?[i]:[]),[from,to]=ids;s=d.act(s,{type:'move',from,to,tileId:s.board[from].id,targetTileId:s.board[to].id});assert.equal(E.matchingTiles(s,exact),null);const failed=E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:exact.id,tileIds:s.board.filter(Boolean).map(t=>t.id)}));assert(!failed.ok);assert.deepEqual(failed.state,s);assert.match(goalAccessibleLabel(s,exact),/2 Unequal Pans/);
});

test('held optional switch and return preserve displaced story through repeated reloads and do not issue new IDs',()=>{
 let s=enter(initial()),story=clone(s.orders.find(o=>o.origin==='story')),seq=s.nextOrderSeq;assert(s.heldOrders.length>=2);for(let n=0;n<5;n++){s=d.act(s,{type:'resume-optional',orderId:s.heldOrders[0].id});assert.deepEqual(s.suspendedStory,story);s=E.upgradeCareer(JSON.parse(JSON.stringify(s)));s=d.act(s,{type:'resume-optional',orderId:s.heldOrders[0].id});s=d.act(s,{type:'return-to-story'});assert.deepEqual(s.orders.find(o=>o.id===story.id),story);assert.equal(s.nextOrderSeq,seq);assert.equal(new Set(outstanding(s).map(o=>o.id)).size,outstanding(s).length);}
});

test('three collection volumes expose 160/200/240 by deliberate entry without save mutation',()=>{
 route();const old=E.upgradeCareer(read('../campaign-evidence/full-basic-journey.json').state);for(const [s,total,count]of [[old,160,1],[initial(),200,2],[route().state,240,3]]){const raw=JSON.stringify(s),view=collectionView(s),ids=[];assert.equal(view.scope.total,total);assert.equal(availableVolumes(s).length,count);for(let page=0;page<view.pageCount;page++)ids.push(...collectionView(s,{volume:'all',chapter:'all',family:'all',page}).visibleIds);assert.equal(new Set(ids).size,total);assert.equal(collectionScope(s,VOLUMES[0].id).total,160);for(const c of C.CHAPTERS.slice(20)){const v=collectionView(s,{volume:'all',chapter:c.id,family:'all',page:0});if(count===3){assert.equal(v.pieceIds.length,10);assert.equal(v.families.length,2);}}assert.equal(JSON.stringify(s),raw);}assert.equal(collectionScope(initial(),VOLUMES[2].id).total,160);
});

test('replay is isolated and zero reward across historical and current versions',()=>{
 const before=JSON.stringify(route().state);for(const [id,version]of [['garden-letter-1',1],['sound-advice-letter-8',4],['short-measure-letter-6',5],['paper-duet-letter-6',6]]){let s=E.createReplay(id,'replay-stage-b-'+version,version);assert.deepEqual(s.continuationEntries,{});assert.deepEqual(s.orders[0].requirements,C.orderTemplate(id,version).requirements);assert.equal(orderPresentation(s.orders[0]).template.title,C.orderTemplate(id,version).title);s=d.complete(s);assert.equal(s.xp,0);assert.equal(s.coinsEarned,0);}assert.equal(JSON.stringify(route().state),before);assert.equal(completedLetter(route().state,'short-measure-letter-6').title,C5.orderTemplate('short-measure-letter-6').title);assert.match(progressCue(route().state).detail,/first sixteen/);assert.equal(postcardSubtitle('b240-tr5'),'Paper Duet');
});

test('single-writer concurrent entry commits once; v5 tabs protect v6 bytes',async()=>{
 const h=storageHarness(endpoint),a=createCareerSession(h),b=createCareerSession(h);await Promise.all([a.open(),b.open()]);const s=a.snapshot().state,command=E.commandFor(s,{type:'enter-continuation',boundaryId:boundary.id}),result=await Promise.all([a.commit(command),b.commit(command)]);assert.equal(result.filter(x=>x.ok).length,1);assert.equal(result.filter(x=>x.code==='stale').length,1);const saved=h.map.get(C.STORAGE_KEY);assert.equal((await oldSession(h).open()).status,'practice');assert.equal(h.map.get(C.STORAGE_KEY),saved);assert.equal((await createCareerSession(h).open()).status,'saved');
});

test('storage denial quota oversize and future-version bytes are protected',async()=>{
 for(const [value,flags]of [[endpoint,{failWrite:true}],[initial(),{failRead:true}],[' '.repeat(1000001),{}],[{...initial(),schemaVersion:7},{}]]){const h=storageHarness(value,flags),before=h.map.get(C.STORAGE_KEY);assert.equal((await createCareerSession(h).open()).status,'practice');assert.equal(h.map.get(C.STORAGE_KEY),before);}
 const h=storageHarness(initial()),writer=createCareerSession(h);await writer.open();const bytes=h.map.get(C.STORAGE_KEY);h.flags.failWrite=true;const result=await writer.commit(E.commandFor(initial(),{type:'enter-continuation',boundaryId:boundary.id}));assert.equal(result.status,'practice');assert.equal(h.map.get(C.STORAGE_KEY),bytes);assert.match(result.warning,/temporary/);
});

test('a fresh v6 career crosses both boundaries with version6 receipts and no implicit entry',()=>{
 let s=E.createCareer('fresh-v6-all');for(const c of C.CHAPTERS){if(c.number>1){if([17,21].includes(c.number)){assert(E.campaignComplete(s));assert(E.canEnterContinuation(s));s=d.act(s,{type:'enter-continuation',boundaryId:boundaryAt(s).id});}else s=d.act(s,{type:'start-next-chapter',chapterId:c.id});}for(const id of c.storyIds)s=d.complete(s,s.orders.find(o=>o.storyLetterId===id));}assert.equal(s.xp,9000);assert.equal(s.milestones.length,164);assert(Object.values(s.continuationEntries).every(r=>r.contentVersion===6));assert(E.allAuthoredContentComplete(s));
});

test('reviewed retained-stock alternatives replay through the reducer with exact operation counts',()=>{
 route();for(const fixture of read('./competition.frozen.json').fixtures){for(const option of [...fixture.firstDeliveryOptions,...fixture.bothDeliveryOrders,...(fixture.optionalCutVariant?[fixture.optionalCutVariant]:[])]){let s=clone(after.get(fixture.afterMilestone));for(let i=0;i<25;i++)if(s.board[i])s=d.act(s,{type:'recycle',at:i,tileId:s.board[i].id,confirmed:true});const reserved=new Set;for(const [pieceId,count]of Object.entries(fixture.stock))for(let n=0;n<count;n++){let tile;[s,tile]=d.acquire(s,pieceId,reserved);reserved.add(tile);}let offset=0;for(const delivery of option.deliveries){const o=s.orders.find(o=>o.storyLetterId===delivery.letterId);assert(o);const before=clone(s);s=d.act(s,{type:'focus-order',orderId:o.id});unchanged(before,s,['board','xp','coinsEarned']);s=E.upgradeCareer(JSON.parse(JSON.stringify(s)));for(const step of option.steps.slice(offset,offset+delivery.makeActions)){if(step.type==='draw-basic')s=d.act(s,{type:'supply',familyId:C.CATALOG.pieceOf(step.pieceId).familyId,basic:true});else if(step.type==='merge'){const [from,to]=s.board.flatMap((t,i)=>t?.pieceId===step.from?[i]:[]);assert.notEqual(to,undefined);s=d.act(s,{type:'move',from,to,tileId:s.board[from].id,targetTileId:s.board[to].id});assert.equal(s.board[to].pieceId,step.to);}else if(step.type==='cut'){const at=s.board.findIndex(t=>t?.pieceId===step.pieceId);s=d.act(s,{type:'cut',at,tileId:s.board[at].id});}else assert.fail(step.type);}offset+=delivery.makeActions;assert(E.matchingTiles(s,o));s=d.act(s,{type:'complete',orderId:o.id,tileIds:E.matchingTiles(s,o)});for(const [pieceId,count]of Object.entries(delivery.retained))assert.equal(s.board.filter(t=>t?.pieceId===pieceId).length,count);}assert.equal(offset,option.makeActions);}}
});

test('discovery and optional final postscripts do not reward or revoke any completed volume',()=>{
 let s=route().state;const before=clone(s);for(const p of C.CATALOG.PIECES.slice(200)){[s]=d.acquire(s,p.id);assert(s.discoveries.includes(p.id));for(let i=0;i<25;i++)if(s.board[i])s=d.act(s,{type:'recycle',at:i,tileId:s.board[i].id,confirmed:true});}unchanged(before,s,['xp','coinsEarned','coinsSpent','milestones','storyCompletions']);assert(VOLUMES[2].pieceIds.every(id=>s.discoveries.includes(id)));assert(VOLUMES.every(v=>E.volumeComplete(s,v.id)));assert.equal(proposal.additions.postscripts.length,7);
});

test('receipt pruning cannot resurrect completed optional IDs and new optional generation stays bounded',()=>{
 let s=route().state;const old=s.heldOrders[0].id;s=d.act(s,{type:'resume-optional',orderId:old});s=d.complete(s,s.orders.find(o=>o.id===old));for(let i=0;i<41;i++){const o=s.orders.find(o=>o.origin==='ordinary');assert(o);s=d.complete(s,o);assert(outstanding(s).filter(o=>o.origin==='ordinary').length<=3);}assert(!s.receipts.some(r=>r.id===old));const result=E.reduceCareer(s,E.commandFor(s,{type:'resume-optional',orderId:old}));assert(!result.ok);assert.deepEqual(result.state,s);
});
