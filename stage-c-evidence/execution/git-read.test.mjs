import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
import {scopedReadArgs} from './git-read.mjs';
const run=(cwd,args,env)=>spawnSync('git',args,{cwd,env,encoding:'utf8'});
function fixture(){const root=fs.mkdtempSync(join(os.tmpdir(),'c280-owned-read-'));const repo=join(root,'owned-checkout'),other=join(root,'other-checkout'),checkoutHome=join(root,'checkout-home'),scriptHome=join(root,'script-home');for(const p of [repo,other,checkoutHome,scriptHome])fs.mkdirSync(p);const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('GIT_'))delete env[key];Object.assign(env,{HOME:scriptHome,XDG_CONFIG_HOME:join(scriptHome,'xdg'),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:join(scriptHome,'.gitconfig')});
 for(const p of [repo,other]){assert.equal(run(p,['init','-q'],env).status,0);fs.writeFileSync(join(p,'fixture.txt'),'synthetic owned checkout\n');assert.equal(run(p,['add','fixture.txt'],env).status,0);assert.equal(run(p,['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic proof\n\nMoticos-fixture: exact'],env).status,0);}
 const head=run(repo,['rev-parse','HEAD'],env).stdout.trim();const protectedEnv={...env,GIT_TEST_ASSUME_DIFFERENT_OWNER:'1'};fs.writeFileSync(join(checkoutHome,'.gitconfig'),`[safe]\n\tdirectory = ${repo}\n`);return{root,repo,other,checkoutHome,scriptHome,env:protectedEnv,head};}
test('HOME mismatch reproduces dubious ownership; only exact process-scoped reads succeed',()=>{const f=fixture();try{
 const temporary={...f.env,HOME:f.checkoutHome,GIT_CONFIG_GLOBAL:join(f.checkoutHome,'.gitconfig')};assert.equal(run(f.repo,['rev-parse','HEAD'],temporary).status,0);
 const rejected=run(f.repo,['rev-parse','HEAD'],f.env);assert.equal(rejected.status,128);assert.match(rejected.stderr,/dubious ownership/);
 const configs=[join(f.repo,'.git/config'),join(f.checkoutHome,'.gitconfig')].map(p=>[p,fs.readFileSync(p)]);
 for(const args of [['rev-parse','HEAD'],['rev-parse',`${f.head}^{tree}`],['merge-base','--is-ancestor',f.head,'HEAD'],['show','-s','--format=%B','HEAD']]){const read=run(f.repo,scopedReadArgs(f.repo,args),f.env);assert.equal(read.status,0,read.stderr);if(args[0]==='show')assert.match(read.stdout,/Moticos-fixture: exact/);}
 const unknown=run(f.repo,scopedReadArgs(f.repo,['merge-base','--is-ancestor','f'.repeat(40),'HEAD']),f.env);assert.notEqual(unknown.status,0);assert(!unknown.stderr.includes('dubious ownership'),'Ancestry failure must remain a Git object failure');
 assert.equal(run(f.repo,['rev-parse','HEAD'],f.env).status,128,'Trust must not persist after command');for(const [p,bytes]of configs)assert.deepEqual(fs.readFileSync(p),bytes);assert.equal(fs.existsSync(join(f.scriptHome,'.gitconfig')),false);
 const sibling=run(f.other,scopedReadArgs(f.repo,['rev-parse','HEAD']),f.env);assert.equal(sibling.status,128);assert.match(sibling.stderr,/dubious ownership/);
 // Clear even a pre-existing wildcard only inside this command, then admit
 // our exact checkout. The synthetic global file remains byte-identical.
 fs.writeFileSync(join(f.scriptHome,'.gitconfig'),'[safe]\n\tdirectory = *\n');const wildcard=fs.readFileSync(join(f.scriptHome,'.gitconfig'));
 assert.equal(run(f.other,['rev-parse','HEAD'],f.env).status,0);assert.equal(run(f.other,scopedReadArgs(f.repo,['rev-parse','HEAD']),f.env).status,128);assert.deepEqual(fs.readFileSync(join(f.scriptHome,'.gitconfig')),wildcard);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}});
test('helper cannot broaden trust or perform repository writes',()=>{
 const root=resolve('/tmp/exact-checkout');assert.deepEqual(scopedReadArgs(root,['rev-parse','HEAD']),['-c','safe.directory=','-c',`safe.directory=${root}`,'rev-parse','HEAD']);
 for(const path of ['/','/tmp/*','*'])assert.throws(()=>scopedReadArgs(path,['rev-parse','HEAD']));
 for(const args of [['config','--global','safe.directory','*'],['checkout','main'],['rev-parse','--git-dir'],['show','HEAD'],['-c','safe.directory=*','rev-parse','HEAD'],['merge-base','--is-ancestor','untrusted','HEAD']])assert.throws(()=>scopedReadArgs(root,args),/Only fixed/);
 for(const file of ['binding.mjs','precheck.mjs','authorize.mjs']){const source=fs.readFileSync(new URL('./'+file,import.meta.url),'utf8');assert(source.includes("import {gitRead} from './git-read.mjs'"));assert(!source.includes("execFileSync('git'"));}
});
