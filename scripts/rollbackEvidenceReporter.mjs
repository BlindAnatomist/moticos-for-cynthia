import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyFrozenInputs } from './verifyRollbackInventory.mjs';
export { verifyFrozenInputs } from './verifyRollbackInventory.mjs';
import { ALL_CASES, REQUIRED_ARTIFACTS, POSTCARD_SAMPLES, PROFILES, RUNTIME_FINGERPRINT, BUILD_FINGERPRINT } from '../tests/rollback-browser/plan.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function auditResults(records, projects = PROFILES.map(p => p.name), outputDirectory = null) {
  const errors = [], expected = projects.flatMap(profile => ALL_CASES.map(title => `${profile}::${title}`)), seenFiles = new Set();
  for (const id of expected) {
    const matches = records.filter(r => `${r.profile}::${r.title}` === id);
    if (matches.length !== 1 || matches[0].status !== 'passed' || matches[0].retry !== 0) errors.push(`Missing, repeated, skipped or non-passing terminal case: ${id}`);
  }
  if (records.length !== expected.length) errors.push('Unexpected terminal case count.');
  for (const record of records) {
    const id = `${record.profile}::${record.title}`, artifacts = Array.isArray(record.artifacts) ? record.artifacts : [];
    for (const required of REQUIRED_ARTIFACTS[record.title] ?? []) {
      const matches = artifacts.filter(a => a.name === required.name);
      if (matches.length !== 1 || matches[0].contentType !== required.contentType) errors.push(`Missing, duplicate or wrong-type evidence: ${id} / ${required.name}`);
    }
    const seenNames = new Set();
    for (const artifact of artifacts) {
      if (seenNames.has(artifact.name)) errors.push(`Duplicate attachment name: ${id} / ${artifact.name}`);
      seenNames.add(artifact.name);
      if (artifact.error || typeof artifact.file !== 'string' || !artifact.file || !Number.isSafeInteger(artifact.bytes) || artifact.bytes <= 0 || !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? '')) {
        errors.push(`Unreadable or unverified evidence attachment: ${id} / ${artifact.name}`); continue;
      }
      if (seenFiles.has(artifact.file)) errors.push(`Reused evidence file: ${id} / ${artifact.file}`);
      seenFiles.add(artifact.file);
      if (outputDirectory) {
        try {
          const root = path.resolve(outputDirectory), file = path.resolve(root, artifact.file);
          if (!file.startsWith(root + path.sep)) throw Error('Attachment escaped the bounded result directory');
          const bytes = fs.readFileSync(file);
          if (bytes.length !== artifact.bytes || sha(bytes) !== artifact.sha256) throw Error('Attachment bytes changed after capture');
        } catch (error) { errors.push(`Unreadable or changed evidence file: ${id} / ${artifact.name}: ${error}`); }
      }
    }
  }
  for (const profile of projects) for (const sample of POSTCARD_SAMPLES) {
    const name = `postcard-${sample.envelopeId}-${sample.pieceId}`;
    const matches = records.filter(r => r.profile === profile).flatMap(r => r.artifacts ?? []).filter(a => a.name === name && a.contentType === 'image/png');
    if (matches.length !== 1) errors.push(`Missing or duplicate native postcard PNG: ${profile} / ${name}`);
  }
  return errors;
}
export default class RollbackEvidenceReporter {
  constructor() { this.records=[]; this.errors=[]; this.projects=[]; this.output=path.resolve('rollback-test-results'); this.listing=process.argv.includes('--list'); this.eventFile=path.join(this.output,'progress/browser-events.jsonl'); }
  event(value){fs.mkdirSync(path.dirname(this.eventFile),{recursive:true});fs.appendFileSync(this.eventFile,JSON.stringify({...value,at:new Date().toISOString()})+'\n');}
  onBegin(config, suite) {
    if(this.listing)return;
    try {
      this.projects=[...new Set(suite.allTests().map(t=>t.parent.project().name))];this.identity=verifyFrozenInputs();
      this.event({event:'begin',identity:this.identity,projects:this.projects,tests:suite.allTests().length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(suite.allTests().map(t=>t.retries))]});
      if(config.workers!==1||config.maxFailures!==1||this.projects.length!==1)this.errors.push('One worker, one profile and one failure maximum are required.');
      if(config.projects.filter(p=>this.projects.includes(p.name)).some(p=>p.retries!==0))this.errors.push('Acceptance retries must be zero.');
      for(const p of this.projects)if(!PROFILES.some(x=>x.name===p))this.errors.push(`Unexpected profile ${p}`);
      if(suite.allTests().length!==this.projects.length*ALL_CASES.length)this.errors.push('Collected acceptance matrix changed.');
    } catch(error) {this.errors.push(`Evidence initialization failed: ${error}`);}
  }
  onTestBegin(test,result){if(!this.listing)this.event({event:'test-begin',id:test.id,profile:test.parent.project().name,title:test.title,retry:result.retry});}
  onError(error){if(!this.listing)this.event({event:'error',message:error.message??String(error)});}
  onTestEnd(test,result) {
    if(this.listing)return;
    try {
      const artifacts=result.attachments.filter(a=>a.path).map(a=>{
        try {const file=path.resolve(a.path);if(!file.startsWith(this.output+path.sep))throw Error('Evidence outside the bounded result directory');const bytes=fs.readFileSync(file);return {name:a.name,file:path.relative(this.output,file),bytes:bytes.length,sha256:sha(bytes),contentType:a.contentType,review:'pending actual pixel/content review'};}
        catch(error){return {name:a.name,error:String(error)};}
      });
      const record={id:test.id,profile:test.parent.project().name,title:test.title,status:result.status,expectedStatus:test.expectedStatus,retry:result.retry,durationMs:result.duration,errors:result.errors,artifacts};this.records.push(record);this.event({event:'test-end',...record});
    } catch(error) {this.errors.push(`Evidence collection failed: ${error}`);}
  }
  onEnd(result) {
    if(this.listing)return;
    try {
      this.event({event:'end',status:result.status});
      this.errors.push(...auditResults(this.records,this.projects,this.output));if(!this.projects.length)this.errors.push('No acceptance profile completed.');
      const manifest={kind:'focused-rollback-browser-supplement',identity:this.identity,profiles:this.projects,expectedCases:this.projects.length*ALL_CASES.length,expectedPostcardPNGs:this.projects.length*POSTCARD_SAMPLES.length,runStatus:result.status,terminalAcceptance:this.errors.length===0&&result.status==='passed'?'passed-awaiting-content-review':'incomplete-or-failed',visualReview:'pending; no artifact is automatically pixel-approved',records:this.records,errors:this.errors};
      fs.mkdirSync(this.output,{recursive:true});fs.writeFileSync(path.join(this.output,'evidence-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
      if(this.errors.length)return {status:'failed'};
    } catch(error) {process.stderr.write(`Rollback evidence manifest failed: ${error}\n`);return {status:'failed'};}
  }
}
