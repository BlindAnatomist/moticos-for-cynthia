// Chooser-only CSS-coordinate measurement contract. The ordinary collection
// sampler is intentionally unchanged. No retries or device-pixel assumptions.
// V2 requires observed padding; a V1 record is never silently upgraded.
export const CHOOSER_CONTRACT = 'chooser-shared-edge-css-v2';
export const CHOOSER_STYLE_PROPERTIES = [
 'display','visibility','opacity','pointer-events','transform','translate','rotate','scale','zoom','perspective',
 'filter','backdrop-filter','clip','clip-path','mask-image','-webkit-mask-image','-webkit-box-reflect','offset-path',
 'box-shadow','text-shadow','outline-style','outline-width','overflow-x','overflow-y','overflow-clip-margin',
 'border-top-width','border-right-width','border-bottom-width','border-left-width',
 'padding-top','padding-right','padding-bottom','padding-left',
 'border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius',
 'object-fit','object-position','contain','content-visibility','mix-blend-mode','mask-border-source','-webkit-mask-box-image-source',
 '-webkit-backdrop-filter','border-image-source','border-image-outset','border-image-width','content','object-view-box',
];
const REQUIRED_STYLES = ['display','visibility','opacity','pointer-events','transform','filter','clip','clip-path','box-shadow','text-shadow','outline-style','outline-width','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius','object-fit','object-position','padding-top','padding-right','padding-bottom','padding-left'];
const finite = n => typeof n === 'number' && Number.isFinite(n);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const rectKeys = ['x','y','width','height','top','right','bottom','left'];
export function chooserRectValid(r) {
 return !!r && rectKeys.every(k=>finite(r[k])) && r.width>0 && r.height>0 && r.left===r.x && r.top===r.y && r.right===r.x+r.width && r.bottom===r.y+r.height;
}
export function chooserProbeCoordinates(r, stable=false) {
 if(!chooserRectValid(r)) return [];
 if(!stable) return [[.02,.02],[.98,.02],[.02,.98],[.98,.98],[.5,.5]].map(([x,y])=>({x:r.x+r.width*x,y:r.y+r.height*y}));
 const x=Math.max(r.width*.02,2),y=Math.max(r.height*.02,2);
 if(r.width<=2*x||r.height<=2*y)return [];
 return [{x:r.x+x,y:r.y+y},{x:r.right-x,y:r.y+y},{x:r.x+x,y:r.bottom-y},{x:r.right-x,y:r.bottom-y},{x:r.x+r.width/2,y:r.y+r.height/2}];
}
const inside=(p,r)=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom;
const contains=(outer,inner)=>inner.left>=outer.left&&inner.right<=outer.right&&inner.top>=outer.top&&inner.bottom<=outer.bottom;
const px=v=>typeof v==='string'&&/^\d+(?:\.\d+)?px$/.test(v)?Number(v.slice(0,-2)):NaN;
const zero=v=>v==='0px';
const noRadius=v=>v==='0px';
// Admit only an explicit content-box edge with no expansion. A missing length
// means zero. The two orders are equivalent CSS grammar, not extra clip boxes.
function zeroContentBoxClipMargin(value) {
 // Exact reviewed serializations reject non-CSS whitespace and prevent
 // numeric underflow from turning a tiny positive offset into zero.
 return ['content-box','content-box 0px','0px content-box'].includes(value);
}
// Only parsed, non-inset shadows on a containing common ancestor can be
// harmless here: outer shadows paint outside that ancestor's border box and
// do not enlarge a descendant IMG's hit region. Image shadows always reject.
function outerShadow(value) {
 if(typeof value!=='string')return false;
 return value.split(/,(?![^()]*\))/).every(shadow=>{
  // Only the known CSSOM sRGB serialization is admitted. Unknown color
  // spaces, two colors, malformed channels, inset and extra tokens reject.
  const item=shadow.trim(),prefix=item.match(/^(rgba?\([^()]+\))\s+(.+)$/),suffix=item.match(/^(.+)\s+(rgba?\([^()]+\))$/);
  const color=prefix?.[1]??suffix?.[2],lengthText=prefix?.[2]??suffix?.[1];
  const rgb=color?.match(/^rgb(a?)\(([^()]+)\)$/);
  if(!rgb||!lengthText)return false;
  const parts=rgb[2].split(',').map(v=>v.trim());
  if(parts.length!==(rgb[1]?4:3)||parts.some(v=>!/^\d+(?:\.\d+)?$/.test(v)))return false;
  const channels=parts.map(Number);
  if(channels.some(v=>!finite(v))||channels.slice(0,3).some(v=>v<0||v>255)||(rgb[1]&&(channels[3]<0||channels[3]>1)))return false;
  const tokens=lengthText.trim().split(/\s+/);
  if(tokens.length<2||tokens.length>4||tokens.some(v=>!/^(-?\d+(?:\.\d+)?)px$/.test(v)))return false;
  const lengths=tokens.map(v=>Number(v.slice(0,-2)));
  return lengths.every(finite)&&(lengths.length<3||lengths[2]>=0);
 });
}

function geometryErrors(state, elements, byId) {
 const errors=[],e=state.chooserEvidence,images=state.images,observedAncestry=new Set();
 const fail=reason=>errors.push(reason);
 if(!e.supportedProperties||CHOOSER_STYLE_PROPERTIES.some(p=>typeof e.supportedProperties[p]!=='boolean')||REQUIRED_STYLES.some(p=>e.supportedProperties[p]!==true))fail('missing CSS property support evidence');
 // Even DOM ancestors above the top-layer dialog must have complete raw
 // records. Their effects are not applied as clipping constraints below.
 for(const node of elements) {
  const c=node.client,s=node.styles;
  if(!chooserRectValid(node.rect)||!c||![c.left,c.top,c.width,c.height].every(finite)||c.left<0||c.top<0||c.width<=0||c.height<=0||!s||CHOOSER_STYLE_PROPERTIES.some(p=>e.supportedProperties?.[p]===true?(typeof s[p]!=='string'||s[p]===''):s[p]!==null)||typeof node.pseudo?.before!=='string'||typeof node.pseudo?.after!=='string'||!Number.isInteger(node.activeAnimations)||node.activeAnimations<0||typeof node.tag!=='string'||!(node.envelope===null||typeof node.envelope==='string')||!(node.source===null||typeof node.source==='string'))fail(`geometry ${node.elementId}: malformed raw element snapshot`);
 }

 const chains=images.map((image,index)=>{
  const chain=[],seen=new Set();let node=byId.get(image.elementId);
  while(node&&!seen.has(node.elementId)){chain.push(node);seen.add(node.elementId);observedAncestry.add(node.elementId);node=byId.get(node.parentId);}
  if(node||chain.at(-1)?.elementId!==e.rootElementId||chain.at(-1)?.tag!=='HTML'||chain.at(-1)?.parentId!==null)fail(`image ${index}: incomplete or cyclic ancestry`);
  if(chain[1]?.elementId!==e.pairContainerId||!chain.some(n=>n.elementId===e.cardElementId)||!chain.some(n=>n.elementId===e.dialogElementId))fail(`image ${index}: not the recorded chooser pair`);
  // A verified modal is in the top layer; DOM ancestors above it do not
  // establish clipping or paint effects for its descendants. Keep the full
  // chain in raw evidence, but guard the complete image-to-modal segment.
  return chain.slice(0,chain.findIndex(n=>n.elementId===e.dialogElementId)+1);
 });
 if(elements.some(n=>!observedAncestry.has(n.elementId)))fail('element registry contains non-ancestor targets');
 const common=new Set(chains[0].filter(n=>chains[1].some(m=>m.elementId===n.elementId)).map(n=>n.elementId));
 for(const node of new Map(chains.flat().map(n=>[n.elementId,n])).values()) {
  const c=node.client;
  if(!c||![c.left,c.top,c.width,c.height].every(finite)||c.left<0||c.top<0||c.width<=0||c.height<=0)fail(`geometry ${node.elementId}: missing or malformed client box`);
  const s=node.styles,isImage=images.some(i=>i.elementId===node.elementId),label=`geometry ${node.elementId}`;
  if(!chooserRectValid(node.rect)||!s||CHOOSER_STYLE_PROPERTIES.some(p=>e.supportedProperties?.[p]===true?(typeof s[p]!=='string'||s[p]===''):s[p]!==null)){fail(`${label}: missing or malformed styles/rectangle`);continue;}
  const supported=p=>e.supportedProperties?.[p]===true;
  const only=(p,values)=>!supported(p)||values.includes(s[p]);
  if(!['block','flex','grid','inline-block','inline-flex','inline-grid','flow-root'].includes(s.display)||s.visibility!=='visible'||s.opacity!=='1'||s['pointer-events']!=='auto')fail(`${label}: hidden or nonordinary hit geometry`);
  for(const p of ['transform','translate','rotate','scale','perspective','filter','backdrop-filter','clip-path','mask-image','-webkit-mask-image','-webkit-box-reflect','offset-path','text-shadow','mask-border-source','-webkit-mask-box-image-source','-webkit-backdrop-filter','border-image-source'])if(!only(p,['none']))fail(`${label}: ${p}`);
  if(!only('content',['normal'])||!only('object-view-box',['none'])||!only('border-image-width',['1'])||!only('mix-blend-mode',['normal'])||!only('zoom',['1','normal'])||!only('clip',['auto'])||!only('contain',['none'])||!only('content-visibility',['visible']))fail(`${label}: expanded or unknown geometry`);
  if(node.activeAnimations!==0||!node.pseudo||!['none','normal'].includes(node.pseudo.before)||!['none','normal'].includes(node.pseudo.after))fail(`${label}: animation or pseudo-element`);
  // `none` paints no outline even when the CSSOM retains the initial 3px
  // width. Other styles (including auto at zero width) remain unreviewed.
  if(s['outline-style']!=='none'||!finite(px(s['outline-width'])))fail(`${label}: outline`);
  const imageContentClip=isImage&&s['overflow-x']==='clip'&&s['overflow-y']==='clip';
  const safeClipMargin=imageContentClip?supported('overflow-clip-margin')&&zeroContentBoxClipMargin(s['overflow-clip-margin']):only('overflow-clip-margin',['0px']);
  if(!safeClipMargin||!only('border-image-outset',['0']))fail(`${label}: overflow expansion`);
  const borders=['top','right','bottom','left'].map(side=>px(s[`border-${side}-width`]));
  const radii=['top-left','top-right','bottom-left','bottom-right'].map(corner=>s[`border-${corner}-radius`]);
  if(borders.some(v=>!finite(v)))fail(`${label}: unknown border`);
  if(isImage) {
   // Zero borders AND observed zero padding equate the IMG content box and
   // sampled border rectangle. Ancestor padding is ordinary layout and is not
   // required to be zero. Unknown/missing padding must fail closed.
   if(['top','right','bottom','left'].some(side=>!zero(s[`padding-${side}`])))fail(`${label}: image padding`);
   const visibleOverflow=s['overflow-x']==='visible'&&s['overflow-y']==='visible';
   if(s['box-shadow']!=='none'||borders.some(v=>v!==0)||radii.some(v=>!noRadius(v))||s['object-fit']!=='contain'||s['object-position']!=='50% 50%'||!(visibleOverflow||imageContentClip))fail(`${label}: expanded or nonrectangular image paint`);
  } else {
   if(s['box-shadow']!=='none'&&(!common.has(node.elementId)||!outerShadow(s['box-shadow'])||images.some(i=>!contains(node.rect,i.rect))))fail(`${label}: ancestor shadow`);
   if(!['visible','auto','scroll','hidden','clip'].includes(s['overflow-x'])||!['visible','auto','scroll','hidden','clip'].includes(s['overflow-y']))fail(`${label}: unknown overflow`);
   // Fully contain both images inside every shared ancestor's conservative
   // rounded inner rectangle. This also excludes border/radius clipping.
   const radius=radii.map(v=>px(v));
   if(radius.some(v=>!finite(v)))fail(`${label}: unknown corner radius`);
   if(common.has(node.elementId)) {
    const inset=Math.max(...borders,...radius),r=node.rect,c=node.client;
    if(!c||![c.left,c.top,c.width,c.height].every(finite)||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>r.width+.5||c.top+c.height>r.height+.5){fail(`${label}: missing or invalid client rectangle`);continue;}
    const inner={left:Math.max(r.left+inset,r.left+c.left),right:Math.min(r.right-inset,r.left+c.left+c.width),top:Math.max(r.top+inset,r.top+c.top),bottom:Math.min(r.bottom-inset,r.top+c.top+c.height)};
    if(images.some(i=>!contains(inner,i.rect)))fail(`${label}: ancestor clipping or border paint`);
   }
  }
 }
 return errors;
}
function targetMatches(point, index, images, byId) {
 const target=point?.target,element=target&&byId.get(target.elementId),image=images[index];
 return !!target&&!!element&&target.pairedImageIndex===index&&element.pairedImageIndex===index&&target.elementId===image.elementId&&target.tag==='IMG'&&element.tag==='IMG'&&target.source===image.source&&element.source===image.source&&same(target.rect,image.rect)&&same(element.rect,image.rect);
}
function ambiguity(point, self, other) {
 const a=self.rect,b=other.rect;
 if(!inside(point,a)||inside(point,b)||point.x===b.left||point.x===b.right||point.y===b.top||point.y===b.bottom)return null;
 const edges=[
  ['right',a.right===b.left&&point.y>Math.max(a.top,b.top)&&point.y<Math.min(a.bottom,b.bottom),a.right-point.x],
  ['left',a.left===b.right&&point.y>Math.max(a.top,b.top)&&point.y<Math.min(a.bottom,b.bottom),point.x-a.left],
  ['bottom',a.bottom===b.top&&point.x>Math.max(a.left,b.left)&&point.x<Math.min(a.right,b.right),a.bottom-point.y],
  ['top',a.top===b.bottom&&point.x>Math.max(a.left,b.left)&&point.x<Math.min(a.right,b.right),point.y-a.top],
 ];
 const match=edges.find(([,shared,distance])=>shared&&distance>0&&distance<=1);
 return match?{kind:'adjacent-pair-ambiguity',edge:match[0],distanceCssPx:match[2]}:null;
}
function classifyChooserVisibilityUnchecked(state) {
 const result={contract:CHOOSER_CONTRACT,accepted:false,violations:[],images:[]},fail=s=>result.violations.push(s);
 const evidence=state?.chooserEvidence,images=state?.images;
 if(state?.dialogCount!==1||state?.open!==true||state?.modal!==true||state?.bodyOverflow!=='hidden'||typeof state?.envelope!=='string'||!state.envelope)fail('invalid open modal chooser state');
 if(!evidence||evidence.contract!==CHOOSER_CONTRACT||!Array.isArray(images)||images.length!==2||!Array.isArray(evidence.elements)){fail('missing chooser observation schema');return result;}
 const elements=evidence.elements,byId=new Map(elements.map(n=>[n?.elementId,n]));
 if(elements.some(n=>!n||typeof n.elementId!=='string'||!/^e\d+$/.test(n.elementId)||!(n.parentId===null||typeof n.parentId==='string'))||byId.size!==elements.length){fail('missing or duplicate element identity');return result;}
 if(!finite(evidence.devicePixelRatio)||evidence.devicePixelRatio<=0||!Array.isArray(evidence.pairElementIds)||!same(evidence.pairElementIds,images.map(i=>i.elementId))||new Set(evidence.pairElementIds).size!==2)fail('invalid paired-image identity evidence');
 const pairs=elements.filter(n=>n.pairedImageIndex!==null);
 if(pairs.length!==2||images.some((image,i)=>byId.get(image.elementId)?.pairedImageIndex!==i))fail('spoofed paired-image identity');
 if(byId.get(evidence.dialogElementId)?.tag!=='DIALOG'||byId.get(evidence.cardElementId)?.envelope!==state.envelope||byId.get(evidence.pairContainerId)?.parentId!==evidence.cardElementId||byId.get(evidence.cardElementId)?.tag!=='ARTICLE'||byId.get(evidence.pairContainerId)?.tag!=='DIV'||!same(byId.get(evidence.dialogElementId)?.rect,state.rect))fail('invalid chooser container identity');
 if(images.some(image=>!chooserRectValid(image.rect)||typeof image.source!=='string'||!image.source)){fail('invalid image rectangle/source');return result;}
 const [a,b]=images.map(i=>i.rect);
 if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))fail('paired image interiors overlap');
 const geometry=geometryErrors(state,elements,byId);geometry.forEach(fail);
 const d=state.rect,v=state.viewport,o=state.occlusionRect;
 if(!d||!v||!o||![d.x,d.y,d.width,d.height,v.width,v.height,o.x,o.y,o.width,o.height].every(finite)||d.width<=0||d.height<=0||v.width<=0||v.height<=0||o.width<=0||o.height<=0)fail('missing dialog/viewport/header bounds');
 images.forEach((image,index)=>{
  const row={original:[],stable:[]};result.images.push(row);const r=image.rect;
  if(image.complete!==true||!finite(image.naturalWidth)||image.naturalWidth<=0||!finite(image.naturalHeight)||image.naturalHeight<=0||image.centerHit!==true)fail(`image ${index}: loading, dimensions or center`);
  if(!targetMatches({target:image.centerTarget},index,images,byId))fail(`image ${index}: center target identity`);
  if(d&&v&&o) {
   if(r.x<o.x+o.width&&r.right>o.x&&r.y<o.y+o.height&&r.bottom>o.y)fail(`image ${index}: header overlap`);
   if(!(r.x>=Math.max(0,d.x)-.5&&r.y>=Math.max(0,d.y)-.5&&r.right<=Math.min(v.width,d.x+d.width)+.5&&r.bottom<=Math.min(v.height,d.y+d.height)+.5))fail(`image ${index}: clipped dialog/viewport bounds`);
  }
  for(const [field,stable] of [['hitPoints',false],['stableHitPoints',true]]) {
   const points=image[field],expected=chooserProbeCoordinates(r,stable),out=stable?row.stable:row.original;
   if(!Array.isArray(points)||points.length!==5||expected.length!==5){fail(`image ${index}: missing/distinct ${field}`);continue;}
   points.forEach((point,p)=>{
    let classification={kind:'rejected'};
    if(!point||point.x!==expected[p].x||point.y!==expected[p].y||typeof point.hit!=='boolean'||!inside(point,r)){fail(`image ${index}: malformed ${field} ${p}`);out.push(classification);return;}
    if(point.hit===true&&targetMatches(point,index,images,byId))classification={kind:'exact-self'};
    else if(!stable&&p!==4&&point.hit===false&&targetMatches(point,1-index,images,byId)&&geometry.length===0)classification=ambiguity(point,image,images[1-index])??classification;
    if(classification.kind==='rejected')fail(`image ${index}: rejected ${field} ${p}`);
    out.push(classification);
   });
  }
 });
 result.accepted=result.violations.length===0;return result;
}

export function classifyChooserVisibility(state) {
 try { return classifyChooserVisibilityUnchecked(state); }
 catch { return {contract:CHOOSER_CONTRACT,accepted:false,violations:['malformed chooser observation'],images:[]}; }
}
