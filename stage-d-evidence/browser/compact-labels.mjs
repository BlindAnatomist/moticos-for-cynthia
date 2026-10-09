import {expect} from '@playwright/test';
import {CATALOG} from '../../src/career/content.js';
import {COMPACT_BOARD_LABELS} from '../../src/career/boardArt.js';

export function inspectCompactLabels(board,catalog) {
  const labels=[...board.querySelectorAll('.career-cell-label')];
  const style=getComputedStyle(board.querySelector('.career-cell-name-compact'));
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const widths=labels.map(el=>el.getBoundingClientRect().width);
  const rows=[...board.querySelectorAll('.career-cell.has-piece')].map(cell=>{
    const label=cell.querySelector('.career-cell-name-compact'),range=document.createRange();range.selectNodeContents(label);
    const box=cell.getBoundingClientRect(),s=getComputedStyle(cell);
    return{id:cell.dataset.pieceId,text:label.textContent,left:box.left+parseFloat(s.borderLeftWidth),right:box.right-parseFloat(s.borderRightWidth),rects:[...range.getClientRects()].filter(r=>r.width>0).map(r=>({left:r.left,right:r.right,y:r.y}))};
  });
  return{fontSize:parseFloat(style.fontSize),fontFamily:style.fontFamily,minimumTextWidth:Math.min(...widths),rows,catalog:catalog.map(p=>({...p,width:context.measureText(p.text).width}))};
}
export function compactLabelViolations(proof) {
  const errors=[];
  if(proof.catalog.length!==320||new Set(proof.catalog.map(p=>p.id)).size!==320)errors.push('Catalog must contain all 320 unique labels');
  if(!(proof.fontSize>=11))errors.push('Compact font must remain at least 11px');
  if(!(proof.minimumTextWidth>0))errors.push('A real positive label width is required');
  for(const p of proof.catalog)if(!Number.isFinite(p.width)||p.width<0||p.width>proof.minimumTextWidth)errors.push(`${p.id}: ${p.text} exceeds actual label width`);
  if(!proof.rows.length)errors.push('Occupied board labels must be measured');
  for(const row of proof.rows){
    if(row.rects.length!==1)errors.push(`${row.id}: compact word must stay on one line`);
    if(!Number.isFinite(row.left)||!Number.isFinite(row.right)||row.right<=row.left||row.rects.some(r=>![r.left,r.right,r.y].every(Number.isFinite)||r.right<=r.left||r.left<row.left-1||r.right>row.right+1))errors.push(`${row.id}: text exceeds its cell border`);
  }
  return errors;
}
export async function compactBoardLabelProof(page) {
  await page.evaluate(()=>document.fonts.ready);
  const proof=await page.locator('.career-board').evaluate(inspectCompactLabels,CATALOG.PIECES.map(p=>({id:p.id,text:COMPACT_BOARD_LABELS[p.id]??p.shortName})));
  expect(compactLabelViolations(proof),'All320 exact compact labels fit the actual unchanged native font and occupied text stays inside cells').toEqual([]);
  return proof;
}
