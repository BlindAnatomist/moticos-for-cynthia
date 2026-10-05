import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { activate, boardIds, clearSelection, dragTo, idle, imagesReady, pieces, cell, closeDialog, assertMatchingViewportFit, shot } from './shared-helpers.js';
const contract = JSON.parse(readFileSync('tests/verification/collage-live-contract.json', 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const newRoute = '/?envelope=batch-wrong-address';
const newKey = 'moticos.matching.batch-wrong-address.v1';
const oldKey = 'moticos.matching.garden.v1';
const routes = ['batch-wrong-address', 'batch-quiet-company', 'batch-namesakes', 'batch-useful-gaps'];
const raw = (page, key) => page.evaluate(key => localStorage.getItem(key), key);
async function merge(page, info, id, next, method = 'tap') {
  await idle(page); await clearSelection(page);
  const indices = await pieces(page, id).evaluateAll(nodes => nodes.map(node => Number(node.dataset.matchingCell)));
  expect(indices.length).toBeGreaterThanOrEqual(2);
  const [from, to] = indices;
  if (method === 'drag') await dragTo(page, cell(page, from), cell(page, to));
  else { await activate(cell(page, from), info); await activate(cell(page, to), info); await idle(page); }
  await expect(cell(page, from)).toHaveAttribute('data-piece-id', 'empty');
  await expect(cell(page, to)).toHaveAttribute('data-piece-id', next);
}
async function earnPostcard(page, info) {
  await merge(page, info, 'wr1', 'wr2', 'drag');
  await merge(page, info, 'wr1', 'wr2');
  await merge(page, info, 'wr2', 'wr3');
}
const errors = new WeakMap();
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page).push(error.message)); });
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

async function verifyLiveIdentity(page) {
  expect(contract.status).toBe('release-candidate-accepted');
  const response = await page.goto('/'); expect(response.ok()).toBe(true);
  expect(new URL(page.url()).origin).toBe(contract.liveUrl);
  await expect(page.locator('meta[name="moticos-private-collage-source"]')).toHaveAttribute('content', contract.sourceFingerprint);
  const manifestResponse = await page.request.get('/batch-manifest.json', { maxRetries: 0 });
  expect(manifestResponse.ok()).toBe(true);
  expect(sha(await manifestResponse.body())).toBe(contract.manifestSha256);
  expect(await manifestResponse.json()).toEqual(contract.manifest);
  expect(await page.locator('script[type="module"][src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')))).toEqual(contract.manifest.entryScripts);
  // Four concurrent read-only requests bound network time without adding test workers.
  for (let index = 0; index < contract.files.length; index += 4) {
    await Promise.all(contract.files.slice(index, index + 4).map(async file => {
      const url = new URL(file.file === 'dist-batch/index.html' ? '/' : file.file.slice('dist-batch/'.length), `${contract.liveUrl}/`);
      expect(url.origin).toBe(contract.liveUrl);
      const asset = await page.request.get(url.href, { maxRetries: 0, timeout: 15000 });
      expect(asset.ok(), file.file).toBe(true); expect(asset.url()).toBe(url.href);
      expect(sha(await asset.body()), file.file).toBe(file.sha256);
    }));
  }
}

async function verifyCompactLayout(page, info) {
  const original = page.viewportSize();
  await page.goto(newRoute); await imagesReady(page.locator('.cg-board img'));
  await assertMatchingViewportFit(page, info, 'hosted-native');
  await page.setViewportSize({ width: 320, height: 568 });
  await assertMatchingViewportFit(page, info, 'hosted-320x568');
  await page.setViewportSize(original);
}

async function verifyRealPlayAndReload(page, info) {
  await page.goto(newRoute); await earnPostcard(page, info);
  const before = await raw(page, newKey), saved = JSON.parse(before), board = await boardIds(page);
  expect(saved.round.merges).toBe(3);
  await activate(page.getByRole('button', { name: 'Cut', exact: true }), info);
  await expect(pieces(page, 'wr2')).toHaveCount(2);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect(JSON.parse(await raw(page, newKey)).round).toEqual(saved.round);
  await page.reload(); expect(await raw(page, newKey)).toBe(before); expect(await boardIds(page)).toEqual(board);
  await shot(page, info, 'hosted-real-play', { fullPage: false });
}

async function verifyOldSaveAndNavigation(page, info) {
  await page.goto('/'); await merge(page, info, 'b1', 'b2', 'drag');
  const before = await raw(page, oldKey), board = await boardIds(page);
  for (const envelope of routes) {
    await page.goto(`/?envelope=${envelope}`); await expect(page.locator('[data-matching-cell]')).toHaveCount(25);
    expect(await raw(page, oldKey)).toBe(before);
  }
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  await expect(page.getByLabel('Browse envelope', { exact: true }).locator('option')).toHaveCount(8);
  await expect(page.locator('.mg-album-summary')).toContainText('/ 80');
  await shot(page, info, 'hosted-eight-envelope-album', { fullPage: false });
  await closeDialog(page, info); await page.goto('/');
  expect(await raw(page, oldKey)).toBe(before); expect(await boardIds(page)).toEqual(board);
}

async function verifyActualPostcard(page, info) {
  // The preceding real-play step earned wr3 in this same clean context.
  await expect(pieces(page, 'wr3')).toHaveCount(1);
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  const article = page.locator('.cg-collection-piece').filter({ has: page.getByRole('heading', { name: 'Address Window', exact: true }) });
  await activate(article.getByRole('button', { name: 'Open postcard', exact: true }), info);
  await imagesReady(page.locator('.cg-postcard img'));
  const pending = page.waitForEvent('download');
  await activate(page.getByRole('button', { name: 'Download postcard', exact: true }), info);
  const download = await pending; expect(download.suggestedFilename()).toBe('moticos-address-window.png');
  await mkdir('batch-test-results/review', { recursive: true });
  const path = `batch-test-results/review/${info.project.name}-live-wr3-export.png`;
  await download.saveAs(path); expect(await download.failure()).toBeNull();
  const bytes = await readFile(path); expect(bytes.length).toBeGreaterThan(10000);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(1536); expect(bytes.readUInt32BE(20)).toBe(1120);
  await info.attach('live-actual-postcard-export', { path, contentType: 'image/png' });
  await shot(page, info, 'hosted-real-postcard', { fullPage: false });
}

// Exactly one bounded end-to-end smoke per profile. No progress injection.
test('hosted exact build, compact fit, preserved saves, real matching and actual postcard', async ({ page }, info) => {
  await verifyLiveIdentity(page);
  await verifyCompactLayout(page, info);
  await verifyOldSaveAndNavigation(page, info);
  const oldSave = await raw(page, oldKey);
  await verifyRealPlayAndReload(page, info);
  await verifyActualPostcard(page, info);
  expect(await raw(page, oldKey)).toBe(oldSave);
});
