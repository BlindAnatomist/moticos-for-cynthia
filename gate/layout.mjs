// Standard play is deliberately stricter than optional panels or user-selected
// large text. Never infer a scrolling exception merely because content overflowed.
export const PHONE_VIEWPORTS=Object.freeze([{width:320,height:568},{width:390,height:664},{width:390,height:844},{width:430,height:932}]);
export const MOBILE_CORE=Object.freeze(['.career-mobile-hud','.career-mobile-order-strip','.career-board','.career-producers','.career-tools','.career-status']);
export const DESKTOP_CORE=Object.freeze(['.career-header','.career-chapter-row','.career-board','.career-order-list','.career-progress','.career-producers','.career-tools','.career-status']);
export function layoutViolations(proof,{mode='standard-phone',expectedBasicSources=0,expectedSend=1}={}){
 const errors=[],w=proof.width,h=proof.height;
 if(!['standard-phone','desktop','large-text','panel'].includes(mode))errors.push('unknown layout policy');
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)errors.push('invalid viewport');
 if(proof.scrollWidth>w+1)errors.push('horizontal page overflow');
 const core=mode==='standard-phone'||mode==='desktop';
 if((mode==='standard-phone'&&proof.scrollHeight>h+1)||(core&&Math.abs(proof.scrollY)>1))errors.push('standard play requires page scrolling');
 if(mode==='standard-phone'&&proof.largeText)errors.push('large-text preference cannot bypass a standard-phone test');
 if(mode==='large-text'&&!proof.largeText)errors.push('large-text exception must be explicitly selected');
 if(mode==='panel'&&!proof.modal)errors.push('panel exception requires an open optional panel');
 const inside=b=>b&&b.width>0&&b.height>0&&b.x>=-.5&&b.y>=-.5&&b.right<=w+.5&&b.bottom<=h+.5;
 if(core)for(const name of mode==='standard-phone'?MOBILE_CORE:DESKTOP_CORE)if(!inside(proof.bounds[name]))errors.push(`outside viewport: ${name}`);
 if(mode==='standard-phone'){
  const count=kind=>proof.controls.filter(c=>c.kind===kind).length;
  for(const[kind,n]of[['cell',25],['supply',2],['basic-supply',expectedBasicSources],['undo',1],['send',expectedSend]])if(count(kind)!==n)errors.push(`missing essential ${kind}: ${count(kind)}/${n}`);
  for(const control of proof.controls){if(!inside(control.box))errors.push(`offscreen control: ${control.label}`);if(control.box.width<43.5||control.box.height<43.5)errors.push(`small touch target: ${control.label}`);}
 }
 if(mode==='large-text'||mode==='panel')for(const control of proof.controls)if(control.box.width<43.5||control.box.height<43.5)errors.push(`small accessible target: ${control.label}`);
 return errors;
}
export function gridViolations(cells){
 const errors=[];if(cells.length!==25)return ['Board must expose 25 cells'];
 if(cells.some(c=>!Number.isFinite(c.width)||!Number.isFinite(c.height)||c.width<43.5||c.height<43.5))errors.push('Every cell must have a real 44px hit target');
 const heights=cells.map(c=>c.height);if(Math.max(...heights)-Math.min(...heights)>1)errors.push('All five rows must remain equal');
 for(let r=0;r<5;r++){const row=cells.slice(r*5,r*5+5);if(Math.max(...row.map(c=>c.y))-Math.min(...row.map(c=>c.y))>1)errors.push(`Row ${r+1} is not aligned`);}
 return errors;
}
