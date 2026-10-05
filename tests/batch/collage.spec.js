import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ENVELOPES as BASE_ENVELOPES} from '../../src/matching/registry.js';
import {BATCH_ENVELOPES} from '../../src/matching/batch/registry.js';
import {activate,boardIds,clearSelection,dragTo,idle,imagesReady,pieces,cell,closeDialog,assertNoOverflow,assertControls,assertMatchingViewportFit,assertMatchingScrollableFallback} from './shared-helpers.js';
const route=e=>`/?envelope=${e.id}`;
const publicKeys=['moticos.matching.garden.v1','moticos.matching.moonlit-passage.v1','moticos.matching.riverside-reverie.v1','moticos.matching.lantern-studio.v1'];
const raw=(page,e)=>page.evaluate(key=>localStorage.getItem(key),e.storageKey);
const saved=async(page,e)=>JSON.parse(await raw(page,e));
const supply=(page,f)=>page.getByRole('button',{name:new RegExp(`^Add ${f.id} pair,`)});
async function shot(page,info,name){await mkdir('batch-test-results/review',{recursive:true});const path=`batch-test-results/review/${info.project.name}-${name}.png`;await page.screenshot({path,fullPage:false,animations:'disabled'});await info.attach(name,{path,contentType:'image/png'});}
async function merge(page,info,e,id,method='tap'){
 await idle(page);await clearSelection(page);const indices=await pieces(page,id).evaluateAll(ns=>ns.map(n=>Number(n.dataset.matchingCell)));expect(indices.length).toBeGreaterThanOrEqual(2);
 const [from,to]=indices,next=e.catalog.nextPiece(id).id;
 if(method==='drag')await dragTo(page,cell(page,from),cell(page,to));else{await activate(cell(page,from),info);await activate(cell(page,to),info);await idle(page);}
 await expect(cell(page,from)).toHaveAttribute('data-piece-id','empty');await expect(cell(page,to)).toHaveAttribute('data-piece-id',next);return next;
}
async function stageGeometry(page,info,e,id){
 await expect(page.locator('.cg-cell.is-pasted')).toHaveCount(0);await imagesReady(page.locator('.cg-board img'));
 await assertMatchingViewportFit(page,info,`${id}-native`);
 const size=page.viewportSize();try{await page.setViewportSize({width:320,height:568});await assertMatchingViewportFit(page,info,`${id}-320x568`);}finally{await page.setViewportSize(size);}
 await expect(pieces(page,id).first()).toHaveAccessibleName(new RegExp(e.catalog.CATALOG[id].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
}
async function openCard(page,info,e,id){
 const piece=e.catalog.CATALOG[id];await activate(page.getByRole('button',{name:'Collection',exact:true}),info);
 const article=page.locator('.cg-collection-piece').filter({has:page.getByRole('heading',{name:piece.name,exact:true})});await expect(article).toHaveCount(1);await activate(article.getByRole('button',{name:'Open postcard',exact:true}),info);
 await expect(page.locator('.cg-postcard figcaption')).toContainText(piece.name);await imagesReady(page.locator('.cg-postcard img'));
}
async function exportCard(page,info,e,id){
 await openCard(page,info,e,id);const pending=page.waitForEvent('download');await activate(page.getByRole('button',{name:'Download postcard',exact:true}),info);const download=await pending;expect(download.suggestedFilename()).toBe(`moticos-${e.catalog.CATALOG[id].name.toLowerCase().replaceAll(' ','-')}.png`);
 await mkdir('batch-test-results/review',{recursive:true});const path=`batch-test-results/review/${info.project.name}-${id}-export.png`;await download.saveAs(path);expect(await download.failure()).toBeNull();
 const bytes=await readFile(path);expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(bytes.readUInt32BE(16)).toBe(1536);expect(bytes.readUInt32BE(20)).toBe(1120);expect(bytes.length).toBeGreaterThan(10000);
 await expect(page.locator('.cg-export-status')).toContainText('Safari Downloads in the Files app');await info.attach(`${id}-actual-export`,{path,contentType:'image/png'});await shot(page,info,`${id}-postcard`);await closeDialog(page,info);return createHash('sha256').update(bytes).digest('hex');
}
const errors=new WeakMap();test.beforeEach(async({page})=>{errors.set(page,[]);page.on('pageerror',e=>errors.get(page).push(e.message));});test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));

// Run the uncertain stale-tab gate first, before expensive picture journeys.
test('corrupt/future bytes, quota and stale-tab failure keep existing saves',async({page},info)=>{
 const e=BATCH_ENVELOPES[0];await page.goto(route(e));
 for(const original of ['bad-json','{"version":999,"keep":"original"}']){await page.evaluate(({key,original})=>localStorage.setItem(key,original),{key:e.storageKey,original});await page.reload();await merge(page,info,e,e.catalog.STARTERS[0]);expect(await raw(page,e)).toBe(original);await expect(page.getByRole('button',{name:/^Save warning:/})).toBeVisible();}
 await page.evaluate(key=>localStorage.removeItem(key),e.storageKey);await page.reload();await merge(page,info,e,e.catalog.STARTERS[0]);const original=await raw(page,e);
 const blocked=await page.context().newPage();await blocked.addInitScript(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('full','QuotaExceededError');return set.call(this,name,value);};},e.storageKey);await blocked.goto(route(e));await activate(supply(blocked,e.catalog.FAMILIES[0]),info);await expect(blocked.getByRole('button',{name:/^Save warning:/})).toBeVisible();expect(await raw(page,e)).toBe(original);await blocked.close();
 // Establish that the second page has mounted the old session before a write elsewhere.
 const oldBoard=await boardIds(page);const stale=await page.context().newPage();await stale.goto(route(e));
 await expect(stale.locator('[data-matching-cell]')).toHaveCount(25);
 await expect.poll(()=>boardIds(stale)).toEqual(oldBoard);
 await expect(supply(stale,e.catalog.FAMILIES[0])).toBeEnabled();
 expect(await raw(stale,e)).toBe(original);
 await activate(supply(page,e.catalog.FAMILIES[0]),info);
 await expect.poll(()=>raw(page,e)).not.toBe(original);const newest=await raw(page,e);
 // Keep the automatic warning BEFORE the stale write, followed by exact protection.
 await expect(stale.getByRole('button',{name:/^Save warning:/})).toBeVisible();
 await activate(supply(stale,e.catalog.FAMILIES[0]),info);expect(await raw(page,e)).toBe(newest);await stale.close();
});

for(const envelope of BATCH_ENVELOPES){
 test(`${envelope.title}: complete ten-picture routes and six real postcards`,async({page},info)=>{
  test.setTimeout(180000);await page.goto(route(envelope));await expect(page.locator('.mg-supply-button')).toHaveCount(2);await expect(page.locator('[data-matching-cell]')).toHaveCount(25);
  const seen=new Set(envelope.catalog.STARTERS),hashes=[];let merges=0,draws=0;
  for(const family of envelope.catalog.FAMILIES){await expect(pieces(page,family.starterId)).toHaveCount(4);await stageGeometry(page,info,envelope,family.starterId);let familyMerges=0,familyDraws=0;
   while(!(await pieces(page,family.finalId).count())){
    expect(familyMerges+familyDraws).toBeLessThan(21);const ids=await boardIds(page),id=[...family.pieceIds].slice(0,4).reverse().find(id=>ids.filter(value=>value===id).length>=2);
    if(id){const next=await merge(page,info,envelope,id,merges%2?'tap':'drag');merges++;familyMerges++;
     if(!seen.has(next)){seen.add(next);await stageGeometry(page,info,envelope,next);if(envelope.catalog.CATALOG[next].tier>=3)hashes.push(await exportCard(page,info,envelope,next));}
    }else{await activate(supply(page,family),info);draws++;familyDraws++;}
   }expect({merges:familyMerges,draws:familyDraws}).toEqual({merges:15,draws:6});
  }
  expect({merges,draws}).toEqual({merges:30,draws:12});expect(seen.size).toBe(10);expect(new Set(hashes).size).toBe(6);await expect(page.locator('.cg-progress')).toHaveText('10/10');
  const before=await raw(page,envelope);expect((await saved(page,envelope)).round).toMatchObject({moves:42,merges:30});await page.reload();expect(await raw(page,envelope)).toBe(before);for(const id of envelope.catalog.FINALS)await expect(pieces(page,id)).toHaveCount(1);
  await activate(page.getByRole('button',{name:'Collection',exact:true}),info);await expect(page.getByLabel('Browse envelope',{exact:true}).locator('option')).toHaveCount(8);await expect(page.getByRole('button',{name:'Open postcard',exact:true})).toHaveCount(6);await shot(page,info,`${envelope.id}-complete-collection`);
 });
 test(`${envelope.title}: wrong pairs, Cut, Undo and fresh-envelope discoveries`,async({page},info)=>{
  await page.goto(route(envelope));const [a,b]=envelope.catalog.FAMILIES;
  const initial=await boardIds(page);await activate(pieces(page,a.starterId).first(),info);await activate(pieces(page,b.starterId).first(),info);expect(await boardIds(page)).toEqual(initial);expect(await raw(page,envelope)).toBeNull();
  await merge(page,info,envelope,a.starterId);let before=await raw(page,envelope);await clearSelection(page);await activate(pieces(page,a.pieceIds[1]),info);await activate(pieces(page,a.starterId).first(),info);expect(await raw(page,envelope)).toBe(before);await dragTo(page,pieces(page,a.pieceIds[1]),pieces(page,a.starterId).first());expect(await raw(page,envelope)).toBe(before);
  await merge(page,info,envelope,a.starterId);await merge(page,info,envelope,a.pieceIds[1]);const earned=await saved(page,envelope);
  await activate(page.getByRole('button',{name:'Cut',exact:true}),info);await expect(pieces(page,a.pieceIds[1])).toHaveCount(2);await activate(page.getByRole('button',{name:'Undo',exact:true}),info);expect((await saved(page,envelope)).round).toEqual(earned.round);
  await activate(page.getByRole('button',{name:'Fresh envelope',exact:true}),info);await activate(page.getByRole('button',{name:'Start fresh',exact:true}),info);expect((await saved(page,envelope)).discoveries).toEqual(earned.discoveries);await openCard(page,info,envelope,a.pieceIds[2]);await closeDialog(page,info);
  for(let i=0;i<3;i++){await activate(page.getByRole('button',{name:'How to play',exact:true}),info);await closeDialog(page,info);}await assertNoOverflow(page);
 });
}

test('exact source assets, read-only album and eight-envelope save boundaries',async({page},info)=>{
 const expected=JSON.parse(await readFile('dist-batch/batch-manifest.json','utf8'));const sentinel=Object.fromEntries(publicKeys.map((key,i)=>[key,`unchanged-existing-save-${i}`]));
 await page.goto(route(BATCH_ENVELOPES[0]));await expect(page.locator('meta[name="moticos-private-collage-source"]')).toHaveAttribute('content',expected.sourceFingerprint);expect(await (await page.request.get('/batch-manifest.json')).json()).toEqual(expected);
 expect(await page.locator('script[type="module"][src]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('src')))).toEqual(expected.entryScripts);
 for(const asset of [...expected.assets,...expected.entryFiles]){const response=await page.request.get(`/${asset.file}`);expect(response.ok()).toBe(true);expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(asset.sha256);}
 await page.evaluate(s=>Object.entries(s).forEach(([k,v])=>localStorage.setItem(k,v)),sentinel);
 const recorded={};for(const e of BATCH_ENVELOPES){await page.goto(route(e));await merge(page,info,e,e.catalog.STARTERS[0]);recorded[e.storageKey]=await raw(page,e);}
 for(const e of BATCH_ENVELOPES){await page.goto(route(e));expect(await raw(page,e)).toBe(recorded[e.storageKey]);}
 await activate(page.getByRole('button',{name:'Collection',exact:true}),info);await expect(page.locator('.mg-album-summary')).toContainText('/ 80');await expect(page.locator('.mg-album-summary')).toContainText('/ 48');await expect(page.getByLabel('Browse envelope',{exact:true}).locator('option')).toHaveCount(8);await closeDialog(page,info);
 expect(await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),publicKeys)).toEqual(sentinel);for(const e of BATCH_ENVELOPES)expect(await raw(page,e)).toBe(recorded[e.storageKey]);
 await page.goBack();await expect(page.locator('[data-matching-cell]')).toHaveCount(25);await shot(page,info,'batch-boundaries');
});

test('compact screen fit, reduced motion, keyboard and repeated dialog dismissal',async({page},info)=>{
 const e=BATCH_ENVELOPES[0];await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route(e));await assertControls(page,'.cg-header button, .cg-tools button, .mg-supply button, .cg-footer button');
 for(const size of [{width:320,height:568},{width:390,height:664},{width:430,height:752}]){await page.setViewportSize(size);await assertMatchingViewportFit(page,info,`batch-start-${size.width}`);await shot(page,info,`batch-start-${size.width}`);}
 await pieces(page,e.catalog.STARTERS[0]).first().focus();await pieces(page,e.catalog.STARTERS[0]).first().press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(pieces(page,e.catalog.FAMILIES[0].pieceIds[1])).toHaveCount(1);
 for(let i=0;i<3;i++){await activate(page.getByRole('button',{name:'Collection',exact:true}),info);await closeDialog(page,info);await expect(page.getByRole('dialog')).toHaveCount(0);}
 await page.addStyleTag({content:'.mg-page .cg-instruction { font-size: 16px !important; } .mg-page .cg-cell-name { font-size: 13px !important; }'});await expect(page.locator('.mg-page')).toHaveClass(/mg-large-text/);await assertMatchingScrollableFallback(page,info,'batch-enlarged-text');
});

// One targeted published-core smoke per profile accompanies the changed-art gate.
// The unchanged comprehensive v5 suite is not blindly repeated.
test('published Garden core: identical pairs, Cut, Undo and reload remain intact',async({page},info)=>{
 const e=BASE_ENVELOPES[0],family=e.catalog.FAMILIES[0];await page.goto('/');
 await expect(pieces(page,family.starterId)).toHaveCount(4);
 await merge(page,info,e,family.starterId,'drag');await merge(page,info,e,family.starterId);await merge(page,info,e,family.pieceIds[1]);
 const before=await raw(page,e),earned=await saved(page,e);
 await activate(page.getByRole('button',{name:'Cut',exact:true}),info);await expect(pieces(page,family.pieceIds[1])).toHaveCount(2);
 await activate(page.getByRole('button',{name:'Undo',exact:true}),info);expect((await saved(page,e)).round).toEqual(earned.round);
 await page.reload();expect(await raw(page,e)).toBe(before);await expect(pieces(page,family.pieceIds[2])).toHaveCount(1);
 await assertMatchingViewportFit(page,info,'published-garden-core');
});
