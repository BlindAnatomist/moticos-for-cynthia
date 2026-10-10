import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,basename,dirname} from 'node:path';
import {flatten} from '../../gate/results.mjs';
import {verifyPng} from '../../gate/png.mjs';
import {digest,regularBytes,filesUnder} from '../../full-campaign-gate/evidence.mjs';
import {verifyStepJournal} from './step-journal.mjs';
import {CASES,PROFILE_SCREENSHOTS,ROOT,ORDER,EVIDENCE_SCOPES,SCREENSHOT_DIMENSIONS} from './policy.mjs';
import {artifactUsage,enforceUsage} from './bounded-process.mjs';
const read=file=>JSON.parse(fs.readFileSync(file));
export function verifyInputEvidence(proof,profile){
 assert.equal(proof.scope,EVIDENCE_SCOPES[profile],'Input evidence scope changed');assert(Array.isArray(proof.events)&&proof.events.length>0&&proof.events.length<=8192);assert(Array.isArray(proof.steps));
 for(const event of proof.events){assert.equal(typeof event.type,'string');assert.equal(typeof event.isTrusted,'boolean');}
 for(const step of proof.steps){assert.equal(typeof step.label,'string');assert(Number.isSafeInteger(step.eventStart)&&step.eventStart>=0);assert(Number.isSafeInteger(step.eventEnd)&&step.eventEnd>=step.eventStart&&step.eventEnd<=proof.events.length);}
 const trusted=(type,pointerType=null)=>assert(proof.events.some(e=>e.type===type&&e.isTrusted&&(pointerType===null||e.pointerType===pointerType)),`Missing trusted ${pointerType??''} ${type} evidence`);
 if(profile===ORDER[0]&&proof.caseId==='E01')for(const type of ['pointerdown','pointermove','pointerup'])trusted(type,'touch');
 if(profile===ORDER[0]&&proof.caseId==='E04'){trusted('pointercancel','touch');trusted('lostpointercapture','touch');assert(proof.events.some(e=>e.type==='pointerdown'&&e.isTrusted&&e.pointerType==='touch'&&e.isPrimary===false),'Missing trusted secondary touch evidence');}
 if(profile===ORDER[1]&&proof.caseId==='E03')trusted('pointerdown','touch');
 if(proof.caseId==='E07')for(const type of ['dragstart','drop'])trusted(type);
 if(proof.caseId==='E08')trusted('keydown');
 if(profile===ORDER[1]&&['E01','E02','E03','E04','E05','E06'].includes(proof.caseId)){
  assert(proof.steps.some(s=>s.label.includes('synthetic-webkit-pointer-handler-with-capture-shim')),'Synthetic WebKit scope must be explicitly labeled');
  for(const type of ['pointerdown','pointermove'])assert(proof.events.some(e=>e.type===type&&!e.isTrusted&&e.pointerType==='touch'),'Missing explicitly untrusted synthetic touch evidence');
 }
 return true;
}
export function validateCompletedProfile(profile,binding){
 const root=join(ROOT,profile),report=read(join(root,'results.json'));
 assert.deepEqual(report.errors??[],[]);assert.deepEqual(report.config.projects.map(p=>p.name),ORDER);for(const p of report.config.projects){assert.equal(p.retries,0);assert.equal(p.repeatEach,1);} for(const[k,v]of Object.entries({workers:1,fullyParallel:false,forbidOnly:true,maxFailures:1}))assert.equal(report.config[k],v);
 const rows=flatten(report.suites),expected=CASES[profile].map(([id,title])=>`${id} ${title}`);
 assert.deepEqual(rows.map(r=>r.title).sort(),expected.slice().sort());assert.equal(rows.length,8);
 for(const row of rows){assert.equal(row.project,profile);assert.equal(row.status,'expected');assert.equal(row.expectedStatus,'passed');assert.equal(row.results.length,1);assert.equal(row.results[0].status,'passed');assert.equal(row.results[0].retry,0);assert.deepEqual(row.results[0].errors??[],[]);}
 assert.equal(report.stats.expected,8);for(const key of ['skipped','unexpected','flaky'])assert.equal(report.stats[key],0);
 const files=filesUnder(root),proofs=files.filter(file=>basename(file)==='proof.json').map(file=>({file,value:JSON.parse(regularBytes(root,file))}));assert.equal(proofs.length,8);
 assert.deepEqual(proofs.map(p=>p.value.caseId).sort(),CASES[profile].map(c=>c[0]).sort());const screenshots=[];
 for(const{file,value:p}of proofs){
  const spec=CASES[profile].find(c=>c[0]===p.caseId),testRow=rows.find(r=>r.title===`${spec[0]} ${spec[1]}`);
  verifyInputEvidence(p,profile);assert.equal(p.error,null,'A completed proof cannot retain an error');assert.equal(p.testId,testRow.id);assert.equal(p.testTitle,testRow.title);assert.equal(p.project,profile);
  const references=(testRow.results[0].attachments??[]).filter(a=>a.name==='proof-reference');assert.equal(references.length,1);assert.equal(references[0].contentType,'application/json');
  const ref=JSON.parse(Buffer.from(references[0].body,'base64').toString('utf8'));assert.equal(ref.file,'proof.json');assert.equal(ref.caseId,p.caseId);const bytes=regularBytes(root,file);assert.equal(ref.bytes,bytes.length);assert.equal(ref.sha256,digest(bytes));
  for(const key of ['sourceFingerprint','buildFingerprint','probeFingerprint']){assert.equal(ref[key],binding[key]);assert.equal(p[key],binding[key]);}
  assert(Array.isArray(p.screenshots));const required=PROFILE_SCREENSHOTS[profile].filter(n=>n.startsWith(p.caseId+'-'));assert.deepEqual(p.screenshots.map(r=>r.name).sort(),required.slice().sort());
  for(const row of p.screenshots){assert.equal(basename(row.name),row.name);const path=join(dirname(file),row.name),png=regularBytes(root,path);assert.equal(png.length,row.bytes);assert.equal(digest(png),row.sha256);assert.deepEqual(row.dimensions,SCREENSHOT_DIMENSIONS[row.name],'Screenshot must match its fixed profile viewport and device scale');verifyPng(png,row.dimensions);screenshots.push(row.name);}
 }
 assert.deepEqual(screenshots.sort(),PROFILE_SCREENSHOTS[profile].slice().sort());assert.equal(files.filter(f=>f.toLowerCase().endsWith('.png')).length,screenshots.length);
 const events=fs.readFileSync(join(root,'progress/browser-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 const begin=events.find(e=>e.event==='begin');assert(begin);assert.equal(begin.tests,8);assert.equal(begin.workers,1);assert.equal(begin.maxFailures,1);assert.deepEqual(begin.retries,[0]);assert.deepEqual(begin.projects,[profile]);
 const starts=events.filter(e=>e.event==='test-begin'),ends=events.filter(e=>e.event==='test-end');assert.equal(starts.length,8);assert.equal(ends.length,8);for(const group of [starts,ends])assert.deepEqual(group.map(e=>e.id).sort(),rows.map(r=>r.id).sort());assert(ends.every(e=>e.project===profile&&e.status==='passed'&&e.retry===0&&e.errors.length===0));
 assert.equal(events.filter(e=>e.event==='begin').length,1);assert.equal(events.filter(e=>e.event==='end').length,1);assert.equal(events.find(e=>e.event==='end').status,'passed');assert.equal(events.filter(e=>e.event==='error').length,0);
 for(const event of events)for(const key of Object.keys(binding))assert.equal(event[key],binding[key]);
 const journals=events.filter(e=>e.event==='step-journal');assert.equal(journals.length,1);const journal=verifyStepJournal(join(root,'progress/action-assertion-journal.jsonl'),{profile,binding,tests:rows.map(r=>({id:r.id,title:r.title})),summary:journals[0].journal});
 enforceUsage(artifactUsage(ROOT));return{profile,status:'passed',cases:8,screenshots:screenshots.length,postcards:0,journal};
}
