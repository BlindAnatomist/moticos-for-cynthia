#!/usr/bin/env bash
# Restore only the sole preflight build plus required identity metadata for one
# profile. No browser starts here. Inputs remain intact outside the evidence tree.
set -euo pipefail
parts="${1:?Supply the verified preflight parts directory}"
profile="${2:?Supply one exact browser profile}"
case "$profile" in webkit-iphone-13|webkit-iphone-large|chromium-desktop) ;; *) echo 'Unknown profile' >&2; exit 1;; esac
for path in .expansion160-input dist-expansion160 preflight-results expansion160-test-results; do
  [[ ! -e "$path" && ! -L "$path" ]] || { echo "Refusing existing profile output: $path" >&2; exit 1; }
done
unset VITE_COLLAGE_BATCH VITE_COLLAGE_EXPANSION VITE_COLLAGE_EXPANSION_160 VITE_COLLAGE_EXPANSION_200
PYTHONDONTWRITEBYTECODE=1 python3 scripts/expansion160Evidence.py restore --parts "$parts" --output .expansion160-input
mkdir preflight-results
cp -a .expansion160-input/preflight-results/build/dist-expansion160 dist-expansion160
for name in build-proof.json expansion160-manifest.json collected-all.json dependencies-proof.json; do
  cp ".expansion160-input/preflight-results/$name" "preflight-results/$name"
done
node scripts/verifyExpansion160Dependencies.mjs preflight-results/profile-dependencies-proof.json > preflight-results/profile-dependencies.log
node scripts/verifyExpansion160Build.mjs verify preflight-results/build-proof.json | tee preflight-results/build-identity.log
./node_modules/.bin/playwright test --config=playwright.expansion160.config.js --list --reporter=json --project="$profile" > preflight-results/collected-profile.json
node scripts/verifyExpansion160Coverage.mjs collected "$profile" preflight-results/collected-profile.json
# Deliberately no preflight-results/build copy: build bytes live in the sole
# preflight artifact and dist-expansion160. Neither is browser evidence input.
