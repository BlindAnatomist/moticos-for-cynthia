import {verifyRenderedArt} from './expansion160RenderedArt.mjs';
import assert from 'node:assert/strict';
import {appendFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {JOURNEY_CASE_TIMEOUT_MS} from './expansion160Scope.mjs';
export function openJourneyJournal(path,profile,envelope,now=()=>performance.now()){
 mkdirSync(dirname(path),{recursive:true});const start=now();const record=(event,details={})=>{const value={event,elapsedMs:Math.round(now()-start),...details};appendFileSync(path,JSON.stringify(value)+'\n');};record('begin',{profile,envelope,timeoutMs:JOURNEY_CASE_TIMEOUT_MS});return record;
}
export function verifyJourneyJournal(events,profile,envelope,assets){
 for(const event of ['begin','fresh-save','complete'])assert.equal(events.filter(e=>e.event===event).length,1);
 const first=events[0],last=events.at(-1);assert.equal(first.event,'begin');assert.equal(first.profile,profile);assert.equal(first.envelope,envelope.id);assert.equal(first.timeoutMs,JOURNEY_CASE_TIMEOUT_MS);assert.equal(events[1].event,'fresh-save');assert.equal(events[1].raw,null);assert.equal(last.event,'complete');assert.equal(last.merges,30);assert.equal(last.draws,12);assert.equal(last.discoveries,10);assert.equal(last.postcards,6);
 let prior=-1;const stages=[],exports=[],merges=[],draws=[];let stagePending=null,exportPending=null;
 for(const event of events){assert(Number.isFinite(event.elapsedMs)&&event.elapsedMs>=prior);prior=event.elapsedMs;assert(['begin','fresh-save','stage-start','stage-complete','merge','supply','export-start','export-complete','complete'].includes(event.event));
  if(event.event==='merge'){assert(envelope.pieceIds.includes(event.from));assert(envelope.pieceIds.includes(event.to));assert.equal(Number(event.to.at(-1)),Number(event.from.at(-1))+1);assert.equal(event.from.slice(0,-1),event.to.slice(0,-1));assert(['tap','drag'].includes(event.method));merges.push(event);}
  if(event.event==='supply'){assert(envelope.starters.includes(event.starter));draws.push(event);}
  if(event.event==='stage-start'){assert.equal(stagePending,null);assert(envelope.pieceIds.includes(event.id));if(!envelope.starters.includes(event.id))assert(merges.some(m=>m.to===event.id));stagePending={label:event.label,id:event.id};}
  if(event.event==='stage-complete'){assert.deepEqual(stagePending,{label:event.label,id:event.id});stagePending=null;if(assets){assert.match(event.art?.observedSha256??'',/^[a-f0-9]{64}$/);verifyRenderedArt(event.art,event.id,assets);}assert.deepEqual(event.sizes,['native','320x568']);stages.push(event.label);}
  if(event.event==='export-start'){assert.equal(exportPending,null);assert(stages.includes(event.id));exportPending=event.id;}
  if(event.event==='export-complete'){assert.equal(exportPending,event.id);exportPending=null;if(assets){assert.match(event.art?.observedSha256??'',/^[a-f0-9]{64}$/);verifyRenderedArt(event.art,event.id,assets);}assert.match(event.sha256,/^[a-f0-9]{64}$/);assert(event.bytes>10000);exports.push(event.id);}
 }
 assert(prior<JOURNEY_CASE_TIMEOUT_MS);assert.equal(stagePending,null);assert.equal(exportPending,null);assert.equal(merges.length,30);assert.equal(draws.length,12);
 for(const starter of envelope.starters){assert.equal(merges.filter(e=>e.from.slice(0,-1)===starter.slice(0,-1)).length,15);assert.equal(draws.filter(e=>e.starter===starter).length,6);}
 assert.deepEqual([...stages].sort(),[...envelope.pieceIds,...envelope.finals.map(id=>`idle-${id}`)].sort());assert.deepEqual(exports.sort(),envelope.pieceIds.filter(id=>Number(id.at(-1))>=3).sort());
 return {envelope:envelope.id,earnedPieces:10,merges:30,pairDraws:12,postcards:6,geometryViews:24,freshSave:true};
}
