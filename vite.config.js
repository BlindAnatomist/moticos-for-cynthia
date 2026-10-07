import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // This separate private candidate adds matching-only visual revisions. The
  // lower build modes and legacy recipe-study keep their original artwork.
  // Selecting the build flag grants no permission to publish or execute CI.
  resolve: process.env.VITE_COLLAGE_EXPANSION_200 === '1' ? { alias: [
    { find: './registry.js', replacement: fileURLToPath(new URL('./src/matching/expansion200/registry.js', import.meta.url)) },
    { find: './boardArt.js', replacement: fileURLToPath(new URL('./src/matching/expansion200/boardArt.js', import.meta.url)) },
  ] } : process.env.VITE_COLLAGE_EXPANSION_160 === '1' ? { alias: [
    { find: './registry.js', replacement: fileURLToPath(new URL('./src/matching/cohesion/registry.js', import.meta.url)) },
    { find: './boardArt.js', replacement: fileURLToPath(new URL('./src/matching/cohesion/boardArt.js', import.meta.url)) },
  ] } : process.env.VITE_COLLAGE_EXPANSION === '1' ? { alias: [
    { find: './registry.js', replacement: fileURLToPath(new URL('./src/matching/expansion/registry.js', import.meta.url)) },
    { find: './boardArt.js', replacement: fileURLToPath(new URL('./src/matching/expansion/boardArt.js', import.meta.url)) },
  ] } : process.env.VITE_COLLAGE_BATCH === '1' ? { alias: [
    { find: './registry.js', replacement: fileURLToPath(new URL('./src/matching/batch/registry.js', import.meta.url)) },
    { find: './boardArt.js', replacement: fileURLToPath(new URL('./src/matching/batch/boardArt.js', import.meta.url)) },
  ] } : {},
});
