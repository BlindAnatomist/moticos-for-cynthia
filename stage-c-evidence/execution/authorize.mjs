import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gitRead} from './git-read.mjs';
import {identity} from './binding.mjs';
import {approval,LIMITS,ORDER,ROOT} from './policy.mjs';
const id=identity(),message=gitRead('show','-s','--format=%B','HEAD');
function trailer(name){const rows=message.split('\n').filter(x=>x.startsWith(name+': '));assert.equal(rows.length,1,`Exactly one ${name} trailer required`);return rows[0].slice(name.length+2).trim();}
for(const [name,key]of [['Source','sourceFingerprint'],['Build','buildFingerprint'],['Probe','probeFingerprint']])assert.equal(trailer('Moticos-280-Reviewed-'+name),id[key]);
const record={status:'explicit-owner-approved',scope:'moticos-280-20-cases',...id,profiles:ORDER,limits:LIMITS,authorizationReference:trailer('Moticos-280-Run-Authorization')};
approval(record,id,process.env);fs.writeFileSync(`${ROOT}/approval.json`,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
