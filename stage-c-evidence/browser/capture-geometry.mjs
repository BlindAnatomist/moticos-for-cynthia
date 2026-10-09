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
