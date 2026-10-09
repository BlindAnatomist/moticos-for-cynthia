import assert from 'node:assert/strict';
export function noViewWrites(events,key){assert(Array.isArray(events));assert.deepEqual(events.filter(e=>!e.fixture&&(e.op==='clear'||e.key===key)),[],'View-only flow wrote career storage');return true;}
export function exactScope(ids,expected){assert(expected.length>0);assert.equal(new Set(expected).size,expected.length);assert.deepEqual(ids,expected);return true;}
export function retainedTransition(before,after){
 for(const key of ['board','sources','material','xp','coinsEarned','coinsSpent','purchases','milestones','storyCompletions','receipts'])assert.deepEqual(after[key],before[key],key);
 const promises=s=>[...s.orders,...s.heldOrders,...(s.suspendedStory?[s.suspendedStory]:[])];
 for(const o of promises(before))assert.deepEqual(promises(after).find(n=>n.id===o.id),o);
 assert.deepEqual(after.orders.find(o=>o.slot===2),before.orders.find(o=>o.slot===2));assert.deepEqual(after.history,[]);assert.equal(after.revision,before.revision+1);assert.equal(after.chapterId,'cross-currents');
 assert.equal(new Set(promises(after).map(o=>o.id)).size,promises(after).length);return true;
}
export function occupiedProof(proof,expected){
 assert.equal(expected.length,8);assert.equal(new Set(expected).size,8);assert(proof.ready);assert.deepEqual(proof.missing,[]);
 const board=proof.images.filter(i=>i.cell!==null);assert.deepEqual(board.map(i=>i.pieceId).sort(),[...expected].sort());
 for(const i of board){assert(i.ready&&i.complete);for(const dims of [i.natural,i.display])assert(dims?.length===2&&dims.every(n=>Number.isFinite(n)&&n>0));}return true;
}
