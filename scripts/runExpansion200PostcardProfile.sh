#!/usr/bin/env bash
# Invocation helper only: a user-approved future job must supply approval and a
# job-start epoch. Writing/reading this file does not authorize or start the run.
set -euo pipefail
[[ ! -e preflight-results/build && ! -L preflight-results/build ]] || { echo 'Build duplication in browser evidence; use prepareExpansion200PostcardProfile.sh. No browser started.' >&2; exit 1; }
profile="${1:?Specify one exact profile}"
case "$profile" in webkit-iphone-13|webkit-iphone-large|chromium-desktop) ;; *) echo 'Unknown profile' >&2; exit 1;; esac
[[ "${MOTICOS_200_POSTCARDS_BROWSER_APPROVED:-}" == '1' ]] || { echo 'Approved operator flag missing; no browser started.' >&2; exit 1; }
[[ "${MOTICOS_JOB_EPOCH:-}" =~ ^[0-9]+$ ]] || { echo 'Job clock missing; no browser started.' >&2; exit 1; }
elapsed=$(( $(date +%s) - MOTICOS_JOB_EPOCH ))
[[ "$elapsed" -ge 0 ]] || { echo 'Job clock is in the future.' >&2; exit 1; }
# 14-minute job, three-minute independent evidence reserve, 15-second margin.
remaining=$((840 - elapsed - 180 - 15))
[[ "$remaining" -ge 360 ]] || { echo 'Fewer than six browser minutes remain; gate incomplete, no browser started.' >&2; exit 1; }
[[ "$remaining" -le 480 ]] || remaining=480
export MOTICOS_200_POSTCARDS_BROWSER_BUDGET_MS=$((remaining*1000))
printf '{"profile":"%s","browserBudgetMs":%s,"evidenceReserveSeconds":180,"elapsedBeforeBrowserSeconds":%s}\n' "$profile" "$MOTICOS_200_POSTCARDS_BROWSER_BUDGET_MS" "$elapsed" > preflight-results/browser-budget.json
node scripts/verifyExpansion200PostcardBuild.mjs verify preflight-results/build-proof.json
./node_modules/.bin/playwright test --config=playwright.expansion200-postcards.config.js --project="$profile" 2>&1 | tee preflight-results/browser.log
node scripts/verifyExpansion200PostcardCoverage.mjs completed "$profile" expansion200-test-results/results.json expansion200-test-results/progress/browser-events.jsonl preflight-results/completed-proof.json
node scripts/verifyExpansion200PostcardBuild.mjs verify preflight-results/build-proof.json
