import test from 'node:test';import assert from 'node:assert/strict';
import {parseProcessStat,processGroupSnapshot} from './process-diagnostics.mjs';
test('diagnostics retain PID parent group and state without process arguments',()=>{
  assert.deepEqual(parseProcessStat('123 (worker (x)) Z 1 120 0 0'),{pid:123,ppid:1,pgid:120,state:'Z'});
  for(const bad of ['bad','1 (x) R 0 nope','-1 (x) S 1 1'])assert.throws(()=>parseProcessStat(bad));
});
test('snapshot distinguishes visible live and zombie members of exact group',()=>{
  const rows={'1':'1 (init) S 0 1','8':'8 (node) R 1 8','9':'9 (child) Z 1 8'};
  const result=processGroupSnapshot(8,{now:()=>0,operations:{readdirSync:()=>['self',...Object.keys(rows)],readFileSync:path=>rows[path.split('/')[2]]}});
  assert.equal(result.status,'complete');assert.deepEqual(result.members.map(r=>[r.pid,r.ppid,r.pgid,r.state]),[[8,1,8,'R'],[9,1,8,'Z']]);
});
test('snapshot has strict row and time limits and reports partial visibility',()=>{
  const operations={readdirSync:()=>Array.from({length:50},(_,i)=>String(i+1)),readFileSync:path=>`${path.split('/')[2]} (node) S 0 2`};
  const limited=processGroupSnapshot(2,{operations,now:()=>0});assert.equal(limited.status,'truncated');assert.equal(limited.members.length,32);
  let time=0;const timed=processGroupSnapshot(2,{operations,now:()=>time+=101});assert.equal(timed.status,'truncated');assert.equal(timed.examined,0);
  const unavailable=processGroupSnapshot(2,{operations:{readdirSync(){throw Object.assign(Error('no proc'),{code:'ENOENT'});}}});assert.equal(unavailable.status,'unavailable');
  const vanished=processGroupSnapshot(2,{now:()=>0,operations:{readdirSync:()=>['1'],readFileSync(){throw Object.assign(Error('gone'),{code:'ENOENT'});}}});assert.equal(vanished.vanished,1);assert.deepEqual(vanished.members,[]);
});
