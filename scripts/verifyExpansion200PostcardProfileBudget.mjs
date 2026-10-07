import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {PROFILE_PART_CAPS} from './expansion200PostcardScope.mjs';
export function verifyProfileBudget(profile,proof){
 const cap=PROFILE_PART_CAPS[profile];assert(cap,'Unknown evidence profile');assert.equal(proof.kind,'browser');assert.equal(proof.complete,true);assert(Number.isInteger(proof.partCount)&&proof.partCount>=1&&proof.partCount<=cap,'Profile part ceiling exceeded; full evidence is incomplete');assert(Number.isSafeInteger(proof.uploadUpperBound)&&proof.uploadUpperBound>0&&proof.uploadUpperBound<=cap*24*1024*1024,'Profile transfer ceiling exceeded');assert.equal(proof.partLimitBytes,24*1024*1024);return {profile,partCap:cap,parts:proof.partCount,uploadUpperBound:proof.uploadUpperBound};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const [profile,file]=process.argv.slice(2);console.log(JSON.stringify(verifyProfileBudget(profile,JSON.parse(readFileSync(file)))));}
