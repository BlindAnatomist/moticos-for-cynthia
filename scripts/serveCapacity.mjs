import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { verifyCapacityBuild } from './verifyCapacityBuild.mjs';
verifyCapacityBuild(JSON.parse(readFileSync('preflight-results/capacity-build-proof.json', 'utf8')), '.', process.env.GITHUB_SHA);
// Only separately approved hosted Actions may start this prepared browser gate.
// Nothing here builds, rewrites, publishes, or alters a saved collection.
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-batch', '--host', '127.0.0.1', '--port', '4185', '--strictPort'], { stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
