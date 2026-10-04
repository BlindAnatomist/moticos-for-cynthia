import { test, expect } from '@playwright/test';
import {
  MATCHING_KEY, pieces, occupied, supply, activate, boardIds, rawSave, idle,
  mergeAt, mergeId, finishFamily, closeDialog, imagesReady, shot, downloadPNG,
  openCollectedPostcard, assertNoOverflow, assertControls, assertLiveArtAtPhoneWidths,
} from './matching-helpers.js';
const RIVER_KEY = 'moticos.matching.riverside-reverie.v1';
const MOON_KEY = 'moticos.matching.moonlit-passage.v1';
const ENVELOPES = [
  { title: 'Garden Correspondence', key: MATCHING_KEY, starter: 'b1', family: 'bird' },
  { title: 'Moonlit Passage', key: MOON_KEY, starter: 'k1', family: 'key' },
  { title: 'Riverside Reverie', key: RIVER_KEY, starter: 'r1', family: 'map' },
];
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
async function river(page, info) { await choose(page, info, 'Riverside Reverie'); }
async function collection(page, info, title) {
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  await activate(page.getByRole('button', { name: title, exact: true }), info);
}

test('third envelope starts with readable map and teacup identities and finite matching pairs', async ({ page }, info) => {
  await river(page, info);
  await expect(pieces(page, 'r1')).toHaveCount(4); await expect(pieces(page, 't1')).toHaveCount(4);
  await expect(page.locator('.cg-progress')).toHaveText('2/10');
  await expect(supply(page, 'map')).toHaveAccessibleName('Add map pair, 6 pairs left');
  await expect(supply(page, 'teacup')).toHaveAccessibleName('Add teacup pair, 6 pairs left');
  for (const envelope of ENVELOPES) expect(await rawSave(page, envelope.key)).toBeNull();
  await mergeAt(page, 6, 7, info, 'drag'); await mergeId(page, 'r1', info); await mergeId(page, 'r2', info);
  await expect(pieces(page, 'r3')).toHaveCount(1); await expect(page.getByRole('button', { name: 'Open your postcard', exact: true })).toBeEnabled();
  expect(JSON.parse(await rawSave(page, RIVER_KEY)).round.merges).toBe(3);
  expect(await rawSave(page)).toBeNull(); expect(await rawSave(page, MOON_KEY)).toBeNull();
  await assertLiveArtAtPhoneWidths(page); await shot(page, info, 'riverside-first-postcard');
});

for (const order of [['map', 'teacup'], ['teacup', 'map']]) {
  test(`complete Riverside Reverie ${order.join('-')} with thirty real merges and six postcards`, async ({ page }, info) => {
    test.setTimeout(240_000); await river(page, info); const prefix = order.join('-');
    for (const family of order) await finishFamily(page, family, info, 'drag', async id => {
      await assertLiveArtAtPhoneWidths(page); await shot(page, info, `riverside-${prefix}-${id}`);
    });
    const save = JSON.parse(await rawSave(page, RIVER_KEY));
    expect(save.round).toMatchObject({ moves: 42, merges: 30, supply: { map: 0, teacup: 0 } });
    expect(save.discoveries).toHaveLength(10); await expect(occupied(page)).toHaveCount(2);
    await expect(pieces(page, 'r5')).toHaveCount(1); await expect(pieces(page, 't5')).toHaveCount(1);
    const board = await boardIds(page), hashes = [];
    for (const id of ['r3', 'r4', 'r5', 't3', 't4', 't5']) {
      await openCollectedPostcard(page, id, info);
      if (order[0] === 'map') { hashes.push(await downloadPNG(page, info, id)); await shot(page, info, `riverside-postcard-${id}`); }
      await closeDialog(page, info); expect(await boardIds(page)).toEqual(board);
    }
    if (hashes.length) expect(new Set(hashes).size).toBe(6);
    await collection(page, info, 'Riverside Reverie');
    await expect(page.locator('.cg-collection-piece')).toHaveCount(10);
    await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(6);
    for (const title of ['River Crossing', 'River Citadel', 'Tea Chorus', 'Ribbon Reverie']) {
      const card = page.locator('.cg-collection-piece').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      await card.scrollIntoViewIfNeeded(); await imagesReady(card.locator('img'));
      await shot(page, info, `riverside-${prefix}-collection-${title.toLowerCase().replaceAll(' ', '-')}`);
    }
    await closeDialog(page, info); await page.reload();
    await expect(pieces(page, 'r5')).toHaveCount(1); await expect(pieces(page, 't5')).toHaveCount(1);
    expect(await boardIds(page)).toEqual(board);
    await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
    expect(JSON.parse(await rawSave(page, RIVER_KEY)).round.merges).toBe(29);
    expect(JSON.parse(await rawSave(page, RIVER_KEY)).discoveries).toHaveLength(10);
  });
}

test('three partial boards retain independent Undo and URL history in both directions', async ({ page }, info) => {
  const boards = [], saves = [];
  for (const [index, envelope] of ENVELOPES.entries()) {
    if (index) await choose(page, info, envelope.title);
    await activate(supply(page, envelope.family), info);
    boards.push(await boardIds(page)); saves.push(await rawSave(page, envelope.key));
  }
  for (const index of [1, 0]) { await page.goBack(); await expect(pieces(page, ENVELOPES[index].starter)).toHaveCount(6); expect(await boardIds(page)).toEqual(boards[index]); }
  for (const index of [1, 2]) { await page.goForward(); await expect(pieces(page, ENVELOPES[index].starter)).toHaveCount(6); expect(await boardIds(page)).toEqual(boards[index]); }
  for (const [index, envelope] of ENVELOPES.entries()) expect(await rawSave(page, envelope.key)).toBe(saves[index]);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  await expect(pieces(page, 'r1')).toHaveCount(4);
  expect(await rawSave(page)).toBe(saves[0]); expect(await rawSave(page, MOON_KEY)).toBe(saves[1]);
  await page.reload(); await expect(pieces(page, 'r1')).toHaveCount(4); await expect(page).toHaveURL(/envelope=riverside-reverie/);
});

test('third collection and its postcard can be browsed without changing the active first board', async ({ page }, info) => {
  await river(page, info); await mergeId(page, 't1', info); await mergeId(page, 't1', info); await mergeId(page, 't2', info);
  const riverSave = await rawSave(page, RIVER_KEY); await choose(page, info, 'Garden Correspondence');
  await activate(supply(page, 'bird'), info); const board = await boardIds(page), gardenSave = await rawSave(page);
  await collection(page, info, 'Riverside Reverie');
  const card = page.locator('.cg-collection-piece').filter({ has: page.getByRole('heading', { name: 'Tea Chorus', exact: true }) });
  await activate(card.getByRole('button', { name: 'Open postcard', exact: true }), info);
  await expect(page.locator('.cg-postcard figcaption')).toContainText('Tea Chorus');
  await expect(page.getByRole('button', { name: 'Download postcard', exact: true })).toBeEnabled();
  await closeDialog(page, info); expect(await boardIds(page)).toEqual(board);
  expect(await rawSave(page)).toBe(gardenSave); expect(await rawSave(page, RIVER_KEY)).toBe(riverSave);
  await expect(page).not.toHaveURL(/envelope=/);
});

test('fresh Riverside resets only its board and retains discovered art', async ({ page }, info) => {
  await activate(supply(page, 'bird'), info); const first = await rawSave(page);
  await choose(page, info, 'Moonlit Passage'); await activate(supply(page, 'moon'), info); const second = await rawSave(page, MOON_KEY);
  await river(page, info); await mergeAt(page, 6, 7, info);
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
  await expect(page.getByRole('dialog')).toContainText('Riverside Reverie'); await closeDialog(page, info); await expect(pieces(page, 'r2')).toHaveCount(1);
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info); await activate(page.getByRole('button', { name: 'Start fresh', exact: true }), info);
  await expect(pieces(page, 'r1')).toHaveCount(4);
  const saved = JSON.parse(await rawSave(page, RIVER_KEY)); expect(saved.history).toEqual([]); expect(saved.discoveries).toContain('r2');
  expect(await rawSave(page)).toBe(first); expect(await rawSave(page, MOON_KEY)).toBe(second);
});

test('unread third save retains exact bytes through temporary play, all envelopes and original export', async ({ page }, info) => {
  const raw = ' {"version":99,"untouched":"Riverside original"}\n';
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: RIVER_KEY, raw }); await river(page, info);
  await activate(supply(page, 'map'), info); const board = await boardIds(page);
  await choose(page, info, 'Garden Correspondence'); await choose(page, info, 'Moonlit Passage'); await river(page, info);
  expect(await boardIds(page)).toEqual(board); expect(await rawSave(page, RIVER_KEY)).toBe(raw);
  const pending = page.waitForEvent('download'); await activate(page.getByRole('button', { name: 'Download original save', exact: true }), info);
  const download = await pending; expect(download.suggestedFilename()).toBe('moticos-riverside-reverie-original-save.json');
  const stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toBe(raw);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info); await expect(occupied(page)).toHaveCount(8); expect(await rawSave(page, RIVER_KEY)).toBe(raw);
});

test('third quota failure preserves temporary play without affecting the other two saves', async ({ page }, info) => {
  await river(page, info);
  await page.evaluate(key => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(k, value) { if (k === key) throw new DOMException('quota', 'QuotaExceededError'); return set.call(this, k, value); }; }, RIVER_KEY);
  await activate(supply(page, 'teacup'), info); const board = await boardIds(page);
  await expect(page.locator('.cg-save-warning')).toContainText('cannot safely save');
  await choose(page, info, 'Garden Correspondence'); await activate(supply(page, 'bird'), info); const first = await rawSave(page);
  await choose(page, info, 'Moonlit Passage'); await activate(supply(page, 'moon'), info); const second = await rawSave(page, MOON_KEY);
  await river(page, info); expect(await boardIds(page)).toEqual(board); expect(await rawSave(page, RIVER_KEY)).toBeNull();
  expect(await rawSave(page)).toBe(first); expect(await rawSave(page, MOON_KEY)).toBe(second);
});

test('inactive third-envelope external edit cannot be overwritten on resuming or playing', async ({ page, context }, info) => {
  await river(page, info); await activate(supply(page, 'map'), info); const local = await boardIds(page);
  await choose(page, info, 'Moonlit Passage');
  const other = await context.newPage(); await other.goto('/?envelope=riverside-reverie');
  await activate(supply(other, 'teacup'), info); const external = await rawSave(other, RIVER_KEY); await other.close();
  await river(page, info); await expect(page.locator('.cg-save-warning')).toContainText('Another tab changed this envelope');
  expect(await boardIds(page)).toEqual(local); await activate(supply(page, 'map'), info); expect(await rawSave(page, RIVER_KEY)).toBe(external);
});

test('mute and denied storage survive all three envelope switches', async ({ page }, info) => {
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
  await choose(page, info, 'Moonlit Passage'); await river(page, info); await page.reload();
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } }));
  await page.reload(); await activate(supply(page, 'map'), info); const board = await boardIds(page);
  await choose(page, info, 'Garden Correspondence'); await choose(page, info, 'Moonlit Passage'); await river(page, info);
  expect(await boardIds(page)).toEqual(board); await expect(page.locator('.cg-save-warning')).toBeVisible();
});

test('all three chooser cards and tabs fit at 320px and scrolled header covers its top edge', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
  await expect(page.locator('.mg-envelope-card')).toHaveCount(3);
  await expect(page.locator('.mg-envelope-list')).toContainText('30 distinct artworks across 3 envelopes');
  const boxes = await page.locator('.mg-envelope-card h3').evaluateAll(nodes => nodes.map(node => ({ scroll: node.scrollWidth, width: node.clientWidth })));
  for (const box of boxes) expect(box.scroll).toBeLessThanOrEqual(box.width + 1);
  await page.getByRole('button', { name: 'Open Riverside Reverie', exact: true }).scrollIntoViewIfNeeded();
  await imagesReady(page.locator('.mg-envelope-card').last().locator('img')); await assertNoOverflow(page);
  await assertControls(page, '.mg-envelope-card button, .cg-dialog-header button'); await shot(page, info, 'riverside-compact-chooser-bottom');
  const geometry = await page.locator('.mg-dialog').evaluate(dialog => {
    const rect = dialog.getBoundingClientRect(), header = dialog.querySelector('.cg-dialog-header'), head = header.getBoundingClientRect();
    const backing = getComputedStyle(header, '::before');
    return { top: rect.top, right: rect.right, bottom: rect.bottom, paintedTop: head.top + parseFloat(backing.top), headingTop: header.querySelector('h2').getBoundingClientRect().top, headingBottom: header.querySelector('h2').getBoundingClientRect().bottom, button: { top: header.querySelector('button').getBoundingClientRect().top, right: header.querySelector('button').getBoundingClientRect().right, bottom: header.querySelector('button').getBoundingClientRect().bottom }, scroll: dialog.scrollTop, width: dialog.clientWidth, scrollWidth: dialog.scrollWidth, backingColor: backing.backgroundColor, backingPointer: backing.pointerEvents };
  });
  expect(geometry.scroll).toBeGreaterThan(0); expect(geometry.paintedTop).toBeLessThanOrEqual(geometry.top + 2);
  expect(geometry.headingTop).toBeGreaterThanOrEqual(geometry.top); expect(geometry.headingBottom).toBeLessThanOrEqual(geometry.bottom); expect(geometry.button.bottom).toBeLessThanOrEqual(geometry.bottom); expect(geometry.button.top).toBeGreaterThanOrEqual(geometry.top); expect(geometry.button.right).toBeLessThanOrEqual(geometry.right);
  expect(geometry.backingColor).toBe('rgb(249, 246, 236)'); expect(geometry.backingPointer).toBe('none');
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  await activate(page.getByRole('button', { name: 'Open Riverside Reverie', exact: true }), info);
  await assertLiveArtAtPhoneWidths(page); await shot(page, info, 'riverside-compact-board');
  await collection(page, info, 'Riverside Reverie'); await assertControls(page, '.mg-collection-tabs button'); await assertNoOverflow(page); await shot(page, info, 'riverside-compact-collection');
  await closeDialog(page, info); await activate(page.getByRole('button', { name: 'How to play', exact: true }), info);
  await expect(page.getByRole('dialog')).toContainText('teacup'); await shot(page, info, 'riverside-compact-help'); await closeDialog(page, info);
});
