import {defineConfig} from 'vite';import {fileURLToPath} from 'node:url';
export default defineConfig({base:'/full-probe/',publicDir:false,build:{outDir:'dist-full-probe',rollupOptions:{input:fileURLToPath(new URL('../full-campaign-probe/index.html',import.meta.url))}}});
