import assert from 'node:assert/strict';
import {defineConfig,devices} from '@playwright/test';
import {readPlaywrightInvocation,preservePlaywrightInvocation} from '../../gate/invocation.mjs';
import {verifyVersions,verifySource,requireApproval} from './binding.mjs';
import {invocation,BUDGETS,admit,ORDER} from './policy.mjs';
import {REPO_ROOT,executionPaths,webServerConfig,requireRepoCwd} from './paths.mjs';
requireRepoCwd();verifyVersions();verifySource();
const call=readPlaywrightInvocation('MOTICOS_280_ARGV'),{listing,profile}=invocation(call.args);
if(!listing){requireApproval();assert.equal(process.env.MOTICOS_280_PROFILE,profile);assert.match(process.env.MOTICOS_280_EPOCH??'',/^\d+$/);admit(profile,Math.ceil(Date.now()/1000)-Number(process.env.MOTICOS_280_EPOCH));}
preservePlaywrightInvocation('MOTICOS_280_ARGV',call);
const testMatch=['**/stage-c-evidence/browser/early.spec.mjs','**/stage-c-evidence/browser/late.spec.mjs'];
export default defineConfig({testDir:REPO_ROOT,workers:1,fullyParallel:false,retries:0,repeatEach:1,maxFailures:1,forbidOnly:true,globalTimeout:listing?0:admit(profile,Math.ceil(Date.now()/1000)-Number(process.env.MOTICOS_280_EPOCH)),timeout:120000,expect:{timeout:7500},outputDir:executionPaths(profile??'collection').raw,reporter:listing?[['json']]:[['line'],['json',{outputFile:executionPaths(profile).json}],[executionPaths(profile).reporter]],use:{baseURL:'http://127.0.0.1:4198',actionTimeout:7500,navigationTimeout:15000,trace:{mode:'retain-on-failure',screenshots:false,snapshots:false,sources:false,attachments:false},screenshot:'off',video:'off'},webServer:listing?undefined:webServerConfig(),projects:[{name:ORDER[0],testMatch,use:{...devices['Desktop Chrome'],viewport:{width:1366,height:768}}},{name:ORDER[1],testMatch,use:{...devices['iPhone 13'],viewport:{width:390,height:664}}}]});
