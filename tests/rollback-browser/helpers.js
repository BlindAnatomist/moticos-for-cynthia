import { expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { record, pageState, boundedObservation } from './diagnostics.js';
import { captureViolations, collectionViolations } from '../../scripts/rollbackDiagnostics.mjs';
import { RECOVERY_ENVELOPES, PRESERVED_ENVELOPES, getRecoveryEngine } from '../../src/matching/recovery/recoveryRegistry.js';
import { denseSave } from '../capacity/fixtures.js';
export { RECOVERY_ENVELOPES, PRESERVED_ENVELOPES, getRecoveryEngine };
export const originals = Object.fromEntries(RECOVERY_ENVELOPES.map((e, index) => {
  const engine = getRecoveryEngine(e.id), save = denseSave(engine, index + 7);
  save.discoveries = engine.PIECES.map(piece => piece.id); save.sound = index % 2 === 0;
  if (!engine.validSave(save)) throw Error('Invalid synthetic fixture');
  return [e.storageKey, index % 2 ? engine.serializeStoredSave(save) : `\n${engine.serializeSave(save)}\n`];
}));
export async function seed(page) {
  await page.addInitScript(values => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear, storage = localStorage;
    if (!get.call(localStorage, 'moticos.rollback.synthetic-fixture')) {
      for (const [key, value] of Object.entries(values)) set.call(localStorage, key, value);
      set.call(localStorage, 'moticos.rollback.synthetic-fixture', '1');
    }
    window.__rollbackNativeGet = key => get.call(storage, key);
    window.__rollbackWrites = [];
    Storage.prototype.setItem = function (key, value) { window.__rollbackWrites.push({ operation: 'set', key, value }); return set.call(this, key, value); };
    Storage.prototype.removeItem = function (key) { window.__rollbackWrites.push({ operation: 'remove', key }); return remove.call(this, key); };
    Storage.prototype.clear = function () { window.__rollbackWrites.push({ operation: 'clear' }); return clear.call(this); };
  }, originals);
}
export const activate = (locator, info) => info.project.use.hasTouch ? locator.tap() : locator.click();
export async function stored(page) { return page.evaluate(keys => Object.fromEntries(keys.map(key => [key, window.__rollbackNativeGet ? window.__rollbackNativeGet(key) : localStorage.getItem(key)])), Object.keys(originals)); }
export const writes = page => page.evaluate(() => window.__rollbackWrites.length);
export async function unchangedNewer(page) { const all = await stored(page); for (const e of PRESERVED_ENVELOPES) expect(all[e.storageKey]).toBe(originals[e.storageKey]); }
export async function screenshot(page, info, name) {
  const before = await boundedObservation(() => pageState(page)); record(info, 'capture-before', {name,state:before});
  if (name.startsWith('playable-collection-')) expect(collectionViolations(before)).toEqual([]);
  const file = info.outputPath(`${name}.png`); await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout:15000 });
  const after = await boundedObservation(() => pageState(page)); record(info, 'capture-after', {name,state:after,file});
  expect(captureViolations(before,after)).toEqual([]);
  if (name.startsWith('playable-collection-')) expect(collectionViolations(after)).toEqual([]);
  await info.attach(`screenshot-${name}`, { path: file, contentType: 'image/png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
export async function exported(page, info, name) {
  record(info, 'json-download-start', {name});
  const before = await writes(page), next = page.waitForEvent('download', {timeout:15000});
  await activate(page.getByRole('button', { name: 'Download all preserved saves', exact: true }), info);
  const download = await next; expect(download.suggestedFilename()).toBe('moticos-preserved-saves.json');
  const file = info.outputPath(`${name}.json`); await download.saveAs(file); expect(await download.failure()).toBeNull();
  await info.attach(`json-${name}`, { path: file, contentType: 'application/json' });
  expect(await writes(page)).toBe(before); const bytes = await fs.readFile(file,'utf8'), backup = JSON.parse(bytes);
  expect(bytes).toBe(JSON.stringify(backup,null,2)+'\n'); assertBackupIdentity(backup);
  record(info, 'json-download-complete', {name,file,suggestedFilename:download.suggestedFilename(),entries:backup.entries.length,bytes:Buffer.byteLength(bytes)}); return backup;
}
export function assertBackupIdentity(backup) {
  expect(Object.keys(backup).sort()).toEqual(['capturedAt','entries','format','notice']);
  expect(backup.format).toBe('moticos-read-only-recovery-v1');
  expect(typeof backup.capturedAt).toBe('string'); expect(typeof backup.notice).toBe('string');
  expect(backup.entries).toHaveLength(RECOVERY_ENVELOPES.length);
  expect(backup.entries.map(entry=>entry.envelopeId)).toEqual(RECOVERY_ENVELOPES.map(e=>e.id));
  expect(backup.entries.map(entry=>entry.storageKey)).toEqual(RECOVERY_ENVELOPES.map(e=>e.storageKey));
  for (const [i,envelope] of RECOVERY_ENVELOPES.entries()) {
    const entry=backup.entries[i], engine=getRecoveryEngine(envelope.id);
    expect(Object.keys(entry).sort()).toEqual(['catalog','decodedV1','envelopeId','originalAtSessionOpenRaw','playable','sessionConflict','sourceCaptured','sourceRaw','status','storageKey','temporaryV1','title']);
    expect(entry.title).toBe(envelope.title); expect(entry.playable).toBe(i<8);
    expect(entry.catalog).toEqual({families:envelope.catalog.FAMILIES.map(f=>({...f,pieceIds:[...f.pieceIds]})),pieces:envelope.catalog.PIECES.map(({id,familyId,tier,name,shortName,description,mass})=>({id,familyId,tier,name,shortName,description,mass}))});
    expect(typeof entry.sourceCaptured).toBe('boolean'); expect(typeof entry.sessionConflict).toBe('boolean');
    expect(entry.sourceRaw===null||typeof entry.sourceRaw==='string').toBe(true);
    expect(entry.originalAtSessionOpenRaw===null||typeof entry.originalAtSessionOpenRaw==='string').toBe(true);
    const raw=engine.readSave(entry.sourceRaw);
    if(entry.sourceCaptured){expect(entry.status).toBe(raw.status);expect(entry.decodedV1).toBe(raw.save?engine.serializeSave(raw.save):null);}
    else {expect(entry.status).toBe('unavailable');expect(entry.sourceRaw).toBeNull();expect(entry.decodedV1).toBeNull();}
    if(entry.temporaryV1!==null){const decoded=engine.readSave(entry.temporaryV1);expect(decoded.status).toBe('loaded');expect(entry.temporaryV1).toBe(engine.serializeSave(decoded.save));}
  }
}
export function assertCompleteBackup(backup, expected = originals) {
  assertBackupIdentity(backup);
  for(const envelope of RECOVERY_ENVELOPES){
    const entry=backup.entries.find(e=>e.envelopeId===envelope.id),engine=getRecoveryEngine(envelope.id);
    expect(entry.status).toBe('loaded');expect(entry.sourceCaptured).toBe(true);expect(entry.sourceRaw).toBe(expected[envelope.storageKey]);
    expect(entry.decodedV1).toBe(engine.serializeSave(engine.readSave(expected[envelope.storageKey]).save));
  }
}
export async function assertBoard(page, envelopeId, expected) {
  const envelope = RECOVERY_ENVELOPES.find(e => e.id === envelopeId);
  await expect(page.locator('.mg-heading p')).toHaveText(envelope.subtitle);
  expect(await page.locator('[data-matching-cell]').evaluateAll(nodes => nodes.map(n => n.dataset.pieceId))).toEqual(expected.round.board.map(tile => tile?.pieceId ?? 'empty'));
  await expect(page.getByRole('button', { name: expected.sound ? 'Mute sound' : 'Enable sound', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
}
export async function openRecovery(page, info, entryPoint = 'Envelopes') {
  await activate(page.getByRole('button', { name: entryPoint, exact: true }), info);
  await expect(page.getByRole('dialog')).toBeVisible();
  await activate(page.getByRole('button', { name: 'View and back up preserved saves', exact: true }), info);
  await expect(page.getByRole('heading', { name: 'Moticos preserved saves', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to the 80-piece collection', exact: true })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
}
export async function backToBoard(page, info) {
  await activate(page.getByRole('button', { name: 'Back to the 80-piece collection', exact: true }), info);
  await expect(page.locator('[data-matching-cell]')).toHaveCount(25);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  expect(await page.evaluate(() => !document.activeElement?.closest('[inert],dialog:not([open])'))).toBe(true);
}
export async function decodeImages(images, info, group) {
  let index=0;
  for (const img of await images.all()) {
    record(info,'image-start',{group,index});
    await img.scrollIntoViewIfNeeded(); await expect(img).toBeVisible();
    const decoded=await boundedObservation(()=>img.evaluate(async node=>{await node.decode();return {source:node.currentSrc||node.src,complete:node.complete,width:node.naturalWidth,height:node.naturalHeight};}),15000);
    expect(decoded.complete && decoded.width>0 && decoded.height>0).toBe(true);record(info,'image-decoded',{group,index,...decoded});index++;
  }
}
export async function postcard(page, info, sample) {
  const engine = getRecoveryEngine(sample.envelopeId), piece = engine.CATALOG[sample.pieceId];
  const article = page.locator('.cg-collection-piece').filter({ has: page.getByRole('heading', { name: piece.name, exact: true }) });
  await expect(article).toHaveCount(1); await activate(article.getByRole('button', { name: 'Open postcard', exact: true }), info);
  await expect(page.locator('.cg-postcard figcaption')).toContainText(piece.name); await decodeImages(page.locator('.cg-postcard img'),info,`postcard-${sample.envelopeId}`);
  const button = page.getByRole('button', { name: 'Download postcard', exact: true }); await expect(button).toBeEnabled();
  await screenshot(page, info, `postcard-view-${sample.envelopeId}`);
  record(info,'png-download-start',{name:`postcard-${sample.envelopeId}-${sample.pieceId}`});
  const event = page.waitForEvent('download',{timeout:15000}); await activate(button, info); const download = await event;
  expect(download.suggestedFilename()).toBe(`moticos-${piece.name.toLowerCase().replaceAll(' ', '-')}.png`);
  const file = info.outputPath(`postcard-${sample.envelopeId}-${sample.pieceId}.png`); await download.saveAs(file); expect(await download.failure()).toBeNull();
  const bytes = await fs.readFile(file); expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1536,1120]);
  const decoded = await page.evaluate(async data => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 35;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,48,35); const pixels = ctx.getImageData(0,0,48,35).data, colors = new Set();
    for (let i=0;i<pixels.length;i+=4) colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]}`);
    return { width: img.naturalWidth, height: img.naturalHeight, colors: colors.size };
  }, bytes.toString('base64'));
  expect(decoded.width).toBe(1536); expect(decoded.height).toBe(1120); expect(decoded.colors).toBeGreaterThan(10);
  await info.attach(`postcard-${sample.envelopeId}-${sample.pieceId}`, { path: file, contentType: 'image/png' });
  record(info,'png-download-complete',{name:`postcard-${sample.envelopeId}-${sample.pieceId}`,file,suggestedFilename:download.suggestedFilename(),bytes:bytes.length,...decoded});
}
