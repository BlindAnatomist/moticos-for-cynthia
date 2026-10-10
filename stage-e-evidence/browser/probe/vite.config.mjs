import {defineConfig} from 'vite';
import {isAbsolute,resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const outDir=process.env.MOTICOS_STAGE_E_PROBE_OUTPUT;
if(!outDir||!isAbsolute(outDir)||existsSync(outDir)||resolve(outDir).startsWith(process.cwd()+'/')||resolve(outDir)===process.cwd())throw Error('New external Stage E probe directory required');
export default defineConfig({base:'/stage-e-probe/',build:{outDir,emptyOutDir:false,rollupOptions:{input:{current:fileURLToPath(new URL('./current/index.html',import.meta.url))}}}});
