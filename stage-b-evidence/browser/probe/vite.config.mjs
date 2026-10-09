import {defineConfig} from 'vite';
import {isAbsolute,resolve,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const outDir=process.env.MOTICOS_STAGE_B_PROBE_OUTPUT;
if(!outDir||!isAbsolute(outDir))throw Error('A separate absolute external Stage B probe output directory is required');
if(resolve(outDir)===process.cwd()||resolve(outDir).startsWith(process.cwd()+sep)||existsSync(outDir))throw Error('Use a new external probe directory; never replace an existing output');
export default defineConfig({base:'/stage-b-probe/',build:{outDir,emptyOutDir:false,rollupOptions:{input:fileURLToPath(new URL('./index.html',import.meta.url))}}});
