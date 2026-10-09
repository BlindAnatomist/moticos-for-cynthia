import {defineConfig} from 'vite';import {isAbsolute,resolve} from 'node:path';import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';
const outDir=process.env.MOTICOS_STAGE_C_PROBE_OUTPUT;
if(!outDir||!isAbsolute(outDir)||existsSync(outDir)||resolve(outDir).startsWith(process.cwd()+'/')||resolve(outDir)===process.cwd())throw Error('Use a new absolute external Stage C probe output directory.');
export default defineConfig({base:'/stage-c-probe/',build:{outDir,emptyOutDir:false,rollupOptions:{input:{current:fileURLToPath(new URL('./current/index.html',import.meta.url)),v6:fileURLToPath(new URL('./v6/index.html',import.meta.url))}}}});
