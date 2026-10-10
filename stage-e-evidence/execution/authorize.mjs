import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gitRead} from './git-read.mjs';
import {identity} from './binding.mjs';
import {approval,LIMITS,ORDER,ROOT,TARGET} from './policy.mjs';
import {requireRepoCwd} from './paths.mjs';
requireRepoCwd();assert.equal(process.argv.length,2);
const id=identity(),message=gitRead('show','-s','--format=%B','HEAD');
function trailer(name){const rows=message.split('\n').filter(x=>x.startsWith(name+': '));assert.equal(rows.length,1,`Exactly one ${name} trailer required`);return rows[0].slice(name.length+2).trim();}
for(const [name,key]of [['Source','sourceFingerprint'],['Build','buildFingerprint'],['Probe','probeFingerprint']])assert.equal(trailer('Moticos-Touch-Drag-Reviewed-'+name),id[key]);
const record={scope:'moticos-stage-e-touch-drag',authorized:true,baselineAccepted:true,ref:TARGET.ref,ownerMessageId:trailer('Moticos-Touch-Drag-Run-Authorization'),identity:id,profiles:ORDER,limits:LIMITS,includedAllowanceWithAutomaticZeroDollarStop:true,paidOverages:false};
approval(record,id,process.env);fs.writeFileSync(`${ROOT}/approval.json`,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
