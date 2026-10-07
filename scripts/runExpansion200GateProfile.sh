#!/usr/bin/env bash
# Invocation helper only: a user-approved future job must supply approval and a
# job-start epoch. Writing/reading this file does not authorize or start the run.
set -euo pipefail
[[ ! -e preflight-results/build && ! -L preflight-results/build ]] || { echo 'Build duplication in browser evidence; use prepareExpansion200GateProfile.sh. No browser started.' >&2; exit 1; }
profile="${1:?Specify one exact profile}"
case "$profile" in webkit-iphone-13|webkit-iphone-large|chromium-desktop) ;; *) echo 'Unknown profile' >&2; exit 1;; esac
[[ "${MOTICOS_200_BROWSER_APPROVED:-}" == '1' ]] || { echo 'Approved operator flag missing; no browser started.' >&2; exit 1; }
[[ "${MOTICOS_JOB_EPOCH:-}" =~ ^[0-9]+$ ]] || { echo 'Job clock missing; no browser started.' >&2; exit 1; }
elapsed=$(( $(date +%s) - MOTICOS_JOB_EPOCH ))
[[ "$elapsed" -ge 0 ]] || { echo 'Job clock is in the future.' >&2; exit 1; }
# 26-minute job, four-minute independent evidence reserve, 15-second margin.
remaining=$((1560 - elapsed - 240 - 15))
[[ "$remaining" -ge 900 ]] || { echo 'Fewer than fifteen browser minutes remain; gate incomplete, no browser started.' >&2; exit 1; }
[[ "$remaining" -le 960 ]] || remaining=960
export MOTICOS_200_BROWSER_BUDGET_MS=$((remaining*1000))
printf '{"profile":"%s","browserBudgetMs":%s,"evidenceReserveSeconds":240,"elapsedBeforeBrowserSeconds":%s}\n' "$profile" "$MOTICOS_200_BROWSER_BUDGET_MS" "$elapsed" > preflight-results/browser-budget.json
node scripts/verifyExpansion200GateBuild.mjs verify preflight-results/build-proof.json
./node_modules/.bin/playwright test --config=playwright.expansion200.config.js --project="$profile" 2>&1 | tee preflight-results/browser.log
node scripts/verifyExpansion200GateCoverage.mjs completed "$profile" expansion200-test-results/results.json expansion200-test-results/progress/browser-events.jsonl preflight-results/completed-proof.json
node scripts/verifyExpansion200GateBuild.mjs verify preflight-results/build-proof.json
