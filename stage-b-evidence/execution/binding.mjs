import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve,relative} from 'node:path';
import {verifyBuild,inventory} from '../../full-campaign-gate/binding.mjs';
import {digest} from '../../full-campaign-gate/evidence.mjs';
import {approval,ROOT} from './policy.mjs';
export function identity(){const build=verifyBuild(),probe=JSON.parse(fs.readFileSync(`${ROOT}/probe-build.json`));assert.equal(probe.sourceFingerprint,build.sourceFingerprint);assert.equal(probe.buildFingerprint,build.buildFingerprint);const root=process.env.MOTICOS_STAGE_B_PROBE_OUTPUT;assert(root);assert.deepEqual(inventory(resolve(root)).map(r=>({...r,file:relative(resolve(root),r.file)})),probe.files,'Probe build changed');return{sourceFingerprint:build.sourceFingerprint,buildFingerprint:build.buildFingerprint,probeFingerprint:digest(fs.readFileSync(`${ROOT}/probe-build.json`)),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};}
export function requireApproval(){const id=identity();const file=process.env.MOTICOS_STAGE_B_APPROVAL;assert(file&&fs.existsSync(file),'No fresh Stage B approval file');approval(JSON.parse(fs.readFileSync(file)),id,process.env);return id;}
