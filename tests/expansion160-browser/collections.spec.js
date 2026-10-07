import {renderedArt} from './rendered-art.js';
import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {ENVELOPES,getMatchingEngine} from '../../src/matching/cohesion/registry.js';
import {MAX_COLLECTION_CAPTURES} from '../../scripts/expansion160Scope.mjs';
import {COLLECTION_CASE_TIMEOUT_MS,openEnvelopeJournal,collectionStateViolations,visibleImageIndices,verifyChooserState} from '../../scripts/expansion160CollectionEvidence.mjs';
import {fullDiscoveryDenseSave} from './fullDiscoveryFixture.js';
import {denseSave} from '../capacity/fixtures.js';
import {collectionState,chooserState,preserveFailureDiagnosis,boundedDiagnosticObservation} from './collection-evidence.js';
import {recordBrowserEnvironment,readyScreenshot,activate,boardIds,closeDialog,idle,imagesReady} from './shared-helpers.js';
const entries=ENVELOPES.map((envelope,index)=>{const engine=getMatchingEngine(envelope.id),save=fullDiscoveryDenseSave(engine,index+90);return {id:envelope.id,key:engine.STORAGE_KEY,raw:engine.serializeStoredSave(save),save};});
const board=save=>save.round.board.map(tile=>tile?.pieceId??'empty');
async function expectBoard(page,save){await expect.poll(()=>boardIds(page)).toEqual(board(save));await imagesReady(page.locator('.cg-board img'));}
const readKeys=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),entries.map(e=>e.key));
test.beforeAll(async({browser},info)=>recordBrowserEnvironment(browser,info,'collections'));
const errors=new WeakMap();test.beforeEach(({page})=>{errors.set(page,[]);page.on('pageerror',e=>errors.get(page).push(e.message));});
test.afterEach(async({page},info)=>{try{expect(errors.get(page)).toEqual([]);}finally{await preserveFailureDiagnosis(page,info,errors.get(page).length>0);}});

// One envelope per case: a slow decode identifies its exact envelope/image and
// cannot consume a twelve/sixteen-envelope case budget. Each context is clean.
for(const entry of entries)test(`${entry.id}: collection, 100 Undo histories and all save boundaries`,async({page},info)=>{
 test.setTimeout(COLLECTION_CASE_TIMEOUT_MS);const engine=getMatchingEngine(entry.id);
 const record=openEnvelopeJournal(`expansion160-test-results/progress/${info.project.name}-${entry.id}-collection.jsonl`,info.project.name,entry.id);
 await page.goto('/');await page.evaluate(items=>items.forEach(e=>localStorage.setItem(e.key,e.raw)),entries);record('seeded',{count:entries.length});
 await page.goto(`/?envelope=${entry.id}`);await expectBoard(page,entry.save);expect(engine.readSave((await readKeys(page))[entry.key]).save.history).toHaveLength(100);record('board-ready',{history:100});
 record('open-start');await activate(page.getByRole('button',{name:'Collection',exact:true}),info);const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog).toHaveJSProperty('open',true);record('dialog-open');
 await expect(page.getByLabel('Browse envelope',{exact:true}).locator('option')).toHaveCount(16);
 const pictures=dialog.locator('.cg-collection-piece img');await expect(pictures).toHaveCount(10);await expect(dialog.locator('.cg-collection-piece h4')).toHaveText(engine.FAMILIES.flatMap(family=>family.pieceIds.map(id=>engine.CATALOG[id].name)));await expect(dialog.getByRole('button',{name:'Open postcard',exact:true})).toHaveCount(6);
 for(const [image,picture] of (await pictures.all()).entries()) {record('image-start',{image});await picture.scrollIntoViewIfNeeded();await imagesReady(picture);const decoded=await renderedArt(picture,engine.FAMILIES.flatMap(f=>f.pieceIds)[image]);record('image-decoded',{image,...decoded});}
 // Greedy, bounded scroll coverage: every PNG must add at least one newly
 // visible whole image. Merely decoding ten images is not visual coverage.
 await mkdir('expansion160-test-results/storage-views',{recursive:true});const covered=new Set();let capture=0;
 while(covered.size<10){
  const target=Array.from({length:10},(_,i)=>i).find(i=>!covered.has(i));await boundedDiagnosticObservation(()=>pictures.nth(target).evaluate(image=>image.scrollIntoView({block:'center',behavior:'instant'})),7500);
  const before=await boundedDiagnosticObservation(()=>collectionState(page));const visible=visibleImageIndices(before);expect(visible).toContain(target);record('capture-before',{capture,target,state:before});expect(collectionStateViolations(before,entry.id)).toEqual([]);
  const path=`expansion160-test-results/storage-views/${info.project.name}-collection-${entry.id}-${capture}.png`;
  await readyScreenshot(page,{path,fullPage:false,animations:'disabled'});const after=await boundedDiagnosticObservation(()=>collectionState(page));record('capture-after',{capture,target,state:after,path});expect(collectionStateViolations(after,entry.id)).toEqual([]);for(const key of ['images','rect','scrollTop','occlusionRect'])expect(after[key]).toEqual(before[key]);
  visible.forEach(image=>covered.add(image));await info.attach(`collection-${entry.id}-${capture}`,{path,contentType:'image/png'});capture++;expect(capture).toBeLessThanOrEqual(MAX_COLLECTION_CAPTURES);
 }
 record('visual-coverage-complete',{images:[...covered].sort((a,b)=>a-b),captures:capture,pieceIds:engine.FAMILIES.flatMap(f=>f.pieceIds)});
 await closeDialog(page,info);record('closed');
 // One paired chooser view per partition, with both starter images completely
 // visible in the native modal. This also exercises all sixteen chooser cards.
 await activate(page.getByRole('button',{name:'Envelopes',exact:true}),info);const pair=page.locator(`.mg-envelope-card[data-envelope-id="${entry.id}"] .mg-envelope-art`);await boundedDiagnosticObservation(()=>pair.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'})),7500);await imagesReady(pair.locator('img'));
 const chooserBefore=await boundedDiagnosticObservation(()=>chooserState(page,entry.id));record('chooser-before',{state:chooserBefore,pieceIds:engine.STARTERS});verifyChooserState(chooserBefore,entry.id);
 const chooserPath=`expansion160-test-results/storage-views/${info.project.name}-chooser-${entry.id}.png`;await readyScreenshot(page,{path:chooserPath,fullPage:false,animations:'disabled'});
 const chooserAfter=await boundedDiagnosticObservation(()=>chooserState(page,entry.id));record('chooser-after',{state:chooserAfter,path:chooserPath});verifyChooserState(chooserAfter,entry.id);for(const key of ['images','rect','scrollTop','occlusionRect','chooserEvidence'])expect(chooserAfter[key]).toEqual(chooserBefore[key]);await info.attach(`chooser-${entry.id}`,{path:chooserPath,contentType:'image/png'});await closeDialog(page,info);record('chooser-closed');
 expect(await readKeys(page)).toEqual(Object.fromEntries(entries.map(e=>[e.key,e.raw])));record('read-only-bytes-verified',{count:16});
 let expected=engine.act(entry.save,{type:'undo'});await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expectBoard(page,expected);expect(engine.readSave((await readKeys(page))[entry.key]).save).toEqual(expected);record('undo-verified',{history:expected.history.length});
 await page.reload();await expectBoard(page,expected);expect(engine.readSave((await readKeys(page))[entry.key]).save).toEqual(expected);record('reload-verified');
 expected=engine.act(expected,{type:'undo'});await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expectBoard(page,expected);expect(engine.readSave((await readKeys(page))[entry.key]).save).toEqual(expected);record('second-undo-verified',{history:expected.history.length});
 const actual=await readKeys(page);for(const other of entries.filter(e=>e.key!==entry.key))expect(actual[other.key]).toBe(other.raw);record('other-saved-bytes-verified',{count:15});record('complete');
});

test('legacy Garden history loads unchanged, then exact compact Undo survives reload',async({page},info)=>{
 const engine=getMatchingEngine('matching-garden'),save=denseSave(engine,217),raw=engine.serializeSave(save),key=engine.STORAGE_KEY;
 await page.goto('/');await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await page.reload();await idle(page);await expectBoard(page,save);expect((await readKeys(page))[key]).toBe(raw);
 let expected=engine.act(save,{type:'undo'});await activate(page.getByRole('button',{name:'Undo',exact:true}),info);expect(engine.readSave((await readKeys(page))[key]).save).toEqual(expected);expect(JSON.parse((await readKeys(page))[key]).version).toBe(2);
 await page.reload();await expectBoard(page,expected);expected=engine.act(expected,{type:'undo'});await activate(page.getByRole('button',{name:'Undo',exact:true}),info);expect(engine.readSave((await readKeys(page))[key]).save).toEqual(expected);await expectBoard(page,expected);
 await mkdir('expansion160-test-results/storage-views',{recursive:true});await readyScreenshot(page,{path:`expansion160-test-results/storage-views/${info.project.name}-restored-board.png`,animations:'disabled'});
});
