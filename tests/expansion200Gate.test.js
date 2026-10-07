import {makePng} from './expansion160PngFixtures.js';
import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateContract, verifyPinnedCases, verifyCollection, verifyCompleted, verifyExports, verifyAggregate } from '../scripts/verifyExpansion200GateCoverage.mjs';
const contract = JSON.parse(readFileSync('tests/verification/expansion200-coverage-contract.json', 'utf8'));
const profile = 'webkit-iphone-13';
const cases = contract.cases.filter(test => test.project === profile);
const report = (items = cases, completed = false) => ({ errors: [], stats: {expected: 33, unexpected: 0, flaky: 0, skipped: 0}, suites: [{ specs: items.map(test => ({ id: test.id, title: test.title, file: test.file,
  tests: [{ projectName: test.project, expectedStatus: 'passed', status: completed ? 'expected' : 'skipped', results: completed ? [{ status: 'passed', retry: 0, errors: [] }] : [] }] })) }] });
const event = (test, type) => ({ ...test, event: type, file: `/runner/tests/expansion200-browser/${test.file}`, title: ['', test.project, test.file, test.title], retry: 0,
 ...(type === 'test-end' ? { status: 'passed', expectedStatus: 'passed', errors: [] } : {}) });
const events = () => [{event:'begin', tests:33, workers:1, maxFailures:1, retries:[0], projects:[profile]}, ...cases.flatMap(test => [event(test,'test-begin'), event(test,'test-end')]), {event:'end',status:'passed'}];
const complete = values => verifyCompleted(contract, profile, values, report(cases, true));

describe('frozen collage coverage contract', () => {
 it('pins all 99 identities, thirty-three per profile, and unchanged scenario bytes', () => { validateContract(contract); verifyPinnedCases(contract); expect(verifyCollection(contract,report(contract.cases),'all')).toEqual({profile:'all',cases:99}); });
 it('accepts only the exact complete thirty-three-pass profile', () => expect(complete(events())).toMatchObject({status:'passed',uniqueCases:33,retries:0}));
 it('rejects omitted collection', () => expect(() => verifyCollection(contract,report(cases.slice(1)),profile)).toThrow());
 it('rejects a changed title with the same ID', () => expect(() => verifyCollection(contract,report(cases.map((item,index) => index ? item : {...item,title:'changed'})),profile)).toThrow());
 it('rejects a replaced ID with the same title', () => expect(() => verifyCollection(contract,report(cases.map((item,index) => index ? item : {...item,id:'different'})),profile)).toThrow());
 it('rejects a mixed profile set', () => expect(() => verifyCollection(contract,report([...cases.slice(1),contract.cases[33]]),profile)).toThrow());
 it('rejects collection errors', () => expect(() => verifyCollection(contract,{...report(),errors:['collection failure']},profile)).toThrow());
 it('rejects unexpected scenario fields', () => expect(() => verifyPinnedCases({...contract,testFiles:contract.testFiles.map((item,index) => index ? item : {...item,sha256:'0'.repeat(64)})})).toThrow());
 it.each(['failed','timedOut','interrupted','skipped'])('rejects terminal %s even with process success', status => { const values=events();values[2].status=status;expect(() => complete(values)).toThrow(); });
 it('rejects missing terminal case', () => expect(() => complete(events().filter((_,index) => index!==2))).toThrow());
 it('rejects missing test begin', () => expect(() => complete(events().filter((_,index) => index!==1))).toThrow());
 it('rejects duplicate terminal case', () => { const values=events();values.splice(3,0,values[2]);expect(() => complete(values)).toThrow(); });
 it('rejects retries', () => { const values=events();values[2].retry=1;expect(() => complete(values)).toThrow(); });
 it('rejects an unclosed run', () => expect(() => complete(events().slice(0,-1))).toThrow());
 it('rejects a fatal reporter event', () => { const values=events();values.splice(1,0,{event:'error',message:'fatal'});expect(() => complete(values)).toThrow(); });
 it('rejects worker or fail-fast overrides', () => { for(const change of [{workers:2},{maxFailures:0},{retries:[1]}]) { const values=events();Object.assign(values[0],change);expect(() => complete(values)).toThrow(); } });
 it('rejects a successful journal with an incomplete JSON report', () => { const value=report(cases,true);value.suites[0].specs[0].tests[0].results=[];expect(() => verifyCompleted(contract,profile,events(),value)).toThrow(); });
 it('rejects a successful journal with JSON skips or flaky stats', () => { for(const field of ['skipped','flaky','unexpected']) { const value=report(cases,true);value.stats[field]=1;expect(() => verifyCompleted(contract,profile,events(),value)).toThrow(); } });
 it('requires all three exact profiles and one common build for a 99-case aggregate', () => {
  const proofs = ['webkit-iphone-13','webkit-iphone-large','chromium-desktop'].map(name => ({status:'passed',profile:name,runCommit:'a'.repeat(40),sourceFingerprint:'d'.repeat(64),uniqueCases:33,retries:0,failed:0,skipped:0,exports:Array(24).fill({}),results:contract.cases.filter(test => test.project===name).map(test => event(test,'test-end'))}));
  expect(verifyAggregate(contract,proofs)).toMatchObject({uniqueCases:99,actualExports:72});
  expect(() => verifyAggregate(contract,proofs.slice(1))).toThrow();
  expect(() => verifyAggregate(contract,proofs.map((proof,index) => index ? proof : {...proof,runCommit:'b'.repeat(40)}))).toThrow();
 });
 it('requires all 24 distinct actual PNG exports with exact dimensions and identities', () => {
  const directory=mkdtempSync(join(tmpdir(),'moticos-exports-'));
  try {
   for (const [index,id] of contract.postcardIds.entries()) { const bytes=makePng(1536,1120,index);writeFileSync(join(directory,`${profile}-${id}-export.png`),bytes); }
   expect(verifyExports(contract,profile,directory)).toHaveLength(24);
   rmSync(join(directory,`${profile}-${contract.postcardIds[0]}-export.png`));expect(() => verifyExports(contract,profile,directory)).toThrow();
  } finally {rmSync(directory,{recursive:true,force:true});}
 });
});

import {POSTCARD_VIEWPORTS,verifyPostcardState} from '../scripts/expansion200PostcardEvidence.mjs';
import {runIdentity as identity200,currentCatalog} from '../scripts/currentCandidate200.mjs';
import {verifyProfileBudget} from '../scripts/verifyExpansion200GateProfileBudget.mjs';
function postcardFixture(view='art'){
 const rect={x:12,y:12,width:280,height:500};const visible={rect:{x:28,y:100,width:250,height:300},visible:true,unclipped:true,centerHit:true,hitTests:Array(5).fill(true)};
 return {viewport:{width:320,height:568},dialogCount:1,modal:true,bodyOverflow:'hidden',pageScrollX:0,pageScrollY:0,documentWidth:320,documentHeight:568,dialog:rect,dialogScrollTop:view==='art'?0:120,title:'Lasting Impression',image:{...structuredClone(visible),complete:true,naturalWidth:768,naturalHeight:768,source:'http://127.0.0.1:4197/assets/im5-fixture.webp'},caption:{...structuredClone(visible),rect:{x:28,y:410,width:250,height:40},textRect:{x:28,y:410,width:250,height:40},scrollWidth:250,clientWidth:250},controls:['Back to board','Download postcard','Share postcard'].map((name,i)=>({name,rect:{x:20+i*90,y:20,width:85,height:44},enabled:true,visible:true,unclipped:true,centerHit:true,hitTests:Array(5).fill(true)}))};
}
describe('200-specific posture and enlarged-postcard evidence guards',()=>{
 it('covers precisely four new journeys and every20envelope collection while retaining all5global safety cases',()=>{
  expect(contract.journeyEnvelopeIds).toHaveLength(4);expect(contract.newPieceIds).toHaveLength(40);expect(contract.preservedPieceIds).toHaveLength(160);expect(contract.revisedPieceIds).toEqual([]);
  for(const profile of ['webkit-iphone-13','webkit-iphone-large','chromium-desktop']){
   const rows=contract.cases.filter(c=>c.project===profile);expect(rows).toHaveLength(33);expect(rows.filter(c=>c.title.endsWith('complete ten-picture routes and six real postcards'))).toHaveLength(4);expect(rows.filter(c=>c.title.endsWith('wrong pairs, Cut, Undo and fresh-envelope discoveries'))).toHaveLength(4);expect(rows.filter(c=>c.title.endsWith('collection, 100 Undo histories and all save boundaries'))).toHaveLength(20);for(const title of ['corrupt/future bytes, quota and stale-tab failure keep existing saves','exact source assets, read-only album and twenty-envelope save boundaries','compact screen fit, reduced motion, keyboard and repeated dialog dismissal','published Garden core: identical pairs, Cut, Undo and reload remain intact','legacy Garden history loads unchanged, then exact compact Undo survives reload'])expect(rows.filter(c=>c.title===title)).toHaveLength(1);
  }
 });
 it('source identities include all200 unique current artworks',async()=>expect(await currentCatalog()).toHaveLength(200));
 it.each(['art','actions'])('accepts explicitly labeled synthetic %s postcard geometry only at the exact viewport',(view)=>{expect(verifyPostcardState(postcardFixture(view),{width:320,height:568},'Lasting Impression',view)).toMatchObject({view});});
 it.each(['modal','bodyOverflow','pageScrollX','pageScrollY','documentWidth','documentHeight','dialogCount','title','image.complete','image.naturalWidth','image.visible','image.unclipped','image.centerHit','caption.visible','caption.unclipped','caption.centerHit'])('rejects altered postcard %s',field=>{
  const state=postcardFixture();const parts=field.split('.'),target=parts.length===2?state[parts[0]]:state,key=parts.at(-1),value=target[key];target[key]=typeof value==='boolean'?!value:typeof value==='number'?value+500:'bad';expect(()=>verifyPostcardState(state,state.viewport,'Lasting Impression','art')).toThrow();
 });
 it.each(['enabled','visible','unclipped','centerHit'])('rejects inaccessible action %s',field=>{const s=postcardFixture('actions');s.controls[1][field]=false;expect(()=>verifyPostcardState(s,s.viewport,s.title,'actions')).toThrow();});
 it('rejects clipped art, missing buttons, stale viewport, scroll on art view and tiny targets',()=>{
  for(const change of [s=>s.image.rect.x=-2,s=>s.caption.rect.y=550,s=>s.controls.pop(),s=>s.controls[0].rect.width=20,s=>s.dialogScrollTop=20,s=>s.viewport.width=390]){const s=postcardFixture();change(s);expect(()=>verifyPostcardState(s,{width:320,height:568},s.title,'art')).toThrow();}
  const actions=postcardFixture('actions');actions.controls.pop();expect(()=>verifyPostcardState(actions,actions.viewport,actions.title,'actions')).toThrow();
 });
 it('keeps three exact compact postcard widths',()=>expect(POSTCARD_VIEWPORTS).toEqual([{width:320,height:568},{width:390,height:664},{width:430,height:752}]));
 it('rejects fake/nonmatching hosted identities and every rerun',()=>{
  const e={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'BlindAnatomist/moticos-for-cynthia',GITHUB_REF:'refs/heads/verify/current-200-20261007',GITHUB_EVENT_NAME:'push',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',GITHUB_WORKFLOW_REF:'BlindAnatomist/moticos-for-cynthia/.github/workflows/verify-expansion-200.yml@refs/heads/verify/current-200-20261007'};
  expect(identity200(e).runCommit).toBe(e.GITHUB_SHA);for(const [key,value]of Object.entries({GITHUB_ACTIONS:'false',GITHUB_REPOSITORY:'another/repo',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'2'}))expect(()=>identity200({...e,[key]:value})).toThrow();
 });
 it.each([['chromium-desktop',5],['webkit-iphone-13',10],['webkit-iphone-large',11]])('%s preserves its established artifact cap',(profile,parts)=>{
  const proof={kind:'browser',complete:true,partCount:parts,uploadUpperBound:parts*24*1024*1024,partLimitBytes:24*1024*1024};expect(verifyProfileBudget(profile,proof).partCap).toBe(parts);expect(()=>verifyProfileBudget(profile,{...proof,partCount:parts+1})).toThrow();expect(()=>verifyProfileBudget(profile,{...proof,complete:false})).toThrow();
 });
});

it('rejects partly covered postcard buttons and overflowing title glyphs',()=>{const s=postcardFixture('actions');s.controls[1].hitTests[1]=false;expect(()=>verifyPostcardState(s,s.viewport,s.title,'actions')).toThrow();const t=postcardFixture();t.caption.textRect.width=500;expect(()=>verifyPostcardState(t,t.viewport,t.title,'art')).toThrow();});

import {publicPathAllowed200} from '../scripts/currentCandidate200.mjs';
it('admits only the bounded application, artwork and verification projection',()=>{
 for(const path of ['src/matching/expansion200/art/im1.webp','scripts/currentCandidate200.mjs','tests/verification/accepted160-preservation.json','.github/workflows/verify-expansion-200.yml','.gitignore','VERIFICATION_200.md'])expect(publicPathAllowed200(path)).toBe(true);
 for(const path of ['PRIVATE_200_REVIEW.md','NEXT_VERIFICATION_PLAN.md','evidence/result.json','checkpoint/source.zip','originals/im1.png','prompts/im1.txt','.git/config','node_modules/pkg/index.js','src/.env','tests/../secret.json','/workspace/secret.js','src/key.pem','tests/private/notes.json','tests/history/conversation.json','scripts/credentials.json','public/recovery/evidence.json','src/prompts/im1.md'])expect(publicPathAllowed200(path)).toBe(false);
});
it('retains exact workflow destination, timing, artifact and read-only permission boundaries',()=>{
 const w=JSON.parse(readFileSync('.github/workflows/verify-expansion-200.yml','utf8'));
 expect(w.on).toEqual({push:{branches:['verify/current-200-20261007']}});expect(w.permissions).toEqual({contents:'read'});expect(w.jobs.build['timeout-minutes']).toBe(10);expect(w.jobs.browser['timeout-minutes']).toBe(26);expect(w.jobs.browser.strategy['fail-fast']).toBe(true);expect(w.jobs.browser.strategy['max-parallel']).toBe(1);
 const steps=Object.values(w.jobs).flatMap(j=>j.steps);for(const step of steps.filter(s=>s.uses))expect(['actions/checkout@v4','actions/setup-node@v4','actions/upload-artifact@v4','actions/download-artifact@v4']).toContain(step.uses);
 for(const step of steps.filter(s=>s.uses==='actions/upload-artifact@v4')){expect(step.with['retention-days']).toBe(1);expect(step.with['if-no-files-found']).toBe('error');}
 const script=steps.map(s=>s.run??'').join('\n');expect(script).not.toMatch(/git push|netlify|deploy_site|gh workflow run/);
});

it.each(['documentWidth','documentHeight','caption.scrollWidth','caption.clientWidth'])('rejects malformed finite geometry for %s',field=>{for(const value of [-1,0,null,'320',NaN,Infinity]){const s=postcardFixture(),parts=field.split('.'),target=parts.length===2?s[parts[0]]:s;target[parts.at(-1)]=value;expect(()=>verifyPostcardState(s,s.viewport,s.title,'art')).toThrow();}});

import {verifyMixedInteractionState} from '../scripts/expansion200PostcardEvidence.mjs';
const mixedEnvelope=contract.envelopePieces.find(envelope=>contract.journeyEnvelopeIds.includes(envelope.id));
function mixedFixture(kind){const board=mixedEnvelope.starters.flatMap(id=>[id,id,...[2,3,4].map(tier=>id.slice(0,-1)+tier)]);while(board.length<25)board.push('empty');const pair=[0,1].map(index=>({index,id:board[index]}));return{kind,viewport:{width:320,height:568},board,saveSha256:'a'.repeat(64),selected:kind==='selected'?[pair[0]]:[],matches:kind==='selected'?[pair[1]]:[],pressed:kind==='selected'?[pair[0]]:[],hints:kind==='hint'?pair:[]};}
it.each(['selected','hint'])('accepts the legal mixed-stage %s evidence shape',kind=>expect(verifyMixedInteractionState(mixedFixture(kind),mixedEnvelope,kind)).toMatchObject({kind,saveSha256:'a'.repeat(64)}));
it.each(['selected','hint'])('rejects missing, corrupt and mismatched mixed-stage %s evidence',kind=>{
 for(const mutate of [s=>delete s.board,s=>s.board.pop(),s=>s.board[0]='bad',s=>s.board[0]=mixedEnvelope.finals[0],s=>s.saveSha256='bad',s=>s.viewport.width=390,s=>s.kind='other',s=>s[kind==='selected'?'selected':'hints']=[],s=>s[kind==='selected'?'pressed':'hints'][0].index=24,s=>s[kind==='selected'?'matches':'hints'][0].id=mixedEnvelope.starters[1]]){const state=mixedFixture(kind);mutate(state);expect(()=>verifyMixedInteractionState(state,mixedEnvelope,kind)).toThrow();}
});
it('requires selected and hint JSON evidence during the offline visual recheck',()=>{const source=readFileSync('scripts/verifyExpansion200GateCoverage.mjs','utf8');expect(source).toContain("readFileSync(join(root,path+'.json'))");expect(source).toContain('verifyMixedInteractionState(state,envelope,kind)');expect(source).toContain('assert.deepEqual(proof.board,board)');expect(source).toContain('assert.equal(proof.saveSha256,prior.saveSha256');});
