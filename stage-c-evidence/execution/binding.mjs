import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CATALOG} from '../../src/career/content.js';
import {digest,regularBytes,filesUnder} from '../../full-campaign-gate/evidence.mjs';
import {approval,ROOT,TARGET} from './policy.mjs';
import {requireRepoCwd,REPO_ROOT} from './paths.mjs';

// Deliberately independent of .git: an exported private candidate is sealable.
// Every imported helper, fixture, test, workflow, application module and asset
// is covered; outputs and historic manifest files are not rewritten or reused.
export const SOURCE_ROOTS = Object.freeze(['src','public','gate','tests','full-campaign-gate','full-campaign-probe','full-browser-fixtures','full-browser-evidence','campaign-evidence','stage-a-evidence','stage-b-evidence','stage-c-evidence','.github']);
export const SOURCE_FILES = Object.freeze(['career.html','career.vite.config.js','package.json','package-lock.json','playwright.full-campaign.config.mjs','playwright.campaign.config.mjs']);
export function inventory(root) { return filesUnder(root).map(file => { const b=regularBytes(root,file); return {file,bytes:b.length,sha256:digest(b)}; }); }
export function sourceFiles() {
  requireRepoCwd();
  return SOURCE_ROOTS.flatMap(root => inventory(root).map(r=>({...r,file:root+'/'+r.file}))).concat(SOURCE_FILES.map(file=>{const b=regularBytes(REPO_ROOT,file);return {file,bytes:b.length,sha256:digest(b)};})).sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
}
export function seal() {
  const manifest={schemaVersion:1,status:'prepared-280-source-not-browser-evidence',baseline:TARGET,roots:SOURCE_ROOTS,singles:SOURCE_FILES,files:sourceFiles()};
  assert(manifest.files.some(r=>r.file==='stage-c-evidence/browser/fixtures.generated.json.gz'),'Generate reducer fixtures before source sealing');
  fs.writeFileSync('stage-c-source.json',JSON.stringify(manifest,null,2)+'\n');
  return verifySource();
}
export function verifySource() {
  requireRepoCwd(); const bytes=fs.readFileSync('stage-c-source.json'),manifest=JSON.parse(bytes);
  assert.equal(manifest.schemaVersion,1); assert.equal(manifest.status,'prepared-280-source-not-browser-evidence');
  assert.deepEqual(manifest.baseline,TARGET); assert.deepEqual(manifest.roots,SOURCE_ROOTS); assert.deepEqual(manifest.singles,SOURCE_FILES);
  assert.deepEqual(manifest.files,sourceFiles(),'Stage C source changed since review checkpoint');
  return {sourceFingerprint:digest(bytes),manifest};
}
export function verifyVersions() {
  assert.equal(Number(process.versions.node.split('.')[0]),24,'Pinned Node major 24 required');
  const lock=JSON.parse(fs.readFileSync('package-lock.json')),pkg=JSON.parse(fs.readFileSync('package.json'));
  for(const name of ['@playwright/test','playwright','playwright-core','vite','@vitejs/plugin-react','react','react-dom']) {
    const actual=JSON.parse(fs.readFileSync(`node_modules/${name}/package.json`)).version;
    assert.equal(actual,lock.packages[`node_modules/${name}`].version,`Pinned ${name} required`);
    if(pkg.dependencies?.[name]||pkg.devDependencies?.[name])assert.equal(actual,pkg.dependencies?.[name]??pkg.devDependencies[name]);
  }
  assert.equal(lock.packages['node_modules/@playwright/test'].version,'1.61.1');
}
export function naturalDimensions(b) {
  if(b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return [b.readUInt32BE(16),b.readUInt32BE(20)];
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.readUInt32LE(4)+8,b.length);
  for(let offset=12;offset+8<=b.length;) {
    const type=b.toString('ascii',offset,offset+4),size=b.readUInt32LE(offset+4),at=offset+8;assert(at+size<=b.length);
    if(type==='VP8X')return [1+b.readUIntLE(at+4,3),1+b.readUIntLE(at+7,3)];
    if(type==='VP8L'){assert.equal(b[at],0x2f);const v=b.readUInt32LE(at+1);return [(v&0x3fff)+1,((v>>>14)&0x3fff)+1];}
    if(type==='VP8 '){assert.equal(b.toString('hex',at+3,at+6),'9d012a');return [b.readUInt16LE(at+6)&0x3fff,b.readUInt16LE(at+8)&0x3fff];}
    offset=at+size+(size%2);
  }
  throw Error('Unsupported art dimensions');
}
export const canonicalFingerprint = value => digest(Buffer.from(JSON.stringify(value)));
export function buildProof() {
  verifyVersions();const {sourceFingerprint}=verifySource();
  const files=inventory('dist-career').map(r=>({...r,file:'dist-career/'+r.file}));
  assert(files.some(r=>r.file==='dist-career/career.html'));
  const art=CATALOG.PIECES.map(p=>{const path=relative(REPO_ROOT,fileURLToPath(p.art)),bytes=regularBytes(REPO_ROOT,path),sha256=digest(bytes),built=files.filter(r=>r.sha256===sha256);
    assert(built.length>0,`Missing original built art ${p.id}`);const natural=naturalDimensions(bytes);assert(natural.every(n=>Number.isSafeInteger(n)&&n>0));
    return {id:p.id,path,sha256,bytes:bytes.length,natural,dimensions:natural,builtPaths:built.map(r=>r.file)};
  });
  assert.equal(art.length,280);
  return {schemaVersion:1,sourceFingerprint,files,art};
}
export function freezeBuild() {
  const proof=buildProof(),buildFingerprint=canonicalFingerprint(proof);
  fs.writeFileSync('stage-c-build.json',JSON.stringify({...proof,buildFingerprint},null,2)+'\n');
  return {...proof,buildFingerprint};
}
export function verifyBuild() {
  const proof=JSON.parse(fs.readFileSync('stage-c-build.json')), {buildFingerprint,...payload}=proof;
  assert.equal(buildFingerprint,canonicalFingerprint(payload));assert.deepEqual(payload,buildProof(),'Stage C core build changed');
  return proof;
}
export function probeRoot() {
  const root=process.env.MOTICOS_STAGE_C_PROBE_OUTPUT;
  assert(root&&isAbsolute(root)&&!resolve(root).startsWith(resolve(REPO_ROOT)+'/')&&resolve(root)!==resolve(REPO_ROOT),'External probe output required');
  return resolve(root);
}
export function freezeProbe(build) {
  const proof={schemaVersion:1,sourceFingerprint:build.sourceFingerprint,buildFingerprint:build.buildFingerprint,files:inventory(probeRoot())};
  for(const file of ['stage-c-evidence/browser/probe/current/index.html','stage-c-evidence/browser/probe/v6/index.html'])assert(proof.files.some(r=>r.file===file),`Missing dual probe entry ${file}`);
  fs.writeFileSync(`${ROOT}/probe-build.json`,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});return proof;
}
export function preparedIdentity() {
  const build=verifyBuild(),bytes=fs.readFileSync(`${ROOT}/probe-build.json`),probe=JSON.parse(bytes);
  assert.equal(probe.sourceFingerprint,build.sourceFingerprint);assert.equal(probe.buildFingerprint,build.buildFingerprint);
  assert.deepEqual(probe.files,inventory(probeRoot()),'Stage C dual probe changed');
  return {sourceFingerprint:build.sourceFingerprint,buildFingerprint:build.buildFingerprint,probeFingerprint:digest(bytes)};
}
export function commitIdentity() {
  const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim(),commit=git('rev-parse','HEAD');
  assert.match(commit,/^[a-f0-9]{40}$/);assert.equal(git('rev-parse',`${TARGET.parent}^{tree}`),TARGET.parentTree,'Accepted 240 ancestor tree changed');
  git('merge-base','--is-ancestor',TARGET.parent,'HEAD');
  return {commit,parent:TARGET.parent,parentTree:TARGET.parentTree};
}
export function identity() { return {...preparedIdentity(),...commitIdentity()}; }
export function requireApproval() {
  const id=identity(),file=process.env.MOTICOS_STAGE_C_APPROVAL;assert(file&&fs.existsSync(file),'No fresh Stage C approval file');
  assert.equal(resolve(file),resolve(ROOT,'approval.json'));approval(JSON.parse(fs.readFileSync(file)),id,process.env);return id;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  requireRepoCwd();assert.equal(process.argv.length,3);const command=process.argv[2];
  assert(['seal','source','freeze','verify'].includes(command));const result=({seal,source:verifySource,freeze:freezeBuild,verify:verifyBuild})[command]();
  console.log(JSON.stringify({command,sourceFingerprint:result.sourceFingerprint,buildFingerprint:result.buildFingerprint}));
}
