#!/usr/bin/env bash
set -euo pipefail
profile="${1:?one exact group required}"
case "$profile" in campaign-chromium|campaign-webkit-phone) ;; *) exit 1;; esac
[[ "${MOTICOS_CAMPAIGN_BROWSER_APPROVED:-}" == 1 ]] || { echo 'Separate authorization missing; no browser started'; exit 1; }
[[ "${MOTICOS_JOB_EPOCH:-}" =~ ^[0-9]+$ ]] || exit 1
export MOTICOS_CAMPAIGN_PROFILE="$profile"
node --input-type=module - "$profile" "$(( $(date +%s) - MOTICOS_JOB_EPOCH ))" <<'JS'
import {eligibleBudget} from './gate/scope.mjs';
eligibleBudget(process.argv[2],Number(process.argv[3]));
JS
node gate/binding.mjs verify
[[ ! -e "campaign-results/$profile/execution-started.json" ]] || { echo 'Group already attempted; no rerun'; exit 1; }
mkdir -p "campaign-results/$profile"
printf '{"profile":"%s","attempt":1,"startedEpoch":%s}\n' "$profile" "$(date +%s)" > "campaign-results/$profile/execution-started.json"
./node_modules/.bin/playwright test --config=playwright.campaign.config.mjs --project="$profile"
node gate/binding.mjs verify
node gate/results.mjs completed "$profile"
