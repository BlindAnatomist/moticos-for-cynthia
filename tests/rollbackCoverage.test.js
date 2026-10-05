import {it,expect} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {hash} from '../scripts/verifyRollbackBuild.mjs';
import {verifySource} from '../scripts/verifyRollbackInventory.mjs';
import {verifyCompleted} from '../scripts/verifyRollbackCoverage.mjs';
import {REQUIRED_ARTIFACTS,POSTCARD_SAMPLES,PROFILES,RUNTIME_FINGERPRINT,BUILD_FINGERPRINT} from './rollback-browser/plan.js';
import {originals,RECOVERY_ENVELOPES,getRecoveryEngine} from './rollback-browser/helpers.js';
import {memoryStorage} from './capacity/fixtures.js';
import {captureRecovery} from '../src/matching/recovery/snapshot.js';
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(name,data){const bytes=Buffer.concat([Buffer.from(name),data]),prefix=Buffer.alloc(4),suffix=Buffer.alloc(4);prefix.writeUInt32BE(data.length);let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);suffix.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([prefix,bytes,suffix]);}
function png(width,height,color=1){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=0;const pixels=Buffer.alloc((width+1)*height,color);for(let row=0;row<height;row++)pixels[row*(width+1)]=0;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);}
function nativeBackup(name){
 const storage=memoryStorage();for(const [key,raw]of Object.entries(originals))storage.bytes.set(key,raw);const sessions=new Map();
 const change=(id,count)=>{const engine=getRecoveryEngine(id);let save=engine.readSave(originals[engine.STORAGE_KEY]).save;for(let i=0;i<count;i++)save=engine.act(save,{type:'undo'});return {engine,save};};
 if(name==='freshness-after'||name==='batch-v2-after-undo'){const v=change(RECOVERY_ENVELOPES[name==='freshness-after'?8:5].id,1);storage.bytes.set(v.engine.STORAGE_KEY,v.engine.serializeStoredSave(v.save));}
 if(name==='stale-winner-and-temporary-loser'||name==='quota-preservation'){const v=change(name.startsWith('stale')?'moonlit-passage':'matching-garden',1);if(name.startsWith('stale'))storage.bytes.set(v.engine.STORAGE_KEY,v.engine.serializeStoredSave(change('moonlit-passage',2).save));sessions.set(v.engine.STORAGE_KEY,{save:v.save,blocked:true,raw:originals[v.engine.STORAGE_KEY],sourceRaw:originals[v.engine.STORAGE_KEY],conflict:name.startsWith('stale')});}
 if(name==='empty-corrupt-future-read-denied'){storage.bytes.delete(RECOVERY_ENVELOPES[8].storageKey);storage.bytes.set(RECOVERY_ENVELOPES[9].storageKey,'{broken');storage.bytes.set(RECOVERY_ENVELOPES[10].storageKey,'{"version":99}');const get=storage.getItem;storage.getItem=key=>{if(key===RECOVERY_ENVELOPES[11].storageKey)throw Error('denied');return get(key);};}
 if(name==='whole-storage-read-denied')storage.failRead(true);return captureRecovery(storage,sessions,'2026-10-05T00:00:00.000Z');
}
function fixture(root){
 const profile='chromium-desktop',cases=JSON.parse(fs.readFileSync('tests/verification/rollback-browser-contract.json')).cases.filter(row=>row.profile===profile);
 const identity={commit:process.env.GITHUB_SHA??'a'.repeat(40),...verifySource(),runtimeFingerprint:RUNTIME_FINGERPRINT,buildFingerprint:BUILD_FINGERPRINT,files:89,playablePictures:80,preservedEnvelopes:4};
 const base=path.join(root,'rollback-test-results'),put=(file,bytes)=>{const p=path.join(base,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);return {file,bytes:Buffer.byteLength(bytes),sha256:hash(bytes)};};
 const records=[],events=[{event:'begin',identity,projects:[profile],tests:16,workers:1,maxFailures:1,retries:[0]}];
 for(const [index,row]of cases.entries()){
  const artifacts=[],observations=[],add=(event,data={})=>observations.push({event,profile,title:row.title,elapsedMs:observations.length,...data});
  add('begin',{runCommit:identity.commit,browserVersion:'synthetic-test-only',nodeVersion:process.version,guardedArguments:['test','--config=playwright.rollback.config.js',`--project=${profile}`],budgetMs:540000});add('seed-ready');
  const state={url:'http://127.0.0.1:4189',scrollX:0,scrollY:0,bodyOverflow:'hidden',dialogCount:1,dialog:{open:true,modal:true,visible:true,rect:{x:0,y:0},scrollTop:0,hitTests:[{insideDialog:true},{insideDialog:true},{insideDialog:true}],images:Array.from({length:10},(_,i)=>({source:`${i}.webp`,complete:true,width:512,height:512}))}};
  for(const required of REQUIRED_ARTIFACTS[row.title]){
   const file=`case-${index}/${required.name}`;
   if(required.name.startsWith('screenshot-')){const name=required.name.slice(11);add('capture-before',{name,state});artifacts.push({...required,...put(file,png(1280,720))});add('capture-after',{name,state});}
   if(required.name.startsWith('json-')){const name=required.name.slice(5);add('json-download-start',{name});artifacts.push({...required,...put(file,JSON.stringify(nativeBackup(name),null,2)+'\n')});add('json-download-complete',{name,entries:12,suggestedFilename:'moticos-preserved-saves.json'});}
   if(required.name.startsWith('postcard-')){const sample=POSTCARD_SAMPLES.find(sample=>row.title.includes(`decodes all ten ${sample.envelopeId} artworks`));for(let i=0;i<10;i++){add('image-start',{group:`collection-${sample.envelopeId}`,index:i});add('image-decoded',{group:`collection-${sample.envelopeId}`,index:i,source:`${i}.webp`,complete:true,width:512,height:512});}add('png-download-start',{name:required.name});artifacts.push({...required,...put(file,png(1536,1120,index+1))});add('png-download-complete',{name:required.name,width:1536,height:1120,colors:42,suggestedFilename:`moticos-${getRecoveryEngine(sample.envelopeId).CATALOG[sample.pieceId].name.toLowerCase().replaceAll(' ','-')}.png`});}
  }
  add('end',{status:'passed'});artifacts.push({name:'observations',contentType:'application/x-ndjson',...put(`case-${index}/observations`,observations.map(r=>JSON.stringify(r)).join('\n')+'\n')});
  const record={id:row.id,profile,title:row.title,status:'passed',expectedStatus:'passed',retry:0,durationMs:100,errors:[],artifacts};records.push(record);events.push({event:'test-begin',id:row.id,profile,title:row.title,retry:0},{event:'test-end',...record});
 }
 events.push({event:'end',status:'passed'});
 const manifest={kind:'synthetic-offline-test-fixture',identity,profiles:[profile],runStatus:'passed',terminalAcceptance:'passed-awaiting-content-review',errors:[],records};
 const report={errors:[],stats:{expected:16,unexpected:0,flaky:0,skipped:0},suites:[{specs:cases.map(row=>({file:row.file,title:row.title,tests:[{id:row.id,projectName:profile,expectedStatus:'passed',status:'expected',results:[{status:'passed',retry:0,errors:[]}]}]}))}]};
 function save(){put('evidence-manifest.json',JSON.stringify(manifest));put('results.json',JSON.stringify(report));put('progress/browser-events.jsonl',events.map(e=>JSON.stringify(e)).join('\n')+'\n');}
 save();return {profile,manifest,report,events,put,save,base};
}
it('rechecks complete restored raw evidence and rejects false completion even with updated descriptor hashes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rollback-complete-evidence-'));
 try{
  const f=fixture(root);expect(verifyCompleted(f.profile,root).cases).toBe(16);
  for(const change of [()=>f.events.splice(1,1),()=>f.events.push(f.events.at(-1)),()=>f.report.stats.skipped=1,()=>f.manifest.identity.buildFingerprint='0'.repeat(64)]){
   const prior={events:structuredClone(f.events),report:structuredClone(f.report),manifest:structuredClone(f.manifest)};change();f.save();expect(()=>verifyCompleted(f.profile,root)).toThrow();
   f.events.splice(0,f.events.length,...prior.events);Object.assign(f.report,prior.report);Object.assign(f.manifest,prior.manifest);f.save();
  }
  const target=f.manifest.records[0].artifacts.find(a=>a.name.startsWith('json-')),file=path.join(f.base,target.file),original=fs.readFileSync(file),value=JSON.parse(original);value.entries[0].sourceRaw+=' ';
  const changed=JSON.stringify(value,null,2)+'\n';Object.assign(target,f.put(target.file,changed));f.events.find(e=>e.event==='test-end').artifacts=f.manifest.records[0].artifacts;f.save();expect(()=>verifyCompleted(f.profile,root)).toThrow();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
},30000);
