import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isInstalledPlaywrightWorker } from '../scripts/playwrightInvocation.mjs';
import { exerciseWorker } from '../scripts/checkWorkerReload.mjs';
const config=pathToFileURL(resolve('playwright.expansion160.config.js')).href;
const fixed=['--config=playwright.expansion160.config.js'], good='--project=chromium-desktop';
function inspect(args, approved=true, budget='960000', extraEnv={}) {
 const program=`process.argv=['node','playwright','test',...${JSON.stringify(args)}];const {default:c}=await import(${JSON.stringify(config)});console.log(JSON.stringify({workers:c.workers,retries:c.retries,maxFailures:c.maxFailures,globalTimeout:c.globalTimeout}));`;
 const env={...process.env,...extraEnv,MOTICOS_160_BROWSER_APPROVED:approved?'1':'',MOTICOS_160_BROWSER_BUDGET_MS:budget};
 return spawnSync(process.execPath,['--input-type=module','-e',program],{encoding:'utf8',env});
}
describe('strict outer CLI survives Playwright worker reload',()=>{
 it('uses a real IPC worker without a server or browser fixture',()=>{const result=exerciseWorker('playwright.expansion160.config.js',true);expect(result.stats.expected).toBe(1);expect(result.noBrowserFixture).toBe(true);expect(result.noWebServer).toBe(true);},20000);
 it.each(['webkit-iphone-13','webkit-iphone-large','chromium-desktop'])('admits exactly the approved %s profile',profile=>expect(inspect([...fixed,`--project=${profile}`]).status).toBe(0));
 const denied=[[],['--project','chromium-desktop'],['--project','chromium-desktop','webkit-iphone-13'],[good,'webkit-iphone-13'],[good,'--project=webkit-iphone-13'],['--project=*'],['--project=unknown'],[good,'--workers=5'],[good,'-j','5'],[good,'--retries=3'],[good,'--global-timeout=0'],[good,'--max-failures=0'],[good,'--timeout=0'],[good,'--grep=one'],[good,'--repeat-each=2'],[good,'--reporter=json'],[good,'--debug'],[good,'--ui']];
 it.each(denied.map((args,index)=>({args,index})))('rejects disallowed outer argv fixture $index',({args})=>expect(inspect([...fixed,...args]).status).not.toBe(0));
 it('still requires approval',()=>expect(inspect([...fixed,good],false).status).not.toBe(0));
 it.each([['--list'],['--list','--reporter=json']])('allows read-only listing %j',(...args)=>expect(inspect([...fixed,...args],false).status).toBe(0));
 it.each(['900000','960000'])('admits bounded browser budget %s',budget=>expect(inspect([...fixed,good],true,budget).status).toBe(0));
 it.each(['899999','960001','0','NaN','900000.5'])('rejects invalid budget %s',budget=>expect(inspect([...fixed,good],true,budget).status).not.toBe(0));
 it('does not mistake environment-only worker flags for a real worker',()=>expect(isInstalledPlaywrightWorker({argv:['node','playwright'],env:{TEST_WORKER_INDEX:'0',TEST_PARALLEL_INDEX:'0'},connected:false,send:undefined})).toBe(false));
 it('ignores forged inherited argv in an outer CLI call',()=>expect(inspect([...fixed,good,'--workers=5'],true,'960000',{TEST_WORKER_INDEX:'0',TEST_PARALLEL_INDEX:'0',MOTICOS_160_GUARDED_ARGV:JSON.stringify(['test',...fixed,good])}).status).not.toBe(0));
 it('ignores forged inherited argv instead of authorizing an unapproved outer run',()=>expect(inspect([...fixed,good],false,'960000',{TEST_WORKER_INDEX:'0',TEST_PARALLEL_INDEX:'0',MOTICOS_160_GUARDED_ARGV:JSON.stringify(['test',...fixed,good])}).status).not.toBe(0));
 it('rejects another IPC executable even with valid-looking worker flags',()=>expect(isInstalledPlaywrightWorker({argv:[process.execPath,process.execPath],env:{TEST_WORKER_INDEX:'0',TEST_PARALLEL_INDEX:'0'},connected:true,send(){}})).toBe(false));
});
