// Pure Node regressions; registered by the existing Vitest harness as well.
// All enriched observations and mocked DOM captures here are SYNTHETIC.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {CHOOSER_CONTRACT,CHOOSER_STYLE_PROPERTIES,classifyChooserVisibility,chooserProbeCoordinates} from '../scripts/expansion160ChooserVisibility.mjs';
import {verifyChooserState,verifyEnvelopeJournal,visibleImageIndices,openEnvelopeJournal} from '../scripts/expansion160CollectionEvidence.mjs';
import {chooserState} from './expansion160-browser/collection-evidence.js';
import {chooserFixture,chooserTarget,setChooserProbeTarget,classifyFixture,fullRect,collectionEvents,originalNegativeChooser} from './expansion160EvidenceFixtures.js';
export const chooserVisibilityCases=[];
const test=(name,run)=>chooserVisibilityCases.push({name,run});
const clone=value=>structuredClone(value);
const pass=state=>{assert.equal(classifyChooserVisibility(state).accepted,true,JSON.stringify(classifyChooserVisibility(state)));verifyChooserState(state,state.envelope);};
const reject=state=>{assert.equal(classifyChooserVisibility(state).accepted,false);assert.throws(()=>verifyChooserState(classifyFixture(state),state.envelope));};
const adjacent=(orientation='right',size={width:44,height:70},origin={x:55,y:200})=>{
 const first={...origin,...size};let second={...first};
 if(orientation==='right')second.x+=first.width;
 if(orientation==='left')second.x-=first.width;
 if(orientation==='bottom')second.y+=first.height;
 if(orientation==='top')second.y-=first.height;
 return chooserFixture({rectangles:[first,second]});
};
const mismatch=(state,edge='right')=>{for(const p of ({right:[1,3],left:[0,2],bottom:[2,3],top:[0,1]})[edge])setChooserProbeTarget(state,0,p,1);return state;};
const envelope={id:'fixture',pieceIds:Array.from({length:10},(_,i)=>`piece${i}`),starters:['piece0','piece5']};
function journal(state) {const events=collectionEvents(envelope);events.find(e=>e.event==='chooser-before').state=state;events.find(e=>e.event==='chooser-after').state=clone(state);return events;}
function addForeign(state,{tag='DIV',rect=state.images[1].rect,source=null}={}) {const element=clone(state.chooserEvidence.elements[1]);Object.assign(element,{elementId:'e99',pairedImageIndex:null,tag,source,rect:clone(rect)});state.chooserEvidence.elements.push(element);return element;}
function enrichedNegative() {
 const original=originalNegativeChooser;
 const state=chooserFixture({envelope:original.envelope,sources:original.images.map(i=>i.source),rectangles:original.images.map(i=>i.rect),devicePixelRatio:3});
 for(const key of ['capturedAt','dialogCount','open','modal','bodyOverflow','envelope','occlusionRect','rect','scrollTop','viewport'])state[key]=clone(original[key]);
 for(const id of ['e4','e5']){const element=state.chooserEvidence.elements.find(e=>e.elementId===id);element.rect=clone(state.rect);element.client={left:0,top:0,width:state.rect.width,height:state.rect.height};}
 return mismatch(state);
}
test('separated exact-hit control passes with distinct stable probes',()=>pass(chooserFixture()));
test('touching exact-hit control passes without ambiguity',()=>pass(adjacent()));
for(const orientation of ['right','left','top','bottom'])test(`${orientation} shared-edge ambiguity is strictly classified`,()=>{const state=mismatch(adjacent(orientation,{width:42,height:42}),orientation);pass(state);assert.equal(state.chooserEvidence.classification.images[0].original.filter(p=>p.kind==='adjacent-pair-ambiguity').length,2);});
for(const size of [{width:44,height:70},{width:42,height:42},{width:35,height:70}])for(const dpr of [1,2,3])test(`${size.width}x${size.height} fractional CSS coordinates at DPR ${dpr}`,()=>{const state=mismatch(adjacent('right',size,{x:55.125,y:200.375}));state.chooserEvidence.devicePixelRatio=dpr;classifyFixture(state);pass(state);const [stable]=state.images[0].stableHitPoints;assert.equal(stable.x-state.images[0].rect.x,2);assert.equal(stable.y-state.images[0].rect.y,2);});
test('exactly one CSS pixel ambiguity is admitted',()=>pass(mismatch(adjacent('right',{width:50,height:70}))));
test('original captured negative remains immutable and fails missing modern evidence',()=>{const before=JSON.stringify(originalNegativeChooser);assert.equal(Object.isFrozen(originalNegativeChooser.images[0].hitPoints[1]),true);assert.equal(classifyChooserVisibility(originalNegativeChooser).accepted,false);assert.throws(()=>verifyChooserState(originalNegativeChooser,originalNegativeChooser.envelope));assert.equal(JSON.stringify(originalNegativeChooser),before);});
test('synthetic enrichment preserves original negative points without claiming a browser pass',()=>{const state=enrichedNegative();pass(state);for(let i=0;i<2;i++)assert.deepEqual(state.images[i].hitPoints.map(({x,y,hit})=>({x,y,hit})),originalNegativeChooser.images[i].hitPoints);assert.deepEqual(state.images[0].hitPoints.map(p=>p.hit),[true,false,true,false,true]);assert.deepEqual(visibleImageIndices(state),[1]);});
test('stable probes retain percent inset when dimensions exceed 100 CSS pixels',()=>{const points=chooserProbeCoordinates(fullRect({x:0,y:0,width:150,height:200}),true);assert.deepEqual(points[0],{x:3,y:4});});
for(const field of ['centerHit','complete'])test(`rejects false ${field}`,()=>{const s=mismatch(adjacent());s.images[0][field]=false;reject(s);});
for(const field of ['naturalWidth','naturalHeight'])for(const value of [0,-1,NaN,'768',null])test(`rejects invalid ${field} ${String(value)}`,()=>{const s=mismatch(adjacent());s.images[0][field]=value;reject(s);});
for(const stable of [false,true])for(const p of [0,1,2,3,4])test(`rejects ${stable?'stable':'original'} unrelated overlay at probe ${p}`,()=>{const s=adjacent(),point=s.images[0][stable?'stableHitPoints':'hitPoints'][p];const foreign=addForeign(s,{rect:fullRect({x:point.x-.005,y:point.y-.005,width:.01,height:.01})});setChooserProbeTarget(s,0,p,foreign,{stable});reject(s);});
for(const p of [0,1,2,3,4])test(`rejects exact partner at stable probe ${p}`,()=>reject(setChooserProbeTarget(adjacent(),0,p,1,{stable:true})));
test('rejects exact partner at original center',()=>reject(setChooserProbeTarget(adjacent(),0,4,1)));
test('rejects false raw center query even if the original center probe passes',()=>{const s=adjacent();s.images[0].centerTarget=chooserTarget(s.chooserEvidence.elements[1]);reject(s);});
for(const tag of ['IMG','DIV'])test(`rejects unrelated ${tag} with identical partner source/rectangle`,()=>{const s=adjacent(),foreign=addForeign(s,{tag,source:s.images[1].source});setChooserProbeTarget(s,0,1,foreign);reject(s);});
test('rejects spoofed partner index on an unrelated element',()=>{const s=adjacent(),foreign=addForeign(s,{tag:'IMG',source:s.images[1].source});setChooserProbeTarget(s,0,1,foreign);s.images[0].hitPoints[1].target.pairedImageIndex=1;reject(s);});
test('rejects duplicate element ID even when snapshot resembles partner',()=>{const s=mismatch(adjacent());s.chooserEvidence.elements.push(clone(s.chooserEvidence.elements[1]));reject(s);});
test('rejects a third element declaring itself to be the partner',()=>{const s=mismatch(adjacent()),foreign=addForeign(s,{tag:'IMG',source:s.images[1].source});foreign.pairedImageIndex=1;reject(s);});
for(const amount of [.01,.5,1])for(const vertical of [false,true])test(`rejects genuine ${vertical?'vertical':'horizontal'} overlap ${amount} CSS px with clear hits`,()=>{const r0={x:55,y:200,width:44,height:70},r1={...r0,...(vertical?{y:270-amount}:{x:99-amount})};reject(chooserFixture({rectangles:[r0,r1]}));});
test('rejects neighbor that contains original probe',()=>{const s=chooserFixture({rectangles:[{x:55,y:200,width:44,height:70},{x:98,y:200,width:44,height:70}]});reject(mismatch(s));});
test('rejects 0.01 CSS pixel boundary gap',()=>{const s=chooserFixture({rectangles:[{x:55,y:200,width:44,height:70},{x:99.01,y:200,width:44,height:70}]});reject(mismatch(s));});
test('rejects target outside shared-edge span',()=>{const s=chooserFixture({rectangles:[{x:55,y:200,width:44,height:70},{x:99,y:250,width:44,height:70}]});setChooserProbeTarget(s,0,1,1);reject(s);});
test('rejects ambiguity more than one CSS pixel inside boundary',()=>reject(mismatch(adjacent('right',{width:50.01,height:70}))));
for(const position of ['exact-boundary','outside-self','wrong-coordinate','duplicate-point'])test(`rejects ${position} raw probe`,()=>{const s=mismatch(adjacent()),points=s.images[0].hitPoints;points[1].x=position==='exact-boundary'?s.images[0].rect.right:position==='outside-self'?s.images[0].rect.right+.01:position==='wrong-coordinate'?points[1].x-.001:points[0].x;reject(s);});
for(const field of ['hitPoints','stableHitPoints'])for(const mode of ['missing','incomplete','extra','duplicate','no-target','no-coordinate','wrong-hit-type'])test(`rejects ${mode} ${field}`,()=>{const s=mismatch(adjacent());if(mode==='missing')delete s.images[0][field];else if(mode==='incomplete')s.images[0][field].pop();else if(mode==='extra')s.images[0][field].push(clone(s.images[0][field][0]));else if(mode==='duplicate')s.images[0][field][1]=clone(s.images[0][field][0]);else if(mode==='no-target')delete s.images[0][field][0].target;else if(mode==='no-coordinate')delete s.images[0][field][0].x;else s.images[0][field][0].hit='true';reject(s);});
for(const field of ['elementId','pairedImageIndex','tag','source','rect'])test(`rejects changed raw target ${field}`,()=>{const s=mismatch(adjacent());s.images[0].hitPoints[1].target[field]=field==='pairedImageIndex'?null:field==='rect'?fullRect({x:99.01,y:200,width:44,height:70}):'forged';reject(s);});
for(const size of [0,1,4])test(`rejects ${size}-pixel undersized or collapsed stable geometry`,()=>reject(chooserFixture({rectangles:[{x:55,y:200,width:size,height:70},{x:55+size,y:200,width:44,height:70}]})));
for(const field of ['x','y','width','height','top','right','bottom','left'])test(`rejects malformed image rectangle ${field}`,()=>{const s=adjacent();s.images[0].rect[field]=null;reject(s);});
for(const change of [s=>s.occlusionRect.height=201,s=>s.viewport.width=98,s=>s.viewport.height=250,s=>s.rect.width=90,s=>s.occlusionRect=null,s=>s.viewport.width=NaN])test(`rejects non-hit visibility failure ${chooserVisibilityCases.length}`,()=>{const s=mismatch(adjacent());change(s);reject(s);});
for(const field of ['dialogCount','open','modal','bodyOverflow','envelope'])test(`retains ${field} requirement`,()=>{const s=chooserFixture();s[field]=null;assert.throws(()=>verifyChooserState(s,'fixture'));});
for(const field of ['rootElementId','cardElementId','dialogElementId','pairContainerId','pairElementIds','supportedProperties','elements'])test(`rejects missing ${field} evidence`,()=>{const s=mismatch(adjacent());delete s.chooserEvidence[field];reject(s);});
for(const mutate of [s=>s.chooserEvidence.elements[0].parentId='absent',s=>s.chooserEvidence.elements[1].parentId='e3',s=>s.chooserEvidence.elements[2].parentId='e0',s=>s.chooserEvidence.elements[4].parentId=null,s=>s.chooserEvidence.elements[3].envelope='wrong',s=>s.chooserEvidence.elements[0].source='wrong'])test(`rejects incomplete/mismatched identity chain ${chooserVisibilityCases.length}`,()=>{const s=mismatch(adjacent());mutate(s);reject(s);});
for(const index of [0,2,3,4])for(const [property,value] of [['transform','matrix(1, 0, 0, 1, 0, 0)'],['translate','0px'],['rotate','0deg'],['scale','1.01'],['zoom','1.01'],['perspective','100px'],['filter','blur(0.1px)'],['backdrop-filter','blur(1px)'],['-webkit-backdrop-filter','blur(1px)'],['border-image-source','url(border.png)'],['border-image-outset','1'],['border-image-width','2'],['content','url(replacement.png)'],['object-view-box','inset(2px)'],['clip','rect(0px, 40px, 70px, 0px)'],['clip-path','inset(0.01px)'],['mask-image','linear-gradient(black, black)'],['-webkit-mask-image','url(mask.svg)'],['mask-border-source','url(mask.svg)'],['-webkit-mask-box-image-source','url(mask.svg)'],['-webkit-box-reflect','below 0px'],['offset-path','path("M0 0L1 1")'],['text-shadow','0px 0px 1px black'],['mix-blend-mode','multiply'],['opacity','0.99'],['outline-style','solid'],['overflow-clip-margin','1px'],['content-visibility','auto'],['contain','paint']])test(`rejects element ${index} ${property}`,()=>{const s=mismatch(adjacent());s.chooserEvidence.elements[index].styles[property]=value;reject(s);});
for(const index of [0,2,3,4])for(const field of ['styles','pseudo','activeAnimations','rect'])test(`rejects missing element ${index} ${field}`,()=>{const s=mismatch(adjacent());delete s.chooserEvidence.elements[index][field];reject(s);});
for(const property of CHOOSER_STYLE_PROPERTIES)test(`rejects missing computed style ${property}`,()=>{const s=mismatch(adjacent());delete s.chooserEvidence.elements[0].styles[property];reject(s);});
for(const index of [0,2,3,4])for(const pseudo of ['before','after'])test(`rejects generated ${pseudo} on element ${index}`,()=>{const s=mismatch(adjacent());s.chooserEvidence.elements[index].pseudo[pseudo]='""';reject(s);});
for(const index of [0,2,3,4])test(`rejects active animation on element ${index}`,()=>{const s=mismatch(adjacent());s.chooserEvidence.elements[index].activeAnimations=1;reject(s);});
for(const shadow of ['rgb(0, 0, 0) 0px 0px 1px 0px','rgb(0, 0, 0) 0px 0px 1px 0px inset','unparsed'])test(`rejects image shadow ${shadow}`,()=>{const s=mismatch(adjacent());s.chooserEvidence.elements[0].styles['box-shadow']=shadow;reject(s);});
for(const shadow of ['rgb(0, 0, 0) 0px 0px 1px 0px inset','unparsed'])test(`rejects ancestor shadow ${shadow}`,()=>{const s=mismatch(adjacent());s.chooserEvidence.elements[4].styles['box-shadow']=shadow;reject(s);});
test('allows parsed outer-only shadow of fully containing common modal ancestor',()=>{const s=mismatch(adjacent()),node=s.chooserEvidence.elements[4];node.styles['box-shadow']='rgba(16, 40, 32, 0.314) 0px 20px 80px 0px';for(const side of ['top','right','bottom','left'])node.styles[`border-${side}-width`]='1px';for(const corner of ['top-left','top-right','bottom-left','bottom-right'])node.styles[`border-${corner}-radius`]='15px';node.styles['overflow-x']='auto';node.styles['overflow-y']='auto';node.client={left:1,top:1,width:348,height:598};classifyFixture(s);pass(s);});
for(const kind of ['border','radius','client-edge','unknown-overflow','missing-client','incomplete-client'])test(`rejects ancestor ${kind} clipping even when sampled probes are clear`,()=>{const s=mismatch(adjacent()),node=s.chooserEvidence.elements[2];if(kind==='border')node.styles['border-right-width']='0.01px';if(kind==='radius')node.styles['border-top-left-radius']='0.01px';if(kind==='client-edge')node.client.width-=.01;if(kind==='unknown-overflow')node.styles['overflow-x']='mystery';if(kind==='missing-client')delete node.client;if(kind==='incomplete-client')delete node.client.width;reject(s);});
test('rejects unknown supported-property status rather than defaulting safe',()=>{const s=mismatch(adjacent());delete s.chooserEvidence.supportedProperties.transform;reject(s);});
test('known unsupported optional property requires null in every relevant snapshot',()=>{const s=mismatch(adjacent());s.chooserEvidence.supportedProperties['mask-border-source']=false;for(const e of s.chooserEvidence.elements)e.styles['mask-border-source']=null;classifyFixture(s);pass(s);s.chooserEvidence.elements[0].styles['mask-border-source']='url(x)';reject(s);});
test('cannot mark a required property unsupported',()=>{const s=mismatch(adjacent());s.chooserEvidence.supportedProperties.transform=false;for(const e of s.chooserEvidence.elements)e.styles.transform=null;reject(s);});
test('does not trust a forged accepted classification',()=>{const s=mismatch(adjacent());s.images[0].hitPoints[1].target.tag='DIV';s.chooserEvidence.classification={...s.chooserEvidence.classification,accepted:true};assert.throws(()=>verifyChooserState(s,'fixture'));});
test('rejects changed retained negative with stale classification',()=>{const s=mismatch(adjacent());s.images[0].hitPoints[1].hit=true;assert.throws(()=>verifyChooserState(s,'fixture'));});
test('rejects changed ambiguity label even when raw observation is valid',()=>{const s=mismatch(adjacent());s.chooserEvidence.classification.images[0].original[1].kind='exact-self';assert.throws(()=>verifyChooserState(s,'fixture'));});
test('full journal independently recomputes chooser rule',()=>{const s=mismatch(adjacent());s.images.forEach((image,i)=>{const source=`http://127.0.0.1:4197/piece${i?5:0}.webp`;assert.equal(image.source,source);});const events=journal(s);assert.equal(verifyEnvelopeJournal(events,'profile','fixture').chooserStarters.length,2);const before=events.find(e=>e.event==='chooser-before').state;before.images[0].hitPoints[1].target.tag='DIV';assert.throws(()=>verifyEnvelopeJournal(events,'profile','fixture'));});
for(const kind of ['raw-hit','stable-hit','classification','style','padding','device-scale'])test(`rejects before/after ${kind} drift`,()=>{const events=journal(mismatch(adjacent())),after=events.find(e=>e.event==='chooser-after').state;if(kind==='raw-hit'){const p=after.images[0].hitPoints[1];p.hit=true;p.target=chooserTarget(after.chooserEvidence.elements[0]);classifyFixture(after);}if(kind==='stable-hit')setChooserProbeTarget(after,0,1,1,{stable:true});if(kind==='classification')after.chooserEvidence.classification.accepted=false;if(kind==='style'){after.chooserEvidence.elements[4].styles['box-shadow']='rgb(0, 0, 0) 0px 20px 80px 0px';classifyFixture(after);}if(kind==='padding'){after.chooserEvidence.elements[0].styles['padding-right']='0.01px';classifyFixture(after);}if(kind==='device-scale'){after.chooserEvidence.devicePixelRatio=2;classifyFixture(after);}assert.throws(()=>verifyEnvelopeJournal(events,'profile','fixture'));});
test('chooser journal source records raw before/after and classification before assertions',()=>{const source=readFileSync(new URL('./expansion160-browser/collections.spec.js',import.meta.url),'utf8');for(const [event,variable] of [['chooser-before','chooserBefore'],['chooser-after','chooserAfter']])assert(source.indexOf(`record('${event}'`)<source.indexOf(`verifyChooserState(${variable}`));assert(source.includes("'occlusionRect','chooserEvidence'"));});
test('preserves first rejection journal with original negatives before throwing',()=>{const root=mkdtempSync(`${tmpdir()}/chooser-rejection-`);try{const state=mismatch(adjacent());setChooserProbeTarget(state,0,3,addForeign(state));const record=openEnvelopeJournal(`${root}/raw.jsonl`,'profile','fixture');record('chooser-before',{state,pieceIds:envelope.starters});assert.throws(()=>verifyChooserState(state,'fixture'));const events=readFileSync(`${root}/raw.jsonl`,'utf8').trim().split('\n').map(JSON.parse);assert.equal(events.length,2);assert.deepEqual(events[1].state,state);assert.equal(events[1].state.images[0].hitPoints[1].hit,false);assert.equal(events[1].state.chooserEvidence.classification.accepted,false);}finally{rmSync(root,{recursive:true});}});

// Exercise the actual observer callback against exact object references without
// starting a browser, server, package install, or CI workflow.
async function mockedObservation({foreignAtOriginal=false}={}) {
 const fixture=adjacent(),elements=fixture.chooserEvidence.elements,calls=[];
 const nodes=elements.map(e=>({tagName:e.tag,dataset:e.envelope?{envelopeId:e.envelope}:{},clientLeft:e.client.left,clientTop:e.client.top,clientWidth:e.client.width,clientHeight:e.client.height,currentSrc:e.source,src:e.source,complete:true,naturalWidth:768,naturalHeight:768,getBoundingClientRect:()=>({...e.rect,toJSON:()=>clone(e.rect)}),getAnimations:()=>[],__element:e}));
 nodes.forEach((n,i)=>n.parentElement=nodes.find(m=>m.__element.elementId===elements[i].parentId)??null);
 const [first,second,,card,dialog,root]=nodes,header={getBoundingClientRect:()=>({bottom:70})};dialog.open=true;dialog.matches=selector=>selector===':modal';dialog.scrollTop=0;dialog.querySelector=selector=>selector==='.cg-dialog-header'?header:card;card.querySelectorAll=()=>[first,second];
 const foreign={...second,__element:{...second.__element,pairedImageIndex:null},parentElement:second.parentElement};
 const originals=fixture.images.flatMap(i=>i.hitPoints.map(p=>({x:p.x,y:p.y}))),isOriginal=(x,y)=>calls.length<10;
 const values={document:{documentElement:root,querySelectorAll:()=>[dialog],elementFromPoint(x,y){const old=isOriginal(x,y);calls.push({x,y});if(old&&x===first.__element.rect.right-.88)return foreignAtOriginal?foreign:second;return x<second.__element.rect.left?first:second;}},innerWidth:350,innerHeight:600,devicePixelRatio:3,CSS:{supports:()=>true},getComputedStyle(node,pseudo){if(node===body)return {overflow:'hidden'};return pseudo?{content:node.__element.pseudo[pseudo==='::before'?'before':'after']}:{getPropertyValue:p=>node.__element.styles[p]};}};
 const body={},saved=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 try{for(const [k,v]of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});const page={locator:()=>({evaluate:(fn,args)=>fn(body,args)})};return {state:await chooserState(page,'fixture'),calls,originals};}finally{for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];}
}
test('observer probes all original coordinates first and retains exact DOM partner targets',async()=>{const {state,calls,originals}=await mockedObservation();assert.deepEqual(calls.slice(0,10),originals);assert.equal(calls.length,22);assert.equal(state.images[0].hitPoints[1].hit,false);assert.equal(state.images[0].hitPoints[1].target.pairedImageIndex,1);assert.equal(state.images[0].hitPoints[1].target.elementId,state.images[1].elementId);pass(state);});
test('observer refuses lookalike IMG object identity spoofing',async()=>{const {state}=await mockedObservation({foreignAtOriginal:true});assert.equal(state.images[0].hitPoints[1].target.pairedImageIndex,null);assert.notEqual(state.images[0].hitPoints[1].target.elementId,state.images[1].elementId);reject(state);});

for(const value of [null,{},[],{images:[null,null],chooserEvidence:{elements:[],contract:CHOOSER_CONTRACT}}])test(`fails closed on malformed observation ${chooserVisibilityCases.length}`,()=>assert.equal(classifyChooserVisibility(value).accepted,false));

for(const shadow of [
 'rgb(0, 0, 0, 0) 0px 0px 1px 0px',
 'rgba(0, 0, 0) 0px 0px 1px 0px',
 'rgb(256, 0, 0) 0px 0px 1px 0px',
 'rgba(0, 0, 0, 1.01) 0px 0px 1px 0px',
 'rgb(0, 0, NaN) 0px 0px 1px 0px',
 'rgb(0, 0, 0) 0px 0px -1px 0px',
 'rgb(0, 0, 0) 0px 0px 1px 0px rgb(1, 1, 1)',
 'rgb(0, 0, 0) 0px 0px 1px 0px 0px',
 'rgb(0, 0, 0) 0px 0px Infinitypx 0px',
 'color(srgb 0 0 0) 0px 0px 1px 0px',
 'rgb(0, 0, 0) 0px 0px 1px 0px, rgb(0, 0, 0) 0px 0px -1px 0px',
])test(`rejects malformed/unknown common ancestor shadow: ${shadow}`,()=>{const s=mismatch(adjacent());s.chooserEvidence.elements[4].styles['box-shadow']=shadow;reject(s);});

// Actual browser records are separate immutable inputs. Only capturedAt was
// removed for publication; styles, support/null distinctions, integer client
// boxes, source/target identity and original false hits were not normalized.
function deepFreeze(value) {if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}
const browserRecords=deepFreeze(JSON.parse(readFileSync(new URL('./fixtures/chooser-browser-records.json',import.meta.url),'utf8')).records);
const paddingProperties=['padding-top','padding-right','padding-bottom','padding-left'];
// SYNTHETIC enrichment only: the historical browser never recorded padding.
// Add hypothetical zero padding and V2 classification on a clone. This proves
// guard behavior, never a successful old browser run or actual padding values.
function syntheticPaddingEnrichment(record) {
 const state=clone(record.state);
 state.chooserEvidence.contract=CHOOSER_CONTRACT;
 for(const property of paddingProperties) {
  state.chooserEvidence.supportedProperties[property]=true;
  for(const node of state.chooserEvidence.elements)node.styles[property]='0px';
 }
 return classifyFixture(state);
}
for(const record of browserRecords) {
 const {profile}=record;
 test(`${profile}: immutable actual record retains its original rejection and exact raw evidence`,()=>{
  const state=record.state,before=JSON.stringify(state);
  assert(Object.isFrozen(state.chooserEvidence.elements[0].styles));
  assert.equal(state.chooserEvidence.contract,'chooser-shared-edge-css-v1');
  assert.equal(state.chooserEvidence.classification.accepted,false);
  assert.equal(state.images.flatMap(i=>i.hitPoints).filter(p=>p.hit).length,8);
  assert.equal(state.images.flatMap(i=>i.stableHitPoints).filter(p=>p.hit).length,10);
  assert.equal(state.images.filter(i=>i.centerHit).length,2);
  assert.deepEqual(state.images[0].hitPoints.map(p=>p.hit),[true,false,true,false,true]);
  assert.equal(state.chooserEvidence.elements[0].styles['outline-width'],'3px');
  for(const node of state.chooserEvidence.elements)for(const field of ['left','top','width','height'])assert(Number.isInteger(node.client[field]));
  for(const property of paddingProperties){assert.equal(Object.hasOwn(state.chooserEvidence.supportedProperties,property),false);for(const node of state.chooserEvidence.elements)assert.equal(Object.hasOwn(node.styles,property),false);}
  assert.equal(classifyChooserVisibility(state).accepted,false);assert.throws(()=>verifyChooserState(state,state.envelope));
  assert.equal(JSON.stringify(state),before);
 });
 test(`${profile}: changing only the contract cannot replace missing actual padding`,()=>{const s=clone(record.state);s.chooserEvidence.contract=CHOOSER_CONTRACT;reject(s);});
 test(`${profile}: explicitly synthetic padding enrichment exercises actual CSSOM defaults without altering raw hits`,()=>{
  const s=syntheticPaddingEnrichment(record);pass(s);
  assert.deepEqual(s.images,record.state.images);
  assert.deepEqual(s.chooserEvidence.elements.map(node=>{const copy=clone(node);for(const p of paddingProperties)delete copy.styles[p];return copy;}),record.state.chooserEvidence.elements);
  assert.deepEqual(s.chooserEvidence.classification.images[0].original.map(p=>p.kind),['exact-self','adjacent-pair-ambiguity','exact-self','adjacent-pair-ambiguity','exact-self']);
  assert.deepEqual(s.chooserEvidence.classification.images[1].original.map(p=>p.kind),Array(5).fill('exact-self'));
  assert(s.chooserEvidence.classification.images.every(i=>i.stable.every(p=>p.kind==='exact-self')));
  assert.deepEqual(visibleImageIndices(s),[1]);
 });
 test(`${profile}: fresh padding does not authorize stale historical classification`,()=>{const s=syntheticPaddingEnrichment(record);s.chooserEvidence.classification=clone(record.state.chooserEvidence.classification);assert.throws(()=>verifyChooserState(s,s.envelope));});
 test(`${profile}: ordinary ancestor padding need not be zero`,()=>{const s=syntheticPaddingEnrichment(record);for(const node of s.chooserEvidence.elements.filter(n=>n.tag!=='IMG'))for(const p of paddingProperties)node.styles[p]='16px';classifyFixture(s);pass(s);});
 for(const property of paddingProperties) {
  for(const nodeIndex of [0,1])for(const mode of ['missing','unsupported-null','missing-style','null','positive','negative','malformed'])test(`${profile}: rejects ${mode} ${property} evidence for image ${nodeIndex}`,()=>{
   const s=syntheticPaddingEnrichment(record),e=s.chooserEvidence;
   if(mode==='missing')delete e.supportedProperties[property];
   else if(mode==='unsupported-null'){e.supportedProperties[property]=false;for(const n of e.elements)n.styles[property]=null;}
   else if(mode==='missing-style')delete e.elements[nodeIndex].styles[property];
   else e.elements[nodeIndex].styles[property]=mode==='positive'?'0.01px':mode==='negative'?'-1px':mode==='null'?null:'unknown';
   reject(s);
  });
 }
 for(const nodeIndex of [0,1,2,3,4,5]) {
  for(const width of ['0px','3px','0.5px'])test(`${profile}: outline none ${width} on element ${nodeIndex}`,()=>{const s=syntheticPaddingEnrichment(record);s.chooserEvidence.elements[nodeIndex].styles['outline-width']=width;classifyFixture(s);pass(s);});
  for(const style of ['auto','solid'])for(const width of ['0px','3px'])test(`${profile}: rejects outline ${style} ${width} on element ${nodeIndex}`,()=>{const s=syntheticPaddingEnrichment(record),styles=s.chooserEvidence.elements[nodeIndex].styles;styles['outline-style']=style;styles['outline-width']=width;reject(s);});
 }
 for(const width of ['-1px','NaNpx','Infinitypx','1e3px','3','medium','','calc(0px)','9'.repeat(400)+'px'])test(`${profile}: rejects invalid outline width ${width.slice(0,24)}`,()=>{const s=syntheticPaddingEnrichment(record);s.chooserEvidence.elements[0].styles['outline-width']=width;reject(s);});
 for(const mutate of [
  s=>s.images[0].hitPoints[1].hit=true,
  s=>s.images[0].hitPoints[1].target.elementId='e2',
  s=>s.images[0].hitPoints[1].target.source=s.images[0].source,
  s=>s.images[0].hitPoints[1].target.rect.x-=.01,
  s=>s.images[0].stableHitPoints[1].hit=false,
  s=>s.images[0].stableHitPoints[1].target=clone(s.images[1].centerTarget),
  s=>s.images[0].centerHit=false,
  s=>s.images[0].centerTarget=clone(s.images[1].centerTarget),
  s=>s.chooserEvidence.elements[0].styles['clip-path']='inset(0.01px)',
  s=>s.chooserEvidence.elements[0].styles['border-top-width']='0.01px',
  s=>s.chooserEvidence.elements[0].styles['border-top-left-radius']='0.01px',
  s=>s.chooserEvidence.elements[0].styles['object-fit']='cover',
  s=>s.chooserEvidence.elements[0].styles['object-position']='0% 0%',
  s=>s.chooserEvidence.elements[0].styles.transform='matrix(1, 0, 0, 1, 0, 0)',
 ])test(`${profile}: actual-record mutation remains rejected ${chooserVisibilityCases.length}`,()=>{const s=syntheticPaddingEnrichment(record);mutate(s);reject(s);});
}
const chromiumRecord=browserRecords.find(r=>r.profile==='chromium-desktop');
for(const margin of ['content-box','content-box 0px','0px content-box'])test(`actual Chromium clip pair admits only explicit zero-offset content-box form: ${margin}`,()=>{const s=syntheticPaddingEnrichment(chromiumRecord);for(const n of s.chooserEvidence.elements.filter(n=>n.tag==='IMG'))n.styles['overflow-clip-margin']=margin;classifyFixture(s);pass(s);});
for(const margin of ['0px','padding-box','border-box','padding-box 0px','border-box 0px','content-box 0.01px','content-box -1px','content-box NaNpx','content-box Infinitypx','content-box 1e-400px','content-box 0.'+'0'.repeat(400)+'1px','content-box 0%','content-box 0','content-box calc(0px)','content-box 0px 0px','content-box content-box','content-box\u00a00px','\u00a0content-box','content-box\u00a0',' content-box','content-box ','content-box  0px','content-box\t0px','garbage','',null])test(`actual Chromium clip pair rejects unknown/nonzero margin: ${String(margin).slice(0,48)}`,()=>{const s=syntheticPaddingEnrichment(chromiumRecord);s.chooserEvidence.elements[0].styles['overflow-clip-margin']=margin;reject(s);});
for(const axes of [['visible','clip'],['clip','visible'],['hidden','hidden'],['auto','auto'],['scroll','scroll'],['unknown','unknown']])test(`actual Chromium clip pair rejects unreviewed overflow axes: ${axes}`,()=>{const s=syntheticPaddingEnrichment(chromiumRecord),style=s.chooserEvidence.elements[0].styles;[style['overflow-x'],style['overflow-y']]=axes;reject(s);});
test('actual Chromium clip pair requires supported non-null overflow-clip-margin evidence',()=>{const s=syntheticPaddingEnrichment(chromiumRecord);s.chooserEvidence.supportedProperties['overflow-clip-margin']=false;for(const n of s.chooserEvidence.elements)n.styles['overflow-clip-margin']=null;reject(s);});
test('content-box exception is not applied to ancestors',()=>{const s=syntheticPaddingEnrichment(chromiumRecord);s.chooserEvidence.elements[2].styles['overflow-clip-margin']='content-box';reject(s);});
test('content-box exception is not applied to visible IMG overflow',()=>{const s=syntheticPaddingEnrichment(chromiumRecord),style=s.chooserEvidence.elements[0].styles;style['overflow-x']='visible';style['overflow-y']='visible';reject(s);});
test('visible IMG overflow retains supported zero-margin path',()=>{const s=syntheticPaddingEnrichment(chromiumRecord);for(const n of s.chooserEvidence.elements.filter(n=>n.tag==='IMG'))Object.assign(n.styles,{'overflow-x':'visible','overflow-y':'visible','overflow-clip-margin':'0px'});classifyFixture(s);pass(s);});
test('observer collects every required padding value without changing its 22 hit queries',async()=>{const {state,calls}=await mockedObservation();for(const p of paddingProperties){assert.equal(state.chooserEvidence.supportedProperties[p],true);for(const n of state.chooserEvidence.elements)assert.equal(n.styles[p],'0px');}assert.equal(state.chooserEvidence.contract,CHOOSER_CONTRACT);assert.equal(calls.length,22);pass(state);});
