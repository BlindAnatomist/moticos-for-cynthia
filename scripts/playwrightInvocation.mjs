import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const workerEntry = realpathSync(join(dirname(require.resolve('playwright/package.json')), 'lib/worker/workerProcessEntry.js'));

// Playwright reloads a config in its installed IPC worker with no CLI arguments.
// Environment flags alone never classify an outer invocation as an internal one.
export function isInstalledPlaywrightWorker(candidate = process) {
  if (candidate.argv.length !== 2 || candidate.connected !== true || typeof candidate.send !== 'function' ||
      !/^(0|[1-9]\d*)$/.test(candidate.env.TEST_WORKER_INDEX ?? '') ||
      !/^(0|[1-9]\d*)$/.test(candidate.env.TEST_PARALLEL_INDEX ?? '')) return false;
  try { return realpathSync(candidate.argv[1]) === workerEntry; }
  catch { return false; }
}
export function readPlaywrightInvocation(key) {
  const worker = isInstalledPlaywrightWorker();
  const args = worker ? JSON.parse(process.env[key] ?? 'null') : process.argv.slice(2);
  if (!Array.isArray(args) || !args.every(arg => typeof arg === 'string') || (worker && args.includes('--list'))) {
    throw new Error('Internal worker has no previously validated execution arguments.');
  }
  return { args, worker };
}
// Call only after every original command, approval and budget check has passed.
export function preservePlaywrightInvocation(key, invocation) {
  if (!invocation.worker) process.env[key] = JSON.stringify(invocation.args);
}
