import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../src/career/engine.js';import * as C from '../src/career/content.js';
import * as E3 from '../src/career/engine.v3.js';import * as C3 from '../src/career/content.v3.js';
import {driver,storageHarness} from '../tests/campaign-browser/save-fixtures.mjs';import {createCareerSession} from '../src/career/session.js';
import {mobileGoalMode,nextChapterEntryCue,returnOrientation,goalAccessibleLabel,progressCue} from '../src/career/feedback.js';
const d=driver(),d3=driver(E3,C3),clone=structuredClone;
const reviewed=JSON.parse(fs.readFileSync(new URL('../full-browser-fixtures/reviewed-campaign-oracle.json',import.meta.url)));const {economy,prose,extra}=reviewed;
const journeyRoot=process.env.MOTICOS_JOURNEY_OUTPUT_ROOT ? new URL(process.env.MOTICOS_JOURNEY_OUTPUT_ROOT) : new URL('./',import.meta.url);
const entry=new Map,finished=new Map;let basic;
const costs=o=>o.requirements.reduce((n,r)=>n+(2*C.CATALOG.pieceOf(r.pieceId).mass-1)*r.quantity,0);
function purchase(s,D=d,catalog=C){for(const u of catalog.availableUpgrades(s))if(!s.upgrades[u.id]&&catalog.levelDefinition(s).level>=u.level&&catalog.coinBalance(s)>=u.price)s=D.act(s,{type:'purchase',upgradeId:u.id,expectedLevel:0});return s;}
function step(s,a){return d.act(s,a);}
const reload=s=>E.upgradeCareer(JSON.parse(JSON.stringify(s)));
function run({style='authored',buy=false,hints=false}={}){let s=E.createCareer(`full-${style}-${buy}`),records=[];
 for(const chapter of C.CHAPTERS){if(chapter.number>1)s=step(s,{type:'start-next-chapter',chapterId:chapter.id});if(style==='authored'&&!buy)entry.set(chapter.id,clone(s));
  while(!E.chapterComplete(s)){
   if(buy)s=purchase(s);let orders=s.orders.filter(o=>o.origin==='story');assert(orders.length,`No story in ${chapter.id}`);
   const wanted=chapter.storyIds.find(id=>!s.milestones.includes(id));const order=style==='authored'?orders.find(o=>o.storyLetterId===wanted)??orders[0]:orders.sort((a,b)=>(style==='longest'?-1:1)*(costs(a)-costs(b)))[0];
   s=step(s,{type:'focus-order',orderId:order.id});assert.deepEqual(s.activeSourceIds.slice(0,new Set(order.requirements.map(r=>C.CATALOG.pieceOf(r.pieceId).familyId)).size),[...new Set(order.requirements.map(r=>C.CATALOG.pieceOf(r.pieceId).familyId))]);
   let makes=0,outputs=[];if(hints){while(!E.matchingTiles(s,order)){assert(makes++<200);const hint=E.goalHint(s,order.id);if(hint.kind==='supply'){outputs.push({family:hint.familyId,tier:E.nextOutput(s,hint.familyId).tier,cursor:s.sources[hint.familyId].cursor});s=step(s,{type:'supply',familyId:hint.familyId});}else if(hint.kind==='merge'){const [from,to]=hint.pair;s=step(s,{type:'move',from,to,tileId:s.board[from].id,targetTileId:s.board[to].id});}else if(hint.kind==='cut')s=step(s,{type:'cut',at:hint.at,tileId:s.board[hint.at].id});else assert.fail(hint.kind);}}else{const before=s.revision;s=d.ready(s,order);makes=s.revision-before;}
   records.push({chapter:chapter.number,letter:order.storyLetterId,makes,outputs,balance:C.coinBalance(s),purchases:clone(s.purchases),retained:s.board.filter(Boolean).length-order.requirements.reduce((n,r)=>n+r.quantity,0)});s=step(s,{type:'complete',orderId:order.id,tileIds:E.matchingTiles(s,order)});s=reload(s);
  }
  if(style==='authored'&&!buy)finished.set(chapter.id,clone(s));if(chapter.number>=5){const expected=economy.chapters.find(c=>c.id===chapter.id);assert.equal(s.xp,expected.endXp);assert.equal(s.coinsEarned,expected.cumulativeCoins);}
 }
 if(buy)s=purchase(s);assert.equal(s.xp,6495);assert.equal(s.coinsEarned,2745);assert.equal(s.milestones.length,113);assert(E.campaignComplete(s));return {state:s,records};
}

test('exact reviewed data joins all 83 letters, 60 optional templates, sources, levels, captions and prices',()=>{
 assert.equal(C.CHAPTERS.length,16);assert.equal(C.CATALOG.PIECES.length,160);assert.equal(C.FAMILIES.length,32);assert.equal(C.STORY_ORDERS.length,113);assert.equal(C.UPGRADES.length,33);
 assert.deepEqual(C.CONTENT_PACKS[3],C3.CONTENT_PACKS[3]);assert.deepEqual(C.STORY_ORDERS.slice(0,30),C3.STORY_ORDERS);assert.deepEqual(C.UPGRADES.slice(0,9),C3.UPGRADES);
 for(const c of economy.chapters){for(const l of c.letters){const text=prose.letters.find(t=>t.id===l.id),live=C.orderTemplate(l.id);assert.deepEqual(l.requirements,text.targets);assert.deepEqual(live.requirements,l.requirements.map(({pieceId,quantity})=>({pieceId,quantity})));assert.equal(live.xp,l.xp);assert.equal(live.coins,l.coins);assert.deepEqual(live.requiresMilestones,l.requiresMilestones);for(const k of ['title','letter','goal','sentCaption'])assert.equal(live[k],text[k]);for(const r of l.requirements){const p=C.CATALOG.pieceOf(r.pieceId);assert.equal(p.familyId,r.familyId);assert.equal(p.tier,r.tier);}}
  for(const u of c.upgrades){assert.equal(C.upgradeDefinition(u.id).price,u.price);assert.equal(C.upgradeDefinition(u.id).level,u.level);}assert.equal(C.LEVELS.find(l=>l.level===c.endingLevel.level).xp,c.endingLevel.xp);assert.equal(C.ordinaryTemplatesFor({contentVersion:4,chapterId:c.id}).length,5);
 }
 for(const [id,caption] of Object.entries(extra.discoveryCaptions))assert.equal(C.DISCOVERY_CAPTIONS[id],caption);assert.equal(extra.optionalPostscripts.length,19);assert(!C.POSTCARD_POSTSCRIPTS.some(p=>p.pieceId==='tw5'));assert(C.POSTCARD_POSTSCRIPTS.some(p=>p.pieceId==='bt5'));assert.equal(C.LEVELS.at(-1).xp,6475);
});
test('all 113 stories finish by actual basic commands without repeats or purchases',()=>{basic=run();assert.equal(basic.state.coinsSpent,0);assert.equal(basic.state.discoveries.length,136);fs.writeFileSync(new URL('full-basic-journey.json',journeyRoot),JSON.stringify({method:'Actual basic-supply reducer route, no purchases/repeats; retained stock used when present.',...basic},null,2)+'\n');});
test('longest and shortest visible-order routes retain the exact campaign rewards',()=>{for(const style of ['longest','shortest']){const result=run({style});assert.equal(result.state.coinsSpent,0);fs.writeFileSync(new URL(`full-${style}-journey.json`,journeyRoot),JSON.stringify(result,null,2)+'\n');}});
test('eager actual sorter route and deferred purchases cost 2555 and leave 190',()=>{
 const eager=run({style:'authored',buy:true,hints:true});assert.equal(eager.state.coinsSpent,2555);assert.equal(C.coinBalance(eager.state),190);assert.equal(Object.keys(eager.state.purchases).length,33);const deferred=purchase(basic.state);assert.equal(deferred.coinsSpent,2555);assert.equal(C.coinBalance(deferred),190);
 const assistance=Object.fromEntries(C.FAMILIES.map(f=>[f.id,eager.records.filter(r=>r.outputs.some(o=>o.family===f.id&&o.tier===2)).map(r=>r.letter)]));fs.writeFileSync(new URL('full-eager-journey.json',journeyRoot),JSON.stringify({method:'Actual hint-led reducer, paid sorter outputs/cursors, no optional deliveries.',assistance,...eager},null,2)+'\n');
});
test('every later opening pair gates source and later story in either order despite high XP and preheld entry stock',()=>{
 for(const chapter of C.CHAPTERS.slice(4))for(const reverse of [false,true]){let s=clone(entry.get(chapter.id));s.xp+=100000;const opening=s.orders.filter(o=>o.origin==='story');let tile;[s,tile]=d.acquire(s,C.FAMILIES.find(f=>f.id===chapter.entrySources[0]).pieceIds[3]);const second=economy.chapters.find(c=>c.id===chapter.id).secondSource;s=d.complete(s,opening[reverse?1:0]);assert(!s.unlockedSources.includes(second));assert.equal(s.orders.filter(o=>o.origin==='story').length,1);s=d.complete(s,s.orders.find(o=>o.origin==='story'));assert(s.unlockedSources.includes(second));assert.equal(s.material[second].generated,0);assert(s.board.some(t=>t?.id===tile));}
});
test('Fine Print separates two Folds from Passage and protects the already ready Fold',()=>{
 let s=clone(entry.get('fine-print'));for(const id of ['fine-print-letter-1','fine-print-letter-2','fine-print-letter-3'])s=d.complete(s,s.orders.find(o=>o.storyLetterId===id));assert(s.orders.some(o=>o.storyLetterId==='fine-print-letter-4'));assert(s.orders.some(o=>o.storyLetterId==='fine-print-letter-5'));const order=s.orders.find(o=>o.storyLetterId==='fine-print-letter-4');const held=new Set;for(const p of ['ob3','ob2','ob2','sm2']){let id;[s,id]=d.acquire(s,p,held);held.add(id);}s=step(s,{type:'focus-order',orderId:order.id});const hint=E.goalHint(s);assert.equal(hint.kind,'merge');assert(hint.pair.every(i=>s.board[i].pieceId==='ob2'));assert.match(goalAccessibleLabel(s,order),/1 of 2 ready/);const fold=s.board.find(t=>t?.pieceId==='ob3'),fan=s.board.find(t=>t?.pieceId==='sm2');assert.equal(E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:order.id,tileIds:[fold.id,fold.id,fan.id]})).ok,false);s=d.complete(s,order);assert(s.milestones.includes(order.storyLetterId));
});
test('Sound Advice finale waits for all seven predecessors, uses Written alone, and ending is truthful',()=>{
 let s=clone(entry.get('sound-advice'));for(let i=1;i<=7;i++){assert(!s.orders.some(o=>o.storyLetterId==='sound-advice-letter-8'));s=d.complete(s,s.orders.find(o=>o.storyLetterId===`sound-advice-letter-${i}`));assert(!E.chapterComplete(s));}const finale=s.orders.find(o=>o.storyLetterId==='sound-advice-letter-8');assert.deepEqual(finale.requirements,[{pieceId:'tw5',quantity:1}]);s=d.complete(s,finale);assert(E.campaignComplete(s));assert.equal(s.xp,6495);assert.match(progressCue(s).heading,/Campaign complete/);assert(!/development|foundation|twelve chapters/i.test(progressCue(s).detail));
});
test('four-chapter saved optional focus/history survive extension and remain visible on phone at completion',()=>{
 let old=E3.createCareer('v3-migration');for(const c of C3.CHAPTERS){if(c.number>1)old=d3.act(old,{type:'start-next-chapter',chapterId:c.id});while(!E3.chapterComplete(old))old=d3.complete(old,old.orders.find(o=>o.origin==='story'));}const bytes=JSON.stringify(old);let s=E.upgradeCareer(old);assert.equal(JSON.stringify(old),bytes);for(const k of ['orders','board','focusedOrderId','history','sources','material']){if(['sources','material'].includes(k)){for(const family of C3.FAMILIES)assert.deepEqual(s[k][family.id],old[k][family.id]);}else assert.deepEqual(s[k],old[k]);}assert.equal(mobileGoalMode(s),'order');assert(E.canStartNextChapter(s));assert.match(nextChapterEntryCue(s),/Wing/);assert(returnOrientation(s).detail.includes('You were making'));
 s=step(s,{type:'start-next-chapter',chapterId:'wrong-address'});const kept=s.heldOrders[0];const board=clone(s.board),seq=s.nextOrderSeq;s=step(s,{type:'resume-optional',orderId:kept.id});s=reload(s);assert.equal(s.focusedOrderId,kept.id);assert.equal(mobileGoalMode(s),'order');assert.deepEqual(s.board,board);assert.equal(s.nextOrderSeq,seq);s=step(s,{type:'return-to-story'});assert.deepEqual(reload(s),s);assert.throws(()=>E3.upgradeCareer(s));
 const ui=fs.readFileSync(new URL('../src/career/CareerGarden.jsx',import.meta.url),'utf8');assert(ui.includes("const showChapterEntry = mobileGoalMode(state) === 'chapter'"));assert(ui.includes('{showChapterEntry ? <><button className="career-mobile-order-details'));assert(ui.includes('Open ${chapter.nextTitle}. ${progress.heading}. Your chosen request stays available.'));
});
test('new optional generation uses only current chapter cycle and survives reload without rerolls',()=>{
 let s=clone(entry.get('double-meaning'));s=purchase(s);assert(s.upgrades['order-desk']);const ordinary=s.orders.find(o=>o.origin==='ordinary');assert(ordinary.templateId.startsWith('double-meaning-repeat-'));const cursor=s.ordinaryChapterCursors['double-meaning'];s=reload(s);assert.equal(s.ordinaryChapterCursors['double-meaning'],cursor);assert.deepEqual(s.orders.find(o=>o.id===ordinary.id),ordinary);s=d.complete(s,ordinary);assert(s.orders.find(o=>o.origin==='ordinary').templateId.startsWith('double-meaning-repeat-'));assert.equal(s.ordinaryCursor,0);
});
test('every completed versioned letter has isolated zero-reward replay; canonical session protects future bytes',async()=>{
 for(const id of basic.state.milestones){const s=E.createReplay(id,'full-replay',basic.state.storyCompletions[id].contentVersion);assert.equal(s.orders[0].xp,0);assert.equal(s.orders[0].coins,0);E.validateCareer(s);}const h=storageHarness({...basic.state,schemaVersion:99});const previous=h.map.get(C.STORAGE_KEY),result=await createCareerSession(h).open();assert.equal(result.saved,false);assert.equal(h.map.get(C.STORAGE_KEY),previous);
});

test('finale remains unissued with any one later predecessor outstanding',()=>{
 for(let missing=3;missing<=7;missing++){let s=clone(entry.get('sound-advice'));const kept=`sound-advice-letter-${missing}`;for(let count=0;count<6;count++){assert(!s.orders.some(o=>o.storyLetterId==='sound-advice-letter-8'));const o=s.orders.find(o=>o.origin==='story'&&o.storyLetterId!==kept);assert(o);s=d.complete(s,o);}assert(!s.orders.some(o=>o.storyLetterId==='sound-advice-letter-8'));s=d.complete(s,s.orders.find(o=>o.storyLetterId===kept));assert(s.orders.some(o=>o.storyLetterId==='sound-advice-letter-8'));}
});
test('retained Busy tile and partial sorter cursor survive two entries and pay exactly one callback',()=>{
 let s=purchase(clone(finished.get('hello-again'))),id;[s,id]=d.acquire(s,'la3');s=step(s,{type:'supply',familyId:'telephone'});const cursor=s.sources.telephone.cursor;assert(cursor>0);const material=clone(s.material.telephone);
 s=step(s,{type:'start-next-chapter',chapterId:'off-beat'});assert(s.board.some(t=>t?.id===id));while(!E.chapterComplete(s))s=d.complete(s,s.orders.find(o=>o.origin==='story'));s=step(s,{type:'start-next-chapter',chapterId:'return-mail'});s=reload(s);assert(s.board.some(t=>t?.id===id));assert.equal(s.sources.telephone.cursor,cursor);assert.deepEqual(s.material.telephone,material);
 const callback=s.orders.find(o=>o.storyLetterId==='return-mail-letter-2');s=d.ready(s,callback);assert(E.matchingTiles(s,callback).includes(id));const before=s.coinsEarned;s=step(s,{type:'complete',orderId:callback.id,tileIds:E.matchingTiles(s,callback)});assert(!s.board.some(t=>t?.id===id));assert.equal(s.coinsEarned,before+callback.coins);assert.equal(E.reduceCareer(s,E.commandFor(s,{type:'complete',orderId:callback.id,tileIds:[id]})).ok,false);
});
test('every later purchased source assists at least two actual required letters',()=>{
 const evidence=JSON.parse(fs.readFileSync(new URL('full-eager-journey.json',journeyRoot)));for(const f of C.FAMILIES.slice(8))assert(evidence.assistance[f.id].length>=2,`${f.id} lacks two actual tier-2 assisted letters`);
});
test('pack 3 frozen oracle and previous candidate source identity remain exact',()=>{
 const frozen=JSON.parse(fs.readFileSync(new URL('content-pack-3.frozen.json',import.meta.url)));assert.deepEqual(C.CONTENT_PACKS[3],frozen.pack);
});
