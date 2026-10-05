import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const config=new URL('../playwright.collage-live.config.js',import.meta.url).href;
function inspect(args, approved='1', budget='180000', accepted=true) {
 const root=mkdtempSync(join(tmpdir(),'moticos-hosted-config-'));
 try {
  mkdirSync(join(root,'tests/verification'),{recursive:true});writeFileSync(join(root,'tests/verification/collage-live-contract.json'),JSON.stringify({status:accepted?'release-candidate-accepted':'preparation-only-not-accepted'}));
  const program=`process.argv=['node','playwright',...${JSON.stringify(args)}];const {default:c}=await import(${JSON.stringify(config)});console.log(JSON.stringify({workers:c.workers,retries:c.retries,maxFailures:c.maxFailures,globalTimeout:c.globalTimeout,webServer:c.webServer??null,profiles:c.projects.map(p=>p.name),url:c.use.baseURL}));`;
  return spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:root,encoding:'utf8',env:{...process.env,MOTICOS_LIVE_SMOKE_APPROVED:approved,MOTICOS_LIVE_BROWSER_BUDGET_MS:budget}});
 } finally {rmSync(root,{recursive:true,force:true});}
}
const exact=['test','--config=playwright.collage-live.config.js'];
describe('hosted command and bounded budget guard',()=>{
 it('lists safely before acceptance without execution approval',()=>expect(inspect([...exact,'--list','--reporter=json'],'0','180000',false).status).toBe(0));
 it('admits only the complete approved hosted command',()=>{const result=inspect(exact);expect(result.status).toBe(0);expect(JSON.parse(result.stdout)).toMatchObject({workers:1,retries:0,maxFailures:1,globalTimeout:180000,webServer:null,url:'https://moticos-garden-preview.blind-anatomist.chatgpt.site'});});
 it('blocks execution before exact RC acceptance',()=>expect(inspect(exact,'1','180000',false).status).not.toBe(0));
 it('blocks execution without approval',()=>expect(inspect(exact,'0').status).not.toBe(0));
 it.each(['--project=chromium-desktop','--workers=2','--retries=1','--grep=hosted','--global-timeout=1000','--reporter=json'])('blocks runtime override %s',arg=>expect(inspect([...exact,arg]).status).not.toBe(0));
 it.each(['89999','180001','NaN','0','120000.5'])('blocks invalid budget %s',budget=>expect(inspect(exact,'1',budget).status).not.toBe(0));
 it('admits the lower 90-second bounded budget',()=>expect(inspect(exact,'1','90000').status).toBe(0));
});
