import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyPng} from '../../gate/png.mjs';

// Browser-evaluated and deliberately self-contained. A font-ready document can
// still have pending style/layout work. Flush a no-op stylesheet on both engines
// before measuring, then allow font-triggered layout and two frames to settle.
// This is preparation, not a screenshot retry or an engine-specific correction.
export async function settleCaptureLayout() {
  await document.fonts.ready;
  const style = document.createElement('style');
  style.textContent = 'body {}';
  document.head.appendChild(style);
  try { document.documentElement.getBoundingClientRect(); }
  finally { style.remove(); }
  document.documentElement.getBoundingClientRect();
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.documentElement.getBoundingClientRect();
}

export function inspectCaptureGeometry() {
  const metrics = element => ({
    scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
    offsetWidth: element.offsetWidth, offsetHeight: element.offsetHeight,
    clientWidth: element.clientWidth, clientHeight: element.clientHeight,
  });
  return {
    viewport: {width: innerWidth, height: innerHeight, dpr: devicePixelRatio},
    fonts: document.fonts.status,
    body: metrics(document.body), root: metrics(document.documentElement),
  };
}

export function verifyCaptureGeometry(geometry) {
  assert.equal(geometry.schemaVersion, 1);
  const {before, after} = geometry;
  const kind=geometry.captureKind??'full-page';
  assert(['full-page','viewport-modal'].includes(kind),'Unknown capture kind');
  assert.deepEqual(after, before, 'Document geometry changed during the single screenshot capture');
  assert.equal(before.fonts, 'loaded', 'Screenshot fonts must be settled');
  const {width, height, dpr} = before.viewport;
  for (const value of [width, height]) assert(Number.isSafeInteger(value) && value > 0);
  assert(Number.isFinite(dpr) && dpr > 0);
  for (const element of [before.body, before.root]) {
    for (const key of ['scrollWidth','scrollHeight','offsetWidth','offsetHeight','clientWidth','clientHeight']) {
      assert(Number.isSafeInteger(element[key]) && element[key] >= 0, `Invalid document metric: ${key}`);
    }
  }
  // Match the full document extent, independently of the PNG. A root-only
  // scrollHeight can omit a larger body/offset/client extent.
  const fullWidth = Math.max(...[before.body, before.root].flatMap(e => [e.scrollWidth,e.offsetWidth,e.clientWidth]));
  const fullHeight = Math.max(...[before.body, before.root].flatMap(e => [e.scrollHeight,e.offsetHeight,e.clientHeight]));
  assert.equal(fullWidth, width, 'Full-page capture must not conceal horizontal page overflow');
  assert(fullHeight >= height, 'Full-page capture must include the viewport');
  if(kind==='viewport-modal'){verifyModalCaptureGeometry(before.modal,before.viewport);return [Math.round(width*dpr),Math.round(height*dpr)];}
  assert(!before.modal,'Modal evidence must declare viewport-modal capture kind');
  return [Math.round(fullWidth * dpr), Math.round(fullHeight * dpr)];
}

export async function captureFullPage(page, path) {
  const geometryPath = path + '.geometry.json';
  assert(!fs.existsSync(path) && !fs.existsSync(geometryPath), 'Original capture evidence cannot be replaced');
  await page.evaluate(settleCaptureLayout);
  const before = await page.evaluate(inspectCaptureGeometry);
  await page.screenshot({path,fullPage:true});
  const after = await page.evaluate(inspectCaptureGeometry);
  const geometry = {schemaVersion: 1, before, after};
  // Keep both independent observations even when layout or PNG validation fails.
  fs.writeFileSync(geometryPath, JSON.stringify(geometry, null, 2) + '\n', {flag: 'wx'});
  const dimensions = verifyCaptureGeometry(geometry);
  verifyPng(fs.readFileSync(path), dimensions);
  return {dimensions, geometry};
}

// Only reads geometry. In particular, this must not focus or scroll a target.
export function inspectModalCaptureGeometry({selector,targets}) {
  const rect = element => { const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
  const dialogs=[...document.querySelectorAll(selector)];
  if(dialogs.length!==1)throw Error('Modal capture requires exactly one dialog');
  const dialog=dialogs[0],r=dialog.getBoundingClientRect();
  return {
    selector,rect:rect(dialog),scrollLeft:dialog.scrollLeft,scrollTop:dialog.scrollTop,
    scrollWidth:dialog.scrollWidth,scrollHeight:dialog.scrollHeight,
    clientWidth:dialog.clientWidth,clientHeight:dialog.clientHeight,
    overflowY:getComputedStyle(dialog).overflowY,
    documentScroll:{x:scrollX,y:scrollY},
    scrollport:{left:r.left+dialog.clientLeft,top:r.top+dialog.clientTop,right:r.left+dialog.clientLeft+dialog.clientWidth,bottom:r.top+dialog.clientTop+dialog.clientHeight},
    targets:targets.map(selector=>{
      const nodes=[...dialog.querySelectorAll(selector)];
      if(nodes.length!==1)throw Error(`Modal target must identify exactly one descendant: ${selector}`);
      return {selector,rect:rect(nodes[0])};
    }),
  };
}

export function verifyModalCaptureGeometry(modal,viewport) {
  assert(modal && typeof modal.selector==='string' && modal.selector.length,'Modal selector is required');
  assert(Array.isArray(modal.targets)&&modal.targets.length>0,'Modal capture requires explicit framing targets');
  for(const key of ['scrollLeft','scrollTop','scrollWidth','scrollHeight','clientWidth','clientHeight'])assert(Number.isFinite(modal[key])&&modal[key]>=0,`Invalid modal metric: ${key}`);
  for(const value of Object.values(modal.documentScroll))assert(Number.isFinite(value),'Invalid document scroll');
  const viewportRect={left:0,top:0,right:viewport.width,bottom:viewport.height};
  const contains=(outer,inner,label)=>{
    for(const key of ['left','top','right','bottom'])assert(Number.isFinite(inner[key])&&Number.isFinite(outer[key]),`Invalid ${label} rectangle`);
    assert(inner.right>inner.left&&inner.bottom>inner.top,`${label} must have positive bounds`);
    for(const key of ['left','top'])assert(inner[key]>=outer[key]-1,`${label} ${key} is clipped`);
    for(const key of ['right','bottom'])assert(inner[key]<=outer[key]+1,`${label} ${key} is clipped`);
  };
  contains(viewportRect,modal.rect,'Modal');
  contains(modal.rect,modal.scrollport,'Modal scrollport');
  if(modal.scrollHeight>modal.clientHeight+1)assert(['auto','scroll'].includes(modal.overflowY),'Overflowing modal needs a scrollable scrollport');
  assert.equal(new Set(modal.targets.map(t=>t.selector)).size,modal.targets.length,'Duplicate modal targets');
  for(const target of modal.targets){assert(typeof target.selector==='string'&&target.selector.length);contains(modal.scrollport,target.rect,`Modal target ${target.selector}`);contains(viewportRect,target.rect,`Viewport target ${target.selector}`);}
}

export async function captureViewportModal(page,path,{modal,frame}) {
  assert(modal&&typeof modal.selector==='string'&&Array.isArray(modal.targets)&&modal.targets.length,'Explicit modal selector and targets are required');
  assert.equal(typeof frame,'function','Modal capture requires final framing after readiness');
  const geometryPath=path+'.geometry.json';
  assert(!fs.existsSync(path)&&!fs.existsSync(geometryPath),'Original capture evidence cannot be replaced');
  await page.evaluate(settleCaptureLayout);
  await frame();
  const observe=async()=>({...await page.evaluate(inspectCaptureGeometry),modal:await page.evaluate(inspectModalCaptureGeometry,modal)});
  const before=await observe();
  verifyCaptureGeometry({schemaVersion:1,captureKind:'viewport-modal',before,after:before});
  // Page screenshot (not locator screenshot) never scrolls a target into view.
  // No resize, full-page expansion, second readiness pass, focus or retry here.
  await page.screenshot({path,fullPage:false});
  const after=await observe(),geometry={schemaVersion:1,captureKind:'viewport-modal',before,after};
  fs.writeFileSync(geometryPath,JSON.stringify(geometry,null,2)+'\n',{flag:'wx'});
  const dimensions=verifyCaptureGeometry(geometry);
  verifyPng(fs.readFileSync(path),dimensions);
  return {dimensions,geometry};
}
