import { mkdir, writeFile } from 'node:fs/promises';
import {CHOOSER_CONTRACT,CHOOSER_STYLE_PROPERTIES,classifyChooserVisibility} from '../../scripts/expansion160ChooserVisibility.mjs';

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
 const state=await page.locator('body').evaluate((body,{envelope,contract,properties})=>{
  const dialogs=[...document.querySelectorAll('dialog')],dialog=dialogs[0],card=dialog?.querySelector(`.mg-envelope-card[data-envelope-id="${envelope}"]`),box=dialog?.getBoundingClientRect();
  const pair=[...(card?.querySelectorAll('.mg-envelope-art img')??[])],nodes=[],ids=new Map();
  const id=node=>{if(!node)return null;if(!ids.has(node)){ids.set(node,`e${nodes.length}`);nodes.push(node);}return ids.get(node);};
  pair.forEach(id);
  for(const image of pair)for(let node=image;node;node=node.parentElement)id(node);
  const raw=pair.map(image=>{const rect=image.getBoundingClientRect().toJSON();return {image,rect,source:image.currentSrc||image.src,complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight};});
  // Keep every original 2%/98% probe first, before any new stable query. The
  // actual returned nodes stay in this one synchronous observation.
  for(const row of raw)row.original=[[.02,.02],[.98,.02],[.02,.98],[.98,.98],[.5,.5]].map(([rx,ry])=>{const x=row.rect.x+row.rect.width*rx,y=row.rect.y+row.rect.height*ry;return {x,y,target:document.elementFromPoint(x,y)};});
  for(const row of raw)row.center=document.elementFromPoint(row.rect.x+row.rect.width/2,row.rect.y+row.rect.height/2);
  for(const row of raw){const r=row.rect,x=Math.max(r.width*.02,2),y=Math.max(r.height*.02,2);row.stable=r.width>2*x&&r.height>2*y?[[r.x+x,r.y+y],[r.right-x,r.y+y],[r.x+x,r.bottom-y],[r.right-x,r.bottom-y],[r.x+r.width/2,r.y+r.height/2]].map(([x,y])=>({x,y,target:document.elementFromPoint(x,y)})):[];}
  const target=node=>node?{elementId:id(node),pairedImageIndex:pair.includes(node)?pair.indexOf(node):null,tag:node.tagName,source:node.tagName==='IMG'?(node.currentSrc||node.src):null,rect:node.getBoundingClientRect().toJSON()}:null;
  const images=raw.map(row=>({elementId:id(row.image),source:row.source,complete:row.complete,naturalWidth:row.naturalWidth,naturalHeight:row.naturalHeight,rect:row.rect,hitPoints:row.original.map(p=>({x:p.x,y:p.y,hit:p.target===row.image,target:target(p.target)})),centerHit:row.center===row.image,centerTarget:target(row.center),stableHitPoints:row.stable.map(p=>({x:p.x,y:p.y,hit:p.target===row.image,target:target(p.target)}))}));
  const supportedProperties=Object.fromEntries(properties.map(p=>[p,CSS.supports(p,'initial')]));
  const rootElementId=id(document.documentElement),dialogElementId=id(dialog),cardElementId=id(card),pairContainerId=id(pair[0]?.parentElement);
  // Register any unrelated hit target ancestors too; it still cannot acquire
  // paired identity because indices come only from exact DOM object equality.
  for(let i=0;i<nodes.length;i++)id(nodes[i].parentElement);
  const elements=nodes.map(node=>{const style=getComputedStyle(node);return {elementId:id(node),parentId:id(node.parentElement),tag:node.tagName,envelope:node.dataset?.envelopeId??null,pairedImageIndex:pair.includes(node)?pair.indexOf(node):null,source:node.tagName==='IMG'?(node.currentSrc||node.src):null,rect:node.getBoundingClientRect().toJSON(),client:{left:node.clientLeft,top:node.clientTop,width:node.clientWidth,height:node.clientHeight},styles:Object.fromEntries(properties.map(p=>[p,supportedProperties[p]?style.getPropertyValue(p):null])),pseudo:{before:getComputedStyle(node,'::before').content,after:getComputedStyle(node,'::after').content},activeAnimations:node.getAnimations().length};});
  return {capturedAt:new Date().toISOString(),dialogCount:dialogs.length,open:dialog?.open??false,modal:dialog?.matches(':modal')??false,bodyOverflow:getComputedStyle(body).overflow,envelope:card?.dataset.envelopeId??null,occlusionRect:(()=>{const h=dialog?.querySelector('.cg-dialog-header')?.getBoundingClientRect();return box&&h?{x:box.x,y:box.y,width:box.width,height:Math.max(0,h.bottom-box.y)}:null;})(),rect:box?.toJSON()??null,scrollTop:dialog?.scrollTop??null,viewport:{width:innerWidth,height:innerHeight},images,chooserEvidence:{contract,devicePixelRatio,rootElementId,dialogElementId,cardElementId,pairContainerId,pairElementIds:pair.map(id),supportedProperties,elements}};
 },{envelope,contract:CHOOSER_CONTRACT,properties:CHOOSER_STYLE_PROPERTIES},{timeout:5000});
 state.chooserEvidence.classification=classifyChooserVisibility(state);
 return state;
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
