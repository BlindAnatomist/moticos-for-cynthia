import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import * as h from './helpers.mjs';
import {scenarioFor, failureState} from './scope.mjs';
import {C, E, V, fixture, buildArt} from './fixtures.mjs';
import {digest} from '../../stage-b-evidence/browser/proofs.mjs';
import {reloadStable} from '../../stage-b-evidence/browser/reload.mjs';
import {verifyPng} from '../../gate/png.mjs';
import {BOARD_ART_BOUNDS, COMPACT_BOARD_LABELS} from '../../src/career/boardArt.js';
import {postcardSubtitle, progressCue} from '../../src/career/feedback.js';

const scenario = scenarioFor(test);
const newFamilies = C.FAMILIES.slice(48);
const newChapters = C.CHAPTERS.slice(24);
const touchByPage = new WeakMap();
const startView = page => page.evaluate(() => window.__careerAudit.length);
const boardIds = page => page.locator('[data-career-cell]').evaluateAll(nodes => nodes.map(n => n.dataset.pieceId || null));
const sameResources = (actual, expected) => {
  for (const key of ['board', 'sources', 'material', 'xp', 'coinsEarned', 'coinsSpent', 'purchases', 'milestones', 'storyCompletions'])
    expect(actual[key], `Preserve ${key}`).toEqual(expected[key]);
};

test.beforeEach(async ({page, context}, info) => {
  touchByPage.set(page, Boolean(info.project.use.hasTouch));
  await h.instrumentation(context);
  await h.open(page);
});
test.afterEach(async ({page}, info) => {try {await h.audit(page);} catch(error) {await failureState(page,info,error,{phase:'afterEach-audit'});throw error;} finally {if(info.status!==info.expectedStatus)await failureState(page,info,info.error??Error('Setup or test failed'),{phase:'afterEach'});}});

// Every collection page records its actual DOM order. Old undiscovered artwork
// is intentionally absent, and is never promoted into a synthetic discovery.
async function collectionPage(page, state, expected, pageNumber, pageCount) {
  const cards = page.locator('[data-collection-piece-id]');
  await expect(cards).toHaveCount(expected.length);
  await expect(page.getByRole('navigation', {name: 'Collection pages'})).toContainText(`Page ${pageNumber} of ${pageCount}`);
  const dom = await cards.evaluateAll(nodes => nodes.map(n => ({
    id: n.dataset.collectionPieceId,
    disabled: n.disabled,
    label: n.getAttribute('aria-label'),
    text: n.querySelector('strong')?.textContent,
    imageCount: n.querySelectorAll('img').length,
    masked: n.querySelector('.career-undiscovered')?.textContent ?? null,
  })));
  expect(dom.map(row => row.id)).toEqual(expected);
  for (const row of dom) {
    const discovered = state.discoveries.includes(row.id), piece = C.CATALOG.pieceOf(row.id);
    expect(row.disabled).toBe(!discovered);
    expect(row.imageCount).toBe(discovered ? 1 : 0);
    expect(row.masked).toBe(discovered ? null : '?');
    expect(row.label).toContain(discovered ? ', collected' : ', not discovered');
    if (discovered) expect(row.text).toBe(piece.name);
    else expect(row.text).not.toBe(piece.name);
  }
  const images = (await h.imageProof(page)).filter(row => row.location === 'collection');
  expect(images.map(row => row.pieceId)).toEqual(expected.filter(id => state.discoveries.includes(id)));
  const art = buildArt();
  for (const image of images) {
    const sealed = art.find(row => row.id === image.pieceId);
    expect(sealed).toBeTruthy();
    expect(image.sha256).toBe(sealed.sha256);
    expect(image.bytes).toBe(sealed.bytes);
  }
  const previous = page.getByRole('button', {name: 'Previous pictures', exact: true});
  const next = page.getByRole('button', {name: 'Next pictures', exact: true});
  expect(await previous.isEnabled()).toBe(pageNumber > 1);
  expect(await next.isEnabled()).toBe(pageNumber < pageCount);
  return {page: pageNumber, pageCount, dom, images};
}

scenario('C06 Navigate the expanded collection without save writes', async ({page}, info) => {
  const state = fixture('all-new-discovered');
  await h.seedStable(page, state);
  expect(newFamilies).toHaveLength(8);
  expect(newFamilies.flatMap(f => f.pieceIds).every(id => state.discoveries.includes(id))).toBe(true);
  const oldUndiscovered = C.CATALOG.PIECES.slice(0, 240).filter(p => !state.discoveries.includes(p.id)).map(p => p.id);
  expect(oldUndiscovered.length).toBeGreaterThan(0);
  const saved = await h.bytes(page), writeStart = await startView(page);
  await h.panel(page, 'collection', touchByPage.get(page));
  const volume = page.getByRole('combobox', {name: 'Collection volume', exact: true});
  const chapter = page.getByRole('combobox', {name: 'Collection chapter', exact: true});
  const family = page.getByRole('combobox', {name: 'Picture family', exact: true});
  await volume.selectOption('all');
  const allIds = C.CATALOG.PIECES.map(p => p.id), pages = [], scopes = [], filters = [];
  expect(allIds).toHaveLength(280);
  for (let n = 0; n < 14; n++) {
    pages.push(await collectionPage(page, state, allIds.slice(n * 20, n * 20 + 20), n + 1, 14));
    if (n === 0) await h.shot(page, info, 'C06-page-first.png');
    if (n === 13) await h.shot(page, info, 'C06-page-last.png');
    else await page.getByRole('button', {name: 'Next pictures', exact: true}).click();
  }
  const seen = pages.flatMap(row => row.dom.map(card => card.id));
  expect(seen).toEqual(allIds);
  expect(new Set(seen).size).toBe(280);
  await page.getByRole('button', {name: 'Previous pictures', exact: true}).click();
  const back = await collectionPage(page, state, allIds.slice(240, 260), 13, 14);
  await page.getByRole('button', {name: 'Next pictures', exact: true}).click();
  expect(await page.getByRole('navigation', {name: 'Collection pages'}).innerText()).toContain('Page 14 of 14');
  expect(V.VOLUMES.map(v => v.pieceIds.length)).toEqual([160, 40, 40, 40]);
  for (const scope of V.VOLUMES) {
    await volume.selectOption(scope.id);
    await expect(chapter).toHaveValue('all');
    await expect(family).toHaveValue('all');
    const count = Math.ceil(scope.pieceIds.length / 20), rows = [];
    await expect(page.locator('.career-volume-collection > h3')).toHaveText(`${scope.title} · ${scope.pieceIds.filter(id => state.discoveries.includes(id)).length}/${scope.pieceIds.length} collected`);
    for (let n = 0; n < count; n++) {
      rows.push(await collectionPage(page, state, scope.pieceIds.slice(n * 20, n * 20 + 20), n + 1, count));
      if (n + 1 < count) await page.getByRole('button', {name: 'Next pictures', exact: true}).click();
    }
    expect(rows.flatMap(row => row.dom.map(card => card.id))).toEqual(scope.pieceIds);
    scopes.push({id: scope.id, count: scope.pieceIds.length, pages: rows});
  }
  await volume.selectOption('all');
  await page.getByRole('button', {name: 'Next pictures', exact: true}).click();
  for (const c of newChapters) {
    await chapter.selectOption(c.id);
    await expect(family).toHaveValue('all');
    const families = newFamilies.filter(f => C.CONTENT_PACKS[7].sourceRules.find(r => r.id === f.id)?.chapterId === c.id);
    expect(families).toHaveLength(2);
    const ids = families.flatMap(f => f.pieceIds);
    expect(ids).toHaveLength(10);
    const chapterPage = await collectionPage(page, state, ids, 1, 1), familyPages = [];
    await expect(page.locator('.career-volume-collection > h3')).toHaveText(`${c.title} · 10/10 collected`);
    for (const f of families) {
      await family.selectOption(f.id);
      familyPages.push({id: f.id, ...await collectionPage(page, state, f.pieceIds, 1, 1)});
      await expect(page.locator('.career-volume-collection > h3')).toHaveText(`${f.shortName} · 5/5 collected`);
    }
    filters.push({chapter: c.id, chapterPage, familyPages});
  }
  await volume.selectOption(V.VOLUMES[0].id);
  await expect(chapter).toHaveValue('all');
  await expect(family).toHaveValue('all');
  const reset = await collectionPage(page, state, V.VOLUMES[0].pieceIds.slice(0, 20), 1, 8);
  await h.close(page, touchByPage.get(page));
  expect(await h.bytes(page)).toBe(saved);
  const writes = await h.noViewWrites(page, writeStart);
  await h.record(info, {fixture: 'all-new-discovered', oldUndiscovered, pages, scopes, filters, back, reset, writes});
});

// The mirror selects a legal gesture only. Each native result is then checked
// against the rendered board; replay state is never injected into the browser.
async function playReplay(page, letterId, version, touch) {
  let mirror = E.createReplay(letterId, 'stage-c-replay-mirror', version);
  const order = mirror.orders[0], template = C.orderTemplate(letterId, version, 'story');
  expect(order.contentVersion).toBe(version);
  expect(order.requirements).toEqual(template.requirements);
  await expect(page.locator('.career-shell')).toHaveAttribute('data-save-status', 'replay');
  await expect(page.locator('.career-practice-banner strong')).toHaveText('Isolated letter practice · 0 XP · 0 coins');
  await expect.poll(() => boardIds(page)).toEqual(mirror.board.map(t => t?.pieceId ?? null));
  const compact = await h.compact(page);
  const targets = compact ? page.locator('.career-mobile-target') : page.locator('.career-order-list .career-target');
  const targetProof = await targets.evaluateAll(nodes => nodes.map(node => ({id: node.dataset.targetPieceId ?? null, name: node.querySelector('strong')?.textContent, count: node.querySelector('small')?.textContent, text: node.textContent})));
  expect(targetProof.map(row => row.name)).toEqual(template.requirements.map(r => {
    const p = C.CATALOG.pieceOf(r.pieceId); return compact ? p.shortName : p.name;
  }));
  if (compact) expect(targetProof.map(row => row.id)).toEqual(template.requirements.map(r => r.pieceId));
  for (const [index, requirement] of template.requirements.entries()) expect(targetProof[index].text).toContain(`/${requirement.quantity}`);
  const actions = [];
  while (mirror.orders.length) {
    const hint = E.goalHint(mirror), before = mirror;
    let action;
    if (hint.kind === 'send') {
      action = {type: 'complete', orderId: order.id, tileIds: E.matchingTiles(mirror, order)};
      await h.press(h.sendControl(page), touch);
    } else if (hint.kind === 'merge') {
      const [from, to] = hint.pair;
      action = {type: 'move', from, to, tileId: mirror.board[from].id, targetTileId: mirror.board[to].id};
      await h.press(page.locator(`[data-career-cell="${from}"]`), touch);
      await expect(page.locator(`[data-career-cell="${from}"]`)).toHaveAttribute('aria-pressed', 'true');
      await h.press(page.locator(`[data-career-cell="${to}"]`), touch);
    } else if (hint.kind === 'supply') {
      action = {type: 'supply', familyId: hint.familyId};
      await h.press(page.locator(`.career-producer.${hint.familyId} .career-supply`), touch);
    } else if (hint.kind === 'cut') {
      action = {type: 'cut', at: hint.at, tileId: mirror.board[hint.at].id};
      await h.press(page.locator(`[data-career-cell="${hint.at}"]`), touch);
      await h.press(page.getByRole('button', {name: 'Cut', exact: true}), touch);
    } else throw Error(`Unexpected replay gesture ${hint.kind}`);
    const reduced = E.reduceCareer(before, E.commandFor(before, action));
    expect(reduced.ok).toBe(true);
    mirror = reduced.state;
    await expect(page.locator('.career-board')).toHaveAttribute('aria-busy', 'false');
    await expect.poll(() => boardIds(page)).toEqual(mirror.board.map(t => t?.pieceId ?? null));
    actions.push({type: action.type, familyId: action.familyId, from: action.from, to: action.to, board: mirror.board.map(t => t?.pieceId ?? null)});
    expect(actions.length).toBeLessThan(100);
  }
  await expect(page.locator('.career-postmark small')).toHaveText('0 XP · 0 coins');
  await expect(page.locator('.career-status-long')).toContainText('Practice letter complete. 0 XP and 0 coins; your career is unchanged.');
  expect(mirror.receipts.at(-1)).toMatchObject({type: 'practice', contentVersion: version, xp: 0, coins: 0});
  return {letterId, contentVersion: version, requirements: template.requirements, targetProof, actions, receipt: mirror.receipts.at(-1)};
}

scenario('C07 Retain four endings and isolate historical/new replay', async ({page}, info) => {
  const state = fixture('completed280');
  await h.seedStable(page, state);
  const saved = await h.bytes(page), writeStart = await startView(page), touch = touchByPage.get(page);
  const endings = [];
  await h.panel(page, 'letters', touch);
  for (const [chapterId, name] of [
    ['sound-advice', 'C07-original-ending.png'], ['short-measure', 'C07-stage-a-ending.png'],
    ['paper-duet', 'C07-stage-b-ending.png'], ['next-move', 'C07-stage-c-ending.png'],
  ]) {
    await page.getByRole('combobox', {name: 'Chapter', exact: true}).selectOption(chapterId);
    const ending = page.getByRole('dialog').locator('.career-chapter-ending');
    await expect(ending).toHaveText(C.CHAPTER_COPY[chapterId].ending);
    await ending.scrollIntoViewIfNeeded();
    await expect(ending).toBeInViewport({ratio: 1});
    await h.shot(page, info, name);
    endings.push({chapterId, text: await ending.innerText(), savedChapter: (await h.read(page)).chapterId});
    expect(await h.bytes(page)).toBe(saved);
  }
  await expect(page.getByRole('dialog')).toContainText(V.VOLUMES[3].completionCopy);
  expect(V.VOLUMES[3].completionCopy).toContain('280-picture checkpoint on the way to 320');
  expect(E.canStartNextChapter(state)).toBe(false);
  expect(E.canEnterContinuation(state)).toBe(false);
  await expect(page.getByRole('button', {name: /^(Begin |Open the next four correspondences|Open the next chapter)/})).toHaveCount(0);
  await h.close(page, touch);
  const replays = [];
  for (const [letterId, version] of [['short-measure-letter-6', 5], ['paper-duet-letter-6', 6], ['next-move-letter-5', 7]]) {
    expect(state.storyCompletions[letterId]).toEqual({contentVersion: version});
    const chapter = C.CHAPTERS.find(c => c.storyIds.includes(letterId));
    const beforeReplay = await h.bytes(page);
    await h.panel(page, 'letters', touch);
    await page.getByRole('combobox', {name: 'Chapter', exact: true}).selectOption(chapter.id);
    const article = page.locator('.career-letter-list > article').nth(chapter.storyIds.indexOf(letterId));
    await h.press(article.getByRole('button', {name: /^Practice/}), touch);
    const result = await playReplay(page, letterId, version, touch);
    expect(await h.bytes(page)).toBe(beforeReplay);
    await h.press(await h.compact(page) ? page.locator('.career-mobile-return') : page.getByRole('button', {name: 'Return to career', exact: true}), touch);
    await expect(page.locator('.career-shell')).toHaveAttribute('data-save-status', 'saved');
    expect(await h.bytes(page)).toBe(beforeReplay);
    expect(await h.read(page)).toEqual(state);
    replays.push({...result, persistentBytesBefore: digest(beforeReplay), persistentBytesAfterReturn: digest(await h.bytes(page))});
  }
  const writes = await h.noViewWrites(page, writeStart);
  await reloadStable(page);
  expect(await h.bytes(page)).toBe(saved);
  await h.record(info, {fixture: 'completed280', endings, replays, writes, completionCopy: V.VOLUMES[3].completionCopy});
});

async function decodedDownload(page, bytes) {
  return page.evaluate(async encoded => {
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
    try {
      const image = new Image(); image.src = url; await image.decode();
      return {complete: image.complete, width: image.naturalWidth, height: image.naturalHeight};
    } finally { URL.revokeObjectURL(url); }
  }, bytes.toString('base64'));
}

scenario('C08 Inspect eleven exact postcards and download real PNGs', async ({page, context}, info) => {
  const outputs = [...newFamilies.map(f => f.pieceIds[4]), 'c280-wc1', 'c280-wc2', 'c280-wc3'];
  expect(outputs).toHaveLength(11);
  const exports = [], discovery = [], probe = await context.newPage();
  await probe.goto('/stage-c-probe/index.html');
  try {
    for (const pieceId of outputs) {
      const piece = C.CATALOG.pieceOf(pieceId), tier5 = piece.tier === 5;
      let companionId = null;
      if (tier5) {
        const before = fixture(`postcard-${pieceId}-before`), after = fixture(`postcard-${pieceId}-after`);
        const chapterId = C.CONTENT_PACKS[7].sourceRules.find(rule => rule.id === piece.familyId).chapterId;
        const companion = newFamilies.find(f => f.id !== piece.familyId && C.CONTENT_PACKS[7].sourceRules.find(rule => rule.id === f.id)?.chapterId === chapterId).pieceIds[4];
        companionId = companion;
        expect(before.discoveries).not.toContain(pieceId);
        expect(before.discoveries).not.toContain(companion);
        expect(after.discoveries).toContain(pieceId);
        expect(after.discoveries).not.toContain(companion);
        expect(E.chapterComplete(before, chapterId)).toBe(false);
        expect(E.chapterComplete(after, chapterId)).toBe(false);
        for (const key of ['xp', 'coinsEarned', 'coinsSpent', 'milestones', 'storyCompletions', 'receipts']) expect(after[key]).toEqual(before[key]);
        for (const family of C.FAMILIES) expect(after.material[family.id].delivered).toBe(before.material[family.id].delivered);
        await h.seedStable(page, before);
        const beforeSaved = await h.bytes(page), beforeWrites = await startView(page);
        await h.panel(page, 'collection', touchByPage.get(page));
        await h.revealCollectionPiece(page, pieceId);
        await expect(h.collectionPiece(page, pieceId)).toBeDisabled();
        await expect(h.collectionPiece(page, pieceId).locator('img')).toHaveCount(0);
        await expect(page.locator('.career-postscript-note')).toHaveCount(0);
        await h.revealCollectionPiece(page, companion);
        await expect(h.collectionPiece(page, companion)).toBeDisabled();
        await h.close(page, touchByPage.get(page));
        expect(await h.bytes(page)).toBe(beforeSaved);
        const writes = await h.noViewWrites(page, beforeWrites);
        discovery.push({pieceId, companion, chapterId, beforeFixture: `postcard-${pieceId}-before`, afterFixture: `postcard-${pieceId}-after`, chapterComplete: false, rewardsUnchanged: true, deliveredMaterialUnchanged: true, writes});
        await h.seedStable(page, after);
      } else await h.seedStable(page, fixture('all-new-discovered'));
      const saved = await h.bytes(page), writeStart = await startView(page);
      await h.panel(page, 'collection', touchByPage.get(page));
      if (companionId) {
        await h.revealCollectionPiece(page, companionId);
        await expect(h.collectionPiece(page, companionId)).toBeDisabled();
        await expect(h.collectionPiece(page, companionId).locator('img')).toHaveCount(0);
      }
      await h.revealCollectionPiece(page, pieceId);
      await expect(h.collectionPiece(page, pieceId)).toBeEnabled();
      await h.collectionPiece(page, pieceId).click();
      await expect(page.getByRole('heading', {name: piece.name, exact: true})).toBeVisible();
      await expect(page.locator('.career-postcard figcaption')).toContainText(piece.name);
      await expect(page.locator('.career-postcard figcaption small')).toHaveText(`MOTICOS · ${postcardSubtitle(pieceId).toUpperCase()}`);
      await expect(page.locator('.career-postcard img')).toHaveAttribute('alt', piece.description ?? piece.name);
      if (tier5) {
        const own = C.POSTCARD_POSTSCRIPTS.find(card => card.pieceId === pieceId);
        expect(own).toBeTruthy();
        await expect(page.locator('.career-postscript-note')).toHaveText(own.reverse);
      } else await expect(page.locator('.career-postscript-note')).toHaveCount(0);
      const readiness = await h.captureImageReadiness(page), images = (await h.imageProof(page)).filter(row => row.location === 'postcard');
      expect(images.map(row => row.pieceId)).toEqual([pieceId]);
      expect(images[0].natural).toEqual(BOARD_ART_BOUNDS[pieceId].source);
      const button = page.getByRole('button', {name: 'Download postcard', exact: true});
      await expect(button).toBeEnabled();
      const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
      expect(await download.failure()).toBe(null);
      const suggestedFilename = download.suggestedFilename();
      expect(suggestedFilename).toBe(`moticos-${piece.name.toLowerCase().replaceAll(' ', '-')}.png`);
      const filename = `${pieceId}.png`, path = info.outputPath(filename);
      fs.mkdirSync(info.outputDir, {recursive: true});
      expect(fs.existsSync(path)).toBe(false);
      await download.saveAs(path);
      const bytes = fs.readFileSync(path), png = verifyPng(bytes, [1536, 1120]);
      const decoded = await decodedDownload(page, bytes);
      expect(decoded).toEqual({complete: true, width: 1536, height: 1120});
      const sha256 = digest(bytes), parity = await probe.evaluate(id => window.stageCProbe.compare(id), pieceId);
      expect(parity.byteEqual).toBe(true);
      expect(parity.sameBlob).toBe(true);
      expect(parity.sameFilename).toBe(true);
      expect(parity.hashes).toEqual([sha256, sha256, sha256]);
      expect(parity.subtitle).toBe(postcardSubtitle(pieceId));
      expect(parity.dimensions).toEqual([1536, 1120]);
      expect(parity.filename).toBe(suggestedFilename);
      await h.close(page, touchByPage.get(page));
      expect(await h.bytes(page)).toBe(saved);
      const writes = await h.noViewWrites(page, writeStart);
      exports.push({pieceId, filename, suggestedFilename, bytes: bytes.length, sha256, dimensions: [1536, 1120], decoded, png, readiness, images, parity, writes});
      // Keep the actual downloads and a partial journal if a later card fails.
      fs.writeFileSync(info.outputPath('postcard-download-journal.json'), JSON.stringify({caseId: 'C08', exports}, null, 2));
    }
  } finally { await probe.close(); }
  expect(exports.map(row => row.pieceId)).toEqual(outputs);
  await h.record(info, {exports, discovery, visualAcceptance: 'Pending independent review of all actual exported compositions, margins, texture and openings; PNG validity is not visual acceptance.'});
});

async function sourceControls(page, state) {
  const producers = page.locator('.career-producer');
  await expect(producers).toHaveCount(2);
  const rows = [];
  for (const [index, familyId] of state.activeSourceIds.entries()) {
    const family = C.FAMILIES.find(f => f.id === familyId), expected = E.nextOutput(state, familyId);
    const producer = producers.nth(index), control = producer.locator('.career-supply');
    await expect(producer).toHaveClass(new RegExp(`(^| )${familyId}( |$)`));
    await expect(control).toHaveAttribute('aria-label', `Add free ${family.shortName} supply: next ${expected.name}, level ${expected.tier}`);
    await expect(control.locator('img')).toHaveAttribute('alt', '');
    await expect.poll(() => control.locator('img').evaluate(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)).toBe(true);
    await control.locator('img').evaluate(img => img.decode());
    const row = await control.evaluate(button => {
      const img = button.querySelector('img'), preview = button.querySelector('.career-source-art');
      const box = el => { const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom}; };
      return {label: button.getAttribute('aria-label'), alt: img.alt, src: img.currentSrc, complete: img.complete, natural: [img.naturalWidth, img.naturalHeight], preview: box(preview), image: box(img), control: box(button)};
    });
    expect(row.complete).toBe(true);
    expect(row.natural.every(n => n > 0)).toBe(true);
    // This is the inherited source-thumbnail contract, separate from board ink.
    expect(row.preview.width).toBeGreaterThanOrEqual(20);
    expect(row.preview.height).toBeGreaterThanOrEqual(20);
    expect(row.image.width).toBeGreaterThanOrEqual(20);
    expect(row.image.height).toBeGreaterThanOrEqual(20);
    expect(row.control.width).toBeGreaterThanOrEqual(44);
    expect(row.control.height).toBeGreaterThanOrEqual(44);
    const response = await page.request.get(row.src);
    expect(response.ok()).toBe(true);
    const bytes = await response.body(), expectedArt = buildArt().find(a => a.id === expected.id);
    expect(digest(bytes)).toBe(expectedArt.sha256);
    rows.push({familyId, pieceId: expected.id, sorter: state.sources[familyId], ...row, sha256: digest(bytes)});
  }
  return rows;
}

async function boardLabels(page, state, large) {
  const labels = await page.locator('.career-cell.has-piece').evaluateAll(nodes => nodes.map(cell => {
    const selector = document.querySelector('.career-shell').classList.contains('is-large-text') ? '.career-cell-name-full' : '.career-cell-name-compact';
    const label = cell.querySelector(selector), box = el => { const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom}; };
    const range = document.createRange(); range.selectNodeContents(label);
    return {at: Number(cell.dataset.careerCell), pieceId: cell.dataset.pieceId, ariaLabel: cell.getAttribute('aria-label'), text: label.textContent, displayed: label.getClientRects().length > 0 && getComputedStyle(label).visibility === 'visible', fontSize: parseFloat(getComputedStyle(label).fontSize), cell: box(cell), label: box(label), rectangles: [...range.getClientRects()].map(r => ({x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height}))};
  }));
  expect(labels).toHaveLength(20);
  for (const row of labels) {
    const piece = C.CATALOG.pieceOf(state.board[row.at].pieceId);
    expect(row.pieceId).toBe(piece.id);
    expect(row.text).toBe(large ? piece.shortName : COMPACT_BOARD_LABELS[piece.id] ?? piece.shortName);
    expect(row.ariaLabel).toContain(`${piece.name},`);
    expect(row.displayed).toBe(true);
    expect(row.fontSize).toBeGreaterThan(0);
    expect(row.rectangles.length).toBeGreaterThan(0);
    for (const rect of row.rectangles) {
      expect(rect.width).toBeGreaterThan(0); expect(rect.height).toBeGreaterThan(0);
      expect(rect.x).toBeGreaterThanOrEqual(row.cell.x - 1);
      expect(rect.right).toBeLessThanOrEqual(row.cell.right + 1);
      expect(rect.y).toBeGreaterThanOrEqual(row.cell.y - 1);
      expect(rect.bottom).toBeLessThanOrEqual(row.cell.bottom + 1);
    }
  }
  return labels;
}

async function setLargeText(page, large) {
  const before = await h.read(page);
  if (before.largeText === large) return before;
  await h.panel(page, 'help', touchByPage.get(page));
  const after = await h.changed(page, before, () => page.getByRole('button', {name: large ? 'Use larger text' : 'Use standard text', exact: true}).click());
  await h.close(page, touchByPage.get(page));
  expect(after.largeText).toBe(large);
  sameResources(after, before);
  return after;
}

scenario('C09 Measure occupied phone layouts and long completion labels', async ({page}, info) => {
  const expectedIds = [...newFamilies.map(f => f.pieceIds[2]), 'b1', 'b2', 'f1', 'f2', 'k1', 'k2', 'm1', 'm2', 'b1', 'b1', 'b1', 'b1'];
  const layouts = [];
  for (const [fixtureName, sizes] of [
    ['occupied-pre-final', [[320, 568], [390, 664], [390, 844], [430, 932]]],
    ['occupied-completed', [[320, 568]]],
  ]) {
    await h.seedStable(page, fixture(fixtureName));
    const initial = await h.read(page);
    expect(initial.board.filter(Boolean).map(t => t.pieceId).sort()).toEqual([...expectedIds].sort());
    expect(newFamilies.every(f => initial.unlockedSources.includes(f.id))).toBe(true);
    expect(E.chapterComplete(initial, 'next-move')).toBe(fixtureName === 'occupied-completed');
    for (const large of [false, true]) {
      await setLargeText(page, large);
      for (const [width, height] of sizes) {
        await page.setViewportSize({width, height});
        await page.evaluate(() => scrollTo(0, 0));
        const state = await h.read(page), saved = await h.bytes(page), writeStart = await startView(page);
        await expect(page.locator('[data-career-cell]')).toHaveCount(25);
        const readiness = await h.captureImageReadiness(page);
        expect(readiness.ready).toBe(true); expect(readiness.missing).toEqual([]);
        expect(readiness.images.filter(i => i.cell !== null).map(i => i.pieceId).sort()).toEqual([...expectedIds].sort());
        const geometry = await h.noOverflow(page, large ? {mode: 'large-text'} : {touch: true});
        const hud = await h.hudReadability(page), images = await h.imageProof(page), labels = await boardLabels(page, state, large), sources = await sourceControls(page, state);
        await expect(page.locator('.career-mobile-coins strong')).toHaveText(String(C.coinBalance(state)));
        await expect(page.locator('.career-mobile-orders-button span')).toHaveText(`Orders ${state.orders.length}`);
        await expect(page.locator('.career-mobile-more-button span')).toHaveText('More');
        for (const name of ['Undo', 'Cut', 'Recycle', 'Hint', 'Sources']) await expect(page.getByRole('button', {name, exact: true})).toBeVisible();
        const glyphs = await page.locator('.career-mobile-hud svg').evaluateAll(nodes => nodes.map(svg => {
          const r = svg.getBoundingClientRect(), parent = svg.parentElement.getBoundingClientRect();
          return {width: r.width, height: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom, visible: getComputedStyle(svg).visibility === 'visible', parent: {x: parent.x, y: parent.y, right: parent.right, bottom: parent.bottom}};
        }));
        expect(glyphs).toHaveLength(3);
        for (const glyph of glyphs) {
          expect(glyph.visible).toBe(true); expect(glyph.width).toBeGreaterThan(0); expect(glyph.height).toBeGreaterThan(0);
          expect(glyph.x).toBeGreaterThanOrEqual(glyph.parent.x - 1); expect(glyph.right).toBeLessThanOrEqual(glyph.parent.right + 1);
          expect(glyph.y).toBeGreaterThanOrEqual(glyph.parent.y - 1); expect(glyph.bottom).toBeLessThanOrEqual(glyph.parent.bottom + 1);
        }
        const focused = state.orders.find(o => o.id === state.focusedOrderId);
        if (focused?.origin === 'story' && focused.xp === 0) {
          await expect(page.locator('.career-mobile-order-reward')).toContainText('0 XP');
          await expect(page.locator('.career-mobile-order-details')).toHaveAttribute('aria-label', /0 XP/);
        }
        await expect(page.locator('.career-mobile-progress-button strong')).toHaveText(progressCue(state).heading);
        const name = `C09-${fixtureName === 'occupied-completed' ? 'ending-' : ''}${width}x${height}-${large ? 'large' : 'normal'}.png`;
        await page.evaluate(() => scrollTo(0, 0));
        const screenshot = await h.shot(page, info, name);
        expect(await h.bytes(page)).toBe(saved);
        const writes = await h.noViewWrites(page, writeStart);
        layouts.push({fixture: fixtureName, width, height, large, readiness, geometry, hud, glyphs, images, labels, sources, screenshot, writes});
      }
    }
  }
  expect(layouts).toHaveLength(10);
  await h.record(info, {expectedOccupiedPieceIds: expectedIds, layouts});
});

async function modalRoundtrip(page, kind, open, returned) {
  const saved = await h.bytes(page), writeStart = await startView(page), rounds = [];
  for (let round = 0; round < 2; round++) {
    await returned.focus();
    const pageScrollBefore = await page.evaluate(() => ({x: scrollX, y: scrollY}));
    await open();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    await expect(dialog).toBeVisible();
    const first = dialog.getByRole('button', {name: 'Close and return to board', exact: true});
    await first.focus();
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    const lastFocus = await page.evaluate(() => document.activeElement?.textContent);
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    const scroll = await dialog.evaluate(el => { const before = el.scrollTop; el.scrollTo(0, el.scrollHeight); return {before, after: el.scrollTop, maximum: el.scrollHeight - el.clientHeight}; });
    expect(scroll.after).toBeGreaterThanOrEqual(0);
    if (scroll.maximum > 0) expect(scroll.after).toBeGreaterThan(0);
    if (round === 0) await page.keyboard.press('Escape');
    else await h.close(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(returned).toBeFocused();
    const overlay = await page.evaluate(() => ({open: document.querySelectorAll('dialog[open]').length, modal: document.querySelectorAll(':modal').length}));
    expect(overlay).toEqual({open: 0, modal: 0});
    await expect(page.locator('.career-board')).toHaveAttribute('aria-busy', 'false');
    expect(await h.bytes(page)).toBe(saved);
    const pageScrollAfter = await page.evaluate(() => ({x: scrollX, y: scrollY}));
    expect(pageScrollAfter).toEqual(pageScrollBefore);
    rounds.push({round, lastFocus, scroll, overlay, pageScrollBefore, pageScrollAfter});
  }
  const writes = await h.noViewWrites(page, writeStart);
  return {kind, rounds, writes};
}

scenario('C10 Use all eight sources with Cut/Undo and earned-sorter callbacks', async ({page}, info) => {
  await page.setViewportSize({width: 390, height: 664});
  await h.seedStable(page, fixture('source-stock'));
  const touch = touchByPage.get(page), pairs = [], families = [];
  const screenshotNames = ['C10-crab-snail-sources.png', 'C10-can-trowel-sources.png', 'C10-iron-mitten-sources.png', 'C10-knight-cogwheel-sources.png'];
  for (let pair = 0; pair < 4; pair++) {
    const current = newFamilies.slice(pair * 2, pair * 2 + 2);
    for (const [slot, family] of current.entries()) await h.selectSource(page, family.id, slot, touch);
    const selected = await h.read(page);
    expect(selected.activeSourceIds).toEqual(current.map(f => f.id));
    for (const f of current) {
      const before = await h.read(page);
      expect(before.sources[f.id]).toEqual({sorter: 0, cursor: 0});
      expect(C.UPGRADES.filter(u => u.familyId === f.id)).toEqual([]);
      const previews = await sourceControls(page, before);
      const [drawn, tileId] = await h.draw(page, f.id, {basic: true, touch});
      expect(drawn.board.find(t => t?.id === tileId)?.pieceId).toBe(f.pieceIds[0]);
      expect(drawn.material[f.id].generated).toBe(before.material[f.id].generated + 1);
      expect(drawn.sources).toEqual(before.sources);
      const drawnImages = await h.imageProof(page);
      expect(drawnImages.some(i => i.location === 'board' && i.pieceId === f.pieceIds[0])).toBe(true);
      const restored = await h.undo(page, touch);
      sameResources(restored, before);
      const at = restored.board.findIndex(t => t?.pieceId === f.pieceIds[2]);
      expect(at).toBeGreaterThanOrEqual(0);
      await h.press(page.locator(`[data-career-cell="${at}"]`), touch);
      const cut = await h.changed(page, restored, () => h.press(page.getByRole('button', {name: 'Cut', exact: true}), touch));
      expect(cut.board.filter(t => t?.pieceId === f.pieceIds[1])).toHaveLength(before.board.filter(t => t?.pieceId === f.pieceIds[1]).length + 2);
      expect(cut.material).toEqual(before.material);
      expect(cut.sources).toEqual(before.sources);
      expect(cut.xp).toBe(before.xp);
      const cutImages = await h.imageProof(page), undone = await h.undo(page, touch);
      sameResources(undone, before);
      families.push({familyId: f.id, previews, drawnImages, cutImages, before, restored: undone});
    }
    await page.keyboard.press('Escape');
    const state = await h.read(page), sources = await sourceControls(page, state), screenshot = await h.shot(page, info, screenshotNames[pair]);
    pairs.push({families: current.map(f => f.id), sources, screenshot});
  }
  const sorters = [];
  for (const familyId of ['fern', 'key']) for (const cursor of [0, 1, 2]) {
    const fixtureName = `sorter-${familyId}-${cursor}`;
    await h.seedStable(page, fixture(fixtureName));
    const before = await h.read(page), f = C.FAMILIES.find(f => f.id === familyId);
    expect(before.sources[familyId]).toEqual({sorter: 1, cursor});
    expect(before.purchases[`${familyId}-sorter`]).toBeTruthy();
    expect(before.activeSourceIds).toContain(familyId);
    const preview = await sourceControls(page, before), expected = E.nextOutput(before, familyId);
    expect(expected.tier).toBe([1, 1, 2][cursor]);
    const [basic, basicId] = await h.draw(page, familyId, {basic: true, touch});
    expect(basic.board.find(t => t?.id === basicId)?.pieceId).toBe(f.pieceIds[0]);
    expect(basic.sources[familyId]).toEqual(before.sources[familyId]);
    sameResources(await h.undo(page, touch), before);
    const [drawn, drawnId] = await h.draw(page, familyId, {touch});
    expect(drawn.board.find(t => t?.id === drawnId)?.pieceId).toBe(expected.id);
    expect(drawn.sources[familyId].cursor).toBe((cursor + 1) % 3);
    const advanced = await sourceControls(page, drawn);
    sameResources(await h.undo(page, touch), before);
    sorters.push({fixture: fixtureName, familyId, cursor, preview, basicPieceId: f.pieceIds[0], outputPieceId: expected.id, advanced});
  }
  await h.seedStable(page, fixture('source-stock'));
  const sources = page.locator('.career-source-picker'), orders = page.locator('.career-mobile-orders-button');
  const modals = [
    await modalRoundtrip(page, 'Sources', () => sources.click(), sources),
    await modalRoundtrip(page, 'Orders', () => orders.click(), orders),
  ];
  const state = await h.read(page), at = state.board.findIndex(Boolean), selectedPiece = C.CATALOG.pieceOf(state.board[at].pieceId);
  await page.locator(`[data-career-cell="${at}"]`).click();
  const more = page.locator('.career-mobile-more-button');
  modals.push(await modalRoundtrip(page, 'Postcard', async () => {
    await more.click();
    await page.getByRole('dialog').getByRole('button', {name: 'View selected art', exact: true}).click();
    await expect(page.getByRole('heading', {name: selectedPiece.name, exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Download postcard', exact: true})).toBeEnabled();
    await h.captureImageReadiness(page);
  }, more));
  expect(await h.read(page)).toEqual(state);
  await h.record(info, {families, pairs, sorters, modals});
});
