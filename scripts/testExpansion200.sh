#!/usr/bin/env bash
# Keep all accepted lower-mode suites and their exact historical scope intact.
set -euo pipefail
bash scripts/testCurrentCandidate.sh
node --loader ./tests/expansion200/alias-loader.mjs --test tests/expansion200/native.test.mjs
VITE_COLLAGE_EXPANSION_200=1 ./node_modules/.bin/vitest run tests/expansion200Alias.test.js
