// Newly reconstructed from accepted280; requires independent320 review.
import {defineConfig} from 'vite';import {isAbsolute,resolve} from 'node:path';import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';
const outDir=process.env.MOTICOS_STAGE_D_PROBE_OUTPUT;
if(!outDir||!isAbsolute(outDir)||existsSync(outDir)||resolve(outDir).startsWith(process.cwd()+'/')||resolve(outDir)===process.cwd())throw Error('Use a new absolute external Stage D probe output directory.');
export default defineConfig({base:'/stage-d-probe/',build:{outDir,emptyOutDir:false,rollupOptions:{input:{current:fileURLToPath(new URL('./current/index.html',import.meta.url)),v7:fileURLToPath(new URL('./v7/index.html',import.meta.url))}}}});
