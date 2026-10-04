import { test, expect } from '@playwright/test';
import {
  MATCHING_KEY, PHONE_VIEWPORTS, cell, pieces, occupied, supply, activate,
  boardIds, rawSave, idle, clearSelection, mergeId, closeDialog, beginDrag,
  openSaveWarning, saveWarning, assertControls, assertNoOverflow,
  assertMatchingViewportFit, assertMatchingScrollableFallback,
  matchingGeometry, attachMatchingGeometry,
} from './matching-helpers.js';

// Browser acceptance, not seeded engine fixtures: every board state below is
// reached through visible controls. Invalid saves are the only injected data.
const ENVELOPES = [
  { id: 'matching-garden', key: MATCHING_KEY, families: ['bird', 'fern'], prefixes: ['b', 'f'] },
  { id: 'moonlit-passage', key: 'moticos.matching.moonlit-passage.v1', families: ['key', 'moon'], prefixes: ['k', 'm'] },
  { id: 'riverside-reverie', key: 'moticos.matching.riverside-reverie.v1', families: ['map', 'teacup'], prefixes: ['r', 't'] },
];
const url = envelope => envelope.id === 'matching-garden' ? '/' : `/?envelope=${envelope.id}`;
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page).push(error.message));
  await page.setViewportSize(PHONE_VIEWPORTS[0]);
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page), 'no uncaught browser errors').toEqual([]);
});

async function openEnvelope(page, envelope) {
  await page.goto(url(envelope));
  await expect(page.locator('[data-matching-cell]')).toHaveCount(25);
  await idle(page);
}
async function inspectAtAllHeights(page, info, envelope, state) {
  const original = page.viewportSize();
  try {
    for (const viewport of PHONE_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await assertMatchingViewportFit(page, info, `${envelope.id}-${state}-${viewport.width}x${viewport.height}`);
    }
  } finally {
    await page.setViewportSize(original);
  }
}
async function freshEnvelope(page, info) {
  await activate(page.getByRole('button', { name: 'Fresh envelope', exact: true }), info);
  await expect(page.getByRole('dialog', { name: 'Open a fresh envelope?', exact: true })).toBeVisible();
  await activate(page.getByRole('button', { name: 'Start fresh', exact: true }), info);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(occupied(page)).toHaveCount(8);
}

for (const envelope of ENVELOPES) {
  test(`${envelope.id}: all controls and 25 cells fit four real phone viewports through full-board recovery`, async ({ page }, info) => {
    test.setTimeout(240_000);
    await openEnvelope(page, envelope);
    await expect(page.locator('.cg-postcard-button')).toBeDisabled();
    await inspectAtAllHeights(page, info, envelope, 'initial');
    await activate(cell(page, 6), info);
    await expect(cell(page, 6)).toHaveAttribute('aria-pressed', 'true');
    await inspectAtAllHeights(page, info, envelope, 'selected');
    await activate(page.getByRole('button', { name: 'Hint', exact: true }), info);
    await expect(page.locator('.is-hint')).toHaveCount(2);
    await inspectAtAllHeights(page, info, envelope, 'hint');
    await clearSelection(page);

    // 24 occupied spaces, then a real merge and pair draw produce a full board.
    for (let draw = 0; draw < 6; draw++) await activate(supply(page, envelope.families[0]), info);
    for (let draw = 0; draw < 2; draw++) await activate(supply(page, envelope.families[1]), info);
    await expect(occupied(page)).toHaveCount(24);
    await expect(supply(page, envelope.families[0])).toHaveAccessibleName(`Add ${envelope.families[0]} pair, 0 pairs left`);
    await expect(supply(page, envelope.families[0])).toBeDisabled();
    await expect(supply(page, envelope.families[1])).toBeDisabled();
    await inspectAtAllHeights(page, info, envelope, 'one-space-first-supply-exhausted');
    await mergeId(page, `${envelope.prefixes[0]}1`, info);
    await inspectAtAllHeights(page, info, envelope, 'selected-tier-two');
    await activate(supply(page, envelope.families[1]), info);
    await expect(occupied(page)).toHaveCount(25);
    await expect(page.locator('.cg-notice')).toContainText('make room for a fresh pair');
    await inspectAtAllHeights(page, info, envelope, 'full-board');
    await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
    await expect(occupied(page)).toHaveCount(23);
    await expect(supply(page, envelope.families[1])).toBeEnabled();
    await inspectAtAllHeights(page, info, envelope, 'full-board-undo-recovery');
    await freshEnvelope(page, info);

    // All higher tiers and completion are verified at these same four exact
    // viewports by assertLiveArtAtPhoneWidths in the existing complete-round
    // tests. Do not run a duplicate 30-merge route in this layout-only test.
    await inspectAtAllHeights(page, info, envelope, 'fresh-after-full-board');
  });

  test(`${envelope.id}: protected-save warning and recovery fit all four viewports`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await openEnvelope(page, envelope);
    const original = ' {"version":99,"untouched":"layout recovery original"}\n';
    await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key: envelope.key, original });
    await page.reload();
    await expect(saveWarning(page)).toBeVisible();
    await expect(saveWarning(page)).toContainText('Temporary play');
    await inspectAtAllHeights(page, info, envelope, 'unread-save-warning');
    const board = await boardIds(page);
    for (const viewport of PHONE_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await openSaveWarning(page, info);
      const dialog = page.getByRole('dialog', { name: 'Save protection', exact: true });
      await expect(dialog.getByRole('alert')).toContainText('left untouched');
      await assertControls(page, '.cg-dialog button');
      await assertNoOverflow(page);
      const download = dialog.getByRole('button', { name: 'Download original save', exact: true });
      await download.scrollIntoViewIfNeeded();
      const bounds = await download.boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      // Modal evidence is viewport-only too; its explicit scroll is not a
      // substitute for the stricter no-scroll board assertions before/after.
      await attachMatchingGeometry(page, info, `${envelope.id}-save-details-${viewport.width}x${viewport.height}`, await matchingGeometry(page, '.cg-dialog button'));
      await closeDialog(page, info);
      expect(await boardIds(page)).toEqual(board);
      expect(await rawSave(page, envelope.key)).toBe(original);
      await assertMatchingViewportFit(page, info, `${envelope.id}-save-details-return-${viewport.width}x${viewport.height}`);
    }
    await page.setViewportSize(PHONE_VIEWPORTS[0]);
    await activate(supply(page, envelope.families[0]), info);
    await expect(occupied(page)).toHaveCount(10);
    await inspectAtAllHeights(page, info, envelope, 'temporary-play');
    await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
    expect(await boardIds(page)).toEqual(board);
    expect(await rawSave(page, envelope.key)).toBe(original);
    await inspectAtAllHeights(page, info, envelope, 'temporary-undo-recovery');
  });

  test(`${envelope.id}: quota and stale-tab warning variants retain the same one-screen shell`, async ({ page, context }, info) => {
    test.setTimeout(120_000);
    await openEnvelope(page, envelope);
    await page.evaluate(key => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('quota', 'QuotaExceededError');
        return set.call(this, name, value);
      };
    }, envelope.key);
    await activate(supply(page, envelope.families[0]), info);
    const temporaryBoard = await boardIds(page);
    await expect(saveWarning(page)).toBeVisible();
    await inspectAtAllHeights(page, info, envelope, 'quota-warning');
    await openSaveWarning(page, info);
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('cannot safely save');
    await closeDialog(page, info);
    expect(await boardIds(page)).toEqual(temporaryBoard);
    expect(await rawSave(page, envelope.key)).toBeNull();
    await page.reload();
    await expect(saveWarning(page)).toHaveCount(0);
    await expect(occupied(page)).toHaveCount(8);
    await inspectAtAllHeights(page, info, envelope, 'quota-reloaded');

    // Genuine shared-storage event from a second tab, not a synthetic event.
    const other = await context.newPage();
    other.on('pageerror', error => errors.get(page).push(error.message));
    try {
      await other.setViewportSize(PHONE_VIEWPORTS[0]);
      await other.goto(url(envelope));
      await activate(supply(other, envelope.families[1]), info);
      const latest = await rawSave(other, envelope.key);
      await expect(saveWarning(page)).toBeVisible();
      await inspectAtAllHeights(page, info, envelope, 'stale-tab-warning');
      await openSaveWarning(page, info);
      await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Another tab changed this envelope');
      await closeDialog(page, info);
      await activate(supply(page, envelope.families[0]), info);
      expect(await rawSave(page, envelope.key)).toBe(latest);
      await page.reload();
      await expect(pieces(page, `${envelope.prefixes[1]}1`)).toHaveCount(6);
      await expect(saveWarning(page)).toHaveCount(0);
      expect(await rawSave(page, envelope.key)).toBe(latest);
      await inspectAtAllHeights(page, info, envelope, 'stale-tab-reloaded');
    } finally {
      await other.close();
    }
  });
}

for (const viewport of PHONE_VIEWPORTS) {
  test(`keyboard, modal return and live viewport resizing preserve geometry at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await openEnvelope(page, ENVELOPES[2]);
    await cell(page, 6).focus();
    await page.keyboard.press('Enter');
    await expect(cell(page, 6)).toHaveAttribute('aria-pressed', 'true');
    const before = await boardIds(page);
    // Browser toolbar expansion/collapse while a piece remains selected.
    for (const resized of [PHONE_VIEWPORTS[3], PHONE_VIEWPORTS[0], viewport]) {
      await page.setViewportSize(resized);
      await expect(cell(page, 6)).toBeFocused();
      await expect(cell(page, 6)).toHaveAttribute('aria-pressed', 'true');
      expect(await boardIds(page)).toEqual(before);
      await assertMatchingViewportFit(page);
    }
    await page.keyboard.press('ArrowRight');
    await expect(cell(page, 7)).toBeFocused();
    await page.keyboard.press('Enter');
    await idle(page);
    await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'r2');
    await expect(cell(page, 7)).toBeFocused();
    const saved = await rawSave(page, ENVELOPES[2].key), board = await boardIds(page);
    for (const action of ['How to play', 'Collection', 'Envelopes', 'Fresh envelope']) {
      const trigger = page.getByRole('button', { name: action, exact: true });
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Back to board', exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      const focus = await page.evaluate(() => ({
        insideDialog: Boolean(document.activeElement.closest('dialog')),
        onBoard: Boolean(document.activeElement.closest('.cg-shell')),
        tag: document.activeElement.tagName,
        name: document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim().slice(0, 120),
        documentFocused: document.hasFocus(),
      }));
      expect(focus, 'modal focus diagnostics after backward boundary').toMatchObject({ insideDialog: true, onBoard: false });
      const dialogButtons = page.getByRole('dialog').locator('button:visible:not([disabled])');
      await expect(dialogButtons.last(), 'Shift+Tab wraps to the last enabled modal control').toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Back to board', exact: true }), 'Tab wraps back to the first modal control').toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await rawSave(page, ENVELOPES[2].key)).toBe(saved);
      expect(await boardIds(page)).toEqual(board);
      await assertMatchingViewportFit(page, info, `keyboard-${action}-${viewport.width}x${viewport.height}`);
    }
  });
}

test('viewport changes cancel an unfinished drag and retarget a committed flight without data loss', async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
  await openEnvelope(page, ENVELOPES[0]);
  await activate(page.getByRole('button', { name: 'Mute sound', exact: true }), info);
  const initialBoard = await boardIds(page), initialSave = await rawSave(page);
  const empty = await cell(page, 0).boundingBox();
  await beginDrag(page, cell(page, 6), { x: empty.x + empty.width / 2, y: empty.y + empty.height / 2 });
  await page.setViewportSize(PHONE_VIEWPORTS[3]);
  await expect(page.locator('.cg-floating')).toHaveCount(0);
  await page.mouse.up();
  expect(await boardIds(page)).toEqual(initialBoard);
  expect(await rawSave(page)).toBe(initialSave);
  await assertMatchingViewportFit(page, info, 'resize-during-drag-canceled');

  await cell(page, 6).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(cell(page, 7)).toBeFocused();
  // Hold the real decorative timer deterministically, avoiding a test that
  // accidentally resizes only after the 190ms flight has already finished.
  await page.clock.pauseAt(new Date('2026-10-04T13:00:00Z'));
  await page.keyboard.press('Enter');
  await expect(page.locator('.cg-floating.is-flying')).toHaveCount(1);
  const committed = await rawSave(page);
  expect(JSON.parse(committed).round).toMatchObject({ moves: 1, merges: 1 });
  for (const viewport of [PHONE_VIEWPORTS[0], { width: 380, height: 664 }, { width: 381, height: 664 }, PHONE_VIEWPORTS[2]]) {
    await page.setViewportSize(viewport);
    await page.clock.runFor(32);
    await expect(page.locator('.cg-floating.is-flying')).toHaveCount(1);
    expect(await rawSave(page)).toBe(committed);
    const label = cell(page, 7).locator('.cg-cell-name');
    await expect(label).toHaveText(viewport.width <= 380 ? 'Wing' : 'Riverwing', { useInnerText: true });
    // Directly verify the CSS boundary without adding a delay for JS state.
    await expect(label.locator('.mg-label-compact')).toHaveCSS('display', viewport.width <= 380 ? 'inline' : 'none');
    await expect(label.locator('.mg-label-wide')).toHaveCSS('display', viewport.width <= 380 ? 'none' : 'inline');
    await expect(label.locator('.mg-label-compact:visible, .mg-label-wide:visible')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => {
      const target = document.querySelector('[data-matching-cell="7"]').getBoundingClientRect();
      const flight = document.querySelector('.cg-floating');
      return Math.hypot(parseFloat(flight.style.left) + parseFloat(flight.style.width) / 2 - target.left - target.width / 2,
        parseFloat(flight.style.top) + parseFloat(flight.style.height) / 2 - target.top - target.height / 2);
    }), { message: 'the decorative flight is retargeted to the resized real cell' }).toBeLessThan(1);
  }
  await page.clock.runFor(1000);
  await page.clock.resume();
  await idle(page);
  await expect(cell(page, 7)).toHaveAttribute('data-piece-id', 'b2');
  await expect(cell(page, 7)).toBeFocused();
  expect(await rawSave(page)).toBe(committed);
  await assertMatchingViewportFit(page, info, 'resize-during-flight-committed');
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), info);
  expect(await boardIds(page)).toEqual(initialBoard);
  expect(JSON.parse(await rawSave(page)).round).toEqual(JSON.parse(initialSave).round);
  await mergeId(page, 'b1', info);
  await expect(pieces(page, 'b2')).toHaveCount(1);
});

test('320x480 tiny portrait falls back to reachable scrolling without hiding controls or shrinking targets', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await openEnvelope(page, ENVELOPES[2]);
  await assertMatchingScrollableFallback(page, info, 'tiny-portrait-320x480');
  await activate(page.getByRole('button', { name: 'Hint', exact: true }), info);
  await expect(page.locator('.is-hint')).toHaveCount(2);
  await activate(page.getByRole('button', { name: 'Envelopes', exact: true }), info);
  await closeDialog(page, info);
  await expect(occupied(page)).toHaveCount(8);
});

for (const percent of [125, 150, 200]) {
  test(`${percent} percent text-only zoom uses honest scrolling with unclipped labels and reachable 44px controls`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await openEnvelope(page, ENVELOPES[1]);
    // Doubling only the root font would not exercise fixed-px type. Snapshot
    // computed fonts first, then scale text-bearing elements exactly once.
    const zoomed = await page.evaluate(scale => {
      const items = [...document.querySelectorAll('.mg-page > .cg-shell *')].filter(node =>
        !node.closest('.cg-sr-only, svg') && [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim())
      ).map(node => ({ node, font: parseFloat(getComputedStyle(node).fontSize) }));
      for (const { node, font } of items) node.style.fontSize = `${font * scale}px`;
      return items.map(({ node, font }) => ({ text: node.textContent.trim(), before: font, after: parseFloat(getComputedStyle(node).fontSize) }));
    }, percent / 100);
    await expect(page.locator('.mg-page')).toHaveClass(/mg-large-text/);
    expect(zoomed.length).toBeGreaterThan(20);
    for (const item of zoomed) expect(item.after, `${item.text} really scales to ${percent}%`).toBeCloseTo(item.before * percent / 100, 1);
    await assertMatchingScrollableFallback(page, info, `text-zoom-${percent}-percent`);
    await activate(page.getByRole('button', { name: 'Collection', exact: true }), info);
    await closeDialog(page, info);
    await expect(occupied(page)).toHaveCount(8);
  });
}

test('430x752 safe-area budget simulation preserves the entire play surface', async ({ page }, info) => {
  await page.setViewportSize(PHONE_VIEWPORTS[2]);
  await openEnvelope(page, ENVELOPES[2]);
  // This is explicit CSS budget simulation, not physical-iPhone evidence or
  // a claim that Playwright emulates Safari chrome/native safe-area insets.
  await page.locator('.mg-page').evaluate(node => {
    node.style.setProperty('--mg-top', '47px');
    node.style.setProperty('--mg-bottom', '34px');
  });
  const padding = await page.locator('.mg-page').evaluate(node => ({
    top: parseFloat(getComputedStyle(node).paddingTop),
    bottom: parseFloat(getComputedStyle(node).paddingBottom),
  }));
  expect(padding).toEqual({ top: 47, bottom: 34 });
  await assertMatchingViewportFit(page, info, 'safe-area-budget-simulation-430x752');
  await mergeId(page, 'r1', info);
  await assertMatchingViewportFit(page, info, 'safe-area-budget-selected-430x752');
});
