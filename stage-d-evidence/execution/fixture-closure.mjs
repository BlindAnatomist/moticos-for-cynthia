import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {resolve,join,relative,dirname} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import * as E1 from '../../src/career/engine.v1.js';import * as E7 from '../../src/career/engine.v7.js';import * as E8 from '../../src/career/engine.js';
import {regularBytes} from '../../full-campaign-gate/evidence.mjs';
import {verifySource,acceptedBaseline} from './binding.mjs';import {REPO_ROOT,requireRepoCwd} from './paths.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');const ENGINES={1:E1,7:E7,8:E8};
export function assertReconstructionReviewed({readSource=verifySource,readBaseline=acceptedBaseline}={}){const source=readSource();assert.equal(source.manifest.status,'ACCEPTED_SOURCE_FOR_AUTHORIZED_RUN','Reconstructed source must be freshly bound after independent review');assert.match(source.sourceFingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(source.manifest.baseline,readBaseline(),'Accepted baseline binding changed');return source;}
function regular(file){const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink(),'Regular closure input required: '+file);return fs.readFileSync(file);}
export function verifyClosureData(data,historical,{engines=ENGINES}={}){
 assert.equal(data.schema,2);assert(Array.isArray(data.recipes));const known=new Map;
 for(const [name,old]of [['v5-endpoint','v5-endpoint'],['v6-conservative','v6-conservative'],['v7-purchased','completed280']]){assert.deepEqual(data.fixtures[name],historical.fixtures[old],'Historical seed changed: '+name);known.set(name,data.fixtures[name]);}
 let actions=0,replayedActions=0;const names=new Set,prefixes=new Map,reuseCounts=new Map;
 for(const recipe of data.recipes){let key=sha(JSON.stringify([recipe.initial.engineVersion,recipe.initial.state]));for(const action of recipe.actions){key=sha(key+'\n'+JSON.stringify(action));reuseCounts.set(key,(reuseCounts.get(key)??0)+1);}}
 for(const recipe of data.recipes){assert(!names.has(recipe.name),'Duplicate recipe');names.add(recipe.name);assert(!known.has(recipe.name),'Recipe overwrites verified fixture');const engine=engines[recipe.initial.engineVersion];assert(engine,'Unknown recipe engine');let initial;
  if(recipe.initial.name==='new-v1'){assert.equal(recipe.initial.engineVersion,1);assert.equal(recipe.name,'legacy-v1');initial=engine.createCareer('stage-d-recovered-v1');}
  else{assert(known.has(recipe.initial.name),'Recipe initial is not an already verified predecessor: '+recipe.initial.name);initial=engine.upgradeCareer(structuredClone(known.get(recipe.initial.name)));}
  assert.deepEqual(recipe.initial.state,initial,'Recipe initial must equal trusted predecessor upgrade');let state=structuredClone(initial),prefix=sha(JSON.stringify([recipe.initial.engineVersion,initial]));assert(Array.isArray(recipe.actions));
  for(const action of recipe.actions){prefix=sha(prefix+'\n'+JSON.stringify(action));if(prefixes.has(prefix))state=structuredClone(prefixes.get(prefix));else{const result=engine.reduceCareer(state,engine.commandFor(state,action));assert(result.ok,'Recipe action failed: '+recipe.name+': '+result.message);state=result.state;if(reuseCounts.get(prefix)>1)prefixes.set(prefix,structuredClone(state));replayedActions++;}actions++;}
  engine.validateCareer(state);assert.equal(sha(JSON.stringify(state)),recipe.stateSha256,'Replayed state hash mismatch');assert.deepEqual(state,data.fixtures[recipe.name],'Replayed state differs from fixture');known.set(recipe.name,state);
 }
 assert.deepEqual([...known.keys()].sort(),Object.keys(data.fixtures).sort(),'Every fixture must have trusted seed or replay recipe');
 for(const name of ['v7-completed','stage-d-entry','completed320','stock-first20','stock-last20','all-new-discovered','post-cut-violin3','high-xp-before-mushroom','full-board-violin'])assert(known.has(name),'Required fixture missing: '+name);
 return{schema:2,status:'passed',fixtures:known.size,recipes:data.recipes.length,actions,replayedActions};
}
export function verifyFixtureClosure({repoRoot=REPO_ROOT,cacheFile,sourceFingerprint,env=process.env,replay=verifyClosureData,requireCached=false}={}){
 const root=resolve(repoRoot),file=join(root,'stage-d-evidence/browser/fixtures.generated.json.gz'),bytes=regularBytes(root,'stage-d-evidence/browser/fixtures.generated.json.gz'),data=JSON.parse(gunzipSync(bytes));assert.equal(data.schema,2);assert(Array.isArray(data.inputFiles)&&data.inputFiles.length>100);
 const seen=new Set;for(const row of data.inputFiles){assert(typeof row.file==='string'&&!seen.has(row.file),'Unique input paths required');seen.add(row.file);const path=resolve(root,row.file);assert(!relative(root,path).startsWith('..')&&path!==root,'Closure input escapes repository');const b=regularBytes(root,row.file);assert.equal(b.length,row.bytes,row.file);assert.equal(sha(b),row.sha256,'Fixture input changed: '+row.file);}
 assert(seen.has('stage-c-evidence/browser/fixtures.generated.json.gz'));assert(seen.has('stage-d-evidence/browser/prepare-fixtures.mjs'));
 const source=sourceFingerprint??verifySource().sourceFingerprint;assert.match(source,/^[a-f0-9]{64}$/);
 const identity={schema:2,fixtureSha256:sha(bytes),sourceFingerprint:source,validatorSha256:sha(regular(fileURLToPath(import.meta.url))),inputInventorySha256:sha(JSON.stringify(data.inputFiles)),runId:env.GITHUB_RUN_ID??'local',attempt:env.GITHUB_RUN_ATTEMPT??'local',commit:env.GITHUB_SHA??'local'};
 if(cacheFile===undefined&&env.GITHUB_ACTIONS==='true'){for(const value of [identity.runId,identity.attempt])assert.match(value,/^\d+$/);assert.match(identity.commit,/^[a-f0-9]{40}$/);cacheFile=join(root,'stage-d-setup-results/fixture-closure.json');}
 if(cacheFile&&fs.existsSync(cacheFile)){const cached=JSON.parse(regularBytes(root,relative(root,resolve(cacheFile))));assert.deepEqual(cached.identity,identity,'Fixture/source/run identity changed after closure verification');assert.equal(cached.result.status,'passed');assert.equal(cached.result.fixtures,Object.keys(data.fixtures).length);assert.equal(cached.result.recipes,data.recipes.length);assert.equal(cached.result.actions,data.recipes.reduce((n,r)=>n+r.actions.length,0));return{...cached.result,cached:true,identity};}
 assert(!requireCached,'No identity-bound fixture closure receipt; preparation must complete first');
 const historical=JSON.parse(gunzipSync(regularBytes(root,'stage-c-evidence/browser/fixtures.generated.json.gz'))),result=replay(data,historical);
 if(cacheFile){assert(!relative(root,resolve(cacheFile)).startsWith('..'),'Cache must remain inside run repository');assert.equal(fs.realpathSync(dirname(cacheFile)),resolve(dirname(cacheFile)),'Canonical cache parent without symlink ancestors required');assert(fs.lstatSync(dirname(cacheFile)).isDirectory()&&!fs.lstatSync(dirname(cacheFile)).isSymbolicLink(),'Real existing closure result directory required');fs.writeFileSync(cacheFile,JSON.stringify({identity,result},null,2)+'\n',{flag:'wx',mode:0o600});}
 return{...result,cached:false,identity};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){requireRepoCwd();assert.deepEqual(process.argv.slice(2),['--verify']);console.log(JSON.stringify(verifyFixtureClosure()));}
