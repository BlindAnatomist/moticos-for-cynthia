import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {expect} from '@playwright/test';
import * as base from '../../tests/campaign-browser/helpers.mjs';
import {STORAGE_KEY} from '../../src/career/content.js';
import {preparedIdentity} from '../execution/binding.mjs';
import {SCREENSHOTS} from './scope.mjs';
import {action,moveAction} from './fixtures.mjs';
export {base};
export const cell=(page,index)=>page.locator(`[data-career-cell="${index}"]`);
const data=new WeakMap();
export async function instrument(context){
 await base.instrumentation(context);const journal={writes:[],events:[],steps:[],observations:[],screenshots:[]};data.set(context,journal);
 await context.exposeBinding('__stageEWrite',(_,r)=>{assert(journal.writes.length<2048);journal.writes.push(r);});
 await context.exposeBinding('__stageEEvent',(_,r)=>{assert(journal.events.length<8192);journal.events.push(r);});
 await context.addInitScript(({key})=>{
  window.__stageEAcks=[];const send=(name,row)=>window.__stageEAcks.push(window[name](row));
  const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const out=original.call(this,k,v);if(this===localStorage&&k===key)send('__stageEWrite',{fixture:Boolean(window.__fixtureWrite),revision:JSON.parse(v).revision,bytes:v,url:location.href});return out;};
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','click','dragstart','dragover','drop','dragend','keydown'])document.addEventListener(type,event=>{const el=event.target.closest?.('[data-career-cell]');if(el||type==='keydown')send('__stageEEvent',{type,isTrusted:event.isTrusted,pointerType:event.pointerType??null,pointerId:event.pointerId??null,isPrimary:event.isPrimary??null,detail:event.detail??null,key:event.key??null,cell:el?.dataset.careerCell??null,x:event.clientX??null,y:event.clientY??null,time:performance.now(),wallTime:Date.now()});},true);
 },{key:STORAGE_KEY});
}
export async function flush(page){await page.evaluate(async()=>Promise.all(window.__stageEAcks??[]));}
export async function checkpoint(page){await flush(page);return data.get(page.context()).writes.length;}
export async function writes(page,start){await flush(page);return data.get(page.context()).writes.slice(start).filter(r=>!r.fixture);}
export async function unchanged(page,before,start){await frames(page,3);expect(await base.read(page)).toEqual(before);expect(await writes(page,start),'Cancelled/view-only action writes nothing').toEqual([]);await expect(page.locator('.career-drag-ghost')).toHaveCount(0);}
export async function accepted(page,before,input,start){const expected=action(before,input);await expect.poll(()=>base.read(page)).toEqual(expected);await expect(page.locator('.career-shell')).toHaveAttribute('data-save-status','saved');await expect(cell(page,0)).toBeEnabled();await frames(page,3);const rows=await writes(page,start);expect(rows,'Accepted action emits exactly one durable save').toHaveLength(1);expect(JSON.parse(rows[0].bytes)).toEqual(expected);expect(expected.revision).toBe(before.revision+1);await expect(page.locator('.career-drag-ghost')).toHaveCount(0);return expected;}
export async function seed(page,state){await base.seed(page,state);await expect.poll(()=>base.read(page)).toEqual(state);await frames(page,2);}
export async function frames(page,n=2){await page.evaluate(n=>new Promise(resolve=>{function frame(){if(--n<=0)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}),n);}
export async function point(page,index,{reveal=true}={}){if(reveal)await cell(page,index).scrollIntoViewIfNeeded();const r=await cell(page,index).boundingBox();expect(r).toBeTruthy();return{x:r.x+r.width/2,y:r.y+r.height/2};}
export function note(page,label,value){data.get(page.context()).observations.push({label,value});}
export async function step(page,label,body){const j=data.get(page.context()),start=j.events.length;const result=await body();await flush(page);j.steps.push({label,eventStart:start,eventEnd:j.events.length});return result;}
export async function shot(page,info,name){expect(SCREENSHOTS[info.project.name]).toContain(name);await page.locator('.career-shell img:visible').evaluateAll(async images=>Promise.all(images.map(img=>img.decode())));await frames(page);fs.mkdirSync(info.outputDir,{recursive:true});const path=info.outputPath(name);await page.screenshot({path,fullPage:false});const b=fs.readFileSync(path);data.get(page.context()).screenshots.push({name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),dimensions:[b.readUInt32BE(16),b.readUInt32BE(20)],...preparedIdentity()});}
export async function finish(page,info,error=null){await flush(page).catch(()=>{});const j=data.get(page.context());fs.mkdirSync(info.outputDir,{recursive:true});const proof={testId:info.testId,testTitle:info.title,caseId:info.title.split(' ')[0],title:info.title,project:info.project.name,...preparedIdentity(),scope:info.project.name.endsWith('chromium')?'Chromium CDP trusted touch, native mouse and keyboard; emulation is not a physical iPhone.':'WebKit native mouse/tap/keyboard plus explicitly synthetic PointerEvent handlers with capture shim; no native WebKit continuous touch gesture claim.',...j,error:error?String(error.stack??error).slice(0,16384):null};const proofBytes=Buffer.from(JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(info.outputPath('proof.json'),proofBytes,{flag:'wx'});await info.attach('proof-reference',{body:Buffer.from(JSON.stringify({file:'proof.json',caseId:proof.caseId,...preparedIdentity(),bytes:proofBytes.length,sha256:createHash('sha256').update(proofBytes).digest('hex')})),contentType:'application/json'});if(error){const marker='stage-e-browser-results/failure-captured.json';try{fs.writeFileSync(marker,JSON.stringify({project:info.project.name,case:proof.caseId}),{flag:'wx'});await page.screenshot({path:info.outputPath('failure.png'),fullPage:false,timeout:5000});}catch{} }return proof;}
export function events(page){return data.get(page.context()).events;}
export async function requireTrusted(page,type,pointerType=null){await flush(page);expect(events(page).some(e=>e.type===type&&e.isTrusted&&(pointerType===null||e.pointerType===pointerType)),`Observed trusted ${pointerType??''} ${type}`).toBe(true);}
export async function driver(page,info){
 if(info.project.name.endsWith('chromium')){
  const cdp=await page.context().newCDPSession(page);let points=[];
  async function send(type){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:3,radiusY:3,force:1})),modifiers:0});await frames(page);}
  return{kind:'trusted-chromium-cdp-touch',async down(p){points=[{...p,id:1}];await send('touchStart');},async move(p){points=[{...p,id:1}];await send('touchMove');},async up(){points=[];await send('touchEnd');},async cancel(){points=[];await send('touchCancel');},async second(p){points.push({...p,id:2});await send('touchStart');},async endAll(){points=[];await send('touchEnd');},async close(){await cdp.detach();}};
 }
 let source=null;
 return{kind:'synthetic-webkit-pointer-handler-with-capture-shim',async down(p){source=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y).closest('[data-career-cell]');if(!el)throw Error('No synthetic source');window.__stageESynthetic={el,captured:false,p:{x,y}};el.setPointerCapture=()=>window.__stageESynthetic.captured=true;el.hasPointerCapture=()=>window.__stageESynthetic.captured;el.releasePointerCapture=()=>window.__stageESynthetic.captured=false;el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:71,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:x,clientY:y}));return el.dataset.careerCell;},p);await frames(page);},async move(p){await synthetic('pointermove',p);},async up(){await synthetic('pointerup');await clean();},async cancel(){await synthetic('pointercancel');await clean();},async second(p){await synthetic('pointerdown',p,72,false);},async endAll(){await synthetic('pointerup');await clean();},async close(){await clean();}};
 async function synthetic(type,p=null,id=71,primary=true){await page.evaluate(({type,p,id,primary})=>{const ctx=window.__stageESynthetic;if(!ctx)return;if(p)ctx.p=p;const at=ctx.p??{x:0,y:0};ctx.el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:primary,button:0,buttons:type==='pointerup'?0:1,clientX:at.x,clientY:at.y}));},{type,p,id,primary});await frames(page);}
 async function clean(){await page.evaluate(()=>{const ctx=window.__stageESynthetic;if(ctx){delete ctx.el.setPointerCapture;delete ctx.el.hasPointerCapture;delete ctx.el.releasePointerCapture;delete window.__stageESynthetic;}});}
}
export async function glide(input,from,to,steps=6){await input.down(from);for(let i=1;i<=steps;i++)await input.move({x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps});}
export async function mouseDrag(page,from,to){const a=await point(page,from),b=await point(page,to);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x+10,a.y+1,{steps:3});await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.move(b.x,b.y);await page.mouse.up();}
export {moveAction};
