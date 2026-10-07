import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {runIdentity} from './currentCandidate200.mjs';
const rows=JSON.parse(process.env.MOTICOS_ARTIFACT_RESULTS ?? 'null');assert(Array.isArray(rows));
const artifacts=rows.filter(r=>r.outcome==='success').map(r=>{
 assert.match(r.id,/^[1-9][0-9]*$/);assert.match(r.digest,/^[a-f0-9]{64}$/);
 assert.match(r.name,/^moticos-current-(?:preflight|webkit-iphone-13|webkit-iphone-large|chromium-desktop)-(?:\d{3}|diagnosis)$/);
 const identity=runIdentity();assert.equal(r.url,`https://github.com/${identity.repository}/actions/runs/${identity.runId}/artifacts/${r.id}`);
 return {name:r.name,id:r.id,sha256:r.digest,url:r.url};
});
assert(artifacts.length>0);assert.equal(new Set(artifacts.map(r=>r.id)).size,artifacts.length);
const encoded=JSON.stringify({schemaVersion:1,identity:runIdentity(),artifacts},null,2)+'\n';assert(Buffer.byteLength(encoded)<32768,'Receipt exceeds 32 KiB content ceiling');writeFileSync('current-artifact-receipt.json',encoded);
