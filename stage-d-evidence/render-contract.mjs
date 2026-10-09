// Server rendering verifies emitted semantic text only. No browser geometry, interaction or native save claims.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createServer} from 'vite';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {historical280} from './fixtures.mjs';
const server=await createServer({configFile:path.resolve('career.vite.config.js'),server:{middlewareMode:true,watch:null},cacheDir:path.resolve('../ssr-cache'),optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const C=await server.ssrLoadModule('/src/career/content.js'),E=await server.ssrLoadModule('/src/career/engine.js'),V=await server.ssrLoadModule('/src/career/volumes.js');
 const {CareerGame}=await server.ssrLoadModule('/src/career/CareerGarden.jsx');
 let state=E.upgradeCareer(historical280());
 const act=a=>{const r=E.reduceCareer(state,E.commandFor(state,a));assert(r.ok,r.message);state=r.state;};
 const complete=o=>{let n=0;while(!E.matchingTiles(state,o)){assert(++n<200);const h=E.goalHint(state,o.id);if(h.kind==='supply')act({type:'supply',familyId:h.familyId});else if(h.kind==='merge'){const[from,to]=h.pair;act({type:'move',from,to,tileId:state.board[from].id,targetTileId:state.board[to].id});}else if(h.kind==='cut')act({type:'cut',at:h.at,tileId:state.board[h.at].id});else assert.fail(h.kind);}act({type:'complete',orderId:o.id,tileIds:E.matchingTiles(state,o)});};
 const results=[];
 for(const ch of C.CHAPTERS.slice(28)){
  act(ch.number===29?{type:'enter-continuation',boundaryId:V.CONTINUATIONS[3].id}:{type:'start-next-chapter',chapterId:ch.id});
  const zero=state.orders.find(o=>o.xp===0&&o.coins===0&&o.origin==='story');act({type:'focus-order',orderId:zero.id});
  const html=renderToStaticMarkup(React.createElement(CareerGame,{session:null,initial:{state,status:'saved',warning:null}}));
  const cards=[...html.matchAll(/<article class="career-order[\s\S]+?<\/article>/g)].map(m=>m[0]);assert(cards.length>=2);
  const phone=html.match(/<span class="career-mobile-order-reward">([^<]+)<\/span>/)?.[1];assert(phone?.includes('0 XP · 0 coins'));
  const card=cards.find(c=>c.includes(`data-order-id="${zero.id}"`));assert(card);assert(card.includes('0 XP · <b>0</b> coins'));assert(!card.includes('Coins only'));assert(card.includes('Story milestone · Send both opening story letters'));assert(card.includes('2 remaining.'));
  results.push({chapterId:ch.id,zeroRewardStoryId:zero.storyLetterId,verified:['0 XP / 0 coins emitted in card and chosen-goal phone strip','both-letter milestone notice emitted','no Coins only label on zero story']});
  for(const id of ch.storyIds)complete(state.orders.find(o=>o.storyLetterId===id));
 }
 fs.mkdirSync('../validation-stage-d',{recursive:true});fs.writeFileSync('../validation-stage-d/render-contract.json',JSON.stringify({status:'PASS server-rendered semantic text only; no browser acceptance',results},null,2)+'\n');console.log('PASS four real chapter-opening views emit truthful 0 XP / 0 coin rewards and both-letter source milestone notices. No browser was started.');
}finally{await server.close();}
