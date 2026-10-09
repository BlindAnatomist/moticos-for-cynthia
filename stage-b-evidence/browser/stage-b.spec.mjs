import {test,expect} from '@playwright/test';
import {scenarioFor,verifyFilename} from './scope.mjs';
const scenario=scenarioFor(test);
import fs from 'node:fs';
import {separatedActions} from '../execution/ending-layout.mjs';
import {reloadStable,waitSaved} from './reload.mjs';
import {noViewWrites,exactScope} from './interaction-proofs.mjs';
const viewStart=page=>page.evaluate(()=>window.__careerAudit.length);
async function viewEnd(page,start){const events=await page.evaluate(start=>window.__careerAudit.slice(start),start);noViewWrites(events,C.STORAGE_KEY);return events;}
import * as h from '../../tests/full-campaign-browser/helpers.mjs';
import {chapterEnd} from '../../tests/full-campaign-browser/fixtures.mjs';
import {C,E,oldEndpoint,completed240,all240} from './fixtures.mjs';
import {postcardSubtitle} from '../../src/career/feedback.js';
import {CONTINUATIONS,VOLUMES} from '../../src/career/volumes.js';
import {verifyGallery,verifyExport,digest} from './proofs.mjs';
const build=()=>JSON.parse(fs.readFileSync('full-campaign-build.json'));
async function record(info,data){const path=info.outputPath('proof.json');fs.mkdirSync(info.outputDir,{recursive:true});fs.writeFileSync(path,JSON.stringify({caseId:info.title.split(' ')[0],sourceFingerprint:build().sourceFingerprint,buildFingerprint:digest(fs.readFileSync('full-campaign-build.json')),setup:'Reducer-generated fixture; only subsequent native gestures are browser evidence.',...data},null,2),{flag:'wx'});await info.attach('proof',{path,contentType:'application/json'});}
test.beforeEach(async({page,context})=>{await h.instrumentation(context);await h.open(page);});
test.afterEach(async({page})=>h.audit(page));
for(const [i,b]of CONTINUATIONS.entries())scenario(`B${i+1} explicit boundary preserves prior ending and promises`,async({page},info)=>{
 const fixture=i?E.upgradeCareer(oldEndpoint()):chapterEnd(16);await h.seed(page,fixture);const before=await h.read(page),saved=await h.bytes(page);
 await expect(page.locator('.career-finished .career-chapter-ending')).toHaveText(C.CHAPTER_COPY[b.fromChapterId].ending);
 const endingText=C.CHAPTER_COPY[b.fromChapterId].ending;expect(await page.locator('.career-finished p').allTextContents()).toEqual(i?[endingText]:[endingText,'You’ve sent every letter in the original sixteen-chapter campaign. Keep exploring your collection or return to a favorite letter.']);
 if(!await h.compact(page)){const original=page.viewportSize();for(const width of [700,900,1366]){await page.setViewportSize({width,height:900});const nav=page.getByRole('navigation',{name:'Completed chapter actions'}),buttons=nav.getByRole('button');await expect(buttons).toHaveCount(2);await expect(nav).toHaveCSS('flex-wrap','wrap');const geometry=await nav.evaluate(n=>({container:(()=>{const r=n.getBoundingClientRect();return{x:r.x,width:r.width};})(),rows:[...n.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:b.scrollWidth,clientWidth:b.clientWidth};})}));separatedActions(geometry.rows,geometry.container);await buttons.nth(0).focus();await page.keyboard.press('Tab');await expect(buttons.nth(1)).toBeFocused();}await page.setViewportSize(original);}

 const invite=async()=>{const touch=await h.compact(page);if(touch)await h.panel(page,'progress',true);await h.press(page.getByRole('button',{name:b.entryButton,exact:true}),touch);};
 for(let n=0;n<2;n++){await invite();await expect(page.getByRole('dialog')).toContainText(C.CHAPTER_COPY[b.fromChapterId].ending);await page.getByRole('button',{name:b.deferButton,exact:true}).click();expect(await h.bytes(page)).toBe(saved);}
 await invite();const title=C.CHAPTERS.find(c=>c.id===b.toChapterId).title;
 const after=await h.changed(page,before,()=>page.getByRole('button',{name:`Begin ${title}`,exact:true}).click());
 expect(after.chapterId).toBe(b.toChapterId);expect(after.continuationEntries[b.id].contentVersion).toBe(6);
 for(const key of ['board','material','sources','xp','coinsEarned','coinsSpent','purchases','milestones','storyCompletions','receipts'])expect(after[key]).toEqual(before[key]);
 for(const o of [...before.orders,...before.heldOrders])expect([...after.orders,...after.heldOrders].find(x=>x.id===o.id)).toEqual(o);
 if(i)expect(after.continuationEntries[CONTINUATIONS[0].id]).toEqual(before.continuationEntries[CONTINUATIONS[0].id]);
 expect(after.history).toEqual([]);const bytes=await h.bytes(page);for(let n=0;n<2;n++){await reloadStable(page);expect(await h.bytes(page)).toBe(bytes);}
 await record(info,{before,after,images:await h.imageProof(page)});
});
scenario('B3 v5 native migration is dormant and repeat reload is idempotent',async({page},info)=>{
 const old=oldEndpoint(),raw=JSON.stringify(old);await h.seedRaw(page,raw);await page.reload();await waitSaved(page,E.upgradeCareer(old));
 const migrated=await h.read(page);expect(migrated).toEqual(E.upgradeCareer(old));expect(migrated.enteredChapters).toHaveLength(20);expect(migrated.milestones).toHaveLength(139);
 for(const f of C.FAMILIES.slice(40)){expect(migrated.material[f.id]).toEqual({initial:0,generated:0,delivered:0,recycled:0});expect(migrated.sources[f.id]).toEqual({sorter:0,cursor:0});}
 const saved=await h.bytes(page);for(let n=0;n<3;n++){await reloadStable(page);expect(await h.bytes(page)).toBe(saved);}expect(JSON.stringify(old)).toBe(raw);await record(info,{migrated});
});
scenario('B4 all twelve collection pages use exact 240 art identities and three volume filters',async({page},info)=>{
 await h.seed(page,all240());const saved=await h.bytes(page),writeStart=await viewStart(page);await h.panel(page,'collection');const gallery=await h.collectionPages(page,240);verifyGallery(gallery,C.CATALOG.PIECES.map(p=>p.id),build().art);
 const scopes=[];for(const v of VOLUMES){await page.getByRole('combobox',{name:'Collection volume',exact:true}).selectOption(v.id);await expect(page.getByRole('navigation',{name:'Collection pages'})).toContainText(`Page 1 of ${Math.ceil(v.pieceIds.length/20)}`);await expect(page.getByRole('heading',{name:`${v.title} · ${v.pieceIds.length}/${v.pieceIds.length} collected`,exact:true})).toBeVisible();const ids=[],images=[];for(let n=0;n<Math.ceil(v.pieceIds.length/20);n++){const visible=await page.locator('[data-collection-piece-id]').evaluateAll(nodes=>nodes.map(x=>x.dataset.collectionPieceId));exactScope(visible,v.pieceIds.slice(n*20,n*20+20));ids.push(...visible);images.push(...await h.imageProof(page));if(n+1<Math.ceil(v.pieceIds.length/20))await page.getByRole('button',{name:'Next pictures',exact:true}).click();}exactScope(ids,v.pieceIds);scopes.push({volume:v.id,ids,images});}
 await h.close(page);expect(await h.bytes(page)).toBe(saved);const writes=await viewEnd(page,writeStart);await record(info,{gallery,scopes,writes});
});
scenario('B5 all three terminal endings remain available without save writes',async({page},info)=>{
 await h.seed(page,completed240());const saved=await h.bytes(page),writeStart=await viewStart(page);await h.panel(page,'letters');
 for(const id of ['sound-advice','short-measure','paper-duet']){await page.getByRole('combobox',{name:'Chapter',exact:true}).selectOption(id);await expect(page.getByRole('dialog').locator('.career-chapter-ending')).toHaveText(C.CHAPTER_COPY[id].ending);}
 await h.close(page);const writes=await viewEnd(page,writeStart);await reloadStable(page);expect(await h.bytes(page)).toBe(saved);await record(info,{writes,endings:['sound-advice','short-measure','paper-duet']});
});
for(const [index,f]of C.FAMILIES.slice(40).entries())scenario(`B${index+6} ${f.id} real postcard download`,async({page,context},info)=>{
 await h.seed(page,all240());const saved=await h.bytes(page),writeStart=await viewStart(page),pieceId=f.pieceIds[4];await h.panel(page,'collection');await h.revealCollectionPiece(page,pieceId);await h.collectionPiece(page,pieceId).click();
 await expect(page.locator('.career-postcard figcaption')).toContainText(C.CATALOG.pieceOf(pieceId).name);await expect(page.locator('.career-postcard figcaption small')).toHaveText(`MOTICOS · ${postcardSubtitle(pieceId).toUpperCase()}`);
 const readiness=await h.captureImageReadiness(page),images=await h.imageProof(page);expect(images.filter(i=>i.location==='postcard').map(i=>i.pieceId)).toEqual([pieceId]);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download postcard',exact:true}).click()]);expect(await download.failure()).toBe(null);const bytes=fs.readFileSync(await download.path());
 const exported={pieceId,bytes:bytes.length,sha256:digest(bytes),dimensions:[1536,1120],filename:download.suggestedFilename()};verifyExport(bytes,exported,pieceId);verifyFilename(exported.filename,`moticos-${C.CATALOG.pieceOf(pieceId).name.toLowerCase().replaceAll(' ','-')}.png`);
 const probe=await context.newPage();await probe.goto('/full-probe/index.html');const parity=await probe.evaluate(id=>window.fullCampaignProbe.compare(id),pieceId);expect(parity.byteEqual).toBe(true);expect(parity.sameBlob).toBe(true);expect(parity.sameFilename).toBe(true);expect(parity.hashes).toEqual([exported.sha256,exported.sha256,exported.sha256]);expect(parity.subtitle).toBe(postcardSubtitle(pieceId));await probe.close();
 const path=info.outputPath(`${pieceId}.png`);fs.mkdirSync(info.outputDir,{recursive:true});fs.writeFileSync(path,bytes,{flag:'wx'});await h.close(page);expect(await h.bytes(page)).toBe(saved);const writes=await viewEnd(page,writeStart);await record(info,{readiness,images,exported,parity,writes});
});
