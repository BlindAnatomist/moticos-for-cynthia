import {test,expect} from '@playwright/test';
import {CASES,titleFor} from '../../scripts/careerGateScope.mjs';
import {createCareer} from '../../src/career/engine.js';
import {emptyBoard,mixedBoard,threeOrders,allFinal} from './fixtures.mjs';
import * as h from './helpers.mjs';import * as v from './visual-helpers.mjs';
function check(index,fn){const[id,title,timeout]=CASES['career-chromium'][index];test(titleFor(id,title),async({page,context},info)=>{test.setTimeout(timeout);const errors=await v.instrument(context,page);await fn(page,info);expect(errors).toEqual([]);await h.audit(page);});}
check(0,async(page,info)=>{
 await h.open(page);const records=[];
 for(const size of [{width:1366,height:768},{width:1440,height:900}]){await page.setViewportSize(size);let baseline;
  for(const kind of ['empty','fresh','three','mixed','full']){const fixture=kind==='empty'?emptyBoard():kind==='fresh'?createCareer(`desktop-fresh-${size.width}`):kind==='three'?threeOrders():kind==='full'?allFinal():mixedBoard();await h.seed(page,fixture);const geometry=await v.geometry(page,{baseline});baseline??=geometry;const art=fixture.board.some(Boolean)?await v.art(page):[];records.push({size,kind,geometry,art});if(kind!=='empty'&&kind!=='full')await h.snapshot(page,info,`${size.width}-${kind}`);}
 }
 await h.record(info,'equal-track-states',records);
});
check(1,async(page,info)=>{
 await h.open(page);await h.seed(page,emptyBoard());const baseline=await v.geometry(page),records=[];let s,a,b;[s,a]=await h.draw(page,'bird');records.push({step:'first-draw',geometry:await v.geometry(page,{baseline}),art:await v.art(page)});[s,b]=await h.draw(page,'bird');records.push({step:'second-draw',geometry:await v.geometry(page,{baseline}),art:await v.art(page)});[s,a]=await h.merge(page,a,b);records.push({step:'merge',geometry:await v.geometry(page,{baseline}),art:await v.art(page)});const at=s.board.findIndex(t=>t?.id===a);await page.locator(`[data-career-cell="${at}"]`).click();s=await h.changed(page,s,()=>page.getByRole('button',{name:'Cut',exact:true}).click());records.push({step:'cut',geometry:await v.geometry(page,{baseline}),art:await v.art(page)});const from=s.board.findIndex(Boolean);await page.locator(`[data-career-cell="${from}"]`).click();s=await h.changed(page,s,()=>page.locator('[data-career-cell="24"]').click());records.push({step:'move',geometry:await v.geometry(page,{baseline}),art:await v.art(page)});await h.undo(page);records.push({step:'undo',geometry:await v.geometry(page,{baseline}),art:await v.art(page)});await h.snapshot(page,info,'after-operations');
 await h.seed(page,mixedBoard());await h.panel(page,'help');s=await h.read(page);await h.changed(page,s,()=>page.getByRole('button',{name:'Use larger text',exact:true}).click());await h.close(page);records.push({step:'large-text',geometry:await v.geometry(page,{mode:'large-text'}),art:await v.art(page)});await h.snapshot(page,info,'large-text');await h.record(info,'stable-track-actions',records);
});
