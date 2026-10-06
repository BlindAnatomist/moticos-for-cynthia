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
  assert.equal(env.GITHUB_REF, 'refs/heads/verify/current-160-20261006');
  assert.equal(env.GITHUB_EVENT_NAME, 'push');
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.match(env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]*$/);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'A rerun requires a separately reviewed gate');
  assert.equal(env.GITHUB_WORKFLOW_REF, 'BlindAnatomist/moticos-for-cynthia/.github/workflows/verify-expansion-160.yml@refs/heads/verify/current-160-20261006');
  return {repository:env.GITHUB_REPOSITORY,runCommit:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:1,workflowRef:env.GITHUB_WORKFLOW_REF};
}
export function trackedInventory(root = '.') {
  const files = execFileSync('git',['ls-files','--stage','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(row=>{const [metadata,file]=row.split('\t');const [mode,blob,stage]=metadata.split(' ');assert.equal(stage,'0');assert(['100644','100755'].includes(mode));return {file,mode,blob};}).sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
  return files.map(({file,mode,blob})=>{assert(!file.startsWith('/')&&!file.split('/').includes('..'));const stat=lstatSync(join(root,file));assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.mode&0o111? '100755':'100644',mode,'Tracked source mode differs');const bytes=readFileSync(join(root,file));assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),blob,'Working source differs from current Git blob');return {file,mode,bytes:bytes.length,sha256:digest(bytes)};});
}
export async function currentCatalog(root = '.') {
  const {ENVELOPES} = await import(pathToFileURL(resolve(root,'src/matching/cohesion/registry.js')).href);
  assert.equal(ENVELOPES.length,16);
  const records=ENVELOPES.flatMap(envelope=>envelope.catalog.PIECES.map(piece=>{
    const file=relative(resolve(root),fileURLToPath(piece.art)).split('\\').join('/');
    assert(file.startsWith('src/') && !file.split('/').includes('..'));
    const bytes=readFileSync(join(root,file));
    return {id:piece.id,sourceFile:file,bytes:bytes.length,sha256:digest(bytes)};
  }));
  assert.equal(records.length,160);assert.equal(new Set(records.map(r=>r.id)).size,160);assert.equal(new Set(records.map(r=>r.sha256)).size,160);
  return records;
}
export async function currentBuildManifest(root = '.', identity = runIdentity()) {
  const source=sourceInventory(root), emitted=inventory(root,'dist-expansion160/assets').map(r=>({...r,file:r.file.slice('dist-expansion160/'.length)}));
  const catalogAssets=(await currentCatalog(root)).map(record=>{
    const matches=emitted.filter(r=>r.sha256===record.sha256&&r.bytes===record.bytes);assert.equal(matches.length,1,`Current catalog art not emitted exactly once: ${record.id}`);
    return {id:record.id,...matches[0]};
  });
  for(const record of inventory(root,'public')) assert.equal(digest(readFileSync(join(root,'dist-expansion160',record.file.slice('public/'.length)))),record.sha256);
  return {schemaVersion:1,kind:'moticos-current-candidate',identity,totalPieces:160,envelopes:16,families:32,postcards:96,
    sourceFingerprint:digest(JSON.stringify(source)),entryScripts:[...readFileSync(join(root,'dist-expansion160/index.html'),'utf8').matchAll(/<script[^>]*src="([^"]+)"/g)].map(match=>match[1]),catalogAssets,entryFiles:emitted.filter(r=>/\.(js|css)$/.test(r.file))};
}
