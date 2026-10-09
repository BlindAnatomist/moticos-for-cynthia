// Browser starting points, generated lazily through the real reducer. Seeding
// these states is setup, not evidence that a human or browser played the route.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CONTINUATION} from '../../src/career/volumes.js';
import * as C from '../../src/career/content.js';
import * as E from '../../src/career/engine.js';
import * as C3 from '../../src/career/content.v3.js';
import * as E3 from '../../src/career/engine.v3.js';
import * as E4 from '../../src/career/engine.v4.js';
import * as C4 from '../../src/career/content.v4.js';
import {driver} from '../campaign-browser/save-fixtures.mjs';
export {C,E};
export const d=driver();
let checkpoints=null,legacyFour=null;
function prepare(){
 if(checkpoints)return checkpoints;const result={entries:new Map(),ends:new Map(),letters:new Map()};let s=E.createCareer('full-browser-fixture');
 for(const chapter of C.CHAPTERS.slice(0,16)){if(chapter.number>1)s=d.act(s,{type:'start-next-chapter',chapterId:chapter.id});result.entries.set(chapter.number,structuredClone(s));
  for(const id of chapter.storyIds){const order=s.orders.find(o=>o.storyLetterId===id);assert(order,`Missing fixture story ${id}`);s=d.complete(s,order);result.letters.set(id,structuredClone(s));}
  assert(E.chapterComplete(s));result.ends.set(chapter.number,structuredClone(s));
 }
 assert.equal(s.xp,6495);assert.equal(s.coinsEarned,2745);assert.equal(s.milestones.length,113);checkpoints=result;return checkpoints;
}
export function chapterEntry(number){const state=structuredClone((number>16?prepareContinuation():prepare()).entries.get(number));E.validateCareer(state);return state;}
export function chapterEnd(number){const state=structuredClone((number>16?prepareContinuation():prepare()).ends.get(number));E.validateCareer(state);return state;}
export function afterLetter(id){const chapter=C.CHAPTERS.find(c=>c.storyIds.includes(id));const state=structuredClone((chapter?.number>16?prepareContinuation():prepare()).letters.get(id));E.validateCareer(state);return state;}
export function previousFourChapterSave(){if(!legacyFour){const old=driver(E3,C3);let s=E3.createCareer('full-browser-old-four');for(const c of C3.CHAPTERS){if(c.number>1)s=old.act(s,{type:'start-next-chapter',chapterId:c.id});for(const id of c.storyIds)s=old.complete(s,s.orders.find(o=>o.storyLetterId===id));}E3.validateCareer(s);legacyFour=s;}return structuredClone(legacyFour);}
export function migratedOptionalAtFour(){return E.upgradeCareer(previousFourChapterSave());}
export function heldAtFive(){const s=migratedOptionalAtFour();return d.act(s,{type:'start-next-chapter',chapterId:'wrong-address'});}
export function readyLetter(state,id){const order=state.orders.find(o=>o.storyLetterId===id||o.id===id);assert(order);return d.ready(state,order);}
let continuationReady=false;
function prepareContinuation(){const result=prepare();if(continuationReady)return result;let s=structuredClone(result.ends.get(16));
 for(const chapter of C.CHAPTERS.slice(16)){s=d.act(s,chapter.number===17?{type:'enter-continuation',boundaryId:CONTINUATION.id}:{type:'start-next-chapter',chapterId:chapter.id});result.entries.set(chapter.number,structuredClone(s));for(const id of chapter.storyIds){s=d.complete(s,s.orders.find(o=>o.storyLetterId===id));result.letters.set(id,structuredClone(s));}result.ends.set(chapter.number,structuredClone(s));}
 assert.equal(s.milestones.length,139);assert.equal(s.xp,7830);continuationReady=true;return result;
}
export function previousFullCampaignSave(){return JSON.parse(fs.readFileSync(new URL('../../campaign-evidence/full-basic-journey.json',import.meta.url))).state;}
const allArtStates=new Map();
export function allArt({continuation=false}={}){const total=continuation?200:160;if(!allArtStates.has(total)){let s=chapterEnd(continuation?20:16);for(const p of C.CATALOG.PIECES.slice(0,total)){if(s.discoveries.includes(p.id))continue;[s]=d.acquire(s,p.id);if(s.board.filter(Boolean).length>10)for(let i=0;i<25;i++)if(s.board[i])s=d.act(s,{type:'recycle',at:i,tileId:s.board[i].id,confirmed:true});}assert.equal(s.discoveries.length,total);E.validateCareer(s);allArtStates.set(total,s);}return structuredClone(allArtStates.get(total));}
export function finePrint(){return afterLetter('fine-print-letter-3');}
export function finalePair(){return afterLetter('sound-advice-letter-6');}
export function quantityReadyPartial(){let s=finePrint();const order=s.orders.find(o=>o.storyLetterId==='fine-print-letter-4'),reserved=new Set;for(const id of ['ob3','ob2','ob2','sm2']){let tile;[s,tile]=d.acquire(s,id,reserved);reserved.add(tile);}return d.act(s,{type:'focus-order',orderId:order.id});}
export function retainedAtEight(){let s=chapterEnd(8);s=d.act(s,{type:'purchase',upgradeId:'bird-sorter',expectedLevel:0});s=d.act(s,{type:'supply',familyId:'bird'});[s]=d.acquire(s,'b5');assert(s.board.some(t=>t?.pieceId==='b5'));assert.equal(s.sources.bird.cursor,1);return s;}
export function oversizeWrite(){let s=E.createCareer('browser-oversize-write');s=d.ready(s,s.orders[0]);s.padding='';s.padding='x'.repeat(999990-JSON.stringify(s).length);E.validateCareer(s);assert.equal(JSON.stringify(s).length,999990);const action=E.commandFor(s,{type:'supply',familyId:s.activeSourceIds[0]}),candidate=E.reduceCareer(s,action);assert(candidate.ok);assert(JSON.stringify(candidate.state).length>1000000);return s;}

export function occupiedPhoneBoard(){let s=chapterEntry(13);const reserved=new Set();for(const pieceId of ['b1','b3','b5','f1','f5']){let tile;[s,tile]=d.acquire(s,pieceId,reserved);reserved.add(tile);}E.validateCareer(s);return s;}

// Stage A checkpoints are real reducer setup, never described as browser play.
export function secondLookRetained(){let state=chapterEntry(18);const keep=new Set();let callbackId,retainedId;[state,callbackId]=d.acquire(state,'pn2',keep);keep.add(callbackId);[state,retainedId]=d.acquire(state,'b5',keep);return{state,callbackId,retainedId};}
export function looseEndsCompetition(){let state=afterLetter('loose-ends-letter-3');for(let at=0;at<25;at++)if(state.board[at])state=d.act(state,{type:'recycle',at,tileId:state.board[at].id,confirmed:true});const keep=new Set();for(const pieceId of ['sp2','sp1','sp1','zp3','cj3']){let id;[state,id]=d.acquire(state,pieceId,keep);keep.add(id);}E.validateCareer(state);return state;}
export function originalSaveEntryFixtures(){const old=driver(E4,C4);let completed=previousFullCampaignSave();for(const upgradeId of ['bird-sorter','order-desk'])completed=old.act(completed,{type:'purchase',upgradeId,expectedLevel:0});completed=old.act(completed,{type:'supply',familyId:'bird'});[completed]=old.acquire(completed,'b5');E4.validateCareer(completed);return{inProgress:old.route(5,'native-stage-old-progress'),completed};}
