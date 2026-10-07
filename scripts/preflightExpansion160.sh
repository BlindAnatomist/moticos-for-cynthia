#!/usr/bin/env bash
# Each current-source variant is built once. This script requires an approved hosted run.
set -euo pipefail
unset VITE_COLLAGE_BATCH VITE_COLLAGE_EXPANSION VITE_COLLAGE_EXPANSION_160
node --input-type=module -e "import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {runIdentity} from './scripts/currentCandidate.mjs';const identity=runIdentity();assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),identity.runCommit);assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'')"
for path in dist dist-batch dist-expansion dist-expansion160 preflight-results expansion160-test-results bounded-evidence; do
  if [[ -e "$path" || -L "$path" ]]; then echo "Refusing stale output: $path" >&2; exit 1; fi
done
mkdir preflight-results
node scripts/verifyExpansion160Dependencies.mjs preflight-results/dependencies-proof.json > preflight-results/dependencies.log
bash scripts/testCurrentCandidate.sh 2>&1 | tee preflight-results/current-unit.log
./node_modules/.bin/vite build --outDir dist 2>&1 | tee preflight-results/build-normal.log
VITE_COLLAGE_BATCH=1 ./node_modules/.bin/vite build --outDir dist-batch 2>&1 | tee preflight-results/build-batch.log
VITE_COLLAGE_EXPANSION=1 ./node_modules/.bin/vite build --outDir dist-expansion 2>&1 | tee preflight-results/build-expansion.log
VITE_COLLAGE_EXPANSION_160=1 ./node_modules/.bin/vite build --outDir dist-expansion160 2>&1 | tee preflight-results/build.log
node scripts/stampExpansion160.mjs
./node_modules/.bin/playwright test --config=playwright.expansion160.config.js --list --reporter=json > preflight-results/collected-all.json
node scripts/verifyExpansion160Coverage.mjs collected all preflight-results/collected-all.json
for profile in webkit-iphone-13 webkit-iphone-large chromium-desktop; do
  ./node_modules/.bin/playwright test --config=playwright.expansion160.config.js --list --reporter=json --project="$profile" > "preflight-results/collected-${profile}.json"
  node scripts/verifyExpansion160Coverage.mjs collected "$profile" "preflight-results/collected-${profile}.json"
done
node scripts/verifyExpansion160Build.mjs freeze preflight-results/build-proof.json
node scripts/verifyExpansion160Build.mjs verify preflight-results/build-proof.json
cp dist-expansion160/expansion160-manifest.json preflight-results/expansion160-manifest.json
mkdir preflight-results/build preflight-results/source
for variant in dist dist-batch dist-expansion dist-expansion160; do cp -a "$variant" "preflight-results/build/$variant"; done
# Only this checked-out tree is returned. No repository history or external path.
node scripts/snapshotCurrentSource.mjs
