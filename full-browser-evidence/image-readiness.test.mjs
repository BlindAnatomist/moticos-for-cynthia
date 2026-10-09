import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectImageReadiness} from '../tests/full-campaign-browser/image-readiness.mjs';
import {occupiedPhoneBoard,chapterEntry,heldAtFive,E,d} from '../tests/full-campaign-browser/fixtures.mjs';

function scene({complete=true,natural=768,width=48,cropWidth=48,includeImage=true}={}) {
  const box = width => ({getBoundingClientRect:()=>({width,height:48}),getClientRects:()=>width?[{}]:[]});
  const crop=box(cropWidth),cell={...box(52),dataset:{careerCell:'0',pieceId:'b1'},querySelector:()=>includeImage?img:null};
  const img={...box(width),complete,naturalWidth:natural,naturalHeight:natural,currentSrc:'https://example.test/bird.png',parentElement:crop,closest:s=>s==='.career-cell'?cell:crop};
  return {querySelectorAll:s=>s==='.career-cell.has-piece'?[cell]:includeImage?[img]:[]};
}
test('a labelled practice tile cannot pass while its artwork is loading, broken, absent, or not laid out',()=>{
  for(const options of [{complete:false},{natural:0},{includeImage:false},{width:0},{cropWidth:0}]) assert.equal(inspectImageReadiness(scene(options)).ready,false,JSON.stringify(options));
});
test('readiness is measured again after load and layout; it records the actual practice DOM identity',()=>{
  const root=scene({complete:false}),img=root.querySelectorAll('.career-shell img')[0];
  assert.equal(inspectImageReadiness(root).ready,false);img.complete=true;
  const proof=inspectImageReadiness(root);assert.equal(proof.ready,true);assert.equal(proof.images[0].pieceId,'b1');assert.deepEqual(proof.images[0].natural,[768,768]);
});
test('an empty image query is not positive readiness evidence',()=>assert.equal(inspectImageReadiness({querySelectorAll:()=>[]}).ready,false));
test('phone artwork measurement starts with retained occupied cells, without rewarding its setup actions',()=>{
  const before=chapterEntry(13),state=occupiedPhoneBoard(),ids=state.board.filter(Boolean).map(t=>t.pieceId);
  for(const id of ['b1','b3','b5','f1','f5']) assert(ids.includes(id),id);
  assert.equal(state.xp,before.xp);assert.equal(state.coinsEarned,before.coinsEarned);assert.deepEqual(state.milestones,before.milestones);
});

test('temporary-practice image expectation follows the fixture source output, not a shared Bird label',()=>{
  const before=heldAtFive(),sourceId=before.activeSourceIds[0],expected=E.nextOutput(before,sourceId).id;
  assert.deepEqual(before.activeSourceIds,['wing','map']);assert.equal(expected,'wr1');assert.notEqual(expected,'b1');
  const after=d.act(before,{type:'supply',familyId:sourceId});assert(after.board.some(tile=>tile?.pieceId===expected));assert.equal(before.board.filter(Boolean).length,0);
});
