// Synthetic DOM/page fixtures only; these tests never launch a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {deflateSync} from 'node:zlib';
import {settleCaptureLayout,inspectCaptureGeometry,verifyCaptureGeometry,captureFullPage,captureViewportModal,inspectModalCaptureGeometry} from './capture-geometry.mjs';

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

function modalObservation(){return{selector:'.career-dialog',rect:{left:10,top:10,right:310,bottom:558,width:300,height:548},scrollLeft:0,scrollTop:700,scrollWidth:298,scrollHeight:1300,clientWidth:298,clientHeight:546,overflowY:'auto',documentScroll:{x:0,y:0},scrollport:{left:11,top:11,right:309,bottom:557},targets:[{selector:'.last-source',rect:{left:20,top:350,right:290,bottom:450,width:270,height:100}},{selector:'.back',rect:{left:20,top:470,right:290,bottom:530,width:270,height:60}}]};}
const modalGeometry=()=>{const before={...observation(),modal:modalObservation()};return{...geometry(before),captureKind:'viewport-modal'};};

test('viewport modal dimensions use viewport and DPR without hiding document overflow',()=>{
 const g=modalGeometry();assert.deepEqual(verifyCaptureGeometry(g),[960,1704]);
 g.before.root.scrollWidth=321;g.after=structuredClone(g.before);assert.throws(()=>verifyCaptureGeometry(g),/horizontal page overflow/);
});

test('modal descendant movement of 33px fails even when document dimensions are identical',()=>{
 const g=modalGeometry();for(const key of ['top','bottom'])g.after.modal.targets[1].rect[key]+=33;
 assert.throws(()=>verifyCaptureGeometry(g),/geometry changed/);
});

test('modal target clipping, modal scroll changes and missing targets fail',()=>{
 const clipped=modalGeometry();clipped.before.modal.targets[1].rect.bottom=580;clipped.after=structuredClone(clipped.before);assert.throws(()=>verifyCaptureGeometry(clipped),/bottom is clipped/);
 const scrolled=modalGeometry();scrolled.after.modal.scrollTop++;assert.throws(()=>verifyCaptureGeometry(scrolled),/geometry changed/);
 const missing=modalGeometry();missing.before.modal.targets=[];missing.after=structuredClone(missing.before);assert.throws(()=>verifyCaptureGeometry(missing),/explicit framing targets/);
 const kind=modalGeometry();kind.captureKind='arbitrary';assert.throws(()=>verifyCaptureGeometry(kind),/Unknown capture kind/);
 const unmarked=modalGeometry();delete unmarked.captureKind;assert.throws(()=>verifyCaptureGeometry(unmarked),/must declare viewport-modal/);
});

function fakeModalPage(g,bytes){
 const calls=[];let observations=0;
 return{calls,evaluate:async(fn,options)=>{calls.push(fn.name);if(fn===settleCaptureLayout)return;if(fn===inspectCaptureGeometry){const {modal,...document}=structuredClone(observations===0?g.before:g.after);return document;}if(fn===inspectModalCaptureGeometry){assert.deepEqual(options,{selector:'.career-dialog',targets:['.last-source','.back']});return structuredClone(observations++===0?g.before.modal:g.after.modal);}throw Error('Unexpected evaluation');},screenshot:async options=>{calls.push('screenshot');assert.deepEqual(options,{path:options.path,fullPage:false});fs.writeFileSync(options.path,bytes,{flag:'wx'});}};
}
const modalOptions=page=>({modal:{selector:'.career-dialog',targets:['.last-source','.back']},frame:async()=>{page.calls.push('frame');}});

test('viewport capture settles before final framing and only reads geometry around one screenshot',async()=>temporary(async path=>{
 const g=modalGeometry(),bytes=png(960,1704),page=fakeModalPage(g,bytes),result=await captureViewportModal(page,path,modalOptions(page));
 assert.deepEqual(page.calls,['settleCaptureLayout','frame','inspectCaptureGeometry','inspectModalCaptureGeometry','screenshot','inspectCaptureGeometry','inspectModalCaptureGeometry']);
 assert.deepEqual(result,{dimensions:[960,1704],geometry:g});assert.deepEqual(JSON.parse(fs.readFileSync(path+'.geometry.json')),g);assert.deepEqual(fs.readFileSync(path),bytes);
 await assert.rejects(captureViewportModal(page,path,modalOptions(page)),/cannot be replaced/);
}));

test('viewport capture retains original PNG and observations when descendants shift during screenshot',async()=>temporary(async path=>{
 const g=modalGeometry();g.after.modal.targets[1].rect.top+=33;g.after.modal.targets[1].rect.bottom+=33;
 const bytes=png(960,1704),page=fakeModalPage(g,bytes);await assert.rejects(captureViewportModal(page,path,modalOptions(page)),/geometry changed/);
 assert.deepEqual(JSON.parse(fs.readFileSync(path+'.geometry.json')),g);assert.deepEqual(fs.readFileSync(path),bytes);assert.equal(page.calls.filter(c=>c==='screenshot').length,1);
}));

test('viewport mode rejects a full-document PNG and fails clipped framing before taking a shot',async()=>{
 await temporary(async path=>{const g=modalGeometry(),page=fakeModalPage(g,png(960,3063));await assert.rejects(captureViewportModal(page,path,modalOptions(page)));assert(fs.existsSync(path+'.geometry.json'));});
 await temporary(async path=>{const g=modalGeometry();g.before.modal.targets[1].rect.bottom=580;g.after=structuredClone(g.before);const page=fakeModalPage(g,png(960,1704));await assert.rejects(captureViewportModal(page,path,modalOptions(page)),/clipped/);assert(!page.calls.includes('screenshot'));});
 await temporary(async path=>{await assert.rejects(captureViewportModal({},path,{modal:{selector:'.career-dialog',targets:['.back']}}),/final framing/);});
});

test('modal browser inspector records descendant bounds and scroll without scrolling or focusing',()=>{
 const g=modalObservation(),calls=[],element=rect=>({getBoundingClientRect(){calls.push('rect');return rect;},scrollIntoView(){throw Error('Must not scroll while observing');},focus(){throw Error('Must not focus while observing');}}),targets=new Map(g.targets.map(t=>[t.selector,element(t.rect)]));
 const dialog={...element(g.rect),scrollTop:g.scrollTop,scrollLeft:g.scrollLeft,scrollWidth:g.scrollWidth,scrollHeight:g.scrollHeight,clientWidth:g.clientWidth,clientHeight:g.clientHeight,clientLeft:1,clientTop:1,querySelectorAll:selector=>targets.has(selector)?[targets.get(selector)]:[]};
 const context={document:{querySelectorAll:selector=>selector==='.career-dialog'?[dialog]:[]},getComputedStyle:()=>({overflowY:'auto'}),scrollX:0,scrollY:0,options:{selector:'.career-dialog',targets:['.last-source','.back']}};
 const inspect=()=>JSON.parse(JSON.stringify(vm.runInNewContext(`(${inspectModalCaptureGeometry.toString()})(options)`,context)));
 assert.deepEqual(inspect(),g);assert.equal(calls.length,4);
 context.options.targets=['.missing'];assert.throws(inspect,/exactly one descendant/);
 context.options.selector='.missing';assert.throws(inspect,/exactly one dialog/);
});
