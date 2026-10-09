import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createServer} from 'vite';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {C,E,fixture} from './fixtures.mjs';import {storyRewardText} from './reward-label.mjs';

test('all nineteen real rendered mobile reward labels include exact letter position and rewards',async()=>{
  const cacheDir=fs.mkdtempSync(path.join(os.tmpdir(),'moticos-reward-ssr-'));
  const server=await createServer({configFile:path.resolve('career.vite.config.js'),server:{middlewareMode:true,watch:null},cacheDir,optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
  try{
    const {CareerGame}=await server.ssrLoadModule('/src/career/CareerGarden.jsx');
    const labels=[],zeroLabels=[];
    for(const chapter of C.CHAPTERS.slice(28))for(const id of chapter.storyIds){
      let state=fixture('before-'+id);const order=state.orders.find(o=>o.storyLetterId===id);assert(order);
      if(state.focusedOrderId!==order.id){const result=E.reduceCareer(state,E.commandFor(state,{type:'focus-order',orderId:order.id}));assert(result.ok);state=result.state;}
      const html=renderToStaticMarkup(React.createElement(CareerGame,{session:null,initial:{state,status:'saved',warning:null}}));
      const matches=[...html.matchAll(/<span class="career-mobile-order-reward">([^<]+)<\/span>/g)];assert.equal(matches.length,1,id);
      const expected=storyRewardText(chapter,order);assert.equal(matches[0][1],expected,id);labels.push(expected);
      if(order.xp===0&&order.coins===0)zeroLabels.push(expected);
    }
    assert.equal(labels.length,19);
    assert.deepEqual(zeroLabels,['Letter 1/4 · 0 XP · 0 coins','Letter 1/5 · 0 XP · 0 coins','Letter 1/5 · 0 XP · 0 coins','Letter 2/5 · 0 XP · 0 coins']);
  }finally{await server.close();fs.rmSync(cacheDir,{recursive:true,force:true});}
});
test('label expectations reject wrong chapter, nonstory origin and invalid rewards',()=>{
  const chapter=C.CHAPTERS[28],order=fixture('before-'+chapter.storyIds[0]).orders.find(o=>o.storyLetterId===chapter.storyIds[0]);
  assert.throws(()=>storyRewardText(C.CHAPTERS[29],order),/expected chapter/);
  assert.throws(()=>storyRewardText(chapter,{...order,origin:'practice'}));
  assert.throws(()=>storyRewardText(chapter,{...order,xp:-1}));
});
