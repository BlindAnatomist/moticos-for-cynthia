import { readPlaywrightInvocation, preservePlaywrightInvocation } from './scripts/playwrightInvocation.mjs';
import { defineConfig, devices } from '@playwright/test';
// Operator guard only. This flag is not approval and never overrides a denied
// preview endpoint. Collecting the suite is read-only and starts no browser.
const invocation = readPlaywrightInvocation('MOTICOS_120_GUARDED_ARGV');
const args = invocation.args;
const listing = args.includes('--list');
const allowedProfiles = ['webkit-iphone-13', 'webkit-iphone-large', 'chromium-desktop'];
const selectedProfiles = args.filter(arg => arg.startsWith('--project=')).map(arg => arg.slice(10));
const safeFlags = new Set(['--config=playwright.expansion120.config.js', '--list', '--reporter=json', '--reporter=line', ...allowedProfiles.map(name => `--project=${name}`)]);
if (args[0] !== 'test' || args.slice(1).some(arg => !safeFlags.has(arg)) || selectedProfiles.length > 1 ||
    (!listing && (process.env.MOTICOS_120_BROWSER_APPROVED !== '1' || selectedProfiles.length !== 1 || args.some(arg => arg.startsWith('--reporter='))))) {
 throw new Error('Use the exact approved one-profile command with --project=NAME. Runtime CLI overrides, extra profile values and partial-suite filters are not admitted.');
}
const browserBudget = Number(process.env.MOTICOS_120_BROWSER_BUDGET_MS ?? 540000);
if (!Number.isSafeInteger(browserBudget) || browserBudget < 480000 || browserBudget > 540000) {
 throw new Error('The browser budget must be eight to nine minutes, leaving the job evidence reserve intact.');
}
preservePlaywrightInvocation('MOTICOS_120_GUARDED_ARGV', invocation);
export default defineConfig({
 testDir:'./tests/expansion-browser',testMatch:'*.spec.js',timeout:60000,globalTimeout:browserBudget,expect:{timeout:7500},
 workers:1,fullyParallel:false,retries:0,maxFailures:1,forbidOnly:true,outputDir:'batch-test-results',
 reporter:[['line'],['json',{outputFile:'batch-test-results/results.json'}],['./scripts/batch-progress-reporter.mjs']],
 use:{baseURL:'http://127.0.0.1:4187',actionTimeout:7500,navigationTimeout:15000,trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node scripts/serveExpansion120.mjs',url:'http://127.0.0.1:4187',reuseExistingServer:false,timeout:60000},
 projects:[
  {name:'webkit-iphone-13',use:{...devices['iPhone 13'],browserName:'webkit'}},
  {name:'webkit-iphone-large',use:{...devices['iPhone 13'],browserName:'webkit',viewport:{width:430,height:932},screen:{width:430,height:932}}},
  {name:'chromium-desktop',use:{...devices['Desktop Chrome'],browserName:'chromium'}},
 ],
});
