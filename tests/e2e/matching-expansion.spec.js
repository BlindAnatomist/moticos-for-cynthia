import { decodeMatchingSave } from '../capacity/readStoredSave.js';
import { test, expect } from '@playwright/test';
import {
  selectCollectionEnvelope, MATCHING_KEY, NAMES, pieces, cell, occupied, supply, activate, boardIds, rawSave,
  idle, mergeAt, mergeId, finishFamily, closeDialog, imagesReady, shot, downloadPNG,
  openCollectedPostcard, assertNoOverflow, assertControls, assertLiveArtAtPhoneWidths,
  openSaveWarning, assertSaveWarning, saveWarning,
} from './matching-helpers.js';
const MOON_KEY = 'moticos.matching.moonlit-passage.v1';
const moonURL = '/?envelope=moonlit-passage';
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  errors.set(page, []); page.on('pageerror', error => errors.get(page).push(error.message));
  await page.goto('/'); await expect(page.locator('.mg-page .cg-board')).toBeVisible();
});
test.afterEach(async ({ page }) => expect(errors.get(page), 'no uncaught page errors').toEqual([]));
async function choose(page, info, title) {
  await idle(page); await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
  await activate(page.getByRole('button', { name: `Open ${title}`, exact: true }), info);
  await expect(page.getByRole('dialog')).toHaveCount(0); await idle(page);
}
async function moon(page, info) { await choose(page, info, 'Moonlit Passage'); }
async function garden(page, info) { await choose(page, info, 'Garden Correspondence'); }
async function collected(page, info, envelope) {
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  await selectCollectionEnvelope(page, envelope);
}

test('second envelope starts with two readable identities and the same finite matching loop', async ({ page }, info) => {
  await moon(page, info);
  await expect(pieces(page, 'k1')).toHaveCount(4); await expect(pieces(page, 'm1')).toHaveCount(4);
  await expect(page.locator('.cg-progress')).toHaveText('2/10');
  await expect(supply(page, 'key')).toHaveAccessibleName('Add key pair, 6 pairs left');
  await expect(supply(page, 'moon')).toHaveAccessibleName('Add moon pair, 6 pairs left');
  expect(await rawSave(page, MOON_KEY)).toBeNull(); expect(await rawSave(page)).toBeNull();
  await mergeAt(page, 6, 7, info, 'drag'); await mergeId(page, 'k1', info); await mergeId(page, 'k2', info);
  await expect(pieces(page, 'k3')).toHaveCount(1); await expect(page.getByRole('button', { name: 'Open your postcard', exact: true })).toBeEnabled();
  expect(decodeMatchingSave(await rawSave(page, MOON_KEY), MOON_KEY).round.merges).toBe(3); expect(await rawSave(page)).toBeNull();
  await assertLiveArtAtPhoneWidths(page); await shot(page, info, 'moonlit-first-postcard');
});

for (const order of [['key', 'moon'], ['moon', 'key']]) {
  test(`complete Moonlit Passage ${order.join('-')} with real merges and six postcards`, async ({ page }, info) => {
    test.setTimeout(240_000); await moon(page, info); const prefix = order.join('-');
    for (const family of order) await finishFamily(page, family, info, 'drag', async id => {
      if (Number(id[1]) >= 3 || order[0] === 'key') { await assertLiveArtAtPhoneWidths(page, order[0] === 'key' ? info : null, `moonlit-round-${id}`); await shot(page, info, `moonlit-${prefix}-${id}`); }
    });
    const save = decodeMatchingSave(await rawSave(page, MOON_KEY), MOON_KEY);
    expect(save.round).toMatchObject({ moves: 42, merges: 30, supply: { key: 0, moon: 0 } });
    expect(save.discoveries).toHaveLength(10); await expect(occupied(page)).toHaveCount(2);
    await expect(pieces(page, 'k5')).toHaveCount(1); await expect(pieces(page, 'm5')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Two worlds, made by you.' })).toBeVisible();
    if (order[0] === 'key') await assertLiveArtAtPhoneWidths(page, info, 'moonlit-round-done');
    const board = await boardIds(page), hashes = [];
    for (const id of ['k3', 'k4', 'k5', 'm3', 'm4', 'm5']) {
      await openCollectedPostcard(page, id, info);
      if (order[0] === 'key') { hashes.push(await downloadPNG(page, info, id)); await shot(page, info, `moonlit-postcard-${id}`); }
      await closeDialog(page, info); expect(await boardIds(page)).toEqual(board);
    }
    if (hashes.length) expect(new Set(hashes).size).toBe(6);
    await collected(page, info, 'Moonlit Passage');
    await expect(page.locator('.cg-collection-piece')).toHaveCount(10);
    await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(6);
    for (const title of ['Drawbridge Key', 'Elsewhere Key', 'Lunar Skiff', 'Orbit Voyager']) {
      await page.getByRole('heading', { name: title, exact: true }).scrollIntoViewIfNeeded();
      await imagesReady(page.locator('.cg-collection-piece').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).locator('img')); await shot(page, info, `moonlit-${prefix}-collection-${title.toLowerCase().replaceAll(' ', '-')}`);
    }
    await closeDialog(page, info); await page.reload(); await expect(pieces(page, 'k5')).toHaveCount(1); await expect(pieces(page, 'm5')).toHaveCount(1);
    if (order[0] === 'key') await assertLiveArtAtPhoneWidths(page, info, 'moonlit-round-done-reloaded');
  });
}

test('switches preserve both partial boards and independent Undo, including browser Back and Forward', async ({ page }, info) => {
  await mergeAt(page, 6, 7, info); const gardenBefore = await rawSave(page); const gardenBoard = await boardIds(page);
  await moon(page, info); await activate(supply(page, 'moon'), info); const moonBefore = await rawSave(page, MOON_KEY); const moonBoard = await boardIds(page);
  await garden(page, info); expect(await boardIds(page)).toEqual(gardenBoard); expect(await rawSave(page, MOON_KEY)).toBe(moonBefore);
  await page.goBack(); await expect(pieces(page, 'm1')).toHaveCount(6); expect(await boardIds(page)).toEqual(moonBoard);
  await page.goForward(); await expect(pieces(page, 'b2')).toHaveCount(1); expect(await rawSave(page)).toBe(gardenBefore);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info); await expect(pieces(page, 'b1')).toHaveCount(4);
  expect(await rawSave(page, MOON_KEY)).toBe(moonBefore); await moon(page, info); await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  await expect(pieces(page, 'm1')).toHaveCount(4); await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.reload(); await expect(pieces(page, 'k1')).toHaveCount(4); await expect(page).toHaveURL(/envelope=moonlit-passage/);
});

test('other-envelope postcards return to unchanged active board and collection view does not switch play', async ({ page }, info) => {
  await mergeId(page, 'b1', info); await mergeId(page, 'b1', info); await mergeId(page, 'b2', info);
  await moon(page, info); await activate(supply(page, 'key'), info); const board = await boardIds(page); const before = await rawSave(page, MOON_KEY);
  await collected(page, info, 'Garden Correspondence');
  const card = page.locator('.cg-collection-piece').filter({ has: page.getByRole('heading', { name: 'Wayfinder', exact: true }) });
  await activate(card.getByRole('button', { name: 'Open postcard', exact: true }), info);
  await expect(page.locator('.cg-postcard figcaption')).toContainText('Wayfinder');
  await expect(page.getByRole('button', { name: 'Download postcard', exact: true })).toBeEnabled();
  await closeDialog(page, info); expect(await boardIds(page)).toEqual(board); expect(await rawSave(page, MOON_KEY)).toBe(before);
  await expect(page).toHaveURL(/envelope=moonlit-passage/);
});

test('fresh envelope names its target and resets only that board', async ({ page }, info) => {
  await mergeAt(page, 6, 7, info); const gardenBefore = await rawSave(page); await moon(page, info); await mergeAt(page, 6, 7, info);
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
  await expect(page.getByRole('dialog')).toContainText('Moonlit Passage'); await closeDialog(page, info); await expect(pieces(page, 'k2')).toHaveCount(1);
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info); await activate(page.getByRole('button', { name: 'Start fresh', exact: true }), info);
  await expect(pieces(page, 'k1')).toHaveCount(4); expect(await rawSave(page)).toBe(gardenBefore);
  const reset = decodeMatchingSave(await rawSave(page, MOON_KEY), MOON_KEY); expect(reset.history).toEqual([]); expect(reset.discoveries).toContain('k2');
});

for (const key of [MATCHING_KEY, MOON_KEY]) {
  test(`corrupt ${key} retains temporary board across switches and exports exact original bytes`, async ({ page }, info) => {
    const raw = ' {"version":99,"untouched":"original bytes"}\n';
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw }); await page.reload();
    if (key === MOON_KEY) await moon(page, info);
    const activeFamily = key === MOON_KEY ? 'key' : 'bird'; await activate(supply(page, activeFamily), info); const board = await boardIds(page);
    if (key === MOON_KEY) { await garden(page, info); await moon(page, info); } else { await moon(page, info); await garden(page, info); }
    expect(await boardIds(page)).toEqual(board); expect(await rawSave(page, key)).toBe(raw);
    await openSaveWarning(page, info);
    const pending = page.waitForEvent('download'); await activate(page.getByRole('button', { name: 'Download original save', exact: true }), info);
    const download = await pending; expect(download.suggestedFilename()).toBe(`moticos-${key === MOON_KEY ? 'moonlit-passage' : 'matching-garden'}-original-save.json`);
    const stream = await download.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk); expect(Buffer.concat(chunks).toString()).toBe(raw);
    await closeDialog(page, info);
    await activate(page.getByRole('button', { name: 'Undo', exact: true }), info); await expect(occupied(page)).toHaveCount(8); expect(await rawSave(page, key)).toBe(raw);
  });
}

test('storage quota failure does not lose temporary state when switching envelopes', async ({ page }, info) => {
  await page.evaluate(key => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(k, value) { if (k === key) throw new DOMException('quota', 'QuotaExceededError'); return set.call(this, k, value); }; }, MATCHING_KEY);
  await activate(supply(page, 'bird'), info); const board = await boardIds(page);
  await assertSaveWarning(page, info, 'cannot safely save'); await moon(page, info); await activate(supply(page, 'moon'), info);
  await garden(page, info); expect(await boardIds(page)).toEqual(board); expect(await rawSave(page)).toBeNull();
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info); await expect(occupied(page)).toHaveCount(8);
});

test('a denied localStorage property permits temporary play and safe switching', async ({ page }, info) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } }));
  await page.reload(); await expect(saveWarning(page)).toBeVisible(); await activate(supply(page, 'bird'), info); const board = await boardIds(page);
  await moon(page, info); await activate(supply(page, 'key'), info); await garden(page, info); expect(await boardIds(page)).toEqual(board);
});

test('inactive envelope changed elsewhere is protected when resumed', async ({ page, context }, info) => {
  await activate(supply(page, 'bird'), info); const originalBoard = await boardIds(page); await moon(page, info);
  const other = await context.newPage(); await other.goto('/'); await expect(supply(other, 'fern')).toBeEnabled(); await activate(supply(other, 'fern'), info);
  const external = await rawSave(other); await other.close(); await garden(page, info);
  await assertSaveWarning(page, info, 'Another tab'); expect(await boardIds(page)).toEqual(originalBoard);
  await activate(supply(page, 'bird'), info); expect(await rawSave(page)).toBe(external);
  await moon(page, info); await garden(page, info); await expect(pieces(page, 'b1')).toHaveCount(8); expect(await rawSave(page)).toBe(external);
});

test('mute choice stays muted on switching and reloading the destination', async ({ page }, info) => {
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info); await moon(page, info);
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
  await activate(supply(page, 'moon'), info); expect(decodeMatchingSave(await rawSave(page, MOON_KEY), MOON_KEY).sound).toBe(false);
});

test('chooser, collection selector, help and long family labels fit compact phone geometry', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 780 }); await moon(page, info); await imagesReady(page.locator('.cg-board img'));
  await assertNoOverflow(page); await assertControls(page, '.cg-footer button, .cg-header button, .cg-tools button');
  await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info); await assertNoOverflow(page); await shot(page, info, 'moonlit-compact-chooser'); await closeDialog(page, info);
  await collected(page, info, 'Moonlit Passage'); await assertControls(page, '.mg-album-picker select'); await shot(page, info, 'moonlit-compact-collection'); await closeDialog(page, info);
  await activate(page.getByRole('button', { name: 'How to play', exact: true }), info); await expect(page.getByRole('dialog')).toContainText('key'); await shot(page, info, 'moonlit-compact-help'); await closeDialog(page, info);
});
