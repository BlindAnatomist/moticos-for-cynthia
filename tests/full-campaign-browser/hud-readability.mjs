// Serialized by Playwright into the page. Keep DOM collection self-contained.
export function inspectHudReadability(hud) {
  if (!hud) return {hud:null,controls:[]};
  const doc=hud.ownerDocument,view=doc.defaultView;
  const box=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const visible=element=>{for(let e=element;e;e=e.parentElement){const s=view.getComputedStyle(e);if(e.hidden||e.getAttribute('aria-hidden')==='true'||s.display==='none'||['hidden','collapse'].includes(s.visibility)||s.contentVisibility==='hidden'||Number(s.opacity)===0)return false;}return true;};
  const measureText=element=>{if(!element)return[];const result=[],walker=doc.createTreeWalker(element,4);while(walker.nextNode()){const node=walker.currentNode;if(!node.textContent.trim())continue;const range=doc.createRange();range.selectNodeContents(node);const parent=node.parentElement,s=view.getComputedStyle(parent);result.push({text:node.textContent.trim(),visible:visible(parent)&&Number.parseFloat(s.fontSize)>0&&s.color!=='transparent'&&!/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(s.color),parent:box(parent),rects:[...range.getClientRects()].map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}))});}return result;};
  const measure=element=>({rect:box(element),visible:visible(element),layoutRects:element.getClientRects().length,clientWidth:element.clientWidth,clientHeight:element.clientHeight,scrollWidth:element.scrollWidth,scrollHeight:element.scrollHeight});
  const controls=[...hud.children].map(element=>{
    const kind=element.matches('.career-mobile-progress-button')?'progress':element.matches('.career-mobile-coins')?'coins':element.matches('.career-mobile-orders-button')?'orders':element.matches('.career-mobile-return')?'return':element.matches('.career-mobile-more-button')?'more':'unknown';
    const selectors=kind==='progress'?[':scope > strong',':scope > span']:kind==='coins'?[':scope > strong',':scope > small']:kind==='orders'||kind==='more'?[':scope > span']:kind==='return'?['self']:[];
    return{kind,...measure(element),text:measureText(element),labels:selectors.map(selector=>{const label=selector==='self'?element:element.querySelector(selector);return{selector,present:!!label,text:measureText(label)};})};
  });
  return{hud:measure(hud),controls};
}

// Pure checks make the evidence fail closed without relying on screenshots.
export function hudReadabilityViolations(proof) {
  const errors=[],tolerance=1;
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const keys=(v,names)=>object(v)&&Object.keys(v).length===names.length&&names.every(name=>Object.hasOwn(v,name));
  const rectKeys=['x','y','right','bottom','width','height'];
  const measureKeys=['rect','visible','layoutRects','clientWidth','clientHeight','scrollWidth','scrollHeight'];
  const valid=r=>keys(r,rectKeys)&&rectKeys.every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0&&Math.abs(r.right-r.x-r.width)<=tolerance&&Math.abs(r.bottom-r.y-r.height)<=tolerance;
  const inside=(a,b)=>a.x>=b.x-tolerance&&a.y>=b.y-tolerance&&a.right<=b.right+tolerance&&a.bottom<=b.bottom+tolerance;
  const measure=(m,prefix)=>{
    if(m.visible!==true||!valid(m.rect)||!Number.isSafeInteger(m.layoutRects)||m.layoutRects<=0)errors.push(`${prefix}: hidden, malformed or zero-size layout`);
    for(const axis of ['Width','Height']){const client=m['client'+axis],scroll=m['scroll'+axis];if(!Number.isSafeInteger(client)||client<=0||!Number.isSafeInteger(scroll)||scroll<0||scroll<client-tolerance||scroll>client+tolerance)errors.push(`${prefix}: malformed measurement or content overflows control ${axis.toLowerCase()}`);}
  };
  if(!keys(proof,['hud','controls']))return['Malformed HUD evidence root'];
  if(!keys(proof.hud,measureKeys))errors.push('HUD is absent or has malformed visibility/layout fields');else measure(proof.hud,'HUD');
  if(!Array.isArray(proof.controls)||proof.controls.length!==4){errors.push('Exactly four HUD controls are required');return errors;}
  const expected=[['progress'],['coins'],['orders','return'],['more']];
  for(const [i,c]of proof.controls.entries()){
    const prefix=`HUD control ${i} (${c?.kind??'missing'})`;
    if(!keys(c,['kind',...measureKeys,'text','labels'])||!expected[i].includes(c.kind)){errors.push(`${prefix}: missing or malformed control`);continue;}
    measure(c,prefix);
    if(valid(c.rect)&&valid(proof.hud?.rect)&&!inside(c.rect,proof.hud.rect))errors.push(`${prefix}: extends outside HUD`);
    const checkText=(text,label)=>{
      if(!Array.isArray(text)||!text.length){errors.push(`${prefix}: missing text in ${label}`);return;}
      for(const t of text){if(!keys(t,['text','visible','parent','rects'])||typeof t.text!=='string'||!t.text.trim()||t.visible!==true||!Array.isArray(t.rects)||!t.rects.length){errors.push(`${prefix}: hidden or malformed text in ${label}`);continue;}
        for(const r of t.rects){if(!valid(r)){errors.push(`${prefix}: zero-size or malformed text rectangle in ${label}`);continue;}if(!valid(c.rect)||!inside(r,c.rect))errors.push(`${prefix}: text overflows its own control in ${label}`);if(!valid(t.parent)||!inside(r,t.parent))errors.push(`${prefix}: text overflows its label in ${label}`);}
      }
    };
    checkText(c.text,'control');const selectors=c.kind==='progress'?[':scope > strong',':scope > span']:c.kind==='coins'?[':scope > strong',':scope > small']:c.kind==='return'?['self']:[':scope > span'];
    if(!Array.isArray(c.labels)||c.labels.length!==selectors.length)errors.push(`${prefix}: missing required label slots`);
    for(const [j,selector]of selectors.entries()){const label=c.labels?.[j];if(!keys(label,['selector','present','text'])||label.present!==true||label.selector!==selector)errors.push(`${prefix}: missing or malformed label ${selector}`);else checkText(label.text,selector);}
    const fragments=(Array.isArray(c.text)?c.text:[]).flatMap(t=>t?.visible===true&&Array.isArray(t.rects)?t.rects.filter(valid):[]);
    for(let a=0;a<fragments.length;a++)for(let b=a+1;b<fragments.length;b++){const x=fragments[a],y=fragments[b];if(Math.min(x.right,y.right)>Math.max(x.x,y.x)&&Math.min(x.bottom,y.bottom)>Math.max(x.y,y.y))errors.push(`${prefix}: overlapping text rectangles`);}
  }
  for(let i=0;i<proof.controls.length;i++)for(let j=i+1;j<proof.controls.length;j++){
    const a=proof.controls[i]?.rect,b=proof.controls[j]?.rect;if(!valid(a)||!valid(b))continue;
    const x=Math.min(a.right,b.right)-Math.max(a.x,b.x),y=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);
    if(x>0&&y>0)errors.push(`HUD controls ${i}/${j}: overlapping rectangles`);
    else if(y>tolerance&&-x<5)errors.push(`HUD controls ${i}/${j}: horizontal separation below 5px`);
  }
  return errors;
}
