import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildManifest200 } from './expansion200Candidate.mjs';
const manifest=await buildManifest200();const file='dist-expansion200/index.html';let index=readFileSync(file,'utf8');
assert(!index.includes('moticos-private-200-source'),'Refusing to stamp twice');assert.equal(index.split('</head>').length,2);
writeFileSync(file,index.replace('</head>',`<meta name="moticos-private-200-source" content="${manifest.sourceFingerprint}" />\n</head>`));
writeFileSync('dist-expansion200/expansion200-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Private 200-piece build bound to ${manifest.sourceFingerprint}; no CI or publication claim.`);
