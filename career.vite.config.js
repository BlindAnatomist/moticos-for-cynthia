import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({ plugins: [react()], build: { outDir: 'dist-career', rollupOptions: { input: fileURLToPath(new URL('./career.html', import.meta.url)) } } });
