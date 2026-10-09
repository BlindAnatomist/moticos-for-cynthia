import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ensurePostcardTitleFont, POSTCARD_TITLE_FAMILY, POSTCARD_TITLE_FONT} from '../../src/fonts/postcardFont.js';
import {createCollectionPostcard} from '../../src/matching/postcard.js';
const root=new URL('../../',import.meta.url),read=file=>fs.readFileSync(new URL(file,root));
async function withFonts(run,{failFirst=false}={}){
 const saved=Object.fromEntries(['document','FontFace','Image'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const fonts=new Set();let loads=0,creates=0;
 class FakeFontFace{constructor(family,source,descriptors){this.family=family;this.source=source;Object.assign(this,descriptors);this.status='unloaded';creates++;}async load(){loads++;if(failFirst&&loads===1){this.status='error';throw Error('Font unavailable');}this.status='loaded';return this;}}
 globalThis.FontFace=FakeFontFace;globalThis.document={fonts};
 try{await run({fonts,FakeFontFace,counts:()=>({loads,creates})});}finally{for(const[name,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
}
test('bundled serif loads once, joins concurrent work and never uses an installed-face lookup',async()=>{
 await withFonts(async({fonts,counts})=>{const first=ensurePostcardTitleFont(),second=ensurePostcardTitleFont();assert.equal(first,second);const face=await first;assert.equal(face.family,POSTCARD_TITLE_FAMILY);assert.match(face.source,/LiberationSerif-Regular\.ttf/);assert.equal(face.status,'loaded');assert(fonts.has(face));assert.equal(await ensurePostcardTitleFont(),face);assert.deepEqual(counts(),{loads:1,creates:1});});
});
test('canvas shares the face declared by the career stylesheet',async()=>{
 await withFonts(async({fonts,FakeFontFace,counts})=>{const face=new FakeFontFace('"Moticos Serif"','url(same-font.ttf)',{style:'normal',weight:'400'});fonts.add(face);assert.equal(await ensurePostcardTitleFont(),face);assert.deepEqual(counts(),{loads:1,creates:1});});
});
test('failed font preparation rejects rather than silently substitutes, and permits retry',async()=>{
 await withFonts(async({fonts,counts})=>{await assert.rejects(ensurePostcardTitleFont(),/Font unavailable/);assert.equal(fonts.size,0);assert.equal((await ensurePostcardTitleFont()).status,'loaded');assert.deepEqual(counts(),{loads:2,creates:2});},{failFirst:true});
});
test('missing font-loading support fails explicitly',async()=>{await withFonts(async()=>{delete globalThis.FontFace;await assert.rejects(ensurePostcardTitleFont(),/unavailable/);});});
test('postcard draw waits for font readiness and retains original composition and full title',async()=>{
 await withFonts(async({fonts})=>{const commands=[];globalThis.Image=class{async decode(){commands.push(['decode',this.src]);}};document.createElement=tag=>{assert.equal(tag,'canvas');assert.equal([...fonts][0]?.status,'loaded');const ctx={fillRect:(...a)=>commands.push(['fillRect',...a]),drawImage:(image,...a)=>commands.push(['drawImage',image.src,...a]),fillText(text,...a){commands.push(['text',text,this.font,...a]);}};return{getContext:()=>ctx,toBlob:callback=>callback(new Blob(['png']))};};const result=await createCollectionPostcard('a',{a:{art:'/original.webp',name:'Snail Under Its Own Roof'}},'Sideways Company');assert(commands.some(r=>JSON.stringify(r)===JSON.stringify(['drawImage','/original.webp',332,50,872,872])));assert(commands.some(r=>JSON.stringify(r)===JSON.stringify(['text','Snail Under Its Own Roof',POSTCARD_TITLE_FONT,768,995])));assert.equal(result.filename,'moticos-snail-under-its-own-roof.png');assert(result.blob.size>0);});
});
test('whole-word styling retains larger text, every board position and local scroll affordances',()=>{
 const css=read('src/career/career.css').toString(),component=read('src/career/CareerGarden.jsx').toString(),viewport=read('src/career/BoardViewport.jsx').toString();assert(css.includes('repeat(5,minmax(min-content,1fr))'));assert(css.includes('min-inline-size:6.5rem'));assert(css.includes('overflow-wrap:normal;word-break:normal;hyphens:none'));assert(css.includes('overflow-x:auto'));assert(!component.includes('<wbr'));assert(component.includes('{piece.shortName}'));assert(component.includes('Row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}'));assert(viewport.includes('Scroll board left'));assert(viewport.includes('Scroll board right'));assert(viewport.includes('largeText && maximum > 1'));
});
test('font bytes are original licensed assets; screen and renderer share the named family',()=>{
 const expected={Regular:'9caef765d2e891c10dd73658894f01e660fe0c1c83e0bda7d6edf561d8f623d4',Italic:'de18fe26337e03241952dca46398d5b66f3c5738d080bfd284f66e67b926f597'};for(const[style,hash]of Object.entries(expected))assert.equal(createHash('sha256').update(read(`src/fonts/LiberationSerif-${style}.ttf`)).digest('hex'),hash);assert(read('src/fonts/LICENSE.txt').toString().includes('SIL OPEN FONT LICENSE Version 1.1'));assert(read('src/fonts/serif.css').toString().includes("font-family:'Moticos Serif'"));assert(!read('src/career/career.css').toString().includes('Georgia'));
});
