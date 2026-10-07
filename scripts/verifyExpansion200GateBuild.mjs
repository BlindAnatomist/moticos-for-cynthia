import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {digest,json,inventory,sourceInventory,trackedInventory,runIdentity,currentBuildManifest} from './currentCandidate200.mjs';
export {inventory,sourceInventory};
export const harnessInventory=trackedInventory;
export async function verifyManifest(root='.',identity=runIdentity()) {
  const manifest=json(join(root,'dist-expansion200/expansion200-manifest.json'));
  assert.deepEqual(manifest,await currentBuildManifest(root,identity),'Manifest must derive only from this current checkout and run');
  const index=readFileSync(join(root,'dist-expansion200/index.html'),'utf8');
  assert.equal(index.split(`<meta name="moticos-current-source" content="${manifest.sourceFingerprint}" />`).length,2);
  assert(!index.includes('moticos-private-'));
  return {identity,runCommit:identity.runCommit,sourceFingerprint:manifest.sourceFingerprint,manifestSha256:digest(readFileSync(join(root,'dist-expansion200/expansion200-manifest.json')))};
}
export async function freezeBuild(root='.',identity=runIdentity()) {
  return {schemaVersion:2,...await verifyManifest(root,identity),files:['dist','dist-batch','dist-expansion','dist-expansion160','dist-expansion200'].flatMap(folder=>inventory(root,folder)),source:trackedInventory(root)};
}
export async function verifyBuild(proof,root='.',identity=runIdentity()) {
  assert.deepEqual(Object.keys(proof).sort(),['schemaVersion','identity','runCommit','sourceFingerprint','manifestSha256','files','source'].sort());
  assert.equal(proof.schemaVersion,2);assert.deepEqual(proof.identity,identity);
  assert.deepEqual(proof.source,trackedInventory(root),'Current checkout differs from sole build source');
  assert.deepEqual(proof.files.filter(r=>r.file.startsWith('dist-expansion200/')),inventory(root,'dist-expansion200'),'Missing, added or altered build bytes');
  const actual=await verifyManifest(root,identity);
  for(const key of ['runCommit','sourceFingerprint','manifestSha256']) assert.equal(proof[key],actual[key]);
  return actual;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [mode,file='preflight-results/build-proof.json']=process.argv.slice(2);
  if(mode==='freeze')writeFileSync(file,JSON.stringify(await freezeBuild(),null,2)+'\n');
  else {assert.equal(mode,'verify');await verifyBuild(json(file));}
  console.log(`${mode}: current run, source, art identities and exact build bytes verified.`);
}
