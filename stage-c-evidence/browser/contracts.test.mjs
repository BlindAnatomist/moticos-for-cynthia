// Source/fixture contracts only. This file never launches a browser, opens a
// player save, regenerates fixtures, or replays their recorded action routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {C,E,V,fixture} from './fixtures.mjs';
import * as E5 from '../../src/career/engine.v5.js';
import * as E6 from '../../src/career/engine.v6.js';
import {CASES,SCREENSHOTS,POSTCARDS,PROFILE_MS,PROPOSAL,screenshotAllowed,scenarioFor} from './scope.mjs';

const here=new URL('./',import.meta.url),root=new URL('../../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root));
const sha=value=>createHash('sha256').update(value).digest('hex');
const compressed=fs.readFileSync(new URL('fixtures.generated.json.gz',here));
const bundle=JSON.parse(gunzipSync(compressed));
const proposalBytes=read('stage-c-evidence/browser/proposal.json'),proposal=JSON.parse(proposalBytes);
const approved=JSON.parse(read('stage-c-evidence/execution/approved-scope.json'));
// Reviewed C03-only 90s → 150s calibration; all other proposal fields are unchanged.
const approvedProposalSha256='22d1427b61579d7d74f57de0f2ea76d1de4448c4725f6b7e35a5ff1a4b5f92a6';
const families=C.FAMILIES.slice(48),newPieces=C.CATALOG.PIECES.slice(240),zero={initial:0,generated:0,delivered:0,recycled:0};
const expectedNames=[
  'v5-endpoint','v6-conservative','v6-purchased','stage-c-entry','v6-retained-boundary','v7-retained-before-entry',
  'chapter-25-entry','chapter-25-both-openers','chapter-26-entry','chapter-26-both-openers','callback-trowel',
  'chapter-27-entry','chapter-27-both-openers','chapter-28-entry','chapter-28-both-openers','callback-cog','pre-final','completed280','all-new-discovered',
  ...['cr','sn','wc','gt','fi','mi','kn','cg'].flatMap(id=>[`postcard-c280-${id}5-before`,`postcard-c280-${id}5-after`]),
  'occupied-pre-final','occupied-completed','source-stock',
  ...['fern','key'].flatMap(id=>[0,1,2].map(cursor=>`sorter-${id}-${cursor}`)),
  'high-xp-before-snail','wrong-tier-crab','two-crab-siblings',
];
const historical=new Map([['v5-endpoint',E5],['v6-conservative',E6],['v6-purchased',E6],['v6-retained-boundary',E6]]);
const sameFields=(a,b,keys)=>{for(const key of keys)assert.deepEqual(b[key],a[key],key);};

test('compressed bundle and its three frozen input hashes are intact',()=>{
  assert.deepEqual([...compressed.subarray(0,2)],[0x1f,0x8b]);assert.equal(bundle.schema,1);
  assert.deepEqual(bundle.inputFiles.map(row=>row.file),['stage-c-evidence/v6-endpoints.frozen.json','stage-b-evidence/v5-complete.frozen.json','stage-b-evidence/v5-purchases.frozen.json']);
  for(const input of bundle.inputFiles)assert.equal(sha(read(input.file)),input.sha256,input.file);
  const v6=JSON.parse(read('stage-c-evidence/v6-endpoints.frozen.json'));
  assert.deepEqual(bundle.fixtures['v5-endpoint'],JSON.parse(read('stage-b-evidence/v5-complete.frozen.json')).state);
  assert.deepEqual(bundle.fixtures['v6-conservative'],v6.conservative);assert.deepEqual(bundle.fixtures['v6-purchased'],v6.purchases);
});

test('all 47 named fixtures validate with their own historical or current engine and clone safely',()=>{
  assert.equal(expectedNames.length,47);assert.equal(new Set(expectedNames).size,47);
  assert.deepEqual(Object.keys(bundle.fixtures).sort(),[...expectedNames].sort());
  for(const name of expectedNames){
    const state=fixture(name),engine=historical.get(name)??E;
    assert.deepEqual(state,bundle.fixtures[name],name);assert.equal(engine.validateCareer(state),true,name);
    const version=name==='v5-endpoint'?5:historical.has(name)?6:7;
    assert.equal(state.schemaVersion,version,name);assert.equal(state.contentVersion,version,name);
    state.board[0]=null;state.careerId='changed-test-clone';
    assert.deepEqual(fixture(name),bundle.fixtures[name],`${name} clone isolation`);
  }
  assert.throws(()=>fixture('unapproved-fixture'),/Unknown fixture/);
});

test('every derived fixture is bound to its saved-state hash and recorded action revisions',()=>{
  const frozenNames=['v5-endpoint','v6-conservative','v6-purchased'];
  assert.deepEqual(bundle.recipes.map(row=>row.name).sort(),expectedNames.filter(name=>!frozenNames.includes(name)).sort());
  assert.equal(new Set(bundle.recipes.map(row=>row.name)).size,bundle.recipes.length);
  for(const recipe of bundle.recipes){
    const state=bundle.fixtures[recipe.name];assert.equal(recipe.stateSha256,sha(JSON.stringify(state)),recipe.name);
    assert(Array.isArray(recipe.actions));
    let revision=null;
    for(const step of recipe.actions){assert.equal(typeof step.action.type,'string');assert(Number.isSafeInteger(step.revision));if(revision!==null)assert.equal(step.revision,revision+1,recipe.name);revision=step.revision;}
    if(revision!==null)assert.equal(revision,state.revision,recipe.name);
  }
  for(const initial of bundle.initialSources){assert.match(initial.stateSha256,/^[a-f0-9]{64}$/);assert([6,7].includes(initial.schemaVersion));assert.equal(typeof initial.label,'string');}
});

test('retained boundary keeps the actual historical desk promise, two held letters, stock and cursors',()=>{
  const supplied=JSON.parse(read('stage-b-evidence/v5-purchases.frozen.json'));
  const old=fixture('v6-retained-boundary'),state=fixture('v7-retained-before-entry'),desk=supplied.orders.find(order=>order.slot===2&&order.origin==='ordinary');
  assert(desk);assert.deepEqual(old.orders.find(order=>order.slot===2),desk);assert.deepEqual(state.orders.find(order=>order.slot===2),desk);
  assert.equal(old.heldOrders.length,2);assert.deepEqual(state.heldOrders,old.heldOrders);assert.equal(state.upgrades['order-desk'],1);
  assert.equal(state.chapterId,'paper-duet');assert.equal(state.milestones.length,164);assert(!state.enteredChapters.includes('sideways-company'));assert(!state.continuationEntries[V.CONTINUATIONS[2].id]);
  assert(state.board.some(tile=>tile?.pieceId==='b5'));assert(state.board.some(tile=>tile?.pieceId==='f2'));assert.equal(state.board.filter(tile=>tile?.pieceId==='k2').length,2);
  for(const family of ['fern','key'])assert.deepEqual(state.sources[family],{sorter:1,cursor:1});
  for(const family of families){assert.deepEqual(state.material[family.id],zero);assert(!state.unlockedSources.includes(family.id));}
  sameFields(old,state,['xp','coinsEarned','coinsSpent','purchases','upgrades','milestones','storyCompletions','continuationEntries','chapterEntryVersions']);
});

test('both callback fixtures retain slot-zero stories, held promises and exact old stock/cursors',()=>{
  for(const [name,id,pair,piece,oldFamily]of [
    ['callback-trowel','a-little-tending-letter-5',['garden-trowel','fern'],'f2','fern'],
    ['callback-cog','next-move-letter-4',['paper-cogwheel','key'],'k2','key'],
  ]){
    const state=fixture(name),story=state.orders.find(order=>order.storyLetterId===id);assert(story);assert.equal(story.slot,0);assert.equal(story.contentVersion,7);
    assert.equal(state.focusedOrderId,story.id);assert.deepEqual(state.activeSourceIds,pair);assert(!state.milestones.includes(id));
    assert(state.heldOrders.length>=2);assert(state.heldOrders.some(order=>order.contentVersion<7));assert(state.orders.some(order=>order.slot===2&&order.contentVersion<7));
    assert(state.board.some(tile=>tile?.pieceId===piece));assert.deepEqual(state.sources[oldFamily],{sorter:1,cursor:1});
    if(name==='callback-cog')assert.equal(state.board.filter(tile=>tile?.pieceId==='k2').length,2);
  }
  const final=fixture('pre-final');assert(final.orders.some(order=>order.storyLetterId==='next-move-letter-5'));assert.deepEqual(final.activeSourceIds,['paper-chess-knight','paper-cogwheel']);assert(final.board.some(tile=>tile?.pieceId==='k2'));assert.deepEqual(final.sources.key,{sorter:1,cursor:1});
});

test('documented optional rewards reach 9100 XP without Snail, and malformed-delivery stocks are exact',()=>{
  const state=fixture('high-xp-before-snail');assert.equal(state.xp,9100);assert(state.xp>C.CHAPTERS[25].entryXP);assert.equal(state.upgrades['order-desk'],1);
  assert(state.milestones.includes('sideways-company-letter-1'));assert(!state.milestones.includes('sideways-company-letter-2'));assert(state.orders.some(order=>order.storyLetterId==='sideways-company-letter-2'));
  assert(!state.unlockedSources.includes('paper-snail'));assert.deepEqual(state.material['paper-snail'],zero);assert.equal(E.chapterComplete(state),false);assert.equal(E.canStartNextChapter(state),false);
  const optional=state.receipts.filter(receipt=>receipt.type==='delivery'&&receipt.storyLetterId===null&&receipt.xp>0);assert.equal(optional.length,2);assert(optional.every(receipt=>receipt.contentVersion===7&&receipt.xp===60));assert.equal(fixture('v6-conservative').xp+optional.reduce((sum,receipt)=>sum+receipt.xp,0),state.xp);
  const wrong=fixture('wrong-tier-crab'),two=fixture('two-crab-siblings');assert.deepEqual(wrong.board.filter(Boolean).map(tile=>tile.pieceId),['c280-cr2']);assert.deepEqual(two.board.filter(Boolean).map(tile=>tile.pieceId),['c280-cr1','c280-cr1']);assert.equal(new Set(two.board.filter(Boolean).map(tile=>tile.id)).size,2);
  for(const input of [wrong,two])assert.deepEqual(input.orders.find(order=>order.storyLetterId==='sideways-company-letter-1').requirements,[{pieceId:'c280-cr1',quantity:1}]);
});

test('collection and postcard fixtures bind 280 identities and discovery-only tier-five setup',()=>{
  const completed=fixture('completed280'),all=fixture('all-new-discovered');assert.equal(completed.milestones.length,183);assert(E.allAuthoredContentComplete(completed));assert.equal(V.collectionScope(all,'all').total,280);
  assert(newPieces.every(piece=>all.discoveries.includes(piece.id)));assert.deepEqual(all.discoveries.filter(id=>!id.startsWith('c280-')),completed.discoveries.filter(id=>!id.startsWith('c280-')));
  sameFields(completed,all,['xp','coinsEarned','coinsSpent','milestones','storyCompletions']);
  for(const family of families){
    const id=family.pieceIds[4],before=fixture(`postcard-${id}-before`),after=fixture(`postcard-${id}-after`);
    assert(!before.discoveries.includes(id));assert(after.discoveries.includes(id));assert.equal(E.chapterComplete(before),false);assert.equal(E.chapterComplete(after),false);
    assert(!families.filter(other=>other.id!==family.id).some(other=>after.discoveries.includes(other.pieceIds[4])));
    sameFields(before,after,['xp','coinsEarned','coinsSpent','milestones','storyCompletions','receipts']);assert(after.board.some(tile=>tile?.pieceId===id));
  }
});

test('occupied layouts and earned-sorter fixtures have the approved pieces and all cursor positions',()=>{
  const wanted=[...families.map(family=>family.pieceIds[2]),'b1','b2','f1','f2','k1','k2','m1','m2','b1','b1','b1','b1'].sort();assert.equal(wanted.length,20);
  for(const name of ['occupied-pre-final','occupied-completed']){const state=fixture(name);assert.equal(state.board.length,25);assert.deepEqual(state.board.filter(Boolean).map(tile=>tile.pieceId).sort(),wanted);assert(families.every(family=>state.unlockedSources.includes(family.id)));}
  assert.deepEqual(fixture('source-stock').board.filter(Boolean).map(tile=>tile.pieceId).sort(),families.map(family=>family.pieceIds[2]).sort());
  for(const family of ['fern','key'])for(const cursor of [0,1,2]){const state=fixture(`sorter-${family}-${cursor}`);assert.deepEqual(state.sources[family],{sorter:1,cursor});assert.equal(state.activeSourceIds[0],family);assert.equal(E.nextOutput(state,family).tier,[1,1,2][cursor]);assert.equal(E.nextOutput(state,family,true).tier,1);assert.equal(state.sources[family].cursor,cursor);}
});

test('browser scope exactly matches the approved proposal, 25 captures and eleven exports',()=>{
  assert.equal(sha(proposalBytes),approvedProposalSha256);assert.deepEqual(PROPOSAL,proposal);
  for(const key of ['cases','postcardOutputsPerProfile','limits'])assert.deepEqual(proposal[key],approved[key],key);
  assert.deepEqual(CASES,proposal.cases.map(row=>[row.id,row.title,row.timeoutSeconds*1000]));
  assert.equal(CASES.length,10);assert.deepEqual(CASES.map(row=>row[2]),[60000,75000,150000,60000,75000,90000,60000,120000,120000,120000]);assert.equal(CASES.reduce((sum,row)=>sum+row[2],0),930000);assert.equal(PROFILE_MS,870000);
  assert.deepEqual(SCREENSHOTS,proposal.cases.flatMap(row=>row.routineScreenshotNames));assert.equal(SCREENSHOTS.length,25);assert.equal(new Set(SCREENSHOTS).size,25);for(const name of SCREENSHOTS)assert.equal(screenshotAllowed(name),true);assert.throws(()=>screenshotAllowed('unreviewed.png'),/Unreviewed screenshot/);
  assert.deepEqual(POSTCARDS,proposal.postcardOutputsPerProfile);assert.equal(POSTCARDS.length,11);assert.equal(new Set(POSTCARDS.map(row=>row.pieceId)).size,11);
  assert.deepEqual(POSTCARDS.map(row=>row.pieceId),[...families.map(family=>family.pieceIds[4]),'c280-wc1','c280-wc2','c280-wc3']);
  for(const card of POSTCARDS){assert.deepEqual([card.width,card.height],[1536,1120]);assert.equal(card.normalizedEvidenceFilename,card.pieceId+'.png');assert.equal(card.expectedSuggestedDownloadFilename,`moticos-${C.CATALOG.pieceOf(card.pieceId).name.toLowerCase().replaceAll(' ','-')}.png`);}
  assert.deepEqual(proposal.profiles.map(profile=>profile.id),['stage-c-chromium-desktop','stage-c-webkit-phone']);assert.equal(proposal.proposedInstances,20);
  assert.equal(proposal.limits.routineScreenshots,50);assert.equal(proposal.limits.downloadedPostcardPNGs,22);assert.equal(proposal.limits.totalPNGFilesMaximum,73);assert.equal(proposal.limits.workers,1);assert.equal(proposal.limits.retries,0);assert.equal(proposal.limits.maxFailuresGlobal,1);
});

test('the two source files declare exactly C01–C10 and the scope forwards every required fixture',async()=>{
  const names=['early.spec.mjs','late.spec.mjs'];const sources=names.map(name=>fs.readFileSync(new URL(name,here),'utf8'));
  const declared=sources.flatMap(source=>[...source.matchAll(/^scenario\(\s*['"]([^'"]+)['"]/gm)].map(match=>match[1]));
  assert.deepEqual(declared,CASES.map(([id,title])=>id+' '+title));assert.equal(new Set(declared).size,10);
  assert.deepEqual(fs.readdirSync(fileURLToPath(here)).filter(name=>name.endsWith('.spec.mjs')).sort(),names);
  let registered,timeout,received;const runner=(title,callback)=>{registered={title,callback};};runner.setTimeout=value=>{timeout=value;};
  const scenario=scenarioFor(runner),title=CASES[0][0]+' '+CASES[0][1];scenario(title,async fixtures=>{received=fixtures;});
  const fixtures={page:{tag:'page'},context:{tag:'context'},browser:{tag:'browser'}};
  await registered.callback(fixtures,{title});assert.equal(registered.title,title);assert.equal(timeout,CASES[0][2]);assert.deepEqual(received,fixtures);
  assert.throws(()=>scenario('C11 Unapproved extra case',()=>{}),/Unreviewed exact case title/);
});
