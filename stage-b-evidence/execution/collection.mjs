import assert from 'node:assert/strict';
import {flatten} from '../../gate/results.mjs';
import {CASES} from './policy.mjs';

// Playwright's spec ID identifies the source declaration, not its project
// instance. A shared spec in two projects legitimately has the same spec ID.
export function verifyCombinedCollection(report){
 assert.deepEqual(report.errors??[],[]);
 const config=report.config;
 assert.equal(config.workers,1);assert.equal(config.fullyParallel,false);
 assert.equal(config.forbidOnly,true);assert.equal(config.maxFailures,1);
 const rows=flatten(report.suites);
 const expected=Object.entries(CASES).flatMap(([project,cases])=>cases.map(([id,title])=>JSON.stringify([project,`${id} ${title}`]))).sort();
 assert.equal(rows.length,58,'Exactly 58 project instances required');
 assert.deepEqual(rows.map(r=>JSON.stringify([r.project,r.title])).sort(),expected,'Missing, duplicate or unexpected project/title coverage');
 assert(rows.every(r=>typeof r.id==='string'&&r.id.trim().length>0),'Each source spec needs an ID');
 assert.equal(new Set(rows.map(r=>JSON.stringify([r.project,r.id]))).size,rows.length,'Duplicate same-project spec identity');
 assert(rows.every(r=>r.expectedStatus==='passed'&&r.results.length===0),'Collection must not contain skipped declarations or executed results');
 return{kind:'collection-only',cases:rows.length,sourceSpecs:new Set(rows.map(r=>r.id)).size};
}
