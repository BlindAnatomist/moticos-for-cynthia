import {REPO_ROOT,executionPaths,webServerConfig,requireRepoCwd} from './paths.mjs';
import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readPlaywrightInvocation,preservePlaywrightInvocation} from '../../gate/invocation.mjs';
import {verifyVersions} from '../../full-campaign-gate/binding.mjs';
import {requireApproval} from './binding.mjs';
import {invocation,BUDGETS,ROOT,admit} from './policy.mjs';
requireRepoCwd();verifyVersions();const call=readPlaywrightInvocation('MOTICOS_240_ARGV'),{listing,profile}=invocation(call.args);
if(!listing){requireApproval();assert.equal(process.env.MOTICOS_240_PROFILE,profile);assert.match(process.env.MOTICOS_240_EPOCH??'',/^\d+$/);admit(profile,Math.floor(Date.now()/1000)-Number(process.env.MOTICOS_240_EPOCH));}
preservePlaywrightInvocation('MOTICOS_240_ARGV',call);
export default defineConfig({testDir:REPO_ROOT,workers:1,fullyParallel:false,retries:0,maxFailures:1,forbidOnly:true,globalTimeout:listing?0:BUDGETS[profile],timeout:180000,expect:{timeout:7500},outputDir:executionPaths(profile??'collection').raw,reporter:listing?[['json']]:[['line'],['json',{outputFile:executionPaths(profile).json}],[executionPaths(profile).reporter]],use:{baseURL:'http://127.0.0.1:4198',actionTimeout:7500,navigationTimeout:15000,trace:{mode:'retain-on-failure',screenshots:false,snapshots:false,sources:false,attachments:false},screenshot:'only-on-failure',video:'off'},webServer:listing?undefined:webServerConfig(),projects:[{name:'full-chromium',testMatch:'**/tests/full-campaign-browser/desktop.spec.mjs',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:768}}},{name:'full-webkit-phone',testMatch:'**/tests/full-campaign-browser/phone.spec.mjs',use:{...devices['iPhone 13'],viewport:{width:390,height:664}}},{name:'stage-b-chromium',testMatch:'**/stage-b-evidence/browser/*.spec.mjs',use:{...devices['Desktop Chrome']}},{name:'stage-b-webkit-phone',testMatch:'**/stage-b-evidence/browser/*.spec.mjs',use:{...devices['iPhone 13']}}]});
