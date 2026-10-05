import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const config = pathToFileURL(resolve('playwright.expansion120.config.js')).href;
function inspect(args, approved = true, budget = '540000') {
  const code = `process.argv=['node','playwright','test',...${JSON.stringify(['--config=playwright.expansion120.config.js', ...args])}]; const {default:c}=await import(${JSON.stringify(config)}); console.log(JSON.stringify({workers:c.workers,retries:c.retries,maxFailures:c.maxFailures,globalTimeout:c.globalTimeout,trace:c.use.trace}));`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { ...process.env, MOTICOS_120_LARGE_RECHECK_APPROVED: approved ? '1' : '', MOTICOS_120_BROWSER_BUDGET_MS:budget } });
}
describe('120-piece browser execution guard (no server or browser)', () => {
  it.each(['webkit-iphone-large'])('collects the approved %s configuration', profile => {
    const result = inspect([`--project=${profile}`]); expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ workers: 1, retries: 0, maxFailures: 1, globalTimeout: 540000, trace:{mode:'retain-on-failure',screenshots:false,snapshots:false,sources:true,attachments:false} });
  });
  it('permits read-only list collection without approval', () => expect(inspect(['--list', '--reporter=json'], false).status).toBe(0));
  it('rejects unapproved execution', () => expect(inspect(['--project=webkit-iphone-large'], false).status).not.toBe(0));
  it.each([[], ['--project=chromium-desktop'], ['--project=webkit-iphone-13'], ['--project=webkit-iphone-large','--config=playwright.expansion120.config.js'], ['--project=*'], ['--project=chromium-desktop', '--project=webkit-iphone-13'], ['--project=webkit-iphone-large', '--retries=1'], ['--project=webkit-iphone-large', '--workers=2'], ['--project=webkit-iphone-large', '--grep=Undo'], ['--project=webkit-iphone-large', '--reporter=json']])('refuses scope or budget overrides %j', (...args) => expect(inspect(args).status).not.toBe(0));
});



it.each(['479999','540001','NaN','Infinity','480000.5'])('rejects browser budget %s outside the bounded window',budget=>expect(inspect(['--project=webkit-iphone-large'],true,budget).status).not.toBe(0));
it('admits the lower eight-minute browser cap without changing the profile',()=>expect(JSON.parse(inspect(['--project=webkit-iphone-large'],true,'480000').stdout).globalTimeout).toBe(480000));
