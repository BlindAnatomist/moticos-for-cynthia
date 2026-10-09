# Guarded Stage C execution

This isolated harness runs only C01–C10 in two serial profiles. It does not invoke the accepted 240/58-instance gate or its preflight. Production runtime and the accepted 240 workflow are unchanged.

## Private preparation, no browser

From the repository root, generate the reducer fixtures once with `node stage-c-evidence/browser/prepare-fixtures.mjs`, finish all source changes, then run `node stage-c-evidence/execution/binding.mjs seal`. The explicit source inventory works without local Git. It covers runtime, assets, fixtures, shared utility dependencies, tests, and workflows. Do not alter sealed inputs afterward.

Set `MOTICOS_STAGE_C_PROBE_OUTPUT` to a new absolute external directory, then run `node stage-c-evidence/execution/prepare.mjs` once in the pinned Node 24 / Playwright 1.61.1 environment. This performs only focused Stage C contracts, exact `--list` collection, the career build, and the dual current/v6 probe build. It never launches a browser. Outputs are `stage-c-source.json`, `stage-c-build.json`, and `stage-c-browser-results/`. The build fingerprint is SHA256 of compact JSON for the build proof with its own `buildFingerprint` field excluded; the probe fingerprint is SHA256 of the exact `probe-build.json` bytes.

## Complete local contract checkpoint before a correction transfer

Every harness correction must run the exact complete focused-contract command used by prepare.mjs, even when individual test files appear unchanged: static contracts can depend on changed reporters or configuration. This approximately three-second contract suite is separate from browser execution and application builds; selected subsets are supplemental, never a substitute.

After sealing source, derive the command from the same explicit manifest selection used by prepare.mjs:

```js
const focused = source.manifest.files
  .filter(r => /^stage-c-evidence\/(browser|execution)\/[^/]+\.test\.mjs$/.test(r.file))
  .map(r => r.file);
const args = ['--test', '--test-reporter=tap', ...focused];
```

Run process.execPath with those exact arguments, retain the argument list and full TAP output, and require zero failures/skips/cancellations before packaging. There are currently 60 tests across the complete selected files. Do not run prepare.mjs merely to repeat unchanged app/probe builds; their verified byte inventories may be reused and rebound independently.

## Fresh exact run binding

The final commit must descend from accepted 240 commit `8c12d874b27ce6108b1fb770037d99d3444bf0d0`, whose tree is pinned. Four unique final-commit trailers bind the actual reviewed candidate:

* `Moticos-280-Reviewed-Source: <source fingerprint>`
* `Moticos-280-Reviewed-Build: <core build fingerprint>`
* `Moticos-280-Reviewed-Probe: <probe fingerprint>`
* `Moticos-280-Run-Authorization: Sentinel_59577051eb888191ba3a1a1c86bca4f9`

Only the parent coordinator may publish the authorized commit. A push to the exact 280 verification branch is the sole trigger; rerun attempts and other targets are rejected. The runner checks final HEAD, accepted ancestor/tree, source inventory, installed dependency versions, collection, core/probe bytes, approval identity and complete remaining budget. It never changes payment budgets or enables overages. An allowance stop is a blocker, not grounds to restart.

The job ceiling remains 2,160 seconds, measured from the actual GitHub job start including image provisioning. Setup is allowed at most 600 seconds. Each unchanged ten-case profile retains its 870-second maximum and is additionally clipped to the shared remaining time after 60 seconds cleanup and 120 seconds reserve. These are overlapping phase maxima, not extra time; a truncated profile is incomplete and cannot pass. Browser processes run in isolated POSIX process groups with deadline/artifact watchdogs, one worker, zero retries and global stop on first failure. The second profile requires a fully validated first-profile pass. Skipped, interrupted, flaky, retried, unbound or absent evidence cannot pass.

Exactly 50 named screenshots and 22 real 1536×1120 postcard exports are required for success. Byte identity, full PNG decode/CRC validation, suggested filenames and renderer/cache parity are checked. At most one extra failure screenshot is preserved; videos and native Playwright traces are disabled. An append-only action/assertion journal, capped at 16 MiB per profile within the same aggregate cap, retains public reporter step metadata, timing, hierarchy and bounded error details for every profile, alongside unchanged case proofs, failure-state JSON and exact image outputs. It does not record DOM/network snapshots or API arguments/results; native Trace Viewer replay is therefore unavailable. Journal exhaustion, write failure or incomplete coverage cannot pass. The total artifact cap is 128 MiB. Finalization always attempts bounded diagnostics and preserves safe raw bytes; over-cap output is explicitly incomplete. A native pass still requires separate actual visual inspection of all 22 exported compositions before any publication decision.

## Diagnosed setup correction after run 37953367915

The first run never reached a browser: downloading OS packages from the official Ubuntu Azure mirror exhausted the old four-minute setup reservation. The workflow now uses the official version-matched `mcr.microsoft.com/playwright:v1.61.1-noble` image with browsers and OS dependencies already supplied. No custom mirrors, paid services, dependency upgrades, extra privileges or browser assertion changes are introduced. Pinned `npm ci`, image/browser preflight, collection and builds remain inside one bounded setup. The public exact-job API supplies its actual start time; lookup failure is diagnostic failure, never a fresh clock. Setup logs and the precise timed-out phase are retained before build validation.

Official references: https://playwright.dev/docs/ci#via-containers ; https://github.com/microsoft/playwright/blob/v1.61.1/utils/docker/Dockerfile.noble ; https://mcr.microsoft.com/v2/playwright/tags/list ; https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt


## Bounded diagnostics after run 37958761330

The prior trace configuration already omitted screenshots, snapshots, sources and attachments. The active C10 trace still grew to 113,565,489 bytes because Playwright 1.61.1 records serialized API arguments/results independently of those switches. Successful-case cleanup worked, but cannot solve one active case exceeding the artifact budget. Native tracing is now off through the supported configuration, with public reporter onStepBegin/onStepEnd callbacks supplying a bounded diagnostic journal instead. No active trace is deleted or rewritten. All game tests and assertions, fifty screenshots, twenty-two downloaded postcards, audit records, final proofs and explicit failure-state capture are unchanged. Existing 128 MiB aggregate and 36-minute watchdogs remain authoritative.

Official reporter APIs: https://playwright.dev/docs/api/class-reporter#reporter-on-step-begin ; https://playwright.dev/docs/api/class-reporter#reporter-on-step-end ; https://playwright.dev/docs/api/class-teststep . Pinned installed Playwright source establishes that trace snapshots:false does not suppress metadata.params/result; no supported Test TraceOptions flag does.

Each full proof.json remains unchanged in its native case directory and is verified by artifact acceptance. Its Playwright attachment is a small file/size/SHA256 reference rather than a second full JSON copy. This avoids roughly 29 MB of duplicate proof production across the twenty instances, especially C10’s sixteen complete retained states; no proof field is omitted.

If the aggregate cap or image-name guard triggers the existing diagnostic-only fallback, both bounded journals and the sole explicit failure-state/PNG are prioritized for upload without truncating or deleting originals. Priority copies are capped at 48.25 MiB; the existing generic diagnostic allowance remains 8 MiB, safely inside the unchanged 128 MiB aggregate ceiling. Such output always remains incomplete or failed.
