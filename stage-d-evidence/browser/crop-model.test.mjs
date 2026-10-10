import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EXPANSION320_BOUNDS} from '../../src/matching/expansion320/bounds.js';
import {cropGeometryModel,cropGeometryResidual,verifyCropResidual,verifyCropStyle} from './crop-model.mjs';
const zero={paddingTop:0,paddingRight:0,paddingBottom:0,paddingLeft:0,borderTopWidth:0,borderRightWidth:0,borderBottomWidth:0,borderLeftWidth:0,transform:'none'};
const styles={outer:{...zero},inner:{...zero,maxWidth:'100%',maxHeight:'100%'},image:{transform:'none',position:'absolute',maxWidth:'none'}};
const row=(id='d320-mu1')=>({...EXPANSION320_BOUNDS[id],client:[61,61],content:[60.8,60.8],dpr:3,styles});

test('integer fit is independently clamped per axis by the outer content box',()=>{
 const r=row(),m=cropGeometryModel(r),[x,y,cw,ch]=r.crop;
 assert(Math.abs(m.ideal[0]-61)<1e-12);assert.equal(m.expected[0],60.8);
 assert(Math.abs(m.expected[1]-ch*61/cw)<1e-12); // Height does not inherit the width clamp.
 assert.equal(m.expected[2],1024*60.8/cw);assert(Math.abs(m.expected[3]-1024*61/cw)<1e-12);
 assert.equal(m.expected[4],-x*60.8/cw);assert(Math.abs(m.expected[5]+y*61/cw)<1e-12);
 assert(m.modeledIdealDeviationPhysicalPixels[2]>0.7);
});
test('all forty reviewed crops across integer and fractional boxes and DPRs obey the authored equation',()=>{
 assert.equal(Object.keys(EXPANSION320_BOUNDS).length,40);
 let count=0;
 for(const bounds of Object.values(EXPANSION320_BOUNDS))for(const [w,h] of [[42,42],[61,61],[101,71],[220,180]])for(const fraction of [0,.2,.49])for(const dpr of [1,2,3]){
  const r={...bounds,client:[w,h],content:[w-fraction,h-fraction],dpr,styles},m=cropGeometryModel(r),[sw,sh]=r.source,[x,y,cw,ch]=r.crop,s=Math.min(w/cw,h/ch),fw=Math.min(cw*s,w-fraction),fh=Math.min(ch*s,h-fraction);
  assert.deepEqual(m.expected,[fw,fh,sw*fw/cw,sh*fh/ch,-x*fw/cw,-y*fh/ch]);
  verifyCropResidual({...r,actual:m.expected});count++;
 }
 assert.equal(count,1440);
});
test('integer boxes preserve the old ideal-fit equation',()=>{
 for(const bounds of Object.values(EXPANSION320_BOUNDS)){
  const m=cropGeometryModel({...bounds,client:[61,61],content:[61,61],dpr:3});
  for(let i=0;i<6;i++)assert(Math.abs(m.expected[i]-m.ideal[i])<1e-12);
 }
});
test('recorded Mushroom failure is reproduced without pretending unavailable outer measurements were recorded',()=>{
 const r=row(),oldWidth=61*1024/781,observedWidth=79.703125;
 assert.equal(oldWidth-observedWidth,0.2763884443021709);
 // 60.8 is a synthetic containing box, not a recovered measurement from that run.
 const m=cropGeometryResidual({...r,actual:[...cropGeometryModel(r).expected.slice(0,2),observedWidth,79.96875,...cropGeometryModel(r).expected.slice(4)]});
 assert(Math.max(...m.errors)<.03);assert(m.observedIdealDeviationPhysicalPixels[2]>.8);
});
test('all eighty original Chromium coordinate rows remain within the unchanged residual gate',()=>{
 const rows=JSON.parse(fs.readFileSync(new URL('./crop-model.chromium.json',import.meta.url)));
 assert.equal(rows.length,80);assert.equal(new Set(rows.map(r=>r.pieceId)).size,40);
 for(const r of rows){
  assert.deepEqual(r.source,EXPANSION320_BOUNDS[r.pieceId].source);assert.deepEqual(r.crop,EXPANSION320_BOUNDS[r.pieceId].crop);
  // Old artifacts saved expected integer fit but no outer-box metrics. Infer only
  // its limiting integer dimension; do not claim this is a new live clamp proof.
  const [fw,fh]=r.expected,client=[Math.ceil(fw-1e-9),Math.ceil(fh-1e-9)];
  const m=verifyCropResidual({...r,client,content:client,dpr:1,styles});
  for(let i=0;i<6;i++)assert(Math.abs(m.ideal[i]-r.expected[i])<1e-9);
 }
});
test('wrong image size, offset, nonfinite input and excessive physical error fail closed',()=>{
 const r=row(),good=cropGeometryModel(r).expected;
 for(const index of [0,1,2,3,4,5]){const actual=[...good];actual[index]+=.126;assert.throws(()=>verifyCropResidual({...r,actual}));}
 assert.throws(()=>cropGeometryModel({...r,content:[NaN,61]}));
 assert.throws(()=>cropGeometryModel({...r,crop:[0,0,2048,576]}));
 assert.throws(()=>cropGeometryModel({...r,client:[60.8,61]}));
 assert.throws(()=>verifyCropResidual({...r,dpr:10,actual:good.map((v,i)=>v+(i===2?.11:0))}));
});
test('style changes cannot be absorbed into the crop model',()=>{
 verifyCropStyle(styles);
 for(const [name,key,value] of [['outer','paddingLeft',1],['inner','borderTopWidth',1],['inner','maxWidth','none'],['inner','maxHeight','99%'],['outer','transform','matrix(1,0,0,1,0,0)'],['image','position','relative'],['image','maxWidth','100%']]){
  assert.throws(()=>verifyCropStyle({...styles,[name]:{...styles[name],[key]:value}}));
 }
});
