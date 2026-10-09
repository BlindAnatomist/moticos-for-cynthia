import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as C from '../../src/career/content.js';
import * as E from '../../src/career/engine.js';
import {driver} from '../../tests/campaign-browser/save-fixtures.mjs';
import {CONTINUATIONS} from '../../src/career/volumes.js';
export {C,E};
export const d=driver();
export const oldEndpoint=()=>JSON.parse(fs.readFileSync(new URL('../v5-complete.frozen.json',import.meta.url))).state;
let complete,discovered;
export function completed240(){
 if(!complete){let s=E.upgradeCareer(oldEndpoint());for(const c of C.CHAPTERS.slice(20)){s=d.act(s,c.number===21?{type:'enter-continuation',boundaryId:CONTINUATIONS[1].id}:{type:'start-next-chapter',chapterId:c.id});for(const id of c.storyIds)s=d.complete(s,s.orders.find(o=>o.storyLetterId===id));}assert.equal(s.milestones.length,164);complete=s;}
 return structuredClone(complete);
}
export function all240(){
 if(!discovered){let s=completed240();for(const p of C.CATALOG.PIECES){if(s.discoveries.includes(p.id))continue;[s]=d.acquire(s,p.id);if(s.board.filter(Boolean).length>10)for(let at=0;at<25;at++)if(s.board[at])s=d.act(s,{type:'recycle',at,tileId:s.board[at].id,confirmed:true});}assert.equal(s.discoveries.length,240);E.validateCareer(s);discovered=s;}
 return structuredClone(discovered);
}
