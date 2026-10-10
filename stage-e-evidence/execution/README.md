# Focused Stage E touch-drag execution

This is a separate verification surface, not a campaign acceptance rerun or art matrix. The two serial projects contain the same eight source declarations: Chromium (trusted CDP touch, native mouse and keyboard) and iPhone 13 WebKit (native tap/mouse/keyboard and explicitly synthetic touch-pointer handler checks). WebKit synthetic checks do not establish native continuous touch or physical-device behavior.

## Limits and isolation

- Only `verify/touch-drag-20261010` pushes in the existing public `BlindAnatomist/moticos-for-cynthia` repository select this workflow. Existing campaign workflows keep their original exact branches and do not select this branch.
- One GitHub-hosted `ubuntu-24.04` job, official `mcr.microsoft.com/playwright:v1.61.1-noble` container with init, Node 24, locked dependencies.
- Job 2160 seconds, profiles at most 900 seconds each, combined installation/preparation 180 seconds, cleanup 60 seconds, reserve 120 seconds. The clock comes from the exact current public Actions job and includes container provisioning; it fails closed on lookup or identity failure.
- Workers 1, retries 0, repeatEach 1, maxFailures 1. A failing/unclean Chromium profile prevents WebKit. No filter, shard, retry or alternative invocation is admitted.
- Five named success PNGs total (four Chromium, one WebKit), at most one explicit failure PNG globally, no videos or traces, 128 MiB total artifacts. Raw proof JSON, progress and full bounded action/assertion journals are retained. Over-cap evidence fails; originals are never trimmed into a pass.
- Existing included allowance and automatic zero-dollar spending stop are asserted by the approved owner reference. Nothing edits budgets, billing settings, the stop or paid overages. A spending-stop block must be reported, not bypassed.

## Local preparation and exact identity

All source edits and independent review must finish before sealing. `node --test stage-e-evidence/*.test.mjs stage-e-evidence/browser/*.test.mjs stage-e-evidence/execution/*.test.mjs` is nonbrowser verification.

For provisional local preparation, set `MOTICOS_STAGE_E_PROBE_OUTPUT` to a new absolute directory outside the repository, run `node stage-e-evidence/execution/binding.mjs prepare-source`, then `node stage-e-evidence/execution/prepare-run.mjs`. That runs only focused Stage E nonbrowser contracts, exact Playwright collection, the current application build and lean current-session probe build. It launches no browsers.

After source review, `node stage-e-evidence/execution/binding.mjs bind-source` creates the immutable `stage-e-source.json`. Rebuild preparation against that exact manifest using a fresh evidence directory and external probe directory; never mistake provisional hashes for accepted-source hashes. Derived source/build/probe JSON and results are separate from source inventory; source includes all Stage E harness, probe, baseline references, application and workflow bytes.

The exact reviewed commit must carry all four trailers:

- `Moticos-Touch-Drag-Reviewed-Source: <stage-e-source.json SHA-256>`
- `Moticos-Touch-Drag-Reviewed-Build: <rebuilt buildFingerprint>`
- `Moticos-Touch-Drag-Reviewed-Probe: <rebuilt probeFingerprint>`
- `Moticos-Touch-Drag-Run-Authorization: Sentinel_d05c533f7b60819181fcf058979ad214`

The commit must descend from accepted320 commit `c5c7714588d0eff5b2a9a3c16de1c9467aa6d508` with exact tree `3280796d6b95050ee8d7ca3508aded4aaac32c06`. Baseline final/native receipts and their hashes are frozen independently; no Stage D approval can authorize Stage E. Precheck verifies reviewed source and authorization before installation, then authorization compares both rebuilt hashes before browser launch.

The server binds every response to the exact core/probe inventory SHA-256 and byte count. A mutated response fails with HTTP 500; unbound paths fail with 404. Tests and reporters carry source/build/probe identity; runtime reporters, launchers and journals also carry exact commit ancestry.

## Outcome

A passing finalizer means the sixteen focused cases completed under the named scope with exactly five PNGs and confirmed cleanup. The five original images still need separate visual review. Neither this focused mixed-input pass nor the prior accepted320 baseline establishes a new full campaign/art acceptance or physical-device result. Publication remains separate.
