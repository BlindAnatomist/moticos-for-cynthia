import {it, expect} from 'vitest';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {COLLECTION_TIMEOUT_MS, collectionStateViolations, openCollectionJournal, verifyCollectionJournal} from '../scripts/collectionEvidence.mjs';
const profile='webkit-iphone-large', envelopes=Array.from({length:12},(_,i)=>`envelope-${i}`);
const state=envelope=>({dialogCount:1,open:true,modal:true,visible:true,bodyOverflow:'hidden',envelope,
 images:Array.from({length:10},(_,i)=>({source:`art-${i}.webp`,complete:true,naturalWidth:512,naturalHeight:512})),hitTests:Array.from({length:3},()=>({insideDialog:true}))});
function journal() {
 let elapsedMs=0; const events=[], add=(event,details={})=>events.push({event,elapsedMs:elapsedMs++, ...details});
 add('begin',{profile,envelopes,timeoutMs:COLLECTION_TIMEOUT_MS});add('seeded');
 for(const envelope of envelopes) {
  for(const event of ['navigation-start','board-ready','open-start','dialog-open'])add(event,{envelope});
  for(let image=0;image<10;image++){add('image-start',{envelope,image});add('image-decoded',{envelope,image,source:`art-${image}.webp`,naturalWidth:512,naturalHeight:512});}
  add('capture-before',{envelope,state:state(envelope)});add('capture-after',{envelope,state:state(envelope),path:`batch-test-results/storage-views/${profile}-collection-${envelope}.png`});add('closed',{envelope});
 }
 add('saved-bytes-verified',{count:12});add('complete');return events;
}
it('accepts only twelve completed collections, 120 actual decodes and unchanged saves',()=>expect(verifyCollectionJournal(journal(),profile,envelopes)).toEqual({envelopes:12,decodedImages:120,captures:12,savedBytesUnchanged:true}));
it.each(['missing-or-duplicate-dialog','dialog-not-in-modal-top-layer','dialog-not-visibly-open','wrong-envelope','missing-collection-images','image-loading-stall','dialog-occluded-or-outside-viewport'])('distinguishes %s from successful modal paint readiness',problem=>{
 const value=state(envelopes[0]);
 if(problem==='missing-or-duplicate-dialog')value.dialogCount=0;
 if(problem==='dialog-not-in-modal-top-layer')value.modal=false;
 if(problem==='dialog-not-visibly-open')value.visible=false;
 if(problem==='wrong-envelope')value.envelope='other';
 if(problem==='missing-collection-images')value.images.pop();
 if(problem==='image-loading-stall')value.images[0].naturalWidth=0;
 if(problem==='dialog-occluded-or-outside-viewport')value.hitTests[1].insideDialog=false;
 expect(collectionStateViolations(value,envelopes[0])).toContain(problem);
 const events=journal();events.find(e=>e.event==='capture-before').state=value;
 expect(()=>verifyCollectionJournal(events,profile,envelopes)).toThrow();
});
it('rejects an interrupted twelfth collection even when eleven screenshots exist',()=>{
 const events=journal(),at=events.findIndex(e=>e.event==='navigation-start'&&e.envelope===envelopes[11]);
 expect(()=>verifyCollectionJournal(events.slice(0,at+2),profile,envelopes)).toThrow();
});
it.each(['image-decoded','capture-after','closed','saved-bytes-verified','complete'])('rejects missing %s proof',name=>{
 const events=journal();events.splice(events.findIndex(e=>e.event===name),1);expect(()=>verifyCollectionJournal(events,profile,envelopes)).toThrow();
});
it('rejects duplicate image proof, modal capture drift, false completion and excess duration',()=>{
 for(const change of [events=>events.find(e=>e.event==='image-decoded').image=9,events=>events.find(e=>e.event==='capture-after').state.images[0].source='changed.webp',events=>events.push({...events.at(-1)}),events=>events.at(-1).elapsedMs=COLLECTION_TIMEOUT_MS]){
  const events=journal();change(events);expect(()=>verifyCollectionJournal(events,profile,envelopes)).toThrow();
 }
});
it('flushes partial progress before the failing image and never invents completion',()=>{
 const root=mkdtempSync(join(tmpdir(),'moticos-journal-'));let now=0;
 try{const path=join(root,'progress/collections.jsonl'),record=openCollectionJournal(path,profile,envelopes,()=>now++);
  record('seeded');record('navigation-start',{envelope:envelopes[0]});record('image-start',{envelope:envelopes[0],image:3});
  const events=readFileSync(path,'utf8').trim().split('\n').map(JSON.parse);
  expect(events.at(-1)).toMatchObject({event:'image-start',image:3});expect(events.some(e=>e.event==='complete')).toBe(false);
  expect(()=>verifyCollectionJournal(events,profile,envelopes)).toThrow();
 }finally{rmSync(root,{recursive:true,force:true});}
});

it('retains bounded, ordered failure diagnosis even when the screenshot fails',async()=>{
 const {preserveFailureDiagnosis}=await import('./expansion-browser/collection-evidence.js');
 const root=mkdtempSync(join(tmpdir(),'moticos-failure-')),calls=[];
 const info={status:'timedOut',expectedStatus:'passed',testId:'case',project:{name:profile},outputPath:name=>join(root,name)};
 const page={locator:()=>({evaluate:async(...args)=>{calls.push(['state',args[2]]);return state(envelopes[0]);},ariaSnapshot:async options=>{calls.push(['aria',options]);return 'dialog: Your collection';}}),
 screenshot:async options=>{calls.push(['screenshot',options]);throw new Error('screenshot deadline');}};
 try {
  await expect(preserveFailureDiagnosis(page,info)).resolves.toBeUndefined();
  const record=JSON.parse(readFileSync(join(root,'failure-diagnosis/failure-state.json'),'utf8'));
  expect(record.purpose).toBe('diagnostic-only-not-release-acceptance');
  expect(record.observations.map(o=>o.name)).toEqual(['before-image','failure-image','after-image','accessibility']);
  expect(record.observations[1].unavailable).toContain('screenshot deadline');
  expect(calls.map(c=>c[0])).toEqual(['state','screenshot','state','aria']);
  for(const [kind,options] of calls)expect(options.timeout,kind).toBe(5000);
  for(const observation of record.observations)expect(Date.parse(observation.end)).toBeGreaterThanOrEqual(Date.parse(observation.start));
 }finally{rmSync(root,{recursive:true,force:true});}
});
it('rejects wrong-profile and reordered collection progress',()=>{
 const wrong=journal();wrong[0].profile='webkit-iphone-13';expect(()=>verifyCollectionJournal(wrong,profile,envelopes)).toThrow();
 const reordered=journal();[reordered[2],reordered[3]]=[reordered[3],reordered[2]];expect(()=>verifyCollectionJournal(reordered,profile,envelopes)).toThrow();
 const drift=journal();drift.find(e=>e.event==='capture-before').state.rect={x:0};drift.find(e=>e.event==='capture-after').state.rect={x:1};expect(()=>verifyCollectionJournal(drift,profile,envelopes)).toThrow();
});

it('bounds a hung diagnostic request independently of browser evaluation timeouts',async()=>{
 const {boundedDiagnosticObservation}=await import('./expansion-browser/collection-evidence.js');
 await expect(boundedDiagnosticObservation(()=>new Promise(()=>{}),5)).rejects.toThrow('Diagnostic observation exceeded 5ms');
 await expect(boundedDiagnosticObservation(()=>Promise.reject(new Error('original browser failure')),5)).rejects.toThrow('original browser failure');
 await expect(boundedDiagnosticObservation(()=>({modal:true}),100)).resolves.toEqual({modal:true});
});
