import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect } from '@playwright/test';

export const MATCHING_KEY = 'moticos.matching.garden.v1';
export const RECIPE_KEY = 'moticos.collection.garden.v1';
export const NAMES = {
  b1: 'Coral Bird', b2: 'Riverwing', b3: 'Wayfinder', b4: 'Aviary Gate', b5: 'Wandering Aviary',
  f1: 'Teal Fern', f2: 'Fern Cup', f3: 'Nightgarden', f4: 'Moonlit Arbor', f5: 'Lunar Conservatory',
  k1: 'Round Key', k2: 'Frond Key', k3: 'Drawbridge Key', k4: 'Stairway Key', k5: 'Elsewhere Key',
  m1: 'Cobalt Moon', m2: 'Crescent Courier', m3: 'Lunar Skiff', m4: 'Crescent Balloon', m5: 'Orbit Voyager',
};
export const cell = (page, index) => page.locator(`[data-matching-cell="${index}"]`);
export const pieces = (page, id) => page.locator(`[data-matching-cell][data-piece-id="${id}"]`);
export const occupied = page => page.locator('[data-matching-cell]:not([data-piece-id="empty"])');
export const supply = (page, family) => page.getByRole('button', { name: new RegExp(`^Add ${family} pair,`) });
export const isPhone = info => info.project.name.startsWith('webkit-iphone');

export async function activate(locator, info) {
  if (isPhone(info)) await locator.tap();
  else await locator.click();
}
export async function boardIds(page) {
  return page.locator('[data-matching-cell]').evaluateAll(nodes => nodes.map(node => node.dataset.pieceId));
}
export async function rawSave(page, key = MATCHING_KEY) {
  return page.evaluate(key => localStorage.getItem(key), key);
}
export async function saved(page) {
  return JSON.parse(await rawSave(page));
}
export async function idle(page) {
  await expect(page.locator('.cg-floating')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeEnabled();
}
export async function clearSelection(page) {
  const selected = page.locator('[data-matching-cell][aria-pressed="true"]');
  if (await selected.count()) await selected.press('Escape');
}
export async function imagesReady(locator) {
  await expect.poll(() => locator.evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
}
export async function shot(page, info, name) {
  await mkdir('test-results/screenshots', { recursive: true });
  const path = `test-results/screenshots/${info.project.name}-matching-${name}.png`;
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await info.attach(`matching-${name}`, { path, contentType: 'image/png' });
}
export async function beginDrag(page, from, point) {
  await idle(page);
  await page.locator('.cg-board').scrollIntoViewIfNeeded();
  const box = await from.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 8 });
  await expect(page.locator('.cg-floating')).toBeVisible();
}
export async function dragTo(page, from, to, { offsetX = 0, offsetY = 0 } = {}) {
  await idle(page);
  await page.locator('.cg-board').scrollIntoViewIfNeeded();
  const target = await to.boundingBox();
  expect(target).not.toBeNull();
  await beginDrag(page, from, {
    x: target.x + target.width / 2 + target.width * offsetX,
    y: target.y + target.height / 2 + target.height * offsetY,
  });
  await page.mouse.up();
  await idle(page);
}
export async function mergeAt(page, from, to, info, method = 'tap') {
  await idle(page);
  const id = await cell(page, from).getAttribute('data-piece-id');
  expect(await cell(page, to).getAttribute('data-piece-id')).toBe(id);
  expect(Number(id[1])).toBeLessThan(5);
  const result = `${id[0]}${Number(id[1]) + 1}`;
  await clearSelection(page);
  if (method === 'drag') await dragTo(page, cell(page, from), cell(page, to));
  else {
    await activate(cell(page, from), info);
    await expect(cell(page, from)).toHaveAttribute('aria-pressed', 'true');
    await activate(cell(page, to), info);
    await idle(page);
  }
  await expect(cell(page, from)).toHaveAttribute('data-piece-id', 'empty');
  await expect(cell(page, to)).toHaveAttribute('data-piece-id', result);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  return result;
}
export async function mergeId(page, id, info, method = 'tap') {
  const indices = await pieces(page, id).evaluateAll(nodes => nodes.map(node => Number(node.dataset.matchingCell)));
  expect(indices.length, `two rendered ${id} pieces are needed`).toBeGreaterThanOrEqual(2);
  return mergeAt(page, indices[0], indices[1], info, method);
}
export async function makeLevelThree(page, family, info, method = 'tap') {
  const prefix = { bird: 'b', fern: 'f', key: 'k', moon: 'm' }[family];
  await mergeId(page, `${prefix}1`, info, method);
  await mergeId(page, `${prefix}1`, info, method);
  await mergeId(page, `${prefix}2`, info, method);
  await expect(pieces(page, `${prefix}3`)).toHaveCount(1);
}

// Read the real rendered board, then make every move through the real UI.
// Do not seed a finale, import the reducer, or invoke application internals.
export async function finishFamily(page, family, info, method = 'tap', onDiscovery = null) {
  const prefix = { bird: 'b', fern: 'f', key: 'k', moon: 'm' }[family];
  const seen = new Set();
  const counts = { merges: 0, draws: 0, actions: 0 };
  while (!(await pieces(page, `${prefix}5`).count())) {
    expect(counts.actions, 'a family finishes within its 21 straightforward board actions').toBeLessThan(21);
    const ids = await boardIds(page);
    const id = [4, 3, 2, 1].map(tier => `${prefix}${tier}`).find(id => ids.filter(value => value === id).length >= 2);
    if (id) {
      const result = await mergeId(page, id, info, method);
      counts.merges++;
      if (!seen.has(result)) {
        seen.add(result);
        if (Number(result[1]) >= 3) await expect(page.getByRole('button', { name: 'Open your postcard', exact: true })).toBeEnabled();
        if (onDiscovery) await onDiscovery(result);
      }
    } else {
      await expect(supply(page, family)).toBeEnabled();
      const before = await occupied(page).count();
      await activate(supply(page, family), info);
      await expect(occupied(page)).toHaveCount(before + 2);
      counts.draws++;
    }
    counts.actions++;
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(counts).toEqual({ merges: 15, draws: 6, actions: 21 });
  return counts;
}
export async function closeDialog(page, info) {
  await activate(page.getByRole('button', { name: 'Back to board', exact: true }), info);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
}
export async function openCollectedPostcard(page, id, info) {
  await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
  const article = page.locator('.cg-collection-piece').filter({ has: page.getByRole('heading', { name: NAMES[id], exact: true }) });
  await expect(article).toHaveCount(1);
  await activate(article.getByRole('button', { name: 'Open postcard', exact: true }), info);
  await expect(page.locator('.cg-postcard figcaption')).toContainText(NAMES[id]);
  await imagesReady(page.locator('.cg-postcard img'));
  await expect(page.getByRole('button', { name: 'Download postcard', exact: true })).toBeEnabled();
}
export async function downloadPNG(page, info, id) {
  const pending = page.waitForEvent('download');
  await activate(page.getByRole('button', { name: 'Download postcard', exact: true }), info);
  const download = await pending;
  expect(download.suggestedFilename()).toBe(`moticos-${NAMES[id].toLowerCase().replaceAll(' ', '-')}.png`);
  await mkdir('test-results/postcards', { recursive: true });
  const path = `test-results/postcards/${info.project.name}-matching-${id}.png`;
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.toString('ascii', 12, 16)).toBe('IHDR');
  expect(bytes.readUInt32BE(16)).toBe(1536);
  expect(bytes.readUInt32BE(20)).toBe(1120);
  expect(bytes.length).toBeGreaterThan(10_000);
  await expect(page.locator('.cg-export-status')).toContainText('Safari Downloads in the Files app');
  await info.attach(`postcard-${id}`, { path, contentType: 'image/png' });
  return createHash('sha256').update(bytes).digest('hex');
}
export async function assertNoOverflow(page) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
}
export async function assertControls(page, selector) {
  const sizes = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { name: node.getAttribute('aria-label') || node.textContent.trim(), width: box.width, height: box.height };
  }));
  expect(sizes.length).toBeGreaterThan(0);
  for (const control of sizes) {
    expect(control.height, `${control.name} has a 44px target height`).toBeGreaterThanOrEqual(44);
    expect(control.width, `${control.name} has a 44px target width`).toBeGreaterThanOrEqual(44);
  }
}

// Inspect every real, currently live tier at compact and standard phone widths.
// The round itself still plays at the project's original viewport and engine.
export async function assertLiveArtAtPhoneWidths(page) {
  await expect(page.locator('.cg-cell.is-pasted')).toHaveCount(0);
  const original = page.viewportSize();
  try {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: Math.max(780, original.height) });
      await imagesReady(page.locator('.cg-board img'));
      await assertNoOverflow(page);
      await assertControls(page, '.cg-header button, .cg-tools button, .mg-supply button, .cg-postcard-button, .cg-footer button');
      const tiles = await occupied(page).evaluateAll(nodes => nodes.map(node => {
        const label = node.querySelector('.cg-cell-name');
        const image = node.querySelector('img');
        const box = node.getBoundingClientRect();
        const art = image.getBoundingClientRect();
        return {
          id: node.dataset.pieceId, name: label.textContent,
          accessibleName: node.getAttribute('aria-label'),
          clipped: label.scrollWidth > label.clientWidth + 1,
          font: parseFloat(getComputedStyle(label).fontSize),
          width: box.width, height: box.height,
          artWidth: art.width, artHeight: art.height,
        };
      }));
      for (const tile of tiles) {
        expect(tile.name, `${tile.id} has a visible short label at ${width}px`).toBeTruthy();
        expect(tile.clipped, `${tile.id} label must not be truncated at ${width}px`).toBe(false);
        expect(tile.font).toBeGreaterThanOrEqual(8);
        expect(tile.accessibleName).toContain(NAMES[tile.id]);
        expect(tile.width).toBeGreaterThanOrEqual(44);
        expect(tile.height).toBeGreaterThanOrEqual(44);
        expect(tile.artWidth).toBeGreaterThan(30);
        expect(tile.artHeight).toBeGreaterThan(25);
      }
    }
  } finally {
    await page.setViewportSize(original);
  }
}
