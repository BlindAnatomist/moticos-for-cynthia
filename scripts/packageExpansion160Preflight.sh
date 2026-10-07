#!/usr/bin/env bash
# Run after the preflight step terminates, even on failure. Never uploads.
set -euo pipefail
mkdir -p preflight-results
for name in dependency-install.log ci-preflight.log; do
  if [[ -f "$name" ]]; then cp "$name" "preflight-results/$name"; fi
done
args=()
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then args+=(--github-output "$GITHUB_OUTPUT"); fi
PYTHONDONTWRITEBYTECODE=1 python3 scripts/expansion160Evidence.py pack --source . --kind preflight --output bounded-evidence/preflight "${args[@]}"
PYTHONDONTWRITEBYTECODE=1 python3 scripts/expansion160Evidence.py restore --parts bounded-evidence/preflight/parts --output bounded-evidence/restored-preflight
node scripts/verifyExpansion160Roundtrip.mjs preflight-results bounded-evidence/restored-preflight/preflight-results bounded-evidence/roundtrip-proof.json
