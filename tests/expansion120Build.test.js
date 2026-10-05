import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { harnessInventory, sourceInventory, verifyIsolation, freezeBuild, verifyBuild } from '../scripts/verifyExpansion120Build.mjs';
import { digest } from '../scripts/verifyExpansion120Coverage.mjs';
const commit='a'.repeat(40);
function fixture(callback) {
 const root=mkdtempSync(join(tmpdir(),'moticos-build-'));
 const put=(file,data) => {mkdirSync(dirname(join(root,file)),{recursive:true});writeFileSync(join(root,file),typeof data === 'object' ? JSON.stringify(data) : data);};
 try {
  for(const record of harnessInventory('.')){mkdirSync(dirname(join(root,record.file)),{recursive:true});cpSync(record.file,join(root,record.file));}
  const contract=JSON.parse(readFileSync('tests/verification/expansion120-coverage-contract.json','utf8'));
  for(const file of contract.testFiles){mkdirSync(dirname(join(root,file.path)),{recursive:true});cpSync(file.path,join(root,file.path));}
  for(const file of ['src/main.js','package.json','package-lock.json','vite.config.js','index.html'])put(file,'source fixture');
  put('public/art/old.webp','old artwork');put('dist/art/old.webp','old artwork');put('dist/assets/main.js','normal bundle');put('dist/index.html','normal entry');
  const records=[];
  for(const family of 'abcdefgh')for(let tier=1;tier<=5;tier++){const id=`${family}${tier}`,bytes=`unique-art-${id}`,sha256=digest(bytes);put(`src/matching/expansion/art/${id}.webp`,bytes);put(`dist-expansion/assets/${id}.webp`,bytes);records.push({id,canonicalWebpSha256:sha256});}
  put('evidence/expansion-assets/asset-receipt.json',{records});
  const source=sourceInventory(root);contract.sourceFingerprint=digest(JSON.stringify(source));put('tests/verification/expansion120-coverage-contract.json',contract);
  put('dist-expansion/art/old.webp','old artwork');put('dist-expansion/assets/main.js','batch bundle');put('dist-expansion/assets/main.css','batch style');
  put('dist-expansion/index.html',`<script type="module" src="/assets/main.js"></script><meta name="moticos-private-expansion-source" content="${contract.sourceFingerprint}" />`);
  put('dist-expansion/expansion-manifest.json',{source,sourceFingerprint:contract.sourceFingerprint,entryScripts:['/assets/main.js'],assets:records.map(item=>({id:item.id,file:`assets/${item.id}.webp`,sha256:item.canonicalWebpSha256})),entryFiles:[{file:'assets/main.js',sha256:digest('batch bundle')},{file:'assets/main.css',sha256:digest('batch style')}]});
  callback(root,put);
 } finally {rmSync(root,{recursive:true,force:true});}
}
describe('single immutable collage build', () => {
 it('freezes isolated normal/build outputs and all exact candidate bytes', () => fixture(root => {const proof=freezeBuild(root,commit);expect(proof).toMatchObject({canonicalNewArt:40,normalBuildIsolated:true});expect(verifyBuild(proof,root,commit).sourceFingerprint).toBe(proof.sourceFingerprint);}));
 it('rejects a build from another commit', () => fixture(root => {const proof=freezeBuild(root,commit);expect(()=>verifyBuild(proof,root,'b'.repeat(40))).toThrow();}));
 it.each(['dist-expansion/assets/main.js','dist-expansion/assets/main.css','dist-expansion/assets/a1.webp','dist-expansion/art/old.webp','dist-expansion/index.html','src/main.js'])('rejects changed source/build bytes: %s', file => fixture((root,put) => {const proof=freezeBuild(root,commit);put(file,'modified');expect(()=>verifyBuild(proof,root,commit)).toThrow();}));
 it('rejects added or omitted build files', () => fixture((root,put) => {const proof=freezeBuild(root,commit);put('dist-expansion/extra.txt','extra');expect(()=>verifyBuild(proof,root,commit)).toThrow();rmSync(join(root,'dist-expansion/extra.txt'));rmSync(join(root,'dist-expansion/assets/a1.webp'));expect(()=>verifyBuild(proof,root,commit)).toThrow();}));
 it('rejects canonical batch-art leakage into the normal build', () => fixture((root,put) => {put('dist/leaked.webp','unique-art-a1');expect(()=>verifyIsolation(root)).toThrow();}));
 it('rejects batch save keys leaking into the normal bundle', () => fixture((root,put) => {put('dist/assets/main.js','moticos.matching.expansion-wrong-address.v1');expect(()=>verifyIsolation(root)).toThrow();}));
 it('rejects changed preserved public art in the normal build', () => fixture((root,put) => {put('dist/art/old.webp','changed');expect(()=>verifyIsolation(root)).toThrow();}));
});
