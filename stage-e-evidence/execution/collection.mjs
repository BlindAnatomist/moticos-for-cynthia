import assert from 'node:assert/strict';
import {flatten} from '../../gate/results.mjs';
import {CASES,ORDER} from './policy.mjs';
export function verifyCollection(report){
 assert.deepEqual(report.errors??[],[]);const c=report.config;
 for(const[k,v]of Object.entries({workers:1,fullyParallel:false,forbidOnly:true,maxFailures:1}))assert.equal(c[k],v);
 const rows=flatten(report.suites),expected=ORDER.flatMap(p=>CASES[p].map(([id,title])=>JSON.stringify([p,`${id} ${title}`]))).sort();
 assert.equal(rows.length,16,'Exactly sixteen focused instances required');assert.deepEqual(rows.map(r=>JSON.stringify([r.project,r.title])).sort(),expected);
 assert(rows.every(r=>typeof r.id==='string'&&r.id.length>0&&r.expectedStatus==='passed'&&r.results.length===0),'Skipped declarations or executed collection');
 assert.equal(new Set(rows.map(r=>JSON.stringify([r.project,r.id]))).size,16);assert.equal(new Set(rows.map(r=>r.id)).size,16,'Every project instance needs its own identity');
 const declarations=rows.map(r=>JSON.stringify([r.file,r.line,r.title]));assert.equal(new Set(declarations).size,8,'Exactly eight shared file/line/title declarations required');assert(rows.every(r=>r.file==='touch-drag.spec.mjs'&&Number.isSafeInteger(r.line)&&r.line>0));
 assert.deepEqual(c.projects.map(p=>p.name),ORDER);for(const p of c.projects){assert.equal(p.retries,0);assert.equal(p.repeatEach,1);}
 return{kind:'collection-only',cases:16,sourceSpecs:8};
}
