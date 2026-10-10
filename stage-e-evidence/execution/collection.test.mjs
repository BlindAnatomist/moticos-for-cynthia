import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCollection} from './collection.mjs';
import {ORDER,CASES} from './policy.mjs';
function report(){return{errors:[],config:{workers:1,fullyParallel:false,forbidOnly:true,maxFailures:1,projects:ORDER.map(name=>({name,retries:0,repeatEach:1}))},suites:ORDER.map(project=>({specs:CASES[project].map(([id,title],i)=>({id:project+'-'+id,title:id+' '+title,file:'touch-drag.spec.mjs',line:i+1,tests:[{projectName:project,expectedStatus:'passed',results:[]}]}))}))};}
test('collection accepts sixteen project-specific IDs over eight shared declarations without launching',()=>{assert.deepEqual(verifyCollection(report()),{kind:'collection-only',cases:16,sourceSpecs:8});});
test('collection rejects omitted duplicate filtered retried executed and mismatched declarations',()=>{for(const change of [r=>r.suites.pop(),r=>r.suites[1].specs[0].id=r.suites[0].specs[0].id,r=>r.suites[1].specs[0].line=999,r=>r.suites[0].specs[0].file='other.spec.mjs',r=>r.suites[0].specs[0].tests[0].results.push({status:'passed'}),r=>r.config.projects[0].retries=1,r=>r.config.workers=2]){const r=report();change(r);assert.throws(()=>verifyCollection(r));}});
