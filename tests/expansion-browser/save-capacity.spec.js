import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { ENVELOPES, getMatchingEngine } from '../../src/matching/expansion/registry.js';
import { fullDiscoveryDenseSave } from './fullDiscoveryFixture.js';
import { denseSave, makeScaleEngine } from '../capacity/fixtures.js';
import { recordBrowserEnvironment, readyScreenshot, activate, boardIds, closeDialog, idle, imagesReady, saveWarning } from './shared-helpers.js';
const garden = getMatchingEngine('matching-garden'), key = garden.STORAGE_KEY;
const dense = denseSave(garden, 217), legacy = garden.serializeSave(dense), compact = garden.serializeStoredSave(dense);
async function capture(page,info,name) {
  await mkdir('batch-test-results/storage-views',{recursive:true});
  const path=`batch-test-results/storage-views/${info.project.name}-${name}.png`;
  await readyScreenshot(page,{path,animations:'disabled'});await info.attach(name,{path,contentType:'image/png'});
}
const ids = save => save.round.board.map(tile => tile?.pieceId ?? 'empty');
const raw = page => page.evaluate(key => localStorage.getItem(key), key);
async function seed(page, value) {
  await page.goto('/'); await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value });
  await page.reload(); await expect(page.locator('.mg-page .cg-board')).toBeVisible(); await idle(page);
}
async function expectBoard(page, save) { await expect.poll(() => boardIds(page)).toEqual(ids(save)); await imagesReady(page.locator('.cg-board img')); }
test.beforeAll(async({browser},info)=>recordBrowserEnvironment(browser,info,'save-capacity'));
const errors = new WeakMap();
test.beforeEach(({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page).push(error.message)); });
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

test('legacy history loads without migration, then exact Undo survives compact reload', async ({ page }, info) => {
  await seed(page, legacy); await expectBoard(page, dense); expect(await raw(page)).toBe(legacy);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  let expected = garden.act(dense, { type: 'undo' }); expect(garden.readSave(await raw(page)).save).toEqual(expected);
  expect(JSON.parse(await raw(page)).version).toBe(2); await page.reload(); await expectBoard(page, expected);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expected = garden.act(expected, { type: 'undo' }); expect(garden.readSave(await raw(page)).save).toEqual(expected);
  await expectBoard(page, expected); await capture(page,info,'restored-board');
});

test('all twelve envelope histories and read-only collection survive compact loading', async ({ page }, info) => {
  const entries = ENVELOPES.map((envelope, index) => { const engine = getMatchingEngine(envelope.id), save = fullDiscoveryDenseSave(engine, index + 90); return { id: envelope.id, key: engine.STORAGE_KEY, raw: engine.serializeStoredSave(save), save }; });
  await page.goto('/'); await page.evaluate(entries => { for (const entry of entries) localStorage.setItem(entry.key, entry.raw); }, entries);
  const measurements = [];
  for (const entry of entries) {
    const start = performance.now(); await page.goto(`/?envelope=${entry.id}`); await expectBoard(page, entry.save);
    await activate(page.getByRole('button', { name: 'Collection', exact: true }), info); await expect(page.getByRole('dialog')).toBeVisible();
    const openedMs = performance.now() - start;
    const dialog = page.getByRole('dialog'), pictures = dialog.locator('.cg-collection-piece img');
    expect(await pictures.count()).toBe(10);
    expect(await dialog.getByRole('button', { name: 'Open postcard', exact: true }).count()).toBe(6);
    // Lazy artwork must actually load before inspecting the visible collection.
    for (const picture of await pictures.all()) { await picture.scrollIntoViewIfNeeded(); await imagesReady(picture); await picture.evaluate(image => image.decode()); }
    await pictures.first().scrollIntoViewIfNeeded(); await expect(dialog).toBeVisible();
    await capture(page,info,`collection-${entry.id}`);
    await closeDialog(page, info); measurements.push({ envelope: entry.id, navigationAndCollectionOpenWallMs: openedMs });
  }
  const actual = await page.evaluate(entries => entries.map(e => localStorage.getItem(e.key)), entries);
  expect(actual).toEqual(entries.map(e => e.raw));
  await info.attach('collection-measurements', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
});

test('quota failure keeps original bytes and the current temporary Undo board', async ({ page }, info) => {
  await seed(page, legacy);
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) { if (this === localStorage && k === key) throw new DOMException('Injected quota failure', 'QuotaExceededError'); return write.call(this, k, v); };
  }, key);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  await expectBoard(page, garden.act(dense, { type: 'undo' })); expect(await raw(page)).toBe(legacy); await expect(saveWarning(page)).toBeVisible();
  await capture(page,info,'temporary-board-quota-warning');
});

test('corrupt compact bytes remain untouched during temporary play and reload', async ({ page }, info) => {
  const corrupt = JSON.parse(compact); corrupt.checksum = '00000000'; const bytes = JSON.stringify(corrupt);
  await seed(page, bytes); await expect(saveWarning(page)).toBeVisible(); await expectBoard(page, garden.newSave());
  await activate(page.getByRole('button', { name: /^Add bird pair,/ }), info); expect(await raw(page)).toBe(bytes);
  await page.reload(); await expect(saveWarning(page)).toBeVisible(); expect(await raw(page)).toBe(bytes);
});

test('a stale tab cannot overwrite another tab compact migration', async ({ page, context }, info) => {
  await seed(page, legacy); const other = await context.newPage(); await other.goto('/'); await expectBoard(other, dense);
  const staleNext = garden.act(dense, { type: 'undo' }), newest = garden.act(staleNext, { type: 'undo' });
  await activate(other.getByRole('button', { name: 'Undo', exact: true }), info); await expectBoard(other, staleNext);
  await activate(other.getByRole('button', { name: 'Undo', exact: true }), info); await expectBoard(other, newest);
  const newer = await raw(other);
  expect(garden.readSave(newer).save).toEqual(newest);
  // A forbidden stale write must be observably different from the winner.
  expect(garden.serializeStoredSave(staleNext)).not.toBe(newer);
  await expect(saveWarning(page)).toBeVisible(); await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect(await raw(page)).toBe(newer); await expectBoard(page, staleNext); await other.close();
});

test('actual origin quota admits 30 compact histories and preserves a near-full legacy replacement', async ({ page }, info) => {
  const fixtures = Array.from({ length: 30 }, (_, index) => { const { engine } = makeScaleEngine(index); const save = denseSave(engine, index + 77); return { key: engine.STORAGE_KEY, raw: engine.serializeStoredSave(save) }; });
  await seed(page, legacy);
  const result = await page.evaluate(fixtures => {
    for (const fixture of fixtures) localStorage.setItem(fixture.key, fixture.raw);
    let filler = 0, quotaName = null;
    for (; filler < 160; filler++) { try { localStorage.setItem(`capacity-test-filler-${filler}`, 'x'.repeat(65536)); } catch (error) { quotaName = error.name; break; } }
    return { fixtureCount: fixtures.length, allExact: fixtures.every(f => localStorage.getItem(f.key) === f.raw), filler, quotaName };
  }, fixtures);
  expect(result.allExact).toBe(true); expect(result.quotaName).toBe('QuotaExceededError');
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect(garden.readSave(await raw(page)).save).toEqual(garden.act(dense, { type: 'undo' })); await expect(saveWarning(page)).toHaveCount(0);
  await info.attach('actual-origin-quota-result', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
});
