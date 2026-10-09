// Synthetic DOM/page fixtures only; these tests never launch a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {deflateSync} from 'node:zlib';
import {settleCaptureLayout,inspectCaptureGeometry,verifyCaptureGeometry,captureFullPage} from './capture-geometry.mjs';

const metrics=(height=1021)=>({scrollWidth:320,scrollHeight:height,offsetWidth:320,offsetHeight:height,clientWidth:320,clientHeight:568});
const observation=()=>({viewport:{width:320,height:568,dpr:3},fonts:'loaded',body:metrics(),root:metrics()});
const geometry=before=>({schemaVersion:1,before,after:structuredClone(before)});
function png(width,height){
 const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;};
 const chunk=(name,b)=>{const all=Buffer.alloc(12+b.length);all.writeUInt32BE(b.length);all.write(name,4);b.copy(all,8);all.writeUInt32BE(crc(all.subarray(4,8+b.length)),8+b.length);return all;};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((1+width*4)*height))),chunk('IEND',Buffer.alloc(0))]);
}
function fakePage(before,after,bytes){
 const calls=[];let inspections=0;
 return {calls,evaluate:async fn=>{calls.push(fn.name);if(fn===settleCaptureLayout)return;if(fn===inspectCaptureGeometry)return structuredClone(inspections++===0?before:after);throw Error('Unexpected evaluation');},screenshot:async options=>{calls.push('screenshot');assert.equal(options.fullPage,true);fs.writeFileSync(options.path,bytes,{flag:'wx'});}};
}
async function temporary(fn){const root=fs.mkdtempSync(join(os.tmpdir(),'moticos-capture-geometry-'));try{return await fn(join(root,'native.png'));}finally{fs.rmSync(root,{recursive:true,force:true});}}

test('full-document height uses every body/root scroll, offset and client extent',()=>{
 for(const element of ['body','root'])for(const key of ['scrollHeight','offsetHeight','clientHeight']){
  const before=observation();before.body=metrics(1008);before.root=metrics(1008);before[element][key]=1021;
  assert.deepEqual(verifyCaptureGeometry(geometry(before)),[960,3063],`${element}.${key}`);
 }
});

test('browser inspector records independent DOM metrics, viewport and font readiness',()=>{
 const before=observation();
 const result=vm.runInNewContext(`(${inspectCaptureGeometry.toString()})()`,{innerWidth:320,innerHeight:568,devicePixelRatio:3,document:{body:before.body,documentElement:before.root,fonts:{status:'loaded'}}});
 assert.deepEqual(JSON.parse(JSON.stringify(result)),before);
});

test('settling waits for fonts, removes no-op style, flushes layout and waits two frames',async()=>{
 const calls=[],style={set textContent(value){assert.equal(value,'body {}');calls.push('style text');},remove(){calls.push('remove');}};
 const document={fonts:{get ready(){calls.push('fonts');return Promise.resolve();}},createElement(tag){assert.equal(tag,'style');calls.push('create');return style;},head:{appendChild(node){assert.equal(node,style);calls.push('append');}},documentElement:{getBoundingClientRect(){calls.push('layout');}}};
 await vm.runInNewContext(`(${settleCaptureLayout.toString()})()`,{document,requestAnimationFrame:cb=>{calls.push('frame');cb();}});
 assert.deepEqual(calls,['fonts','create','style text','append','layout','remove','layout','fonts','frame','frame','layout']);
});

test('one stable capture requires exact PNG extent and retains both geometry observations',async()=>temporary(async path=>{
 const before=observation(),bytes=png(960,3063),page=fakePage(before,before,bytes),result=await captureFullPage(page,path);
 assert.deepEqual(page.calls,['settleCaptureLayout','inspectCaptureGeometry','screenshot','inspectCaptureGeometry']);
 assert.deepEqual(result,{dimensions:[960,3063],geometry:geometry(before)});
 assert.deepEqual(JSON.parse(fs.readFileSync(path+'.geometry.json')),result.geometry);assert.deepEqual(fs.readFileSync(path),bytes);
 await assert.rejects(captureFullPage(page,path),/Original capture evidence cannot be replaced/);
 assert.equal(page.calls.filter(c=>c==='screenshot').length,1);
}));

test('a 13px layout change during capture fails even if the PNG matches the later DOM',async()=>temporary(async path=>{
 const before=observation();before.body=metrics(1008);before.root=metrics(1008);
 const after=observation(),bytes=png(960,3063),page=fakePage(before,after,bytes);
 await assert.rejects(captureFullPage(page,path),/Document geometry changed during the single screenshot capture/);
 assert.equal(page.calls.filter(c=>c==='screenshot').length,1);
 assert.deepEqual(JSON.parse(fs.readFileSync(path+'.geometry.json')),{schemaVersion:1,before,after});assert.deepEqual(fs.readFileSync(path),bytes);
}));

test('a stable DOM cannot authorize an incorrect PNG height',async()=>temporary(async path=>{
 const before=observation(),page=fakePage(before,before,png(960,3024));
 await assert.rejects(captureFullPage(page,path));
 assert.equal(page.calls.filter(c=>c==='screenshot').length,1);assert(fs.existsSync(path+'.geometry.json'));
}));

test('horizontal page overflow is rejected rather than absorbed into expected PNG width',()=>{
 for(const element of ['body','root'])for(const key of ['scrollWidth','offsetWidth','clientWidth']){
  const before=observation();before[element][key]=321;
  assert.throws(()=>verifyCaptureGeometry(geometry(before)),/must not conceal horizontal page overflow/);
 }
});

test('unready fonts, viewport changes, invalid metrics and undersized extents cannot pass',()=>{
 const loading=observation();loading.fonts='loading';assert.throws(()=>verifyCaptureGeometry(geometry(loading)),/fonts must be settled/);
 const changed=geometry(observation());changed.after.viewport.height++;assert.throws(()=>verifyCaptureGeometry(changed),/geometry changed/);
 const invalid=observation();invalid.root.offsetHeight=NaN;assert.throws(()=>verifyCaptureGeometry(geometry(invalid)),/Invalid document metric/);
 const short=observation();for(const e of [short.body,short.root])for(const k of ['scrollHeight','offsetHeight','clientHeight'])e[k]=567;assert.throws(()=>verifyCaptureGeometry(geometry(short)),/include the viewport/);
});
