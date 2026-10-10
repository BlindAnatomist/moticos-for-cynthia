import assert from 'node:assert/strict';
import {gitRead} from './git-read.mjs';
import {verifySource,commitIdentity} from './binding.mjs';
import {environment,AUTHORIZATION_REFERENCE} from './policy.mjs';
import {requireRepoCwd} from './paths.mjs';
requireRepoCwd();assert.equal(process.argv.length,2);
const id=commitIdentity();environment(process.env,id.commit);
const message=gitRead('show','-s','--format=%B','HEAD'),source=verifySource();
function trailer(name){const rows=message.split('\n').filter(x=>x.startsWith(name+': '));assert.equal(rows.length,1,`Exactly one ${name} trailer required`);return rows[0].slice(name.length+2).trim();}
for(const name of ['Source','Build','Probe']){const value=trailer(`Moticos-Touch-Drag-Reviewed-${name}`);assert.match(value,/^[a-f0-9]{64}$/);if(name==='Source')assert.equal(value,source.sourceFingerprint);}
assert.equal(source.manifest.status,'ACCEPTED_SOURCE_FOR_AUTHORIZED_RUN');
assert.equal(trailer('Moticos-Touch-Drag-Run-Authorization'),AUTHORIZATION_REFERENCE,'Fresh exact-source touch-drag approval required');
