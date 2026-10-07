#!/usr/bin/env bash
set -euo pipefail
mkdir -p campaign-results
node gate/binding.mjs source
./node_modules/.bin/playwright test --config=playwright.campaign.config.mjs --list --reporter=json > campaign-results/collection.json
node gate/results.mjs collection campaign-results/collection.json
node --test tests/campaign-contract/*.test.mjs
[[ ! -e dist-career && ! -e dist-probe ]] || { echo 'Existing build refused'; exit 1; }
./node_modules/.bin/vite build --config career.vite.config.js
./node_modules/.bin/vite build --config gate/vite.config.mjs
node gate/binding.mjs freeze
node gate/binding.mjs verify
