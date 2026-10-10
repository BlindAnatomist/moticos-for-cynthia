// Bounded diagnostics from public Playwright reporter metadata only. Never inspect
// step arguments, return values, attachments, DOM or network data. At test end,
// the public steps hierarchy is reconciled against every received callback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,isAbsolute,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CASES,ORDER} from './policy.mjs';

export const STEP_JOURNAL_LIMITS=Object.freeze({profileBytes:16*1024*1024,recordBytes:1024,errorRecordBytes:16*1024});
const FORMAT='stage-e-step-journal-v1';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BINDING_KEYS=['sourceFingerprint','buildFingerprint','probeFingerprint','commit','parent','parentTree'];
const COUNTERS=['casesBegun','casesEnded','stepsOpened','stepsClosed','expectSteps','apiSteps','stepErrors','testErrors'];
const counters=()=>Object.fromEntries(COUNTERS.map(k=>[k,0]));
const stepCounters=()=>({stepsOpened:0,stepsClosed:0,expectSteps:0,apiSteps:0,stepErrors:0});
const digest=value=>createHash('sha256').update(value).digest('hex');
const finite=(n,label)=>{assert(Number.isFinite(n)&&n>=0,`Invalid ${label}`);return n;};
const integer=(n,label)=>{assert(Number.isSafeInteger(n)&&n>=0,`Invalid ${label}`);return n;};
function bounded(value,bytes){
  assert.equal(typeof value,'string','Journal metadata must be text');
  let text=value.slice(0,bytes);
  // Never leave an unpaired half of a valid surrogate pair at the cut.
  if(text.length<value.length&&/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);
  while(Buffer.byteLength(JSON.stringify(text))>bytes)text=text.slice(0,-1);
  if(text.length<value.length&&/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);
  return {text,...(text!==value?{sha256:digest(value)}:{})};
}
function errorField(error){
  // The public TestError text fields are the sole error inputs. In particular,
  // no JSON.stringify(error), inspection, enumeration or attachment traversal.
  let message=typeof error?.message==='string'?error.message:undefined;
  if(message===undefined)message=typeof error?.value==='string'?error.value:undefined;
  if(message===undefined)message=typeof error?.stack==='string'?error.stack:'No textual error message';
  const excerpt=bounded(message,12000).text;
  return {excerpt,sha256:digest(message),bytes:Buffer.byteLength(message),truncated:excerpt!==message};
}
function bindingOf(binding){
  const result={};
  for(const key of BINDING_KEYS){const value=binding?.[key];assert.equal(typeof value,'string',`Missing binding ${key}`);assert.match(value,key.endsWith('Fingerprint')?/^[a-f0-9]{64}$/:/^[a-f0-9]{40}$/,`Invalid binding ${key}`);result[key]=value;}
  return result;
}
function casesOf(profile,tests){
  assert(ORDER.includes(profile),'Unknown journal profile');assert(Array.isArray(tests));assert.equal(tests.length,8,'Journal requires all eight cases');
  const expected=new Map(CASES[profile].map(([code,title])=>[`${code} ${title}`,code]));
  const found=new Set(),result=new Map();
  for(const test of tests){assert.equal(typeof test.id,'string');assert(test.id.length>0&&Buffer.byteLength(test.id)<=96,'Invalid test ID');assert.equal(typeof test.title,'string');const code=expected.get(test.title);assert(code,'Unknown journal case');assert(!found.has(code)&&!result.has(test.id),'Duplicate journal case');found.add(code);result.set(test.id,{code,title:test.title});}
  return result;
}
function locationOf(location){
  if(!location)return null;
  let file=location.file;assert.equal(typeof file,'string');
  if(isAbsolute(file)){const local=relative(ROOT,file);if(local!==''&&!local.startsWith('..')&&!isAbsolute(local))file=local;}
  const part=bounded(file,140);
  return {file:part.text,line:integer(location.line,'source line'),column:integer(location.column,'source column'),...(part.sha256?{fileSha256:part.sha256}:{})};
}
function timestamp(value){assert(value instanceof Date,'Missing public start time');return finite(value.getTime(),'start time');}
function readSafeFile(file){
  const before=fs.lstatSync(file);assert(before.isFile()&&!before.isSymbolicLink(),'Journal must be a regular file');assert(before.nlink===1,'Journal cannot have hard links');assert(before.size>0&&before.size<=STEP_JOURNAL_LIMITS.profileBytes,'Journal byte cap or empty file');
  assert.equal(fs.realpathSync(file),resolve(file),'Journal path cannot traverse symlinks');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let bytes;
  try{const opened=fs.fstatSync(fd);assert.equal(opened.ino,before.ino);assert.equal(opened.dev,before.dev);bytes=fs.readFileSync(fd);const after=fs.fstatSync(fd);assert.equal(after.size,before.size);assert.equal(after.mtimeMs,before.mtimeMs);assert.equal(after.ctimeMs,before.ctimeMs);assert(bytes.length<=STEP_JOURNAL_LIMITS.profileBytes);}finally{fs.closeSync(fd);}
  return bytes;
}
function summaryOf(bytes,records,totals,status){return {format:FORMAT,bytes,records,...totals,status};}

export class StepJournal {
  constructor({file,profile,binding,tests,io=fs,maxBytes=STEP_JOURNAL_LIMITS.profileBytes}){
    this.error=null;this.closed=false;this.finished=false;this.fd=null;this.io=io;this.file=file;this.profile=profile;this.seq=0;this.bytes=0;this.nextStep=1;this.totals=counters();this.started=new Map();this.ended=new Set();this.activeSteps=new Map();this.stepIds=new WeakMap();this.stepRecords=new WeakMap();this.testTotals=new Map();this.hash=createHash('sha256');
    this._capture(()=>{
      assert(isAbsolute(file),'Journal file must be absolute');this.binding=bindingOf(binding);this.tests=casesOf(profile,tests);integer(maxBytes,'journal cap');assert(maxBytes>0&&maxBytes<=STEP_JOURNAL_LIMITS.profileBytes);this.maxBytes=maxBytes;
      const directory=dirname(file);io.mkdirSync(directory,{recursive:true});assert.equal(io.realpathSync(directory),resolve(directory),'Journal directory cannot traverse symlinks');
      this.fd=io.openSync(file,'ax',0o600);const info=io.fstatSync(this.fd);assert(info.isFile()&&info.nlink===1&&info.size===0,'Journal must be a fresh regular file');
      this._write({event:'header',format:FORMAT,binding:this.binding,cases:8,limits:{...STEP_JOURNAL_LIMITS,profileBytes:maxBytes}},true);
    });
  }
  _capture(action){
    if(this.error)return null;
    try{assert(!this.closed,'Journal already closed');return action();}
    catch(error){const message=typeof error?.message==='string'?error.message:'Unknown journal failure';this.error=new Error(bounded(message,512).text);if(this.fd!==null){try{this.io.closeSync(this.fd);}catch{}this.fd=null;}this.closed=true;return null;}
  }
  _write(fields,flush=false){
    const row={seq:this.seq,profile:this.profile,...fields};const line=Buffer.from(JSON.stringify(row)+'\n');
    assert(line.length<=(row.error?STEP_JOURNAL_LIMITS.errorRecordBytes:STEP_JOURNAL_LIMITS.recordBytes),'Journal record byte cap exceeded');assert(this.bytes+line.length<=this.maxBytes,'Journal profile byte cap exhausted');
    let offset=0;while(offset<line.length){const size=this.io.writeSync(this.fd,line,offset,line.length-offset,null);assert(Number.isSafeInteger(size)&&size>0&&size<=line.length-offset,'Journal short write made no progress');offset+=size;}
    this.hash.update(line);this.bytes+=line.length;this.seq++;if(flush)this.io.fsyncSync(this.fd);
  }
  _case(test,result){
    const info=this.tests.get(test.id);assert(info&&test.title===info.title,'Unknown or changed test identity');assert.equal(result.retry,0,'Retries cannot enter journal');return {...info,id:test.id};
  }
  testBegin(test,result){return this._capture(()=>{const info=this._case(test,result);assert(!this.started.has(info.id),'Duplicate test begin');assert.equal(this.started.size-this.ended.size,0,'Journal requires serial tests');assert.equal(test.expectedStatus,'passed','Unexpected test status');
    this._write({event:'test-begin',case:info.code,testId:info.id,title:info.title,start:timestamp(result.startTime),retry:result.retry});this.started.set(info.id,info);this.testTotals.set(info.id,stepCounters());this.totals.casesBegun++;return true;
  });}
  stepBegin(test,result,step){return this._capture(()=>{const info=this._case(test,result);assert(this.started.has(info.id)&&!this.ended.has(info.id),'Step outside active test');assert(step&&typeof step==='object'&&!this.stepIds.has(step),'Duplicate or invalid step');
    const parent=step.parent;const parentId=parent?this.stepIds.get(parent):null;assert(!parent||parentId!==undefined,'Step parent was not opened');const parentInfo=parent?this.stepRecords.get(parent):null;assert(!parent||(parentInfo&&parentInfo.testId===info.id),'Step parent is not in this case');
    const id=this.nextStep,title=bounded(step.title,180),category=step.category;assert.equal(typeof category,'string');assert(category.length>0&&Buffer.byteLength(category)<=64,'Invalid step category');
    this._write({event:'step-begin',case:info.code,id,parentId,title:title.text,...(title.sha256?{titleSha256:title.sha256}:{}),category,location:locationOf(step.location),start:timestamp(step.startTime)});
    this.nextStep++;this.stepIds.set(step,id);const record={testId:info.id,case:info.code,parentId,ended:false};this.activeSteps.set(id,record);this.stepRecords.set(step,record);
    for(const counts of [this.totals,this.testTotals.get(info.id)]){counts.stepsOpened++;if(category==='expect')counts.expectSteps++;if(category==='pw:api')counts.apiSteps++;}return true;
  });}
  stepEnd(test,result,step){return this._capture(()=>{const info=this._case(test,result),id=this.stepIds.get(step),opened=this.activeSteps.get(id);assert(opened&&opened.testId===info.id&&!this.ended.has(info.id),'Unmatched or duplicate step end');
    const error=step.error?errorField(step.error):null;
    this._write({event:'step-end',case:info.code,id,parentId:opened.parentId,durationMs:finite(step.duration,'step duration'),...(error?{error}:{})});this.activeSteps.delete(id);opened.ended=true;
    for(const counts of [this.totals,this.testTotals.get(info.id)]){counts.stepsClosed++;if(error)counts.stepErrors++;}return true;
  });}
  testEnd(test,result){return this._capture(()=>{const info=this._case(test,result);assert(this.started.has(info.id)&&!this.ended.has(info.id),'Unmatched or duplicate test end');assert.equal(this.activeSteps.size,0,'Test ended with open steps');assert(Array.isArray(result.errors),'Missing test errors');assert(['passed','failed','timedOut','skipped','interrupted'].includes(result.status),'Unknown test status');
    const counts=this.testTotals.get(info.id);assert(Array.isArray(result.steps),'Missing public result steps');const pending=result.steps.map(step=>({step,parentId:null})),seen=new Set();
    while(pending.length){const {step,parentId}=pending.pop();assert(step&&typeof step==='object','Invalid public step tree');const id=this.stepIds.get(step),record=this.stepRecords.get(step);assert(id!==undefined&&record&&record.testId===info.id&&record.ended,'Public step tree contains an omitted callback');assert(!seen.has(id),'Repeated or cyclic public step tree');assert.equal(record.parentId,parentId,'Public step parent mismatch');seen.add(id);assert(Array.isArray(step.steps),'Missing public child steps');for(const child of step.steps)pending.push({step:child,parentId:id});}
    assert.equal(seen.size,counts.stepsOpened,'Public result tree omitted a recorded step');assert.equal(counts.stepsOpened,counts.stepsClosed);if(result.status==='passed')assert(counts.expectSteps>0&&counts.apiSteps>0,'Case has no action/assertion coverage');
    this._write({event:'test-end',case:info.code,testId:info.id,status:result.status,expectedStatus:test.expectedStatus,retry:result.retry,durationMs:finite(result.duration,'test duration'),errorCount:result.errors.length,treeSteps:seen.size,...counts},true);this.ended.add(info.id);this.totals.casesEnded++;this.totals.testErrors+=result.errors.length;return true;
  });}
  finish(result){return this._capture(()=>{
    assert.equal(this.activeSteps.size,0,'Profile ended with open steps');assert.equal(this.started.size,this.ended.size,'Profile ended with open tests');assert(['passed','failed','timedout','interrupted'].includes(result.status),'Unknown profile status');
    if(result.status==='passed'){assert.equal(this.totals.casesBegun,8,'Passed profile omitted cases');assert.equal(this.totals.casesEnded,8,'Passed profile omitted case endings');}
    this._write({event:'terminal',status:result.status,durationMs:finite(result.duration,'profile duration'),...this.totals},true);this.io.closeSync(this.fd);this.fd=null;this.closed=true;this.finished=true;
    return {...summaryOf(this.bytes,this.seq,this.totals,result.status),sha256:this.hash.digest('hex')};
  });}
}

// Read after reporter close. Caller also requires the successful post-close
// summary in the bound progress stream; fsync/close failures can leave readable
// terminal bytes, so those bytes alone are never sufficient for gate acceptance.
export function verifyStepJournal(file,{profile,binding,tests,summary}={}){
  const expectedBinding=bindingOf(binding),expected=casesOf(profile,tests),bytes=readSafeFile(file);assert.equal(bytes.at(-1),10,'Journal has an incomplete final record');
  const lines=bytes.toString('utf8').split('\n');lines.pop();assert(lines.length>=2,'Missing journal terminal');
  const totals=counters(),started=new Set(),ended=new Set(),active=new Map(),knownSteps=new Map(),caseCounts=new Map();let nextStep=1,terminal=null;
  for(let seq=0;seq<lines.length;seq++){
    const row=JSON.parse(lines[seq]);assert.equal(row.seq,seq,'Journal event coverage has a gap');assert.equal(row.profile,profile,'Wrong journal profile');assert(Buffer.byteLength(lines[seq])+1<=(row.error?STEP_JOURNAL_LIMITS.errorRecordBytes:STEP_JOURNAL_LIMITS.recordBytes),'Journal record cap exceeded');
    if(seq===0){assert.equal(row.event,'header');assert.equal(row.format,FORMAT);assert.deepEqual(row.binding,expectedBinding,'Unbound journal');assert.equal(row.cases,8);assert.deepEqual({...row.limits,profileBytes:STEP_JOURNAL_LIMITS.profileBytes},STEP_JOURNAL_LIMITS);integer(row.limits.profileBytes,'profile byte cap');assert(row.limits.profileBytes>0&&row.limits.profileBytes<=STEP_JOURNAL_LIMITS.profileBytes&&bytes.length<=row.limits.profileBytes);continue;}
    assert(!terminal,'Events after terminal');
    if(row.event==='test-begin'){
      const info=expected.get(row.testId);assert(info&&info.code===row.case&&info.title===row.title,'Unknown journal case');assert(!started.has(row.testId),'Duplicate test begin');assert.equal(started.size-ended.size,0,'Overlapping journal tests');assert.equal(row.retry,0);finite(row.start,'test start');started.add(row.testId);caseCounts.set(row.case,stepCounters());totals.casesBegun++;
    }else if(row.event==='step-begin'){
      const match=[...expected.entries()].find(([,info])=>info.code===row.case);assert(match&&started.has(match[0])&&!ended.has(match[0]),'Step outside active test');assert.equal(row.id,nextStep++,'Step IDs have gaps');assert(row.parentId===null||Number.isSafeInteger(row.parentId),'Invalid parent ID');const parent=row.parentId===null?null:knownSteps.get(row.parentId);assert(row.parentId===null||(parent&&parent.case===row.case),'Missing step parent');
      assert.equal(typeof row.title,'string');assert.equal(typeof row.category,'string');assert(row.category.length>0&&Buffer.byteLength(row.category)<=64);finite(row.start,'step start');if(row.location){assert.equal(typeof row.location.file,'string');integer(row.location.line,'source line');integer(row.location.column,'source column');}if(row.titleSha256)assert.match(row.titleSha256,/^[a-f0-9]{64}$/);
      const record={case:row.case,parentId:row.parentId};active.set(row.id,record);knownSteps.set(row.id,record);for(const counts of [totals,caseCounts.get(row.case)]){counts.stepsOpened++;if(row.category==='expect')counts.expectSteps++;if(row.category==='pw:api')counts.apiSteps++;}
    }else if(row.event==='step-end'){
      const opened=active.get(row.id);assert(opened&&opened.case===row.case&&opened.parentId===row.parentId,'Unmatched step end');finite(row.durationMs,'step duration');if(row.error){assert.equal(typeof row.error.excerpt,'string');assert.match(row.error.sha256,/^[a-f0-9]{64}$/);integer(row.error.bytes,'error bytes');assert.equal(typeof row.error.truncated,'boolean');if(!row.error.truncated){assert.equal(row.error.bytes,Buffer.byteLength(row.error.excerpt));assert.equal(row.error.sha256,digest(row.error.excerpt));}else assert(row.error.bytes>Buffer.byteLength(row.error.excerpt));totals.stepErrors++;}
      active.delete(row.id);totals.stepsClosed++;const local=caseCounts.get(row.case);local.stepsClosed++;if(row.error)local.stepErrors++;
    }else if(row.event==='test-end'){
      const info=expected.get(row.testId);assert(info&&info.code===row.case&&started.has(row.testId)&&!ended.has(row.testId),'Unmatched test end');assert.equal(active.size,0,'Test ended with open steps');assert.equal(row.retry,0);assert.equal(row.expectedStatus,'passed');assert.equal(row.status,'passed','Nonpassing case in journal');assert.equal(row.errorCount,0,'Case errors in journal');finite(row.durationMs,'test duration');const counts=caseCounts.get(row.case);for(const [key,value]of Object.entries(counts))assert.equal(row[key],value,`Case ${key} mismatch`);assert.equal(row.treeSteps,counts.stepsOpened);assert(counts.expectSteps>0&&counts.apiSteps>0,'Case has no action/assertion coverage');ended.add(row.testId);knownSteps.clear();totals.casesEnded++;totals.testErrors+=row.errorCount;
    }else if(row.event==='terminal'){
      assert.equal(seq,lines.length-1,'Terminal is not last');assert.equal(row.status,'passed','Nonpassing journal terminal');finite(row.durationMs,'profile duration');assert.equal(active.size,0);assert.equal(started.size,8);assert.equal(ended.size,8);for(const key of COUNTERS)assert.equal(row[key],totals[key],`Journal ${key} mismatch`);assert(totals.stepsOpened>0&&totals.expectSteps>0&&totals.apiSteps>0,'Journal has no action/assertion coverage');terminal=row;
    }else assert.fail('Unknown journal event');
  }
  assert(terminal,'Missing journal terminal');assert.equal(totals.stepsOpened,totals.stepsClosed);
  const audit={...summaryOf(bytes.length,lines.length,totals,terminal.status),sha256:digest(bytes)};
  if(summary!==undefined)assert.deepEqual(summary,audit,'Progress/journal audit mismatch');return audit;
}
