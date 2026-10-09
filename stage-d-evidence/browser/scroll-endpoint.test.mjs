// Synthetic synchronization fixtures only; no browser is started here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {scrollSnapshotReady,reachScrollEndpoint} from './scroll-endpoint.mjs';

const state=(offset,maximum=176,width=372)=>({offset,maximum,width,leftDisabled:!(offset>1),rightDisabled:!(offset<maximum-1)});
function fixture(initial,targets,{delayEdge=false}={}) {
  let current=initial,activations=0,rejectedSamples=0;
  const observations=[];
  return {
    counts:()=>({activations,rejectedSamples}),observations,
    async activate(){
      activations++;
      assert(targets.length>0,'An extra activation was requested at an already-reached endpoint');
      const next=targets.shift();
      current=delayEdge?{...next,leftDisabled:current.leftDisabled,rightDisabled:current.rightDisabled}:next;
      observations.push(current);
      if(delayEdge)observations.push(next);
    },
    async settle(options){
      // Model delayed geometry/ARIA observations with a bounded sample queue.
      for(let samples=0;samples<10;samples++){
        const snapshot=observations.shift()??current;
        if(scrollSnapshotReady(snapshot,snapshot,options)){current=snapshot;return snapshot;}
        rejectedSamples++;
      }
      throw Error('Observable scroll state did not settle');
    },
  };
}

test('delayed left-edge disabled state is awaited after one native action, without an extra tap',async()=>{
  const driver=fixture(state(176),[state(0)],{delayEdge:true});
  const result=await reachScrollEndpoint(driver,-1);
  assert.equal(result.presses,1);assert.equal(result.offset,0);
  assert.deepEqual(result.steps,[{before:176,after:0,clampedTarget:0}]);
  assert.deepEqual(driver.counts(),{activations:1,rejectedSamples:1});
});

test('an already-reached endpoint only waits for matching ARIA state and never activates',async()=>{
  const driver=fixture(state(0),[]);
  driver.observations.push({...state(0),leftDisabled:false},state(0));
  assert.deepEqual(await reachScrollEndpoint(driver,-1),{presses:0,offset:0,steps:[]});
  assert.deepEqual(driver.counts(),{activations:0,rejectedSamples:1});
});

test('fractional intermediate coordinates are retained exactly while both endpoints remain exact',async()=>{
  const right=fixture(state(0,246,302),[state(211.375,246,302),state(246,246,302)],{delayEdge:true});
  const outward=await reachScrollEndpoint(right,1);assert.equal(outward.presses,2);assert.equal(outward.offset,246);
  assert.deepEqual(outward.steps,[{before:0,after:211.375,clampedTarget:null},{before:211.375,after:246,clampedTarget:246}]);
  const left=fixture(state(246,246,302),[state(34.625,246,302),state(0,246,302)],{delayEdge:true});
  const home=await reachScrollEndpoint(left,-1);assert.equal(home.presses,2);assert.equal(home.offset,0);
  assert.equal(home.steps[0].after,34.625);assert.equal(home.steps[1].clampedTarget,0);
});

test('unchanged offsets, changing observations, wrong edge state and wrong clamped destinations do not settle',()=>{
  const current=state(100),options={direction:-1,previous:100,target:0};
  assert.equal(scrollSnapshotReady(current,current,options),false);
  assert.equal(scrollSnapshotReady(state(50),state(0),options),false);
  assert.equal(scrollSnapshotReady({...state(0),leftDisabled:false},{...state(0),leftDisabled:false},options),false);
  assert.equal(scrollSnapshotReady(state(1),state(1),options),false);
  assert.equal(scrollSnapshotReady(state(0),state(0),options),true);
});

test('the five-action ceiling and fixed board geometry remain hard failures',async()=>{
  const slow=fixture(state(0,1000,10),[1,2,3,4,5,6].map(x=>state(x,1000,10)));
  await assert.rejects(reachScrollEndpoint(slow,1),/within five native activations/);
  assert.equal(slow.counts().activations,5);
  const changed=fixture(state(0),[state(176,176,371)]);
  await assert.rejects(reachScrollEndpoint(changed,1));
});


test('subpixel near-edge ARIA is legitimate but never substitutes for an exact commanded endpoint',async()=>{
  for(const [offset,direction] of [[.5,-1],[175.5,1]]){
    const near={...state(offset),leftDisabled:!(offset>1),rightDisabled:!(offset<175)};
    assert.equal(scrollSnapshotReady(near,near,{direction}),true);
    assert.equal(scrollSnapshotReady(near,near,{direction,target:direction<0?0:176}),false);
    const driver=fixture(near,[]);
    await assert.rejects(reachScrollEndpoint(driver,direction),/disabled before the exact endpoint/);
    assert.equal(driver.counts().activations,0);
  }
});
