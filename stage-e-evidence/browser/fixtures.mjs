import assert from 'node:assert/strict';
import * as E from '../../src/career/engine.js';
export {E};
export function action(state,input){const result=E.reduceCareer(state,E.commandFor(state,input));assert.equal(result.ok,true,result.message);E.validateCareer(result.state);return result.state;}
export function moveAction(state,from,to){return {type:'move',from,to,tileId:state.board[from]?.id,targetTileId:state.board[to]?.id??null};}
export function fixture({large=false}={}){let state=E.createCareer('stage-e-trusted-fixture');if(large)state=action(state,{type:'large-text',enabled:true});return state;}
