import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { expect } from '@playwright/test';

export const MATCHING_KEY = 'moticos.matching.garden.v1';
export const RECIPE_KEY = 'moticos.collection.garden.v1';
export const PHONE_VIEWPORTS = Object.freeze([
  { width: 320, height: 568 },
  { width: 390, height: 664 },
  { width: 430, height: 752 },
  { width: 430, height: 932 },
]);
export const NAMES = {
  b1: 'Coral Bird', b2: 'Riverwing', b3: 'Wayfinder', b4: 'Aviary Gate', b5: 'Wandering Aviary',
  f1: 'Teal Fern', f2: 'Fern Cup', f3: 'Nightgarden', f4: 'Moonlit Arbor', f5: 'Lunar Conservatory',
  k1: 'Round Key', k2: 'Frond Key', k3: 'Drawbridge Key', k4: 'Stairway Key', k5: 'Elsewhere Key',
  r1: 'River Map', r2: 'River Ridge', r3: 'River Crossing', r4: 'River Cascade', r5: 'River Citadel',
  t1: 'Cream Teacup', t2: 'Ribbon Sip', t3: 'Tea Chorus', t4: 'Pleated Steam', t5: 'Ribbon Reverie',
  m1: 'Cobalt Moon', m2: 'Crescent Courier', m3: 'Lunar Skiff', m4: 'Crescent Balloon', m5: 'Orbit Voyager',
  l1: 'Paper Lantern', l2: 'Folded Glow', l3: 'Lantern House', l4: 'Lantern Tower', l5: 'Lantern Palace',
  s1: 'Coral Spool', s2: 'Ribbon Spool', s3: 'Ribbon Bloom', s4: 'Ribbon Loom', s5: 'Ribbon Pavilion',
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
export async function shot(page, info, name, { fullPage = true } = {}) {
  await mkdir('test-results/screenshots', { recursive: true });
  const path = `test-results/screenshots/${info.project.name}-matching-${name}.png`;
  await page.screenshot({ path, fullPage, animations: 'disabled' });
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
  const prefix = { bird: 'b', fern: 'f', key: 'k', moon: 'm', map: 'r', teacup: 't', lantern: 'l', spool: 's' }[family];
  await mergeId(page, `${prefix}1`, info, method);
  await mergeId(page, `${prefix}1`, info, method);
  await mergeId(page, `${prefix}2`, info, method);
  await expect(pieces(page, `${prefix}3`)).toHaveCount(1);
}

// Read the real rendered board, then make every move through the real UI.
// Do not seed a finale, import the reducer, or invoke application internals.
export async function finishFamily(page, family, info, method = 'tap', onDiscovery = null) {
  const prefix = { bird: 'b', fern: 'f', key: 'k', moon: 'm', map: 'r', teacup: 't', lantern: 'l', spool: 's' }[family];
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
// Bound selector failures independently of full-round 240–300s test budgets.
// Role and exact visible-label lookups must agree before a long journey starts.
async function albumSelect(page, label, option) {
  const control = page.getByLabel(label, { exact: true });
  await expect(control).toHaveCount(1, { timeout: 7_500 });
  await expect(control).toBeVisible({ timeout: 7_500 });
  await expect(control).toBeEnabled({ timeout: 7_500 });
  await expect(control).toHaveAccessibleName(label, { timeout: 7_500 });
  await expect(page.getByRole('combobox', { name: label, exact: true })).toHaveCount(1, { timeout: 7_500 });
  await control.selectOption(option, { timeout: 7_500 });
}
export async function selectCollectionEnvelope(page, title) { await albumSelect(page, 'Browse envelope', { label: title }); }
export async function selectEnvelopeFilter(page, value) { await albumSelect(page, 'Show envelopes', value); }
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
  expect(matchingControlViolations(sizes), 'all controls retain 44px targets').toEqual([]);
}

// Inspect every real, currently live tier at compact and standard phone widths.
// The round itself still plays at the project's original viewport and engine.
export async function assertLiveArtAtPhoneWidths(page, info = null, name = 'live-art', options = {}) {
  await expect(page.locator('.cg-cell.is-pasted')).toHaveCount(0);
  const original = page.viewportSize();
  try {
    for (const viewport of PHONE_VIEWPORTS) {
      const { width } = viewport;
      await page.setViewportSize(viewport);
      await imagesReady(page.locator('.cg-board img'));
      await assertMatchingViewportFit(page, info, `${name}-${width}x${viewport.height}`, options);
      await assertControls(page, '.cg-header button, .cg-tools button, .mg-supply button, .cg-postcard-button, .cg-footer button');
      const tiles = await occupied(page).evaluateAll(nodes => nodes.map(node => {
        const label = node.querySelector('.cg-cell-name');
        const image = node.querySelector('img');
        const box = node.getBoundingClientRect();
        const art = image.getBoundingClientRect();
        return {
          id: node.dataset.pieceId, name: label.innerText,
          accessibleName: node.getAttribute('aria-label'),
          clipped: label.scrollWidth > label.clientWidth + 1,
          font: parseFloat(getComputedStyle(label).fontSize),
          width: box.width, height: box.height,
          artWidth: art.width, artHeight: art.height,
        };
      }));
      expect(matchingArtViolations(tiles, width, options.names), `live artwork remains readable at ${width}px`).toEqual([]);
    }
  } finally {
    await page.setViewportSize(original);
  }
}


export const saveWarning = page => page.getByRole('button', { name: /^Save warning:/ });
export async function openSaveWarning(page, info) {
  await expect(saveWarning(page)).toBeVisible();
  await activate(saveWarning(page), info);
  await expect(page.getByRole('dialog', { name: 'Save protection', exact: true })).toBeVisible();
}
export async function assertSaveWarning(page, info, text) {
  await openSaveWarning(page, info);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(text);
  await closeDialog(page, info);
}

// A layout gate must never scroll, enlarge the viewport, or turn a viewport
// screenshot into a full-page image to make a too-tall game appear to fit.
// Diagnostic JSON and the actual viewport are attached before assertions so
// a failing fit gate has inspectable evidence too.
export async function matchingGeometry(page, selector = '.mg-page > .cg-shell button') {
  return page.evaluate(selector => {
    const rect = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const label = node => node.getAttribute('aria-label') || (node.matches('.cg-cell-name') ? node.innerText : node.textContent).trim() || node.className;
    const measure = (node, decorativeArt = false) => {
      const box = rect(node), hiddenBy = [], clippedBy = [];
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 || ancestor.hidden || (ancestor.getAttribute('aria-hidden') === 'true' && !(decorativeArt && ancestor.matches('.mg-board-art'))) || ancestor.inert) hiddenBy.push(ancestor.className || ancestor.tagName);
        if (ancestor !== node) {
          const bounds = rect(ancestor);
          const clipsX = style.overflowX !== 'visible';
          const clipsY = style.overflowY !== 'visible';
          if ((clipsX && (box.left < bounds.left - 1 || box.right > bounds.right + 1)) ||
              (clipsY && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))) clippedBy.push(ancestor.className || ancestor.tagName);
        }
      }
      const hitTests = [[.5, .5], [.2, .2], [.8, .2], [.2, .8], [.8, .8]].map(([x, y]) => {
        const px = box.left + box.width * x, py = box.top + box.height * y;
        const hit = document.elementFromPoint(px, py);
        return { x: px, y: py, clear: Boolean(hit && (hit === node || node.contains(hit))), covering: hit ? label(hit) : null };
      });
      return { name: label(node), tag: node.tagName, cell: node.dataset.matchingCell ?? null,
        piece: node.dataset.pieceId ?? null, ...box, hiddenBy, clippedBy, hitTests,
        scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
        scrollHeight: node.scrollHeight, clientHeight: node.clientHeight };
    };
    const shell = document.querySelector('.mg-page > .cg-shell');
    // Only the deliberately inactive CSS label variant is excluded. Other
    // display:none text remains in the audit and fails instead of disappearing.
    const inactiveLabelVariant = node => node.parentElement?.matches('.cg-cell-name')
      && node.matches('.mg-label-wide, .mg-label-compact') && getComputedStyle(node).display === 'none';
    const text = [...shell.querySelectorAll('*')].filter(node =>
      !node.closest('.cg-sr-only, .cg-floating, svg') && !inactiveLabelVariant(node) &&
      (node.matches('.cg-cell-name') || [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()))
    ).map(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      const box = rect(node), r = range.getBoundingClientRect(), style = getComputedStyle(node);
      return { name: label(node), ...box, font: parseFloat(style.fontSize),
        display: style.display, visibility: style.visibility, opacity: Number(style.opacity),
        textBox: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
        scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
        scrollHeight: node.scrollHeight, clientHeight: node.clientHeight,
        // Inline text has no meaningful clientWidth; its Range still has bounds.
        block: style.display !== 'inline', cellLabel: node.matches('.cg-cell-name, .mg-label-wide, .mg-label-compact'),
        labelVariants: node.matches('.cg-cell-name') ? [...node.querySelectorAll('.mg-label-wide, .mg-label-compact')].map(variant => {
          const css = getComputedStyle(variant), bounds = rect(variant);
          return { kind: variant.matches('.mg-label-compact') ? 'compact' : 'wide', text: variant.textContent.trim(),
            active: css.display !== 'none' && css.visibility === 'visible' && Number(css.opacity) > 0 && Number(style.opacity) > 0 && bounds.width > 0 && bounds.height > 0,
            display: css.display, visibility: css.visibility, font: parseFloat(css.fontSize), ...bounds };
        }) : undefined };

    });
    const regions = [...shell.querySelectorAll('.cg-header, .cg-instruction, .cg-board, .mg-supply, .mg-inspector, .cg-tools, .cg-notice, .cg-footer')].map(measure);
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY,
        visual: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale } : null },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      body: { width: document.body.scrollWidth, height: document.body.scrollHeight },
      shell: measure(shell), regions,
      controls: [...document.querySelectorAll(selector)].map(measure), text,
      artwork: [...shell.querySelectorAll('.cg-board img')].map(node => {
        const image = measure(node, true), frame = node.closest('.mg-art-fit'), allocated = node.closest('.mg-board-art');
        const inkBounds = node.hasAttribute('data-ink-bounds') ? node.dataset.inkBounds.split(',').map(Number) : null;
        const painted = inkBounds?.length === 4 && node.naturalWidth > 0 && node.naturalHeight > 0 ? {
          left: image.left + image.width * inkBounds[0] / node.naturalWidth,
          top: image.top + image.height * inkBounds[1] / node.naturalHeight,
          width: image.width * inkBounds[2] / node.naturalWidth,
          height: image.height * inkBounds[3] / node.naturalHeight,
        } : null;
        if (painted) { painted.right = painted.left + painted.width; painted.bottom = painted.top + painted.height; }
        return { ...image, name: node.closest('[data-matching-cell]').getAttribute('aria-label'),
          complete: node.complete, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight,
          cropped: Boolean(frame || allocated || inkBounds || node.matches('.mg-cropped-art')),
          objectFit: getComputedStyle(node).objectFit, inkBounds, painted,
          frame: frame ? measure(frame, true) : null,
          allocated: allocated ? measure(allocated, true) : null,
          cellBounds: rect(node.closest('[data-matching-cell]')),
        };
      }),
    };
  }, selector);
}

export async function attachMatchingGeometry(page, info, name, geometry) {
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
  const prefix = `${info.project.name}-matching-layout-${safeName}`;
  await mkdir('test-results/screenshots', { recursive: true });
  const json = `test-results/screenshots/${prefix}.json`;
  const screenshot = `test-results/screenshots/${prefix}.png`;
  await writeFile(json, JSON.stringify(geometry, null, 2) + '\n');
  await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' });
  await info.attach(`${safeName}-geometry`, { path: json, contentType: 'application/json' });
  await info.attach(`${safeName}-viewport`, { path: screenshot, contentType: 'image/png' });
}

function checkUnclippedText(text, check) {
  for (const item of text) {
    check(item.display, `${item.name} is rendered`).not.toBe('none');
    check(item.visibility, `${item.name} is visible`).toBe('visible');
    if (item.opacity !== undefined) check(item.opacity, `${item.name} has visible opacity`).toBeGreaterThan(0);
    if (item.block) {
      check(item.scrollWidth, `${item.name} does not truncate horizontally`).toBeLessThanOrEqual(item.clientWidth + 1);
      check(item.scrollHeight, `${item.name} does not truncate vertically`).toBeLessThanOrEqual(item.clientHeight + 1);
    }
    if (item.cellLabel) {
      check(item.font, `${item.name} retains a readable tile label`).toBeGreaterThanOrEqual(8);
      check(item.textBox.left).toBeGreaterThanOrEqual(item.left - 1);
      check(item.textBox.right).toBeLessThanOrEqual(item.right + 1);
      check(item.textBox.top).toBeGreaterThanOrEqual(item.top - 1);
      check(item.textBox.bottom).toBeLessThanOrEqual(item.bottom + 1);
    }
  }
}

// Numeric geometry predicates are pure and produce named violations. One
// Playwright expectation records the result, instead of tracing ~1,000 tiny
// assertions per screen (the previous gate spent 116–143 seconds per round
// inside the geometry assertion blocks). Conditions remain unchanged.
export function matchingViewportViolations(geometry, requestedViewport, { minControls = 36 } = {}) {
  const violations = [], check = collectChecks(violations);
  const { viewport, controls, regions, text, artwork } = geometry;
  check({ width: viewport.width, height: viewport.height }, 'actual CSS viewport equals the requested test viewport').toEqual(requestedViewport);
  check(viewport.scrollX, 'fit is measured without horizontal scrolling').toBe(0);
  check(viewport.scrollY, 'fit is measured without vertical scrolling').toBe(0);
  check(geometry.document.width, 'document has no horizontal overflow').toBeLessThanOrEqual(viewport.width);
  check(geometry.document.height, 'document has no vertical overflow').toBeLessThanOrEqual(viewport.height);
  check(geometry.body.width, 'body has no horizontal overflow').toBeLessThanOrEqual(viewport.width);
  check(geometry.body.height, 'body has no vertical overflow').toBeLessThanOrEqual(viewport.height);
  const visibleBounds = viewport.visual ? {
    left: viewport.visual.offsetLeft, top: viewport.visual.offsetTop,
    right: viewport.visual.offsetLeft + viewport.visual.width,
    bottom: viewport.visual.offsetTop + viewport.visual.height,
  } : { left: 0, top: 0, right: viewport.width, bottom: viewport.height };
  check(controls.filter(control => control.cell !== null)).toHaveLength(25);
  check(controls.length, `at least ${minControls} required board controls`).toBeGreaterThanOrEqual(minControls);
  for (const box of [...controls, ...regions]) {
    check(box.hiddenBy, `${box.name} is not hidden by CSS, aria-hidden or inert`).toEqual([]);
    check(box.clippedBy, `${box.name} is not clipped by an ancestor`).toEqual([]);
    check(box.left, `${box.name} left edge`).toBeGreaterThanOrEqual(visibleBounds.left - .5);
    check(box.top, `${box.name} top edge`).toBeGreaterThanOrEqual(visibleBounds.top - .5);
    check(box.right, `${box.name} right edge`).toBeLessThanOrEqual(visibleBounds.right + .5);
    check(box.bottom, `${box.name} bottom edge`).toBeLessThanOrEqual(visibleBounds.bottom + .5);
    check(box.width, `${box.name} is rendered`).toBeGreaterThan(0);
    check(box.height, `${box.name} is rendered`).toBeGreaterThan(0);
    check(box.scrollWidth, `${box.name} has no concealed horizontal overflow`).toBeLessThanOrEqual(box.clientWidth + 1);
    check(box.scrollHeight, `${box.name} has no concealed vertical overflow`).toBeLessThanOrEqual(box.clientHeight + 1);
  }
  for (const control of controls) {
    check(control.width, `${control.name} target width`).toBeGreaterThanOrEqual(44);
    check(control.height, `${control.name} target height`).toBeGreaterThanOrEqual(44);
    check(control.hitTests.filter(hit => !hit.clear), `${control.name} has no overlaid or occluded hit area`).toEqual([]);
  }
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const a = regions[i], b = regions[j];
    const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    check(overlapWidth > 1 && overlapHeight > 1, `${a.name} and ${b.name} do not visually overlap`).toBe(false);
  }
  checkUnclippedText(text, check);
  for (const item of text) if (item.labelVariants !== undefined) violations.push(...matchingLabelVariantViolations(item, viewport.width));
  for (const item of text) {
    check(item.textBox.left, `${item.name} text stays in the viewport`).toBeGreaterThanOrEqual(visibleBounds.left - 1);
    check(item.textBox.right, `${item.name} text stays in the viewport`).toBeLessThanOrEqual(visibleBounds.right + 1);
    check(item.textBox.top, `${item.name} text stays in the viewport`).toBeGreaterThanOrEqual(visibleBounds.top - 1);
    check(item.textBox.bottom, `${item.name} text stays in the viewport`).toBeLessThanOrEqual(visibleBounds.bottom + 1);
  }
  for (const art of artwork) {
    check(art.hiddenBy, 'tile artwork is visibly rendered').toEqual([]);
    // The crop aperture intentionally clips only transparent source canvas.
    // Preserve that IMG diagnostic, but judge visible paint against the frame.
    if (!art.cropped) check(art.clippedBy, 'tile artwork is not clipped').toEqual([]);
    else violations.push(...matchingPaintedArtViolations(art));
    check(art.complete && art.naturalWidth > 0, 'real artwork loads').toBe(true);
    check(art.width, 'tile art keeps its existing minimum width').toBeGreaterThan(30);
    check(art.height, 'tile art keeps its existing minimum height').toBeGreaterThan(25);
  }
  return violations;
}

export async function assertMatchingViewportFit(page, info = null, name = 'fit', { controlNames = ['Undo', 'Cut', 'Hint', 'Collection', 'Envelopes', 'Fresh envelope', 'How to play'], supplyCount = 2, minControls = 36 } = {}) {
  await idle(page);
  await expect(page.locator('.cg-cell.is-pasted')).toHaveCount(0);
  await imagesReady(page.locator('.cg-board img'));
  const geometry = await matchingGeometry(page);
  if (info) await attachMatchingGeometry(page, info, name, geometry);
  const identities = [
    ...controlNames.map(name => ({ name, locator: page.getByRole('button', { name, exact: true }), count: 1 })),
    ...['.cg-header', '.cg-board', '.mg-supply', '.cg-tools', '.cg-footer', '.cg-postcard-button']
      .map(selector => ({ name: selector, locator: page.locator(selector), count: 1 })),
    { name: '.mg-supply button', locator: page.locator('.mg-supply button'), count: supplyCount },
  ];
  // Preserve toHaveCount's retry behavior and role-based visibility semantics.
  await expect.poll(async () => Promise.all(identities.map(async item => ({
    name: item.name, count: await item.locator.count(),
  }))), { message: 'all named controls and required regions remain present' })
    .toEqual(identities.map(({ name, count }) => ({ name, count })));
  expect(matchingViewportViolations(geometry, page.viewportSize(), { minControls }), `unclipped one-screen layout: ${name}`).toEqual([]);
  return geometry;
}

// Only the explicitly labelled accessibility/tiny-height fallback allows page
// scrolling. It still rejects hidden/clipped controls, horizontal overflow,
// smaller targets, and internal scrollboxes used to conceal the game.
export async function assertMatchingScrollableFallback(page, info, name, { minControls = 36 } = {}) {
  await idle(page);
  await expect(page.locator('.cg-cell.is-pasted')).toHaveCount(0);
  const initial = await matchingGeometry(page);
  await attachMatchingGeometry(page, info, `${name}-top`, initial);
  const violations = matchingFallbackViolations(initial, { minControls });
  for (let index = 0; index < initial.controls.length; index++) {
    const control = page.locator('.mg-page > .cg-shell button').nth(index);
    await expect(control).toBeVisible();
    await control.scrollIntoViewIfNeeded();
    const current = await matchingGeometry(page);
    const box = current.controls[index];
    violations.push(...matchingReachableControlViolations(box, current.viewport, current.document.width));
  }
  await attachMatchingGeometry(page, info, `${name}-bottom`, await matchingGeometry(page));
  expect(violations, `scrolling fallback remains fully reachable: ${name}`).toEqual([]);
}


export function matchingControlViolations(sizes) {
  const violations = [], check = collectChecks(violations);
  check(sizes.length).toBeGreaterThan(0);
  for (const control of sizes) {
    check(control.height, `${control.name} has a 44px target height`).toBeGreaterThanOrEqual(44);
    check(control.width, `${control.name} has a 44px target width`).toBeGreaterThanOrEqual(44);
  }
  return violations;
}
export function matchingArtViolations(tiles, width, names = NAMES) {
  const violations = [], check = collectChecks(violations);
  for (const tile of tiles) {
    check(tile.name, `${tile.id} has a visible short label at ${width}px`).toBeTruthy();
    check(tile.clipped, `${tile.id} label must not be truncated at ${width}px`).toBe(false);
    check(tile.font).toBeGreaterThanOrEqual(8);
    check(tile.accessibleName).toContain(names[tile.id]);
    check(tile.width).toBeGreaterThanOrEqual(44);
    check(tile.height).toBeGreaterThanOrEqual(44);
    check(tile.artWidth).toBeGreaterThan(30);
    check(tile.artHeight).toBeGreaterThan(25);
  }
  return violations;
}
export function matchingFallbackViolations(initial, { minControls = 36 } = {}) {
  const violations = [], check = collectChecks(violations);
  check(initial.controls.filter(control => control.cell !== null)).toHaveLength(25);
  check(initial.controls.length).toBeGreaterThanOrEqual(minControls);
  check(initial.document.width).toBeLessThanOrEqual(initial.viewport.width);
  check(initial.body.width).toBeLessThanOrEqual(initial.viewport.width);
  check(initial.document.height, 'this fixture genuinely exercises the scrolling fallback').toBeGreaterThan(initial.viewport.height);
  checkUnclippedText(initial.text, check);
  for (const item of initial.text) if (item.labelVariants !== undefined) violations.push(...matchingLabelVariantViolations(item, initial.viewport.width));
  for (const art of initial.artwork) if (art.cropped) violations.push(...matchingPaintedArtViolations(art, { allowPageScroll: true }));
  return violations;
}
export function matchingReachableControlViolations(box, viewport, documentWidth) {
  const violations = [], check = collectChecks(violations);
  check(box.hiddenBy, `${box.name} is not hidden in fallback`).toEqual([]);
  // The viewport legitimately clips scrolled-off elements, so inspect only
  // the control brought into view and reject any non-root clipping ancestor.
  check(box.clippedBy.filter(name => !['HTML', 'BODY'].includes(name)), `${box.name} stays reachable`).toEqual([]);
  check(box.width).toBeGreaterThanOrEqual(44);
  check(box.height).toBeGreaterThanOrEqual(44);
  check(box.left).toBeGreaterThanOrEqual(-.5);
  check(box.right).toBeLessThanOrEqual(viewport.width + .5);
  check(box.top).toBeGreaterThanOrEqual(-.5);
  check(box.bottom).toBeLessThanOrEqual(viewport.height + .5);
  check(box.hitTests.filter(hit => !hit.clear), `${box.name} can be reached without occlusion`).toEqual([]);
  check(documentWidth).toBeLessThanOrEqual(viewport.width);
  return violations;
}

// The IMG may be larger than its clipping aperture. Measure all three
// separately: allocated art slot, visible frame, and alpha>=16 painted bounds.
// This prevents a large transparent canvas from counting as large artwork.
export function matchingPaintedArtViolations(art, { allowPageScroll = false } = {}) {
  const violations = [], check = collectChecks(violations);
  check(Boolean(art.frame), `${art.name} has a visible art frame`).toBe(true);
  check(Boolean(art.allocated), `${art.name} has an allocated art slot`).toBe(true);
  check(Boolean(art.cellBounds), `${art.name} has a containing cell`).toBe(true);
  const validInk = Array.isArray(art.inkBounds) && art.inkBounds.length === 4 && art.inkBounds.every(Number.isFinite)
    && art.inkBounds[0] >= 0 && art.inkBounds[1] >= 0 && art.inkBounds[2] > 0 && art.inkBounds[3] > 0
    && art.inkBounds[0] + art.inkBounds[2] <= art.naturalWidth && art.inkBounds[1] + art.inkBounds[3] <= art.naturalHeight;
  check(validInk, `${art.name} ink bounds are valid source-pixel metadata`).toBe(true);
  check(Boolean(art.painted), `${art.name} has measurable painted bounds`).toBe(true);
  check(art.objectFit, `${art.name} source-to-render mapping has no hidden letterbox`).toBe('fill');
  check(art.hiddenBy, `${art.name} painted art remains visible`).toEqual([]);
  if (!art.frame || !art.allocated || !art.cellBounds || !validInk || !art.painted) return violations;
  const { frame, allocated, cellBounds, painted } = art;
  for (const [name, box] of [['frame', frame], ['allocated slot', allocated]]) {
    check(box.hiddenBy, `${art.name} ${name} remains visible`).toEqual([]);
    const clippedBy = allowPageScroll ? box.clippedBy.filter(name => !['HTML', 'BODY'].includes(name)) : box.clippedBy;
    check(clippedBy, `${art.name} ${name} is not clipped by other content`).toEqual([]);
    check(box.width, `${art.name} ${name} has visible width`).toBeGreaterThan(0);
    check(box.height, `${art.name} ${name} has visible height`).toBeGreaterThan(0);
  }
  check(allocated.width, `${art.name} allocated art keeps its existing minimum width`).toBeGreaterThan(30);
  check(allocated.height, `${art.name} allocated art keeps its existing minimum height`).toBeGreaterThan(25);
  check(painted.width, `${art.name} painted ink has visible width`).toBeGreaterThan(0);
  check(painted.height, `${art.name} painted ink has visible height`).toBeGreaterThan(0);
  check(Math.max(painted.width, painted.height), `${art.name} actual painted ink has a 30px long edge`).toBeGreaterThanOrEqual(30);
  for (const [name, box, container] of [
    ['frame in cell', frame, cellBounds], ['frame in slot', frame, allocated],
    ['paint in frame', painted, frame], ['paint in cell', painted, cellBounds],
  ]) {
    check(box.left, `${art.name} ${name}: left`).toBeGreaterThanOrEqual(container.left - 1);
    check(box.top, `${art.name} ${name}: top`).toBeGreaterThanOrEqual(container.top - 1);
    check(box.right, `${art.name} ${name}: right`).toBeLessThanOrEqual(container.right + 1);
    check(box.bottom, `${art.name} ${name}: bottom`).toBeLessThanOrEqual(container.bottom + 1);
  }
  check(Math.abs(art.width / art.naturalWidth - art.height / art.naturalHeight) * Math.max(art.naturalWidth, art.naturalHeight),
    `${art.name} source aspect ratio is preserved within one rendered pixel`).toBeLessThanOrEqual(1);
  return violations;
}

// The parent label's bounds/type checks remain in the normal text audit.
// Both CSS alternatives must exist, but exactly the width-appropriate one is
// visible; an intentionally hidden alternative is not missing interface text.
export function matchingLabelVariantViolations(label, width) {
  const violations = [], check = collectChecks(violations);
  const variants = label.labelVariants, active = variants.filter(variant => variant.active);
  check(variants.length, `${label.name} retains both label variants`).toBe(2);
  check(variants.filter(variant => variant.kind === 'wide').length, `${label.name} has one wide variant`).toBe(1);
  check(variants.filter(variant => variant.kind === 'compact').length, `${label.name} has one compact variant`).toBe(1);
  check(active.length, `${label.name} has exactly one active label variant`).toBe(1);
  for (const variant of active) {
    check(variant.kind, `${label.name} uses the correct CSS width variant`).toBe(width <= 380 ? 'compact' : 'wide');
    check(variant.text, `${label.name} active label has visible text`).toBeTruthy();
    check(label.name.trim(), `${label.name} is measured using visible innerText`).toBe(variant.text);
    check(variant.font, `${label.name} active label remains readable`).toBeGreaterThanOrEqual(8);
  }
  return violations;
}

// These deliberately mirror only the synchronous matcher operations used by
// the predicates above; they do not wrap or replace browser assertions.
function collectChecks(violations) {
  return (actual, name = 'layout predicate') => {
    const record = (passed, matcher, expected) => {
      if (!passed) violations.push({ check: name, matcher, actual, expected });
    };
    return {
      toBe: expected => record(Object.is(actual, expected), 'toBe', expected),
      not: { toBe: expected => record(!Object.is(actual, expected), 'not.toBe', expected) },
      toEqual: expected => record(isDeepStrictEqual(actual, expected), 'toEqual', expected),
      toHaveLength: expected => record(actual?.length === expected, 'toHaveLength', expected),
      toBeTruthy: () => record(Boolean(actual), 'toBeTruthy', true),
      toContain: expected => record(typeof actual === 'string' && actual.includes(expected), 'toContain', expected),
      toBeGreaterThan: expected => record(typeof actual === 'number' && actual > expected, 'toBeGreaterThan', expected),
      toBeGreaterThanOrEqual: expected => record(typeof actual === 'number' && actual >= expected, 'toBeGreaterThanOrEqual', expected),
      toBeLessThanOrEqual: expected => record(typeof actual === 'number' && actual <= expected, 'toBeLessThanOrEqual', expected),
    };
  };
}
