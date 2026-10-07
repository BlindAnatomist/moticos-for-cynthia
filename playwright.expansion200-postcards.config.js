import {MIN_BROWSER_BUDGET_MS,MAX_BROWSER_BUDGET_MS} from './scripts/expansion200PostcardScope.mjs';
import {defineConfig,devices} from '@playwright/test';
import {readPlaywrightInvocation,preservePlaywrightInvocation} from './scripts/playwrightInvocation.mjs';
import {TRACE_POLICY} from './scripts/expansion200GateCollectionEvidence.mjs';
const invocation=readPlaywrightInvocation('MOTICOS_200_POSTCARDS_GUARDED_ARGV'),args=invocation.args,listing=args.includes('--list');
const profiles=['webkit-iphone-13','webkit-iphone-large','chromium-desktop'];
const selected=args.filter(arg=>arg.startsWith('--project=')).map(arg=>arg.slice(10));
const config='--config=playwright.expansion200-postcards.config.js';
const safe=new Set([config,'--list','--reporter=json','--reporter=line',...profiles.map(p=>`--project=${p}`)]);
if(args[0]!=='test'||args.slice(1).some(a=>!safe.has(a))||selected.length>1||new Set(args).size!==args.length||
 !args.includes(config)||(!listing&&(process.env.MOTICOS_200_POSTCARDS_BROWSER_APPROVED!=='1'||selected.length!==1||JSON.stringify(args)!==JSON.stringify(['test',config,`--project=${selected[0]}`]))))throw Error('Only exact approved full-profile execution or read-only collection is admitted. The operator flag is not user approval.');
const budget=Number(process.env.MOTICOS_200_POSTCARDS_BROWSER_BUDGET_MS??MAX_BROWSER_BUDGET_MS);
if(!Number.isSafeInteger(budget)||budget<MIN_BROWSER_BUDGET_MS||budget>MAX_BROWSER_BUDGET_MS)throw Error('Browser budget must be six to eight minutes, preserving cleanup reserve.');
preservePlaywrightInvocation('MOTICOS_200_POSTCARDS_GUARDED_ARGV',invocation);
export default defineConfig({testDir:'./tests/expansion200-postcards',testMatch:'*.spec.js',timeout:60000,globalTimeout:budget,expect:{timeout:7500},
 workers:1,fullyParallel:false,retries:0,maxFailures:1,forbidOnly:true,outputDir:'expansion200-test-results',
 reporter:[['line'],['json',{outputFile:'expansion200-test-results/results.json'}],['./scripts/expansion200GateProgressReporter.mjs']],
 use:{baseURL:'http://127.0.0.1:4197',actionTimeout:7500,navigationTimeout:15000,trace:TRACE_POLICY,screenshot:'only-on-failure'},
 webServer:{command:'node scripts/serveExpansion200PostcardGate.mjs',url:'http://127.0.0.1:4197',reuseExistingServer:false,timeout:60000},
 projects:[{name:'webkit-iphone-13',use:{...devices['iPhone 13'],browserName:'webkit'}},{name:'webkit-iphone-large',use:{...devices['iPhone 13'],browserName:'webkit',viewport:{width:430,height:932},screen:{width:430,height:932}}},{name:'chromium-desktop',use:{...devices['Desktop Chrome'],browserName:'chromium'}}]});
