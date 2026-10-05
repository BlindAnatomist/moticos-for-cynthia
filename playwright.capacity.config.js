import { defineConfig, devices } from '@playwright/test';
import { readPlaywrightInvocation, preservePlaywrightInvocation } from './scripts/playwrightInvocation.mjs';
// A local operator guard, never an authorization grant or a browser-denial bypass.
const invocation = readPlaywrightInvocation('MOTICOS_CAPACITY_GUARDED_ARGV');
const args = invocation.args, listing = args.includes('--list');
const profiles = ['chromium-desktop', 'webkit-iphone-13', 'webkit-iphone-large'];
const selected = args.filter(a => a.startsWith('--project='));
const flags = new Set(['--config=playwright.capacity.config.js', '--list', '--reporter=json', ...profiles.map(p => `--project=${p}`)]);
if (args[0] !== 'test' || args.slice(1).some(a => !flags.has(a)) || selected.length > 1 ||
    (!listing && (process.env.MOTICOS_CAPACITY_BROWSER_APPROVED !== '1' || selected.length !== 1 || args.includes('--reporter=json')))) {
  throw Error('Capacity browser execution needs separate approval and one exact profile; collection is read-only.');
}
preservePlaywrightInvocation('MOTICOS_CAPACITY_GUARDED_ARGV', invocation);
export default defineConfig({
  testDir: './tests/capacity-browser', timeout: 60000, globalTimeout: 360000, expect: { timeout: 7500 },
  workers: 1, fullyParallel: false, retries: 0, maxFailures: 1, forbidOnly: true,
  outputDir: 'capacity-test-results', reporter: [['line'], ['json', { outputFile: 'capacity-test-results/results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4185', actionTimeout: 7500, navigationTimeout: 15000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/serveCapacity.mjs', url: 'http://127.0.0.1:4185', reuseExistingServer: false, timeout: 60000 },
  projects: [
    { name: profiles[0], use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
    { name: profiles[1], use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: profiles[2], use: { ...devices['iPhone 13'], browserName: 'webkit', viewport: { width: 430, height: 932 }, screen: { width: 430, height: 932 } } },
  ],
});
