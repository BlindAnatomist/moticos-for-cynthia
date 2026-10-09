import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,E,d,completed240} from './fixtures.mjs';
import * as E5 from '../../src/career/engine.v5.js';
import * as C5 from '../../src/career/content.v5.js';
import {driver} from '../../tests/campaign-browser/save-fixtures.mjs';
import {CONTINUATIONS} from '../../src/career/volumes.js';
const d5=driver(E5,C5);
export function retainedV5(){let s=JSON.parse(fs.readFileSync(new URL('../v5-purchases.frozen.json',import.meta.url)));s=d5.act(s,{type:'supply',familyId:'bird'});while(s.sources.bird.cursor===0)s=d5.act(s,{type:'supply',familyId:'bird'});[s]=d5.acquire(s,'b5');assert(s.orders.some(o=>o.slot===2));E5.validateCareer(s);return s;}
export function retainedEntry(){return d.act(E.upgradeCareer(retainedV5()),{type:'enter-continuation',boundaryId:CONTINUATIONS[1].id});}
export function newChapterEntry(number){let s=retainedEntry();for(const c of C.CHAPTERS.slice(20)){if(c.number===number)return s;for(const id of c.storyIds)s=d.complete(s,s.orders.find(o=>o.storyLetterId===id));const next=C.CHAPTERS.find(x=>x.number===c.number+1);if(next)s=d.act(s,{type:'start-next-chapter',chapterId:next.id});}throw Error('Unknown new chapter');}
export function occupiedNewBoard(){let s=completed240();for(let at=0;at<25;at++)if(s.board[at])s=d.act(s,{type:'recycle',at,tileId:s.board[at].id,confirmed:true});const keep=new Set;for(const f of C.FAMILIES.slice(40)){let id;[s,id]=d.acquire(s,f.pieceIds[2],keep);keep.add(id);}assert.equal(s.board.filter(Boolean).length,8);return s;}
