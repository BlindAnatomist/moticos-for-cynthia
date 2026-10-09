import {expect} from '@playwright/test';
import {CATALOG} from '../../src/career/content.js';

// Actual DOM words may wrap at spaces, never inside a word. The catalog check
// also measures all 280 names in the rendered font against the smallest tile.
export async function wholeWordBoardProof(page) {
  const proof = await page.locator('.career-board').evaluate((board, names) => {
    const cells = [...board.querySelectorAll('.career-cell')];
    const rows = cells.filter(cell => cell.classList.contains('has-piece')).map(cell => {
      const label = cell.querySelector('.career-cell-name-full');
      const node = label.firstChild, style = getComputedStyle(label);
      const words = [...label.textContent.matchAll(/\S+/g)].map(match => {
        const range = document.createRange(); range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
        return {word: match[0], lines: [...new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.y)))].length};
      });
      return {pieceId: cell.dataset.pieceId, fontSize: parseFloat(style.fontSize), words};
    });
    const label = board.querySelector('.career-cell-name-full'), style = getComputedStyle(label);
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const widths = cells.map(cell => { const s = getComputedStyle(cell); return cell.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); });
    const minimumTextWidth = Math.min(...widths);
    const catalog = names.map(({id, name}) => ({id, name, widestWord: Math.max(...name.split(/\s+/).map(word => context.measureText(word).width))}));
    return {rows, catalog, minimumTextWidth, boardWidth: board.clientWidth, contentWidth: board.scrollWidth, pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth};
  }, CATALOG.PIECES.map(piece => ({id: piece.id, name: piece.shortName})));
  expect(proof.catalog).toHaveLength(280);
  expect(proof.minimumTextWidth).toBeGreaterThanOrEqual(90);
  for (const row of proof.rows) {
    expect(row.fontSize).toBeGreaterThanOrEqual(14);
    for (const word of row.words) expect(word.lines, `${row.pieceId}: ${word.word} stays whole`).toBe(1);
  }
  expect(proof.catalog.filter(piece => piece.widestWord > proof.minimumTextWidth), 'Every catalog word fits without reducing its font').toEqual([]);
  expect(proof.pageWidth).toBeLessThanOrEqual(proof.viewportWidth + 1);
  return proof;
}

export async function boardScrollProof(page, touch = false) {
  const board = page.locator('.career-board');
  const first = page.locator('[data-career-cell="0"]');
  await first.focus();
  const start = await board.evaluate(el => el.scrollLeft);
  const steps = [];
  for (const [key, at] of [['End',4],['Control+End',24],['Home',20],['Control+Home',0],['ArrowRight',1],['ArrowDown',6],['ArrowLeft',5],['ArrowUp',0]]) {
    await page.keyboard.press(key);
    const cell = page.locator(`[data-career-cell="${at}"]`);
    await expect(cell).toBeFocused();
    const position = await cell.evaluate(el => { const r=el.getBoundingClientRect(), b=el.closest('.career-board').getBoundingClientRect(); return {x:r.x,right:r.right,left:b.x+el.closest('.career-board').clientLeft,rightEdge:b.x+el.closest('.career-board').clientLeft+el.closest('.career-board').clientWidth, label:el.getAttribute('aria-label')}; });
    expect(position.x).toBeGreaterThanOrEqual(position.left - 1);
    expect(position.right).toBeLessThanOrEqual(position.rightEdge + 1);
    expect(position.label.toLowerCase()).toContain(`row ${Math.floor(at / 5) + 1}, column ${at % 5 + 1}`);
    steps.push({key, at, ...position});
  }
  const right = page.getByRole('button', {name:'Scroll board right', exact:true});
  const left = page.getByRole('button', {name:'Scroll board left', exact:true});
  const overflow = await board.evaluate(el => el.scrollWidth > el.clientWidth + 1);
  if (overflow) {
    await expect(right).toBeVisible(); await expect(right).toBeEnabled();
    for (let presses = 0; await right.isEnabled(); presses++) {
      expect(presses, 'Right arrow reaches the final column in a bounded number of presses').toBeLessThan(5);
      if (touch) await right.tap(); else await right.click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    await expect.poll(() => board.evaluate(el => Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth)))).toBeLessThanOrEqual(1);
    await expect.poll(() => board.evaluate(el => el.scrollLeft)).toBeGreaterThan(start + 1);
    await expect(right).toBeDisabled();
    const lastColumn = await page.locator('[data-career-cell="4"]').evaluate(el => {
      const cell = el.getBoundingClientRect(), board = el.closest('.career-board'), box = board.getBoundingClientRect();
      const label = el.querySelector('.career-cell-name-full'), range = document.createRange();
      if (label) range.selectNodeContents(label);
      return {cellLeft:cell.left,cellRight:cell.right,viewportLeft:box.left+board.clientLeft,viewportRight:box.left+board.clientLeft+board.clientWidth,labelRects:label?[...range.getClientRects()].map(r=>({left:r.left,right:r.right})):[]};
    });
    expect(lastColumn.cellLeft).toBeGreaterThanOrEqual(lastColumn.viewportLeft-1);
    expect(lastColumn.cellRight).toBeLessThanOrEqual(lastColumn.viewportRight+1);
    for(const rect of lastColumn.labelRects){expect(rect.left).toBeGreaterThanOrEqual(lastColumn.viewportLeft-1);expect(rect.right).toBeLessThanOrEqual(lastColumn.viewportRight+1);}
    steps.push({nativeRightEdge:lastColumn});
    await expect(left).toBeEnabled();
    for (let presses = 0; await left.isEnabled(); presses++) {
      expect(presses, 'Left arrow returns to the first column in a bounded number of presses').toBeLessThan(5);
      if (touch) await left.tap(); else await left.click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    await expect.poll(() => board.evaluate(el => el.scrollLeft)).toBeLessThanOrEqual(1);
    await first.focus();
    await expect(left).toBeDisabled();
    // Keyboard activation keeps focus on the same accessible button at an end.
    for (const [control, key, edge] of [[right,'Enter','right'],[left,'Space','left']]) {
      await control.focus();
      for (let presses = 0; await control.isEnabled(); presses++) {
        expect(presses).toBeLessThan(5);
        await page.keyboard.press(key);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
      await expect(control).toBeDisabled();
      await expect(control).toBeFocused();
      const offset = await board.evaluate(el => el.scrollLeft);
      await page.keyboard.press(key);
      expect(await board.evaluate(el => el.scrollLeft)).toBe(offset);
      steps.push({keyboardScrollControl:edge,activation:key,focusedAtEnd:true,offset});
    }
    await first.focus();
  } else await expect(right).toHaveCount(0);
  // Restore horizontal view so the standard evidence shot starts at column one.
  await board.evaluate(el => { el.scrollLeft = 0; });
  return {overflow, steps, arrowControls: overflow ? 'tested' : 'not needed'};
}

export async function postcardFontProof(page) {
  const proof = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts].filter(face => face.family.replace(/["']/g,'') === 'Moticos Serif').map(face => ({family: face.family, style: face.style, weight: face.weight, status: face.status}));
    const family = getComputedStyle(document.querySelector('.career-postcard figcaption')).fontFamily;
    const context = document.createElement('canvas').getContext('2d');
    context.font = '42px "Moticos Serif"';
    return {faces, family, titleWidth: context.measureText(document.querySelector('#career-dialog-title').textContent).width, titleFont: context.font};
  });
  expect(proof.family).toContain('Moticos Serif');
  expect(proof.faces.some(face => face.style === 'normal' && face.weight === '400' && face.status === 'loaded')).toBe(true);
  expect(proof.titleFont).toContain('Moticos Serif');
  expect(proof.titleWidth).toBeGreaterThan(0);
  expect(proof.titleWidth).toBeLessThan(1400);
  return proof;
}
