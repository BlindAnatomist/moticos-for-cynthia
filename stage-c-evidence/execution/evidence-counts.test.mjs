// Synthetic artifact fixtures test the validator only; never browser evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {validateProfileArtifacts} from './validate.mjs';
import {ORDER,APPROVED_SCOPE,SCREENSHOTS,POSTCARDS,LIMITS} from './policy.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
function png(width,height){
 const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;};
 const chunk=(name,b)=>{const all=Buffer.alloc(12+b.length);all.writeUInt32BE(b.length);all.write(name,4);b.copy(all,8);all.writeUInt32BE(crc(all.subarray(4,8+b.length)),8+b.length);return all;};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((1+width*4)*height))),chunk('IEND',Buffer.alloc(0))]);
}
test('both expanded 41-image profile registries validate exactly 60 screenshots and 22 postcards',()=>{
 const dir=fs.mkdtempSync(join(os.tmpdir(),'moticos-text-image-counts-')),binding={sourceFingerprint:'a'.repeat(64),buildFingerprint:'b'.repeat(64)};
 const metrics={scrollWidth:1,scrollHeight:1,offsetWidth:1,offsetHeight:1,clientWidth:1,clientHeight:1};
 const observation={viewport:{width:1,height:1,dpr:1},fonts:'loaded',body:metrics,root:metrics},geometry={schemaVersion:1,before:observation,after:observation};
 const shot=png(1,1),card=png(1536,1120),receipts=[];
 try{
  for(const profile of ORDER){const root=join(dir,profile);for(const definition of APPROVED_SCOPE.cases){
   const folder=join(root,definition.id);fs.mkdirSync(folder,{recursive:true});const proof={caseId:definition.id,...binding,screenshots:[],exports:[]};
   for(const name of definition.routineScreenshotNames){fs.writeFileSync(join(folder,name),shot);fs.writeFileSync(join(folder,name+'.geometry.json'),JSON.stringify(geometry));proof.screenshots.push({name,bytes:shot.length,sha256:digest(shot),dimensions:[1,1],geometry});}
   if(definition.id==='C08')for(const p of POSTCARDS){fs.writeFileSync(join(folder,p.normalizedEvidenceFilename),card);const hash=digest(card);proof.exports.push({pieceId:p.pieceId,filename:p.normalizedEvidenceFilename,suggestedFilename:p.expectedSuggestedDownloadFilename,bytes:card.length,sha256:hash,dimensions:[1536,1120],parity:{hashes:[hash,hash,hash],byteEqual:true,sameBlob:true,sameFilename:true}});}
   fs.writeFileSync(join(folder,'proof.json'),JSON.stringify(proof));
  }receipts.push(validateProfileArtifacts(profile,binding,root));}
  assert.equal(SCREENSHOTS.length+POSTCARDS.length,41);assert.equal(receipts.reduce((n,r)=>n+r.routineScreenshots,0),60);assert.equal(receipts.reduce((n,r)=>n+r.downloadedPostcards,0),22);assert.equal(LIMITS.routinePngs+LIMITS.postcardPngs,82);assert.equal(LIMITS.routinePngs+LIMITS.postcardPngs+LIMITS.failurePngs,83);
  const root=join(dir,ORDER[0]);fs.writeFileSync(join(root,'unexpected.png'),shot);assert.throws(()=>validateProfileArtifacts(ORDER[0],binding,root),/Unmanifested PNG/);fs.unlinkSync(join(root,'unexpected.png'));
  const missing=join(root,'C09','C09-320x568-large-right.png');fs.unlinkSync(missing);assert.throws(()=>validateProfileArtifacts(ORDER[0],binding,root));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
