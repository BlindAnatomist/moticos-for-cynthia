// Playwright 1.61.1 discards successful trace ZIPs but leaves raw trace chunks
// until the worker retires. Only a terminal expected pass permits their cleanup.
// Active/failing traces and all retained test evidence remain fully counted.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {join,resolve,relative,parse} from 'node:path';
import {CASES,ORDER} from './policy.mjs';
function regular(path){const s=fs.lstatSync(path);assert(s.isFile()&&!s.isSymbolicLink(),'Temporary trace must be a regular file');return s;}
function stableHash(path){const before=regular(path),fd=fs.openSync(path,'r'),hash=createHash('sha256'),buffer=Buffer.alloc(65536);try{let size;while((size=fs.readSync(fd,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,size));const after=fs.fstatSync(fd);assert.equal(after.ino,before.ino);assert.equal(after.size,before.size);assert.equal(after.mtimeMs,before.mtimeMs,'Trace is still changing');}finally{fs.closeSync(fd);}return{bytes:before.size,sha256:hash.digest('hex'),ino:before.ino,mtimeMs:before.mtimeMs};}
function header(path){regular(path);const fd=fs.openSync(path,'r'),b=Buffer.alloc(65536);let n;try{n=fs.readSync(fd,b,0,b.length,0);}finally{fs.closeSync(fd);}const end=b.subarray(0,n).indexOf(10);assert(end>=0,'Bounded trace header is unavailable');return JSON.parse(b.subarray(0,end).toString('utf8'));}
export function cleanupPassedTraces({rawRoot,testId,title,profile,status,expectedStatus,retry,errors}) {
  if(status!=='passed'||expectedStatus!=='passed'||retry!==0||!Array.isArray(errors)||errors.length)return{status:'preserved-nonpass',removedBytes:0,files:[]};
  assert(ORDER.includes(profile));assert(CASES[profile].some(([id,name])=>`${id} ${name}`===title),'Unknown terminal case');assert.match(testId,/^[a-f0-9]{20}-[a-f0-9]{20}$/,'Pinned Playwright case identity required');
  const root=resolve(rawRoot);assert.notEqual(root,parse(root).root);const result={status:'discarded-closed-passed-traces',testId,title,profile,removedBytes:0,files:[]};
  if(!fs.existsSync(root))return result;assert.equal(fs.realpathSync(root),root,'Trace root cannot traverse a symlink');
  const traceName=new RegExp(`^${testId}(?:-recording\\d+)?\\.trace$`),plans=[];
  for(const worker of fs.readdirSync(root).filter(n=>/^\.playwright-artifacts-\d+$/.test(n))){
    const folder=join(root,worker);assert(fs.lstatSync(folder).isDirectory()&&!fs.lstatSync(folder).isSymbolicLink());const traces=join(folder,'traces');if(!fs.existsSync(traces))continue;assert(fs.lstatSync(traces).isDirectory()&&!fs.lstatSync(traces).isSymbolicLink());const names=fs.readdirSync(traces);
    for(const name of names.filter(n=>traceName.test(n))){
      const path=join(traces,name),h=header(path);assert.equal(h.type,'context-options');assert.equal(h.origin,'library');assert.equal(h.version,8);assert.equal(h.playwrightVersion,'1.61.1');assert(h.title?.endsWith(' › '+title),'Trace header belongs to another case');
      const stem=name.slice(0,-'.trace'.length),network=new RegExp(`^${stem}(?:-pwnetcopy-\\d+)?\\.network$`);
      for(const owned of [name,...names.filter(n=>network.test(n))]){const file=join(traces,owned);plans.push({file,path:relative(root,file),...stableHash(file)});}
    }
  }
  assert.equal(new Set(plans.map(p=>p.path)).size,plans.length);
  // All ownership and regular-file checks precede removal. Shared resources,
  // other case IDs, unknown files, ZIPs, proofs and images are never selected.
  try{for(const plan of plans){const now=regular(plan.file);assert.equal(now.ino,plan.ino);assert.equal(now.size,plan.bytes);assert.equal(now.mtimeMs,plan.mtimeMs);fs.unlinkSync(plan.file);const row={path:plan.path,bytes:plan.bytes,sha256:plan.sha256};result.files.push(row);result.removedBytes+=row.bytes;}}
  catch(error){error.cleanup=result;throw error;}
  return result;
}
