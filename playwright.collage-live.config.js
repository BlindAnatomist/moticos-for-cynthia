import { readPlaywrightInvocation, preservePlaywrightInvocation } from './scripts/playwrightInvocation.mjs';
import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
const invocation = readPlaywrightInvocation('MOTICOS_LIVE_GUARDED_ARGV');
const args = invocation.args, listing = args.includes('--list');
const safe = new Set(['--config=playwright.collage-live.config.js', '--list', '--reporter=json']);
if (args[0] !== 'test' || args.slice(1).some(arg => !safe.has(arg)) ||
    (!listing && (process.env.MOTICOS_LIVE_SMOKE_APPROVED !== '1' || args.includes('--reporter=json')))) {
  throw new Error('Use the exact all-profile hosted-smoke command; no runtime overrides, filters or retries.');
}
const budget = Number(process.env.MOTICOS_LIVE_BROWSER_BUDGET_MS ?? 180000);
if (!Number.isSafeInteger(budget) || budget < 90000 || budget > 180000) throw new Error('Live browser budget must be 90–180 seconds.');
if (!listing) {
  const contract = JSON.parse(readFileSync('tests/verification/collage-live-contract.json', 'utf8'));
  if (contract.status !== 'release-candidate-accepted') throw new Error('Hosted execution requires exact accepted release-candidate pins.');
}
preservePlaywrightInvocation('MOTICOS_LIVE_GUARDED_ARGV', invocation);
export default defineConfig({
  testDir: './tests/live', testMatch: 'collage-live.spec.js', timeout: 60000, globalTimeout: budget,
  expect: { timeout: 5000 }, workers: 1, fullyParallel: false, retries: 0, maxFailures: 1, forbidOnly: true,
  outputDir: 'batch-test-results',
  reporter: [['line'], ['json', { outputFile: 'batch-test-results/results.json' }], ['./scripts/live-progress-reporter.mjs']],
  // The ordinary public URL only. There is deliberately no local web server.
  use: { baseURL: 'https://moticos-garden-preview.blind-anatomist.chatgpt.site',
    actionTimeout: 5000, navigationTimeout: 15000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'webkit-iphone-13', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'webkit-iphone-large', use: { ...devices['iPhone 13'], browserName: 'webkit', viewport: { width: 430, height: 932 }, screen: { width: 430, height: 932 } } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
  ],
});
