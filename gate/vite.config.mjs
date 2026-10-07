import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
// Isolated probe build. Production career remains built with its original config.
export default defineConfig({base:'/probe/',publicDir:false,build:{outDir:'dist-probe',rollupOptions:{input:fileURLToPath(new URL('../probe/index.html',import.meta.url))}}});
