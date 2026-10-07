import assert from 'node:assert/strict';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const digest200 = bytes => createHash('sha256').update(bytes).digest('hex');
export function inventory200(root, folder) {
  return readdirSync(join(root,folder),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{
    const file=`${folder}/${e.name}`;assert(!e.isSymbolicLink());
    if(e.isDirectory())return inventory200(root,file);assert(e.isFile());const bytes=readFileSync(join(root,file));return [{file,bytes:bytes.length,sha256:digest200(bytes)}];
  });
}
export function source200(root='.') {
  return [...['src','public','scripts','tests'].flatMap(folder=>inventory200(root,folder)),...['package.json','package-lock.json','vite.config.js','index.html','playwright.expansion160.config.js'].map(file=>{
    const p=join(root,file);assert(lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink());const bytes=readFileSync(p);return {file,bytes:bytes.length,sha256:digest200(bytes)};
  })].sort((a,b)=>a.file.localeCompare(b.file));
}
export async function catalog200(root='.') {
  const {ENVELOPES}=await import(pathToFileURL(resolve(root,'src/matching/expansion200/registry.js')).href);
  assert.equal(ENVELOPES.length,20);
  const assets=ENVELOPES.flatMap(e=>e.catalog.PIECES.map(p=>{
    const sourceFile=relative(resolve(root),fileURLToPath(p.art)).split('\\').join('/');assert(sourceFile.startsWith('src/')&&!sourceFile.split('/').includes('..'));
    const bytes=readFileSync(join(root,sourceFile));return {id:p.id,sourceFile,bytes:bytes.length,sha256:digest200(bytes)};
  }));
  assert.equal(assets.length,200);assert.equal(new Set(assets.map(p=>p.id)).size,200);assert.equal(new Set(assets.map(p=>p.sha256)).size,200);
  return {envelopes:ENVELOPES.map(e=>({id:e.id,storageKey:e.storageKey,pieceIds:e.catalog.PIECES.map(p=>p.id)})),assets};
}
export function verifyEntry200(root, emitted) {
  const html=readFileSync(join(root,'dist-expansion200/index.html'),'utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)];
  assert.equal(scripts.length,1,'Exactly one external application entry is required');
  const attributes=scripts[0][1];
  assert(/\btype\s*=\s*["']module["']/i.test(attributes),'The application entry must be an ES module');
  const sources=[...attributes.matchAll(/\bsrc\s*=\s*(["'])(.*?)\1/gi)];
  assert.equal(sources.length,1,'A single local application entry source is required');
  assert.equal(scripts[0][0].replace(/^<script\b[^>]*>/i,'').replace(/<\/script\s*>$/i,'').trim(),'','Inline entry code is not an emitted module');
  const styles=[...html.matchAll(/<link\b([^>]*)>/gi)].filter(m=>/\brel\s*=\s*["']stylesheet["']/i.test(m[1])).map(m=>{
    const hrefs=[...m[1].matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)];assert.equal(hrefs.length,1);return hrefs[0][2];
  });
  assert(styles.length>0,'The application stylesheet is required');
  const entryScript=sources[0][2];
  for(const [url,extension]of [[entryScript,'js'],...styles.map(url=>[url,'css'])]){
    assert(new RegExp(`^/assets/[A-Za-z0-9_-]+\\.${extension}$`).test(url),'Only local emitted entry paths are allowed');
    const file=url.slice(1),matches=emitted.filter(e=>e.file===file);assert.equal(matches.length,1,`Missing emitted entry ${file}`);
    const path=join(root,'dist-expansion200',file);assert(lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink());
    const bytes=readFileSync(path);assert(bytes.length>0,'Empty application entry');assert.equal(bytes.length,matches[0].bytes);assert.equal(digest200(bytes),matches[0].sha256);
  }
  assert(/<div\b[^>]*\bid=["']root["'][^>]*>\s*<\/div>/i.test(html),'Application mount point is missing');
  return {entryScripts:[entryScript],stylesheets:styles};
}
export async function buildManifest200(root='.') {
  const source=source200(root),catalog=await catalog200(root),emitted=inventory200(root,'dist-expansion200/assets').map(r=>({...r,file:r.file.slice('dist-expansion200/'.length)}));
  const entry=verifyEntry200(root,emitted),bundle=readFileSync(join(root,'dist-expansion200',entry.entryScripts[0].slice(1)),'utf8');
  for(const envelope of catalog.envelopes){assert(bundle.includes(envelope.id)&&bundle.includes(envelope.storageKey),`Current envelope absent from entry: ${envelope.id}`);}
  const catalogAssets=catalog.assets.map(r=>{const matches=emitted.filter(e=>e.sha256===r.sha256&&e.bytes===r.bytes);assert.equal(matches.length,1,`Current art not emitted exactly once: ${r.id}`);return {...r,emittedFile:matches[0].file};});
  for(const entry of inventory200(root,'public'))assert.equal(digest200(readFileSync(join(root,'dist-expansion200',entry.file.slice(7)))),entry.sha256);
  return {schemaVersion:1,kind:'moticos-private-local-200-candidate',publicationAuthorized:false,totalPieces:200,families:40,envelopes:20,postcards:120,
    sourceFingerprint:digest200(JSON.stringify(source)),source,catalogAssets,envelopeKeys:catalog.envelopes,
    ...entry,entryFiles:emitted.filter(e=>/\.(js|css)$/.test(e.file))};
}
