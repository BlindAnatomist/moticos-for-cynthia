#!/usr/bin/env bash
set -euo pipefail
profile="${1:?one exact career group required}"
case "$profile" in career-chromium|career-webkit-phone) ;; *) echo 'Unknown career group' >&2; exit 1;; esac
[[ "${MOTICOS_CAREER_BROWSER_APPROVED:-}" == 1 ]] || { echo 'Approval operator flag missing; no browser started' >&2; exit 1; }
[[ "${MOTICOS_JOB_EPOCH:-}" =~ ^[0-9]+$ ]] || { echo 'Job clock missing; no browser started' >&2; exit 1; }
export MOTICOS_CAREER_PROFILE="$profile"
elapsed=$(( $(date +%s) - MOTICOS_JOB_EPOCH ))
node --input-type=module - "$profile" "$elapsed" <<'JS'
import {eligibleBudget} from './scripts/careerGateScope.mjs';
console.log('Browser budget ms:',eligibleBudget(process.argv[2],Number(process.argv[3])));
JS
node scripts/verifyCareerBuild.mjs verify
./node_modules/.bin/playwright test --config=playwright.career.config.js --project="$profile"
node scripts/verifyCareerBuild.mjs verify
node scripts/verifyCareerScope.mjs completed "$profile"
