import {verifyFixtureClosure,assertReconstructionReviewed} from './fixture-closure.mjs';
// One bounded non-browser preparation: focused contracts, exact --list, and
// two builds. No historical 240 suite, broad preflight or browser launch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {verifyVersions,verifySource,prepareBuild,prepareProbe,preparedIdentity,probeRoot} from './binding.mjs';
import {ROOT,CONFIG,LIMITS} from './policy.mjs';
import {requireRepoCwd} from './paths.mjs';
import {boundedProcess} from './bounded-process.mjs';
import {verifyCollection} from './collection.mjs';
import {assetPaths} from './server-core.mjs';

requireRepoCwd();assert.equal(process.argv.length,2);assertReconstructionReviewed();verifyVersions();
assert(!fs.existsSync(ROOT),'Never overwrite prior Stage D evidence');
assert(!fs.existsSync(probeRoot()),'A new external probe output is required');
fs.mkdirSync(ROOT);const started=Date.now(),steps=[];
const deadline=process.env.GITHUB_ACTIONS==='true'?(Number(process.env.MOTICOS_320_EPOCH)+LIMITS.setupSeconds)*1000:started+LIMITS.setupSeconds*1000;
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
  await run('fixture-closure',['stage-d-evidence/execution/fixture-closure.mjs','--verify']);
  const focused=source.manifest.files.filter(r=>/^stage-d-evidence\/(?:(?:browser|execution)\/)?[^/]+\.test\.mjs$/.test(r.file)).map(r=>r.file);
  for(const file of ['stage-d-evidence/execution/contracts.test.mjs','stage-d-evidence/runtime.test.mjs','stage-d-evidence/preservation.test.mjs'])assert(focused.includes(file));
  await run('focused-contracts',['--test','--test-reporter=tap',...focused]);
  const collection=await run('collection',['node_modules/@playwright/test/cli.js','test',`--config=${CONFIG}`,'--list','--reporter=json']);
  const collectionProof=verifyCollection(JSON.parse(collection));
  fs.writeFileSync(`${ROOT}/collection.json`,collection,{flag:'wx'});
  await run('build-core',['node_modules/vite/bin/vite.js','build','--config','career.vite.config.js','--outDir','dist-stage-d']);
  await run('build-probe',['node_modules/vite/bin/vite.js','build','--config','stage-d-evidence/browser/probe/vite.config.mjs']);
  const build=prepareBuild();const probe=prepareProbe();const prepared=preparedIdentity();
  const mapped=assetPaths(build,probe,process.cwd(),probeRoot());for(const row of build.files)assert(mapped.has('/'+row.file.slice('dist-stage-d/'.length)),`Built asset not served: ${row.file}`);
  fs.writeFileSync(`${ROOT}/build-serving-contract.json`,JSON.stringify({status:'passed',coreFiles:build.files.length,mappedAssets:mapped.size,buildFingerprint:build.buildFingerprint},null,2)+'\n',{flag:'wx'});
  assert(Date.now()<=deadline,`Setup exceeded complete ${LIMITS.setupSeconds}-second allowance`);
  fs.copyFileSync('stage-d-source.json',`${ROOT}/source.json`);fs.copyFileSync('stage-d-build.json',`${ROOT}/build.json`);
  fs.writeFileSync(`${ROOT}/preparation.json`,JSON.stringify({status:'passed',sourceFingerprint:source.sourceFingerprint,buildFingerprint:build.buildFingerprint,probeFingerprint:prepared.probeFingerprint,elapsedMs:Date.now()-started,setupElapsedMs:process.env.GITHUB_ACTIONS==='true'?Date.now()-Number(process.env.MOTICOS_320_EPOCH)*1000:Date.now()-started,collection:collectionProof,focusedTests:focused,steps},null,2)+'\n',{flag:'wx'});
} catch(error) {
  fs.writeFileSync(`${ROOT}/preparation.json`,JSON.stringify({status:'incomplete-or-failed',sourceFingerprint:source?.sourceFingerprint,elapsedMs:Date.now()-started,steps,error:String(error.message).slice(0,8192)},null,2)+'\n',{flag:'wx'});throw error;
}
