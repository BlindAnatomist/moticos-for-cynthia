import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {digest} from './currentCandidate200.mjs';
export function verifyPreserved160(root='.',builds=true){
 const seal=JSON.parse(readFileSync(join(root,'tests/verification/accepted160-preservation.json'),'utf8'));assert.equal(seal.schemaVersion,1);assert.equal(seal.protectedSource.length,262);
 for(const e of seal.protectedSource){const bytes=readFileSync(join(root,e.file));assert.equal(bytes.length,e.bytes);assert.equal(digest(bytes),e.sha256,`Accepted runtime/art changed: ${e.file}`);}
 const modes=Object.entries(seal.lowerBuilds);assert.deepEqual(modes.map(([name])=>name),['dist','dist-batch','dist-expansion','dist-expansion160']);
 if(builds)for(const [folder,records]of modes){
  const inventory=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
  assert.deepEqual(inventory(folder).filter(f=>!f.endsWith('/expansion160-manifest.json')).sort(),records.map(e=>e.file).sort());
  for(const e of records){let bytes=readFileSync(join(root,e.file));if(e.file.endsWith('/index.html'))bytes=Buffer.from(bytes.toString('utf8').replace(/<meta name="moticos-current-source" content="[a-f0-9]+" \/>\n/g,''));assert.equal(bytes.length,e.bytes);assert.equal(digest(bytes),e.sha256,`Lower build differs: ${e.file}`);}
 }
 return{protectedSourceFiles:262,lowerBuildsCompared:builds?4:0,normalizedHistoricalIndexStamp:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(verifyPreserved160('.',process.argv[2]!=='source-only')));
