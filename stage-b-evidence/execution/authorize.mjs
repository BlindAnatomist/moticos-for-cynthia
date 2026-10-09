import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {identity} from './binding.mjs';
import {approval,LIMITS,ORDER,ROOT} from './policy.mjs';
const id=identity(),message=execFileSync('git',['show','-s','--format=%B','HEAD'],{encoding:'utf8'});
function trailer(name){const rows=message.split('\n').filter(x=>x.startsWith(name+': '));assert.equal(rows.length,1,'Exactly one new Stage B authorization trailer required: '+name);return rows[0].slice(name.length+2).trim();}
for(const [name,key]of [['Source','sourceFingerprint'],['Build','buildFingerprint'],['Probe','probeFingerprint']])assert.equal(trailer('Moticos-240-Reviewed-'+name),id[key]);
const record={status:'explicit-owner-approved',scope:'moticos-240-58-cases',...id,profiles:ORDER,limits:LIMITS,authorizationReference:trailer('Moticos-240-Run-Authorization')};approval(record,id,process.env);fs.writeFileSync(`${ROOT}/approval.json`,JSON.stringify(record,null,2),{flag:'wx'});
