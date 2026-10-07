import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {existsSync,readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {inventory,identity,digest,verifyBuild} from './verifyCareerBuild.mjs';
import {verifyPng} from './expansion160Png.mjs';
import {verifyCompleted} from './verifyCareerScope.mjs';
import {MAX_SCREENSHOTS,MAX_ARTIFACT_BYTES} from './careerGateScope.mjs';
export const EXPECTED_SCREENSHOTS=['C01-chapter-finish','C01-correspondence','C07-large-text','C08-1366-fresh','C08-1366-three','C08-1440-fresh','C08-1440-three','C08-postcard','P01-first-postcard','P03-320x568-fresh','P03-320x568-three','P03-320x568-mixed-art','P03-390x664-fresh','P03-390x664-three','P03-390x844-fresh','P03-390x844-three','P03-430x932-fresh','P03-430x932-three','P04-large-text'].map(n=>n+'.png').sort();
export const completeStatus=(completed,binding)=>binding.status==='verified'&&completed.length===2&&completed.map(p=>p.profile).sort().join('|')==='career-chromium|career-webkit-phone'&&completed.every(p=>p.status==='passed')?'passed':'incomplete';
export function encodeManifest(data,contentBytes,cap=MAX_ARTIFACT_BYTES){const manifest={...data,bytes:0,manifestBytes:0,contentBytes};let encoded;for(let i=0;i<8;i++){const candidate=Buffer.from(JSON.stringify(manifest,null,2)+'\n');if(manifest.manifestBytes===candidate.length&&manifest.bytes===contentBytes+candidate.length){encoded=candidate;break;}manifest.manifestBytes=candidate.length;manifest.bytes=contentBytes+candidate.length;}assert(encoded,'Manifest size did not stabilize');assert(manifest.bytes<=cap,'Evidence including its manifest exceeds approved cap');return{manifest,encoded};}
export function packageEvidence(){
mkdirSync('career-results',{recursive:true});
for(const file of ['career-build-proof.json','career-gate-source.json','career-preflight.log'])if(existsSync(file))copyFileSync(file,`career-results/${file}`);
const files=inventory('career-results').filter(f=>f.file!=='career-results/evidence-manifest.json');
const screenshots=files.filter(f=>f.file.endsWith('.png'));assert(screenshots.length<=MAX_SCREENSHOTS,'Screenshot count exceeds approved bound');
const traces=files.filter(f=>f.file.endsWith('trace.zip'));assert(traces.length<=1,'More than one failure trace');
for(const profile of ['career-chromium','career-webkit-phone']){const path=`career-results/${profile}/screenshots/manifest.json`;if(existsSync(path)){const captures=JSON.parse(readFileSync(path,'utf8'));for(const c of captures){assert(c.path.startsWith(`career-results/${profile}/screenshots/`)&&!c.path.includes('..'));const data=readFileSync(c.path);assert.equal(digest(data),c.sha256);assert.equal(data.length,c.bytes);verifyPng(data,c.dimensions);}}}
const bytes=files.reduce((n,f)=>n+f.bytes,0);assert(bytes<=MAX_ARTIFACT_BYTES,'Evidence exceeds aggregate cap; preserve locally and report, do not truncate');
let binding;try{const proof=verifyBuild();binding={status:'verified',sourceFingerprint:proof.sourceFingerprint};}catch(error){binding={status:'failed',message:error.message};}
const completed=['career-chromium','career-webkit-phone'].map(p=>{try{const root=`career-results/${p}`,saved=JSON.parse(readFileSync(`${root}/completed-proof.json`,'utf8')),result=JSON.parse(readFileSync(`${root}/results.json`,'utf8')),events=readFileSync(`${root}/progress/browser-events.jsonl`,'utf8').trim().split('\n').map(line=>JSON.parse(line));const actual=verifyCompleted(p,result,events);assert.deepEqual(saved,actual,'Completion proof differs from raw evidence');return actual;}catch(error){return{profile:p,status:'incomplete',reason:error.message};}});
if(binding.status==='verified'&&completed.every(p=>p.status==='passed')){assert.deepEqual(screenshots.map(f=>f.file.split('/').at(-1)).sort(),EXPECTED_SCREENSHOTS,'Missing or extra required screenshots');}
const{encoded}=encodeManifest({schemaVersion:1,identity:identity(),sourceFingerprint:existsSync('career-gate-source.json')?digest(readFileSync('career-gate-source.json')):null,status:completeStatus(completed,binding),binding,completed,screenshots:screenshots.length,traces:traces.length,files},bytes);writeFileSync('career-results/evidence-manifest.json',encoded);
console.log('Bounded evidence manifest recorded; incomplete results remain incomplete.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)packageEvidence();
