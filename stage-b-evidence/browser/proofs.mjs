import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyPng} from '../../gate/png.mjs';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyGallery(proof,expected,art){
 assert.equal(expected.length,240);assert.equal(new Set(expected).size,240);
 assert.deepEqual(proof.seen,expected);
 const images=proof.images.filter(i=>i.location==='collection');
 assert.deepEqual(images.map(i=>i.pieceId),expected);
 for(const i of images){const a=art.find(a=>a.id===i.pieceId);assert(a);assert.equal(i.sha256,a.sha256);assert.equal(i.bytes,a.bytes);assert(i.natural?.length===2&&i.natural.every(n=>Number.isFinite(n)&&n>0));assert(i.display?.length===2&&i.display.every(n=>Number.isFinite(n)&&n>8));assert.equal(new URL(i.src).origin,'http://127.0.0.1:4198');}
 return true;
}
export function verifyExport(bytes,record,pieceId){
 assert.equal(record.pieceId,pieceId);assert.equal(record.bytes,bytes.length);assert.equal(record.sha256,digest(bytes));assert.deepEqual(record.dimensions,[1536,1120]);verifyPng(bytes,record.dimensions);return true;
}
