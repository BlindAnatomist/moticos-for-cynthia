import {test,expect} from '@playwright/test';
import {scenarioFor,screenshotAllowed} from './scope.mjs';
const scenario=scenarioFor(test);
import fs from 'node:fs';
import {verifyPng} from '../../gate/png.mjs';
import {digest} from './proofs.mjs';
import {reloadStable,waitSaved} from './reload.mjs';
import * as h from '../../tests/full-campaign-browser/helpers.mjs';
import {C,E,d} from './fixtures.mjs';
import {retainedV5,newChapterEntry,occupiedNewBoard} from './interaction-fixtures.mjs';
import {retainedTransition,occupiedProof} from './interaction-proofs.mjs';
import {CONTINUATIONS} from '../../src/career/volumes.js';
const boundary=CONTINUATIONS[1];
async function evidence(info,data){const path=info.outputPath('interactions.json');fs.mkdirSync(info.outputDir,{recursive:true});fs.writeFileSync(path,JSON.stringify({caseId:info.title.split(' ')[0],sourceFingerprint:JSON.parse(fs.readFileSync('full-campaign-build.json')).sourceFingerprint,buildFingerprint:digest(fs.readFileSync('full-campaign-build.json')),setup:'Real reducer fixtures; only subsequent native gestures are browser evidence.',...data},null,2),{flag:'wx'});await info.attach('interactions',{path,contentType:'application/json'});}
async function invitation(page){const touch=await h.compact(page);if(touch)await h.panel(page,'progress',true);await h.press(page.getByRole('button',{name:boundary.entryButton,exact:true}),touch);}
test.beforeEach(async({page,context})=>{await h.instrumentation(context);await h.open(page);});
test.afterEach(async({page})=>h.audit(page));
scenario('B14 a loaded v5 writer cannot overwrite native v6 migration or second entry',async({page,context},info)=>{
 const old=retainedV5();await h.seedRaw(page,old);const probe=await context.newPage();await probe.goto('/stage-b-probe/index.html');const opened=await probe.evaluate(()=>window.stageBProbe.open());expect(opened.status).toBe('saved');expect(opened.state).toEqual(old);
 await page.reload();await waitSaved(page,E.upgradeCareer(old));expect(await h.read(page)).toEqual(E.upgradeCareer(old));
 const attempts=[];for(let n=0;n<2;n++){const bytes=await h.bytes(page);const result=await probe.evaluate(()=>window.stageBProbe.supply());expect(result.status).toBe('practice');expect(result.ok).toBe(n===1);expect(await h.bytes(page)).toBe(bytes);attempts.push(result);if(n===0){await invitation(page);const before=await h.read(page);await h.changed(page,before,()=>page.getByRole('button',{name:'Begin Cross Currents',exact:true}).click());}}
 await probe.close();await evidence(info,{attempts,after:await h.stateProof(page)});
});
scenario('B15 competing second-entry tabs preserve desk promises stock and partial cursors once',async({page,context},info)=>{
 await h.seed(page,E.upgradeCareer(retainedV5()));const before=await h.read(page),saved=await h.bytes(page);expect(before.sources.bird.cursor).toBeGreaterThan(0);expect(before.board.some(t=>t?.pieceId==='b5')).toBe(true);
 for(let n=0;n<2;n++){await invitation(page);await page.getByRole('button',{name:boundary.deferButton,exact:true}).click();expect(await h.bytes(page)).toBe(saved);}
 const other=await context.newPage();await h.open(other);await invitation(page);await invitation(other);
 const after=await h.race(page,other,()=>page.getByRole('button',{name:'Begin Cross Currents',exact:true}).click(),()=>other.getByRole('button',{name:'Begin Cross Currents',exact:true}).click());retainedTransition(before,after);
 const bytes=await h.bytes(page);for(const p of [page,other]){await reloadStable(p);expect(await h.bytes(p)).toBe(bytes);await expect(p.getByRole('button',{name:boundary.entryButton,exact:true})).toHaveCount(0);}
 await other.close();await evidence(info,{before,after});
});
scenario('B16 occupied new art remains readable at 320 360 390 430 and enlarged text',async({page},info)=>{
 await h.seed(page,occupiedNewBoard());const expected=(await h.read(page)).board.filter(Boolean).map(t=>t.pieceId),rows=[];
 for(const large of [false,true]){if(large){await h.panel(page,'help');const before=await h.read(page);await h.changed(page,before,()=>page.getByRole('button',{name:'Use larger text',exact:true}).click());await h.close(page);}
 const saved=await h.bytes(page);for(const width of [320,360,390,430]){await page.setViewportSize({width,height:844});await expect(page.locator('[data-career-cell]')).toHaveCount(25);await expect(page.locator('.career-producer')).toHaveCount(2);const readiness=await h.captureImageReadiness(page);occupiedProof(readiness,expected);const geometry=await h.noOverflow(page,large?{mode:'large-text'}:{touch:true}),hud=await h.hudReadability(page),images=await h.imageProof(page);expect(await h.bytes(page)).toBe(saved);const name=`B16-${width}-${large?'large':'normal'}.png`;screenshotAllowed(name);const path=info.outputPath(name);fs.mkdirSync(info.outputDir,{recursive:true});expect(fs.existsSync(path)).toBe(false);const dimensions=await page.evaluate(()=>[Math.round(innerWidth*devicePixelRatio),Math.round(Math.max(document.documentElement.scrollHeight,innerHeight)*devicePixelRatio)]);await page.screenshot({path,fullPage:true});const bytes=fs.readFileSync(path);verifyPng(bytes,dimensions);rows.push({width,large,readiness,geometry,hud,images,screenshot:{name,bytes:bytes.length,sha256:digest(bytes),dimensions}});}}
 await evidence(info,{rows});
});
scenario('B17 all eight new source families make exact board art and Cut Undo restores stock',async({page},info)=>{
 await h.seed(page,occupiedNewBoard());const rows=[];for(const f of C.FAMILIES.slice(40)){const before=await h.read(page),touch=await h.compact(page);await h.selectSource(page,f.id,0,touch);const selected=await h.read(page);expect(selected.board).toEqual(before.board);expect(selected.sources).toEqual(before.sources);
 const [drawn,tileId]=await h.draw(page,f.id,{basic:true,touch});expect(drawn.board.find(t=>t?.id===tileId).pieceId).toBe(f.pieceIds[0]);const drawnImages=await h.imageProof(page);const restored=await h.changed(page,drawn,()=>h.press(page.getByRole('button',{name:'Undo',exact:true}),touch));for(const key of ['board','sources','material'])expect(restored[key]).toEqual(selected[key]);
 const pieceId=f.pieceIds[2],at=selected.board.findIndex(t=>t?.pieceId===pieceId);expect(at).toBeGreaterThanOrEqual(0);await h.press(page.locator(`[data-career-cell="${at}"]`),touch);const cut=await h.changed(page,restored,()=>h.press(page.getByRole('button',{name:'Cut',exact:true}),touch));expect(cut.board.filter(t=>t?.pieceId===f.pieceIds[1])).toHaveLength(2);expect(cut.material).toEqual(selected.material);expect(cut.xp).toBe(selected.xp);
 const undone=await h.changed(page,cut,()=>h.press(page.getByRole('button',{name:'Undo',exact:true}),touch));for(const key of ['board','sources','material','xp','coinsEarned','coinsSpent'])expect(undone[key]).toEqual(selected[key]);
 const sourceProof=await h.imageProof(page);expect(sourceProof.some(i=>i.location==='source'&&i.pieceId===E.nextOutput(undone,f.id).id)).toBe(true);rows.push({family:f.id,sourceProof,drawnImages});}
 await evidence(info,{rows});
});
scenario('B18 authored first sends unlock Parcel and Trumpet without moving retained desk stock',async({page},info)=>{
 const rows=[];for(const [number,family]of [[22,'tied-parcel'],[24,'trumpet']]){let fixture=newChapterEntry(number),o=fixture.orders.find(o=>o.storyLetterId===C.CHAPTERS[number-1].storyIds[0]);fixture=d.ready(fixture,o);await h.seed(page,fixture);const before=await h.read(page),desk=before.orders.find(o=>o.slot===2),touch=await h.compact(page);expect(before.unlockedSources).not.toContain(family);await h.panel(page,'sources',touch);await expect(page.getByRole('button',{name:new RegExp(`^${C.FAMILIES.find(f=>f.id===family).shortName},`)})).toHaveCount(0);await h.close(page,touch);
 const after=await h.send(page,o,touch);expect(after.unlockedSources).toContain(family);expect(after.material[family].generated).toBe(0);expect(after.orders.find(o=>o.slot===2)).toEqual(desk);expect(after.sources.bird).toEqual(before.sources.bird);expect(after.milestones.filter(id=>id===o.storyLetterId)).toHaveLength(1);
 const removed=new Set(E.matchingTiles(before,o));expect(after.board.filter(Boolean)).toEqual(before.board.filter(t=>t&&!removed.has(t.id)));expect(after.xp).toBe(before.xp+o.xp);expect(after.coinsEarned).toBe(before.coinsEarned+o.coins);await h.selectSource(page,family,1,touch);const images=await h.imageProof(page);expect(images.some(i=>i.location==='source'&&i.pieceId===C.FAMILIES.find(f=>f.id===family).pieceIds[0])).toBe(true);rows.push({chapter:number,before,after,images});}
 await evidence(info,{rows});
});
