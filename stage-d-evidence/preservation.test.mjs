// NEW byte-preservation contracts against accepted public source manifests and immutable selected artwork records.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import * as C from '../src/career/content.js';import * as C7 from '../src/career/content.v7.js';import {EXPANSION320_BOUNDS as bounds,EXPANSION320_LABELS as labels} from '../src/matching/expansion320/bounds.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex'),base=read('../stage-c-source.json');
const modified=new Set(['package.json','src/career/boardArt.js','src/career/content.js','src/career/engine.js','src/career/volumes.js','src/career/career.css','src/career/CareerGarden.jsx']);
test('all616 accepted files including historical evidence remain exact except five integration paths and exact compact-label/focused-cell patches',()=>{
 const files=read('./baseline-files.frozen.json').files;assert.equal(files.length,616);assert.equal(modified.size,7);for(const r of files){if(modified.has(r.file))continue;const b=fs.readFileSync(new URL('../'+r.file,import.meta.url));assert.equal(b.length,r.bytes,r.file+' bytes');assert.equal(sha(b),r.sha256,r.file+' hash');}
});
test('four frozen v7 readers differ from accepted280 active bytes only by required frozen import targets',()=>{
 for(const name of ['content','engine','session','volumes']){const record=base.files.find(r=>r.file===`src/career/${name}.js`);assert(record);let text=fs.readFileSync(new URL(`../src/career/${name}.v7.js`,import.meta.url),'utf8');if(name==='engine')text=text.replace("from './content.v7.js'","from './content.js'").replace("from './volumes.v7.js'","from './volumes.js'");if(name==='session')text=text.replace("from './content.v7.js'","from './content.js'").replace("from './engine.v7.js'","from './engine.js'");assert.equal(sha(Buffer.from(text)),record.sha256,name);}
 for(const f of C7.FAMILIES)assert.deepEqual(C.FAMILIES.find(n=>n.id===f.id),f);
});
test('all forty images,names,compact labels and crop numbers match their immutable reviewed sources',()=>{
 const records=read('./assets.frozen.json');const rows=Array.isArray(records)?records:(records.records??records.assets??records.files);assert.equal(rows.length,40);for(const r of rows){const id=r.id??r.pieceId,file=`../src/matching/expansion320/art/${id}.webp`,b=fs.readFileSync(new URL(file,import.meta.url));assert.equal(sha(b),r.sha256,id);if(r.bytes!==undefined)assert.equal(b.length,r.bytes,id);assert.equal(bounds[id].alphaThreshold,16);assert.equal(bounds[id].paddingPixels,8);assert(bounds[id].crop[2]>0&&bounds[id].crop[3]>0);assert.equal(C.CATALOG.pieceOf(id).shortName,labels[id]);const expected=r.measurements??r.bounds;if(expected)for(const k of ['source','ink','crop','alphaThreshold','paddingPixels'])assert.deepEqual(bounds[id][k],expected[k],id+' '+k);}
});

test('inherited evidence directories contain no newly generated historical-suite outputs',()=>{const baseline=read('./baseline-files.frozen.json').files;const roots=['campaign-evidence','full-campaign-gate','full-campaign-probe','full-browser-fixtures','full-browser-evidence','stage-a-evidence','stage-b-evidence','stage-c-evidence','gate','tests'];const walk=dir=>fs.readdirSync(new URL('../'+dir,import.meta.url),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);for(const root of roots){const expected=baseline.filter(r=>r.file.startsWith(root+'/')).map(r=>r.file).sort();assert.deepEqual(walk(root).sort(),expected,root+' membership changed');}});

test('accepted career CSS is unchanged except the exact reviewed compact-label suffix',()=>{const suffix="\n/* Compact labels use the existing cell padding without changing art, type or hit areas. */\n@media(max-width:650px){.career-shell:not(.is-large-text) .career-cell-label{width:calc(100% + 6px)}}\n";const current=fs.readFileSync(new URL('../src/career/career.css',import.meta.url),'utf8');assert(current.endsWith(suffix));const prefix=Buffer.from(current.slice(0,-suffix.length)),record=read('./baseline-files.frozen.json').files.find(r=>r.file==='src/career/career.css');assert.equal(prefix.length,record.bytes);assert.equal(sha(prefix),record.sha256);});


test('accepted CareerGarden differs only by the reviewed focused-cell helper import and four call sites',()=>{
 const record=read('./baseline-files.frozen.json').files.find(r=>r.file==='src/career/CareerGarden.jsx');
 let current=fs.readFileSync(new URL('../src/career/CareerGarden.jsx',import.meta.url),'utf8');
 const prefix="import {focusBoardCell} from './boardFocus.js';\n";assert(current.startsWith(prefix));current=current.slice(prefix.length);
 for(const [old,fresh,count] of [
  ['cells.current[guidance.pair[0]]?.focus();','focusBoardCell(cells.current[guidance.pair[0]]);',1],
  ['cells.current[guidance.at]?.focus();','focusBoardCell(cells.current[guidance.at]);',1],
  ['cells.current[next]?.focus();','focusBoardCell(cells.current[next]);',2],
 ]){assert.equal(current.split(fresh).length-1,count);current=current.replaceAll(fresh,old);}
 assert.equal(Buffer.byteLength(current),record.bytes);assert.equal(sha(Buffer.from(current)),record.sha256);
});
