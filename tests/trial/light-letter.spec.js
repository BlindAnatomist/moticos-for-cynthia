import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { activate, boardIds, clearSelection, dragTo, idle, imagesReady, pieces, cell, closeDialog, assertLiveArtAtPhoneWidths, assertNoOverflow, assertControls, assertMatchingViewportFit, assertMatchingScrollableFallback } from '../e2e/matching-helpers.js';

const route = '/?pilot=light-letter', key = 'moticos.matching.trial-light-letter.v1';
const publicKeys = ['moticos.matching.garden.v1', 'moticos.matching.moonlit-passage.v1', 'moticos.matching.riverside-reverie.v1', 'moticos.matching.lantern-studio.v1'];
const names = { ll1: 'Light', ll2: 'See Light', ll3: 'Letter Window', ll4: 'Reply', ll5: 'Light Letter' };
const geometryOptions = { names, minControls: 34, supplyCount: 1, controlNames: ['Undo', 'Cut', 'Hint', 'Collection', 'Fresh envelope', 'How to play'] };
const state = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const raw = page => page.evaluate(key => localStorage.getItem(key), key);
const supply = page => page.getByRole('button', { name: /^Add light-letter pair,/ });
async function shot(page, info, name) {
  await mkdir('trial-test-results/review', { recursive: true });
  const path = `trial-test-results/review/${info.project.name}-${name}.png`;
  await page.screenshot({ path, fullPage: false, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function merge(page, info, id, method = 'tap') {
  await idle(page); await clearSelection(page);
  const indices = await pieces(page, id).evaluateAll(nodes => nodes.map(node => Number(node.dataset.matchingCell)));
  expect(indices.length).toBeGreaterThanOrEqual(2);
  const [from, to] = indices;
  if (method === 'drag') await dragTo(page, cell(page, from), cell(page, to));
  else { await activate(cell(page, from), info); await activate(cell(page, to), info); await idle(page); }
  const next = `ll${Number(id.slice(2)) + 1}`;
  await expect(cell(page, from)).toHaveAttribute('data-piece-id', 'empty');
  await expect(cell(page, to)).toHaveAttribute('data-piece-id', next);
  return next;
}
async function tierThree(page, info) {
  await merge(page, info, 'll1', 'drag'); await merge(page, info, 'll1'); await merge(page, info, 'll2');
}
async function openCard(page, info, id) {
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  await activate(page.locator(`[data-trial-discovery="${id}"]`).getByRole('button', { name: 'Open postcard', exact: true }), info);
  await expect(page.locator('.cg-postcard figcaption')).toContainText(names[id]);
  await expect(page.getByRole('button', { name: 'Download postcard', exact: true })).toBeEnabled();
  await imagesReady(page.locator('.cg-postcard img'));
}
async function exportCard(page, info, id) {
  await openCard(page, info, id);
  const pending = page.waitForEvent('download');
  await activate(page.getByRole('button', { name: 'Download postcard', exact: true }), info);
  const download = await pending;
  expect(download.suggestedFilename()).toBe(`moticos-${names[id].toLowerCase().replaceAll(' ', '-')}.png`);
  const path = `trial-test-results/review/${info.project.name}-${id}-export.png`;
  await mkdir('trial-test-results/review', { recursive: true }); await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.readUInt32BE(16)).toBe(1536); expect(bytes.readUInt32BE(20)).toBe(1120); expect(bytes.length).toBeGreaterThan(10000);
  await expect(page.locator('.cg-export-status')).toContainText('Safari Downloads in the Files app');
  await info.attach(`${id}-actual-export`, { path, contentType: 'image/png' }); await shot(page, info, `${id}-postcard-dialog`);
  await closeDialog(page, info);
  return createHash('sha256').update(bytes).digest('hex');
}
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  errors.set(page, []); page.on('pageerror', error => errors.get(page).push(error.message));
  await page.goto(route); await expect(page.locator('meta[name="moticos-private-trial-source"]')).toHaveCount(1); await expect(page.locator('[data-private-trial="light-letter"]')).toBeVisible();
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('private entry has one family, four clippings, 44px controls and no unearned postcard', async ({ page }, info) => {
  await expect(page.locator('[data-matching-cell]')).toHaveCount(25);
  await expect(pieces(page, 'll1')).toHaveCount(4); await expect(page.locator('.mg-supply-button')).toHaveCount(1);
  await expect(supply(page)).toHaveAccessibleName('Add light-letter pair, 6 pairs left');
  await expect(page.locator('.cg-progress')).toHaveText('1/5');
  await expect(page.getByRole('button', { name: 'Your first postcard arrives at level 3', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Envelopes', exact: true })).toHaveCount(0);
  await imagesReady(page.locator('.cg-board img, .mg-supply img, .mg-inspector img'));
  await assertControls(page, '.cg-header button, .cg-tools button, .mg-supply button, .cg-footer button'); await assertNoOverflow(page);
  await assertLiveArtAtPhoneWidths(page, info, 'll1-live', geometryOptions); await shot(page, info, 'initial');
  expect(await raw(page)).toBeNull();
  const expected = JSON.parse(await readFile('dist-trial/trial-manifest.json', 'utf8'));
  const received = await (await page.request.get('/trial-manifest.json')).json();
  expect(received).toEqual(expected);
  await expect(page.locator('meta[name="moticos-private-trial-source"]')).toHaveAttribute('content', expected.sourceFingerprint);
  expect(await page.locator('script[type="module"][src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')))).toEqual(expected.entryScripts);
  for (const asset of expected.assets) {
    const response = await page.request.get(`/${asset.file}`); expect(response.ok()).toBe(true);
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(asset.sha256);
  }
});

test('all five tiers are earned through fifteen real merges; three actual postcards are distinct', async ({ page }, info) => {
  test.setTimeout(180_000);
  let merges = 0, draws = 0; const seen = new Set(['ll1']), cardHashes = [];
  while (!(await pieces(page, 'll5').count())) {
    expect(merges + draws).toBeLessThan(21);
    const ids = await boardIds(page), id = [4, 3, 2, 1].map(tier => `ll${tier}`).find(id => ids.filter(value => value === id).length >= 2);
    if (id) {
      const next = await merge(page, info, id, merges % 2 ? 'tap' : 'drag'); merges++;
      if (!seen.has(next)) {
        seen.add(next); await assertLiveArtAtPhoneWidths(page, info, `${next}-live`, geometryOptions); await shot(page, info, `${next}-earned`);
        if (Number(next.slice(2)) >= 3) cardHashes.push(await exportCard(page, info, next));
        else await expect(page.getByRole('button', { name: 'Your first postcard arrives at level 3', exact: true })).toBeDisabled();
      }
    } else { await activate(supply(page), info); draws++; }
  }
  expect({ merges, draws }).toEqual({ merges: 15, draws: 6 }); expect(new Set(cardHashes).size).toBe(3);
  expect((await state(page)).round).toMatchObject({ merges: 15, moves: 21, supply: { 'light-letter': 0 } });
  await expect(page.locator('.cg-progress')).toHaveText('5/5');
  await activate(page.getByRole('button', { name: 'Hint', exact: true }), info); await expect(page.locator('.cg-notice')).toContainText('Light Letter is complete');
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  await expect(page.getByRole('dialog')).toContainText('5 of 5 artworks discovered'); await expect(page.getByRole('dialog')).toContainText('3 of 3 postcards earned');
  await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(3);
  await shot(page, info, 'complete-collection'); await closeDialog(page, info);
  const before = await raw(page); await page.reload(); expect(await raw(page)).toBe(before); await expect(pieces(page, 'll5')).toHaveCount(1);
});

test('unequal tiers reject direct drops and taps without losing a piece', async ({ page }, info) => {
  await merge(page, info, 'll1'); const before = await raw(page), ids = await boardIds(page);
  await clearSelection(page); await activate(pieces(page, 'll2'), info); await activate(pieces(page, 'll1').first(), info);
  expect(await raw(page)).toBe(before); expect(await boardIds(page)).toEqual(ids);
  await dragTo(page, pieces(page, 'll2'), pieces(page, 'll1').first()); expect(await raw(page)).toBe(before);
  await expect(page.locator('.cg-notice')).toContainText('Nothing was lost');
});

test('Cut, Undo and fresh envelope preserve earned trial cards and correct material', async ({ page }, info) => {
  await tierThree(page, info); const earned = await state(page);
  await activate(page.getByRole('button', { name: 'Cut', exact: true }), info); await expect(pieces(page, 'll2')).toHaveCount(2);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info); expect((await state(page)).round).toEqual(earned.round);
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
  await activate(page.getByRole('button', { name: 'Start fresh', exact: true }), info);
  await expect(pieces(page, 'll1')).toHaveCount(4); expect((await state(page)).history).toEqual([]); expect((await state(page)).discoveries).toEqual(['ll1', 'll2', 'll3']);
  await openCard(page, info, 'll3'); await closeDialog(page, info);
});

test('trial storage and discoveries never alter the four public saves or album totals', async ({ page }, info) => {
  const sentinels = Object.fromEntries(publicKeys.map((key, index) => [key, `public-save-sentinel-${index}`]));
  await page.evaluate(sentinels => Object.entries(sentinels).forEach(([key, value]) => localStorage.setItem(key, value)), sentinels);
  await tierThree(page, info); const trial = await raw(page);
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), publicKeys)).toEqual(sentinels);
  // The same origin proves that public album enumeration excludes trial credit, even with public saves protected as unreadable.
  const normal = await page.context().newPage(); await normal.goto('/');
  await expect(normal.locator('[data-private-trial]')).toHaveCount(0);
  await normal.getByRole('button', { name: 'Collection', exact: true }).click();
  await expect(normal.getByLabel('Browse envelope', { exact: true }).locator('option')).toHaveCount(4);
  await expect(normal.locator('.mg-album-summary')).toContainText('/ 40'); await expect(normal.locator('.mg-album-summary')).toContainText('/ 24');
  await expect(normal.locator('.mg-album-summary')).not.toContainText('/ 45');
  expect(await raw(page)).toBe(trial); await normal.close();
  await page.goto('/'); await expect(page.locator('[data-private-trial]')).toHaveCount(0);
  await page.goBack(); await expect(page.locator('[data-private-trial]')).toBeVisible(); expect(await raw(page)).toBe(trial);
});

test('unreadable, future, read-denied and quota-blocked trial saves stay untouched', async ({ page }, info) => {
  for (const original of ['bad-json', '{"version":999,"keep":"original"}']) {
    await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key, original }); await page.reload();
    await expect(page.getByRole('button', { name: /^Save warning:/ })).toBeVisible();
    await merge(page, info, 'll1'); await activate(supply(page), info); expect(await raw(page)).toBe(original);
    await activate(page.getByRole('button', { name: /^Save warning:/ }), info); await expect(page.getByRole('dialog')).toContainText('left untouched'); await closeDialog(page, info);
  }
  await page.evaluate(key => localStorage.removeItem(key), key); await page.reload(); await merge(page, info, 'll1');
  const protectedRaw = await raw(page);
  for (const failure of ['read', 'quota']) {
    const blocked = await page.context().newPage();
    await blocked.addInitScript(({ key, failure }) => {
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (name) {
        if (name === key && failure === 'read') throw new DOMException('Read blocked', 'SecurityError');
        return get.call(this, name);
      };
      Storage.prototype.setItem = function (name, value) {
        if (name === key && failure === 'quota') throw new DOMException('Storage full', 'QuotaExceededError');
        return set.call(this, name, value);
      };
    }, { key, failure });
    await blocked.goto(route); await blocked.getByRole('button', { name: /^Add light-letter pair,/ }).click();
    await expect(blocked.getByRole('button', { name: /^Add light-letter pair,/ })).toHaveAccessibleName('Add light-letter pair, 5 pairs left');
    await expect(blocked.getByRole('button', { name: /^Save warning:/ })).toBeVisible();
    expect(await raw(page)).toBe(protectedRaw); await blocked.close();
  }
});

test('stale trial tab cannot overwrite a newer saved board', async ({ page }, info) => {
  const second = await page.context().newPage(); await second.goto(route);
  await merge(page, info, 'll1'); const newer = await raw(page);
  await second.getByRole('button', { name: /^Add light-letter pair,/ }).click();
  expect(await raw(second)).toBe(newer); await expect(second.getByRole('button', { name: /^Save warning:/ })).toBeVisible(); await second.close();
});

test('dialog cancellation and repeated opening return focus and never advance progress', async ({ page }, info) => {
  for (const name of ['How to play', 'Collection', 'Fresh envelope']) {
    const opener = page.getByRole('button', { name, exact: true });
    for (let i = 0; i < 2; i++) {
      await activate(opener, info); await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(opener).toBeFocused();
    }
  }
  expect(await raw(page)).toBeNull();
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toContainText('1 of 5 artworks'); await closeDialog(page, info);
});

test('reduced motion and keyboard matching keep the same earned route', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await cell(page, 6).focus(); await page.keyboard.press('Enter'); await cell(page, 7).focus(); await page.keyboard.press('Enter'); await idle(page);
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'll2'); expect((await state(page)).round.merges).toBe(1);
  await page.keyboard.press('Escape'); await cell(page, 12).focus(); await page.keyboard.press('Space'); await cell(page, 16).focus(); await page.keyboard.press('Space'); await idle(page);
  await merge(page, info, 'll2'); await expect(pieces(page, 'll3')).toHaveCount(1);
  await assertLiveArtAtPhoneWidths(page, info, 'reduced-motion-ll3', geometryOptions);
});

test('sound preference persists in the trial and does not write a public preference', async ({ page }, info) => {
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
  expect((await state(page)).sound).toBe(false); await page.reload();
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), publicKeys)).toEqual([null, null, null, null]);
});

test('share cancellation preserves the postcard and board without contacting a recipient', async ({ page }, info) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Canceled', 'AbortError'); } });
  });
  await tierThree(page, info); const before = await raw(page); await openCard(page, info, 'll3');
  await activate(page.getByRole('button', { name: 'Share postcard', exact: true }), info);
  await expect(page.locator('.cg-export-status')).toContainText('Sharing canceled'); expect(await raw(page)).toBe(before); await closeDialog(page, info);
});

test('compact help and collection remain scrollable with enlarged text and no horizontal clipping', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await assertMatchingViewportFit(page, info, 'trial-320x568', geometryOptions);
  await page.addStyleTag({ content: '.mg-page .cg-instruction { font-size: 16px !important; } .mg-page .cg-cell-name { font-size: 13px !important; }' });
  await expect(page.locator('.mg-large-text')).toBeVisible(); await assertNoOverflow(page);
  await assertMatchingScrollableFallback(page, info, 'trial-large-text-board', geometryOptions);
  await page.addStyleTag({ content: '.mg-dialog p, .mg-dialog li { font-size: 20px !important; line-height: 1.5 !important; }' });
  for (const [name, suffix] of [['How to play', 'help'], ['Collection', 'collection']]) {
    await activate(page.getByRole('button', { name, exact: true }), info); await assertNoOverflow(page);
    const dialog = page.getByRole('dialog');
    const scroll = await dialog.evaluate(node => ({ full: node.scrollHeight, visible: node.clientHeight }));
    expect(scroll.full, 'enlarged content genuinely exercises dialog scrolling').toBeGreaterThan(scroll.visible);
    await shot(page, info, `large-text-${suffix}-top`);
    const last = dialog.locator('p').last(); await last.scrollIntoViewIfNeeded(); await expect(last).toBeInViewport({ ratio: 1 });
    expect(await dialog.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    const back = dialog.getByRole('button', { name: 'Back to board', exact: true });
    await back.scrollIntoViewIfNeeded(); await expect(back).toBeInViewport({ ratio: 1 });
    const box = await back.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    await shot(page, info, `large-text-${suffix}-reachable`); await closeDialog(page, info);
  }
});
