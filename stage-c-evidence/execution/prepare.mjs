// One bounded non-browser preparation: focused contracts, exact --list, and
// two builds. No historical 240 suite, broad preflight or browser launch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {verifyVersions,verifySource,freezeBuild,freezeProbe,probeRoot} from './binding.mjs';
import {ROOT,CONFIG,LIMITS} from './policy.mjs';
import {requireRepoCwd} from './paths.mjs';
import {boundedProcess} from './bounded-process.mjs';
import {verifyCollection} from './collection.mjs';

requireRepoCwd();assert.equal(process.argv.length,2);verifyVersions();
assert(!fs.existsSync(ROOT),'Never overwrite prior Stage C evidence');
assert(!fs.existsSync(probeRoot()),'A new external probe output is required');
fs.mkdirSync(ROOT);const started=Date.now(),steps=[];
const deadline=process.env.GITHUB_ACTIONS==='true'?(Number(process.env.MOTICOS_280_EPOCH)+LIMITS.setupSeconds)*1000:started+LIMITS.setupSeconds*1000;
assert(Number.isFinite(deadline)&&deadline>started,'Setup deadline is missing or expired');
let source;
async function run(name,args) {
  const remaining=Math.floor(deadline-Date.now());assert(remaining>0,'Combined setup deadline reached');
  const file=`${ROOT}/${name}.log`,fd=fs.openSync(file,'wx');let r;
  try{r=await boundedProcess(process.execPath,args,{timeout:remaining,artifactRoot:ROOT,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  steps.push({name,args,...r,elapsedMs:Date.now()-started});
  assert(r.status===0&&!r.error&&!r.timedOut,`${name} failed or interrupted; inspect ${file}`);
  return fs.readFileSync(file,'utf8');
}
try {
  source=verifySource();
  const focused=source.manifest.files.filter(r=>/^stage-c-evidence\/(browser|execution)\/[^/]+\.test\.mjs$/.test(r.file)).map(r=>r.file);
  assert(focused.includes('stage-c-evidence/execution/contracts.test.mjs'));
  await run('focused-contracts',['--test','--test-reporter=tap',...focused]);
  const collection=await run('collection',['node_modules/@playwright/test/cli.js','test',`--config=${CONFIG}`,'--list','--reporter=json']);
  const collectionProof=verifyCollection(JSON.parse(collection));
  fs.writeFileSync(`${ROOT}/collection.json`,collection,{flag:'wx'});
  await run('build-core',['node_modules/vite/bin/vite.js','build','--config','career.vite.config.js']);
  await run('build-probe',['node_modules/vite/bin/vite.js','build','--config','stage-c-evidence/browser/probe/vite.config.mjs']);
  const build=freezeBuild();freezeProbe(build);
  assert(Date.now()<=deadline,'Setup exceeded complete 240-second allowance');
  fs.copyFileSync('stage-c-source.json',`${ROOT}/source.json`);fs.copyFileSync('stage-c-build.json',`${ROOT}/build.json`);
  fs.writeFileSync(`${ROOT}/preparation.json`,JSON.stringify({status:'passed',sourceFingerprint:source.sourceFingerprint,buildFingerprint:build.buildFingerprint,elapsedMs:Date.now()-started,setupElapsedMs:process.env.GITHUB_ACTIONS==='true'?Date.now()-Number(process.env.MOTICOS_280_EPOCH)*1000:Date.now()-started,collection:collectionProof,focusedTests:focused,steps},null,2)+'\n',{flag:'wx'});
} catch(error) {
  fs.writeFileSync(`${ROOT}/preparation.json`,JSON.stringify({status:'incomplete-or-failed',sourceFingerprint:source?.sourceFingerprint,elapsedMs:Date.now()-started,steps,error:String(error.message).slice(0,8192)},null,2)+'\n',{flag:'wx'});throw error;
}
