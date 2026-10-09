import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('extra executable guard changed recovery fixture and future workflow cannot retain a valid source seal',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'moticos-source-negative-'));
 try{
  fs.cpSync(process.cwd(),root,{recursive:true,filter:src=>!/(^|\/)(\.git|node_modules|dist-career|dist-full-probe|full-browser-results)(\/|$)/.test(src)});
  const check=()=>spawnSync(process.execPath,['full-campaign-gate/binding.mjs','source'],{cwd:root,encoding:'utf8'});
  assert.equal(check().status,0,'Isolated unchanged baseline must verify');
  const canary=path.join(root,'full-browser-evidence/unreviewed-canary.test.mjs');fs.writeFileSync(canary,"throw Error('This canary must never execute');\n");assert.notEqual(check().status,0,'Added executable must invalidate source');fs.unlinkSync(canary);assert.equal(check().status,0);
  const stageCanary=path.join(root,'stage-a-evidence/unreviewed-canary.test.mjs');fs.writeFileSync(stageCanary,"throw Error('Unreviewed Stage A executable');\n");assert.notEqual(check().status,0);fs.unlinkSync(stageCanary);assert.equal(check().status,0);
  const fixture=path.join(root,'campaign-evidence/full-basic-journey.json'),original=fs.readFileSync(fixture);fs.appendFileSync(fixture,' ');assert.notEqual(check().status,0,'Consumed fixture byte change must invalidate source');fs.writeFileSync(fixture,original);assert.equal(check().status,0);
  const workflow=path.join(root,'.github/workflows/unreviewed-wrapper.yml');fs.writeFileSync(workflow,'# synthetic negative-test wrapper; never executed\n');assert.notEqual(check().status,0,'Any new workflow must require a new seal');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
