import { defineConfig, devices } from '@playwright/test';

// Collection/listing is safe without launching a browser or server. Execution
// is a separate authorized gate; this switch is not itself user approval.
if (!process.argv.includes('--list') && process.env.MOTICOS_TRIAL_BROWSER_APPROVED !== '1') {
  throw new Error('Private Light / Letter browser execution is not yet approved. List only, or obtain the bounded execution approval first.');
}
export default defineConfig({
  testDir: './tests/trial',
  timeout: 60_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 7_500 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  maxFailures: 1,
  forbidOnly: true,
  outputDir: 'trial-test-results',
  reporter: [['line'], ['json', { outputFile: 'trial-test-results/results.json' }], ['./scripts/progress-reporter.mjs', { directory: 'trial-test-results/progress' }]],
  use: { baseURL: 'http://127.0.0.1:4185', actionTimeout: 7_500, navigationTimeout: 15_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build:trial && npx vite preview --outDir dist-trial --host 127.0.0.1 --port 4185 --strictPort', url: 'http://127.0.0.1:4185', reuseExistingServer: false, timeout: 60_000 },
  projects: [
    { name: 'webkit-iphone-13', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'webkit-iphone-large', use: { ...devices['iPhone 13'], browserName: 'webkit', viewport: { width: 430, height: 932 }, screen: { width: 430, height: 932 } } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
  ],
});
