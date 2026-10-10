import test from 'node:test';import assert from 'node:assert/strict';
import {layoutOptionsForSurface} from './layout-mode.mjs';
import {layoutViolations} from '../../gate/layout.mjs';
import {E,fixture} from './fixtures.mjs';

const options=(width,largeText)=>layoutOptionsForSurface({width,compact:width<=650,largeText,renderedLargeText:largeText});
test('active and completed careers select all four explicit phone/desktop text modes',()=>{
  for(const name of ['occupied-active','occupied-complete'])for(const width of [320,390,430,650,651,1366])for(const enabled of [false,true]){
    const before=fixture(name),result=E.reduceCareer(before,E.commandFor(before,{type:'large-text',enabled}));assert(result.ok);
    const state=result.state;assert.equal(state.largeText,enabled);
    assert.deepEqual(options(width,state.largeText),{mode:enabled?'large-text':width<=650?'standard-phone':'desktop'});
    for(const key of ['board','xp','coinsEarned','coinsSpent','milestones'])assert.deepEqual(state[key],before[key]);
  }
});
test('desktop large-text allows explicit vertical scrolling while standard mode rejects it',()=>{
  const proof={width:1366,height:768,scrollWidth:1366,scrollHeight:1028,scrollY:40,largeText:true,modal:false,bounds:{},controls:[{label:'reachable control',box:{x:20,y:850,width:44,height:44,right:64,bottom:894}}]};
  assert.deepEqual(layoutViolations(proof,options(1366,true)),[]);
  assert(layoutViolations({...proof,largeText:false},options(1366,false)).includes('standard play requires page scrolling'));
  assert(layoutViolations({...proof,width:390,scrollWidth:390,largeText:false},options(390,false)).includes('standard play requires page scrolling'));
  assert(layoutViolations({...proof,largeText:false},{mode:'large-text'}).includes('large-text exception must be explicitly selected'));
});
test('large-text still rejects horizontal overflow and small accessible controls',()=>{
  for(const width of [320,1366]){
    const proof={width,height:768,scrollWidth:width,scrollHeight:1028,scrollY:20,largeText:true,modal:false,bounds:{},controls:[{label:'control',box:{width:44,height:44}}]};
    assert(layoutViolations({...proof,scrollWidth:width+2},options(width,true)).includes('horizontal page overflow'));
    assert(layoutViolations({...proof,controls:[{label:'control',box:{width:43,height:44}}]},options(width,true)).includes('small accessible target: control'));
  }
});
test('unknown viewport and inconsistent saved/rendered modes cannot gain a scroll exception',()=>{
  const base={width:1366,compact:false,largeText:false,renderedLargeText:false};
  for(const delta of [{width:NaN},{width:0},{compact:true},{largeText:true},{renderedLargeText:true},{largeText:undefined}])assert.throws(()=>layoutOptionsForSurface({...base,...delta}));
});
