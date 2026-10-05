import { test, expect } from '@playwright/test';
import {
  selectCollectionEnvelope, selectEnvelopeFilter, MATCHING_KEY, PHONE_VIEWPORTS, pieces, occupied, supply, activate, boardIds, rawSave,
  idle, mergeId, finishFamily, closeDialog, imagesReady, shot, downloadPNG,
  openCollectedPostcard, assertNoOverflow, assertControls, assertLiveArtAtPhoneWidths,
} from './matching-helpers.js';

const LANTERN_KEY = 'moticos.matching.lantern-studio.v1';
const envelopes = [
  ['Garden Correspondence', MATCHING_KEY, 'bird', 'b1'],
  ['Moonlit Passage', 'moticos.matching.moonlit-passage.v1', 'key', 'k1'],
  ['Riverside Reverie', 'moticos.matching.riverside-reverie.v1', 'map', 'r1'],
  ['Lantern Studio', LANTERN_KEY, 'lantern', 'l1'],
];
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  errors.set(page, []); page.on('pageerror', error => errors.get(page).push(error.message));
  await page.goto('/'); await expect(page.locator('.mg-page .cg-board')).toBeVisible();
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
async function choose(page, info, title) {
  await idle(page); await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
  await activate(page.getByRole('button', { name: `Open ${title}`, exact: true }), info);
  await expect(page.getByRole('dialog')).toHaveCount(0); await idle(page);
}
async function collection(page, info, title = 'Lantern Studio') {
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  await selectCollectionEnvelope(page, title);
}
function total(page, name) {
  return page.getByRole('region', { name: 'Whole collection progress' }).locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`) }) }).locator('dd');
}
async function assertAlbumReadable(page) {
  const boxes = await page.locator('.mg-dialog, .mg-album-summary, .mg-album-summary dt, .mg-album-summary dd, .mg-envelope-card, .mg-envelope-card h3, .mg-path-dots, .mg-next-discovery').evaluateAll(nodes => nodes.map(node => ({
    text: node.textContent.trim().slice(0, 70), width: node.clientWidth, scroll: node.scrollWidth,
  })));
  for (const box of boxes) expect(box.scroll, `album content wraps without horizontal clipping: ${box.text}`).toBeLessThanOrEqual(box.width + 1);
}

test('album browsing credits only opened envelopes and never writes or changes a board', { tag: '@selector-preflight' }, async ({ page }, info) => {
  test.setTimeout(45_000);
  const board = await boardIds(page);
  await collection(page, info, 'Lantern Studio');
  for (const [title] of envelopes) {
    await selectCollectionEnvelope(page, title);
    await expect(page.getByLabel('Browse envelope', { exact: true })).toHaveValue({ 'Garden Correspondence': 'matching-garden', 'Moonlit Passage': 'moonlit-passage', 'Riverside Reverie': 'riverside-reverie', 'Lantern Studio': 'lantern-studio' }[title]);
  }
  await expect(total(page, 'Pieces')).toHaveText('2 / 40');
  await expect(total(page, 'Worlds')).toHaveText('0 / 8');
  await expect(total(page, 'Postcards')).toHaveText('0 / 24');
  await expect(page.locator('.cg-collection-intro')).toContainText('0 of 10 discovered in Lantern Studio');
  await expect(page.locator('.cg-mystery')).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(0);
  await closeDialog(page, info);
  await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
  for (const filter of ['progress', 'complete', 'unopened', 'all']) {
    await selectEnvelopeFilter(page, filter);
    await expect(page.getByLabel('Show envelopes', { exact: true })).toHaveValue(filter);
  }
  await closeDialog(page, info);
  for (const [, key] of envelopes) expect(await rawSave(page, key)).toBeNull();
  expect(await boardIds(page)).toEqual(board); await expect(page).not.toHaveURL(/envelope=/);
});

test('fourth envelope has distinct starters, finite pair supply and a third-merge postcard', async ({ page }, info) => {
  await choose(page, info, 'Lantern Studio');
  await expect(pieces(page, 'l1')).toHaveCount(4); await expect(pieces(page, 's1')).toHaveCount(4);
  await expect(supply(page, 'lantern')).toHaveAccessibleName('Add lantern pair, 6 pairs left');
  await expect(supply(page, 'spool')).toHaveAccessibleName('Add spool pair, 6 pairs left');
  await assertLiveArtAtPhoneWidths(page, info, 'lantern-starters');
  for (const id of ['l1', 'l1', 'l2']) await mergeId(page, id, info, 'drag');
  await expect(pieces(page, 'l3')).toHaveCount(1);
  expect(JSON.parse(await rawSave(page, LANTERN_KEY)).round.merges).toBe(3);
  await expect(page.getByRole('button', { name: 'Open your postcard', exact: true })).toBeEnabled();
  for (const [, key] of envelopes.slice(0, 3)) expect(await rawSave(page, key)).toBeNull();
  await collection(page, info);
  await expect(total(page, 'Pieces')).toHaveText('6 / 40'); // Garden starters plus four Lantern Studio discoveries.
  await expect(total(page, 'Postcards')).toHaveText('1 / 24');
  await expect(page.locator('.mg-next-discovery')).toHaveText('Next discovery: Lantern Tower. Match two Lantern House pieces.');
  await shot(page, info, 'lantern-first-discovery-album');
});

for (const order of [['lantern', 'spool'], ['spool', 'lantern']]) {
  test(`Lantern Studio completes ${order.join('-')} with six distinct postcards and retained world credit`, async ({ page }, info) => {
    test.setTimeout(300_000); await choose(page, info, 'Lantern Studio');
    for (const family of order) await finishFamily(page, family, info, order[0] === 'lantern' ? 'drag' : 'tap', async id => {
      await assertLiveArtAtPhoneWidths(page, order[0] === 'lantern' ? info : null, `lantern-round-${id}`);
    });
    const save = JSON.parse(await rawSave(page, LANTERN_KEY));
    expect(save.round).toMatchObject({ moves: 42, merges: 30, supply: { lantern: 0, spool: 0 } });
    expect(save.discoveries).toHaveLength(10); await expect(occupied(page)).toHaveCount(2);
    const board = await boardIds(page), hashes = [];
    for (const id of ['l3', 'l4', 'l5', 's3', 's4', 's5']) {
      await openCollectedPostcard(page, id, info);
      if (order[0] === 'lantern') { hashes.push(await downloadPNG(page, info, id)); await shot(page, info, `lantern-postcard-${id}`); }
      await closeDialog(page, info); expect(await boardIds(page)).toEqual(board);
    }
    if (hashes.length) expect(new Set(hashes).size).toBe(6);
    await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
    expect(JSON.parse(await rawSave(page, LANTERN_KEY)).round.merges).toBe(29);
    await collection(page, info); await expect(total(page, 'Worlds')).toHaveText('2 / 8');
    await expect(page.locator('.mg-collected-label')).toHaveCount(2);
    await closeDialog(page, info);
    await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
    await activate(page.getByRole('button', { name: 'Start fresh', exact: true }), info);
    await expect(occupied(page)).toHaveCount(8);
    await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
    await expect(total(page, 'Worlds')).toHaveText('2 / 8');
    await selectEnvelopeFilter(page, 'complete');
    await expect(page.locator('.mg-envelope-card')).toHaveCount(1);
    await expect(page.locator('.mg-envelope-card')).toHaveAttribute('data-envelope-id', 'lantern-studio');
    await expect(page.locator('.mg-envelope-card small')).toContainText('2 / 2 worlds collected');
    await shot(page, info, `lantern-collected-after-reset-${order[0]}`);
    await closeDialog(page, info); await page.reload(); await collection(page, info);
    await expect(total(page, 'Worlds')).toHaveText('2 / 8');
    await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(6);
  });
}

test('four boards and independent Undo survive navigation and both history directions', async ({ page }, info) => {
  const saves = [], boards = [];
  for (const [index, [title, key, family]] of envelopes.entries()) {
    if (index) await choose(page, info, title);
    await activate(supply(page, family), info); saves.push(await rawSave(page, key)); boards.push(await boardIds(page));
  }
  for (const index of [2, 1, 0]) { await page.goBack(); await expect(pieces(page, envelopes[index][3])).toHaveCount(6); expect(await boardIds(page)).toEqual(boards[index]); }
  for (const index of [1, 2, 3]) { await page.goForward(); await expect(pieces(page, envelopes[index][3])).toHaveCount(6); expect(await boardIds(page)).toEqual(boards[index]); }
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info); await expect(pieces(page, 'l1')).toHaveCount(4);
  for (const [index, [, key]] of envelopes.slice(0, 3).entries()) expect(await rawSave(page, key)).toBe(saves[index]);
});

test('envelope filters and collection selector remain usable at compact widths and enlarged text', async ({ page }, info) => {
  const board = await boardIds(page);
  for (const viewport of PHONE_VIEWPORTS.slice(0, 3)) {
    await page.setViewportSize(viewport);
    await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
    await selectEnvelopeFilter(page, 'unopened');
    await expect(page.locator('.mg-envelope-card')).toHaveCount(3);
    const lantern = page.locator('[data-envelope-id="lantern-studio"]');
    await lantern.scrollIntoViewIfNeeded(); await imagesReady(lantern.locator('img'));
    await assertNoOverflow(page); await assertAlbumReadable(page); await assertControls(page, '.mg-album-picker select, .mg-envelope-card button, .cg-dialog-header button');
    await shot(page, info, `album-unopened-${viewport.width}`);
    await selectEnvelopeFilter(page, 'complete');
    await expect(page.locator('.mg-envelope-card')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toContainText('No envelopes in this view yet');
    await closeDialog(page, info);
  }
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await collection(page, info); await assertNoOverflow(page); await assertAlbumReadable(page);
  await page.getByLabel('Browse envelope', { exact: true }).scrollIntoViewIfNeeded();
  await assertControls(page, '.mg-album-picker select, .cg-dialog-header button');
  await shot(page, info, 'album-enlarged-text'); await closeDialog(page, info);
  await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
  await page.locator('[data-envelope-id="lantern-studio"]').scrollIntoViewIfNeeded();
  await assertAlbumReadable(page); await assertNoOverflow(page);
  await shot(page, info, 'album-enlarged-chooser'); await closeDialog(page, info);
  expect(await boardIds(page)).toEqual(board);
});

test('corrupt and future fourth-envelope saves are never credited as new discoveries or overwritten', async ({ page }, info) => {
  for (const original of ['{not json', '{"version":88,"original":"preserve me"}']) {
    await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key: LANTERN_KEY, original });
    await collection(page, info);
    await expect(total(page, 'Pieces')).toHaveText('2 / 40');
    await expect(page.locator('.mg-album-caution')).toBeVisible();
    await expect(page.locator('.cg-collection-piece.is-undiscovered')).toHaveCount(10);
    await closeDialog(page, info); expect(await rawSave(page, LANTERN_KEY)).toBe(original);
  }
  await choose(page, info, 'Lantern Studio'); await activate(supply(page, 'lantern'), info);
  const board = await boardIds(page), original = await rawSave(page, LANTERN_KEY);
  await choose(page, info, 'Garden Correspondence'); await collection(page, info);
  await expect(total(page, 'Pieces')).toHaveText('4 / 40'); await expect(page.locator('.mg-album-caution')).toBeVisible();
  await closeDialog(page, info); await choose(page, info, 'Lantern Studio');
  expect(await boardIds(page)).toEqual(board); expect(await rawSave(page, LANTERN_KEY)).toBe(original);
});

test('album refreshes an inactive external save without overwriting either branch', async ({ page, context }, info) => {
  await choose(page, info, 'Lantern Studio'); await activate(supply(page, 'lantern'), info);
  const board = await boardIds(page); await choose(page, info, 'Garden Correspondence');
  await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
  const other = await context.newPage(); await other.goto('/?envelope=lantern-studio');
  await mergeId(other, 'l1', info); const newer = await rawSave(other, LANTERN_KEY);
  await expect(page.locator('.mg-album-caution')).toBeVisible();
  await expect(page.locator('[data-envelope-id="lantern-studio"] small')).toContainText('temporary play');
  await other.close(); await activate(page.getByRole('button', { name: 'Open Lantern Studio', exact: true }), info);
  expect(await boardIds(page)).toEqual(board); expect(await rawSave(page, LANTERN_KEY)).toBe(newer);
});
