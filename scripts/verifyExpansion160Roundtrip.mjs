import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {digest} from './verifyExpansion160Coverage.mjs';
const [source,restored,output]=process.argv.slice(2);assert(source&&restored,'Specify original and restored directories');
function walk(root,path=''){return readdirSync(join(root,path),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{const file=path?`${path}/${entry.name}`:entry.name;assert(!entry.isSymbolicLink()&&(entry.isDirectory()||entry.isFile()));if(entry.isDirectory())return walk(root,file);const bytes=readFileSync(join(root,file));return [{file,bytes:bytes.length,sha256:digest(bytes)}];});}
const expected=walk(source),actual=walk(restored);assert.deepEqual(actual,expected,'Restoration lost, added or changed a raw file');
const proof={status:'passed',exactFiles:actual.length,rawBytes:actual.reduce((sum,f)=>sum+f.bytes,0),filesFingerprint:digest(JSON.stringify(actual)),files:actual};if(output)writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,files:undefined}));
