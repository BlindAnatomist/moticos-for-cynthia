import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { verifyBuild } from './verifyExpansion200PostcardBuild.mjs';
// This server never builds or rewrites the candidate. Each profile serves the
// byte-identical output restored from the sole preflight job.
await verifyBuild(JSON.parse(readFileSync('preflight-results/build-proof.json', 'utf8')));
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-expansion200', '--host', '127.0.0.1', '--port', '4197', '--strictPort'], { stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
