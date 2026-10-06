import {renderedArt} from '../../frozen-v6/tests/expansion160-browser/rendered-art.js';
import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {recordDiagnosticEnvironment} from './run.mjs';
const evidenceRoot=fileURLToPath(new URL('../../test-results/',import.meta.url));
import {ENVELOPES,getMatchingEngine} from '../../frozen-v6/src/matching/cohesion/registry.js';
import {MAX_COLLECTION_CAPTURES} from '../../frozen-v6/scripts/expansion160Scope.mjs';
import {COLLECTION_CASE_TIMEOUT_MS,openEnvelopeJournal,collectionStateViolations,visibleImageIndices,verifyChooserState} from '../../frozen-v6/scripts/expansion160CollectionEvidence.mjs';
import {fullDiscoveryDenseSave} from '../../frozen-v6/tests/expansion160-browser/fullDiscoveryFixture.js';
import {collectionState,chooserState,preserveFailureDiagnosis,boundedDiagnosticObservation} from '../../frozen-v6/tests/expansion160-browser/collection-evidence.js';
import {readyScreenshot,activate,boardIds,closeDialog,imagesReady} from '../../frozen-v6/tests/expansion160-browser/shared-helpers.js';
const entries=ENVELOPES.map((envelope,index)=>{const engine=getMatchingEngine(envelope.id),save=fullDiscoveryDenseSave(engine,index+90);return {id:envelope.id,key:engine.STORAGE_KEY,raw:engine.serializeStoredSave(save),save};});
const board=save=>save.round.board.map(tile=>tile?.pieceId??'empty');
async function expectBoard(page,save){await expect.poll(()=>boardIds(page)).toEqual(board(save));await imagesReady(page.locator('.cg-board img'));}
const readKeys=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),entries.map(e=>e.key));
test.beforeAll(async({browser},info)=>recordDiagnosticEnvironment(browser,info));
const errors=new WeakMap();test.beforeEach(({page})=>{errors.set(page,[]);page.on('pageerror',e=>errors.get(page).push(e.message));});
test.afterEach(async({page},info)=>{try{expect(errors.get(page)).toEqual([]);}finally{await writeFile(`${evidenceRoot}/case-outcome.json`,JSON.stringify({purpose:'diagnostic-only-not-release-acceptance',testId:info.testId,title:info.title,profile:info.project.name,status:info.status,expectedStatus:info.expectedStatus,pageErrors:errors.get(page),errors:info.errors.map(error=>({message:error.message,stack:error.stack})),capturedAt:new Date().toISOString()},null,2)+'\n');await preserveFailureDiagnosis(page,info,errors.get(page).length>0);}});

// One envelope per case: a slow decode identifies its exact envelope/image and
// cannot consume a twelve/sixteen-envelope case budget. Each context is clean.
const entry=entries.find(entry=>entry.id==='matching-garden');
test(`diagnostic: ${entry.id}: collection, 100 Undo histories and all save boundaries`,async({page},info)=>{
 test.setTimeout(COLLECTION_CASE_TIMEOUT_MS);const engine=getMatchingEngine(entry.id);
 const record=openEnvelopeJournal(`${evidenceRoot}/progress/${info.project.name}-${entry.id}-collection.jsonl`,info.project.name,entry.id);
 await page.goto('/');await page.evaluate(items=>items.forEach(e=>localStorage.setItem(e.key,e.raw)),entries);record('seeded',{count:entries.length});
 await page.goto(`/?envelope=${entry.id}`);await expectBoard(page,entry.save);expect(engine.readSave((await readKeys(page))[entry.key]).save.history).toHaveLength(100);record('board-ready',{history:100});
 record('open-start');await activate(page.getByRole('button',{name:'Collection',exact:true}),info);const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog).toHaveJSProperty('open',true);record('dialog-open');
 await expect(page.getByLabel('Browse envelope',{exact:true}).locator('option')).toHaveCount(16);
 const pictures=dialog.locator('.cg-collection-piece img');await expect(pictures).toHaveCount(10);await expect(dialog.locator('.cg-collection-piece h4')).toHaveText(engine.FAMILIES.flatMap(family=>family.pieceIds.map(id=>engine.CATALOG[id].name)));await expect(dialog.getByRole('button',{name:'Open postcard',exact:true})).toHaveCount(6);
 for(const [image,picture] of (await pictures.all()).entries()) {record('image-start',{image});await picture.scrollIntoViewIfNeeded();await imagesReady(picture);const decoded=await renderedArt(picture,engine.FAMILIES.flatMap(f=>f.pieceIds)[image]);record('image-decoded',{image,...decoded});}
 // Greedy, bounded scroll coverage: every PNG must add at least one newly
 // visible whole image. Merely decoding ten images is not visual coverage.
 await mkdir(`${evidenceRoot}/storage-views`,{recursive:true});const covered=new Set();let capture=0;
 while(covered.size<10){
  const target=Array.from({length:10},(_,i)=>i).find(i=>!covered.has(i));await boundedDiagnosticObservation(()=>pictures.nth(target).evaluate(image=>image.scrollIntoView({block:'center',behavior:'instant'})),7500);
  const before=await boundedDiagnosticObservation(()=>collectionState(page));const visible=visibleImageIndices(before);expect(visible).toContain(target);record('capture-before',{capture,target,state:before});expect(collectionStateViolations(before,entry.id)).toEqual([]);
  const path=`${evidenceRoot}/storage-views/${info.project.name}-collection-${entry.id}-${capture}.png`;
  await readyScreenshot(page,{path,fullPage:false,animations:'disabled'});const after=await boundedDiagnosticObservation(()=>collectionState(page));record('capture-after',{capture,target,state:after,path});expect(collectionStateViolations(after,entry.id)).toEqual([]);for(const key of ['images','rect','scrollTop','occlusionRect'])expect(after[key]).toEqual(before[key]);
  visible.forEach(image=>covered.add(image));await info.attach(`collection-${entry.id}-${capture}`,{path,contentType:'image/png'});capture++;expect(capture).toBeLessThanOrEqual(MAX_COLLECTION_CAPTURES);
 }
 record('visual-coverage-complete',{images:[...covered].sort((a,b)=>a-b),captures:capture,pieceIds:engine.FAMILIES.flatMap(f=>f.pieceIds)});
 await closeDialog(page,info);record('closed');
 // One paired chooser view per partition, with both starter images completely
 // visible in the native modal. This also exercises all sixteen chooser cards.
 await activate(page.getByRole('button',{name:'Envelopes',exact:true}),info);const pair=page.locator(`.mg-envelope-card[data-envelope-id="${entry.id}"] .mg-envelope-art`);await boundedDiagnosticObservation(()=>pair.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'})),7500);await imagesReady(pair.locator('img'));
 const firstObservation=await boundedDiagnosticObservation(()=>observeChooserOnce(page,entry.id));
 const chooserBefore=firstObservation.state;
 // Write-once evidence and journal event precede the unchanged strict assertion.
 // Failure screenshots/fallback observations can never replace this sample.
 await writeFile(`${evidenceRoot}/chooser-first-observation.json`,JSON.stringify(firstObservation,null,2)+'\n',{flag:'wx'});
 record('chooser-before',{state:chooserBefore,pieceIds:engine.STARTERS});
 verifyChooserState(chooserBefore,entry.id);
 const chooserPath=`${evidenceRoot}/storage-views/${info.project.name}-chooser-${entry.id}.png`;await readyScreenshot(page,{path:chooserPath,fullPage:false,animations:'disabled'});
 const chooserAfter=await boundedDiagnosticObservation(()=>chooserState(page,entry.id));verifyChooserState(chooserAfter,entry.id);record('chooser-after',{state:chooserAfter,path:chooserPath});for(const key of ['images','rect','scrollTop','occlusionRect'])expect(chooserAfter[key]).toEqual(chooserBefore[key]);await info.attach(`chooser-${entry.id}`,{path:chooserPath,contentType:'image/png'});await closeDialog(page,info);record('chooser-closed');
 expect(await readKeys(page)).toEqual(Object.fromEntries(entries.map(e=>[e.key,e.raw])));record('read-only-bytes-verified',{count:16});
 let expected=engine.act(entry.save,{type:'undo'});await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expectBoard(page,expected);expect(engine.readSave((await readKeys(page))[entry.key]).save).toEqual(expected);record('undo-verified',{history:expected.history.length});
 await page.reload();await expectBoard(page,expected);expect(engine.readSave((await readKeys(page))[entry.key]).save).toEqual(expected);record('reload-verified');
 expected=engine.act(expected,{type:'undo'});await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expectBoard(page,expected);expect(engine.readSave((await readKeys(page))[entry.key]).save).toEqual(expected);record('second-undo-verified',{history:expected.history.length});
 const actual=await readKeys(page);for(const other of entries.filter(e=>e.key!==entry.key))expect(actual[other.key]).toBe(other.raw);record('other-saved-bytes-verified',{count:15});record('complete');
});

// One synchronous observation. Hit booleans and descriptions share each exact
// elementFromPoint return value; instrumentation never changes layout or waits.
async function observeChooserOnce(page,envelope) {
 return page.locator('body').evaluate((body,envelope)=>{
  const dialogs=[...document.querySelectorAll('dialog')],dialog=dialogs[0],card=dialog?.querySelector(`.mg-envelope-card[data-envelope-id="${envelope}"]`),box=dialog?.getBoundingClientRect();
  const describe=element=>{
   if(!element)return null;
   const style=getComputedStyle(element);
   return {tag:element.tagName,id:element.id,classes:element.getAttribute('class'),role:element.getAttribute('role'),dataEnvelopeId:element.getAttribute('data-envelope-id'),rect:element.getBoundingClientRect().toJSON(),styles:Object.fromEntries(['display','visibility','opacity','pointer-events','position','z-index','overflow','overflow-x','overflow-y','transform','transform-origin','object-fit','object-position','clip-path','isolation'].map(name=>[name,style.getPropertyValue(name)]))};
  };
  const ancestors=element=>{const rows=[];for(let e=element;e&&rows.length<12;e=e.parentElement)rows.push(describe(e));return rows;};
  const imageDiagnostics=[];
  const state={capturedAt:new Date().toISOString(),dialogCount:dialogs.length,open:dialog?.open??false,modal:dialog?.matches(':modal')??false,bodyOverflow:getComputedStyle(body).overflow,envelope:card?.dataset.envelopeId??null,occlusionRect:(()=>{const h=dialog?.querySelector('.cg-dialog-header')?.getBoundingClientRect();return box&&h?{x:box.x,y:box.y,width:box.width,height:Math.max(0,h.bottom-box.y)}:null;})(),rect:box?.toJSON()??null,scrollTop:dialog?.scrollTop??null,viewport:{width:innerWidth,height:innerHeight},images:[...(card?.querySelectorAll('.mg-envelope-art img')??[])].map(image=>{
   const rect=image.getBoundingClientRect();
   const points=[[0.02,0.02],[0.98,0.02],[0.02,0.98],[0.98,0.98],[0.5,0.5]].map(([rx,ry])=>{
    const x=rect.x+rect.width*rx,y=rect.y+rect.height*ry,target=document.elementFromPoint(x,y);
    return {x,y,hit:target===image,target:describe(target),targetAncestors:ancestors(target),stack:document.elementsFromPoint(x,y).slice(0,12).map(describe)};
   });
   imageDiagnostics.push({image:describe(image),imageAncestors:ancestors(image),points});
   return {source:image.currentSrc||image.src,complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,rect:rect.toJSON(),hitPoints:points.map(({x,y,hit})=>({x,y,hit})),centerHit:points[4].hit};
  })};
  const bounds=box?{left:Math.max(0,box.x),top:Math.max(0,box.y),right:Math.min(innerWidth,box.x+box.width),bottom:Math.min(innerHeight,box.y+box.height)}:null;
  imageDiagnostics.forEach((diagnostic,index)=>{
   const image=state.images[index],r=image.rect,o=state.occlusionRect;
   diagnostic.explanatoryCriteria={dialogBoundsPresent:Boolean(bounds),headerPresentWithPositiveHeight:Boolean(o&&o.height>0),complete:image.complete,positiveNaturalWidth:image.naturalWidth>0,positiveNaturalHeight:image.naturalHeight>0,centerHit:image.centerHit,exactlyFivePoints:image.hitPoints.length===5,allFiveExactImageHits:image.hitPoints.every(point=>point.hit===true),noHeaderOverlap:!(r&&o&&r.x<o.x+o.width&&r.x+r.width>o.x&&r.y<o.y+o.height&&r.y+r.height>o.y),positiveWidth:r.width>0,positiveHeight:r.height>0,leftContained:Boolean(bounds&&r.x>=bounds.left-0.5),topContained:Boolean(bounds&&r.y>=bounds.top-0.5),rightContained:Boolean(bounds&&r.x+r.width<=bounds.right+0.5),bottomContained:Boolean(bounds&&r.y+r.height<=bounds.bottom+0.5)};
  });
  return {purpose:'diagnostic-only-not-release-acceptance',state,diagnostic:{capturedAt:state.capturedAt,observedAtMonotonicMs:performance.now(),url:location.href,devicePixelRatio,scroll:{x:scrollX,y:scrollY},visualViewport:visualViewport?{width:visualViewport.width,height:visualViewport.height,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop,pageLeft:visualViewport.pageLeft,pageTop:visualViewport.pageTop,scale:visualViewport.scale}:null,dialog:describe(dialog),header:describe(dialog?.querySelector('.cg-dialog-header')),card:describe(card),bounds,images:imageDiagnostics,criteriaAreExplanationOnly:true}};
 },envelope,{timeout:5000});
}
