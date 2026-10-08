import test from 'node:test';
import assert from 'node:assert/strict';
import {compactSurface} from '../../gate/responsive-surface.mjs';

test('surface classification waits for rendering after reload for mobile and desktop',async()=>{
 for(const mobile of[true,false]){
  let release,ready=false,evaluated=false;
  const rendered=new Promise(resolve=>release=()=>{ready=true;resolve();});
  const page={locator(selector){assert.equal(selector,'.career-mobile-hud:visible, .career-progress:visible');return{
   async waitFor(options){assert.deepEqual(options,{state:'visible'});await rendered;},
   async evaluate(fn){assert(ready);evaluated=true;return fn({matches:selector=>{assert.equal(selector,'.career-mobile-hud');return mobile;}});}
  };}};
  const result=compactSurface(page);await Promise.resolve();assert.equal(evaluated,false);release();assert.equal(await result,mobile);
 }
});
test('missing or ambiguous rendered surface fails instead of selecting desktop',async()=>{
 const error=new Error('surface unavailable');let evaluated=false;
 await assert.rejects(compactSurface({locator(){return{waitFor:async()=>{throw error;},evaluate:()=>{evaluated=true;}};}}),error);
 assert.equal(evaluated,false);
});
