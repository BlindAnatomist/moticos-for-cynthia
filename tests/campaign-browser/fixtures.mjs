// Adapted from the independent QA draft's legal-command browser fixture builder.
// Setup fixtures are scaffolding; only C01/C02/P01 claim actual UI journeys.
import assert from 'node:assert/strict';
import {current,old,legacyFixtures,sameSchemaPreviousPack,engine as E,content as C} from './save-fixtures.mjs';
export {legacyFixtures,sameSchemaPreviousPack,E,C};
export const act=current.act,ready=current.ready,acquire=current.acquire;
export function route(n=9){let s=E.createCareer(`browser-route-${n}`);for(let i=0;i<n;i++){const letter=C.STORY_ORDERS[i];if(s.chapterId!==letter.chapterId)s=act(s,{type:'start-next-chapter',chapterId:letter.chapterId});const order=s.orders.find(o=>o.storyLetterId===letter.id);assert(order);s=current.complete(s,order);}E.validateCareer(s);return s;}
export function purchased(s){for(const u of C.availableUpgrades(s))if(!s.upgrades[u.id]&&C.coinBalance(s)>=u.price&&C.levelDefinition(s).level>=u.level)s=act(s,{type:'purchase',upgradeId:u.id,expectedLevel:0});return s;}
export const transition=()=>purchased(route(9));
export const moon=()=>act(transition(),{type:'start-next-chapter',chapterId:C.CHAPTERS[1].id});
export const finished=()=>purchased(route(16));
export function full(){let s=E.createCareer('browser-full');[s]=acquire(s,'b3');while(s.board.includes(null))s=act(s,{type:'supply',familyId:'fern'});return s;}
export function clearBoard(s){for(let i=0;i<25;i++)if(s.board[i])s=act(s,{type:'recycle',at:i,tileId:s.board[i].id,confirmed:true});return s;}
// A full board with 21 final pictures and four level-1 scraps, not 25 finals.
export function allFinal(){let s=clearBoard(E.createCareer('browser-full-finals'));for(let i=0;i<25;i++){// Generate each actual final piece while retaining enough crafting room.
 if(i>=21)break;[s]=acquire(s,i%2?'f5':'b5',new Set(s.board.filter(Boolean).map(t=>t.id)));}
 // Fill remaining spaces with a single family; errors can be tested on the final pieces.
 while(s.board.includes(null))s=act(s,{type:'supply',familyId:'fern'});E.validateCareer(s);return s;}
export function allArt(){let s=clearBoard(finished());for(const p of C.CATALOG.PIECES)[s]=acquire(s,p.id,new Set(s.board.filter(Boolean).map(t=>t.id)));E.validateCareer(s);return s;}
export function threeOrders(){const s=act(route(7),{type:'purchase',upgradeId:'order-desk',expectedLevel:0});assert.equal(s.orders.length,3);return s;}
export function fixtures(){return {fresh:E.createCareer('browser-fresh'),affordable:route(5),choice:route(4),transition:transition(),replay:route(1),ready:ready(E.createCareer('browser-ready')),moon:moon(),moonUnlocked:route(11),full:full(),finals:allFinal(),allArt:allArt(),finished:finished()};}
