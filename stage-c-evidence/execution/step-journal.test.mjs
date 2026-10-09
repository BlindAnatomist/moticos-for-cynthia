import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {StepJournal,verifyStepJournal,STEP_JOURNAL_LIMITS} from './step-journal.mjs';
import {CASES,ORDER,TARGET} from './policy.mjs';

const profile=ORDER[0],binding={sourceFingerprint:'a'.repeat(64),buildFingerprint:'b'.repeat(64),probeFingerprint:'c'.repeat(64),commit:'d'.repeat(40),parent:TARGET.parent,parentTree:TARGET.parentTree};
const tests=CASES[profile].map(([code,title])=>({id:`test-${code}`,title:`${code} ${title}`,expectedStatus:'passed'}));
const result=()=>({retry:0,status:'passed',startTime:new Date('2026-10-09T12:00:00Z'),duration:10,errors:[],steps:[]});
const step=(category='pw:api',parent=undefined)=>({title:category==='expect'?'expect.toEqual':'page.evaluate',category,parent,location:{file:'stage-c-evidence/browser/early.spec.mjs',line:23,column:4},startTime:new Date('2026-10-09T12:00:00Z'),duration:1,steps:[]});
function fixture(t,options={}){const dir=fs.mkdtempSync(join(os.tmpdir(),'c280-journal-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=join(dir,'step-journal.jsonl');return {dir,file,journal:new StepJournal({file,profile,binding,tests,...options})};}
function complete(journal,{mutate=()=>{},recoverable=false}={}){
  for(const [index,current]of tests.entries()){
    const r=result();mutate(current,r);assert(journal.testBegin(current,r));
    const parent=step('test.step');r.steps.push(parent);mutate(parent);assert(journal.stepBegin(current,r,parent));
    for(const category of ['pw:api','expect']){const s=step(category,parent);parent.steps.push(s);if(recoverable&&index===0&&category==='expect')s.error={message:'A polling attempt was not ready yet'};mutate(s);assert(journal.stepBegin(current,r,s));assert(journal.stepEnd(current,r,s));}
    assert(journal.stepEnd(current,r,parent));assert(journal.testEnd(current,r));
  }
  return journal.finish({status:'passed',duration:100});
}
const rows=file=>fs.readFileSync(file,'utf8').trimEnd().split('\n').map(JSON.parse);
const writeRows=(file,data)=>fs.writeFileSync(file,data.map(JSON.stringify).join('\n')+'\n');

test('complete public reporter chronology binds once and audits all ten cases',t=>{
  const {file,journal}=fixture(t);assert.equal(journal.error,null);const summary=complete(journal,{recoverable:true});assert.equal(journal.error,null);assert.equal(journal.closed,true);assert.equal(journal.finished,true);
  assert.deepEqual(verifyStepJournal(file,{profile,binding,tests,summary}),summary);assert.equal(summary.casesBegun,10);assert.equal(summary.casesEnded,10);assert.equal(summary.stepsOpened,30);assert.equal(summary.stepsClosed,30);assert.equal(summary.expectSteps,10);assert.equal(summary.apiSteps,10);assert.equal(summary.stepErrors,1);assert.equal(summary.testErrors,0);assert.equal(summary.records,82);
  const events=rows(file);assert.deepEqual(events[0].binding,binding);assert(events.slice(1).every(row=>!('binding'in row)&&!('sourceFingerprint'in row)));const firstBegin=events.find(row=>row.event==='step-begin'),firstEnd=events.find(row=>row.event==='step-end');assert.equal(firstBegin.parentId,null);assert.equal(firstEnd.parentId,firstBegin.id);assert(!('title'in firstEnd));assert(!('location'in firstEnd));assert.deepEqual(events.map(row=>row.seq),events.map((_,index)=>index));
  assert.equal(summary.sha256,createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
});

test('huge arguments results attachments and unknown properties are never read or serialized',t=>{
  const {file,journal}=fixture(t);const giant='DO_NOT_SERIALIZE_PAYLOAD'.repeat(1000000);let forbiddenReads=0;
  const mutate=(object,other)=>{for(const item of [object,other].filter(Boolean)){for(const name of ['arguments','args','params','returnValue','result','attachments','resources','network','dom','toJSON'])Object.defineProperty(item,name,{configurable:true,get(){forbiddenReads++;throw Error(`Forbidden ${name}`);}});Object.defineProperty(item,'hugeUnknown',{configurable:true,value:giant,enumerable:true});}};
  const summary=complete(journal,{mutate});assert.equal(forbiddenReads,0);assert(summary.bytes<30000);assert(!fs.readFileSync(file,'utf8').includes('DO_NOT_SERIALIZE_PAYLOAD'));assert.deepEqual(verifyStepJournal(file,{profile,binding,tests,summary}),summary);
  // Restore shared test objects so their intentionally hostile properties cannot
  // affect unrelated tests or be mistaken for mutable production state.
  for(const current of tests)for(const key of ['arguments','args','params','returnValue','result','attachments','resources','network','dom','toJSON','hugeUnknown'])delete current[key];
});

test('giant textual metadata and error excerpts are bounded and hashes retain identity',t=>{
  const {file,journal}=fixture(t),current=tests[0],r=result(),s=step('expect');const text='😀\n"\\'.repeat(20000);s.title=text;s.location.file=text;s.error={message:text};Object.defineProperty(s.error,'attachments',{get(){throw Error('No error attachment reads');}});Object.defineProperty(s.error,'toJSON',{get(){throw Error('No whole error serialization');}});
  r.steps.push(s);r.status='failed';r.errors=[s.error];assert(journal.testBegin(current,r));assert(journal.stepBegin(current,r,s));assert(journal.stepEnd(current,r,s));assert(journal.testEnd(current,r));const data=rows(file),begin=data.find(row=>row.event==='step-begin'),end=data.find(row=>row.event==='step-end');assert.equal(begin.titleSha256,createHash('sha256').update(text).digest('hex'));assert.equal(begin.location.fileSha256,begin.titleSha256);assert.equal(end.error.sha256,begin.titleSha256);assert.equal(end.error.bytes,Buffer.byteLength(text));assert.equal(end.error.truncated,true);assert(Buffer.byteLength(JSON.stringify(begin)+'\n')<=1024);assert(Buffer.byteLength(JSON.stringify(end)+'\n')<=16384);assert(end.error.excerpt.length<text.length);
  // A legitimate failed partial run may preserve a terminal diagnostic, but can
  // never satisfy the complete-pass verifier.
  const summary=journal.finish({status:'failed',duration:10});assert(summary);assert.throws(()=>verifyStepJournal(file,{profile,binding,tests}),/Nonpassing/);
});

test('profile cap exhaustion is sticky, preserves raw bytes and cannot emit a pass',t=>{
  const {file,journal}=fixture(t,{maxBytes:4096}),current=tests[0],r=result();assert(journal.testBegin(current,r));
  for(let index=0;index<100&&!journal.error;index++){const s=step();journal.stepBegin(current,r,s);journal.stepEnd(current,r,s);}
  assert.match(journal.error.message,/byte cap exhausted/);const preserved=fs.readFileSync(file);assert(preserved.length<=4096);assert.equal(journal.testEnd(current,r),null);assert.equal(journal.finish({status:'passed',duration:10}),null);assert.deepEqual(fs.readFileSync(file),preserved);assert(!rows(file).some(row=>row.event==='terminal'));assert.throws(()=>verifyStepJournal(file,{profile,binding,tests}));
});

test('exclusive creation never overwrites existing evidence or follows symlinks',t=>{
  const {dir,file,journal}=fixture(t);const first=fs.readFileSync(file);const duplicate=new StepJournal({file,profile,binding,tests});assert(duplicate.error);assert.deepEqual(fs.readFileSync(file),first);journal.finish({status:'failed',duration:0});
  const target=join(dir,'existing.txt');fs.writeFileSync(target,'preserve me');const symlink=join(dir,'linked.jsonl');fs.symlinkSync(target,symlink);const linked=new StepJournal({file:symlink,profile,binding,tests});assert(linked.error);assert.equal(fs.readFileSync(target,'utf8'),'preserve me');const linkedDir=join(dir,'linked-directory');fs.symlinkSync(dir,linkedDir);const indirect=new StepJournal({file:join(linkedDir,'fresh.jsonl'),profile,binding,tests});assert.match(indirect.error.message,/symlink/);assert(!fs.existsSync(join(dir,'fresh.jsonl')));
});

test('short writes finish safely while zero-progress and disk errors fail closed',t=>{
  const shortIo={...fs,writeSync(fd,buffer,offset,length,position){return fs.writeSync(fd,buffer,offset,Math.min(length,17),position);}};const good=fixture(t,{io:shortIo});const summary=complete(good.journal);assert.deepEqual(verifyStepJournal(good.file,{profile,binding,tests,summary}),summary);
  for(const behavior of ['zero','throw','partial']){
    let armed=false,calls=0;const io={...fs,writeSync(fd,buffer,offset,length,position){if(!armed)return fs.writeSync(fd,buffer,offset,length,position);calls++;if(behavior==='zero')return 0;if(behavior==='partial'&&calls===1)return fs.writeSync(fd,buffer,offset,5,position);throw Error('Synthetic ENOSPC');}};
    const {file,journal}=fixture(t,{io});armed=true;assert.equal(journal.testBegin(tests[0],result()),null);assert(journal.error);const bytes=fs.readFileSync(file);assert.equal(journal.finish({status:'passed',duration:10}),null);assert.deepEqual(fs.readFileSync(file),bytes);assert.throws(()=>verifyStepJournal(file,{profile,binding,tests}));
  }
});

test('durability is synchronous per event and fsynced at header case endings and finish',t=>{
  let syncs=0,writes=0,closes=0;const io={...fs,writeSync(...args){writes++;return fs.writeSync(...args);},fsyncSync(...args){syncs++;return fs.fsyncSync(...args);},closeSync(...args){closes++;return fs.closeSync(...args);}};const {journal}=fixture(t,{io});assert.equal(syncs,1);assert.equal(writes,1);const summary=complete(journal);assert.equal(syncs,12);assert.equal(writes,summary.records);assert.equal(closes,1);
});

test('final fsync or close errors with readable terminal never yield a success summary',t=>{
  for(const phase of ['fsync','close']){let syncs=0,failed=false;const io={...fs,fsyncSync(fd){syncs++;if(phase==='fsync'&&syncs===12){failed=true;throw Error('Synthetic final fsync failure');}fs.fsyncSync(fd);},closeSync(fd){if(phase==='close'&&!failed){failed=true;throw Error('Synthetic close failure');}fs.closeSync(fd);}};const {file,journal}=fixture(t,{io});const summary=complete(journal);assert.equal(summary,null);assert(journal.error);assert.equal(journal.finished,false);assert.throws(()=>verifyStepJournal(file,{profile,binding,tests,summary}),/audit mismatch/);}
});

test('unmatched missing duplicated cross-case and premature closure events fail closed',t=>{
  for(const misuse of [
    (j,c,r)=>j.stepEnd(c,r,step()),
    (j,c,r)=>{const s=step();j.stepBegin(c,r,s);j.stepBegin(c,r,s);},
    (j,c,r)=>{const s=step();j.stepBegin(c,r,s);j.stepEnd(c,r,s);j.stepEnd(c,r,s);},
    (j,c,r)=>j.stepBegin(c,r,step('expect',step())),
    (j,c,r)=>{const s=step();j.stepBegin(c,r,s);j.testEnd(c,r);},
    (j,c,r)=>{const s=step();j.stepBegin(c,r,s);j.stepEnd(tests[1],r,s);},
    (j,c,r)=>j.testBegin(c,r),
    (j,c,r)=>j.testBegin(tests[1],r),
    (j,c,r)=>j.finish({status:'passed',duration:1}),
  ]){const {file,journal}=fixture(t);const current=tests[0],r=result();journal.testBegin(current,r);misuse(journal,current,r);assert(journal.error);assert.equal(journal.finish({status:'passed',duration:10}),null);assert.throws(()=>verifyStepJournal(file,{profile,binding,tests}));}
});

test('auditor rejects truncated altered missing unbound duplicated and reordered evidence',t=>{
  const base=fixture(t),summary=complete(base.journal),original=fs.readFileSync(base.file),events=rows(base.file);
  for(const mutate of [
    data=>data.pop(),
    data=>data.splice(3,1),
    data=>data[3].seq++,
    data=>data[0].binding.commit='e'.repeat(40),
    data=>data[1].profile=ORDER[1],
    data=>data[2].parentId=999,
    data=>data[3].id=99,
    data=>data.at(-1).stepsOpened++,
    data=>data.at(-1).casesEnded--,
    data=>data[8].status='failed',
    data=>data[1].retry=1,
    data=>data.push({...data.at(-1),seq:data.length}),
    data=>{const row=data.splice(3,1)[0];data.splice(4,0,row);},
  ]){const changed=structuredClone(events);mutate(changed);writeRows(base.file,changed);assert.throws(()=>verifyStepJournal(base.file,{profile,binding,tests,summary}));}
  fs.writeFileSync(base.file,original.subarray(0,-2));assert.throws(()=>verifyStepJournal(base.file,{profile,binding,tests}),/incomplete/);fs.writeFileSync(base.file,original);assert.throws(()=>verifyStepJournal(base.file,{profile,binding,tests,summary:{...summary,bytes:summary.bytes+1}}),/audit mismatch/);
});

test('fresh identity and exact ten-case inventory are required before writing',t=>{
  for(const overrides of [{tests:tests.slice(1)},{tests:[tests[0],...tests.slice(0,9)]},{binding:{...binding,commit:'wrong'}},{profile:'other-profile'},{maxBytes:STEP_JOURNAL_LIMITS.profileBytes+1}]){const {file,journal}=fixture(t,overrides);assert(journal.error);assert(!fs.existsSync(file));}
});

test('every case requires its own action and assertion coverage',t=>{
  for(const categories of [[],['pw:api'],['expect']]){const {journal,file}=fixture(t),current=tests[0],r=result();assert(journal.testBegin(current,r));for(const category of categories){const s=step(category);r.steps.push(s);assert(journal.stepBegin(current,r,s));assert(journal.stepEnd(current,r,s));}assert.equal(journal.testEnd(current,r),null);assert.match(journal.error.message,/Case has no action\/assertion coverage/);assert.equal(journal.finish({status:'passed',duration:1}),null);assert.throws(()=>verifyStepJournal(file,{profile,binding,tests}));}
});

test('public tree reconciliation detects omitted root nested begin and end callbacks',t=>{
  for(const variant of ['root','nested','begin-only','removed-from-tree','duplicate','wrong-parent']){
    const {journal,file}=fixture(t),current=tests[0],r=result(),parent=step('test.step'),api=step('pw:api',parent),expect=step('expect',parent);r.steps.push(parent);parent.steps.push(api,expect);assert(journal.testBegin(current,r));assert(journal.stepBegin(current,r,parent));for(const s of [api,expect]){assert(journal.stepBegin(current,r,s));assert(journal.stepEnd(current,r,s));}
    if(variant==='nested')parent.steps.push(step('expect',parent));
    if(variant==='root')r.steps.push(step('pw:api'));
    if(variant==='begin-only'){const orphan=step('expect',parent);parent.steps.push(orphan);assert(journal.stepBegin(current,r,orphan));}
    if(variant==='removed-from-tree')parent.steps.pop();
    if(variant==='duplicate')parent.steps.push(expect);
    if(variant==='wrong-parent'){parent.steps.pop();r.steps.push(expect);}
    journal.stepEnd(current,r,parent);journal.testEnd(current,r);assert(journal.error,variant);assert.equal(journal.finish({status:'passed',duration:1}),null);assert.throws(()=>verifyStepJournal(file,{profile,binding,tests}));
  }
});

test('all ten cases cannot pass when one complete case callback pair is missing',t=>{
  const {journal,file}=fixture(t);
  for(const current of tests.slice(0,-1)){const r=result();assert(journal.testBegin(current,r));for(const category of ['pw:api','expect']){const s=step(category);r.steps.push(s);assert(journal.stepBegin(current,r,s));assert(journal.stepEnd(current,r,s));}assert(journal.testEnd(current,r));}
  assert.equal(journal.finish({status:'passed',duration:10}),null);assert.match(journal.error.message,/omitted cases/);assert(!rows(file).some(row=>row.event==='terminal'));assert.throws(()=>verifyStepJournal(file,{profile,binding,tests}));
});

test('thirty thousand complete step pairs fit the fixed profile budget without sampling',t=>{
  const {journal,file}=fixture(t);const count=3000;
  for(const current of tests){const r=result();assert(journal.testBegin(current,r));for(let index=0;index<count;index++){const s=step(index%2?'expect':'pw:api');r.steps.push(s);assert(journal.stepBegin(current,r,s));assert(journal.stepEnd(current,r,s));}assert(journal.testEnd(current,r));}
  const summary=journal.finish({status:'passed',duration:100});assert(summary);assert.equal(summary.stepsOpened,30000);assert.equal(summary.stepsClosed,30000);assert(summary.bytes<STEP_JOURNAL_LIMITS.profileBytes);assert(summary.bytes/30000<550);assert.deepEqual(verifyStepJournal(file,{profile,binding,tests,summary}),summary);
  t.diagnostic(`${summary.stepsOpened} step pairs: ${summary.bytes} bytes (${(summary.bytes/summary.stepsOpened).toFixed(1)} bytes/pair)`);
});

test('valid asynchronous children may begin or finish after their parent closes',t=>{
  const {journal,file}=fixture(t);
  for(const current of tests){const r=result(),parent=step('test.step'),api=step('pw:api',parent),expect=step('expect',parent);r.steps.push(parent);parent.steps.push(api,expect);assert(journal.testBegin(current,r));assert(journal.stepBegin(current,r,parent));assert(journal.stepBegin(current,r,api));assert(journal.stepEnd(current,r,parent));assert(journal.stepBegin(current,r,expect));assert(journal.stepEnd(current,r,expect));assert(journal.stepEnd(current,r,api));assert(journal.testEnd(current,r));}
  const summary=journal.finish({status:'passed',duration:100});assert.equal(journal.error,null);assert.deepEqual(verifyStepJournal(file,{profile,binding,tests,summary}),summary);
});
