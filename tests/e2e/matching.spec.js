import { readFile, mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  MATCHING_KEY, RECIPE_KEY, NAMES, cell, pieces, occupied, supply, isPhone, activate,
  boardIds, rawSave, saved, idle, clearSelection, imagesReady, shot, beginDrag, dragTo,
  mergeAt, mergeId, makeLevelThree, finishFamily, closeDialog, openCollectedPostcard,
  downloadPNG, assertNoOverflow, assertControls, assertLiveArtAtPhoneWidths,
} from './matching-helpers.js';

const errorsByPage = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.mg-page .cg-board')).toBeVisible();
});
test.afterEach(async ({ page }) => {
  expect(errorsByPage.get(page), 'no uncaught browser errors').toEqual([]);
});

test('default board is matching-first, with eight clippings and two finite envelopes', async ({ page }, info) => {
  await expect(page.getByRole('heading', { name: 'Match a pair. Grow a world.', exact: true })).toBeVisible();
  await expect(page.locator('[data-matching-cell]')).toHaveCount(25);
  await expect(occupied(page)).toHaveCount(8);
  await expect(pieces(page, 'b1')).toHaveCount(4);
  await expect(pieces(page, 'f1')).toHaveCount(4);
  await expect(supply(page, 'bird')).toHaveAccessibleName('Add bird pair, 6 pairs left');
  await expect(supply(page, 'fern')).toHaveAccessibleName('Add fern pair, 6 pairs left');
  await expect(page.locator('.cg-progress')).toHaveText('2/10');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Your first postcard arrives at level 3', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cut', exact: true })).toBeDisabled();
  await imagesReady(page.locator('.cg-board img, .mg-supply img, .mg-inspector img'));
  await assertNoOverflow(page);
  await assertControls(page, '.cg-header button, .cg-tools button, .mg-supply button, .cg-postcard-button, .cg-footer button');
  const geometry = await page.evaluate(() => {
    const rect = document.querySelector('.cg-board').getBoundingClientRect();
    return {
      width: innerWidth, height: innerHeight,
      board: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width },
      tiles: [...document.querySelectorAll('[data-matching-cell]')].map(element => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
      labels: [...document.querySelectorAll('.cg-cell-name')].map(element => ({
        size: parseFloat(getComputedStyle(element).fontSize), text: element.textContent,
        clipped: element.scrollWidth > element.clientWidth + 1,
      })),
    };
  });
  expect(geometry.board.left).toBeGreaterThanOrEqual(0);
  expect(geometry.board.right).toBeLessThanOrEqual(geometry.width);
  for (const tile of geometry.tiles) {
    expect(tile.width).toBeGreaterThanOrEqual(44);
    expect(tile.height).toBeGreaterThanOrEqual(44);
  }
  expect(geometry.labels.every(label => label.size >= 9 && label.text && !label.clipped)).toBe(true);
  if (isPhone(info)) {
    expect(geometry.board.width).toBeGreaterThan(geometry.width * 0.9);
    expect(geometry.board.top).toBeLessThan(230);
    expect(geometry.board.bottom).toBeLessThan(geometry.height);
  }
  await shot(page, info, 'initial');
});

test('bird matches bird and fern matches fern, with higher identical tiers continuing each chain', async ({ page }, info) => {
  await mergeAt(page, 6, 7, info, 'drag');
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'b2');
  await expect(page.getByRole('button', { name: 'Your first postcard arrives at level 3', exact: true })).toBeDisabled();
  await mergeId(page, 'f1', info, 'tap');
  await expect(pieces(page, 'f2')).toHaveCount(1);
  await mergeId(page, 'b1', info, 'tap');
  await mergeId(page, 'b2', info, 'drag');
  await expect(pieces(page, 'b3')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open your postcard', exact: true })).toBeEnabled();
  await expect(page.locator('.cg-notice')).toContainText('Wayfinder discovered');
  await mergeId(page, 'f1', info, 'drag');
  await mergeId(page, 'f2', info, 'tap');
  await expect(pieces(page, 'f3')).toHaveCount(1);
  expect((await saved(page)).round).toMatchObject({ merges: 6, moves: 6, supply: { bird: 12, fern: 12 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shot(page, info, 'first-two-postcards-earned');
});

test('cross-family equal levels and same-family unequal levels are rejected without a cost', async ({ page }, info) => {
  const initial = await boardIds(page);
  await dragTo(page, cell(page, 6), cell(page, 8));
  expect(await boardIds(page)).toEqual(initial);
  expect(await rawSave(page)).toBeNull();
  await expect(page.locator('.cg-notice')).toContainText('Nothing was lost');
  await mergeId(page, 'b1', info);
  const board = await boardIds(page), before = await rawSave(page);
  await clearSelection(page);
  await activate(pieces(page, 'b2').first(), info);
  await activate(pieces(page, 'b1').first(), info);
  await expect(page.locator('.cg-notice')).toContainText('exact same picture and level');
  expect(await boardIds(page)).toEqual(board);
  expect(await rawSave(page)).toBe(before);
  await mergeId(page, 'f1', info);
  const equalLevelBoard = await boardIds(page), equalLevelSave = await rawSave(page);
  await dragTo(page, pieces(page, 'b2').first(), pieces(page, 'f2').first());
  expect(await boardIds(page)).toEqual(equalLevelBoard);
  expect(await rawSave(page)).toBe(equalLevelSave);
});

test('a direct wrong-picture drop is never stolen by a nearby matching magnet', async ({ page }, info) => {
  // Move one fern next to a matching bird, then drop a different bird just
  // inside the fern edge. The nearby bird is within the magnetic radius.
  await activate(cell(page, 8), info);
  await activate(cell(page, 2), info);
  await clearSelection(page);
  const before = await rawSave(page), board = await boardIds(page);
  await page.locator('.cg-board').scrollIntoViewIfNeeded();
  const wrong = await cell(page, 2).boundingBox();
  const nearby = await cell(page, 7).boundingBox();
  const point = { x: wrong.x + wrong.width / 2, y: wrong.y + wrong.height - 1 };
  const distance = Math.hypot(point.x - nearby.x - nearby.width / 2, point.y - nearby.y - nearby.height / 2);
  expect(distance).toBeLessThan(Math.max(44, nearby.width * 0.8));
  const direct = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-matching-cell]')?.dataset.matchingCell, point);
  expect(direct).toBe('2');
  await beginDrag(page, cell(page, 6), point);
  await expect(cell(page, 7)).not.toHaveClass(/is-target/);
  await page.mouse.up();
  await idle(page);
  expect(await boardIds(page)).toEqual(board);
  expect(await rawSave(page)).toBe(before);
  await expect(page.locator('.cg-notice')).toContainText('Nothing was lost');
  await mergeAt(page, 6, 7, info, 'drag');
});

test('an open-space near miss still accepts the matching piece and Undo is exact', async ({ page }, info) => {
  const before = await boardIds(page);
  // The upper edge of bird 7 borders an empty cell, not another occupied tile.
  await dragTo(page, cell(page, 6), cell(page, 7), { offsetY: -0.62 });
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'b2');
  await expect(occupied(page)).toHaveCount(7);
  const after = await saved(page);
  expect(after.round).toMatchObject({ moves: 1, merges: 1, supply: { bird: 12, fern: 12 } });
  await shot(page, info, 'magnetic-near-miss');
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect(await boardIds(page)).toEqual(before);
  expect((await saved(page)).round).toEqual(after.history[0]);
  await expect(page.locator('.cg-progress')).toHaveText('3/10');
});

test('move to empty space, Cut, and multistep Undo preserve pieces and discovery', async ({ page }, info) => {
  const initial = await boardIds(page);
  await mergeAt(page, 6, 7, info);
  const merged = await saved(page);
  // The new Riverwing is selected when its flight finishes.
  await activate(cell(page, 0), info);
  await expect(cell(page, 0)).toHaveAttribute('data-piece-id', 'b2');
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'empty');
  const moved = await saved(page);
  await activate(page.getByRole('button', { name: 'Cut', exact: true }), info);
  await expect(pieces(page, 'b2')).toHaveCount(0);
  await expect(occupied(page)).toHaveCount(8);
  await expect(pieces(page, 'b1')).toHaveCount(4);
  expect((await saved(page)).round).toMatchObject({ moves: 3, merges: 1, supply: { bird: 12, fern: 12 } });
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect((await saved(page)).round).toEqual(moved.round);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect((await saved(page)).round).toEqual(merged.round);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect(await boardIds(page)).toEqual(initial);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await expect(page.locator('.cg-progress')).toHaveText('3/10');
});

test('supply adds exactly one pair, decreases the visible count, and is wholly reversible', async ({ page }, info) => {
  const initial = await boardIds(page);
  await activate(supply(page, 'bird'), info);
  await expect(occupied(page)).toHaveCount(10);
  await expect(pieces(page, 'b1')).toHaveCount(6);
  await expect(supply(page, 'bird')).toHaveAccessibleName('Add bird pair, 5 pairs left');
  await expect(supply(page, 'fern')).toHaveAccessibleName('Add fern pair, 6 pairs left');
  const afterBird = await saved(page);
  expect(afterBird.round).toMatchObject({ moves: 1, merges: 0, supply: { bird: 10, fern: 12 } });
  await activate(supply(page, 'fern'), info);
  await expect(occupied(page)).toHaveCount(12);
  expect((await saved(page)).round).toMatchObject({ moves: 2, merges: 0, supply: { bird: 10, fern: 10 } });
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect((await saved(page)).round).toEqual(afterBird.round);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect(await boardIds(page)).toEqual(initial);
  await expect(supply(page, 'bird')).toHaveAccessibleName('Add bird pair, 6 pairs left');
  await expect(supply(page, 'fern')).toHaveAccessibleName('Add fern pair, 6 pairs left');
});

test('one empty cell refuses supply atomically and a merge makes room again', async ({ page }, info) => {
  for (let draw = 0; draw < 6; draw++) await activate(supply(page, 'bird'), info);
  for (let draw = 0; draw < 2; draw++) await activate(supply(page, 'fern'), info);
  await expect(occupied(page)).toHaveCount(24);
  await expect(supply(page, 'fern')).toBeDisabled();
  await expect(supply(page, 'fern')).toHaveAccessibleName('Add fern pair, 4 pairs left');
  await expect(page.locator('.cg-notice')).toContainText('make room for a fresh pair');
  const before = await rawSave(page), board = await boardIds(page);
  // Native disabled-button activation is a no-op, even when called directly.
  await supply(page, 'fern').evaluate(button => button.click());
  expect(await boardIds(page)).toEqual(board);
  expect(await rawSave(page)).toBe(before);
  await shot(page, info, 'envelope-needs-room');
  await mergeId(page, 'b1', info);
  await expect(occupied(page)).toHaveCount(23);
  await expect(supply(page, 'fern')).toBeEnabled();
  await activate(supply(page, 'fern'), info);
  await expect(occupied(page)).toHaveCount(25);
  await expect(supply(page, 'fern')).toBeDisabled();
  expect((await saved(page)).round.supply).toEqual({ bird: 0, fern: 6 });
});

for (const route of [
  { order: ['bird', 'fern'], method: 'drag' },
  { order: ['fern', 'bird'], method: 'tap' },
]) {
  test(`full real-UI round: ${route.order.join(' then ')}, 30 merges and 12 pair taps (${route.method})`, async ({ page }, info) => {
    test.setTimeout(180_000);
    const inspected = new Set(['b1', 'f1']);
    if (route.order[0] === 'bird') await assertLiveArtAtPhoneWidths(page);
    const inspectDiscovery = async id => {
      inspected.add(id);
      if (route.order[0] === 'bird') await assertLiveArtAtPhoneWidths(page);
      if (Number(id[1]) >= 3) await shot(page, info, `${route.order[0]}-first-${id}`);
    };
    const first = await finishFamily(page, route.order[0], info, route.method, inspectDiscovery);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(occupied(page)).toHaveCount(5);
    const second = await finishFamily(page, route.order[1], info, route.method, inspectDiscovery);
    expect(inspected).toEqual(new Set(Object.keys(NAMES)));
    expect(first.merges + second.merges).toBe(30);
    expect(first.draws + second.draws).toBe(12);
    expect(first.actions + second.actions).toBe(42);
    await expect(occupied(page)).toHaveCount(2);
    await expect(pieces(page, 'b5')).toHaveCount(1);
    await expect(pieces(page, 'f5')).toHaveCount(1);
    await expect(page.locator('.cg-progress')).toHaveText('10/10');
    await expect(page.getByRole('heading', { name: 'Two worlds, made by you.', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(supply(page, 'bird')).toBeDisabled();
    await expect(supply(page, 'fern')).toBeDisabled();
    const complete = await saved(page);
    expect(complete.round).toMatchObject({ moves: 42, merges: 30, supply: { bird: 0, fern: 0 } });
    expect(complete.history).toHaveLength(42);
    expect(new Set(complete.discoveries)).toEqual(new Set(Object.keys(NAMES)));
    await assertNoOverflow(page);
    await shot(page, info, `${route.order[0]}-first-both-worlds`);
    if (route.order[0] === 'bird') {
      const viewport = page.viewportSize();
      await page.setViewportSize({ width: 320, height: 780 });
      await shot(page, info, 'compact-320-both-worlds');
      await page.setViewportSize(viewport);
    }

    await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
    await expect(page.locator('.mg-family-collection')).toHaveCount(2);
    await expect(page.locator('.cg-collection-piece')).toHaveCount(10);
    await expect(page.locator('.is-undiscovered')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(6);
    await imagesReady(page.locator('.cg-collection-piece img'));
    await assertControls(page, '.cg-dialog button');
    await assertNoOverflow(page);
    await shot(page, info, `${route.order[0]}-first-complete-collection`);
    await closeDialog(page, info);
    expect(await saved(page)).toEqual(complete);

    if (route.order[0] === 'bird') {
      const hashes = [];
      // Every reward is earned above through play, including consumed tiers.
      for (const id of ['b3', 'b4', 'b5', 'f3', 'f4', 'f5']) {
        await openCollectedPostcard(page, id, info);
        await assertControls(page, '.cg-dialog button');
        await assertNoOverflow(page);
        await shot(page, info, `postcard-${id}`);
        hashes.push(await downloadPNG(page, info, id));
        await closeDialog(page, info);
        expect(await saved(page)).toEqual(complete);
        expect((await boardIds(page)).filter(id => id !== 'empty').sort()).toEqual(['b5', 'f5']);
      }
      expect(new Set(hashes).size, 'six distinct rendered PNG postcards').toBe(6);
    }
    await page.reload();
    await expect(occupied(page)).toHaveCount(2);
    expect(await saved(page)).toEqual(complete);
    await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
    await expect(occupied(page)).toHaveCount(3);
    expect((await saved(page)).round).toEqual(complete.history.at(-1));
    await expect(page.locator('.cg-progress')).toHaveText('10/10');
    await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
    await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(6);
  });
}

test('Help and Collection are on demand, keep the board untouched, and restore keyboard focus', async ({ page }, info) => {
  await makeLevelThree(page, 'bird', info);
  const before = await rawSave(page), board = await boardIds(page);
  const help = page.getByRole('button', { name: 'How to play', exact: true });
  await help.focus();
  await help.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Two of a kind', exact: true })).toBeVisible();
  await expect(page.locator('.cg-help')).toContainText('Two identical pictures');
  await expect(page.locator('.cg-help')).toContainText('Level 3 earns your first postcard');
  await imagesReady(page.locator('.cg-help img'));
  await assertControls(page, '.cg-dialog button');
  await assertNoOverflow(page);
  await shot(page, info, 'help');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(help).toBeFocused();
  for (let visit = 0; visit < 3; visit++) {
    await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
    await expect(page.getByRole('dialog', { name: 'Your two garden paths', exact: true })).toBeVisible();
    await expect(page.locator('.cg-collection-piece')).toHaveCount(10);
    await expect(page.getByRole('button', { name: 'Open postcard', exact: true })).toHaveCount(1);
    await closeDialog(page, info);
    expect(await boardIds(page)).toEqual(board);
    expect(await rawSave(page)).toBe(before);
  }
});

test('postcard survives native file-share cancellation and board return', async ({ page }, info) => {
  await page.evaluate(() => {
    window.matchingShareCalls = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => data.files?.every(file => file instanceof File && file.type === 'image/png') });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
      window.matchingShareCalls.push({ title: data.title, files: data.files.map(file => ({ name: file.name, type: file.type, size: file.size })) });
      throw new DOMException('Canceled', 'AbortError');
    } });
  });
  await makeLevelThree(page, 'fern', info);
  const before = await rawSave(page), board = await boardIds(page);
  await activate(page.getByRole('button', { name: 'Open your postcard', exact: true }), info);
  await expect(page.getByRole('button', { name: 'Share postcard', exact: true })).toBeEnabled();
  await activate(page.getByRole('button', { name: 'Share postcard', exact: true }), info);
  await expect(page.locator('.cg-export-status')).toHaveText('Sharing canceled. Your postcard is still here.');
  const calls = await page.evaluate(() => window.matchingShareCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].title).toBe('Moticos postcard');
  expect(calls[0].files).toHaveLength(1);
  expect(calls[0].files[0]).toMatchObject({ name: 'moticos-nightgarden.png', type: 'image/png' });
  expect(calls[0].files[0].size).toBeGreaterThan(10_000);
  await expect(page.getByRole('button', { name: 'Download postcard', exact: true })).toBeEnabled();
  const close = await page.getByRole('button', { name: 'Back to board', exact: true }).boundingBox();
  expect(close.y).toBeGreaterThanOrEqual(0);
  expect(close.y + close.height).toBeLessThanOrEqual(page.viewportSize().height);
  await shot(page, info, 'share-canceled');
  await closeDialog(page, info);
  expect(await rawSave(page)).toBe(before);
  expect(await boardIds(page)).toEqual(board);
});

test('rapid keyboard focus and merge work without animation-frame callbacks', async ({ page }) => {
  await page.evaluate(() => { window.requestAnimationFrame = () => 1; });
  await cell(page, 6).press('Enter');
  await expect(cell(page, 6)).toHaveAttribute('aria-pressed', 'true');
  await cell(page, 6).press('ArrowRight');
  await expect(cell(page, 7)).toBeFocused();
  await page.keyboard.press('Enter');
  await idle(page);
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'b2');
  await expect(cell(page, 7)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(cell(page, 5)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(cell(page, 0)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cell(page, 0)).toHaveAttribute('data-piece-id', 'b2');
  await page.keyboard.press('Escape');
  await expect(cell(page, 0)).toHaveAttribute('aria-pressed', 'false');
  expect((await saved(page)).round).toMatchObject({ moves: 2, merges: 1 });
});

for (const interruption of ['pointercancel', 'lostpointercapture', 'blur']) {
  test(`an interrupted drag (${interruption}) changes nothing and allows the next gesture`, async ({ page }, info) => {
    await page.evaluate(() => { document.addEventListener('pointerdown', event => { window.lastMatchingPointer = event.pointerId; }, { capture: true }); });
    const board = await boardIds(page), before = await rawSave(page);
    await page.locator('.cg-board').scrollIntoViewIfNeeded();
    const box = await cell(page, 0).boundingBox();
    await beginDrag(page, cell(page, 6), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    if (interruption === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    else await cell(page, 6).dispatchEvent(interruption, { pointerId: await page.evaluate(() => window.lastMatchingPointer), bubbles: true });
    await expect(page.locator('.cg-floating')).toHaveCount(0);
    await page.mouse.up();
    expect(await boardIds(page)).toEqual(board);
    expect(await rawSave(page)).toBe(before);
    await mergeAt(page, 6, 7, info, 'drag');
    await expect(pieces(page, 'b2')).toHaveCount(1);
  });
}

test('rapid supply and duplicate merge activations do not lose or double-consume material', async ({ page }) => {
  await supply(page, 'bird').evaluate(button => { button.click(); button.click(); });
  await expect(occupied(page)).toHaveCount(12);
  expect((await saved(page)).round).toMatchObject({ moves: 2, merges: 0, supply: { bird: 8, fern: 12 } });
  await cell(page, 6).press('Enter');
  await cell(page, 7).evaluate(button => { button.click(); button.click(); button.click(); });
  await idle(page);
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'b2');
  await expect(occupied(page)).toHaveCount(11);
  const result = await saved(page);
  expect(result.round).toMatchObject({ moves: 3, merges: 1, supply: { bird: 8, fern: 12 } });
  expect(result.history).toHaveLength(3);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a merge saves before its decorative flight and reload retains exact Undo history and sound', async ({ page }, info) => {
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
  await activate(supply(page, 'fern'), info);
  await cell(page, 6).press('Enter');
  // One synchronous activation commits the merge before its 190ms decoration.
  await cell(page, 7).evaluate(button => button.click());
  const committed = await saved(page);
  expect(committed.sound).toBe(false);
  expect(committed.round).toMatchObject({ moves: 2, merges: 1, supply: { bird: 12, fern: 10 } });
  expect(committed.history).toHaveLength(2);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'b2');
  expect(await saved(page)).toEqual(committed);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect((await saved(page)).round).toEqual(committed.history[1]);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect((await saved(page)).round).toEqual(committed.history[0]);
  expect((await saved(page)).sound).toBe(false);
  await expect(page.locator('.cg-progress')).toHaveText('3/10');
});

test('fresh-envelope cancellation preserves the board; confirmed reset retains earned postcards', async ({ page }, info) => {
  await makeLevelThree(page, 'bird', info);
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
  const before = await saved(page);
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
  await expect(page.getByRole('dialog', { name: 'Open a fresh envelope?', exact: true })).toBeVisible();
  await closeDialog(page, info);
  expect(await saved(page)).toEqual(before);
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
  await activate(page.getByRole('button', { name: 'Start fresh', exact: true }), info);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(occupied(page)).toHaveCount(8);
  await expect(pieces(page, 'b3')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  const reset = await saved(page);
  expect(reset.round).toMatchObject({ moves: 0, merges: 0, supply: { bird: 12, fern: 12 } });
  expect(reset.history).toEqual([]);
  expect(reset.discoveries).toEqual(before.discoveries);
  expect(reset.sound).toBe(false);
  await openCollectedPostcard(page, 'b3', info);
  await closeDialog(page, info);
  expect(await saved(page)).toEqual(reset);
});

for (const fixture of [
  { name: 'malformed JSON', raw: '{broken matching save\n' },
  { name: 'empty stored string', raw: '' },
  { name: 'invalid current schema', raw: '{"version":1,"round":{}}' },
  { name: 'future version', raw: ' { "version": 99, "future": { "preserve": "exact bytes" } }\n' },
]) {
  test(`${fixture.name} stays byte-for-byte untouched while temporary play and original-save download work`, async ({ page }, info) => {
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: MATCHING_KEY, raw: fixture.raw });
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('left untouched');
    await expect(occupied(page)).toHaveCount(8);
    await mergeId(page, 'b1', info);
    await activate(supply(page, 'fern'), info);
    await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
    expect(await rawSave(page)).toBe(fixture.raw);
    const pending = page.waitForEvent('download');
    await activate(page.getByRole('button', { name: 'Download original save', exact: true }), info);
    const download = await pending;
    expect(download.suggestedFilename()).toBe('moticos-original-save.json');
    await mkdir('test-results/postcards', { recursive: true });
    const path = `test-results/postcards/${info.project.name}-matching-original-${fixture.name.replaceAll(' ', '-')}.json`;
    await download.saveAs(path);
    expect(await readFile(path, 'utf8')).toBe(fixture.raw);
    await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
    await activate(page.getByRole('button', { name: 'Start fresh', exact: true }), info);
    expect(await rawSave(page)).toBe(fixture.raw);
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('practice board is temporary');
    await expect(occupied(page)).toHaveCount(8);
    expect(await rawSave(page)).toBe(fixture.raw);
  });
}

test('matching leaves the prior recipe study save untouched and both older routes remain separate', async ({ page }, info) => {
  await page.goto('/?recipe-study');
  await expect(page.locator('[data-collection-cell]')).toHaveCount(25);
  await expect(page.locator('[data-matching-cell]')).toHaveCount(0);
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
  const recipeRaw = await rawSave(page, RECIPE_KEY);
  expect(JSON.parse(recipeRaw).sound).toBe(false);
  await page.goto('/');
  await mergeId(page, 'b1', info);
  await activate(supply(page, 'bird'), info);
  const matchingRaw = await rawSave(page);
  expect(await rawSave(page, RECIPE_KEY)).toBe(recipeRaw);
  await page.reload();
  expect(await rawSave(page, RECIPE_KEY)).toBe(recipeRaw);
  await page.goto('/?classic');
  await expect(page.locator('.mm-board')).toBeVisible();
  await expect(page.locator('[data-matching-cell]')).toHaveCount(0);
  expect(await rawSave(page)).toBe(matchingRaw);
  expect(await rawSave(page, RECIPE_KEY)).toBe(recipeRaw);
  await page.goto('/?recipe-study');
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
  expect(await rawSave(page, RECIPE_KEY)).toBe(recipeRaw);
  await page.goto('/');
  await expect(pieces(page, 'b2')).toHaveCount(1);
  expect(await rawSave(page)).toBe(matchingRaw);
});

test('reduced motion keeps matching, hints, touch controls, and postcard navigation usable', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await activate(page.getByRole('button', { name: 'Hint', exact: true }), info);
  await expect(page.locator('.is-hint')).toHaveCount(2);
  await expect(page.locator('.cg-notice')).toContainText('Match the two highlighted');
  const transition = await cell(page, 6).evaluate(element => getComputedStyle(element).transitionDuration);
  expect(transition.split(',').every(value => parseFloat(value) === 0)).toBe(true);
  await makeLevelThree(page, 'bird', info, 'tap');
  await expect(page.locator('.cg-floating')).toHaveCount(0);
  const before = await rawSave(page);
  await activate(page.getByRole('button', { name: 'Open your postcard', exact: true }), info);
  await expect(page.getByRole('button', { name: 'Download postcard', exact: true })).toBeEnabled();
  await assertNoOverflow(page);
  await shot(page, info, 'reduced-motion-postcard');
  await closeDialog(page, info);
  expect(await rawSave(page)).toBe(before);
});

test('an unreadable existing save is never overwritten, even if storage later recovers', async ({ page }, info) => {
  await mergeAt(page, 6, 7, info);
  const original = await rawSave(page);
  await page.addInitScript(key => {
    const read = Storage.prototype.getItem;
    const write = Storage.prototype.setItem;
    window.matchingReadBlocked = true;
    window.matchingWriteAttempts = 0;
    window.matchingOriginalRead = () => read.call(localStorage, key);
    Storage.prototype.getItem = function (name) {
      if (name === key && window.matchingReadBlocked) throw new DOMException('Storage temporarily inaccessible', 'SecurityError');
      return read.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) window.matchingWriteAttempts++;
      return write.call(this, name, value);
    };
  }, MATCHING_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('left untouched');
  await expect(page.getByRole('button', { name: 'Download original save', exact: true })).toHaveCount(0);
  await expect(occupied(page)).toHaveCount(8);
  await mergeAt(page, 6, 7, info);
  expect(await page.evaluate(() => window.matchingOriginalRead())).toBe(original);
  expect(await page.evaluate(() => window.matchingWriteAttempts)).toBe(0);
  await page.evaluate(() => { window.matchingReadBlocked = false; });
  await activate(supply(page, 'fern'), info);
  await expect(occupied(page)).toHaveCount(9);
  expect(await rawSave(page)).toBe(original);
  expect(await page.evaluate(() => window.matchingWriteAttempts)).toBe(0);
  await expect(page.locator('.cg-footer')).toContainText('Playing in this tab');
});

test('a genuinely stale second tab cannot overwrite the newer saved garden', async ({ page, context }, info) => {
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
  const stale = await context.newPage();
  stale.on('pageerror', error => errorsByPage.get(page).push(error.message));
  try {
    await stale.goto('/');
    await expect(stale.locator('[data-matching-cell]')).toHaveCount(25);
    await expect(occupied(stale)).toHaveCount(8);
    await mergeAt(page, 6, 7, info);
    const latest = await rawSave(page);
    await expect(stale.getByRole('alert')).toContainText('Another tab changed this garden');
    await activate(supply(stale, 'fern'), info);
    await expect(occupied(stale)).toHaveCount(10);
    expect(await rawSave(stale)).toBe(latest);
    expect(await rawSave(page)).toBe(latest);
    await activate(stale.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
    await activate(stale.getByRole('button', { name: 'Start fresh', exact: true }), info);
    expect(await rawSave(stale)).toBe(latest);
    await stale.reload();
    await expect(pieces(stale, 'b2')).toHaveCount(1);
    await expect(occupied(stale)).toHaveCount(7);
    await expect(stale.getByRole('alert')).toHaveCount(0);
    expect(await rawSave(stale)).toBe(latest);
    await activate(supply(stale, 'fern'), info);
    await expect(occupied(stale)).toHaveCount(9);
    expect((await saved(stale)).round).toMatchObject({ moves: 2, merges: 1, supply: { bird: 12, fern: 10 } });
  } finally {
    await stale.close();
  }
});

test('non-primary and non-left pointer-up cannot move a selected piece into empty space', async ({ page }, info) => {
  await activate(cell(page, 6), info);
  await expect(cell(page, 6)).toHaveAttribute('aria-pressed', 'true');
  const board = await boardIds(page), before = await rawSave(page);
  await cell(page, 0).dispatchEvent('pointerup', { pointerId: 22, pointerType: 'touch', isPrimary: false, button: 0, bubbles: true });
  expect(await boardIds(page)).toEqual(board);
  expect(await rawSave(page)).toBe(before);
  await cell(page, 0).dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 2, bubbles: true });
  expect(await boardIds(page)).toEqual(board);
  expect(await rawSave(page)).toBe(before);
  await expect(cell(page, 6)).toHaveAttribute('aria-pressed', 'true');
  await activate(cell(page, 0), info);
  await expect(cell(page, 0)).toHaveAttribute('data-piece-id', 'b1');
  await expect(cell(page, 6)).toHaveAttribute('data-piece-id', 'empty');
  expect((await saved(page)).round).toMatchObject({ moves: 1, merges: 0 });
});
