import test from 'node:test';
import assert from 'node:assert/strict';
import { progressCue, levelUnlock, failureBrief } from '../../src/career/feedback.js';
import { createCareer, createReplay, commandFor, reduceCareer, matchingTiles } from '../../src/career/engine.js';
import { route, ready, allFinal, threeOrders, act } from '../career-browser/fixtures.mjs';

test('level boundaries explain the newly available choices, without inventing rewards',()=>{
 const level2=levelUnlock(route(3),route(4));assert.match(level2.detail,/two active requests/);assert.match(level2.detail,/level-4/);assert.match(level2.detail,/50-coin/);
 const level3=levelUnlock(route(6),route(7));assert.match(level3.detail,/level-5/);assert.match(level3.detail,/100-coin/);
 assert.equal(levelUnlock(route(4),route(5)),null);assert.equal(levelUnlock(route(7),route(6)),null);
});
test('persistent progress cue reflects locked, affordable and spent coins after reload',()=>{
 assert.match(progressCue(createCareer('feedback-fresh')).cue,/80 XP/);
 assert.equal(progressCue(route(4)).cue,'15 coins to an upgrade');
 const available=route(5);assert.equal(progressCue(available).cue,'Upgrade affordable');
 const bought=act(available,{type:'purchase',upgradeId:'bird-sorter',expectedLevel:0});assert.equal(progressCue(bought).cue,'40 coins to an upgrade');
 assert.deepEqual(progressCue(JSON.parse(JSON.stringify(bought))),progressCue(bought));
});
test('chapter completion remains visible after another move, Undo and reload',()=>{
 let s=route(9);const summary=progressCue(s);assert.equal(summary.complete,true);assert.equal(summary.heading,'Garden complete');assert.match(summary.detail,/next chapter is not released/);
 s=act(s,{type:'supply',familyId:'bird',basic:true});assert.deepEqual(progressCue(s),summary);
 s=act(s,{type:'undo'});assert.deepEqual(progressCue(JSON.parse(JSON.stringify(s))),summary);
});
test('early Level4 from ordinary orders does not claim story completion',()=>{
 let s=threeOrders();const o=s.orders.find(x=>x.origin==='ordinary');s=ready(s,o);const next=act(s,{type:'complete',orderId:o.id,tileIds:matchingTiles(s,o)});
 assert.equal(progressCue(next).complete,false);assert.match(progressCue(next).detail,/remaining story letters/);assert.match(levelUnlock(s,next).brief,/Level 4/);
});
test('unsaved and replay progress never presents temporary gains as a saved chapter',()=>{
 const s=route(9);assert.equal(progressCue(s,'practice').complete,false);assert.equal(progressCue(s,'practice').heading,'Unsaved practice');assert.match(progressCue(s,'practice').cue,/Nothing is banked/);
 const replay=createReplay('garden-letter-1','feedback-replay');assert.match(progressCue(replay).detail,/0 XP and 0 coins/);assert.equal(progressCue(replay).shop,false);assert.equal(levelUnlock(s,replay),null);
});
test('full-board and final-piece errors explain recovery without losing the selected material',()=>{
 const s=allFinal(),before=JSON.stringify(s);
 for(const[action,expected] of [[{type:'cut',at:0,tileId:s.board[0].id},'Cut needs space · Recycle first'],[{type:'supply',familyId:'bird',basic:true},'Board full · merge or Recycle first'],[{type:'move',from:0,to:2,tileId:s.board[0].id,targetTileId:s.board[2].id},'Final picture · Send, Cut or Recycle']]){
  const result=reduceCareer(s,commandFor(s,action));assert.equal(result.ok,false);assert.equal(failureBrief(action,s,result),expected);assert.equal(JSON.stringify(s),before);
 }
 assert.equal(failureBrief({type:'move',from:0,to:2},s,{message:'The selected pieces changed'}),'Board changed · choose the piece again');
});
