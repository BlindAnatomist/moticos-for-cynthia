import { verifyEntry200 } from './expansion200Candidate.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = file => JSON.parse(readFileSync(file, 'utf8'));
export function inventory(root, folder) {
  assert(lstatSync(join(root, folder)).isDirectory());
  return readdirSync(join(root, folder), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = `${folder}/${entry.name}`;
    assert(!entry.isSymbolicLink() && (entry.isFile() || entry.isDirectory()), `Nonregular input: ${file}`);
    if (entry.isDirectory()) return inventory(root, file);
    const bytes = readFileSync(join(root, file));
    return [{ file, bytes: bytes.length, sha256: digest(bytes) }];
  });
}
export function sourceInventory(root = '.') {
  return [...inventory(root,'src'), ...inventory(root,'public'), ...['package.json','package-lock.json','vite.config.js','index.html'].map(file => {
    assert(lstatSync(join(root,file)).isFile() && !lstatSync(join(root,file)).isSymbolicLink());
    const bytes = readFileSync(join(root,file)); return {file,bytes:bytes.length,sha256:digest(bytes)};
  })].sort((a,b)=>a.file.localeCompare(b.file));
}
export function runIdentity(env = process.env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'A real current GitHub job is required');
  assert.equal(env.GITHUB_REPOSITORY, 'BlindAnatomist/moticos-for-cynthia');
  assert.equal(env.GITHUB_REF, 'refs/heads/verify/current-200-20261007');
  assert.equal(env.GITHUB_EVENT_NAME, 'push');
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.match(env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]*$/);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'A rerun requires a separately reviewed gate');
  assert.equal(env.GITHUB_WORKFLOW_REF, 'BlindAnatomist/moticos-for-cynthia/.github/workflows/verify-expansion-200.yml@refs/heads/verify/current-200-20261007');
  return {repository:env.GITHUB_REPOSITORY,runCommit:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:1,workflowRef:env.GITHUB_WORKFLOW_REF};
}
const publicFileManifest=JSON.parse(readFileSync(new URL('../tests/verification/public200-files.json',import.meta.url),'utf8'));
assert.equal(publicFileManifest.schemaVersion,1);assert.equal(publicFileManifest.files.length,441);assert.equal(new Set(publicFileManifest.files).size,441);
const PUBLIC_FILES_200=new Set(publicFileManifest.files);
export function publicPathAllowed200(file) {
  if(!PUBLIC_FILES_200.has(file))return false;
  if(typeof file!=='string'||file.startsWith('/')||file.split('/').includes('..')||file.split('/').some(part=>part.startsWith('.')&&part!=='.github'&&part!=='.gitignore'))return false;
  if(['PRIVATE_200_REVIEW.md','NEXT_VERIFICATION_PLAN.md'].includes(file))return false;
  const rootFiles=new Set(['.gitignore','VERIFICATION_200.md','index.html','package.json','package-lock.json','vite.config.js','playwright.expansion160.config.js','playwright.expansion200.config.js']);
  if(!rootFiles.has(file)&&!file.startsWith('.github/workflows/')&&!['src/','public/','scripts/','tests/'].some(prefix=>file.startsWith(prefix)))return false;
  return file==='.gitignore'||/\.(?:js|jsx|mjs|py|sh|css|json|webp|html|yml|md)$/.test(file);
}
export function trackedInventory(root = '.') {
  const files = execFileSync('git',['ls-files','--stage','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(row=>{const [metadata,file]=row.split('\t');const [mode,blob,stage]=metadata.split(' ');assert.equal(stage,'0');assert(['100644','100755'].includes(mode));return {file,mode,blob};}).sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
  assert.deepEqual(files.map(record=>record.file),[...PUBLIC_FILES_200].sort(),'Public projection is missing or adding reviewed files');
  return files.map(({file,mode,blob})=>{assert(publicPathAllowed200(file),'Private or unexpected file in public source projection: '+file);assert(!file.startsWith('/')&&!file.split('/').includes('..'));const stat=lstatSync(join(root,file));assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.mode&0o111? '100755':'100644',mode,'Tracked source mode differs');const bytes=readFileSync(join(root,file));assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),blob,'Working source differs from current Git blob');return {file,mode,bytes:bytes.length,sha256:digest(bytes)};});
}
export async function currentCatalog(root = '.') {
  const {ENVELOPES} = await import(pathToFileURL(resolve(root,'src/matching/expansion200/registry.js')).href);
  assert.equal(ENVELOPES.length,20);
  const records=ENVELOPES.flatMap(envelope=>envelope.catalog.PIECES.map(piece=>{
    const file=relative(resolve(root),fileURLToPath(piece.art)).split('\\').join('/');
    assert(file.startsWith('src/') && !file.split('/').includes('..'));
    const bytes=readFileSync(join(root,file));
    return {id:piece.id,sourceFile:file,bytes:bytes.length,sha256:digest(bytes)};
  }));
  assert.equal(records.length,200);assert.equal(new Set(records.map(r=>r.id)).size,200);assert.equal(new Set(records.map(r=>r.sha256)).size,200);
  return records;
}
export async function currentBuildManifest(root = '.', identity = runIdentity()) {
  const source=sourceInventory(root), emitted=inventory(root,'dist-expansion200/assets').map(r=>({...r,file:r.file.slice('dist-expansion200/'.length)}));
  const entry=verifyEntry200(root,emitted);
  const bundle=readFileSync(join(root,'dist-expansion200',entry.entryScripts[0].slice(1)),'utf8');
  const {ENVELOPES}=await import(pathToFileURL(resolve(root,'src/matching/expansion200/registry.js')).href);
  for(const envelope of ENVELOPES)assert(bundle.includes(envelope.id)&&bundle.includes(envelope.storageKey),'Current envelope absent from entry');
  const catalogAssets=(await currentCatalog(root)).map(record=>{
    const matches=emitted.filter(r=>r.sha256===record.sha256&&r.bytes===record.bytes);assert.equal(matches.length,1,`Current catalog art not emitted exactly once: ${record.id}`);
    return {id:record.id,...matches[0]};
  });
  for(const record of inventory(root,'public')) assert.equal(digest(readFileSync(join(root,'dist-expansion200',record.file.slice('public/'.length)))),record.sha256);
  return {schemaVersion:1,kind:'moticos-current-candidate',identity,totalPieces:200,envelopes:20,families:40,postcards:120,
    sourceFingerprint:digest(JSON.stringify(source)),...entry,catalogAssets,entryFiles:emitted.filter(r=>/\.(js|css)$/.test(r.file))};
}
