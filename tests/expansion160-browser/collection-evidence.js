import { mkdir, writeFile } from 'node:fs/promises';

export async function collectionState(page) {
  return page.locator('body').evaluate(body => {
    const dialogs = [...document.querySelectorAll('dialog')], dialog = dialogs[0];
    const images = [...(dialog?.querySelectorAll('.cg-collection-piece img') ?? [])].map(image => ({
      source: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
      hitPoints: [[0.02,0.02],[0.98,0.02],[0.02,0.98],[0.98,0.98],[0.5,0.5]].map(([rx,ry])=>{const r=image.getBoundingClientRect(),x=r.x+r.width*rx,y=r.y+r.height*ry;return {x,y,hit:document.elementFromPoint(x,y)===image};}),
      rect: image.getBoundingClientRect().toJSON(), centerHit: document.elementFromPoint(image.getBoundingClientRect().x+image.getBoundingClientRect().width/2,image.getBoundingClientRect().y+image.getBoundingClientRect().height/2)===image,
    }));
    const box = dialog?.getBoundingClientRect(), style = dialog && getComputedStyle(dialog);
    const left = Math.max(0, box?.left ?? 0), right = Math.min(innerWidth, box?.right ?? 0);
    const top = Math.max(0, box?.top ?? 0), bottom = Math.min(innerHeight, box?.bottom ?? 0);
    const hitTests = [0.2, 0.5, 0.8].map(ratio => {
      const x = left + (right - left) * 0.5, y = top + (bottom - top) * ratio, hit = document.elementFromPoint(x, y);
      return { x, y, tag: hit?.tagName ?? null, insideDialog: Boolean(dialog && hit && dialog.contains(hit)) };
    });
    return { capturedAt: new Date().toISOString(), url: location.href, dialogCount: dialogs.length,
      open: dialog?.open ?? false, modal: dialog?.matches(':modal') ?? false,
      visible: Boolean(box && right > left && bottom > top && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0),
      bodyOverflow: getComputedStyle(body).overflow, envelope: dialog?.querySelector('select')?.value ?? null,
      occlusionRect: (()=>{const h=dialog?.querySelector('.cg-dialog-header')?.getBoundingClientRect();return box&&h?{x:box.x,y:box.y,width:box.width,height:Math.max(0,h.bottom-box.y)}:null;})(),
      rect: box?.toJSON() ?? null, scrollTop: dialog?.scrollTop ?? null, viewport: {width: innerWidth, height: innerHeight}, images, hitTests };
  }, undefined, { timeout: 5000 });
}

export async function chooserState(page, envelope) {
 return page.locator('body').evaluate((body,envelope)=>{
  const dialogs=[...document.querySelectorAll('dialog')],dialog=dialogs[0],card=dialog?.querySelector(`.mg-envelope-card[data-envelope-id="${envelope}"]`),box=dialog?.getBoundingClientRect();
  return {capturedAt:new Date().toISOString(),dialogCount:dialogs.length,open:dialog?.open??false,modal:dialog?.matches(':modal')??false,bodyOverflow:getComputedStyle(body).overflow,envelope:card?.dataset.envelopeId??null,occlusionRect:(()=>{const h=dialog?.querySelector('.cg-dialog-header')?.getBoundingClientRect();return box&&h?{x:box.x,y:box.y,width:box.width,height:Math.max(0,h.bottom-box.y)}:null;})(),rect:box?.toJSON()??null,scrollTop:dialog?.scrollTop??null,viewport:{width:innerWidth,height:innerHeight},images:[...(card?.querySelectorAll('.mg-envelope-art img')??[])].map(image=>{const rect=image.getBoundingClientRect();return {source:image.currentSrc||image.src,complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,rect:rect.toJSON(),hitPoints:[[0.02,0.02],[0.98,0.02],[0.02,0.98],[0.98,0.98],[0.5,0.5]].map(([rx,ry])=>{const x=rect.x+rect.width*rx,y=rect.y+rect.height*ry;return {x,y,hit:document.elementFromPoint(x,y)===image};}),centerHit:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)===image};})};
 },envelope,{timeout:5000});
}

// Locator.evaluate's timeout only bounds finding the element. The outer timer
// also bounds a hung evaluation/capture request. Context teardown cancels any
// request still in flight; a timeout is explicitly recorded as unavailable.
export async function boundedDiagnosticObservation(callback, timeoutMs = 5000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(callback),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Diagnostic observation exceeded ${timeoutMs}ms`)), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

// These are separate, timestamped observations, never described as an atomic
// DOM-to-pixel snapshot. Errors in diagnosis cannot hide the original failure.
export async function preserveFailureDiagnosis(page, info, force = false) {
  if (!force && info.status === info.expectedStatus) return;
  try { await captureFailureDiagnosis(page, info); }
  catch (error) { console.error(`Failure diagnosis unavailable (original test failure retained): ${String(error)}`); }
}

async function captureFailureDiagnosis(page, info) {
  const directory = info.outputPath('failure-diagnosis'); await mkdir(directory, {recursive: true});
  const record = { purpose: 'diagnostic-only-not-release-acceptance', testId: info.testId, profile: info.project.name,
    status: info.status, tracePolicy: 'action/source trace; no automatic snapshots, screencast, network bodies or attachment copies', observations: [] };
  async function observe(name, callback) {
    const start = new Date().toISOString();
    try { const value = await boundedDiagnosticObservation(callback); record.observations.push({name, start, end: new Date().toISOString(), value}); }
    catch (error) { record.observations.push({name, start, end: new Date().toISOString(), unavailable: String(error)}); }
    await writeFile(`${directory}/failure-state.json`, JSON.stringify(record, null, 2) + '\n');
  }
  await observe('before-image', () => collectionState(page));
  await observe('failure-image', async () => { const path = `${directory}/failure-view.png`; await page.screenshot({path, timeout:5000, animations:'disabled'}); return {path}; });
  await observe('after-image', () => collectionState(page));
  await observe('accessibility', () => page.locator('body').ariaSnapshot({timeout:5000}));
}
