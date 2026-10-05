import { defineConfig, devices } from '@playwright/test';
import { readPlaywrightInvocation, preservePlaywrightInvocation } from './scripts/playwrightInvocation.mjs';
import { PROFILES } from './tests/rollback-browser/plan.js';
import { TRACE_POLICY } from './scripts/rollbackDiagnostics.mjs';

// An operator guard, never permission to bypass a denied browser route.
const invocation = readPlaywrightInvocation('MOTICOS_ROLLBACK_GUARDED_ARGV');
const args = invocation.args, listing = args.includes('--list');
const profiles = PROFILES.map(p => p.name);
const selected = args.filter(arg => arg.startsWith('--project=')).map(arg => arg.slice(10));
const exactExecution = ['test', '--config=playwright.rollback.config.js', `--project=${selected[0]}`];
const listingCommands = [
  ['test', '--config=playwright.rollback.config.js', '--list', '--reporter=json'],
  ...profiles.map(profile => ['test', '--config=playwright.rollback.config.js', '--list', '--reporter=json', `--project=${profile}`]),
];
if (listing ? !listingCommands.some(command => JSON.stringify(command) === JSON.stringify(args)) :
    process.env.MOTICOS_ROLLBACK_BROWSER_APPROVED !== '1' || selected.length !== 1 || !profiles.includes(selected[0]) || JSON.stringify(args) !== JSON.stringify(exactExecution)) {
  throw Error('Use the exact approved one-profile command; no filters, repetitions, reporter changes or runtime overrides.');
}
const budget = Number(process.env.MOTICOS_ROLLBACK_BROWSER_BUDGET_MS ?? 540000);
if (!Number.isSafeInteger(budget) || budget < 480000 || budget > 540000) throw Error('Browser budget must be eight to nine minutes, leaving the evidence reserve intact.');
preservePlaywrightInvocation('MOTICOS_ROLLBACK_GUARDED_ARGV', invocation);
export default defineConfig({
  testDir: './tests/rollback-browser', testMatch: '*.spec.js', timeout: 120000, globalTimeout: budget,
  expect: { timeout: 7500 }, workers: 1, retries: 0, maxFailures: 1, fullyParallel: false, forbidOnly: true,
  outputDir: 'rollback-test-results', reporter: [['line'], ['json', { outputFile: 'rollback-test-results/results.json' }], ['./scripts/rollbackEvidenceReporter.mjs']],
  use: { baseURL: 'http://127.0.0.1:4189', actionTimeout: 7500, navigationTimeout: 15000, screenshot: 'only-on-failure', trace: TRACE_POLICY },
  webServer: { command: 'node scripts/serveRollback.mjs', url: 'http://127.0.0.1:4189', reuseExistingServer: false, timeout: 60000 },
  projects: PROFILES.map(profile => ({ name: profile.name, use: {
    ...(profile.name === 'chromium-desktop' ? devices['Desktop Chrome'] : devices['iPhone 13']),
    viewport: { width: profile.width, height: profile.height }, screen: { width: profile.width, height: profile.height },
  } })),
});
