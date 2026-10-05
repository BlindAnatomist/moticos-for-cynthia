import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // This flag selects an isolated local candidate. It is not authentication or
  // permission to publish. Normal builds never import the new art modules.
  resolve: process.env.VITE_COLLAGE_BATCH === '1' ? { alias: [
    { find: './registry.js', replacement: fileURLToPath(new URL('./src/matching/batch/registry.js', import.meta.url)) },
    { find: './boardArt.js', replacement: fileURLToPath(new URL('./src/matching/batch/boardArt.js', import.meta.url)) },
  ] } : {},
});
