// NEW recovery fixture helpers. States are made through the actual frozen v7 and current reducers.
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';
import * as E from '../src/career/engine.js';import * as C from '../src/career/content.js';import * as V from '../src/career/volumes.js';
import * as E7 from '../src/career/engine.v7.js';import * as C7 from '../src/career/content.v7.js';import * as V7 from '../src/career/volumes.v7.js';
import {driver} from '../tests/campaign-browser/save-fixtures.mjs';
export const D=driver(),D7=driver(E7,C7),clone=structuredClone;
const old=JSON.parse(gunzipSync(fs.readFileSync(new URL('../stage-c-evidence/browser/fixtures.generated.json.gz',import.meta.url))));
let historical;
export function historical280(){if(!historical){let s=E7.upgradeCareer(clone(old.fixtures['v6-conservative']));for(const ch of C7.CHAPTERS.slice(24)){s=D7.act(s,ch.number===25?{type:'enter-continuation',boundaryId:V7.CONTINUATIONS[2].id}:{type:'start-next-chapter',chapterId:ch.id});for(const id of ch.storyIds)s=D7.complete(s,s.orders.find(o=>o.storyLetterId===id));}assert.equal(s.xp,9375);assert.equal(s.coinsSpent,0);historical=s;}return clone(historical);}
export const purchased280=()=>clone(old.fixtures.completed280);
export const initial=()=>E.upgradeCareer(historical280());
export const enter=s=>D.act(s,{type:'enter-continuation',boundaryId:V.CONTINUATIONS[3].id});
export function route({reverse=false,purchases=false,retain=false}={}){
 let s=initial();if(retain)for(const id of ['b240-tr2','c280-fi1','ru2'])[s]=D.acquire(s,id);
 const start=clone(s),entries={},before={},after={},records=[];let spent=0;
 for(const ch of C.CHAPTERS.slice(28)){
  s=ch.number===29?enter(s):D.act(s,{type:'start-next-chapter',chapterId:ch.id});entries[ch.id]=clone(s);
  const ids=reverse?[...ch.storyIds.slice(0,2).reverse(),...(ch.number===32?ch.storyIds.slice(2,4):ch.storyIds.slice(2,4).reverse()),...ch.storyIds.slice(4)]:ch.storyIds;
  for(const id of ids){
   if(purchases)for(const u of C.availableUpgrades(s).filter(u=>!s.upgrades[u.id]&&u.level<=C.levelDefinition(s).level).sort((a,b)=>a.price-b.price))if(C.coinBalance(s)>=u.price){s=D.act(s,{type:'purchase',upgradeId:u.id,expectedLevel:0});spent+=u.price;}
   const o=s.orders.find(o=>o.storyLetterId===id);assert(o,id);s=D.act(s,{type:'focus-order',orderId:o.id});before[id]=clone(s);const xp=s.xp,coins=s.coinsEarned;s=D.complete(s,o);assert.equal(s.xp-xp,o.xp);assert.equal(s.coinsEarned-coins,o.coins);after[id]=clone(s);records.push({id,xp:o.xp,coins:o.coins});
  }assert(E.chapterComplete(s));
 }
 assert.equal(s.xp-start.xp,455);assert.equal(s.coinsEarned-start.coinsEarned,200);assert.equal(s.coinsSpent-start.coinsSpent,spent);assert(E.allAuthoredContentComplete(s));return{state:s,start,entries,before,after,records,spent};
}
