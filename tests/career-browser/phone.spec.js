import {test,expect} from '@playwright/test';
import {CASES,titleFor} from '../../scripts/careerGateScope.mjs';
import {PHONE_VIEWPORTS} from '../../scripts/careerLayoutContract.mjs';
import {createCareer} from '../../src/career/engine.js';
import {CATALOG} from '../../src/career/content.js';
import {route,threeOrders,ready,allArt,allFinal} from './fixtures.mjs';
import * as h from './helpers.mjs';
const cases=CASES['career-webkit-phone'];
function check(index,fn){const[id,title,timeout]=cases[index];test(titleFor(id,title),async({page,context},info)=>{const args={page,context};test.setTimeout(timeout);await h.instrumentation(context);const errors=[];page.on('pageerror',e=>errors.push(String(e)));await fn(args,info);expect(errors).toEqual([]);await h.audit(page);});}
check(0,async({page},info)=>{
 await h.open(page);await h.noOverflow(page,{touch:true});let s=await h.read(page);s=await h.send(page,s.orders[0],true);expect([s.xp,s.coinsEarned]).toEqual([10,5]);expect(s.discoveries).toContain('b2');await h.noOverflow(page,{touch:true});
 await h.panel(page,'postcard',true);await expect(page.locator('.career-postcard img')).toBeVisible();await h.snapshot(page,info,'first-postcard');await h.noOverflow(page,{touch:true,mode:'panel'});await h.close(page,true);await h.noOverflow(page,{touch:true});
 const before=await h.bytes(page);await page.reload();expect(await h.bytes(page)).toBe(before);await h.record(info,'first-delivery',s);
});
check(1,async({page},info)=>{
 await h.open(page);await h.seed(page,route(5));await h.buy(page,'bird-sorter',true);const geometry=[];
 for(const tier of [1,1,2]){let s=await h.read(page),to=s.board.findIndex(t=>!t);let id;[s,id]=await h.draw(page,'bird',{to,touch:true});expect(s.board[to].id).toBe(id);expect(CATALOG.pieceOf(s.board[to].pieceId).tier).toBe(tier);geometry.push(await h.noOverflow(page,{touch:true}));}
 const before=await h.read(page);await h.draw(page,'bird',{basic:true,touch:true});expect((await h.read(page)).sources).toEqual(before.sources);await h.undo(page,true);await page.reload();expect((await h.read(page)).board).toEqual(before.board);geometry.push(await h.noOverflow(page,{touch:true}));
 let s=await h.read(page);if(!s.board.some(t=>CATALOG.pieceOf(t?.pieceId)?.tier>=3))s=(await h.make(page,'b3',true))[0];const at=s.board.findIndex(t=>CATALOG.pieceOf(t?.pieceId)?.tier>=3);await page.locator(`[data-career-cell="${at}"]`).tap();geometry.push(await h.noOverflow(page,{touch:true}));await page.getByRole('button',{name:'Recycle',exact:true}).tap();await h.noOverflow(page,{touch:true,mode:'panel'});await page.getByRole('button',{name:'Keep picture'}).tap();expect((await h.read(page)).board).toEqual(s.board);await page.getByRole('button',{name:'Recycle',exact:true}).tap();await h.changed(page,s,()=>page.getByRole('button',{name:'Recycle picture',exact:true}).tap());
 const fixture=ready(route(5));await h.seed(page,fixture);await h.send(page,fixture.orders[0],true);geometry.push(await h.noOverflow(page,{touch:true}));const sent=await h.bytes(page);await page.reload();expect(await h.bytes(page)).toBe(sent);await h.record(info,'touch-operations',{state:await h.read(page),geometry});
 await h.seed(page,allArt());await page.getByRole('button',{name:'Hint',exact:true}).tap();await expect(page.locator('.career-status-short')).toHaveText('No pair · add free supply or Cut');await h.noOverflow(page,{touch:true});await h.seed(page,allFinal());await page.getByRole('button',{name:'Hint',exact:true}).tap();await expect(page.locator('.career-status-short')).toHaveText('No pair · Recycle to make room');const fullBytes=await h.bytes(page);await page.locator('.career-producer.bird .career-supply').tap();await expect(page.locator('.career-status-short')).toHaveText('Board full · merge or Recycle first');expect(await h.bytes(page)).toBe(fullBytes);await h.noOverflow(page,{touch:true});
});
check(2,async({page},info)=>{
 await h.open(page);const records=[],mixed=[];
 for(const size of PHONE_VIEWPORTS){await page.setViewportSize(size);for(const kind of ['fresh','three']){
  let fixture=kind==='fresh'?createCareer(`fixture-phone-${size.width}-${size.height}`):threeOrders();const selected=kind==='three'?fixture.orders.find(o=>o.storyLetterId==='garden-letter-8'):null;if(selected)fixture=ready(fixture,selected);
  await h.seed(page,fixture);await expect(page.locator('.career-shell')).not.toHaveClass(/is-large-text/);if(selected){expect(fixture.orders.length).toBe(3);expect(fixture.orders[0].id).not.toBe(selected.id);await h.panel(page,'orders',true);await expect(page.locator('.career-order-choices .career-order')).toHaveCount(3);await h.noOverflow(page,{touch:true,mode:'panel'});const choice=page.locator('.career-order-choices>section').filter({has:page.locator(`[data-order-id="${selected.id}"]`)});await choice.getByRole('button',{name:'Show this on my board',exact:true}).tap();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.career-mobile-orders-button')).toBeFocused();await expect(page.locator('.career-mobile-order-strip')).toHaveAttribute('data-order-id',selected.id);expect(await page.locator('.career-mobile-order-strip [data-target-piece-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.targetPieceId))).toEqual(selected.requirements.map(r=>r.pieceId));}
  const geometry=await h.noOverflow(page,{touch:true});records.push({size,kind,...geometry});await h.snapshot(page,info,`${size.width}x${size.height}-${kind}`);
  if(selected){const sent=await h.changed(page,fixture,()=>page.locator('.career-mobile-send').tap());expect(sent.receipts.at(-1).id).toBe(selected.id);expect(sent.xp-fixture.xp).toBe(selected.xp);expect(sent.coinsEarned-fixture.coinsEarned).toBe(selected.coins);records.push({size,kind:'selected-order-sent',...await h.noOverflow(page,{touch:true})});}
 }
 // All tiers, not just starter scraps, must remain readable without scrolling.
 await h.seed(page,allArt());mixed.push({size,geometry:await h.noOverflow(page,{touch:true}),art:await h.imageProof(page)});if(size.width===320)await h.snapshot(page,info,'320x568-mixed-art');
 }
 await h.record(info,'phone-geometry',records);await h.record(info,'mixed-tier-phone-art',mixed);
});
check(3,async({page},info)=>{
 await h.open(page);await h.panel(page,'more',true);await expect(page.locator('.career-large-text-explanation')).toContainText('Larger text may scroll');const before=await h.read(page);await h.changed(page,before,()=>page.getByRole('button',{name:'Use larger text',exact:true}).tap());await h.close(page,true);await page.reload();await expect(page.locator('.career-shell')).toHaveClass(/is-large-text/);expect((await h.read(page)).largeText).toBe(true);
 await h.record(info,'phone-large-text',await h.noOverflow(page,{touch:true,mode:'large-text'}));await h.snapshot(page,info,'large-text');
 for(const type of ['collection','shop','orders']){await h.panel(page,type,true);await h.noOverflow(page,{touch:true,mode:'panel'});await h.close(page,true);await expect(page.locator(type==='orders'?'.career-mobile-orders-button':'.career-mobile-more-button')).toBeFocused();}
 expect((await h.read(page)).sound).toBe(false);await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.career-cell').first().evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');await page.reload();await expect(page.locator('.career-shell')).toHaveClass(/is-large-text/);
});
