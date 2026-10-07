#!/usr/bin/env bash
set -euo pipefail
mkdir -p career-results
node scripts/verifyCareerBuild.mjs source
node --test tests/career/state-contract.test.mjs tests/career/gate-contract.test.mjs
./node_modules/.bin/playwright test --config=playwright.career.config.js --list --reporter=json > career-results/collection.json
node scripts/verifyCareerScope.mjs collection career-results/collection.json
[[ ! -e dist-career ]] || { echo 'Existing build refused; one fresh build only' >&2; exit 1; }
./node_modules/.bin/vite build --config career.vite.config.js
node scripts/verifyCareerBuild.mjs freeze
node scripts/verifyCareerBuild.mjs verify
