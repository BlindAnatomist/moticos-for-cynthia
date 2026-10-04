import { mkdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
const BIRD='s01_coral_bird', MAP='s02_river_map', KEY='s03_round_key', FERN='s04_teal_fern', MOON='s05_cobalt_moon', CUP='s06_cream_teacup';
const RIVER='e01_riverwing', FROND='e02_frond_key', COURIER='e04_crescent_courier', FERNCUP='e05_fern_cup', WAY='e03_wayfinder_garden', NIGHT='e06_nightgarden_nest';
const piece=(page,id)=>page.locator(`[data-piece-id="${id}"]`).first();
const occupied=page=>page.locator('[data-piece-id]:not([data-piece-id="empty"])');
const isPhone=info=>info.project.name.startsWith('webkit');
async function activate(locator,info){ if(isPhone(info))await locator.tap();else await locator.click(); }
async function shot(page,info,name){await mkdir('test-results/screenshots',{recursive:true});await page.screenshot({path:`test-results/screenshots/${info.project.name}-collection-${name}.png`,fullPage:true});}
async function drag(page,a,b,nearMiss=false){
 await expect(page.locator('.cg-floating')).toHaveCount(0);
 await page.locator('.cg-board').scrollIntoViewIfNeeded();
 const from=await a.boundingBox(),to=await b.boundingBox();
 const x=to.x+to.width/2+(nearMiss?to.width*.62:0),y=to.y+to.height/2;
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
 await page.mouse.move(x,y,{steps:12});await expect(page.locator('.cg-floating')).toBeVisible();await page.mouse.up();
 await expect(page.locator('.cg-floating')).toHaveCount(0);
}
async function merge(page,a,b,result,info,method='drag'){
 if(method==='drag')await drag(page,piece(page,a),piece(page,b));
 else {await activate(piece(page,a),info);await activate(piece(page,b),info);}
 await expect(piece(page,result)).toBeVisible();await expect(page.locator('.cg-floating')).toHaveCount(0);
}
async function makeWay(page,info){await merge(page,BIRD,MAP,RIVER,info);await merge(page,KEY,FERN,FROND,info);await merge(page,RIVER,FROND,WAY,info);}
async function makeNight(page,info){await merge(page,BIRD,MOON,COURIER,info);await merge(page,CUP,FERN,FERNCUP,info);await merge(page,COURIER,FERNCUP,NIGHT,info);}
test.beforeEach(async({page})=>{await page.goto('/?recipe-study');await expect(page.locator('.cg-board')).toBeVisible();});

test('board-first layout, real artwork, readable controls, and no automatic postcard',async({page},info)=>{
 await expect(occupied(page)).toHaveCount(8);await expect(page.locator('[data-collection-cell]')).toHaveCount(25);await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'A postcard awaits your first garden'})).toBeDisabled();
 await expect.poll(() => page.locator('.cg-board img').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
 const m=await page.evaluate(()=>{const b=document.querySelector('.cg-board').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,board:{left:b.left,right:b.right,width:b.width,top:b.top,bottom:b.bottom},height:innerHeight,images:[...document.querySelectorAll('.cg-board img')].every(i=>i.complete&&i.naturalWidth>0),controls:[...document.querySelectorAll('.cg-header button,.cg-tools button,.cg-postcard-button')].map(el=>el.getBoundingClientRect().height),tile:document.querySelector('.cg-cell').getBoundingClientRect().width};});
 expect(m.images).toBe(true);expect(m.scroll).toBeLessThanOrEqual(m.width+1);expect(m.board.left).toBeGreaterThanOrEqual(0);expect(m.board.right).toBeLessThanOrEqual(m.width);expect(m.controls.every(h=>h>=44)).toBe(true);expect(m.tile).toBeGreaterThan(48);
 if(isPhone(info)){expect(m.board.width).toBeGreaterThan(m.width*.9);expect(m.board.top).toBeLessThan(230);expect(m.board.bottom).toBeLessThan(m.height);}
 await shot(page,info,'initial');
});

test('accepted magnetic near-miss merges and undo restores the exact board',async({page},info)=>{
 const initial=await page.locator('[data-piece-id]').evaluateAll(e=>e.map(x=>x.dataset.pieceId));
 await drag(page,piece(page,BIRD),piece(page,MAP),true);await expect(piece(page,RIVER)).toBeVisible();await expect(occupied(page)).toHaveCount(7);await shot(page,info,'riverwing');
 await activate(page.getByRole('button',{name:'Undo',exact:true}),info);expect(await page.locator('[data-piece-id]').evaluateAll(e=>e.map(x=>x.dataset.pieceId))).toEqual(initial);
 await expect(page.locator('.cg-progress')).toHaveText('7/12');
});

test('invalid drag loses nothing and a subsequent drag still works',async({page},info)=>{
 await drag(page,piece(page,BIRD),piece(page,KEY));await expect(occupied(page)).toHaveCount(8);await expect(page.getByRole('status')).toContainText('Nothing was lost');
 await merge(page,BIRD,MAP,RIVER,info);await expect(occupied(page)).toHaveCount(7);
});

test('tap pairing, move to empty space, cut, and multistep undo',async({page},info)=>{
 await merge(page,BIRD,MAP,RIVER,info,'tap');
 await activate(page.locator('[data-collection-cell="0"]'),info);await expect(page.locator('[data-collection-cell="0"]')).toHaveAttribute('data-piece-id',RIVER);
 await activate(page.getByRole('button',{name:'Cut',exact:true}),info);await expect(occupied(page)).toHaveCount(8);await expect(piece(page,RIVER)).toHaveCount(0);
 await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expect(page.locator('[data-collection-cell="0"]')).toHaveAttribute('data-piece-id',RIVER);
 await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expect(page.locator('[data-collection-cell="8"]')).toHaveAttribute('data-piece-id',RIVER);
 await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expect(occupied(page)).toHaveCount(8);await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
});

test('keyboard can select, merge, move, and dismiss help with focus restored',async({page},info)=>{
 const bird=piece(page,BIRD);await bird.press('Enter');await expect(bird).toHaveAttribute('aria-pressed','true');await bird.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(piece(page,RIVER)).toBeVisible();
 await piece(page,RIVER).press('Escape');await expect(piece(page,RIVER)).toHaveAttribute('aria-pressed','false');
 const help=page.getByRole('button',{name:'How to play'});await help.focus();await help.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.waitForTimeout(350);await expect(page.getByRole('dialog')).toBeVisible();await shot(page,info,'help');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(help).toBeFocused();
});

test('both families finish through six drags without interrupting the board',async({page},info)=>{
 await makeWay(page,info);await expect(page.getByRole('dialog')).toHaveCount(0);await shot(page,info,'first-garden');await makeNight(page,info);await expect(occupied(page)).toHaveCount(2);await expect(page.locator('.cg-progress')).toHaveText('12/12');await expect(page.getByRole('dialog')).toHaveCount(0);await shot(page,info,'both-gardens');
 await activate(page.getByRole('button',{name:'Collection',exact:true}),info);await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.cg-collection-piece')).toHaveCount(12);await expect(page.locator('.is-undiscovered')).toHaveCount(0);await shot(page,info,'collection');
 await activate(page.getByRole('button',{name:'Back to board'}),info);await expect(occupied(page)).toHaveCount(2);
 await page.reload();await expect(occupied(page)).toHaveCount(2);await expect(page.locator('.cg-progress')).toHaveText('12/12');await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await expect(occupied(page)).toHaveCount(3);
});

test('postcard opens only on request, downloads a real image, and returns to unchanged board',async({page},info)=>{
 await makeNight(page,info);const before=await page.locator('[data-piece-id]').evaluateAll(e=>e.map(x=>x.dataset.pieceId));
 await activate(page.getByRole('button',{name:'Open your postcard'}),info);await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Download postcard'})).toBeEnabled();await shot(page,info,'nightgarden-postcard');
 const downloadPromise=page.waitForEvent('download');await activate(page.getByRole('button',{name:'Download postcard'}),info);const download=await downloadPromise;expect(download.suggestedFilename()).toBe('moticos-nightgarden-nest.png');
 await mkdir('test-results/postcards',{recursive:true});const path=`test-results/postcards/${info.project.name}-nightgarden.png`;await download.saveAs(path);const bytes=await readFile(path);expect(bytes.readUInt32BE(16)).toBe(1536);expect(bytes.readUInt32BE(20)).toBe(1120);expect(bytes.length).toBeGreaterThan(10000);await expect(page.getByRole('status').last()).toContainText('Files app');
 await activate(page.getByRole('button',{name:'Back to board'}),info);await expect(page.getByRole('dialog')).toHaveCount(0);expect(await page.locator('[data-piece-id]').evaluateAll(e=>e.map(x=>x.dataset.pieceId))).toEqual(before);
});

test('share cancellation, repeated modal openings, and collection-to-postcard navigation are safe',async({page},info)=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Canceled','AbortError');}});});await page.reload();await makeWay(page,info);
 for(let i=0;i<3;i++){await activate(page.getByRole('button',{name:'Collection',exact:true}),info);await expect(page.getByRole('dialog')).toBeVisible();await activate(page.getByRole('button',{name:'Back to board'}),info);await expect(page.getByRole('dialog')).toHaveCount(0);}
 await activate(page.getByRole('button',{name:'Collection',exact:true}),info);await activate(page.getByRole('button',{name:'Open postcard',exact:true}),info);await expect(page.locator('.cg-postcard')).toBeVisible();await expect(page.getByRole('button',{name:'Share postcard'})).toBeEnabled();await activate(page.getByRole('button',{name:'Share postcard'}),info);await expect(page.getByRole('status').last()).toContainText('Sharing canceled');const backBox=await page.getByRole('button',{name:'Back to board'}).boundingBox();expect(backBox.y).toBeGreaterThanOrEqual(0);expect(backBox.y+backBox.height).toBeLessThanOrEqual(page.viewportSize().height);await shot(page,info,'wayfinder-postcard');
 await activate(page.getByRole('button',{name:'Back to board'}),info);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
});

test('fresh-board cancel preserves play and confirmed reset keeps discovered art',async({page},info)=>{
 await merge(page,BIRD,MAP,RIVER,info);await activate(page.getByRole('button',{name:'Fresh board',exact:true}),info);await activate(page.getByRole('button',{name:'Back to board'}),info);await expect(piece(page,RIVER)).toBeVisible();
 await activate(page.getByRole('button',{name:'Fresh board',exact:true}),info);await activate(page.getByRole('button',{name:'Start fresh',exact:true}),info);await expect(occupied(page)).toHaveCount(8);await expect(piece(page,RIVER)).toHaveCount(0);await expect(page.locator('.cg-progress')).toHaveText('7/12');await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
});

test('hint, sound, reduced motion, and malformed save recovery remain usable',async({page},info)=>{
 await activate(page.getByRole('button',{name:'Hint',exact:true}),info);await expect(page.locator('.is-hint')).toHaveCount(3);await shot(page,info,'hint');
 await activate(page.getByRole('button',{name:'Mute sound',exact:true}),info);await page.reload();await expect(page.getByRole('button',{name:'Enable sound',exact:true})).toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});await merge(page,BIRD,MAP,RIVER,info,'tap');await expect(page.locator('.cg-floating')).toHaveCount(0);
 await page.evaluate(()=>localStorage.setItem('moticos.collection.garden.v1','{"version":1,"round":{}}'));await page.reload();await expect(occupied(page)).toHaveCount(8);await expect(page.locator('.cg-progress')).toHaveText('6/12');
});


test('rapid keyboard input does not depend on animation-frame timing',async({page})=>{
 await page.evaluate(()=>{ window.requestAnimationFrame = () => 1; });
 const bird=piece(page,BIRD);await bird.press('Enter');await bird.press('ArrowRight');
 expect(await page.evaluate(()=>document.activeElement.dataset.collectionCell)).toBe('7');
 await page.keyboard.press('ArrowRight');
 expect(await page.evaluate(()=>document.activeElement.dataset.collectionCell)).toBe('8');
 await page.keyboard.press('Enter');await expect(piece(page,RIVER)).toBeVisible();
 await expect(page.locator('.cg-progress')).toHaveText('7/12');
});
