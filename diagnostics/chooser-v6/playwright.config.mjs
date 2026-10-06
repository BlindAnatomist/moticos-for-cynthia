import {defineConfig,devices} from '@playwright/test';
import {readPlaywrightInvocation,preservePlaywrightInvocation} from '../../frozen-v6/scripts/playwrightInvocation.mjs';
import {TRACE_POLICY} from '../../frozen-v6/scripts/expansion160CollectionEvidence.mjs';
import {ROOT,RESULTS,PROJECT,validateInvocation} from './run.mjs';
import {join} from 'node:path';
const invocation=readPlaywrightInvocation('MOTICOS_CHOOSER_V6_ARGV');
validateInvocation(invocation.args);
preservePlaywrightInvocation('MOTICOS_CHOOSER_V6_ARGV',invocation);
export default defineConfig({
 testDir:join(ROOT,'diagnostics/chooser-v6'),testMatch:'chooser.spec.js',
 timeout:45000,globalTimeout:90000,expect:{timeout:7500},
 workers:1,fullyParallel:false,retries:0,maxFailures:1,forbidOnly:true,
 outputDir:join(RESULTS,'playwright'),
 reporter:[['line'],['json',{outputFile:join(RESULTS,'results.json')}]],
 use:{baseURL:'http://127.0.0.1:4197',actionTimeout:7500,navigationTimeout:15000,trace:TRACE_POLICY,screenshot:'only-on-failure'},
 projects:[{name:PROJECT,use:{...devices['iPhone 13'],browserName:'webkit'}}],
 // The diagnostic wrapper alone serves the independently verified old build.
 // Read-only collection therefore never starts a server or browser.
});
