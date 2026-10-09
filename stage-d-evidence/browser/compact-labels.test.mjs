import test from 'node:test';import assert from 'node:assert/strict';
import {compactLabelViolations} from './compact-labels.mjs';
const valid=()=>({fontSize:11,fontFamily:'Arial',minimumTextWidth:52.8,catalog:Array.from({length:320},(_,i)=>({id:String(i),text:'Exact name',width:51.97})),rows:[{id:'drum',text:'Drumskew',left:10,right:62.8,rects:[{left:10.4,right:62.37,y:4}]}]});
test('all 320 names and occupied ranges fit without reducing the native font',()=>assert.deepEqual(compactLabelViolations(valid()),[]));
test('too-wide catalog names, shrunken fonts and missing labels fail',()=>{
  for(const change of [p=>p.catalog[319].width=53,p=>p.catalog[319].width=NaN,p=>p.fontSize=10,p=>p.catalog.pop(),p=>p.catalog[319].id='0']){const p=valid();change(p);assert(compactLabelViolations(p).length);}
});
test('clipped or split occupied words and absent real geometry fail',()=>{
  for(const change of [p=>p.rows[0].rects[0].right=65,p=>p.rows[0].rects[0].right=NaN,p=>p.rows[0].rects.push({left:10,right:20,y:17}),p=>p.rows=[],p=>p.minimumTextWidth=0]){const p=valid();change(p);assert(compactLabelViolations(p).length);}
});
