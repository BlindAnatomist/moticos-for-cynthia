import {makePng} from './expansion160PngFixtures.js';
import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateContract, verifyPinnedCases, verifyCollection, verifyCompleted, verifyExports, verifyAggregate } from '../scripts/verifyExpansion160Coverage.mjs';
const contract = JSON.parse(readFileSync('tests/verification/expansion160-coverage-contract.json', 'utf8'));
const profile = 'webkit-iphone-13';
const cases = contract.cases.filter(test => test.project === profile);
const report = (items = cases, completed = false) => ({ errors: [], stats: {expected: 33, unexpected: 0, flaky: 0, skipped: 0}, suites: [{ specs: items.map(test => ({ id: test.id, title: test.title, file: test.file,
  tests: [{ projectName: test.project, expectedStatus: 'passed', status: completed ? 'expected' : 'skipped', results: completed ? [{ status: 'passed', retry: 0, errors: [] }] : [] }] })) }] });
const event = (test, type) => ({ ...test, event: type, file: `/runner/tests/expansion160-browser/${test.file}`, title: ['', test.project, test.file, test.title], retry: 0,
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
  const proofs = ['webkit-iphone-13','webkit-iphone-large','chromium-desktop'].map(name => ({status:'passed',profile:name,runCommit:'a'.repeat(40),sourceFingerprint:'d'.repeat(64),uniqueCases:33,retries:0,failed:0,skipped:0,exports:Array(48).fill({}),results:contract.cases.filter(test => test.project===name).map(test => event(test,'test-end'))}));
  expect(verifyAggregate(contract,proofs)).toMatchObject({uniqueCases:99,actualExports:144});
  expect(() => verifyAggregate(contract,proofs.slice(1))).toThrow();
  expect(() => verifyAggregate(contract,proofs.map((proof,index) => index ? proof : {...proof,runCommit:'b'.repeat(40)}))).toThrow();
 });
 it('requires all 48 distinct actual PNG exports with exact dimensions and identities', () => {
  const directory=mkdtempSync(join(tmpdir(),'moticos-exports-'));
  try {
   for (const [index,id] of contract.postcardIds.entries()) { const bytes=makePng(1536,1120,index);writeFileSync(join(directory,`${profile}-${id}-export.png`),bytes); }
   expect(verifyExports(contract,profile,directory)).toHaveLength(48);
   rmSync(join(directory,`${profile}-${contract.postcardIds[0]}-export.png`));expect(() => verifyExports(contract,profile,directory)).toThrow();
  } finally {rmSync(directory,{recursive:true,force:true});}
 });
});
