import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=JSON.parse(read('stage-d-source.json'));
const patch=JSON.parse(read('stage-e-evidence/career-integration.patch.json'));
test('all accepted source bytes outside the two bounded interaction integration files are unchanged',()=>{
 const allowed=new Set(['src/career/CareerGarden.jsx','src/career/BoardViewport.jsx']);
 for(const row of baseline.files){if(allowed.has(row.file))continue;const current=read(row.file);assert.equal(current.length,row.bytes,row.file);assert.equal(sha(current),row.sha256,row.file);}
});
test('CareerGarden exactly reverses to the accepted source under the declared interaction-only edits',()=>{
 let source=read('src/career/CareerGarden.jsx').toString();
 for(const [before,after] of [...patch.replacements].reverse()){assert.equal(source.split(after).length-1,1,after);source=source.replace(after,before);}
 const row=baseline.files.find(row=>row.file==='src/career/CareerGarden.jsx');
 assert.equal(sha(source),patch.baselineSha256);assert.equal(sha(source),row.sha256);assert.equal(Buffer.byteLength(source),row.bytes);
});
test('BoardViewport changes only its accurate scroll instruction',()=>{
 const source=read('src/career/BoardViewport.jsx').toString().replace('Swipe empty spaces or gaps, or use the arrows to see all five columns.','Swipe or use the arrows to see all five columns.');
 const row=baseline.files.find(row=>row.file==='src/career/BoardViewport.jsx');assert.equal(sha(source),row.sha256);assert.equal(Buffer.byteLength(source),row.bytes);
});
test('touch interception is restricted to occupied cells and ghost is decorative/noninteractive',()=>{
 const css=read('src/career/boardDrag.css').toString(),app=read('src/career/CareerGarden.jsx').toString();assert(css.includes('.career-cell.has-piece{touch-action:none;'));assert(!css.includes('.career-board{'));assert(css.includes('pointer-events:none'));assert(app.includes('aria-hidden="true" style={{left: touchDrag.visual.x'));assert(app.includes('onPointerCancel={touchDrag.cancel} onLostPointerCapture={touchDrag.cancel}'));assert(app.includes('[state.careerId, state.revision, busy, overlay, practice]'));assert(app.includes('onKeyDown={e => boardKey(e, index)}'));
});
