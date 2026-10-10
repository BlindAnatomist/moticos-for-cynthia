// Newly authored recovery tests. No claim of identity with the lost Stage D suite.
import {test, expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {cropGeometryResidual, verifyCropResidual} from './crop-model.mjs';
import * as h from './helpers.mjs';
import {C, fixture, buildArt} from './fixtures.mjs';
import {BOARD_ART_BOUNDS} from '../../src/career/boardArt.js';
import {scenarioFor, PROPOSAL, failureState} from './scope.mjs';
import {ORIGIN} from '../../full-campaign-gate/scope.mjs';

const title = id => { const row = PROPOSAL.cases.find(row => row.id === id); return `${id} ${row.title}`; };
const touch = info => Boolean(info.project.use.hasTouch);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function setLargeText(page, enabled, isTouch) {
  if ((await h.read(page)).largeText === enabled) return;
  await h.panel(page, 'help', isTouch);
  const before = await h.read(page);
  await h.changed(page, before, () => h.press(page.getByRole('button', {
    name: enabled ? 'Use larger text' : 'Use standard text', exact: true,
  }), isTouch));
  await h.close(page, isTouch);
  await expect(page.locator('.career-shell')).toHaveClass(enabled ? /is-large-text/ : /^(?!.*is-large-text)/);
}

async function decodedCropProof(page, info, label, expectedIds) {
  await h.captureImageReadiness(page);
  const state = await h.read(page);
  const boardIds=state.board.filter(Boolean).map(tile => tile.pieceId);
  const rows = await page.locator('[data-career-cell].has-piece').evaluateAll(async (cells, bounds) => {
    const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
    const pixels = async (image, width, height, crop = null) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', {willReadFrequently: true});
      if (!context) throw Error('Canvas unavailable');
      if (crop) context.drawImage(image, ...crop, 0, 0, width, height);
      else context.drawImage(image, 0, 0, width, height);
      const rgba = context.getImageData(0, 0, width, height).data;
      return hash(rgba);
    };
    const result = [];
    for (const cell of cells) {
      const pieceId = cell.dataset.pieceId, img = cell.querySelector('img');
      const outer = cell.querySelector('.career-art-crop'), inner = outer?.firstElementChild;
      if (!img || !outer || !inner || !bounds[pieceId]) throw Error('Missing live crop identity');
      await img.decode();
      const response = await fetch(img.currentSrc);
      if (!response.ok) throw Error('Artwork fetch failed');
      const blob = await response.blob(), bytes = await blob.arrayBuffer();
      const bitmap = await createImageBitmap(blob);
      try {
        const {source: [sw, sh], crop: [x, y, cw, ch]} = bounds[pieceId];
        const style = element => { const s=getComputedStyle(element); return Object.fromEntries(['paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','maxWidth','maxHeight','transform','position'].map(key=>[key,/^(padding|border)/.test(key)?parseFloat(s[key]):s[key]])); };
        const styles={outer:style(outer),inner:style(inner),image:style(img)};
        const outerBox=outer.getBoundingClientRect(),o=styles.outer;
        const client=[outer.clientWidth,outer.clientHeight],content=[outerBox.width-o.borderLeftWidth-o.borderRightWidth-o.paddingLeft-o.paddingRight,outerBox.height-o.borderTopWidth-o.borderBottomWidth-o.paddingTop-o.paddingBottom];
        const frame = inner.getBoundingClientRect(), image = img.getBoundingClientRect();
        const actual = [frame.width, frame.height, image.width, image.height, image.left - frame.left, image.top - frame.top];

        result.push({pieceId, index: Number(cell.dataset.careerCell), src: img.currentSrc,
          sourceBytes: bytes.byteLength, sourceSha256: await hash(bytes), natural: [img.naturalWidth, img.naturalHeight],
          decodedDimensions: [bitmap.width, bitmap.height],
          domDecodedPixelsSha256: await pixels(img, sw, sh),
          referenceDecodedPixelsSha256: await pixels(bitmap, sw, sh),
          cropPixelsSha256: await pixels(bitmap, cw, ch, [x, y, cw, ch]),
          source: [sw, sh], crop: [x, y, cw, ch], actual, client, content, dpr:devicePixelRatio, styles,
          note: 'Decoded image and source-crop pixels plus live CSS crop geometry; screenshot compositing is reviewed separately.'});
      } finally { bitmap.close(); }
    }
    return result;
  }, BOARD_ART_BOUNDS);
  // Persist every raw measurement before any identity/style/geometry assertion.
  for(const row of rows){try{Object.assign(row,cropGeometryResidual(row));}catch(error){row.modelError=String(error.message).slice(0,256);}}
  const measurement={schemaVersion:1,caseId:'D10',label,project:info.project.name,sourceFingerprint:digest(fs.readFileSync('stage-d-source.json')),buildFingerprint:JSON.parse(fs.readFileSync('stage-d-build.json')).buildFingerprint,probeFingerprint:digest(fs.readFileSync('stage-d-probe.preparation.json')),boardIds,expectedIds,rows};
  const bytes=Buffer.from(JSON.stringify(measurement,null,2)+'\n');
  if(bytes.length>131072)throw Error('Crop measurement receipt exceeded 128 KiB');
  fs.mkdirSync(info.outputDir,{recursive:true});fs.writeFileSync(info.outputPath(`D10-${label}-crop-measurements.json`),bytes,{flag:'wx'});
  expect(boardIds).toEqual(expectedIds);
  expect(rows.map(row => row.pieceId)).toEqual(expectedIds);
  const art = buildArt();
  for (const row of rows) {
    expect(row.sourceSha256).toBe(art.find(entry => entry.id === row.pieceId)?.sha256);
    expect(row.natural).toEqual(row.source);
    expect(row.decodedDimensions).toEqual(row.source);
    expect(row.domDecodedPixelsSha256).toBe(row.referenceDecodedPixelsSha256);
    expect(()=>verifyCropResidual(row), `${row.pieceId} live crop coordinates and independently constrained style`).not.toThrow();
  }
  return rows;
}

async function keyboardRevealEveryPiece(page, ids) {
  const rows = [];
  await page.locator('[data-career-cell="0"]').focus();
  for (let index = 0; index < ids.length; index++) {
    if (index > 0) {
      // Native grid navigation: at row end return Home then ArrowDown.
      if (index % 5 === 0) { await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); }
      else await page.keyboard.press('ArrowRight');
    }
    const cell = page.locator(`[data-career-cell="${index}"]`);
    await expect(cell).toBeFocused();
    await expect(cell).toHaveAttribute('data-piece-id', ids[index]);
    await expect(cell).toBeInViewport({ratio:1});
    const fullLabel=cell.locator('.career-cell-name-full');
    await expect(fullLabel).toBeVisible();
    await expect(fullLabel).toHaveText(C.CATALOG.pieceOf(ids[index]).shortName);
    const measurement = await cell.evaluate(el => {
      const board = el.closest('.career-board'), b = board.getBoundingClientRect(), c = el.getBoundingClientRect();
      const label = el.querySelector('.career-cell-name-full'), r = document.createRange(); r.selectNodeContents(label);
      return {cell: {left:c.left,right:c.right,top:c.top,bottom:c.bottom}, board: {
        left:Math.max(0,b.left+board.clientLeft),right:Math.min(innerWidth,b.left+board.clientLeft+board.clientWidth),
        top:Math.max(0,b.top+board.clientTop),bottom:Math.min(innerHeight,b.top+board.clientTop+board.clientHeight)},
        text:label.textContent,label: [...r.getClientRects()].filter(x=>x.width>0&&x.height>0).map(x=>({left:x.left,right:x.right,top:x.top,bottom:x.bottom})), name:el.getAttribute('aria-label')};
    });
    expect(measurement.cell.left).toBeGreaterThanOrEqual(measurement.board.left - 1);
    expect(measurement.cell.right).toBeLessThanOrEqual(measurement.board.right + 1);
    expect(measurement.cell.top).toBeGreaterThanOrEqual(measurement.board.top - 1);
    expect(measurement.cell.bottom).toBeLessThanOrEqual(measurement.board.bottom + 1);
    expect(measurement.text.trim().length).toBeGreaterThan(0);
    expect(measurement.label.length).toBeGreaterThan(0);
    for (const rect of measurement.label) {
      expect(rect.left).toBeGreaterThanOrEqual(measurement.board.left - 1);
      expect(rect.right).toBeLessThanOrEqual(measurement.board.right + 1);
      expect(rect.top).toBeGreaterThanOrEqual(Math.max(measurement.board.top,measurement.cell.top) - 1);
      expect(rect.bottom).toBeLessThanOrEqual(Math.min(measurement.board.bottom,measurement.cell.bottom) + 1);
    }
    rows.push({pieceId:ids[index],index,...measurement});
  }
  await page.keyboard.press('Control+Home');
  await expect(page.locator('[data-career-cell="0"]')).toBeFocused();
  await page.locator('.career-board').evaluate(el => {el.scrollLeft=0;});
  return rows;
}

async function sourcePickerProof(page) {
  await expect(page.locator('.career-source-options')).toHaveCount(2);
  await expect(page.locator('.career-source-options img')).toHaveCount(128);
  const rows = await page.locator('.career-source-options button').evaluateAll(async nodes => {
    const fetched = new Map(), hash=async buffer=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
    return Promise.all(nodes.map(async node => {
      const img=node.querySelector('img'); await img.decode();
      if(!fetched.has(img.currentSrc)) fetched.set(img.currentSrc,fetch(img.currentSrc).then(async r=>{if(!r.ok)throw Error('Source image fetch failed');const b=await r.arrayBuffer();return{bytes:b.byteLength,sha256:await hash(b)};}));
      return {name:node.querySelector('strong').textContent,label:node.getAttribute('aria-label'),src:img.currentSrc,
        natural:[img.naturalWidth,img.naturalHeight],...(await fetched.get(img.currentSrc))};
    }));
  });
  const art=buildArt();
  for(let slot=0;slot<2;slot++) for(let index=0;index<64;index++) {
    const row=rows[slot*64+index],family=C.FAMILIES[index];
    expect(row.name).toBe(family.shortName);
    expect(row.label).toContain(`${family.shortName}, ${slot?'right':'left'} source`);
    expect(row.sha256).toBe(art.find(entry=>entry.id===family.pieceIds[0])?.sha256);
    expect(row.natural[0]).toBeGreaterThan(0);expect(row.natural[1]).toBeGreaterThan(0);
  }
  return rows;
}

export function registerStressCases() {
  const scenario = scenarioFor(test);
  scenario(title('D10'), async ({page}, info) => {
    const rows=[];
    for (const [name,start] of [['first20',280],['last20',300]]) {
      await h.seedStable(page,fixture('stock-'+name));
      await setLargeText(page,false,touch(info));
      const ids=C.CATALOG.PIECES.slice(start,start+20).map(p=>p.id);
      const standardBytes=await h.bytes(page),standardCheckpoint=await h.writeCheckpoint(page);
      const standard=await decodedCropProof(page,info,`${name}-standard`,ids);
      await h.shot(page,info,`D10-${name}-standard.png`);
      expect(await h.bytes(page)).toBe(standardBytes);await h.durableNoWrites(page,standardCheckpoint);
      await setLargeText(page,true,touch(info));
      const largeBytes=await h.bytes(page),largeCheckpoint=await h.writeCheckpoint(page);
      const large=await decodedCropProof(page,info,`${name}-large`,ids),keyboard=await keyboardRevealEveryPiece(page,ids);
      await h.shot(page,info,`D10-${name}-large.png`);
      expect(await h.bytes(page)).toBe(largeBytes);await h.durableNoWrites(page,largeCheckpoint);
      rows.push({name,ids,standard,large,keyboard});
    }
    expect(new Set(rows.flatMap(row=>row.standard.map(x=>x.referenceDecodedPixelsSha256))).size).toBe(40);
    await h.record(info,{rows,decodedIdentities:40,largeKeyboardReveals:40,visualAcceptance:'Pending independent review of four original screenshots.'});
  });
  scenario(title('D11'), async ({browser,diagnostics},info) => {
    const use=info.project.use;
    const contextOptions={...use.contextOptions,baseURL:use.baseURL??ORIGIN};
    for(const key of ['viewport','screen','deviceScaleFactor','hasTouch','isMobile','userAgent','locale','timezoneId','colorScheme','reducedMotion','forcedColors','javaScriptEnabled','acceptDownloads','serviceWorkers']) {
      if(use[key]!==undefined)contextOptions[key]=use[key];
    }
    const isolated=await browser.newContext(contextOptions);
    diagnostics.watchContext(isolated);
    isolated.setDefaultTimeout(use.actionTimeout??7500);
    isolated.setDefaultNavigationTimeout(use.navigationTimeout??15000);
    let page;
    try {
      await h.instrumentation(isolated);page=await isolated.newPage();
      const loads=[];
      for(const kind of ['first-isolated-load','repeat-load']) {
        const start=performance.now();
        if(kind==='first-isolated-load')await h.open(page);else {await h.flushWrites(page);await page.reload();}
        await expect(page.locator('.career-shell')).toHaveAttribute('data-save-status','saved');
        await h.captureImageReadiness(page);
        loads.push({kind,elapsedMs:performance.now()-start,navigation:await page.evaluate(()=>performance.getEntriesByType('navigation').map(n=>({type:n.type,duration:n.duration,domContentLoaded:n.domContentLoadedEventEnd}))) });
      }
      await h.seedStable(page,fixture('all-new-discovered'));
      const saved=await h.bytes(page),checkpoint=await h.writeCheckpoint(page);
      expect((await h.read(page)).unlockedSources).toHaveLength(64);
      let start=performance.now();await h.panel(page,'sources',touch(info));
      const sources=await sourcePickerProof(page),sourcePickerMs=performance.now()-start;
      await h.shot(page,info,'D11-all-sources-first.png',{captureKind:'viewport-modal',modal:{selector:'.career-dialog',targets:['.career-source-panel fieldset:first-of-type .career-source-options button:first-child']},frame:async()=>{const first=page.getByRole('dialog').locator('.career-source-options button').first();await first.scrollIntoViewIfNeeded();await expect(first).toBeInViewport({ratio:1});}});
      const sourceDialog=page.getByRole('dialog'),lastSource=sourceDialog.locator('.career-source-options button').last(),back=sourceDialog.getByRole('button',{name:'Back to my board',exact:true});
      let sourceFooterView;
      await h.shot(page,info,'D11-all-sources-last.png',{captureKind:'viewport-modal',modal:{selector:'.career-dialog',targets:['.career-source-panel fieldset:last-of-type .career-source-options button:last-child','.career-source-panel > .career-dialog-actions > button']},frame:async()=>{
      await back.scrollIntoViewIfNeeded();await expect(back).toBeInViewport({ratio:1});await expect(lastSource).toBeInViewport({ratio:1});
      sourceFooterView=await sourceDialog.evaluate(dialog=>{const rect=el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};},d=dialog.getBoundingClientRect(),buttons=[...dialog.querySelectorAll('.career-source-options button')],back=[...dialog.querySelectorAll('button')].find(el=>el.textContent.trim()==='Back to my board');return{lastSource:rect(buttons.at(-1)),back:rect(back),scrollport:{left:d.left+dialog.clientLeft,right:d.left+dialog.clientLeft+dialog.clientWidth,top:d.top+dialog.clientTop,bottom:d.top+dialog.clientTop+dialog.clientHeight},scrollTop:dialog.scrollTop,scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight,overflowY:getComputedStyle(dialog).overflowY};});
      for(const box of [sourceFooterView.lastSource,sourceFooterView.back])for(const [key,lower] of [['left',true],['top',true],['right',false],['bottom',false]]){if(lower)expect(box[key]).toBeGreaterThanOrEqual(sourceFooterView.scrollport[key]-1);else expect(box[key]).toBeLessThanOrEqual(sourceFooterView.scrollport[key]+1);}
      if(sourceFooterView.scrollHeight>sourceFooterView.clientHeight+1)expect(['auto','scroll']).toContain(sourceFooterView.overflowY);
      }});await h.press(back,touch(info));await expect(page.getByRole('dialog')).toHaveCount(0);
      start=performance.now();await h.panel(page,'collection',touch(info));
      const pieceId=C.FAMILIES[56].pieceIds[4];await h.revealCollectionPiece(page,pieceId);
      const collectionMs=performance.now()-start;start=performance.now();await h.collectionPiece(page,pieceId).click();
      await expect(page.getByRole('button',{name:'Download postcard',exact:true})).toBeEnabled();
      const postcardMs=performance.now()-start;expect(await h.bytes(page)).toBe(saved);await h.close(page,touch(info));
      await h.panel(page,'help',touch(info));
      await h.flushWrites(page);
      await page.goto('/stage-d-probe/stage-d-evidence/browser/probe/current/index.html');
      await expect.poll(()=>page.evaluate(()=>Boolean(window.stageDProbe))).toBe(true);
      const cache=await page.evaluate(ids=>window.stageDProbe.cacheStress(ids),C.FAMILIES.slice(56).map(f=>f.pieceIds[4]));
      expect(cache.firstRepeat.sameBlob).toBe(true);expect(cache.firstRepeat.hashes[0]).toBe(cache.firstRepeat.hashes[1]);
      expect(cache.burst.fulfilled).toBe(4);expect(cache.burst.busy).toBe(4);expect(cache.burst.otherErrors).toEqual([]);
      expect(cache.afterBurst.inFlight).toBe(0);expect(cache.afterEviction.evictions).toBeGreaterThan(cache.beforeEviction.evictions);
      for(const stats of cache.snapshots){expect(stats.maxEntries).toBe(6);expect(stats.maxBytes).toBe(12*1024*1024);expect(stats.maxPending).toBe(4);expect(stats.completedEntries).toBeLessThanOrEqual(6);expect(stats.retainedBytes).toBeLessThanOrEqual(12*1024*1024);expect(stats.inFlight).toBeLessThanOrEqual(4);}
      await h.flushWrites(page);await page.goBack();await expect(page.locator('.career-shell')).toHaveAttribute('data-save-status','saved');expect(await h.bytes(page)).toBe(saved);
      await h.flushWrites(page);await page.goForward();await expect.poll(()=>page.evaluate(()=>Boolean(window.stageDProbe))).toBe(true);expect(await h.bytes(page)).toBe(saved);
      await h.flushWrites(page);await page.goBack();await expect(page.locator('.career-shell')).toHaveAttribute('data-save-status','saved');expect(await h.bytes(page)).toBe(saved);
      await h.durableNoWrites(page,checkpoint);await h.audit(page);
      await h.record(info,{loads,sourcePickerMs,collectionMs,postcardMs,sources,sourceFooterView,cache,savedSha256:digest(Buffer.from(saved)),
        navigation:'Native Back, Forward, Back after opening a view; exact saved bytes and acknowledged cross-navigation write journal unchanged. Each departure flushes known pending acknowledgments; not a general proof against unobserved unload-time writes.',
        timingScope:'Observed elapsed values, not device-wide performance guarantees. Playwright request routing disables HTTP cache; repeat-load is not an HTTP-cache benchmark.'});
    } catch(error) {
      // The scenario wrapper owns a different fixture page. Record the actual
      // failing isolated page now; failureState's per-output guard suppresses
      // the wrapper's later duplicate capture after this context is closed.
      await failureState(page,info,error,{isolatedD11Context:true});
      throw error;
    } finally {await isolated.close();}
  });
}
