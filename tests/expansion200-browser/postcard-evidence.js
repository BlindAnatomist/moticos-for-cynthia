import {renderedArt} from './rendered-art.js';
import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {POSTCARD_VIEWPORTS,verifyPostcardState,verifyMixedInteractionState} from '../../scripts/expansion200PostcardEvidence.mjs';
import {readyScreenshot,imagesReady} from './shared-helpers.js';
export async function postcardState(page){return page.evaluate(()=>{
 const d=document.querySelector('.cg-dialog-postcard'),img=d?.querySelector('.cg-postcard img'),caption=d?.querySelector('.cg-postcard figcaption');
 const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
 const measure=n=>{const r=rect(n);let visible=true,unclipped=true;for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)===0||p.hidden||p.inert)visible=false;if(p!==n){const b=rect(p);if((s.overflowX!=='visible'&&(r.x<b.x-.5||r.x+r.width>b.x+b.width+.5))||(s.overflowY!=='visible'&&(r.y<b.y-.5||r.y+r.height>b.y+b.height+.5)))unclipped=false;}}const hitTests=[[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8]].map(([x,y])=>{const hit=document.elementFromPoint(r.x+r.width*x,r.y+r.height*y);return Boolean(hit&&(n===hit||n.contains(hit)));});return{rect:r,visible,unclipped,centerHit:hitTests[0],hitTests};};
 return{viewport:{width:innerWidth,height:innerHeight},dialogCount:document.querySelectorAll('dialog[open]').length,modal:Boolean(d?.matches(':modal')),bodyOverflow:document.body.style.overflow,pageScrollX:scrollX,pageScrollY:scrollY,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,dialog:d?rect(d):null,dialogScrollTop:d?.scrollTop,title:caption?[...caption.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim():null,image:img?{...measure(img),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,source:img.currentSrc}:null,caption:caption?{...measure(caption),scrollWidth:caption.scrollWidth,clientWidth:caption.clientWidth,textRect:(()=>{const range=document.createRange();range.selectNodeContents(caption);const r=range.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})()}:null,controls:d?[...d.querySelectorAll('button')].map(n=>({...measure(n),name:n.textContent.trim(),enabled:!n.disabled})):[]};
});}
export async function capturePostcardViews(page,info,piece){
 const original=page.viewportSize();await mkdir('expansion200-test-results/postcard-views',{recursive:true});
 try{for(const viewport of POSTCARD_VIEWPORTS){await page.setViewportSize(viewport);await imagesReady(page.locator('.cg-postcard img'));await expect(page.getByRole('button',{name:'Download postcard',exact:true})).toBeEnabled();
  for(const view of ['art','actions']){await page.locator('.cg-dialog-postcard').evaluate((d,view)=>{d.scrollTop=view==='art'?0:d.scrollHeight;},view);const state=await postcardState(page),prefix=`expansion200-test-results/postcard-views/${info.project.name}-${piece.id}-${viewport.width}-${view}`;const art=await renderedArt(page.locator('.cg-postcard img'),piece.id);await writeFile(prefix+'.json',JSON.stringify({...state,art},null,2));await readyScreenshot(page,{path:prefix+'.png',fullPage:false,animations:'disabled'});verifyPostcardState(state,viewport,piece.name,view);const after=await postcardState(page);expect(after).toEqual(state);await info.attach(`${piece.id}-${viewport.width}-${view}`,{path:prefix+'.png',contentType:'image/png'});}
 }}finally{await page.setViewportSize(original);await page.locator('.cg-dialog-postcard').evaluate(d=>{d.scrollTop=0;});}
}

export async function captureMixedInteraction(page,info,envelope,kind,expectedSave){
 const read=async()=>{
  const value=await page.evaluate(({key,kind})=>{
   const cells=[...document.querySelectorAll('[data-matching-cell]')];
   const items=selector=>cells.filter(cell=>cell.matches(selector)).map(cell=>({index:Number(cell.dataset.matchingCell),id:cell.dataset.pieceId}));
   return{kind,viewport:{width:innerWidth,height:innerHeight},board:cells.map(cell=>cell.dataset.pieceId),selected:items('.is-selected'),matches:items('.is-match'),hints:items('.is-hint'),pressed:items('[aria-pressed="true"]'),raw:localStorage.getItem(key)};
  },{key:envelope.storageKey,kind});
  expect(value.raw).toBe(expectedSave);expect(typeof value.raw).toBe('string');
  const {raw,...state}=value;return{...state,saveSha256:createHash('sha256').update(raw).digest('hex')};
 };
 const scope={pieceIds:envelope.catalog.PIECES.map(piece=>piece.id),starters:envelope.catalog.STARTERS};
 const state=await read();verifyMixedInteractionState(state,scope,kind);
 const prefix=`expansion200-test-results/review/${info.project.name}-${envelope.id}-mixed-${kind}`;
 await mkdir('expansion200-test-results/review',{recursive:true});await writeFile(prefix+'.json',JSON.stringify(state,null,2));
 await readyScreenshot(page,{path:prefix+'.png',fullPage:false,animations:'disabled'});expect(await read()).toEqual(state);
 await info.attach(`${envelope.id}-mixed-${kind}`,{path:prefix+'.png',contentType:'image/png'});
}
