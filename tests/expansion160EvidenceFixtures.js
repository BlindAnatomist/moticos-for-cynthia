import {CHOOSER_CONTRACT,CHOOSER_STYLE_PROPERTIES,chooserProbeCoordinates,classifyChooserVisibility} from '../scripts/expansion160ChooserVisibility.mjs';
import {COLLECTION_CASE_TIMEOUT_MS,JOURNEY_CASE_TIMEOUT_MS} from '../scripts/expansion160Scope.mjs';
export function collectionEvents(envelope,profile='profile') {
 let t=0;const out=[],add=(event,more={})=>out.push({event,elapsedMs:t++,...more});
 const images=envelope.pieceIds.map((id,i)=>({source:`http://127.0.0.1:4197/${id}.webp`,complete:true,naturalWidth:768,naturalHeight:768,rect:{x:20+(i%5)*40,y:i<5?100:800,width:30,height:80},centerHit:i<5,hitPoints:Array.from({length:5},()=>({hit:true}))}));
 const state={dialogCount:1,open:true,modal:true,visible:true,bodyOverflow:'hidden',envelope:envelope.id,images,hitTests:Array.from({length:3},()=>({insideDialog:true})),rect:{x:0,y:0,width:350,height:600},scrollTop:0,occlusionRect:{x:0,y:0,width:350,height:70},viewport:{width:350,height:600}};
 add('begin',{profile,envelope:envelope.id,timeoutMs:COLLECTION_CASE_TIMEOUT_MS});add('seeded',{count:16});add('board-ready',{history:100});add('open-start');add('dialog-open');images.forEach((image,i)=>{add('image-start',{image:i});add('image-decoded',{image:i,source:image.source,naturalWidth:768,naturalHeight:768});});
 for(let capture=0;capture<2;capture++){const s=structuredClone(state);s.scrollTop=capture*700;s.images.forEach((image,i)=>{image.rect.y=Math.floor(i/5)===capture?100:800;image.centerHit=Math.floor(i/5)===capture;});add('capture-before',{capture,target:capture*5,state:s});add('capture-after',{capture,target:capture*5,state:structuredClone(s),path:`expansion160-test-results/storage-views/${profile}-collection-${envelope.id}-${capture}.png`});}
 add('visual-coverage-complete',{images:Array.from({length:10},(_,i)=>i),captures:2,pieceIds:envelope.pieceIds});add('closed');const chooser=chooserFixture({envelope:envelope.id,sources:envelope.starters.map(id=>images[envelope.pieceIds.indexOf(id)].source)});add('chooser-before',{state:chooser,pieceIds:envelope.starters});add('chooser-after',{state:structuredClone(chooser),path:`expansion160-test-results/storage-views/${profile}-chooser-${envelope.id}.png`});add('chooser-closed');add('read-only-bytes-verified',{count:16});add('undo-verified',{history:99});add('reload-verified');add('second-undo-verified',{history:98});add('other-saved-bytes-verified',{count:15});add('complete');return out;
}
export function journeyEvents(envelope,profile='profile'){
 let t=0;const out=[],add=(event,more={})=>out.push({event,elapsedMs:t++,...more});add('begin',{profile,envelope:envelope.id,timeoutMs:JOURNEY_CASE_TIMEOUT_MS});add('fresh-save',{raw:null});
 const stage=(id,label=id)=>{add('stage-start',{id,label});add('stage-complete',{id,label,sizes:['native','320x568']});};
 for(const starter of envelope.starters){const family=envelope.pieceIds.filter(id=>id.slice(0,-1)===starter.slice(0,-1));stage(starter);for(let tier=0;tier<4;tier++){for(let i=0;i<2**(3-tier);i++)add('merge',{from:family[tier],to:family[tier+1],method:'tap'});stage(family[tier+1]);if(tier>=1){add('export-start',{id:family[tier+1]});add('export-complete',{id:family[tier+1],sha256:'a'.repeat(64),bytes:20000});}}for(let i=0;i<6;i++)add('supply',{starter});stage(family[4],`idle-${family[4]}`);}
 add('complete',{merges:30,draws:12,discoveries:10,postcards:6});return out;
}
export function geometryFixture(viewport,id){
 const box={name:'fixture',left:0,top:100,right:44,bottom:144,width:44,height:44,hiddenBy:[],clippedBy:[],hitTests:Array.from({length:5},()=>({clear:true})),scrollWidth:44,clientWidth:44,scrollHeight:44,clientHeight:44};
 const cells=Array.from({length:25},(_,i)=>({...box,name:`Cell ${i}`,cell:String(i),piece:i===0?id:'empty'}));
 const controls=[...cells,...['Undo','Cut','Hint','Collection','Envelopes','Fresh envelope','How to play','Sound','Supply a','Supply b','Postcard'].map(name=>({...box,name,cell:null,piece:null}))];
 const regions=Array.from({length:8},(_,i)=>({...box,name:`Region ${i}`,top:i*10,bottom:i*10+9,height:9,scrollHeight:9,clientHeight:9,cell:null,piece:null}));
 return {viewport:{...viewport,scrollX:0,scrollY:0,visual:null},document:viewport,body:viewport,shell:box,controls,regions,text:[{...box,name:'Visible label',display:'block',visibility:'visible',opacity:1,block:true,font:12,textBox:{left:0,right:44,top:100,bottom:144}}],artwork:[{...box,pieceId:id,source:`http://127.0.0.1:4197/${id}.webp`,complete:true,naturalWidth:768,naturalHeight:768,cropped:false}]};
}

// Explicitly synthetic chooser observations, including exact-identity and
// default-style data. These are not records of a browser execution.
export function fullRect({x,y,width,height}) {return {x,y,width,height,top:y,right:x+width,bottom:y+height,left:x};}
export function chooserFixture({envelope='fixture',sources=['http://127.0.0.1:4197/piece0.webp','http://127.0.0.1:4197/piece5.webp'],rectangles=[{x:20,y:100,width:40,height:70},{x:70,y:100,width:40,height:70}],devicePixelRatio=1}={}) {
 const rects=rectangles.map(fullRect),state={dialogCount:1,open:true,modal:true,bodyOverflow:'hidden',envelope,rect:fullRect({x:0,y:0,width:350,height:600}),scrollTop:0,occlusionRect:{x:0,y:0,width:350,height:70},viewport:{width:350,height:600}};
 const style=Object.fromEntries(CHOOSER_STYLE_PROPERTIES.map(p=>[p,'none']));
 Object.assign(style,{display:'block',visibility:'visible',opacity:'1','pointer-events':'auto',zoom:'1',clip:'auto','outline-width':'0px','overflow-x':'visible','overflow-y':'visible','overflow-clip-margin':'0px','object-fit':'contain','object-position':'50% 50%','content-visibility':'visible','mix-blend-mode':'normal','border-image-outset':'0','border-image-width':'1',content:'normal'});
 for(const side of ['top','right','bottom','left']){style[`border-${side}-width`]='0px';style[`padding-${side}`]='0px';}
 for(const corner of ['top-left','top-right','bottom-left','bottom-right'])style[`border-${corner}-radius`]='0px';
 const element=(index,tag,rect,parent,pairedImageIndex=null)=>({elementId:`e${index}`,parentId:parent===null?null:`e${parent}`,tag,envelope:index===3?envelope:null,pairedImageIndex,source:pairedImageIndex===null?null:sources[pairedImageIndex],rect,client:{left:0,top:0,width:rect.width,height:rect.height},styles:{...style},pseudo:{before:'none',after:'none'},activeAnimations:0});
 const union=fullRect({x:Math.min(...rects.map(r=>r.x)),y:Math.min(...rects.map(r=>r.y)),width:Math.max(...rects.map(r=>r.right))-Math.min(...rects.map(r=>r.x)),height:Math.max(...rects.map(r=>r.bottom))-Math.min(...rects.map(r=>r.y))});
 const card=fullRect({x:union.x-15,y:union.y-15,width:union.width+30,height:union.height+30});
 const elements=[element(0,'IMG',rects[0],2,0),element(1,'IMG',rects[1],2,1),element(2,'DIV',union,3),element(3,'ARTICLE',card,4),element(4,'DIALOG',state.rect,5),element(5,'HTML',state.rect,null)];
 state.images=rects.map((rect,index)=>({elementId:`e${index}`,source:sources[index],complete:true,naturalWidth:768,naturalHeight:768,rect,centerHit:true,centerTarget:chooserTarget(elements[index]),hitPoints:chooserProbeCoordinates(rect).map(p=>({...p,hit:true,target:chooserTarget(elements[index])})),stableHitPoints:chooserProbeCoordinates(rect,true).map(p=>({...p,hit:true,target:chooserTarget(elements[index])}))}));
 state.chooserEvidence={contract:CHOOSER_CONTRACT,devicePixelRatio,rootElementId:'e5',dialogElementId:'e4',cardElementId:'e3',pairContainerId:'e2',pairElementIds:['e0','e1'],supportedProperties:Object.fromEntries(CHOOSER_STYLE_PROPERTIES.map(p=>[p,true])),elements};
 return classifyFixture(state);
}
export function chooserTarget(element) {return structuredClone({elementId:element.elementId,pairedImageIndex:element.pairedImageIndex,tag:element.tag,source:element.source,rect:element.rect});}
export function classifyFixture(state) {state.chooserEvidence.classification=classifyChooserVisibility(state);return state;}
export function setChooserProbeTarget(state,image,probe,target,{stable=false}={}) {const point=state.images[image][stable?'stableHitPoints':'hitPoints'][probe],element=typeof target==='number'?state.chooserEvidence.elements[target]:target;point.hit=element?.elementId===state.images[image].elementId;point.target=element?chooserTarget(element):null;return classifyFixture(state);}

// Immutable original negative sample (no stable probes, identity evidence or
// expanded style diagnostics were captured). It must still fail this contract.
export const originalNegativeChooser=deepFreeze({
 "capturedAt": "2026-10-06T23:53:59.240Z",
 "dialogCount": 1,
 "open": true,
 "modal": true,
 "bodyOverflow": "hidden",
 "envelope": "matching-garden",
 "occlusionRect": {
  "x": 19,
  "y": 12,
  "width": 352,
  "height": 77
 },
 "rect": {
  "x": 19,
  "y": 12,
  "width": 352,
  "height": 640,
  "top": 12,
  "right": 371,
  "bottom": 652,
  "left": 19
 },
 "scrollTop": 268,
 "viewport": {
  "width": 390,
  "height": 664
 },
 "images": [
  {
   "source": "http://127.0.0.1:4197/assets/b1-BHLkq9iW.webp",
   "complete": true,
   "naturalWidth": 768,
   "naturalHeight": 768,
   "rect": {
    "x": 55,
    "y": 296.65625,
    "width": 44,
    "height": 70,
    "top": 296.65625,
    "right": 99,
    "bottom": 366.65625,
    "left": 55
   },
   "hitPoints": [
    {
     "x": 55.88,
     "y": 298.05625,
     "hit": true
    },
    {
     "x": 98.12,
     "y": 298.05625,
     "hit": false
    },
    {
     "x": 55.88,
     "y": 365.25625,
     "hit": true
    },
    {
     "x": 98.12,
     "y": 365.25625,
     "hit": false
    },
    {
     "x": 77,
     "y": 331.65625,
     "hit": true
    }
   ],
   "centerHit": true
  },
  {
   "source": "http://127.0.0.1:4197/assets/f1-MAV1rHHi.webp",
   "complete": true,
   "naturalWidth": 768,
   "naturalHeight": 768,
   "rect": {
    "x": 99,
    "y": 296.65625,
    "width": 44,
    "height": 70,
    "top": 296.65625,
    "right": 143,
    "bottom": 366.65625,
    "left": 99
   },
   "hitPoints": [
    {
     "x": 99.88,
     "y": 298.05625,
     "hit": true
    },
    {
     "x": 142.12,
     "y": 298.05625,
     "hit": true
    },
    {
     "x": 99.88,
     "y": 365.25625,
     "hit": true
    },
    {
     "x": 142.12,
     "y": 365.25625,
     "hit": true
    },
    {
     "x": 121,
     "y": 331.65625,
     "hit": true
    }
   ],
   "centerHit": true
  }
 ]
});
function deepFreeze(value) {if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}
