import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isRecorderPng,evidenceEligibility,verifyFailureEvidence} from '../../gate/evidence-policy.mjs';
import {packageEvidence,hashFile,scanSizes,verifyCaps} from '../../gate/package.mjs';
const profile='campaign-webkit-phone',stem=profile+'/raw/.playwright-artifacts-6/',guid='0123456789abcdef0123456789abcdef',png=stem+guid+'.png';
const reports=()=>({'campaign-chromium':{suites:[]},[profile]:{suites:[]}});
function picture(value=0){
 const crc=b=>{let c=0xffffffff;for(const byte of b){c^=byte;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,8+data.length)),8+data.length);return b;};
 const h=Buffer.alloc(13);h.writeUInt32BE(1);h.writeUInt32BE(1,4);h[8]=8;h[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',h),chunk('IDAT',deflateSync(Buffer.from([0,value,0,0,255]))),chunk('IEND',Buffer.alloc(0))]);
}
test('only direct canonical GUID PNGs in the exact recorder directory qualify',()=>{
 assert(isRecorderPng(png));assert(isRecorderPng('campaign-results/'+png));
 for(const path of[stem+'test-failed-1.png',stem+'trace.zip',stem+'other.png',stem+guid.toUpperCase()+'.png',stem+'traces/'+guid+'.png','other/'+png,png.replace('raw/','screenshots/'),png.replace('artifacts-6','artifacts-x'),png.replace('campaign-webkit-phone','unknown')])assert.equal(isRecorderPng(path),false,path);
});
test('all attachment references including nested steps and ambiguous basenames retain originals',()=>{
 for(const path of[png,'/home/runner/work/repo/campaign-results/'+png,'raw/.playwright-artifacts-6/'+guid+'.png',guid+'.png','/unknown/'+guid+'.png']){
  const r=reports();r[profile].suites=[{steps:[{attachments:[{name:'image',path}]}]}];assert(evidenceEligibility(r)(png));
 }
 for(const r of[{}, {[profile]:null}, {[profile]:{suites:[],attachments:'bad'}}, {[profile]:{suites:[],attachments:[{}]}}])assert(evidenceEligibility(r)(png));
 assert.equal(evidenceEligibility(reports())(png),false);
});
test('missing canonical failure screenshot or trace cannot be substituted by a recorder image',()=>{
 const image=profile+'/raw/P07/test-failed-1.png',trace=profile+'/raw/P07/trace.zip';
 const r=reports();r[profile].suites=[{specs:[{tests:[{results:[{status:'timedOut',attachments:[{path:image},{path:trace}]}]}]}]}];
 verifyFailureEvidence([{file:image},{file:trace}],r);
 for(const missing of[image,trace])assert.throws(()=>verifyFailureEvidence([{file:image},{file:trace},{file:png}].filter(row=>row.file!==missing),r),/Missing canonical failure evidence/);
 r[profile].suites[0].specs[0].tests[0].results[0].attachments=[{path:png},{path:trace}];assert.throws(()=>verifyFailureEvidence([{file:png},{file:trace}],r));
});
test('sizing verification and upload omit duplicate and nonduplicate recorder PNGs with an immutable hashed ledger',()=>{
 const root=mkdtempSync(join(tmpdir(),'campaign-recorder-png-')),cwd=process.cwd();
 try{
  const write=(file,data)=>{const path=join(root,'campaign-results',file);mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,data);};
  for(const [p,report] of Object.entries(reports()))write(p+'/results.json',JSON.stringify(report));
  const original=picture(),other=picture(255),planned=profile+'/screenshots/P07-unsaved-purchase.png';
  write(planned,original);write(profile+'/screenshots/manifest.json',JSON.stringify([{path:'campaign-results/'+planned,bytes:original.length,sha256:createHash('sha256').update(original).digest('hex'),dimensions:[1,1]}]));
  write(png,original);const second=stem+'fedcba9876543210fedcba9876543210.png';write(second,other);
  assert(original.equals(readFileSync(join(root,'campaign-results',png))));assert(!original.equals(other));
  process.chdir(root);const before=[png,second].map(file=>({file,sha256:hashFile('campaign-results/'+file)}));
  const m=packageEvidence();assert.equal(m.status,'incomplete');assert.equal(m.kind,undefined,'Must use full verifier, not diagnostics due to recorder PNGs');
  const ledger=JSON.parse(readFileSync('campaign-upload/working-trace-omissions.json'));assert.equal(ledger.files.length,2);
  for(const row of before){assert.equal(hashFile('campaign-results/'+row.file),row.sha256);assert(!existsSync('campaign-upload/'+row.file));assert(!m.files.some(f=>f.file==='campaign-results/'+row.file));const omission=ledger.files.find(f=>f.file===row.file);assert.equal(omission.sha256,row.sha256);assert(omission.bytes>0);assert.match(omission.reason,/unreferenced.*attachments cross-checked/);}
  assert(readFileSync('campaign-upload/'+planned).equals(original));
  assert(scanSizes('campaign-upload').some(row=>row.file.endsWith('results.json')));
 }finally{process.chdir(cwd);rmSync(root,{recursive:true,force:true});}
});

test('PNG cap stays 26 and referenced or unknown images cannot evade it',()=>{
 const fixed=Array.from({length:23},(_,i)=>({file:profile+'/screenshots/'+i+'.png',bytes:1})).concat([{file:profile+'/postcards/one.png',bytes:1},{file:profile+'/postcards/two.png',bytes:1},{file:profile+'/raw/P07/test-failed-1.png',bytes:1}]);
 const rows=fixed.concat([{file:png,bytes:1},{file:stem+'fedcba9876543210fedcba9876543210.png',bytes:1}]);
 assert.throws(()=>verifyCaps(rows),/PNG cap/);verifyCaps(rows.filter(row=>evidenceEligibility(reports())(row.file)));
 const r=reports();r[profile].suites=[{attachments:[{path:png}]}];assert.throws(()=>verifyCaps(rows.filter(row=>evidenceEligibility(r)(row.file))),/PNG cap/);
 assert.throws(()=>verifyCaps(fixed.concat({file:stem+'unknown.png',bytes:1}).filter(row=>evidenceEligibility(reports())(row.file))),/PNG cap/);
});

test('cross-profile exact attachment paths retain recorder PNGs at report and nested result levels',()=>{
 const file='campaign-webkit-phone/raw/.playwright-artifacts-0/03cbebeb377945f457428758352e5009.png';
 for(const nested of[false,true]){
  const r=reports(),attachments=[{path:'/home/runner/campaign-results/'+file}];
  r['campaign-chromium']=nested?{suites:[{specs:[{tests:[{results:[{attachments}]}]}]}]}:{suites:[],attachments};
  assert.equal(evidenceEligibility(r)(file),true);
 }
});
test('cross-profile ambiguous basename references retain recorder PNGs',()=>{
 for(const path of[guid+'.png','/unknown/'+guid+'.png']){
  const r=reports();r['campaign-chromium'].suites=[{specs:[{tests:[{results:[{attachments:[{path}]}]}]}]}];
  assert.equal(evidenceEligibility(r)(png),true);
 }
});
test('missing or malformed other-profile reports cannot prove recorder PNGs unreferenced',()=>{
 for(const other of[undefined,null,{}, {suites:'bad'}, {suites:[],attachments:'bad'}, {suites:[],attachments:[{}]}]){
  const r=reports();if(other===undefined)delete r['campaign-chromium'];else r['campaign-chromium']=other;
  assert.equal(evidenceEligibility(r)(png),true);
 }
});
