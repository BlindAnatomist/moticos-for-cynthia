import { describe, it, expect } from 'vitest';
import { PIECES, CATALOG, RECIPES, FINALS, STARTERS, BIRD, MAP, FERN, CUP, KEY, MOON, recipeFor } from '../src/collection/catalog.js';
import { createRound, mergePieces, movePiece, cutPiece, mergePairs, validRound, newSave, parseSave, completedFinals, leafIds } from '../src/collection/collectionLogic.js';
const find = (round,id) => round.board.findIndex(t => t?.pieceId === id);
function make(round,a,b) { return mergePieces(round,find(round,a),find(round,b)); }
describe('authored collection graph', () => {
 it('has twelve real unique assets, six starters, and two final collages', () => {
  expect(PIECES).toHaveLength(12); expect(new Set(PIECES.map(p=>p.id)).size).toBe(12); expect(STARTERS).toHaveLength(6); expect(FINALS).toHaveLength(2);
 });
 it('supports all six recipes in either parent order', () => {
  for (const recipe of RECIPES) {
   expect(recipeFor(...recipe.parents)).toEqual(recipe); expect(recipeFor(...[...recipe.parents].reverse())).toEqual(recipe);
   expect(CATALOG[recipe.result].rank).toBeGreaterThan(Math.max(...recipe.parents.map(id=>CATALOG[id].rank)));
  }
 });
 it('rejects same-art, same-tier nonrecipes, unknown and empty combinations', () => {
  expect(recipeFor(BIRD,BIRD)).toBeNull(); expect(recipeFor(BIRD,KEY)).toBeNull(); expect(recipeFor(null,MAP)).toBeNull(); expect(recipeFor('unknown',MAP)).toBeNull();
  const round=createRound(); expect(mergePieces(round,6,6)).toBeNull(); expect(mergePieces(round,6,0)).toBeNull(); expect(mergePieces(round,-1,6)).toBeNull();
 });
 it('cannot deadlock under any sequence of legal merges and conserves every source clipping', () => {
  let leaves=0,states=0;const seen=new Set();
  const visit=round=>{
   const key=round.board.filter(Boolean).map(t=>t.pieceId).sort().join('|'); if(seen.has(key))return;seen.add(key);states++;
   expect(validRound(round)).toBe(true);
   const pairs=mergePairs(round.board);
   if(!pairs.length){ leaves++;expect(completedFinals(round.board).sort()).toEqual([...FINALS].sort());expect(round.merges).toBe(6); }
   for(const [a,b] of pairs)visit(mergePieces(round,a,b));
  };visit(createRound());expect(states).toBeGreaterThan(20);expect(leaves).toBeGreaterThan(0);
 });
 it('lets either finale be made first and both finish in six merges', () => {
  const routes=[[[BIRD,MAP],[KEY,FERN],['e01_riverwing','e02_frond_key']],[[BIRD,MOON],[CUP,FERN],['e04_crescent_courier','e05_fern_cup']]];
  for(const order of [routes,[...routes].reverse()]) { let r=createRound(); for(const route of order)for(const pair of route)r=make(r,...pair);expect(completedFinals(r.board)).toHaveLength(2);expect(r.merges).toBe(6); }
 });
 it('cuts the selected exact parent instances, including earlier crafted provenance', () => {
  let r=make(createRound(),BIRD,MAP);r=make(r,KEY,FERN);r=make(r,'e01_riverwing','e02_frond_key');
  const index=find(r,'e03_wayfinder_garden');const parents=r.board[index].parents;
  const cut=cutPiece(r,index);expect(cut.board[index]).toBe(parents[0]);expect(cut.board).toContain(parents[1]);expect(validRound(cut)).toBe(true);expect(cutPiece(createRound(),6)).toBeNull();
 });
 it('moves to empty cells without mutating the snapshot or allowing overwrite', () => {
  const r=createRound(),next=movePiece(r,6,0);expect(next.board[0]).toBe(r.board[6]);expect(r.board[6]).not.toBeNull();expect(movePiece(r,6,8)).toBeNull();expect(movePiece(r,6,25)).toBeNull();expect(validRound(next)).toBe(true);
 });
 it('roundtrips progress, history, and discoveries with isolated versioned storage', () => {
  const save=newSave(), round=make(save.round,BIRD,MAP); const s={...save,round,history:[save.round],discoveries:[...save.discoveries,'e01_riverwing'],sound:false};expect(parseSave(JSON.stringify(s))).toEqual(s);
 });
 it('rejects malformed, unsupported and resource-corrupt saves safely', () => {
  expect(parseSave('{')).toBeNull();expect(parseSave('{}')).toBeNull();expect(parseSave(null)).toBeNull();const s=newSave();s.version=100;expect(parseSave(JSON.stringify(s))).toBeNull();
  const corrupt=newSave();corrupt.round.board[0]={pieceId:BIRD,parents:null};expect(parseSave(JSON.stringify(corrupt))).toBeNull();
  const invalid=newSave();invalid.round.board[6]={pieceId:'e01_riverwing',parents:[{pieceId:BIRD,parents:null},{pieceId:KEY,parents:null}]};expect(parseSave(JSON.stringify(invalid))).toBeNull();
 });
 it('keeps discovery counts unique and filters bad history safely', () => {
  const s=newSave();s.discoveries=[...s.discoveries,BIRD,'bad','__proto__','constructor','toString',42];s.history=[{},s.round];const result=parseSave(JSON.stringify(s));expect(result.discoveries).toEqual(STARTERS);expect(result.history).toHaveLength(1);
 });
});
