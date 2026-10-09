import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../src/career/content.v5.js';
import {validateCareer,allAuthoredContentComplete} from '../src/career/engine.v5.js';
import {digest} from './evidence.mjs';

// Independently reviewed r10 outputs, verified against its checkpoint manifest.
// This oracle is immutable input, never written by preflight or test execution.
const bytes=fs.readFileSync(new URL('../full-browser-fixtures/stage-a-reviewed-routes.json',import.meta.url));
assert.equal(digest(bytes),'8c9aaa790f3c205cc4d1162e047a2368be7c67993ecd98b7808dc1e7a1e65e42','Reviewed route oracle changed');
const reviewed=JSON.parse(bytes);
const chapters=C.CHAPTERS.slice(16),letters=chapters.flatMap(c=>c.storyIds),newFamilies=C.FAMILIES.slice(32),newUpgrades=C.UPGRADES.slice(33);
const keys=(value,expected,label)=>{assert(value!==null&&typeof value==='object'&&!Array.isArray(value),`${label}: object required`);assert.deepEqual(Object.keys(value).sort(),[...expected].sort(),`${label}: exact fields required`);};
const integer=(n,label,min=0,max=Number.MAX_SAFE_INTEGER)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,`${label}: integer out of range`);
const sum=rows=>rows.reduce((n,r)=>n+r.makes,0);
const routeId=r=>[r.priority,r.order,r.buy,r.cursors,r.retained].join('/');
function completeState(state,expected,spent){
  validateCareer(state);
  assert.equal(state.mode,'career');assert.equal(state.careerId,expected.careerId,'Career/source identity changed');
  assert.equal(state.schemaVersion,5);assert.equal(state.contentVersion,5);assert.equal(state.rulesVersion,2);
  assert.equal(state.chapterId,'short-measure');assert(allAuthoredContentComplete(state));
  assert.equal(state.xp,7830);assert.equal(state.coinsEarned,3315);assert.equal(state.coinsSpent,spent);
  assert.equal(C.coinBalance(state),3315-spent);assert.equal(state.milestones.length,139);
  assert.deepEqual(state.enteredChapters,C.CHAPTERS.map(c=>c.id));
  assert.deepEqual([...state.milestones].sort(),C.STORY_ORDERS.map(o=>o.id).sort());
  for(const id of letters)assert.deepEqual(state.storyCompletions[id],{contentVersion:5});
  // Pins IDs, revisions, paid prices, original provenance, retained stock and cursors.
  // A different internally valid save is not evidence for this deterministic route.
  assert.deepEqual(state,expected,'Final state differs from the independently reviewed route');
}
function coverage(records,field){
  assert(Array.isArray(records),'Route records must be an array');assert.equal(records.length,26);
  assert.deepEqual(records.map(r=>r?.[field]).sort(),[...letters].sort(),'Exactly all26 Stage A letters required');
  let previousChapter=17;
  for(const r of records){const chapter=chapters.find(c=>c.storyIds.includes(r[field]));assert(chapter.number>=previousChapter,'Chapter order regressed');previousChapter=chapter.number;integer(r.makes,'Per-letter actions',0,99);}
}
export function validateBasicRoute(route){
  keys(route,['state','records'],'Basic route');coverage(route.records,'id');
  assert.deepEqual(route.records.map(r=>r.id),letters,'Basic authored letter order');
  let xp=6495,coins=2745;
  for(const r of route.records){keys(r,['id','makes','xp','coins'],'Basic record');const letter=C.orderTemplate(r.id,5);xp+=letter.xp;coins+=letter.coins;assert.equal(r.xp,xp,'Cumulative XP');assert.equal(r.coins,coins,'Cumulative coins');}
  assert.equal(sum(route.records),356,'Basic action count');
  assert.deepEqual(route.records,reviewed.basic.records,'Basic per-letter route differs from reviewed actions/rewards');
  completeState(route.state,reviewed.basic.state,0);
  return route;
}
export function validatePurchaseRoutes(routes){
  assert(Array.isArray(routes),'Purchase routes must be an array');assert.equal(routes.length,11,'All nine policies and two special routes required');
  assert.deepEqual(routes.map(routeId),reviewed.purchases.map(routeId),'Required unique policy/order/stock identifiers');
  for(const [index,route] of routes.entries()){
    const expected=reviewed.purchases[index];keys(route,['priority','order','buy','cursors','retained','state','records','purchases','helpedRequests','makes'],'Purchase route');
    for(const flag of ['buy','cursors','retained'])assert.equal(typeof route[flag],'boolean',flag);
    coverage(route.records,'letter');integer(route.makes,'Total actions');assert.equal(route.makes,sum(route.records));assert.equal(route.makes,expected.makes,'Reviewed policy action count');
    assert(Array.isArray(route.purchases));assert.equal(route.purchases.length,route.buy?8:0);
    assert.deepEqual(route.purchases.map(p=>p.id).sort(),route.buy?newUpgrades.map(u=>u.id).sort():[]);
    let spent=2555,lastRevision=0;
    for(const purchase of route.purchases){keys(purchase,['id','revision','milestones','price','balance'],'Purchase event');const upgrade=C.upgradeDefinition(purchase.id,5);assert(upgrade&&newUpgrades.some(u=>u.id===purchase.id));assert.equal(purchase.price,upgrade.price);integer(purchase.revision,'Purchase revision',lastRevision+1);lastRevision=purchase.revision;integer(purchase.milestones,'Purchase story count',113,139);integer(purchase.balance,'Purchase balance');const earned=2745+route.records.slice(0,purchase.milestones-113).reduce((n,r)=>n+C.orderTemplate(r.letter,5).coins,0);spent+=purchase.price;assert.equal(purchase.balance,earned-spent,'Purchase timing balance');}
    assert.equal(spent,route.buy?3205:2555);
    const helped=Object.fromEntries(newFamilies.map(f=>[f.id,[]]));let earned=2745;const cursors=new Map();
    for(const [i,r] of route.records.entries()){
      keys(r,['letter','makes','outputs','balance'],'Purchase letter record');assert(Array.isArray(r.outputs));assert(r.outputs.length<=r.makes,'Supply count exceeds action count');
      earned+=C.orderTemplate(r.letter,5).coins;const spentAtLetter=2555+route.purchases.filter(p=>p.milestones<=113+i).reduce((n,p)=>n+p.price,0);assert.equal(r.balance,earned-spentAtLetter,'Per-letter balance');integer(r.balance,'Letter balance');
      for(const output of r.outputs){keys(output,['familyId','pieceId','tier','cursor'],'Source output');const piece=C.CATALOG.pieceOf(output.pieceId);assert(piece,'Unknown output picture');assert.equal(piece.familyId,output.familyId,'Output/source identity');assert.equal(piece.tier,output.tier,'Output tier');integer(output.cursor,'Output cursor',0,2);const upgraded=C.FAMILIES.slice(0,32).some(f=>f.id===output.familyId)||route.purchases.some(p=>C.upgradeDefinition(p.id,5).familyId===output.familyId&&p.milestones<=113+i);assert.equal(output.tier,upgraded?C.SORTER_CYCLE[output.cursor]:1,'Output must follow purchased source cycle');if(cursors.has(output.familyId))assert.equal(output.cursor,cursors.get(output.familyId),'Source cursor continuity');cursors.set(output.familyId,upgraded?(output.cursor+1)%3:output.cursor);if(helped[output.familyId]&&output.tier===2&&!helped[output.familyId].includes(r.letter))helped[output.familyId].push(r.letter);}
    }
    keys(route.helpedRequests,newFamilies.map(f=>f.id),'Helped sources');assert.deepEqual(route.helpedRequests,helped,'Benefit records must match actual tier2 outputs');
    if(index<9)for(const ids of Object.values(helped))assert(ids.length>=2,'Each purchased source must help two later requests');
    for(const [family,cursor] of cursors)assert.equal(route.state.sources[family].cursor,cursor,'Final source cursor');
    assert.deepEqual(route.records,expected.records,'Reviewed letter/action/source trace');assert.deepEqual(route.purchases,expected.purchases,'Reviewed purchase trace');
    completeState(route.state,expected.state,spent);
  }
  return routes;
}
export function validateRouteRecords(basic,purchases){validateBasicRoute(basic);validatePurchaseRoutes(purchases);return{basicLetters:26,purchaseRoutes:11};}
