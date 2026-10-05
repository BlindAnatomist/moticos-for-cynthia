import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { hash, walk, verifyBuild, verifyRuntime } from './verifyRollbackBuild.mjs';
export const INVENTORY = 'tests/verification/rollback-frozen-inventory.json';
const IGNORED = new Set(['.git','node_modules','dist','dist-batch','dist-rollback','preflight-results','rollback-test-results','test-results','batch-test-results','bounded-evidence','.batch-input','.batch-input-parts','__pycache__']);
export function sourceFiles(root='.') {
  const files=[];
  function visit(directory, prefix='') {
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      if(entry.name==='__pycache__'||!prefix && IGNORED.has(entry.name))continue;
      const file=prefix+entry.name;
      assert(!entry.isSymbolicLink(),`Unexpected source symlink: ${file}`);
      if(entry.isDirectory())visit(path.join(directory,entry.name),file+'/');
      else if(file!==INVENTORY)files.push(file);
    }
  }
  visit(root);return files.sort();
}
export function verifySource(root='.') {
  const file=path.join(root,INVENTORY),inventory=JSON.parse(fs.readFileSync(file));
  assert.equal(inventory.schemaVersion,1);
  const actual=sourceFiles(root).map(file=>({file,bytes:fs.statSync(path.join(root,file)).size,sha256:hash(fs.readFileSync(path.join(root,file)))}));
  assert.deepEqual(actual,inventory.files,'Frozen source, harness, workflow or inventory file set changed');
  assert.equal(hash(JSON.stringify(actual)),inventory.sourceFingerprint);
  assert.equal(inventory.selfExclusion,INVENTORY);
  return {sourceFingerprint:inventory.sourceFingerprint,sourceManifestSha256:hash(fs.readFileSync(file)),sourceFiles:actual.length};
}
export function verifyFrozenInputs() {
  const source=verifySource(),build=verifyBuild();
  const commit=(process.env.GITHUB_SHA??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
  assert.match(commit,/^[a-f0-9]{40}$/);
  return {commit,...source,...build};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const mode=process.argv[2];
  if(mode==='source'){verifyRuntime();console.log(JSON.stringify(verifySource()));}
  else if(mode==='all')console.log(JSON.stringify(verifyFrozenInputs()));
  else throw Error('Use source or all. Frozen manifests are never regenerated in CI.');
}
