import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const playwrightRoot = dirname(require.resolve('playwright/package.json'));
const dependencies = dirname(playwrightRoot);
export function exerciseWorker(sourceConfig, expectedPass) {
  const temporary = mkdtempSync(join(tmpdir(), 'moticos-worker-only-'));
  try {
    const name = basename(sourceConfig), hosted = name.includes('live');
    writeFileSync(join(temporary, 'package.json'), '{"type":"module"}\n');
    symlinkSync(dependencies, join(temporary, 'node_modules'), 'dir');
    mkdirSync(join(temporary, 'worker-only'));
    mkdirSync(join(temporary, 'tests/verification'), {recursive:true});
    writeFileSync(join(temporary, 'tests/verification/collage-live-contract.json'), '{"status":"release-candidate-accepted"}\n');
    writeFileSync(join(temporary, name), `import config from ${JSON.stringify(pathToFileURL(resolve(sourceConfig)).href)};\n// Test fixture only: no server and no browser/page fixture.\nexport default {...config, testDir:'./worker-only',testMatch:'worker.spec.js',webServer:undefined,reporter:[['json',{outputFile:'report.json'}]],outputDir:'worker-results'};\n`);
    writeFileSync(join(temporary, 'worker-only/worker.spec.js'), `import {test,expect} from '@playwright/test';\nimport {writeFileSync} from 'node:fs';\ntest('real IPC worker reload without browser or server', async ({}, info)=>{\n expect(process.argv).toHaveLength(2);expect(process.argv[1]).toMatch(/workerProcessEntry\\.js$/);expect(process.connected).toBe(true);expect(typeof process.send).toBe('function');expect(Number(process.env.TEST_WORKER_INDEX)).toBeGreaterThanOrEqual(0);expect(info.retry).toBe(0);\n writeFileSync('worker-observed-'+info.project.name+'.json',JSON.stringify({argv:process.argv,worker:process.env.TEST_WORKER_INDEX,profile:info.project.name,retry:info.retry}));\n});\n`);
    const args = ['test', `--config=${name}`, ...(hosted ? [] : ['--project=chromium-desktop'])];
    const result = spawnSync(process.execPath, [join(playwrightRoot, 'cli.js'), ...args], {
      cwd:temporary, encoding:'utf8', timeout:30000,
      env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:join(temporary,'no-browser-binaries'),MOTICOS_BATCH_BROWSER_APPROVED:'1',MOTICOS_BATCH_BROWSER_BUDGET_MS:'360000',MOTICOS_LIVE_SMOKE_APPROVED:'1',MOTICOS_LIVE_BROWSER_BUDGET_MS:'90000'},
    });
    assert(!result.error, result.error?.message);
    const report = JSON.parse(readFileSync(join(temporary, 'report.json'), 'utf8'));
    if (expectedPass) {
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.equal(report.stats.expected, hosted ? 3 : 1);
      for (const key of ['unexpected','flaky','skipped']) assert.equal(report.stats[key],0);
    } else {
      assert.notEqual(result.status, 0, 'Unrepaired config unexpectedly passed');
      assert.equal(report.stats.expected,0);
      assert(JSON.stringify(report).includes(hosted ? 'Use the exact all-profile hosted-smoke command' : 'Use the exact approved one-profile command'));
    }
    return { sourceConfig:resolve(sourceConfig), expectedPass, exitCode:result.status, stats:report.stats,
      errors:report.errors, suites:report.suites, command:args, noBrowserFixture:true,noWebServer:true };
  } finally {rmSync(temporary,{recursive:true,force:true});}
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 const [sourceConfig, mode, output] = process.argv.slice(2);
 assert(['pass','fail'].includes(mode));
 const result=exerciseWorker(sourceConfig,mode==='pass');
 if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(`${basename(sourceConfig)}: expected ${mode}, ${result.stats.expected} fixture passes; no browser or server used.`);
}
