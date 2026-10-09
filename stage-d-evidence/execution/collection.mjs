import assert from 'node:assert/strict';
import {flatten} from '../../gate/results.mjs';
import {CASES,ORDER} from './policy.mjs';
export function verifyCollection(report) {
  assert.deepEqual(report.errors??[],[]);const c=report.config;
  assert.equal(c.workers,1);assert.equal(c.fullyParallel,false);assert.equal(c.forbidOnly,true);assert.equal(c.maxFailures,1);
  const rows=flatten(report.suites),expected=ORDER.flatMap(p=>CASES[p].map(([id,title])=>JSON.stringify([p,`${id} ${title}`]))).sort();
  assert.equal(rows.length,22,'Exactly 22 Stage D instances required');
  assert.deepEqual(rows.map(r=>JSON.stringify([r.project,r.title])).sort(),expected,'Changed 320 inventory');
  assert(rows.every(r=>typeof r.id==='string'&&r.id.length>0&&r.expectedStatus==='passed'&&r.results.length===0),'Skipped declarations or executed collection');
  assert.equal(new Set(rows.map(r=>JSON.stringify([r.project,r.id]))).size,22,'Duplicate per-profile declaration');
  assert.equal(new Set(rows.map(r=>r.id)).size,11,'Exactly eleven shared source declarations required');
  for(const p of c.projects??[]){assert.equal(p.retries,0);assert.equal(p.repeatEach,1);}
  return {kind:'collection-only',cases:22,sourceSpecs:11};
}
