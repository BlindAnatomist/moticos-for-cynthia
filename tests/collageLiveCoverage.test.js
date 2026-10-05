import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { verify } from '../scripts/verifyCollageLiveCoverage.mjs';
const contract=JSON.parse(readFileSync('tests/verification/collage-live-coverage.json','utf8'));
const report=()=>({errors:[],stats:{expected:3,unexpected:0,flaky:0,skipped:0},suites:[{specs:contract.cases.map(item=>({...item,tests:[{projectName:item.project,expectedStatus:'passed',status:'expected',results:[{status:'passed',retry:0,errors:[]}]}]}))}]});
const event=(item,type)=>({...item,event:type,file:`/runner/${item.file}`,title:['',item.project,item.file,item.title],retry:0,...(type==='test-end'?{status:'passed',expectedStatus:'passed',errors:[]}:{})});
const events=()=>[{event:'begin',tests:3,workers:1,maxFailures:1,retries:[0],projects:contract.cases.map(item=>item.project)},...contract.cases.flatMap(item=>[event(item,'test-begin'),event(item,'test-end')]),{event:'end',status:'passed'}];
describe('three-case hosted smoke coverage',()=>{
 it('accepts exact complete zero-retry results',()=>expect(verify(contract,report(),events())).toMatchObject({uniqueCases:3,status:'passed'}));
 it('accepts the frozen collection independently of execution',()=>expect(verify(contract,report())).toEqual({collected:3}));
 it.each(['failed','skipped','interrupted','timedOut'])('rejects %s',status=>{const e=events();e[2].status=status;expect(()=>verify(contract,report(),e)).toThrow();});
 it('rejects a retry',()=>{const e=events();e[2].retry=1;expect(()=>verify(contract,report(),e)).toThrow();});
 it('rejects an unfinished case',()=>expect(()=>verify(contract,report(),events().filter((_,index)=>index!==2))).toThrow());
 it('rejects a missing run end',()=>expect(()=>verify(contract,report(),events().slice(0,-1))).toThrow());
 it('rejects extra or duplicate terminal results',()=>{const e=events();e.splice(3,0,e[2]);expect(()=>verify(contract,report(),e)).toThrow();});
 it('rejects a changed case identity',()=>{const r=report();r.suites[0].specs[0].title='changed';expect(()=>verify(contract,r,events())).toThrow();});
 it('rejects process success with JSON failure',()=>{const r=report();r.suites[0].specs[0].tests[0].results[0].status='failed';expect(()=>verify(contract,r,events())).toThrow();});
 it('rejects a fatal reporter error',()=>{const e=events();e.splice(1,0,{event:'error',message:'failure'});expect(()=>verify(contract,report(),e)).toThrow();});
});
