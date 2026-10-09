// Collection only. This is deliberately not a launcher or new run authorization.
import {defineConfig,devices} from '@playwright/test';
import {verifyVersions} from '../../full-campaign-gate/binding.mjs';
verifyVersions();
const args=process.argv.slice(2);
if(!args.includes('--list'))throw Error('Stage B native execution is not authorized; scope, budget and a guarded launcher require separate review.');
export default defineConfig({testDir:'.',testMatch:'*.spec.mjs',forbidOnly:true,workers:1,retries:0,maxFailures:1,reporter:'json',use:{baseURL:'http://127.0.0.1:4198'},projects:[{name:'stage-b-chromium',use:{...devices['Desktop Chrome']}},{name:'stage-b-webkit-phone',use:{...devices['iPhone 13']}}]});
