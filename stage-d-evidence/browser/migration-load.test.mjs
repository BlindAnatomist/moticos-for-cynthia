import test from 'node:test';
import assert from 'node:assert/strict';
import {reloadForMigration} from './migration-load.mjs';
import {E,fixture} from './fixtures.mjs';

test('first legacy load waits for v8 instead of demanding unchanged v7 bytes',async()=>{
  const old=fixture('v7-completed'),original=structuredClone(old),expected=E.upgradeCareer(old),events=[];
  let saved=old;
  const page={async reload(){events.push('reload');saved=expected;}};
  const actual=await reloadForMigration(page,old,{
    async wait(p,target){assert.equal(p,page);events.push('wait');assert.equal(target.schemaVersion,8);assert.deepEqual(target,expected);},
    async read(p){assert.equal(p,page);events.push('read');return saved;}
  });
  assert.deepEqual(events,['reload','wait','read']);assert.deepEqual(actual,expected);assert.deepEqual(old,original);
});
test('every historical migration target is the real upgrade with its preserved economy',async()=>{
  for(const name of ['v5-endpoint','v6-conservative','v7-purchased']){
    const old=fixture(name),expected=E.upgradeCareer(old);let reloaded=false;
    const actual=await reloadForMigration({async reload(){reloaded=true;}},old,{
      async wait(_,target){assert(reloaded);assert.deepEqual(target,expected);},async read(){return structuredClone(expected);}
    });
    for(const key of ['board','xp','coinsEarned','coinsSpent','purchases','milestones','chapterEntryVersions'])assert.deepEqual(actual[key],expected[key]);
  }
});
test('unchanged legacy state and a corrupted migrated state fail the complete-state assertion',async()=>{
  const old=fixture('v7-completed'),expected=E.upgradeCareer(old),page={async reload(){}};
  for(const wrong of [old,{...expected,xp:expected.xp+1}])await assert.rejects(reloadForMigration(page,old,{async wait(){},async read(){return wrong;}}),/exact current reducer result/);
});
test('failed navigation or persistence wait cannot yield a migration pass',async()=>{
  const old=fixture('v7-completed');let reads=0;
  await assert.rejects(reloadForMigration({async reload(){throw Error('reload blocked');}},old),/reload blocked/);
  await assert.rejects(reloadForMigration({async reload(){}},old,{async wait(){throw Error('not saved');},async read(){reads++;}}),/not saved/);
  assert.equal(reads,0);
});
test('a delayed persistence acknowledgement is awaited before reading full migrated state',async()=>{
  const old=fixture('v7-completed'),expected=E.upgradeCareer(old);let saved=old,reads=0,release,waiting;
  const gate=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{waiting=resolve;});
  const pending=reloadForMigration({async reload(){}},old,{
    async wait(_,target){assert.deepEqual(target,expected);waiting();await gate;},
    async read(){reads++;return saved;}
  });
  await started;assert.equal(reads,0);saved=expected;release();
  assert.deepEqual(await pending,expected);assert.equal(reads,1);
});
