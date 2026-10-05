import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const config = pathToFileURL(resolve('playwright.expansion120.config.js')).href;
function inspect(args, approved = true) {
  const code = `process.argv=['node','playwright','test',...${JSON.stringify(['--config=playwright.expansion120.config.js', ...args])}]; const {default:c}=await import(${JSON.stringify(config)}); console.log(JSON.stringify({workers:c.workers,retries:c.retries,maxFailures:c.maxFailures,globalTimeout:c.globalTimeout}));`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { ...process.env, MOTICOS_120_BROWSER_APPROVED: approved ? '1' : '' } });
}
describe('120-piece browser execution guard (no server or browser)', () => {
  it.each(['chromium-desktop', 'webkit-iphone-13', 'webkit-iphone-large'])('collects the approved %s configuration', profile => {
    const result = inspect([`--project=${profile}`]); expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ workers: 1, retries: 0, maxFailures: 1, globalTimeout: 540000 });
  });
  it('permits read-only list collection without approval', () => expect(inspect(['--list', '--reporter=json'], false).status).toBe(0));
  it('rejects unapproved execution', () => expect(inspect(['--project=chromium-desktop'], false).status).not.toBe(0));
  it.each([[], ['--project=*'], ['--project=chromium-desktop', '--project=webkit-iphone-13'], ['--project=chromium-desktop', '--retries=1'], ['--project=chromium-desktop', '--workers=2'], ['--project=chromium-desktop', '--grep=Undo'], ['--project=chromium-desktop', '--reporter=json']])('refuses scope or budget overrides %j', (...args) => expect(inspect(args).status).not.toBe(0));
});


