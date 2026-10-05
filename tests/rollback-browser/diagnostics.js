import { mkdir, writeFile } from 'node:fs/promises';
import { journal } from '../../scripts/rollbackDiagnostics.mjs';
const journals = new WeakMap();
export function record(info, event, details = {}) {
  if (!journals.has(info)) journals.set(info, journal(info.outputPath('observations.jsonl'), info));
  journals.get(info)(event, details);
}
export async function boundedObservation(callback, timeoutMs = 5000) {
  let timer;
  try { return await Promise.race([Promise.resolve().then(callback), new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error(`Diagnostic observation exceeded ${timeoutMs}ms`)), timeoutMs);
  })]); } finally { clearTimeout(timer); }
}
export async function pageState(page) {
  return page.locator('body').evaluate(body => {
    const dialogs = [...document.querySelectorAll('dialog')], dialog = dialogs[0];
    const box = dialog?.getBoundingClientRect(), style = dialog && getComputedStyle(dialog);
    const left = Math.max(0, box?.left ?? 0), right = Math.min(innerWidth, box?.right ?? 0), top = Math.max(0, box?.top ?? 0), bottom = Math.min(innerHeight, box?.bottom ?? 0);
    const hitTests = [0.2, 0.5, 0.8].map(ratio => {
      const x = left + (right-left) * 0.5, y = top + (bottom-top) * ratio, hit = document.elementFromPoint(x,y);
      return { x, y, tag: hit?.tagName ?? null, insideDialog: Boolean(dialog && hit && dialog.contains(hit)) };
    });
    return { capturedAt: new Date().toISOString(), url: location.href, viewport: {width: innerWidth, height: innerHeight}, scrollX, scrollY,
      documentWidth: document.documentElement.scrollWidth, bodyOverflow: getComputedStyle(body).overflow,
      focus: {tag: document.activeElement?.tagName, text: (document.activeElement?.textContent ?? '').slice(0,160)},
      heading: document.querySelector('.mg-heading p')?.textContent ?? null,
      board: [...document.querySelectorAll('[data-matching-cell]')].map(node => node.dataset.pieceId),
      recoveryRegions: [...document.querySelectorAll('[role="region"]')].map(node => ({name: node.getAttribute('aria-label'), rect: node.getBoundingClientRect().toJSON()})),
      writes: window.__rollbackWrites?.length ?? null, dialogCount: dialogs.length,
      dialog: dialog ? {open: dialog.open, modal: dialog.matches(':modal'),
        visible: right > left && bottom > top && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity)>0,
        envelope: dialog.querySelector('select')?.value ?? null, rect: box.toJSON(), scrollTop: dialog.scrollTop, hitTests,
        images: [...dialog.querySelectorAll('.cg-collection-piece img')].map(image => ({source: image.currentSrc || image.src, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight})),
      } : null };
  }, undefined, { timeout: 5000 });
}
export async function preserveFailureDiagnosis(page, info) {
  if (info.status === info.expectedStatus) return;
  const directory = info.outputPath('failure-diagnosis'); await mkdir(directory, {recursive: true});
  const result = {purpose:'diagnostic-only-not-release-acceptance',profile:info.project.name,title:info.title,status:info.status,
    tracePolicy:'action/source trace; no automatic screenshots, DOM snapshots, network bodies or attachment copies',observations:[]};
  for (const [name, callback] of [
    ['before-image', () => pageState(page)],
    ['failure-image', async () => {const path=`${directory}/failure-view.png`;await page.screenshot({path,timeout:5000,animations:'disabled'});return {path};}],
    ['after-image', () => pageState(page)],
    ['accessibility', () => page.locator('body').ariaSnapshot({timeout:5000})],
  ]) {
    const start = new Date().toISOString();
    try {result.observations.push({name,start,end:new Date().toISOString(),value:await boundedObservation(callback)});}
    catch (error) {result.observations.push({name,start,end:new Date().toISOString(),unavailable:String(error)});}
    result.observations.at(-1).end = new Date().toISOString();
    await writeFile(`${directory}/failure-state.json`, JSON.stringify(result,null,2)+'\n');
  }
}
