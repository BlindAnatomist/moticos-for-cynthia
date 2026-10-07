import {defineConfig,devices} from '@playwright/test';
import {readPlaywrightInvocation,preservePlaywrightInvocation} from './scripts/playwrightInvocation.mjs';
import {CASES,BUDGETS,ORIGIN,validateInvocation,eligibleBudget} from './scripts/careerGateScope.mjs';
const invocation=readPlaywrightInvocation('MOTICOS_CAREER_GUARDED_ARGV');
const {listing,profile}=validateInvocation(invocation.args,process.env.MOTICOS_CAREER_BROWSER_APPROVED==='1');
if(!listing){if(process.env.MOTICOS_CAREER_PROFILE!==profile)throw Error('Profile must be provided by the bounded launcher');if(!invocation.worker){if(!/^\d+$/.test(process.env.MOTICOS_JOB_EPOCH??''))throw Error('Job clock required');eligibleBudget(profile,Math.floor(Date.now()/1000)-Number(process.env.MOTICOS_JOB_EPOCH));}}
preservePlaywrightInvocation('MOTICOS_CAREER_GUARDED_ARGV',invocation);
export default defineConfig({testDir:'./tests/career-browser',testMatch:'*.spec.js',timeout:60000,
 globalTimeout:listing?0:BUDGETS[profile],workers:1,fullyParallel:false,retries:0,maxFailures:1,forbidOnly:true,
 outputDir:`career-results/${profile??'collection'}/raw`,reporter:listing?[['json']]:[['line'],['json',{outputFile:`career-results/${profile}/results.json`}],['./scripts/careerGateReporter.mjs']],
 use:{baseURL:ORIGIN,actionTimeout:7500,navigationTimeout:15000,trace:{mode:'retain-on-failure',screenshots:false,snapshots:true,sources:false},screenshot:'only-on-failure',video:'off'},
 webServer:listing?undefined:{command:'node scripts/serveCareer.mjs',url:`${ORIGIN}/career.html`,reuseExistingServer:false,timeout:20000},
 projects:[{name:'career-chromium',testMatch:'desktop-geometry.spec.js',use:{...devices['Desktop Chrome'],browserName:'chromium',viewport:{width:1366,height:768}}},{name:'career-webkit-phone',testMatch:'phone-geometry.spec.js',use:{...devices['iPhone 13'],browserName:'webkit',viewport:{width:390,height:844}}}],
});
