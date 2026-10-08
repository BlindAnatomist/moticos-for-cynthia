// Browser starting points, generated lazily through the real reducer. Seeding
// these states is setup, not evidence that a human or browser played the route.
import assert from 'node:assert/strict';
import * as C from '../../src/career/content.js';
import * as E from '../../src/career/engine.js';
import * as C3 from '../../src/career/content.v3.js';
import * as E3 from '../../src/career/engine.v3.js';
import {driver} from '../campaign-browser/save-fixtures.mjs';
export {C,E};
export const d=driver();
let checkpoints=null,legacyFour=null;
function prepare(){
 if(checkpoints)return checkpoints;const result={entries:new Map(),ends:new Map(),letters:new Map()};let s=E.createCareer('full-browser-fixture');
 for(const chapter of C.CHAPTERS){if(chapter.number>1)s=d.act(s,{type:'start-next-chapter',chapterId:chapter.id});result.entries.set(chapter.number,structuredClone(s));
  for(const id of chapter.storyIds){const order=s.orders.find(o=>o.storyLetterId===id);assert(order,`Missing fixture story ${id}`);s=d.complete(s,order);result.letters.set(id,structuredClone(s));}
  assert(E.chapterComplete(s));result.ends.set(chapter.number,structuredClone(s));
 }
 assert.equal(s.xp,6495);assert.equal(s.coinsEarned,2745);assert.equal(s.milestones.length,113);checkpoints=result;return checkpoints;
}
export function chapterEntry(number){const state=structuredClone(prepare().entries.get(number));E.validateCareer(state);return state;}
export function chapterEnd(number){const state=structuredClone(prepare().ends.get(number));E.validateCareer(state);return state;}
export function afterLetter(id){const state=structuredClone(prepare().letters.get(id));E.validateCareer(state);return state;}
export function previousFourChapterSave(){if(!legacyFour){const old=driver(E3,C3);let s=E3.createCareer('full-browser-old-four');for(const c of C3.CHAPTERS){if(c.number>1)s=old.act(s,{type:'start-next-chapter',chapterId:c.id});for(const id of c.storyIds)s=old.complete(s,s.orders.find(o=>o.storyLetterId===id));}E3.validateCareer(s);legacyFour=s;}return structuredClone(legacyFour);}
export function migratedOptionalAtFour(){return E.upgradeCareer(previousFourChapterSave());}
export function heldAtFive(){const s=migratedOptionalAtFour();return d.act(s,{type:'start-next-chapter',chapterId:'wrong-address'});}
export function readyLetter(state,id){const order=state.orders.find(o=>o.storyLetterId===id||o.id===id);assert(order);return d.ready(state,order);}
let allArtState=null;
export function allArt(){if(!allArtState){let s=chapterEnd(16);for(const p of C.CATALOG.PIECES){if(s.discoveries.includes(p.id))continue;[s]=d.acquire(s,p.id);if(s.board.filter(Boolean).length>10)for(let i=0;i<25;i++)if(s.board[i])s=d.act(s,{type:'recycle',at:i,tileId:s.board[i].id,confirmed:true});}assert.equal(s.discoveries.length,160);E.validateCareer(s);allArtState=s;}return structuredClone(allArtState);}
export function finePrint(){return afterLetter('fine-print-letter-3');}
export function finalePair(){return afterLetter('sound-advice-letter-6');}
export function quantityReadyPartial(){let s=finePrint();const order=s.orders.find(o=>o.storyLetterId==='fine-print-letter-4'),reserved=new Set;for(const id of ['ob3','ob2','ob2','sm2']){let tile;[s,tile]=d.acquire(s,id,reserved);reserved.add(tile);}return d.act(s,{type:'focus-order',orderId:order.id});}
export function retainedAtEight(){let s=chapterEnd(8);s=d.act(s,{type:'purchase',upgradeId:'bird-sorter',expectedLevel:0});s=d.act(s,{type:'supply',familyId:'bird'});[s]=d.acquire(s,'b5');assert(s.board.some(t=>t?.pieceId==='b5'));assert.equal(s.sources.bird.cursor,1);return s;}
export function oversizeWrite(){let s=E.createCareer('browser-oversize-write');s=d.ready(s,s.orders[0]);s.padding='';s.padding='x'.repeat(999990-JSON.stringify(s).length);E.validateCareer(s);assert.equal(JSON.stringify(s).length,999990);const action=E.commandFor(s,{type:'supply',familyId:s.activeSourceIds[0]}),candidate=E.reduceCareer(s,action);assert(candidate.ok);assert(JSON.stringify(candidate.state).length>1000000);return s;}
