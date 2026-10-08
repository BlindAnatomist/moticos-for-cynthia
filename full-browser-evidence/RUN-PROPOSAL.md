# Proposed isolated full-campaign verification run

**PROPOSED, NOT USER-APPROVED.** Destination: `BlindAnatomist/moticos-for-cynthia`. Distinct proposed ref: `refs/heads/verify/full-campaign-20261008-r5`. No remote ref has been created, no push made, and no workflow run or dependency installation is authorized by this preparation.

The old `verify/campaign-20261007` ref, its push workflow and earlier evidence remain intact. A new push-only workflow is prepared for the distinct ref; publishing there would trigger it and therefore requires fresh approval for both the push and the one bounded run. Main and existing previews remain untouched. A new workflow_dispatch-only workflow would depend on default-branch availability, so this proposal does not introduce that prerequisite. See [GitHub's event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch).

## Authorization and exact identities

The prepared review commit is explicitly **NOT-RUN-AUTHORIZED**. Before any installation, the wrapper checks exact repository, distinct ref, push event, first attempt and Git HEAD equal to GITHUB_SHA. It then requires three unique commit-message trailers and verifies that the source trailer equals the actual verified checkout seal before dependency setup:

- `Moticos-Reviewed-Source`: exact reviewed source-seal SHA-256.
- `Moticos-Reviewed-Build`: exact independently generated pinned build-manifest SHA-256.
- `Moticos-Run-Authorization`: an actual fresh user-authorization reference. Pending/proposed/not-authorized values are rejected.

No real authorization trailer is supplied in this candidate. Recording these trailers is a future post-approval metadata step. It changes the commit identity, not the sealed source files; the coordinator must report and verify that final commit before any authorized push. The trailer is an audit record, not a substitute for the user's actual permission. Run attempt 2 and automatic retries are forbidden. The new ref is not a standing authorization for further pushes/runs.

Build/source fingerprints are rechecked after preflight and before browser launch. The local Mac lacks the pinned dependencies and cannot supply a new build identity without prohibited installation. The coordinator's already available pinned environment must build this exact new source and return its manifest/hash. Do not reuse the r4 build fingerprint or invent one. A pending build or authorization is a hard stop before installation/browser execution.

## Exact sequence and proposed ceilings

1. Start the job clock before checkout. Checkout exact GITHUB_SHA, with credentials not persisted; use Node 24.
2. `node full-campaign-gate/setup.mjs`: verify run provenance, then bounded `npm ci --no-audit --no-fund` and `node node_modules/@playwright/test/cli.js install --with-deps chromium webkit`. These commands are written for a future approved runner, not executed locally.
3. `node full-campaign-gate/preflight.mjs`: source/version checks; exact `node node_modules/@playwright/test/cli.js test --config=playwright.full-campaign.config.mjs --list --reporter=json`; only sealed guard tests; full campaign/recovery Node suites once; `node node_modules/vite/bin/vite.js build --config career.vite.config.js`; `node node_modules/vite/bin/vite.js build --config full-campaign-gate/vite.config.mjs`; freeze both builds.
4. `node full-campaign-gate/authorize.mjs` requires the newly built fingerprint to equal the independently reviewed trailer value.
5. `node full-campaign-gate/run-group.mjs full-chromium`, then `... full-webkit-phone`, each once. Default workflow success conditions and the launcher both stop the second group after first-group failure. One worker, zero retries, maxFailures 1.
6. Always run `node full-campaign-gate/finalize.mjs`: at most 30 seconds for acceptance packaging, then 10 seconds for failure-safe staging, with bounded termination cleanup. Upload the resulting originals/diagnostics even when acceptance failed. Upload has one minute. A final check fails the job unless the staged manifest says passed.

| Proposed allocation | Seconds |
|---|---:|
| Aggregate setup, including checkout and Node setup | 300 |
| Preflight ceiling (r5 independent measurement: 141.1 seconds; r6 unmeasured) | 300 |
| Chromium | 600 |
| WebKit phone | 420 |
| Termination allowance, two groups | 30 |
| Finalization and evidence upload reserve | 120 |
| Unallocated scheduling margin | 30 |
| Overall hard job ceiling | 1800 |

Both remaining browser groups, their termination allowances and the final reserve must fit before Chromium begins. The first group is rejected after elapsed second 630; WebKit is rejected after second 1245. Setup/command ceilings can fail earlier. Case timeout sums are not a promise of fit. There are no retries, time extensions or partial acceptance. The r6 preflight/browser timing is not measured.

## Evidence limits and failure handling

18 exact cases; 23 named screenshot originals; two original postcards; at most one failure PNG and one failure trace; no video; one worker; zero retries; 60 MiB maximum staged artifact; one-day retention. Missing original, record, event, source/build binding or terminal outcome fails acceptance.

Failure staging never modifies PNG bytes or creates substitute originals. If raw output exceeds a cap, it uploads bounded diagnostics and as many unchanged originals as fit, explicitly records every omission and remains failed/incomplete. It never deletes the raw local files or reports truncated evidence as passed. Repository checkout/setup failures also produce explicit failure diagnostics where the runner can execute the finalization step. A hard runner/job termination may prevent upload; no workflow can guarantee an upload after its machine is lost.

## Clean projection

`node full-campaign-gate/projection.mjs <new-directory>` copies only sealed paths plus the seal and rejects extras. It excludes private input bundles, original proposal bundles, Library identities, checkpoint archives and development logs. Tests consume a minimal independent oracle containing only reviewed assertions, derived from the verified proposals; the oracle is not regenerated from runtime content. It also includes the sealed deterministic recovery fixture. New journey output goes to results and cannot race with recovery input.

Runtime/art are unchanged. Actual DOM grid geometry now calls gridViolations, and every compact board image must retain at least 28px of measured ink. Negative guards reject unequal/undersized/misaligned boards, undersized ink, missing art bounds, wrong provenance, missing authorization, insufficient budgets and oversized/duplicate failure evidence. Physical VoiceOver, heard sound quality and human enjoyment remain outside automated claims.

## Revision 6 timeout repair

A timed-out leader closing on SIGTERM no longer cancels process-group cleanup. The wrapper retains the five-second escalation timer until the group is confirmed gone, sends SIGKILL to the original test-owned group if needed, and waits up to one further second for cleanup confirmation. An unconfirmed termination is an explicit error, never success. This fits inside the existing 15-second per-group termination allowance; no budget is increased. The regression uses a leader that exits on SIGTERM and a descendant that ignores it, and verifies the descendant is no longer running before completion.

The independently reviewed r5 build fingerprint is historical evidence only and cannot authorize this changed source. Revision 6 requires a new pinned build fingerprint and fresh authorization.
