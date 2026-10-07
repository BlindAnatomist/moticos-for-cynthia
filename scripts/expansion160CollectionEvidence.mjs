import {classifyChooserVisibility} from './expansion160ChooserVisibility.mjs';
import {verifyRenderedArt} from './expansion160RenderedArt.mjs';
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export { collectionStateViolations, TRACE_POLICY } from './collectionEvidence.mjs';
import { collectionStateViolations } from './collectionEvidence.mjs';
import {COLLECTION_CASE_TIMEOUT_MS,MAX_COLLECTION_CAPTURES} from './expansion160Scope.mjs';
export {COLLECTION_CASE_TIMEOUT_MS};
export function visibleImageIndices(state) {
 const dialog=state.rect,viewport=state.viewport;
 if(!dialog||!viewport||!state.occlusionRect||state.occlusionRect.height<=0)return [];
 const bounds={left:Math.max(0,dialog.x),top:Math.max(0,dialog.y),right:Math.min(viewport.width,dialog.x+dialog.width),bottom:Math.min(viewport.height,dialog.y+dialog.height)};
 return (state.images??[]).flatMap((image,index)=>{
  const r=image.rect,o=state.occlusionRect;const occluded=r&&o&&r.x<o.x+o.width&&r.x+r.width>o.x&&r.y<o.y+o.height&&r.y+r.height>o.y;
  return image.complete&&image.naturalWidth>0&&image.naturalHeight>0&&image.centerHit&&image.hitPoints?.length===5&&image.hitPoints.every(point=>point.hit===true)&&!occluded&&r&&r.width>0&&r.height>0&&r.x>=bounds.left-0.5&&r.y>=bounds.top-0.5&&r.x+r.width<=bounds.right+0.5&&r.y+r.height<=bounds.bottom+0.5?[index]:[];
 });
}
export function verifyChooserState(state,envelope) {
 assert.equal(state.dialogCount,1);assert.equal(state.open,true);assert.equal(state.modal,true);assert.equal(state.bodyOverflow,'hidden');assert.equal(state.envelope,envelope);assert.equal(state.images.length,2);const classification=classifyChooserVisibility(state);assert.deepEqual(state.chooserEvidence?.classification,classification,'Recorded chooser classification differs from raw evidence');assert.equal(classification.accepted,true,classification.violations.join('; '));
}
export function openEnvelopeJournal(path, profile, envelope, now = () => performance.now()) {
 mkdirSync(dirname(path), {recursive:true});const start=now();const record=(event,details={})=>{const value={event,elapsedMs:Math.round(now()-start),...details};appendFileSync(path,JSON.stringify(value)+'\n');return value;};record('begin',{profile,envelope,timeoutMs:COLLECTION_CASE_TIMEOUT_MS});return record;
}
export function verifyEnvelopeJournal(events,profile,envelope,expectedPieces,expectedStarters,assets,viewport) {
 let cursor=0,prior=-1;
 const next=event=>{const value=events[cursor++];assert(value,`Missing ${event}`);assert.equal(value.event,event);assert(Number.isFinite(value.elapsedMs)&&value.elapsedMs>=prior);prior=value.elapsedMs;return value;};
 const first=next('begin');assert.equal(first.profile,profile);assert.equal(first.envelope,envelope);assert.equal(first.timeoutMs,COLLECTION_CASE_TIMEOUT_MS);
 assert.equal(next('seeded').count,16);assert.equal(next('board-ready').history,100);next('open-start');next('dialog-open');
 const decodedImages=[];
 for(let image=0;image<10;image++){assert.equal(next('image-start').image,image);const decoded=next('image-decoded');assert.equal(decoded.image,image);assert(decoded.source&&decoded.naturalWidth>0&&decoded.naturalHeight>0);if(assets){assert.match(decoded.observedSha256??'',/^[a-f0-9]{64}$/);verifyRenderedArt(decoded,expectedPieces[image],assets);}decodedImages.push(decoded);}
 const covered=new Set(),paths=[];
 for(let capture=0;covered.size<10;capture++){
  assert(capture<MAX_COLLECTION_CAPTURES,'Scroll evidence exceeded bounded capture count');const before=next('capture-before'),after=next('capture-after');assert.equal(before.capture,capture);assert.equal(after.capture,capture);assert.equal(after.target,before.target);assert(Number.isInteger(before.target)&&before.target>=0&&before.target<10&&!covered.has(before.target));
  if(viewport){assert.deepEqual(before.state.viewport,viewport);assert.deepEqual(after.state.viewport,viewport);}assert.deepEqual(collectionStateViolations(before.state,envelope),[]);assert.deepEqual(collectionStateViolations(after.state,envelope),[]);
  for(const [image,decoded] of decodedImages.entries())for(const field of ['source','naturalWidth','naturalHeight'])assert.equal(before.state.images[image][field],decoded[field],'Decoded image differs from captured collection');
  for(const key of ['images','rect','scrollTop','occlusionRect'])assert.deepEqual(after.state[key],before.state[key]);
  const visible=visibleImageIndices(before.state);assert(visible.includes(before.target),'Requested image is clipped or occluded');visible.forEach(i=>covered.add(i));
  assert.equal(after.path,`expansion160-test-results/storage-views/${profile}-collection-${envelope}-${capture}.png`);paths.push(after.path);
 }
 const complete=next('visual-coverage-complete');assert.equal(complete.captures,paths.length);assert.deepEqual(complete.images,Array.from({length:10},(_,i)=>i));assert.equal(complete.pieceIds.length,10);assert.equal(new Set(complete.pieceIds).size,10);if(expectedPieces)assert.deepEqual(complete.pieceIds,expectedPieces);
 next('closed');const before=next('chooser-before'),after=next('chooser-after');if(viewport){assert.deepEqual(before.state.viewport,viewport);assert.deepEqual(after.state.viewport,viewport);}verifyChooserState(before.state,envelope);verifyChooserState(after.state,envelope);assert.equal(before.pieceIds.length,2);assert.equal(new Set(before.pieceIds).size,2);if(expectedStarters)assert.deepEqual(before.pieceIds,expectedStarters);for(const key of ['images','rect','scrollTop','occlusionRect','chooserEvidence'])assert.deepEqual(after.state[key],before.state[key]);
 for(const [index,id] of before.pieceIds.entries()){const source=decodedImages[complete.pieceIds.indexOf(id)]?.source;assert(source,'Starter is absent from decoded collection');assert.equal(before.state.images[index].source,source,'Chooser image differs from collection starter');}
 assert.equal(after.path,`expansion160-test-results/storage-views/${profile}-chooser-${envelope}.png`);next('chooser-closed');
 assert.equal(next('read-only-bytes-verified').count,16);assert.equal(next('undo-verified').history,99);next('reload-verified');assert.equal(next('second-undo-verified').history,98);assert.equal(next('other-saved-bytes-verified').count,15);next('complete');assert.equal(cursor,events.length);assert(prior<COLLECTION_CASE_TIMEOUT_MS);
 return {envelope,decodedImages:10,visuallyCoveredImages:10,captures:paths.length,paths,chooserPath:after.path,chooserStarters:before.pieceIds,pieceIds:complete.pieceIds,historyBefore:100,exactUndoTransitions:2,readOnlySaveKeys:16,otherKeysUnchanged:15};
}
