import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join,resolve,isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import {CASES,ORDER,BUDGETS,LIMITS,CONFIG,TARGET,AUTHORIZATION_REFERENCE,SCREENSHOTS,POSTCARDS,invocation,admit,approval} from './policy.mjs';
import {CASES as BROWSER_CASES,SCREENSHOTS as BROWSER_SHOTS,PROFILE_MS} from '../browser/scope.mjs';
import {verifyCollection} from './collection.mjs';
import {validateReport,verifyNodeLog} from './validate.mjs';
import {SOURCE_ROOTS,SOURCE_FILES,canonicalFingerprint,naturalDimensions} from './binding.mjs';
import {REPO_ROOT,executionPaths,webServerConfig} from './paths.mjs';
import {assetPaths,createAssetServer} from './server-core.mjs';
import {artifactUsage,enforceUsage,boundedProcess,classifyPngNames,enforceImageCounts} from './bounded-process.mjs';
import {finalizeEvidence} from './finalize.mjs';
import {digest} from '../../full-campaign-gate/evidence.mjs';
import {verifyPng} from '../../gate/png.mjs';

const id={sourceFingerprint:'a'.repeat(64),buildFingerprint:'b'.repeat(64),probeFingerprint:'c'.repeat(64),commit:'d'.repeat(40),parent:TARGET.parent,parentTree:TARGET.parentTree};
const env={MOTICOS_280_PUBLIC_REPO:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:TARGET.repository,GITHUB_REF:TARGET.ref,GITHUB_SHA:id.commit,GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'push',GITHUB_RUN_ID:'123',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux'};
const accepted=()=>({status:'explicit-owner-approved',scope:'moticos-280-20-cases',...id,profiles:ORDER,limits:LIMITS,authorizationReference:AUTHORIZATION_REFERENCE});
function synthetic(){const config={workers:1,fullyParallel:false,forbidOnly:true,maxFailures:1,projects:ORDER.map(name=>({name,retries:0,repeatEach:1}))},reports={},events={},collection={errors:[],config,suites:[{specs:[]}]};
  for(const p of ORDER){const specs=CASES[p].map(([code,title])=>({id:'source-'+code,title:code+' '+title,tests:[{projectName:p,expectedStatus:'passed',status:'expected',results:[{status:'passed',retry:0}]}]}));reports[p]={errors:[],config,suites:[{specs}],stats:{unexpected:0,skipped:0,flaky:0,expected:10}};
    for(const s of specs){let target=collection.suites[0].specs.find(x=>x.id===s.id);if(!target){target={...structuredClone(s),tests:[]};collection.suites[0].specs.push(target);}target.tests.push(...s.tests.map(t=>({...t,results:[]})));}
    events[p]=[{event:'begin',tests:10,workers:1,maxFailures:1,retries:[0],projects:[p]},...specs.flatMap(s=>[{event:'test-begin',id:s.id,project:p,retry:0},{event:'test-end',id:s.id,project:p,retry:0,status:'passed',errors:[]}]),{event:'end',status:'passed',durationMs:10}].map(e=>({...e,...id}));
  }return {collection,reports,events};
}

test('approved 20 instances and exact evidence remain separate from historic 58',()=>{
  assert.deepEqual(ORDER.map(p=>CASES[p].length),[10,10]);assert.deepEqual(CASES[ORDER[0]],BROWSER_CASES);assert.deepEqual(SCREENSHOTS,BROWSER_SHOTS);assert.equal(PROFILE_MS,870000);
  assert.deepEqual(CASES[ORDER[0]].map(row=>row[2]),[60000,75000,150000,60000,75000,90000,60000,120000,120000,120000]);assert.equal(CASES[ORDER[0]].reduce((n,r)=>n+r[2],0),930000);assert.deepEqual(ORDER.map(p=>BUDGETS[p]),[870000,870000]);const config=fs.readFileSync(new URL('./playwright.config.mjs',import.meta.url),'utf8');assert(config.includes('actionTimeout:7500'));assert(config.includes('navigationTimeout:15000'));assert(config.includes('expect:{timeout:7500}'));assert.equal(LIMITS.setupSeconds,600);assert.equal(LIMITS.cleanupSeconds+LIMITS.reserveSeconds,180);assert.equal(LIMITS.jobSeconds,2160);
  assert.equal(SCREENSHOTS.length,25);assert.equal(new Set(SCREENSHOTS).size,25);assert.equal(POSTCARDS.length,11);assert.equal(LIMITS.routinePngs+LIMITS.postcardPngs+LIMITS.failurePngs,73);assert.equal(LIMITS.artifactBytes,128*1024*1024);
});
test('exact argv denies filters extra flags repeats retries and unapproved project',()=>{
  assert(invocation(['test',`--config=${CONFIG}`,'--list','--reporter=json']).listing);
  for(const p of ORDER)assert.equal(invocation(['test',`--config=${CONFIG}`,`--project=${p}`]).profile,p);
  for(const tail of [[],['--grep=C01'],['--project=full-chromium'],[`--project=${ORDER[0]}`,'--workers=2'],[`--project=${ORDER[0]}`,'--retries=1'],[`--project=${ORDER[0]}`,'--repeat-each=2'],['--list']])assert.throws(()=>invocation(['test',`--config=${CONFIG}`,...tail]));
});
test('admission preserves case standards and clips each full profile to remaining total time',()=>{
  assert.equal(admit(ORDER[0],600),870000);assert.equal(admit(ORDER[1],1200),780000);assert.equal(admit(ORDER[1],1979),1000);assert.throws(()=>admit(ORDER[1],1980));assert.throws(()=>admit(ORDER[0],-1));assert.throws(()=>admit('old-240',0));
  for(const p of ORDER)for(const elapsed of [0,600,1200,1979]){const ms=admit(p,elapsed);assert(ms<=BUDGETS[p]);assert(elapsed+ms/1000+LIMITS.cleanupSeconds+LIMITS.reserveSeconds<=LIMITS.jobSeconds);}
});
test('approval rejects historic grants changed budgets sources commits targets reruns and self-hosted',()=>{
  assert(approval(accepted(),id,env));
  for(const [key,value]of Object.entries({status:'draft',scope:'moticos-240-58-cases',authorizationReference:'historical-approval',sourceFingerprint:'f'.repeat(64),buildFingerprint:'f'.repeat(64),probeFingerprint:'f'.repeat(64),commit:'f'.repeat(40),parent:'f'.repeat(40),parentTree:'f'.repeat(40),profiles:[],limits:{...LIMITS,retries:1}}))assert.throws(()=>approval({...accepted(),[key]:value},id,env));
  for(const [key,value]of Object.entries({MOTICOS_280_PUBLIC_REPO:'false',GITHUB_ACTIONS:'false',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'f'.repeat(40),GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'2',RUNNER_ENVIRONMENT:'self-hosted',RUNNER_OS:'macOS'}))assert.throws(()=>approval(accepted(),id,{...env,[key]:value}));
});
test('collection rejects missing duplicate skipped executed and extra project instances',()=>{
  const base=synthetic().collection;assert.equal(verifyCollection(base).cases,20);
  for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs[1].id=r.suites[0].specs[0].id,r=>r.suites[0].specs[0].tests[0].expectedStatus='skipped',r=>r.suites[0].specs[0].tests[0].results=[{status:'passed'}],r=>r.suites[0].specs[0].tests[1].projectName=ORDER[0],r=>r.config.workers=2,r=>r.config.projects[0].repeatEach=2]){const copy=structuredClone(base);mutate(copy);assert.throws(()=>verifyCollection(copy));}
});
test('terminal validation never promotes skipped retried timed out or unbound results to pass',()=>{
  const base=synthetic(),p=ORDER[0];assert.equal(validateReport(p,base.reports[p],base.events[p],id),10);
  for(const mutate of [s=>s.reports[p].stats.skipped=1,s=>s.reports[p].suites[0].specs[0].tests[0].results.push({status:'passed',retry:1}),s=>s.events[p].pop(),s=>s.events[p][1].sourceFingerprint='wrong',s=>s.events[p].at(-1).durationMs=BUDGETS[p]+1,s=>s.events[p][0].tests=9,s=>s.reports[p].suites[0].specs[0].tests[0].results[0].status='skipped']){const copy=structuredClone(base);mutate(copy);assert.throws(()=>validateReport(p,copy.reports[p],copy.events[p],id));}
  assert.equal(verifyNodeLog('# tests 3\n# pass 3\n# fail 0\n# skipped 0\n# cancelled 0\n# todo 0\n'),3);assert.throws(()=>verifyNodeLog('# tests 3\n# pass 3\n# skipped 1\n'));
});
test('source inventory is explicit and Git-free while runner binding pins accepted ancestor',()=>{
  for(const name of ['src','public','stage-c-evidence','stage-b-evidence','gate','tests','.github'])assert(SOURCE_ROOTS.includes(name));assert(!SOURCE_ROOTS.includes('.git'));assert(SOURCE_FILES.includes('package-lock.json'));
  const src=fs.readFileSync(new URL('./binding.mjs',import.meta.url),'utf8');assert(src.includes('fixtures.generated.json.gz'));assert.equal(TARGET.parent,'8c12d874b27ce6108b1fb770037d99d3444bf0d0');assert.equal(TARGET.parentTree,'d3a7e9f1243013418c16b418458b677353a84cdb');
  assert.notEqual(canonicalFingerprint({files:[{sha256:'a'}]}),canonicalFingerprint({files:[{sha256:'b'}]}));
  const dimensions=Buffer.alloc(30);dimensions.write('RIFF');dimensions.writeUInt32LE(22,4);dimensions.write('WEBPVP8X',8);dimensions.writeUInt32LE(10,16);dimensions.writeUIntLE(1023,24,3);dimensions.writeUIntLE(511,27,3);assert.deepEqual(naturalDimensions(dimensions),[1024,512]);
});
test('all nested config outputs and web-server cwd are repository-root absolute',()=>{
  for(const p of ORDER){const x=executionPaths(p),web=webServerConfig();for(const f of [x.root,x.raw,x.json,x.progress,x.reporter,x.server,web.cwd])assert(isAbsolute(f));assert(x.raw.startsWith(join(REPO_ROOT,'stage-c-browser-results')));assert.equal(web.cwd,REPO_ROOT);assert.equal(web.command,`${JSON.stringify(process.execPath)} ${JSON.stringify(x.server)}`);}
});
test('dual current and frozen-v6 probe paths share a verified origin and reject mutated bytes',async()=>{
  const dir=fs.mkdtempSync(join(os.tmpdir(),'c280-server-'));let server;
  try{const coreRoot=join(dir,'core'),probeRoot=join(dir,'probe');const coreFiles=['dist-career/career.html'],probeFiles=['stage-c-evidence/browser/probe/current/index.html','stage-c-evidence/browser/probe/v6/index.html','assets/probe.js'];
    const rows=(root,files)=>files.map(file=>{fs.mkdirSync(join(root,file,'..'),{recursive:true});const b=Buffer.from(file);fs.writeFileSync(join(root,file),b);return {file,bytes:b.length,sha256:digest(b)};});
    const paths=assetPaths({files:rows(coreRoot,coreFiles)},{files:rows(probeRoot,probeFiles)},coreRoot,probeRoot);server=createAssetServer(paths);await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin=`http://127.0.0.1:${server.address().port}`;
    for(const path of ['/career.html','/stage-c-probe/index.html','/stage-c-v6-probe/index.html','/stage-c-probe/assets/probe.js'])assert.equal((await fetch(origin+path)).status,200);
    assert.equal((await fetch(origin+'/unsealed.js')).status,404);assert.equal((await fetch(origin+'/career.html',{method:'POST'})).status,405);fs.writeFileSync(join(coreRoot,coreFiles[0]),'changed');assert.equal((await fetch(origin+'/career.html')).status,500);
  }finally{if(server)await new Promise(ok=>server.close(ok));fs.rmSync(dir,{recursive:true,force:true});}
});
test('PNG validation checks real decompression CRC dimensions and trailing data',()=>{
  const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;};
  const chunk=(name,b)=>{const all=Buffer.alloc(12+b.length);all.writeUInt32BE(b.length);all.write(name,4);b.copy(all,8);all.writeUInt32BE(crc(all.subarray(4,8+b.length)),8+b.length);return all;};
  const h=Buffer.alloc(13);h.writeUInt32BE(1);h.writeUInt32BE(1,4);h[8]=8;h[9]=6;const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',h),chunk('IDAT',deflateSync(Buffer.from([0,255,0,0,255]))),chunk('IEND',Buffer.alloc(0))]);
  assert.deepEqual(verifyPng(png,[1,1]),{width:1,height:1,decodedBytes:5});assert.throws(()=>verifyPng(png,[2,1]));const broken=Buffer.from(png);broken[45]^=1;assert.throws(()=>verifyPng(broken,[1,1]));assert.throws(()=>verifyPng(Buffer.concat([png,Buffer.from([0])]),[1,1]));
});
test('artifact watchdog enforces total PNG trace and byte ceilings without following symlinks',()=>{
  const complete={bytes:100,pngs:73,traces:1,routinePngs:50,postcardPngs:22,failurePngs:1,unknownPngs:0};enforceUsage(complete);for(const v of [{...complete,bytes:LIMITS.artifactBytes},{...complete,pngs:74,failurePngs:2},{...complete,traces:2}])assert.throws(()=>enforceUsage(v));
  const dir=fs.mkdtempSync(join(os.tmpdir(),'c280-watchdog-'));try{fs.writeFileSync(join(dir,'C03-crab-zero.png'),'bytes');assert.deepEqual(artifactUsage(dir),{bytes:5,pngs:1,traces:0,routinePngs:1,postcardPngs:0,failurePngs:0,unknownPngs:0});fs.symlinkSync('/no-such-target',join(dir,'unsafe'));assert.throws(()=>artifactUsage(dir),/symlink/i);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('only one explicitly named failure PNG is allowed even when routine PNG count is small',async()=>{
  const valid=['profile/C01/failure.png','profile/C03/C03-crab-zero.png','profile/C08/c280-cr5.png'];
  const counts=paths=>({pngs:paths.length,traces:0,...classifyPngNames(paths)});
  enforceImageCounts(counts(valid));assert.throws(()=>enforceImageCounts(counts([...valid,'other/C01/failure.png'])),/One explicit failure PNG/);
  assert.throws(()=>enforceImageCounts(counts(['C01/test-failed-1.png'])),/Unknown PNG/);assert.throws(()=>enforceImageCounts(counts(['C01/failure.PNG'])),/Unknown PNG/);
  const config=fs.readFileSync(new URL('./playwright.config.mjs',import.meta.url),'utf8');assert(config.includes("screenshot:'off'"));assert(!config.includes("screenshot:'only-on-failure'"));
  const dir=fs.mkdtempSync(join(os.tmpdir(),'c280-failure-count-'));try{const results=join(dir,'results'),output=join(dir,'upload');for(const name of ['one','two']){fs.mkdirSync(join(results,name),{recursive:true});fs.writeFileSync(join(results,name,'failure.png'),'synthetic count fixture');}const passed=await finalizeEvidence({output,resultsRoot:results,setupRoot:join(dir,'no-setup'),validator:{command:process.execPath,args:['-e','process.exitCode=1'],cwd:dir}});assert.equal(passed,false);const summary=JSON.parse(fs.readFileSync(join(output,'over-cap.json')));assert.equal(summary.imageCounts.failurePngs,2);assert.equal(summary.status,'incomplete-or-failed');assert(fs.existsSync(join(results,'one','failure.png')));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('deadline terminates a process group and cannot return a timeout as passed',async()=>{
  const r=await boundedProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{timeout:80,stdio:'ignore'});assert.equal(r.timedOut,true);assert.notEqual(r.status,0);assert.equal(r.groupCleanup,'terminated');assert.match(r.error,/deadline/);
});
test('live artifact watchdog stops a child without deleting its over-cap diagnostics',async()=>{
  const dir=fs.mkdtempSync(join(os.tmpdir(),'c280-live-cap-'));try{for(let n=0;n<74;n++)fs.writeFileSync(join(dir,`${n}.png`),'synthetic invalid PNG count fixture');const r=await boundedProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{timeout:10000,artifactRoot:dir,stdio:'ignore'});assert.equal(r.timedOut,false);assert.notEqual(r.status,0);assert.equal(r.groupCleanup,'terminated');assert.match(r.error,/PNG ceiling/);assert.equal(fs.readdirSync(dir).length,74);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('finalizer preserves real failure diagnostics and never passes unsafe or missing evidence',async()=>{
  for(const unsafe of [false,true]){const dir=fs.mkdtempSync(join(os.tmpdir(),'c280-finalizer-'));try{const results=join(dir,'results'),output=join(dir,'upload');fs.mkdirSync(results);const bytes=Buffer.from('Actual native assertion failed before final report\n');fs.writeFileSync(join(results,'startup.log'),bytes);if(unsafe)fs.symlinkSync('/not-readable',join(results,'forbidden'));
    assert.equal(await finalizeEvidence({output,resultsRoot:results,setupRoot:join(dir,'no-setup'),validator:{command:process.execPath,args:['-e',"throw Error('Synthetic missing native case evidence')"],cwd:dir}}),false);assert.deepEqual(fs.readFileSync(join(results,'startup.log')),bytes);
    if(unsafe){const diagnostic=JSON.parse(fs.readFileSync(join(output,'failure-summary.json')));assert.equal(diagnostic.status,'incomplete-or-failed');assert.match(diagnostic.error,/symlink/i);}else{assert.deepEqual(fs.readFileSync(join(output,'startup.log')),bytes);assert.match(fs.readFileSync(join(output,'validator.log'),'utf8'),/missing native case evidence/);assert.equal(JSON.parse(fs.readFileSync(join(output,'finalizer.json'))).status,'incomplete-or-failed');assert(fs.existsSync(join(output,'inventory.json')));}
  }finally{fs.rmSync(dir,{recursive:true,force:true});}}
});
test('only new exact 280 push triggers the 36-minute workflow; 240 trigger stays untouched',()=>{
  const w=JSON.parse(fs.readFileSync('.github/workflows/verify-full-campaign-280.yml')),old=JSON.parse(fs.readFileSync('.github/workflows/verify-full-campaign-240.yml'));
  assert.equal(digest(fs.readFileSync('.github/workflows/verify-full-campaign-240.yml')),'553e0a9dc8dde04bc9ecd1a023f3da7db00aed10ddf73a8a4b9a09182a93fddb');
  assert.deepEqual(w.on,{push:{branches:['verify/full-campaign-280-20261009']}});assert.deepEqual(old.on,{push:{branches:['verify/full-campaign-240-20261009']}});assert.equal(w.jobs.verification['timeout-minutes'],36);assert.equal(w.jobs.verification['runs-on'],'ubuntu-latest');assert.equal(w.concurrency['cancel-in-progress'],false);assert.deepEqual(w.permissions,{contents:'read'});
  const j=w.jobs.verification;assert(j.if.includes('github.run_attempt == 1'));assert(j.if.includes('github.event.repository.private == false'));assert(!JSON.stringify(j.env).includes('runner.'));
  assert.equal(j.steps.filter(s=>s.run?.includes('/run.mjs ')).length,2);assert(!JSON.stringify(j.steps).includes('stage-b-evidence/execution'));
  assert.deepEqual(j.container,{image:'mcr.microsoft.com/playwright:v1.61.1-noble'});
  assert(j.steps.some(s=>s.run==='node stage-c-evidence/execution/job-clock.mjs'));
  assert(j.steps.some(s=>s.run==='node stage-c-evidence/execution/setup.mjs'));
  assert(!JSON.stringify(j.steps).includes('install --with-deps'));
});
