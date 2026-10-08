import assert from 'node:assert/strict';
import {readFileSync,lstatSync,readdirSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyPng} from '../gate/png.mjs';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function regularBytes(root,path){
 assert(typeof path==='string'&&path.length>0&&!isAbsolute(path)&&!path.includes('\\')&&!path.split('/').some(part=>!part||part==='.'||part==='..'),'Unsafe evidence path');
 let at=resolve(root);assert(lstatSync(at).isDirectory()&&!lstatSync(at).isSymbolicLink(),'Invalid evidence root');
 for(const part of path.split('/')){at=resolve(at,part);assert(!lstatSync(at).isSymbolicLink(),'Evidence symlink forbidden');}
 assert(lstatSync(at).isFile(),'Evidence must be a regular file');return readFileSync(at);
}
export function filesUnder(root){
 const files=[];function walk(dir){for(const name of readdirSync(dir)){const path=resolve(dir,name),stat=lstatSync(path);assert(!stat.isSymbolicLink(),'Evidence symlink forbidden');if(stat.isDirectory())walk(path);else{assert(stat.isFile());files.push(relative(resolve(root),path).replaceAll('\\','/'));}}}walk(resolve(root));return files.sort();
}
// Only an exact required set can pass. Callers must supply the independently
// reviewed scope and bind it to the actual source/build fingerprints.
export function verifyOriginals(root,{required,rows,sourceFingerprint,buildFingerprint,byteLimit,pngLimit}){
 assert.match(sourceFingerprint,/^[a-f0-9]{64}$/);assert.match(buildFingerprint,/^[a-f0-9]{64}$/);
 assert(Array.isArray(required)&&required.length>0);assert.equal(new Set(required).size,required.length,'Duplicate requirement');
 assert(Array.isArray(rows));assert.equal(new Set(rows.map(r=>r.path)).size,rows.length,'Duplicate original evidence');
 assert.deepEqual(rows.map(r=>r.path).sort(),[...required].sort(),'Missing or unexpected original evidence');
 let total=0,pngs=0;for(const row of rows){
  assert.equal(row.sourceFingerprint,sourceFingerprint,'Wrong source');assert.equal(row.buildFingerprint,buildFingerprint,'Wrong build');
  const bytes=regularBytes(root,row.path);assert.equal(bytes.length,row.bytes,'Original byte count changed');assert.equal(digest(bytes),row.sha256,'Original bytes changed');total+=bytes.length;
  if(row.path.endsWith('.png')){pngs++;assert(Array.isArray(row.dimensions)&&row.dimensions.length===2&&row.dimensions.every(n=>Number.isSafeInteger(n)&&n>0));verifyPng(bytes,row.dimensions);}
 }
 assert(total<=byteLimit,'Evidence byte cap exceeded');assert(pngs<=pngLimit,'PNG cap exceeded');return{status:'verified-originals',files:rows.length,bytes:total,pngs};
}
