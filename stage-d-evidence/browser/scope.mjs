import {lifecycleDiagnostics} from './lifecycle-diagnostics.mjs';
// Newly reconstructed from accepted280; requires independent320 review.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {STORAGE_KEY} from '../../src/career/content.js';
export const PROPOSAL=JSON.parse(fs.readFileSync(new URL('../browser-proposal.json',import.meta.url)));
export const CASES=Object.freeze(PROPOSAL.cases.map(c=>Object.freeze([c.id,c.title,c.timeoutSeconds*1000])));
export const SCREENSHOTS=Object.freeze(PROPOSAL.cases.flatMap(c=>c.routineScreenshotNames));
export const POSTCARDS=Object.freeze(PROPOSAL.postcardOutputsPerProfile);export const PROFILE_MS=900000;
export const screenshotAllowed=name=>{assert(SCREENSHOTS.includes(name),'Unreviewed screenshot '+name);return true;};
// Best-effort bounded diagnostics never replace the original assertion or claim
// a completed test. This capture owns the sole allowed failure screenshot.
const failures=new Set();
export async function failureState(page, info, error, details={}) {
  if(failures.has(info.outputDir))return;failures.add(info.outputDir);
  const result={caseId:info.title.split(' ')[0],status:'failed-or-interrupted',details,error:{name:error?.name,message:String(error?.message??error).slice(0,16384),stack:String(error?.stack??'').slice(0,32768)}};
  try {
    let timer;
    try { result.page=await Promise.race([page.evaluate(key=>{
      const raw=localStorage.getItem(key);let state=null,parseError=null;try{state=raw?JSON.parse(raw):null;}catch(e){parseError=String(e);}
      const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
      const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
      return {url:location.href,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},save:{raw:raw?.slice(0,100000)??null,truncated:raw?.length>100000,parseError,schema:state?.schemaVersion,content:state?.contentVersion,revision:state?.revision,chapter:state?.chapterId},hud:[...document.querySelectorAll('.career-mobile-topbar,.career-mobile-progress-button,.career-mobile-goal,.career-producer,.career-mobile-return')].filter(visible).map(el=>({tag:el.tagName,class:el.className,text:el.textContent?.slice(0,1000),label:el.getAttribute('aria-label'),rect:rect(el)})).slice(0,30),images:[...document.querySelectorAll('.career-shell img')].filter(visible).slice(0,80).map(el=>({src:el.currentSrc,alt:el.alt,complete:el.complete,natural:[el.naturalWidth,el.naturalHeight],rect:rect(el)})),recentWrites:(window.__careerAudit??[]).slice(-12)};
    },STORAGE_KEY),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Failure state inspection exceeded 1 second')),1000);})]); } finally {clearTimeout(timer);}
    if(result.page?.save?.raw){result.page.save.sha256=createHash('sha256').update(result.page.save.raw).digest('hex');result.page.save.hashCovers=result.page.save.truncated?'stored-prefix-only':'exact-stored-bytes';}
  } catch(e) {result.inspectionError=String(e.message).slice(0,4096);}
  try {
    if(page&&!page.isClosed()){const path=info.outputPath('failure.png');fs.mkdirSync(info.outputDir,{recursive:true});assert(!fs.existsSync(path));await page.screenshot({path,fullPage:false,timeout:2000});const bytes=fs.readFileSync(path);result.screenshot={name:'failure.png',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
    else result.screenshotUnavailable='The failing page was already closed';
  } catch(e) {result.screenshotError=String(e.message).slice(0,4096);}
  try { const path=info.outputPath('failure-state.json');fs.mkdirSync(info.outputDir,{recursive:true});const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');assert(bytes.length<=256*1024);fs.writeFileSync(path,bytes,{flag:'wx'});await info.attach('failure-state',{path,contentType:'application/json'}); } catch {} 
}
export function scenarioFor(test){return(title,fn)=>{const row=CASES.find(([id,t])=>title===id+' '+t);assert(row,'Unreviewed exact case title: '+title);test(title,async({page,context,browser},info)=>{test.setTimeout(row[2]);const diagnostics=lifecycleDiagnostics({context,browser,path:info.outputPath('lifecycle-diagnostics.json')});try{return await fn({page,context,browser,diagnostics},info);}catch(error){diagnostics.note('scenario-failed');await failureState(page,info,error);throw error;}finally{diagnostics.note('scenario-ended');}});};}
