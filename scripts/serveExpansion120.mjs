import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { verifyBuild } from './verifyExpansion120Build.mjs';
// This server never builds or rewrites the candidate. Each profile serves the
// byte-identical output restored from the sole preflight job.
const commit = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
verifyBuild(JSON.parse(readFileSync('preflight-results/build-proof.json', 'utf8')), '.', commit);
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-expansion', '--host', '127.0.0.1', '--port', '4187', '--strictPort'], { stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
