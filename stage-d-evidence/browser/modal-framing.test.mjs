// Synthetic geometry/page fixtures only. No browser launch or screenshot.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {planModalFraming,verifyModalFraming,scrollModalForCapture,frameModalTargets} from './modal-framing.mjs';
import {inspectCaptureGeometry,inspectModalCaptureGeometry} from './capture-geometry.mjs';
const rect=(left,top,right,bottom)=>({left,top,right,bottom});
function fixture(width=390,height=664){return{viewport:{width,height,dpr:3},modal:{selector:'.career-dialog',scrollTop:100,scrollHeight:2678,clientHeight:height-22,scrollport:rect(20,11,width-20,height-11),targets:[{selector:'.card1',rect:rect(36,200,(width-10)/2,390)},{selector:'.card2',rect:rect((width+10)/2,200,width-36,390)}]}};}
function applyPlan(modal,plan){const after=structuredClone(modal),actual=Math.floor(plan.scrollTop),delta=actual-modal.scrollTop;after.scrollTop=actual;for(const target of after.targets){target.rect.top-=delta;target.rect.bottom-=delta;}return after;}

test('reported WebKit 1/32px edge clipping is rejected, then ordinary scrolling gives a real inset',()=>{
 // Failure image has art y472.03125; known 9px card inset and 190px
 // card height imply bottom653.03125. This is a reconstructed regression
 // fixture, not a claimed missing native last-page geometry observation.
 const {modal,viewport}=fixture();modal.scrollTop=1951;for(const t of modal.targets){t.rect.top=463.03125;t.rect.bottom=653.03125;}
 assert.throws(()=>verifyModalFraming(modal,viewport),/bottom inset/);
 const plan=planModalFraming(modal,viewport);assert.equal(plan.scrollTop,2036);assert(plan.requestedScrollTop>plan.maxScrollTop);
 const after=applyPlan(modal,plan);assert.equal(verifyModalFraming(after,viewport),true);assert(after.targets[0].rect.bottom<=645);
});

test('first/last D06 card pairs and D11 first-source/footer unions fit across phone and desktop viewports',()=>{
 for(const [width,height] of [[390,664],[1366,768],[320,568]])for(const scenario of ['D06-first','D06-last','D11-first','D11-last']){
  const {modal,viewport}=fixture(width,height),top=modal.scrollport.top,bottom=modal.scrollport.bottom;
  if(scenario==='D06-first'){modal.scrollTop=589;for(const t of modal.targets){t.rect.top=top+.03125;t.rect.bottom=top+190.03125;}}
  if(scenario==='D06-last'){modal.scrollTop=1900;for(const t of modal.targets){t.rect.top=bottom-189.96875;t.rect.bottom=bottom+.03125;}}
  if(scenario==='D11-first'){modal.scrollTop=0;modal.targets=modal.targets.slice(0,1);modal.targets[0].rect.top=210;modal.targets[0].rect.bottom=331;}
  if(scenario==='D11-last'){modal.scrollHeight=4545;modal.scrollTop=modal.scrollHeight-modal.clientHeight;modal.targets=[{selector:'.last-source',rect:rect(36,bottom-218,width-36,bottom-97)},{selector:'.back',rect:rect(36,bottom-66,width-36,bottom-22)}];}
  const plan=planModalFraming(modal,viewport),after=applyPlan(modal,plan);assert.equal(verifyModalFraming(after,viewport),true,`${width}x${height} ${scenario}`);
 }
});

test('recorded Chromium D11 last source and Back stay fully inset when center scrolling reaches the legal end',()=>{
 const viewport={width:1366,height:768},modal={selector:'.career-dialog',scrollTop:3819,scrollHeight:4545,clientHeight:726,scrollport:rect(329,21,1037,747),targets:[{selector:'.last-source',rect:rect(847,528.984375,999,649.984375)},{selector:'.back',rect:rect(354,680.984375,481.375,724.984375)}]};
 const plan=planModalFraming(modal,viewport);assert.equal(plan.scrollTop,3819);assert.equal(verifyModalFraming(applyPlan(modal,plan),viewport),true);
});

test('planner intersects modal scrollport with actual viewport and clamps both legal scroll limits',()=>{
 const {modal,viewport}=fixture();modal.scrollport.top=-20;modal.scrollport.bottom=700;modal.clientHeight=720;
 const plan=planModalFraming(modal,viewport);assert.equal(plan.visible.top,0);assert.equal(plan.visible.bottom,664);
 modal.scrollTop=0;for(const t of modal.targets){t.rect.top=25;t.rect.bottom=215;}assert.equal(planModalFraming(modal,viewport).scrollTop,0);
 modal.scrollTop=modal.scrollHeight-modal.clientHeight;for(const t of modal.targets){t.rect.top=400;t.rect.bottom=590;}assert.equal(planModalFraming(modal,viewport).scrollTop,modal.scrollTop);
});

test('oversized, unreachable, nonfinite, duplicate and horizontally clipped targets fail rather than relax visibility',()=>{
 const base=fixture();for(const mutate of [m=>m.targets[0].rect.bottom=1000,m=>m.targets[0].rect.left=19,m=>m.targets[0].rect.top=NaN,m=>m.targets.push(structuredClone(m.targets[0])),m=>m.scrollHeight=Infinity]){const m=structuredClone(base.modal);mutate(m);assert.throws(()=>planModalFraming(m,base.viewport));}
 const impossible=fixture();impossible.modal.scrollTop=0;for(const t of impossible.modal.targets){t.rect.top=11;t.rect.bottom=201;}const plan=planModalFraming(impossible.modal,impossible.viewport);assert.equal(plan.scrollTop,0);assert.throws(()=>verifyModalFraming(applyPlan(impossible.modal,plan),impossible.viewport),/top inset/);
});

test('browser scroll primitive calls only ordinary instant scroll and two animation frames',async()=>{
 const calls=[],dialog={scrollTo(options){calls.push(JSON.parse(JSON.stringify(options)));}};
 const context={document:{querySelectorAll:()=>[dialog]},requestAnimationFrame:fn=>{calls.push('frame');fn();},options:{selector:'.career-dialog',scrollTop:432.25}};
 await vm.runInNewContext(`(${scrollModalForCapture.toString()})(options)`,context);assert.deepEqual(calls,[{top:432.25,behavior:'instant'},'frame','frame']);
 context.document.querySelectorAll=()=>[];await assert.rejects(vm.runInNewContext(`(${scrollModalForCapture.toString()})(options)`,context),/exactly one modal/);
});

async function temporary(fn){const root=fs.mkdtempSync(join(os.tmpdir(),'moticos-modal-framing-'));try{return await fn(join(root,'D06-page-last.png'));}finally{fs.rmSync(root,{recursive:true,force:true});}}
function pageFixture(start,{ignoreScroll=false}={}){let current=structuredClone(start);const calls=[];return{calls,evaluate:async(fn,options)=>{calls.push(fn.name);if(fn===inspectCaptureGeometry)return{viewport:current.viewport};if(fn===inspectModalCaptureGeometry)return structuredClone(current.modal);if(fn===scrollModalForCapture){if(!ignoreScroll)current.modal=applyPlan(current.modal,{scrollTop:options.scrollTop});return;}throw Error('Unexpected page call');}};}

test('actual geometry is written before the caller strict IO assertion, with no screenshot or retries',async()=>temporary(async path=>{
 const initial=fixture(),page=pageFixture(initial),modal={selector:'.career-dialog',targets:['.card1','.card2']};
 const result=await frameModalTargets(page,path,modal);assert.deepEqual(JSON.parse(fs.readFileSync(path+'.framing.json')),result);
 assert.deepEqual(page.calls,['inspectCaptureGeometry','inspectModalCaptureGeometry','scrollModalForCapture','inspectCaptureGeometry','inspectModalCaptureGeometry']);
 assert.equal(verifyModalFraming(result.after.modal,result.after.viewport),true);
 await assert.rejects(frameModalTargets(page,path,modal),/cannot be replaced/);
}));

test('failed inset retains actual uncorrected rectangles and does not retry or hide the assertion',async()=>temporary(async path=>{
 const initial=fixture();for(const t of initial.modal.targets){t.rect.top=463.03125;t.rect.bottom=653.03125;}
 const page=pageFixture(initial,{ignoreScroll:true});await assert.rejects(frameModalTargets(page,path,{selector:'.career-dialog',targets:['.card1','.card2']}),/bottom inset/);
 const result=JSON.parse(fs.readFileSync(path+'.framing.json'));assert.deepEqual(result.after,initial);assert.equal(page.calls.filter(c=>c==='scrollModalForCapture').length,1);
}));

test('D06 integration retains exact viewport ratio and full names after inset framing',()=>{
 const source=fs.readFileSync(new URL('./late.spec.mjs',import.meta.url),'utf8'),d06=source.split("scenario(title('D06')")[1].split('const boardIds=')[0];
 assert(d06.includes('await h.frameModalTargets('));assert(d06.includes('toBeInViewport({ratio:1})'));assert(d06.includes("toHaveText(piece.name)"));assert(!d06.includes('scrollIntoView('));
});

test('planning and scrolling failures retain available geometry without replacing the original error or browser retries',async()=>{
 await temporary(async path=>{const initial=fixture();initial.modal.targets[0].rect.bottom=1000;const page=pageFixture(initial);await assert.rejects(frameModalTargets(page,path,{selector:'.career-dialog',targets:['.card1','.card2']}),/cannot fit/);const evidence=JSON.parse(fs.readFileSync(path+'.framing.json'));assert.deepEqual(evidence.before,initial);assert.equal(evidence.failure.phase,'planning');assert(!evidence.after);assert.equal(page.calls.length,2);});
 await temporary(async path=>{const initial=fixture(),page=pageFixture(initial),evaluate=page.evaluate,original=Error('Native scroll failed');page.evaluate=async(fn,options)=>{if(fn===scrollModalForCapture)throw original;return evaluate(fn,options);};await assert.rejects(frameModalTargets(page,path,{selector:'.career-dialog',targets:['.card1','.card2']}),error=>error===original);const evidence=JSON.parse(fs.readFileSync(path+'.framing.json'));assert.deepEqual(evidence.before,initial);assert.equal(evidence.failure.phase,'scrolling');assert(evidence.plan);assert(!evidence.after);assert.equal(page.calls.length,2);});
});
