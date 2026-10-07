import {describe,it,expect,vi} from 'vitest';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {openEnvelopeJournal,verifyEnvelopeJournal,COLLECTION_CASE_TIMEOUT_MS} from '../scripts/expansion160CollectionEvidence.mjs';
import {collectionEvents} from './expansion160EvidenceFixtures.js';
import {boundedDiagnosticObservation} from './expansion160-browser/collection-evidence.js';
const config=pathToFileURL(resolve('playwright.expansion160.config.js')).href;
function inspect(args,approved=true,budget='960000'){
 const code=`process.argv=['node','playwright',...${JSON.stringify(args)}];const {default:c}=await import(${JSON.stringify(config)});console.log(JSON.stringify({workers:c.workers,retries:c.retries,maxFailures:c.maxFailures,globalTimeout:c.globalTimeout,trace:c.use.trace,timeout:c.timeout,webServer:c.webServer}));`;
 return spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,MOTICOS_160_BROWSER_APPROVED:approved?'1':'',MOTICOS_160_BROWSER_BUDGET_MS:budget}});
}
const base=['test','--config=playwright.expansion160.config.js'];
describe('160 browser guard, inspected without starting a server/browser',()=>{
 it.each(['webkit-iphone-13','webkit-iphone-large','chromium-desktop'])('admits exact %s only under explicit operator flag',p=>{
  const result=inspect([...base,`--project=${p}`]);expect(result.status).toBe(0);const c=JSON.parse(result.stdout);expect(c).toMatchObject({workers:1,retries:0,maxFailures:1,globalTimeout:960000,timeout:60000});expect(c.trace).toEqual({mode:'retain-on-failure',screenshots:false,snapshots:false,sources:true,attachments:false});expect(c.webServer.reuseExistingServer).toBe(false);
 });
 it('admits collection without approval',()=>expect(inspect([...base,'--list','--reporter=json'],false).status).toBe(0));
 it('refuses execution without approval',()=>expect(inspect([...base,'--project=webkit-iphone-large'],false).status).not.toBe(0));
 it.each([[],['--project=*'],['--project=webkit-iphone-large','--grep=Undo'],['--project=webkit-iphone-large','--workers=2'],['--project=webkit-iphone-large','--retries=1'],['--project=webkit-iphone-large','--reporter=json'],['--project=webkit-iphone-large','--project=chromium-desktop'],['--project=webkit-iphone-large','--config=playwright.expansion160.config.js']])('refuses override %j',(...args)=>expect(inspect([...base,...args]).status).not.toBe(0));
 it.each(['899999','960001','NaN','Infinity','900000.5'])('refuses invalid budget %s',b=>expect(inspect([...base,'--project=webkit-iphone-large'],true,b).status).not.toBe(0));
 it('admits lower fifteen-minute budget',()=>expect(JSON.parse(inspect([...base,'--project=webkit-iphone-large'],true,'900000').stdout).globalTimeout).toBe(900000));
});
const envelope={id:'fixture',pieceIds:Array.from({length:10},(_,i)=>`piece${i}`),starters:['piece0','piece5']};
const events=()=>collectionEvents(envelope);
it('accepts only a complete bounded envelope journal',()=>expect(verifyEnvelopeJournal(events(),'profile','fixture')).toMatchObject({historyBefore:100,exactUndoTransitions:2,readOnlySaveKeys:16}));
it.each(['image-decoded','capture-before','capture-after','visual-coverage-complete','chooser-before','chooser-after','chooser-closed','closed','read-only-bytes-verified','undo-verified','reload-verified','second-undo-verified','other-saved-bytes-verified','complete'])('refuses journal missing %s',phase=>expect(()=>verifyEnvelopeJournal(events().filter(e=>e.event!==phase),'profile','fixture')).toThrow());
it.each(['modal','open','visible'])('refuses false before/after modal %s',key=>{for(const phase of ['capture-before','capture-after']){const e=events();e.find(e=>e.event===phase).state[key]=false;expect(()=>verifyEnvelopeJournal(e,'profile','fixture')).toThrow();}});
it('refuses timing overflow, backward times, image and scroll drift',()=>{for(const mutate of [e=>e.at(-1).elapsedMs=45000,e=>e[5].elapsedMs=-1,e=>e.find(e=>e.event==='capture-after').state.images[0].source='changed',e=>e.find(e=>e.event==='capture-after').state.scrollTop=30]){const e=events();mutate(e);expect(()=>verifyEnvelopeJournal(e,'profile','fixture')).toThrow();}});
it('flushes each progress record immediately',()=>{const root=mkdtempSync(`${tmpdir()}/moticos160-journal-`);try{let now=5;const record=openEnvelopeJournal(`${root}/events.jsonl`,'p','e',()=>now++);record('seeded',{count:16});const all=readFileSync(`${root}/events.jsonl`,'utf8').trim().split('\n').map(JSON.parse);expect(all.map(e=>e.event)).toEqual(['begin','seeded']);expect(all[1].elapsedMs).toBeGreaterThan(all[0].elapsedMs);}finally{rmSync(root,{recursive:true});}});
it('bounds a hung diagnostic and clears timer on success',async()=>{await expect(boundedDiagnosticObservation(()=>new Promise(()=>{}),5)).rejects.toThrow('exceeded');await expect(boundedDiagnosticObservation(()=>17,50)).resolves.toBe(17);});
it('partitions sixteen collections rather than a single global sweep',()=>{const source=readFileSync('tests/expansion160-browser/collections.spec.js','utf8');expect(source).toContain('for(const entry of entries)test(');expect(source).toContain('test.setTimeout(COLLECTION_CASE_TIMEOUT_MS)');expect(source).not.toContain("test('all sixteen");expect(source).toContain('await renderedArt(picture,');expect(source).toContain('while(covered.size<10)');expect(source).toContain('MAX_COLLECTION_CAPTURES');});

it('stages the shared build outside browser evidence and rejects duplication before execution',()=>{
 const prepare=readFileSync('scripts/prepareExpansion160Profile.sh','utf8'),run=readFileSync('scripts/runExpansion160Profile.sh','utf8'),preflight=readFileSync('scripts/preflightExpansion160.sh','utf8');
 expect(prepare).toContain('--output .expansion160-input');expect(prepare).toContain('cp -a .expansion160-input/preflight-results/build/dist-expansion160 dist-expansion160');
 expect(prepare).not.toContain('cp -a .expansion160-input/preflight-results preflight-results');
 expect(run.indexOf('preflight-results/build')).toBeLessThan(run.indexOf('playwright test'));
 expect(preflight).toContain('unset VITE_COLLAGE_BATCH VITE_COLLAGE_EXPANSION VITE_COLLAGE_EXPANSION_160');
});

it.each([e=>e.find(x=>x.event==='capture-before').state.images[0].rect.y=-1,e=>e.find(x=>x.event==='capture-before').state.images[0].centerHit=false,e=>e.find(x=>x.event==='chooser-before').state.images[1].rect.y=900,e=>e.find(x=>x.event==='chooser-before').state.images[1].source='wrong'])('rejects clipped or occluded collection and mismatched paired starters',mutate=>{const values=events();mutate(values);expect(()=>verifyEnvelopeJournal(values,'profile','fixture')).toThrow();});

it.each([e=>e.find(x=>x.event==='capture-before').state.images[0].hitPoints[0].hit=false,e=>e.find(x=>x.event==='capture-before').state.occlusionRect.height=110])('rejects image corners hidden by sticky headers even with a clear center',mutate=>{const values=events();mutate(values);expect(()=>verifyEnvelopeJournal(values,'profile','fixture')).toThrow();});

import {chooserVisibilityCases} from './expansion160ChooserVisibilityCases.js';
it.each(chooserVisibilityCases)('chooser contract: $name',async({run})=>run());
