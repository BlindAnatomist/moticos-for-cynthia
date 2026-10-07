import assert from 'node:assert/strict';
import {POSTCARD_VIEWPORTS,verifyPostcardState} from './expansion200PostcardEvidence.mjs';
export {POSTCARD_VIEWPORTS};
const finite=r=>r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0;
const inside=(r,b)=>finite(r)&&finite(b)&&r.x>=b.x-.5&&r.y>=b.y-.5&&r.x+r.width<=b.x+b.width+.5&&r.y+r.height<=b.y+b.height+.5;
const separate=(a,b)=>a.x+a.width<=b.x+.5||b.x+b.width<=a.x+.5||a.y+a.height<=b.y+.5||b.y+b.height<=a.y+.5;
export function verifyFocusedPostcardState(state,viewport,pieceName,view){
 const result=verifyPostcardState(state,viewport,pieceName,view);assert.equal(state.image.objectFit,'contain','Postcard artwork must remain uncropped');assert.equal(state.image.objectPosition,'50% 50%','Postcard source must remain centered');assert(POSTCARD_VIEWPORTS.some(v=>v.width===viewport.width&&v.height===viewport.height));
 const screen={x:0,y:0,...viewport},h=state.heading,back=state.controls.find(c=>c.name==='Back to board');assert(h&&back,'Missing dialog heading or Back action');
 assert.equal(h.text,'Your correspondence');assert(inside(state.header,state.dialog)&&inside(state.header,screen),'Header outside bounded dialog');assert(inside(h.rect,state.header)&&inside(h.textRect,h.rect)&&inside(h.textRect,screen),'Heading glyphs clipped');
 assert.equal(h.visible,true);assert.equal(h.unclipped,true);assert.equal(h.centerHit,true);assert.equal(h.hitTests.length,5);assert(h.hitTests.every(hit=>hit===true),'Heading obscured');assert(inside(back.rect,state.header),'Back button outside header');assert(separate(h.rect,back.rect)&&separate(h.textRect,back.rect),'Heading overlaps Back button');
 for(const c of state.controls.filter(c=>view==='actions'||c.name==='Back to board'))assert(inside(c.textRect,c.rect)&&inside(c.textRect,screen),'Action text clipped');
 return{...result,heading:h.text,header:state.header,headingRect:h.rect,headingTextRect:h.textRect,backRect:back.rect};
}
