import assert from 'node:assert/strict';
import {flatten} from '../gate/results.mjs';import {BUDGETS} from './scope.mjs';
export {flatten};
function exactRows(profile,cases,report){
 assert(Array.isArray(cases)&&cases.length>0);assert.deepEqual(report.errors??[],[]);const config=report.config;assert.equal(config.workers,1);assert.equal(config.fullyParallel,false);assert.equal(config.forbidOnly,true);assert.equal(config.maxFailures,1);
 const rows=flatten(report.suites);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'Duplicate test identity');assert.deepEqual(rows.map(r=>`${r.project}:${r.title}`).sort(),cases.map(([id,title])=>`${profile}:${id} ${title}`).sort(),'Missing or unexpected browser case');assert(rows.every(r=>r.expectedStatus==='passed'));return rows;
}
export function verifyProfile(profile,cases,report,events){
 const rows=exactRows(profile,cases,report);assert(rows.every(r=>r.status==='expected'&&r.results.length===1&&r.results[0].status==='passed'&&r.results[0].retry===0),'Skipped, retried, interrupted or failed case');assert.equal(report.stats?.unexpected,0);assert.equal(report.stats?.skipped,0);assert.equal(report.stats?.flaky,0);assert.equal(report.stats?.expected,rows.length);
 assert(Array.isArray(events));const begin=events.filter(e=>e.event==='begin'),end=events.filter(e=>e.event==='end');assert.equal(begin.length,1);assert.equal(end.length,1);assert.equal(end[0].status,'passed');if(Object.hasOwn(BUDGETS,profile))assert(Number.isFinite(end[0].durationMs)&&end[0].durationMs>=0&&end[0].durationMs<=BUDGETS[profile],'Terminal duration exceeds profile budget');assert.equal(events.filter(e=>e.event==='error').length,0);assert.equal(begin[0].workers,1);assert.equal(begin[0].maxFailures,1);assert.deepEqual(begin[0].retries,[0]);assert.deepEqual(begin[0].projects,[profile]);
 for(const name of ['test-begin','test-end']){const actual=events.filter(e=>e.event===name);assert.equal(actual.length,rows.length);assert.deepEqual(actual.map(e=>e.id).sort(),rows.map(r=>r.id).sort(),'Event identities mismatch');assert(actual.every(e=>e.retry===0&&e.project===profile));if(name==='test-end')assert(actual.every(e=>e.status==='passed'&&e.errors.length===0));}
 assert(events[0].event==='begin'&&events.at(-1).event==='end','Incomplete event chronology');return{profile,cases:rows.length,status:'passed'};
}
export function verifyCollection(scope,report){
 assert.deepEqual(report.errors??[],[]);const rows=flatten(report.suites);const expected=Object.entries(scope).flatMap(([profile,cases])=>cases.map(([id,title])=>`${profile}:${id} ${title}`)).sort();assert.deepEqual(rows.map(r=>`${r.project}:${r.title}`).sort(),expected);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);assert(rows.every(r=>r.expectedStatus==='passed'&&r.results.length===0));assert.equal(report.config.workers,1);assert.equal(report.config.fullyParallel,false);assert.equal(report.config.forbidOnly,true);assert.equal(report.config.maxFailures,1);return{kind:'collection-only',cases:rows.length};
}
