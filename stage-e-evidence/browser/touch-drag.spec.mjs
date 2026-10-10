import {test,expect} from '@playwright/test';
import {CASES} from './scope.mjs';
import {fixture,action,moveAction} from './fixtures.mjs';
import * as h from './helpers.mjs';
const title=id=>CASES.find(r=>r[0]===id).slice(0,2).join(' '),chromium=info=>info.project.name.endsWith('chromium');
test.beforeEach(async({page,context})=>{await h.instrument(context);await h.base.open(page);await h.seed(page,fixture());});
test.afterEach(async({page},info)=>{let error=info.error;try{await h.base.audit(page);}catch(e){error??=e;}await h.finish(page,info,error);if(error&&!info.error)throw error;});

test(title('E01'),async({page},info)=>{
 const input=await h.driver(page,info);let before=await h.base.read(page),start=await h.checkpoint(page);
 await h.step(page,input.kind+' direct occupied-to-empty drag',async()=>{
  await h.glide(input,await h.point(page,0),await h.point(page,4));await expect(page.locator('.career-drag-ghost')).toHaveCount(1);await expect(h.cell(page,4)).toHaveClass(/is-touch-drop-target/);expect(await h.base.read(page)).toEqual(before);expect(await h.writes(page,start)).toEqual([]);
  if(chromium(info))await h.shot(page,info,'E01-drag-feedback.png');await input.up();
 });
 let after=await h.accepted(page,before,moveAction(before,0,4),start);if(chromium(info)){await h.requireTrusted(page,'pointermove','touch');await h.shot(page,info,'E01-move-result.png');}
 start=await h.checkpoint(page);await page.reload();await expect.poll(()=>h.base.read(page)).toEqual(after);expect(await h.writes(page,start)).toEqual([]);
 before=after;start=await h.checkpoint(page);await page.getByRole('button',{name:'Undo',exact:true}).tap();after=await h.accepted(page,before,{type:'undo'},start);expect(after.board).toEqual(fixture().board);
 before=after;start=await h.checkpoint(page);await h.step(page,input.kind+' occupied-to-matching merge',async()=>{await h.glide(input,await h.point(page,1),await h.point(page,2));await input.up();});after=await h.accepted(page,before,moveAction(before,1,2),start);if(chromium(info))await h.shot(page,info,'E01-merge-result.png');
 start=await h.checkpoint(page);await page.reload();await expect.poll(()=>h.base.read(page)).toEqual(after);expect(await h.writes(page,start)).toEqual([]);await input.close();
});

test(title('E02'),async({page},info)=>{
 const input=await h.driver(page,info);
 for(const kind of ['unmatched','self','gap','outside']){
  await h.seed(page,fixture());const before=await h.base.read(page),start=await h.checkpoint(page),from=await h.point(page,0);let to;
  if(kind==='unmatched')to=await h.point(page,5);
  if(kind==='self')to={x:from.x+15,y:from.y};
  if(kind==='gap'){const a=await h.cell(page,0).boundingBox(),b=await h.cell(page,1).boundingBox();to={x:(a.x+a.width+b.x)/2,y:from.y};}
  if(kind==='outside'){const board=await page.locator('.career-board').boundingBox();to={x:board.x+board.width/2,y:board.y-8};}
  await h.step(page,input.kind+' '+kind+' rejected drop',async()=>{await h.glide(input,from,to);if(kind==='self')await input.move(from);await expect(page.locator('.is-touch-drop-target')).toHaveCount(0);await input.up();});await h.unchanged(page,before,start);
 }
 await input.close();
});

test(title('E03'),async({page},info)=>{
 const input=await h.driver(page,info);let before=await h.base.read(page),start=await h.checkpoint(page);const p=await h.point(page,0);
 await h.step(page,input.kind+' movement below seven-pixel threshold',async()=>{await input.down(p);await input.move({x:p.x+3,y:p.y+1});await expect(page.locator('.career-drag-ghost')).toHaveCount(0);await input.up();});
 if(chromium(info)){await expect(h.cell(page,0)).toHaveAttribute('aria-pressed','true');await h.requireTrusted(page,'click');}else{await h.cell(page,0).tap();await expect(h.cell(page,0)).toHaveAttribute('aria-pressed','true');await h.requireTrusted(page,'pointerdown','touch');}
 await h.unchanged(page,before,start);
 await h.seed(page,fixture());before=await h.base.read(page);start=await h.checkpoint(page);await h.glide(input,await h.point(page,0),await h.point(page,4));await input.up();let after=await h.accepted(page,before,moveAction(before,0,4),start);
 await expect(page.locator('[data-career-cell][aria-pressed="true"]')).toHaveCount(0);
 // Deterministic handler check supplements the actual browser event log; it is
 // not described as a native compatibility click or physical touch event.
 start=await h.checkpoint(page);await h.step(page,'synthetic detail=1 compatibility-click suppression check',()=>h.cell(page,4).dispatchEvent('click',{detail:1,bubbles:true,cancelable:true}));await expect(h.cell(page,4)).toHaveAttribute('aria-pressed','false');await h.flush(page);const suppressedClick=h.events(page).filter(e=>e.type==='click'&&!e.isTrusted&&e.detail===1).at(-1),release=h.events(page).filter(e=>e.type==='pointerup'&&e.pointerType==='touch'&&e.wallTime<=suppressedClick.wallTime).at(-1);expect(suppressedClick.wallTime-release.wallTime,'Synthetic click reached handler within the 900ms suppression window').toBeLessThan(900);h.note(page,'compatibility-click elapsed milliseconds',suppressedClick.wallTime-release.wallTime);await h.unchanged(page,after,start);
 await h.step(page,'native fresh tap resets previous drag suppression',()=>h.cell(page,4).tap());await expect(h.cell(page,4)).toHaveAttribute('aria-pressed','true');await h.unchanged(page,after,start);
 before=after;start=await h.checkpoint(page);await h.cell(page,0).tap();after=await h.accepted(page,before,moveAction(before,4,0),start);await input.close();
});

test(title('E04'),async({page},info)=>{
 const input=await h.driver(page,info);
 for(const kind of ['pointercancel','lostcapture','secondfinger','escape']){
  await h.seed(page,fixture());const before=await h.base.read(page),start=await h.checkpoint(page);await h.glide(input,await h.point(page,0),await h.point(page,4));await expect(page.locator('.career-drag-ghost')).toHaveCount(1);
  await h.step(page,input.kind+' '+kind+' interruption',async()=>{
   if(kind==='pointercancel')await input.cancel();
   if(kind==='lostcapture'){
    if(chromium(info)){await h.flush(page);const id=h.events(page).filter(e=>e.type==='pointerdown'&&e.pointerType==='touch').at(-1).pointerId;await h.cell(page,0).evaluate((el,id)=>el.releasePointerCapture(id),id);await input.move(await h.point(page,4));}
    else await h.cell(page,0).dispatchEvent('lostpointercapture',{pointerId:71,pointerType:'touch'});
    await input.up();
   }
   if(kind==='secondfinger'){await input.second(await h.point(page,5));await input.endAll();}
   if(kind==='escape'){await page.keyboard.press('Escape');await input.up();}
  });await h.unchanged(page,before,start);
 }
 if(chromium(info)){await h.requireTrusted(page,'pointercancel','touch');await h.requireTrusted(page,'lostpointercapture','touch');}await input.close();
});

test(title('E05'),async({page,context},info)=>{
 const peer=await context.newPage();await peer.goto('/stage-e-probe/stage-e-evidence/browser/probe/current/index.html');await expect.poll(()=>peer.evaluate(()=>Boolean(window.stageEProbe))).toBe(true);const input=await h.driver(page,info);
 for(const kind of ['revision','source']){
  await h.seed(page,fixture());await peer.reload();await peer.evaluate(()=>window.stageEProbe.open());const before=await h.base.read(page),start=await h.checkpoint(page);
  await h.glide(input,await h.point(page,0),await h.point(page,3));
  const command=kind==='revision'?{type:'sound',enabled:true}:moveAction(before,0,4);
  const result=await h.step(page,'real separate-tab session commits '+kind+' change during '+input.kind,()=>peer.evaluate(command=>window.stageEProbe.command(command),command));expect(result.ok).toBe(true);await h.flush(peer);const expected=action(before,command);
  await input.move(await h.point(page,3));await input.up();await expect.poll(()=>h.base.read(page)).toEqual(expected);await h.frames(page,3);expect(await h.writes(page,start)).toHaveLength(1);await expect(page.locator('.career-drag-ghost')).toHaveCount(0);
  await page.reload();await expect.poll(()=>h.base.read(page)).toEqual(expected);expect(await h.writes(page,start)).toHaveLength(1);
 }
 await peer.close();await input.close();
});

test(title('E06'),async({page},info)=>{
 await page.setViewportSize({width:320,height:664});await h.seed(page,fixture({large:true}));const before=await h.base.read(page),start=await h.checkpoint(page),board=page.locator('.career-board'),input=await h.driver(page,info);
 expect(await board.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeGreaterThan(0);expect(await h.cell(page,0).evaluate(el=>getComputedStyle(el).touchAction)).toBe('none');expect(await h.cell(page,10).evaluate(el=>getComputedStyle(el).touchAction)).not.toBe('none');
 if(chromium(info)){
  for(const kind of ['empty','gap']){
   await board.evaluate(el=>el.scrollLeft=0);await h.cell(page,10).scrollIntoViewIfNeeded();await h.frames(page);let from;
   if(kind==='empty')from=await h.point(page,11,{reveal:false});
   else{const a=await h.cell(page,10).boundingBox(),b=await h.cell(page,11).boundingBox();from={x:(a.x+a.width+b.x)/2,y:a.y+a.height/2};}
   const to={x:Math.max(15,from.x-100),y:from.y};await h.step(page,'trusted CDP native horizontal pan from '+kind,async()=>{await h.glide(input,from,to,10);await input.up();});await expect.poll(()=>board.evaluate(el=>el.scrollLeft)).toBeGreaterThan(10);h.note(page,'Native '+kind+' pan scrollLeft',await board.evaluate(el=>el.scrollLeft));await expect(page.locator('.career-drag-ghost')).toHaveCount(0);
  }
 }else{
  await h.step(page,'native WebKit accessible horizontal scroll control',()=>page.getByRole('button',{name:'Scroll board right',exact:true}).tap());await expect.poll(()=>board.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 }
 await board.evaluate(el=>el.scrollLeft=0);const from=await h.point(page,0);await h.frames(page);const rect=await board.boundingBox(),edge={x:rect.x+rect.width-5,y:from.y};
 await h.step(page,input.kind+' bounded horizontal edge reveal',async()=>{await h.glide(input,from,edge);await expect.poll(()=>board.evaluate(el=>el.scrollLeft)).toBeGreaterThan(50);});
 const samples=await board.evaluate(el=>new Promise(resolve=>{const samples=[];function tick(t){samples.push({left:el.scrollLeft,time:t,max:el.scrollWidth-el.clientWidth});if(samples.length>=12)resolve(samples);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
 h.note(page,'edge reveal per-frame samples',samples);
 for(let i=1;i<samples.length;i++){expect(samples[i].left-samples[i-1].left).toBeLessThanOrEqual(13);expect(samples[i].left).toBeLessThanOrEqual(samples[i].max+1);}
 if(chromium(info))await h.shot(page,info,'E06-large-text-edge.png');
 await input.move({x:rect.x-3,y:from.y});await h.frames(page,3);const stopped=await board.evaluate(el=>el.scrollLeft);await h.frames(page,6);expect(await board.evaluate(el=>el.scrollLeft)).toBe(stopped);await input.cancel();await h.unchanged(page,before,start);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 // A second gesture must actually drop into a cell revealed by horizontal
 // scrolling; a cancelled edge animation alone would not test hit coordinates.
 await board.evaluate(el=>el.scrollLeft=0);const pickup=await h.point(page,0),bounds=await board.boundingBox(),rightEdge={x:bounds.x+bounds.width-5,y:pickup.y},dropStart=await h.checkpoint(page);
 await h.step(page,input.kind+' successful drop after horizontal edge reveal',async()=>{await h.glide(input,pickup,rightEdge);await expect.poll(()=>board.evaluate(el=>el.scrollWidth-el.clientWidth-el.scrollLeft)).toBeLessThan(2);const target=await h.point(page,4,{reveal:false});expect(target.x).toBeGreaterThan(bounds.x);expect(target.x).toBeLessThan(bounds.x+bounds.width);h.note(page,'scrolled drop hit coordinates',{target,scrollLeft:await board.evaluate(el=>el.scrollLeft)});await input.move(target);await expect(h.cell(page,4)).toHaveClass(/is-touch-drop-target/);await input.up();});await h.accepted(page,before,moveAction(before,0,4),dropStart);await input.close();
});

test(title('E07'),async({page},info)=>{
 let before=await h.base.read(page),start=await h.checkpoint(page);await h.step(page,'native mouse HTML drag to empty',()=>h.mouseDrag(page,0,4));let after=await h.accepted(page,before,moveAction(before,0,4),start);await h.requireTrusted(page,'dragstart');await h.requireTrusted(page,'drop');
 before=after;start=await h.checkpoint(page);await h.mouseDrag(page,1,2);after=await h.accepted(page,before,moveAction(before,1,2),start);
 before=after;start=await h.checkpoint(page);await page.getByRole('button',{name:'Undo',exact:true}).click();after=await h.accepted(page,before,{type:'undo'},start);
 start=await h.checkpoint(page);await page.reload();await expect.poll(()=>h.base.read(page)).toEqual(after);expect(await h.writes(page,start)).toEqual([]);
});

test(title('E08'),async({page},info)=>{
 let before=await h.base.read(page),start=await h.checkpoint(page);await h.cell(page,0).focus();await page.keyboard.press('Enter');await expect(h.cell(page,0)).toHaveAttribute('aria-pressed','true');await page.keyboard.press('ArrowRight');await expect(h.cell(page,1)).toBeFocused();await page.keyboard.press('Space');let after=await h.accepted(page,before,moveAction(before,0,1),start);await h.requireTrusted(page,'keydown');
 await h.cell(page,1).focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(h.cell(page,4)).toBeFocused();before=after;start=await h.checkpoint(page);await page.keyboard.press('Enter');after=await h.accepted(page,before,moveAction(before,1,4),start);
 if(!chromium(info))await h.shot(page,info,'E08-keyboard-result.png');
 start=await h.checkpoint(page);await page.reload();await expect.poll(()=>h.base.read(page)).toEqual(after);expect(await h.writes(page,start)).toEqual([]);
});
