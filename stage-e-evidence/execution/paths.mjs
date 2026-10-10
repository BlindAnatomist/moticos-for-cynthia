import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {ROOT,ORDER} from './policy.mjs';
export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const RESULTS_ROOT = join(REPO_ROOT, ROOT);
export function requireRepoCwd() { assert.equal(resolve(process.cwd()), resolve(REPO_ROOT), 'Execution must start at repository root'); }
export function executionPaths(profile='collection', repoRoot=REPO_ROOT) {
  assert(profile === 'collection' || ORDER.includes(profile));
  const root = join(repoRoot,ROOT,profile);
  return {root,raw:join(root,'raw'),json:join(root,'results.json'),progress:join(root,'progress'),reporter:join(repoRoot,'stage-e-evidence/execution/reporter.mjs'),server:join(repoRoot,'stage-e-evidence/execution/serve.mjs')};
}
export function webServerConfig(repoRoot=REPO_ROOT) { return {command:`${JSON.stringify(process.execPath)} ${JSON.stringify(executionPaths('collection',repoRoot).server)}`,cwd:repoRoot,url:'http://127.0.0.1:4198/career.html',reuseExistingServer:false,timeout:15000}; }
