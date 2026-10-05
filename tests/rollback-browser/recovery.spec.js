import { test, expect } from '@playwright/test';
import { record, preserveFailureDiagnosis } from './diagnostics.js';
import { CORE_CASES, POSTCARD_SAMPLES, postcardCase } from './plan.js';
import { RECOVERY_ENVELOPES, PRESERVED_ENVELOPES, getRecoveryEngine, originals, seed, activate, stored, writes, unchangedNewer, screenshot, exported, assertCompleteBackup, assertBoard, openRecovery, backToBoard, decodeImages, postcard } from './helpers.js';
test.beforeEach(async ({ page, browser }, info) => {
  record(info,'begin',{browserVersion:browser.version(),nodeVersion:process.version,runCommit:process.env.GITHUB_SHA??'offline',guardedArguments:JSON.parse(process.env.MOTICOS_ROLLBACK_GUARDED_ARGV),budgetMs:Number(process.env.MOTICOS_ROLLBACK_BROWSER_BUDGET_MS??540000)});
  page.on('pageerror',error=>record(info,'page-error',{message:String(error)}));
  await seed(page);record(info,'seed-ready');
});
test.afterEach(async ({page},info)=>{
  info.setTimeout(info.timeout+25000);
  try{await preserveFailureDiagnosis(page,info);}catch(error){record(info,'diagnosis-unavailable',{message:String(error)});}
  record(info,'end',{status:info.status});await info.attach('observations',{path:info.outputPath('observations.jsonl'),contentType:'application/x-ndjson'});
});

test(CORE_CASES[0], async ({ page }, info) => {
  test.setTimeout(180000);
  for (const [index,e] of PRESERVED_ENVELOPES.entries()) {
    await page.goto(`/?envelope=${e.id}`);
    await expect(page.getByRole('heading', { name: 'Moticos preserved saves', exact: true })).toBeVisible();
    if (index===0) await screenshot(page, info, 'recovery-top-controls');
    await expect(page.locator('[data-matching-cell], .cg-tools, .mg-supply, .cg-postcard-actions')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Undo|Cut|Fresh envelope|Download postcard|Open postcard)$/ })).toHaveCount(0);
    const record = page.getByRole('region', { name: `${e.title} preserved save`, exact: true });
    await record.getByRole('heading').scrollIntoViewIfNeeded(); await expect(record.getByRole('heading')).toBeInViewport();
    await expect(record).toContainText('10 / 10 pictures discovered'); await expect(record).toContainText('100 Undo snapshots retained');
    await screenshot(page, info, `recovery-${e.id}-summary`);
    for (const family of e.catalog.FAMILIES) {
      const line = record.locator('ul').first().locator('li').filter({ hasText: `${family.name}:` });
      await line.scrollIntoViewIfNeeded(); await expect(line).toBeInViewport();
      for (const id of family.pieceIds) await expect(line).toContainText(e.catalog.CATALOG[id].name);
      await screenshot(page, info, `recovery-${e.id}-family-${family.id}`);
    }
    await activate(record.locator('summary'), info); const pre = record.locator('pre'); await expect(pre).toBeVisible();
    const decoded = JSON.parse(await pre.textContent()); expect(decoded).toEqual(getRecoveryEngine(e.id).readSave(originals[e.storageKey]).save); expect(decoded.history).toHaveLength(100);
    const boardLine = record.locator('details li').first(); await boardLine.scrollIntoViewIfNeeded(); await expect(boardLine).toBeInViewport(); await expect(boardLine).toContainText('Row ');
    await screenshot(page, info, `recovery-${e.id}-board-details`);
    await pre.scrollIntoViewIfNeeded(); await pre.focus(); await expect(pre).toBeFocused();
    await pre.evaluate(node => { node.scrollTop = node.scrollHeight; });
    expect(await pre.evaluate(node => node.scrollTop > 0 && node.scrollHeight > node.clientHeight)).toBe(true);
    await screenshot(page, info, `recovery-${e.id}-history-end`);
    await activate(record.locator('summary'), info); await expect(pre).not.toBeVisible(); expect(await writes(page)).toBe(0);
  }
  await page.getByRole('button', { name: 'Download all preserved saves', exact: true }).scrollIntoViewIfNeeded();
  const backup = await exported(page, info, 'all-12-saves'); assertCompleteBackup(backup);
  for (const e of backup.entries) expect(JSON.parse(e.decodedV1).history).toHaveLength(100);
  expect(await stored(page)).toEqual(originals); expect(await writes(page)).toBe(0);
});

test(CORE_CASES[1], async ({ page }, info) => {
  const id='moonlit-passage',engine=getRecoveryEngine(id),expected=engine.readSave(originals[engine.STORAGE_KEY]).save;
  await page.goto(`/?envelope=${id}`); await assertBoard(page,id,expected);
  for(const [index,entry] of ['Envelopes','Collection','Envelopes'].entries()) {
    await openRecovery(page,info,entry); await screenshot(page,info,`navigation-${entry.toLowerCase()}-${index+1}-recovery`);
    await backToBoard(page,info); await assertBoard(page,id,expected);
    await page.goBack(); await expect(page.getByRole('heading',{name:'Moticos preserved saves',exact:true})).toBeVisible();
    await page.goForward(); await assertBoard(page,id,expected);
  }
  await openRecovery(page,info,'Collection'); await page.reload(); await backToBoard(page,info); await assertBoard(page,id,expected);
  await activate(page.getByRole('button',{name:'Collection',exact:true}),info); await expect(page.getByRole('dialog')).toBeVisible();
  await activate(page.getByRole('button',{name:'Back to board',exact:true}),info);
  await expect(page.getByRole('button',{name:'Collection',exact:true})).toBeFocused();
  expect(await stored(page)).toEqual(originals); expect(await writes(page)).toBe(0); await screenshot(page,info,'non-default-restored-board');
});

test(CORE_CASES[2], async ({ page, context }, info) => {
  const e=PRESERVED_ENVELOPES[0],engine=getRecoveryEngine(e.id),next=engine.act(engine.readSave(originals[e.storageKey]).save,{type:'undo'}),raw=engine.serializeStoredSave(next);
  await page.goto('/?save-recovery=1'); const before=await exported(page,info,'freshness-before'); assertCompleteBackup(before);
  const other=await context.newPage(); await other.goto('/?save-recovery=1'); await other.evaluate(({key,value})=>localStorage.setItem(key,value),{key:e.storageKey,value:raw}); await other.close();
  await expect(page.getByRole('region',{name:`${e.title} preserved save`,exact:true})).toContainText('99 Undo snapshots retained');
  await activate(page.getByRole('button',{name:'Refresh saved progress',exact:true}),info);
  const after=await exported(page,info,'freshness-after'); assertCompleteBackup(after,{...originals,[e.storageKey]:raw});
  expect(after.entries[8].sourceRaw).not.toBe(before.entries[8].sourceRaw); expect(JSON.parse(after.entries[8].decodedV1).history).toHaveLength(99);
  expect(await writes(page)).toBe(0); expect(await stored(page)).toEqual({...originals,[e.storageKey]:raw});
});

test(CORE_CASES[3], async ({ page }, info) => {
  await page.goto('/?save-recovery=1'); const [empty,corrupt,future,denied]=PRESERVED_ENVELOPES;
  await page.evaluate(keys=>{
    localStorage.removeItem(keys[0]);localStorage.setItem(keys[1],'{broken');localStorage.setItem(keys[2],'{"version":99}');
    const get=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key===keys[3])throw new DOMException('Synthetic read denial','SecurityError');return get.call(this,key);};
  },[empty.storageKey,corrupt.storageKey,future.storageKey,denied.storageKey]);
  const baseline=await writes(page); await activate(page.getByRole('button',{name:'Refresh saved progress',exact:true}),info);
  await page.evaluate(()=>{window.__rollbackCreateObjectURL=URL.createObjectURL;URL.createObjectURL=()=>{throw new Error('Synthetic download initiation failure');};});
  await activate(page.getByRole('button',{name:'Download all preserved saves',exact:true}),info);
  await expect(page.getByRole('status')).toContainText('The backup download could not be started');
  await screenshot(page,info,'download-initiation-failure');expect(await writes(page)).toBe(baseline);
  await page.evaluate(()=>{URL.createObjectURL=window.__rollbackCreateObjectURL;});
  const backup=await exported(page,info,'empty-corrupt-future-read-denied');
  expect(backup.entries.slice(8).map(e=>e.status)).toEqual(['empty','invalid','unsupported','unavailable']);
  expect(backup.entries.slice(8).map(e=>e.sourceRaw)).toEqual([null,'{broken','{"version":99}',null]);
  expect(backup.entries.slice(8).every(e=>e.decodedV1===null)).toBe(true); expect(backup.entries[11].sourceCaptured).toBe(false);
  for(const e of PRESERVED_ENVELOPES){const region=page.getByRole('region',{name:`${e.title} preserved save`,exact:true});await region.scrollIntoViewIfNeeded();await screenshot(page,info,`failure-${e.id}`);}
  expect(await writes(page)).toBe(baseline);
  expect(await stored(page)).toEqual({...originals,[empty.storageKey]:null,[corrupt.storageKey]:'{broken',[future.storageKey]:'{"version":99}'});
  await page.evaluate(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Synthetic storage property denial','SecurityError');}}));
  await activate(page.getByRole('button',{name:'Refresh saved progress',exact:true}),info); const unavailable=await exported(page,info,'whole-storage-read-denied');
  expect(unavailable.entries.every(e=>e.status==='unavailable'&&!e.sourceCaptured&&e.sourceRaw===null&&e.decodedV1===null)).toBe(true); expect(await writes(page)).toBe(baseline);
});

test(CORE_CASES[4], async ({ page, context }, info) => {
  const engine=getRecoveryEngine('moonlit-passage'),original=engine.readSave(originals[engine.STORAGE_KEY]).save;
  const loser=engine.act(original,{type:'undo'}),winner=engine.act(loser,{type:'undo'}),raw=engine.serializeStoredSave(winner);
  await page.goto('/?envelope=moonlit-passage'); await assertBoard(page,'moonlit-passage',original);
  const other=await context.newPage();await other.goto('/?save-recovery=1');await other.evaluate(({key,value})=>localStorage.setItem(key,value),{key:engine.STORAGE_KEY,value:raw});await other.close();
  await expect(page.getByRole('button',{name:'Save warning: temporary play. Show save details',exact:true})).toBeVisible();
  await activate(page.getByRole('button',{name:'Undo',exact:true}),info);await openRecovery(page,info,'Collection');
  const backup=await exported(page,info,'stale-winner-and-temporary-loser');assertCompleteBackup(backup,{...originals,[engine.STORAGE_KEY]:raw});const entry=backup.entries.find(e=>e.storageKey===engine.STORAGE_KEY);
  expect(entry.sourceRaw).toBe(raw);expect(JSON.parse(entry.decodedV1)).toEqual(winner);expect(JSON.parse(entry.temporaryV1)).toEqual(loser);expect(entry.sessionConflict).toBe(true);expect(entry.originalAtSessionOpenRaw).toBe(originals[engine.STORAGE_KEY]);
  await backToBoard(page,info);await assertBoard(page,'moonlit-passage',loser);
  expect(await stored(page)).toEqual({...originals,[engine.STORAGE_KEY]:raw});expect(await writes(page)).toBe(0);
});

test(CORE_CASES[5], async ({ page }, info) => {
  const engine=getRecoveryEngine('matching-garden'),original=engine.readSave(originals[engine.STORAGE_KEY]).save,next=engine.act(original,{type:'undo'});
  await page.goto('/'); await page.evaluate(()=>{Storage.prototype.setItem=function(){window.__rollbackWrites.push({operation:'failed-quota'});throw new DOMException('Synthetic quota','QuotaExceededError');};});
  await activate(page.getByRole('button',{name:'Undo',exact:true}),info); const attempts=await writes(page); expect(attempts).toBeGreaterThan(0);
  await openRecovery(page,info); const backup=await exported(page,info,'quota-preservation');assertCompleteBackup(backup);const first=backup.entries[0];
  expect(first.sourceRaw).toBe(originals[first.storageKey]);expect(JSON.parse(first.decodedV1)).toEqual(original);expect(JSON.parse(first.temporaryV1)).toEqual(next);
  await backToBoard(page,info);await assertBoard(page,'matching-garden',next);expect(await writes(page)).toBe(attempts);expect(await stored(page)).toEqual(originals);
});

test(CORE_CASES[6], async ({ page }, info) => {
  const engine=getRecoveryEngine('matching-garden');let expected=engine.readSave(originals[engine.STORAGE_KEY]).save;await page.goto('/');
  for(let i=0;i<100;i++){
    await activate(page.getByRole('button',{name:'Undo',exact:true}),info);expected=engine.act(expected,{type:'undo'});
    await expect.poll(async()=>engine.readSave((await stored(page))[engine.STORAGE_KEY]).save).toEqual(expected);
    if([0,49,98].includes(i))await page.reload();
  }
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();await unchangedNewer(page);
});

test(CORE_CASES[7], async ({ page }, info) => {
  const e=RECOVERY_ENVELOPES[5],engine=getRecoveryEngine(e.id);expect(JSON.parse(originals[e.storageKey]).version).toBe(2);
  let expected=engine.readSave(originals[e.storageKey]).save;await page.goto(`/?envelope=${e.id}`);await assertBoard(page,e.id,expected);
  await activate(page.getByRole('button',{name:'Undo',exact:true}),info);expected=engine.act(expected,{type:'undo'});await page.reload();await assertBoard(page,e.id,expected);
  expect(engine.readSave((await stored(page))[e.storageKey]).save).toEqual(expected);expect(expected.history).toHaveLength(99);
  await openRecovery(page,info,'Collection');const backup=await exported(page,info,'batch-v2-after-undo');assertCompleteBackup(backup,await stored(page));expect(JSON.parse(backup.entries[5].decodedV1)).toEqual(expected);
  await backToBoard(page,info);await assertBoard(page,e.id,expected);await unchangedNewer(page);await screenshot(page,info,'batch-v2-restored-board');
});

for(const sample of POSTCARD_SAMPLES)test(postcardCase(sample),async({page},info)=>{
  const engine=getRecoveryEngine(sample.envelopeId),expected=engine.readSave(originals[engine.STORAGE_KEY]).save;
  await page.goto(`/?envelope=${sample.envelopeId}`);await assertBoard(page,sample.envelopeId,expected);await decodeImages(page.locator('.cg-board img'),info,`board-${sample.envelopeId}`);
  await screenshot(page,info,`playable-board-${sample.envelopeId}`);
  await activate(page.getByRole('button',{name:'Collection',exact:true}),info);const images=page.locator('.mg-family-collection img');await expect(images).toHaveCount(10);await decodeImages(images,info,`collection-${sample.envelopeId}`);
  for(const family of engine.FAMILIES){const section=page.locator('.mg-family-collection').filter({has:page.getByRole('heading',{name:new RegExp(`^${family.name}`)})});const heading=section.getByRole('heading',{level:3});await expect(heading).toHaveCount(1);await heading.scrollIntoViewIfNeeded();await screenshot(page,info,`playable-collection-${sample.envelopeId}-${family.id}`);}
  await postcard(page,info,sample);await unchangedNewer(page);expect(await stored(page)).toEqual(originals);expect(await writes(page)).toBe(0);
});
