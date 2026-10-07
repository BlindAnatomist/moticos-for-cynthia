#!/usr/bin/env bash
# Private local build only. No publication, dependency installation or CI.
set -euo pipefail
unset VITE_COLLAGE_BATCH VITE_COLLAGE_EXPANSION VITE_COLLAGE_EXPANSION_160 VITE_COLLAGE_EXPANSION_200
VITE_COLLAGE_EXPANSION_200=1 ./node_modules/.bin/vite build --outDir dist-expansion200
node scripts/stampExpansion200.mjs
