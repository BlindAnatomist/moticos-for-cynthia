import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectCaptureGeometry,inspectModalCaptureGeometry} from './capture-geometry.mjs';

// Framing uses ordinary scrolling only. The minimum inset is a positioning
// requirement, never a tolerance that permits clipped cards or labels.
export const MODAL_CAPTURE_INSET = 8;
export function planModalFraming(modal,viewport) {
  const inset=MODAL_CAPTURE_INSET;
  assert(Array.isArray(modal.targets)&&modal.targets.length,'Explicit framing targets are required');
  assert.equal(new Set(modal.targets.map(t=>t.selector)).size,modal.targets.length,'Duplicate framing targets');
  for(const value of [viewport.width,viewport.height,modal.scrollTop,modal.scrollHeight,modal.clientHeight,...Object.values(modal.scrollport)])assert(Number.isFinite(value),'Framing metrics must be finite');
  assert(viewport.width>0&&viewport.height>0&&modal.clientHeight>0&&modal.scrollHeight>=modal.clientHeight&&modal.scrollTop>=0,'Invalid framing dimensions');
  const visible={left:Math.max(0,modal.scrollport.left),right:Math.min(viewport.width,modal.scrollport.right),top:Math.max(0,modal.scrollport.top),bottom:Math.min(viewport.height,modal.scrollport.bottom)};
  const targetBounds=modal.targets.map(({selector,rect})=>{
    assert(typeof selector==='string'&&selector.length,'Target selector is required');
    for(const key of ['left','top','right','bottom'])assert(Number.isFinite(rect[key]),'Target bounds must be finite');
    assert(rect.right>rect.left&&rect.bottom>rect.top,'Target must have positive bounds');
    assert(rect.left>=visible.left&&rect.right<=visible.right,'Target is horizontally clipped');
    return rect;
  });
  const union={top:Math.min(...targetBounds.map(r=>r.top)),bottom:Math.max(...targetBounds.map(r=>r.bottom))};
  assert(union.bottom-union.top<=visible.bottom-visible.top-2*inset,'Framing targets cannot fit with the required inset');
  const requestedScrollTop=modal.scrollTop+(union.top+union.bottom-visible.top-visible.bottom)/2;
  const maxScrollTop=modal.scrollHeight-modal.clientHeight;
  return {inset,visible,union,requestedScrollTop,scrollTop:Math.max(0,Math.min(maxScrollTop,requestedScrollTop)),maxScrollTop};
}

export function verifyModalFraming(modal,viewport) {
  const plan=planModalFraming(modal,viewport);
  for(const target of modal.targets){
    assert(target.rect.top>=plan.visible.top+plan.inset,`Framing target ${target.selector} lacks the required top inset`);
    assert(target.rect.bottom<=plan.visible.bottom-plan.inset,`Framing target ${target.selector} lacks the required bottom inset`);
  }
  return true;
}

// Browser-evaluated: no focus, styles, DOM replacement or screenshot here.
export async function scrollModalForCapture({selector,scrollTop}) {
  const nodes=[...document.querySelectorAll(selector)];
  if(nodes.length!==1)throw Error('Framing requires exactly one modal');
  nodes[0].scrollTo({top:scrollTop,behavior:'instant'});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}

export async function frameModalTargets(page,path,modal) {
  const framingPath=path+'.framing.json';
  assert(!fs.existsSync(framingPath),'Original framing evidence cannot be replaced');
  const observe=async()=>({viewport:(await page.evaluate(inspectCaptureGeometry)).viewport,modal:await page.evaluate(inspectModalCaptureGeometry,modal)});
  const evidence={schemaVersion:1,method:'scroll-target-union-to-visible-center'};
  const write=()=>{
    const bytes=Buffer.from(JSON.stringify(evidence,null,2)+'\n');
    assert(bytes.length<=64*1024,'Framing evidence exceeds its 64 KiB diagnostic bound');
    fs.writeFileSync(framingPath,bytes,{flag:'wx'});
  };
  let phase='before-observation';
  try {
    evidence.before=await observe();
    phase='planning';
    evidence.plan=planModalFraming(evidence.before.modal,evidence.before.viewport);
    phase='scrolling';
    await page.evaluate(scrollModalForCapture,{selector:modal.selector,scrollTop:evidence.plan.scrollTop});
    phase='after-observation';
    evidence.after=await observe();
    // Persist actual post-scroll rectangles before inset or strict Playwright
    // intersection assertions. A failed assertion must retain the real geometry.
    write();
    assert.deepEqual(evidence.after.viewport,evidence.before.viewport,'Viewport changed while framing modal');
    assert.deepEqual(evidence.after.modal.targets.map(t=>t.selector),evidence.before.modal.targets.map(t=>t.selector),'Framing target identity changed');
    verifyModalFraming(evidence.after.modal,evidence.after.viewport);
    return evidence;
  } catch(error) {
    // No extra browser evaluation, retry, or teardown delay on an error. Keep
    // whichever observations completed and preserve the original thrown error.
    if(!fs.existsSync(framingPath)){
      evidence.failure={phase,message:String(error?.message??error).slice(0,2048)};
      try{write();}catch(writeError){error.framingEvidenceError=String(writeError?.message??writeError).slice(0,2048);}
    }
    throw error;
  }
}
