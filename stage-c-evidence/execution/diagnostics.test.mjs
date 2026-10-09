import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {finalizeEvidence} from './finalize.mjs';
import {ORDER,LIMITS} from './policy.mjs';

test('full proof remains exact while attachment is a bounded hash reference',()=>{
  const root=fs.mkdtempSync(join(os.tmpdir(),'c280-proof-reference-'));
  try{
    const binding={sourceFingerprint:'a'.repeat(64),buildFingerprint:'b'.repeat(64)};
    fs.writeFileSync(join(root,'stage-c-build.json'),JSON.stringify(binding));
    const module=new URL('../browser/helpers.mjs',import.meta.url).href;
    const script=`import fs from 'node:fs';import assert from 'node:assert/strict';import {record} from ${JSON.stringify(module)};
      const data={families:[{familyId:'crab',before:{retained:'whole state '.repeat(100000)},restored:{values:[1,2,3]}}],assertionData:{passed:true}};
      let attachment;const info={title:'C10 Use all eight sources with Cut/Undo and earned-sorter callbacks',outputDir:process.cwd(),outputPath:name=>process.cwd()+'/'+name,attach:async(name,options)=>{attachment={name,...options,body:options.body.toString('utf8')};}};
      const proof=await record(info,data);assert.deepEqual(proof.families,data.families);assert.deepEqual(proof.assertionData,data.assertionData);fs.writeFileSync('attachment.json',JSON.stringify(attachment));`;
    const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
    const bytes=fs.readFileSync(join(root,'proof.json')),proof=JSON.parse(bytes),attachment=JSON.parse(fs.readFileSync(join(root,'attachment.json'))),reference=JSON.parse(attachment.body);
    assert(bytes.length>1000000);assert(attachment.body.length<512);assert.equal(attachment.name,'proof-reference');assert.equal(attachment.contentType,'application/json');assert(!Object.hasOwn(attachment,'path'));
    assert.deepEqual(reference,{file:'proof.json',caseId:'C10',...binding,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    assert.deepEqual(proof.screenshots,[]);assert.equal(proof.families[0].before.retained,'whole state '.repeat(100000));
    assert.deepEqual(fs.readdirSync(root).sort(),['attachment.json','proof.json','stage-c-build.json']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native payload tracing is disabled while explicit evidence and failure capture remain required',()=>{
  const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
  const config=read('./playwright.config.mjs'),validator=read('./validate.mjs'),reporter=read('./reporter.mjs'),scope=read('../browser/scope.mjs'),helpers=read('../browser/helpers.mjs');
  assert(config.includes("trace:'off'"));assert(config.includes("screenshot:'off'"));assert(config.includes("video:'off'"));
  for(const name of ['onStepBegin','onStepEnd','testBegin','testEnd','finish'])assert(reporter.includes(name));
  assert(reporter.includes("return{status:'failed'}"));assert(!reporter.includes('cleanupPassedTraces'));
  assert(validator.includes('verifyStepJournal'));assert(validator.includes('Journal receipt differs from retained bytes'));assert(validator.includes('Native payload traces must not be generated'));
  assert(validator.includes("assert.equal(rows.filter(r=>r.path.endsWith('.png')).length,82)"));assert(validator.includes("Exactly ten native case proofs required"));
  assert(scope.includes("info.outputPath('failure.png')"));assert(scope.includes("info.outputPath('failure-state.json')"));assert(scope.includes('recentWrites:'));assert(scope.includes('save:{raw:'));
  assert(helpers.includes("page.screenshot({path,fullPage:true})"));assert(helpers.includes('await download.saveAs(path)'));assert(helpers.includes('verifyPng(bytes,[1536,1120])'));
});


test('over-cap fallback preserves bounded journals and explicit failure diagnostics byte-for-byte',async()=>{
  const root=fs.mkdtempSync(join(os.tmpdir(),'c280-journal-fallback-')),results=join(root,'results'),output=join(root,'upload');
  try{
    const expected=[];for(const profile of ORDER){const path=`${profile}/progress/action-assertion-journal.jsonl`,bytes=Buffer.alloc(3*1024*1024,profile===ORDER[0]?65:66);fs.mkdirSync(join(results,path,'..'),{recursive:true});fs.writeFileSync(join(results,path),bytes);expected.push({path,bytes});}
    for(const [name,value]of [['failure-state.json','{"error":"original failure"}\n'],['failure.png','original failure PNG fixture']]){const path=`${ORDER[0]}/raw/C10/${name}`,bytes=Buffer.from(value);fs.mkdirSync(join(results,path,'..'),{recursive:true});fs.writeFileSync(join(results,path),bytes);expected.push({path,bytes});}
    // An unknown PNG forces the existing safe over-cap path without producing
    // a huge file. This is diagnostic copy testing, never a valid browser PNG.
    fs.writeFileSync(join(results,'unknown.png'),'invalid unapproved fixture');
    const pass=await finalizeEvidence({output,resultsRoot:results,setupRoot:join(root,'no-setup'),validator:{command:process.execPath,args:['-e','process.exitCode=1'],cwd:root}});assert.equal(pass,false);
    assert.equal(JSON.parse(fs.readFileSync(join(output,'over-cap.json'))).status,'incomplete-or-failed');
    for(const {path,bytes}of expected){assert.deepEqual(fs.readFileSync(join(output,'diagnostics',path)),bytes);assert.deepEqual(fs.readFileSync(join(results,path)),bytes);}
    function size(path){return fs.readdirSync(path,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?size(join(path,e.name)):fs.statSync(join(path,e.name)).size),0);}
    assert(size(output)<LIMITS.artifactBytes);assert(!fs.existsSync(join(output,'diagnostics','unknown.png')));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
