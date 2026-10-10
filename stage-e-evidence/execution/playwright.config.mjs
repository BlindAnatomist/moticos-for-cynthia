import assert from 'node:assert/strict';
import {join} from 'node:path';
import {defineConfig,devices} from '@playwright/test';
import {readPlaywrightInvocation,preservePlaywrightInvocation} from '../../gate/invocation.mjs';
import {verifyVersions,verifySource,requireApproval} from './binding.mjs';
import {invocation,admit,ORDER} from './policy.mjs';
import {REPO_ROOT,executionPaths,webServerConfig,requireRepoCwd} from './paths.mjs';
requireRepoCwd();verifyVersions();verifySource();
const call=readPlaywrightInvocation('MOTICOS_STAGE_E_ARGV'),{listing,profile}=invocation(call.args);
if(!listing){requireApproval();assert.equal(process.env.MOTICOS_STAGE_E_PROFILE,profile);assert.match(process.env.MOTICOS_STAGE_E_EPOCH??'',/^\d+$/);admit(profile,Math.ceil(Date.now()/1000)-Number(process.env.MOTICOS_STAGE_E_EPOCH));}
preservePlaywrightInvocation('MOTICOS_STAGE_E_ARGV',call);
export default defineConfig({testDir:join(REPO_ROOT,'stage-e-evidence/browser'),testMatch:'**/touch-drag.spec.mjs',workers:1,fullyParallel:false,retries:0,repeatEach:1,maxFailures:1,forbidOnly:true,globalTimeout:listing?0:admit(profile,Math.ceil(Date.now()/1000)-Number(process.env.MOTICOS_STAGE_E_EPOCH)),timeout:120000,expect:{timeout:7500},outputDir:executionPaths(profile??'collection').raw,reporter:listing?[['json']]:[['line'],['json',{outputFile:executionPaths(profile).json}],[executionPaths(profile).reporter]],use:{baseURL:'http://127.0.0.1:4198',actionTimeout:7500,navigationTimeout:15000,trace:'off',screenshot:'off',video:'off'},webServer:listing?undefined:webServerConfig(),projects:[{name:ORDER[0],use:{...devices['Desktop Chrome'],browserName:'chromium',hasTouch:true,viewport:{width:390,height:664}}},{name:ORDER[1],use:{...devices['iPhone 13'],browserName:'webkit',viewport:{width:390,height:664}}}]});
