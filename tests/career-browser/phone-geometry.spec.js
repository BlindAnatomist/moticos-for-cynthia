import {test,expect} from '@playwright/test';
import {CASES,titleFor} from '../../scripts/careerGateScope.mjs';
import {createCareer} from '../../src/career/engine.js';
import {emptyBoard,mixedBoard,threeOrders,ready,allFinal} from './fixtures.mjs';
import * as h from './helpers.mjs';import * as v from './visual-helpers.mjs';
function check(index,fn){const[id,title,timeout]=CASES['career-webkit-phone'][index];test(titleFor(id,title),async({page,context},info)=>{test.setTimeout(timeout);const errors=await v.instrument(context,page);await fn(page,info);expect(errors).toEqual([]);await h.audit(page);});}
check(0,async(page,info)=>{
 await h.open(page);const records=[];
 for(const size of [{width:320,height:568},{width:390,height:664}]){await page.setViewportSize(size);let baseline;
  for(const kind of ['empty','fresh','mixed','full','zero-count','ready-count']){let fixture=kind==='empty'?emptyBoard():kind==='fresh'?createCareer(`phone-fresh-${size.width}`):kind==='mixed'?mixedBoard():kind==='full'?allFinal():threeOrders();const order=kind.endsWith('count')?fixture.orders.find(o=>o.storyLetterId==='garden-letter-8'):null;if(kind==='ready-count')fixture=ready(fixture,order);await h.seed(page,fixture);if(order)await h.focusOrder(page,order.id,true);const geometry=await v.geometry(page,{baseline,mode:'standard-phone',touch:true});baseline??=geometry;const art=kind==='mixed'||kind==='full'?await v.art(page):[];records.push({size,kind,geometry,art});if(kind==='mixed'||size.width===320&&order)await h.snapshot(page,info,`${size.width}-${kind}`);}
 }
 await h.record(info,'phone-grid-and-counts',records);
});
check(1,async(page,info)=>{
 await h.open(page);let fixture=threeOrders(),order=fixture.orders.find(o=>o.storyLetterId==='garden-letter-8');fixture=ready(fixture,order);await h.seed(page,fixture);await h.focusOrder(page,order.id,true);await h.panel(page,'more',true);const before=await h.read(page);await h.changed(page,before,()=>page.getByRole('button',{name:'Use larger text',exact:true}).tap());await h.close(page,true);const geometry=await v.geometry(page,{mode:'large-text',touch:true});await v.art(page);await h.snapshot(page,info,'large-text-counts');await h.record(info,'large-text-grid-counts',geometry);
});
