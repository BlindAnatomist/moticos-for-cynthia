import assert from 'node:assert/strict';
export const POSTCARD_VIEWPORTS=Object.freeze([{width:320,height:568},{width:390,height:664},{width:430,height:752}]);
const rectOK=(r,v)=>r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0&&r.x>=-.5&&r.y>=-.5&&r.x+r.width<=v.width+.5&&r.y+r.height<=v.height+.5;
export function verifyPostcardState(state,viewport,pieceName,view){
 assert(['art','actions'].includes(view));assert.deepEqual(state.viewport,viewport);assert.equal(state.dialogCount,1);assert.equal(state.modal,true);assert.equal(state.bodyOverflow,'hidden');assert.equal(state.pageScrollX,0);assert.equal(state.pageScrollY,0);for(const size of [state.documentWidth,state.documentHeight])assert(Number.isFinite(size)&&size>0,'Malformed document dimensions');assert(state.documentWidth<=viewport.width+1);assert(state.documentHeight<=viewport.height+1);assert(rectOK(state.dialog,viewport));
 assert.equal(state.title,pieceName);assert.equal(state.image.complete,true);assert.equal(state.image.naturalWidth,768);assert.equal(state.image.naturalHeight,768);
 const required=view==='art'?[state.image,state.caption]:[];
 for(const item of required){assert(rectOK(item.rect,viewport),'Postcard art/title clipped by viewport');assert.equal(item.visible,true);assert.equal(item.unclipped,true);assert.equal(item.centerHit,true);assert.equal(item.hitTests.length,5);assert(item.hitTests.every(hit=>hit===true),'Postcard art/title occluded');}
 assert.deepEqual(state.controls.map(c=>c.name).sort(),['Back to board','Download postcard','Share postcard'].sort());
 if(view==='art'){const r=state.caption.rect,t=state.caption.textRect;assert(rectOK(t,viewport));assert(t.x>=r.x-1&&t.y>=r.y-1&&t.x+t.width<=r.x+r.width+1&&t.y+t.height<=r.y+r.height+1,'Postcard title text clipped');for(const size of [state.caption.scrollWidth,state.caption.clientWidth])assert(Number.isFinite(size)&&size>0,'Malformed caption scroll geometry');assert(state.caption.scrollWidth<=state.caption.clientWidth+1);}
 const controls=view==='art'?state.controls.filter(c=>c.name==='Back to board'):state.controls;
 assert.deepEqual(controls.map(c=>c.name).sort(),view==='art'?['Back to board']:['Back to board','Download postcard','Share postcard'].sort());
 for(const control of controls){assert(rectOK(control.rect,viewport),'Postcard action outside viewport');assert(control.rect.width>=44&&control.rect.height>=44);assert.equal(control.enabled,true);assert.equal(control.visible,true);assert.equal(control.unclipped,true);assert.equal(control.centerHit,true);assert.equal(control.hitTests.length,5);assert(control.hitTests.every(hit=>hit===true),'Postcard action partly occluded');}
 // An optional enlarged card may scroll inside its bounded dialog. The board
 // and outer page must remain one screen; art and action views are explicit.
 assert(Number.isFinite(state.dialogScrollTop)&&state.dialogScrollTop>=0);if(view==='art')assert.equal(state.dialogScrollTop,0);
 return {view,viewport,title:state.title,dialogScrollTop:state.dialogScrollTop};
}

export function verifyMixedInteractionState(state,envelope,kind){
 assert(['selected','hint'].includes(kind));assert.equal(state.kind,kind);assert.deepEqual(state.viewport,{width:320,height:568});assert.equal(state.board.length,25);assert(state.board.every(id=>id==='empty'||envelope.pieceIds.includes(id)));
 const expected=envelope.starters.flatMap(id=>[id,id,...[2,3,4].map(tier=>id.slice(0,-1)+tier)]);assert.deepEqual(state.board.filter(id=>id!=='empty').sort(),expected.sort());assert.match(state.saveSha256,/^[a-f0-9]{64}$/);
 for(const name of ['selected','matches','hints','pressed']){assert(Array.isArray(state[name]));assert.equal(new Set(state[name].map(item=>item.index)).size,state[name].length);for(const item of state[name]){assert(Number.isSafeInteger(item.index)&&item.index>=0&&item.index<25);assert.equal(state.board[item.index],item.id);}}
 if(kind==='selected'){assert.equal(state.selected.length,1);assert.deepEqual(state.pressed,state.selected);assert.equal(state.matches.length,1);assert.notEqual(state.matches[0].index,state.selected[0].index);assert.equal(state.matches[0].id,state.selected[0].id);assert(envelope.starters.includes(state.selected[0].id));assert.equal(state.hints.length,0);}
 else{assert.equal(state.selected.length,0);assert.equal(state.pressed.length,0);assert.equal(state.matches.length,0);assert.equal(state.hints.length,2);assert.equal(state.hints[0].id,state.hints[1].id);assert(envelope.starters.includes(state.hints[0].id));}
 return{kind,saveSha256:state.saveSha256,board:state.board};
}
