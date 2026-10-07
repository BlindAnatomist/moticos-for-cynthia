import assert from 'node:assert/strict';
import {matchingViewportViolations} from '../tests/expansion200-browser/shared-helpers.js';
import {verifyRenderedArt} from './expansion200GateRenderedArt.mjs';
export const PROFILE_RENDERING=Object.freeze({'chromium-desktop':{viewport:{width:1280,height:720},scale:1},'webkit-iphone-13':{viewport:{width:390,height:664},scale:3},'webkit-iphone-large':{viewport:{width:430,height:932},scale:3}});
export function verifyGeometry(geometry,viewport,pieceId,assets){
 assert(geometry&&typeof geometry==='object');assert(geometry.shell&&geometry.shell.width>0&&geometry.shell.height>0);for(const key of ['controls','regions','text','artwork'])assert(Array.isArray(geometry[key])&&geometry[key].length>0,`Missing geometry ${key}`);assert.equal(geometry.regions.length,8);
 const cells=geometry.controls.filter(c=>c.cell!==null);assert.deepEqual(cells.map(c=>Number(c.cell)).sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i));
 for(const name of ['Undo','Cut','Hint','Collection','Envelopes','Fresh envelope','How to play'])assert.equal(geometry.controls.filter(c=>c.name===name).length,1,`Missing required control: ${name}`);
 for(const control of geometry.controls)assert.equal(control.hitTests.length,5);assert.deepEqual(matchingViewportViolations(geometry,viewport),[],'Invalid saved geometry');
 const occupied=cells.filter(c=>c.piece!=='empty');assert.equal(geometry.artwork.length,occupied.length);assert(geometry.artwork.some(a=>a.pieceId===pieceId),'Requested earned piece absent from geometry');
 assert.deepEqual(geometry.artwork.map(a=>a.pieceId).sort(),occupied.map(c=>c.piece).sort());for(const art of geometry.artwork)verifyRenderedArt(art,art.pieceId,assets);return geometry;
}
