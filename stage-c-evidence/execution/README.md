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

Run process.execPath with those exact arguments, retain the argument list and full TAP output, and require zero failures/skips/cancellations before packaging. There are currently 82 tests across the complete selected files. Do not run prepare.mjs merely to repeat unchanged app/probe builds; their verified byte inventories may be reused and rebound independently.

## Fresh exact run binding

The final commit must descend from accepted 240 commit `8c12d874b27ce6108b1fb770037d99d3444bf0d0`, whose tree is pinned. Four unique final-commit trailers bind the actual reviewed candidate:

* `Moticos-280-Reviewed-Source: <source fingerprint>`
* `Moticos-280-Reviewed-Build: <core build fingerprint>`
* `Moticos-280-Reviewed-Probe: <probe fingerprint>`
* `Moticos-280-Run-Authorization: Sentinel_832f67454c148191a1de412f69b2d0bf`

Only the parent coordinator may publish the authorized commit. A push to the exact 280 verification branch is the sole trigger; rerun attempts and other targets are rejected. The runner checks final HEAD, accepted ancestor/tree, source inventory, installed dependency versions, collection, core/probe bytes, approval identity and complete remaining budget. It never changes payment budgets or enables overages. An allowance stop is a blocker, not grounds to restart.

The job ceiling remains 2,160 seconds, measured from the actual GitHub job start including image provisioning. Setup is allowed at most 600 seconds. Each unchanged ten-case profile retains its 870-second maximum and is additionally clipped to the shared remaining time after 60 seconds cleanup and 120 seconds reserve. These are overlapping phase maxima, not extra time; a truncated profile is incomplete and cannot pass. Browser processes run in isolated POSIX process groups with deadline/artifact watchdogs, one worker, zero retries and global stop on first failure. The second profile requires a fully validated first-profile pass. Skipped, interrupted, flaky, retried, unbound or absent evidence cannot pass.

Exactly 60 named screenshots and 22 real 1536×1120 postcard exports are required for success. Byte identity, full PNG decode/CRC validation, suggested filenames and renderer/cache parity are checked. At most one extra failure screenshot is preserved; videos and native Playwright traces are disabled. An append-only action/assertion journal, capped at 16 MiB per profile within the same aggregate cap, retains public reporter step metadata, timing, hierarchy and bounded error details for every profile, alongside unchanged case proofs, failure-state JSON and exact image outputs. It does not record DOM/network snapshots or API arguments/results; native Trace Viewer replay is therefore unavailable. Journal exhaustion, write failure or incomplete coverage cannot pass. The total artifact cap is 128 MiB. Finalization always attempts bounded diagnostics and preserves safe raw bytes; over-cap output is explicitly incomplete. A native pass still requires separate actual visual inspection of all 22 exported compositions before any publication decision.

## Diagnosed setup correction after run 37953367915

The first run never reached a browser: downloading OS packages from the official Ubuntu Azure mirror exhausted the old four-minute setup reservation. The workflow now uses the official version-matched `mcr.microsoft.com/playwright:v1.61.1-noble` image with browsers and OS dependencies already supplied. No custom mirrors, paid services, dependency upgrades, extra privileges or browser assertion changes are introduced. Pinned `npm ci`, image/browser preflight, collection and builds remain inside one bounded setup. The public exact-job API supplies its actual start time; lookup failure is diagnostic failure, never a fresh clock. Setup logs and the precise timed-out phase are retained before build validation.

Official references: https://playwright.dev/docs/ci#via-containers ; https://github.com/microsoft/playwright/blob/v1.61.1/utils/docker/Dockerfile.noble ; https://mcr.microsoft.com/v2/playwright/tags/list ; https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt


## Bounded diagnostics after run 37958761330

The prior trace configuration already omitted screenshots, snapshots, sources and attachments. The active C10 trace still grew to 113,565,489 bytes because Playwright 1.61.1 records serialized API arguments/results independently of those switches. Successful-case cleanup worked, but cannot solve one active case exceeding the artifact budget. Native tracing is now off through the supported configuration, with public reporter onStepBegin/onStepEnd callbacks supplying a bounded diagnostic journal instead. No active trace is deleted or rewritten. All game tests and assertions, fifty screenshots, twenty-two downloaded postcards, audit records, final proofs and explicit failure-state capture are unchanged. Existing 128 MiB aggregate and 36-minute watchdogs remain authoritative.

Official reporter APIs: https://playwright.dev/docs/api/class-reporter#reporter-on-step-begin ; https://playwright.dev/docs/api/class-reporter#reporter-on-step-end ; https://playwright.dev/docs/api/class-teststep . Pinned installed Playwright source establishes that trace snapshots:false does not suppress metadata.params/result; no supported Test TraceOptions flag does.

Each full proof.json remains unchanged in its native case directory and is verified by artifact acceptance. Its Playwright attachment is a small file/size/SHA256 reference rather than a second full JSON copy. This avoids roughly 29 MB of duplicate proof production across the twenty instances, especially C10’s sixteen complete retained states; no proof field is omitted.

If the aggregate cap or image-name guard triggers the existing diagnostic-only fallback, both bounded journals and the sole explicit failure-state/PNG are prioritized for upload without truncating or deleting originals. Priority copies are capped at 48.25 MiB; the existing generic diagnostic allowance remains 8 MiB, safely inside the unchanged 128 MiB aggregate ceiling. Such output always remains incomplete or failed.


## Measured C03 full-route deadline calibration after run 37962710312

Chromium completed all ten cases. WebKit C03 continuously progressed through fifteen of nineteen letters and three of four full gates. It drew two Knight tiles at 89.157–89.642 seconds, selected one at 89.716–89.823 seconds, and began the merge-target tap at 89.825 seconds, only 175 ms before its former 90-second case deadline. The longest preceding API/assertion step was 1.169 seconds. The retained screenshot/save show two ready Knight tiles with no blocking overlay; no 7.5-second action timeout occurred. Shared-chapter timing projects about 104–114 seconds using the shared-prefix and slowest completed chapter ratios for the full reversed route.

C03 alone now has a 150-second case ceiling, allowing roughly 32–44 percent margin above that observed-rate projection. Its actions, assertions, route order and image evidence are unchanged. Both profiles retain the same 870-second global maximum, and the shared 2,160-second job deadline still reserves cleanup time. Individual case maxima now sum to 930 seconds; these overlap with and do not extend the stricter profile/job watchdogs. All other case ceilings and the 7.5-second action/assertion and 15-second navigation limits remain unchanged, so stalled locator gestures/assertions retain their original short deadlines. Evaluations remain bounded by the case, profile and job ceilings.

The prior failed run also took 21.983 seconds in browser-worker cleanup and reported unconfirmed surviving-child cleanup. Those are post-timeout diagnostics, excluded from the gameplay projection; they remain failures and are not converted to acceptance by this calibration. Fresh complete preflight, collection and native verification are required.


## Text presentation correction

The 20 native cases and all case/profile/job deadlines are retained. C08 now requires the bundled serif face to be loaded before every export. C09 verifies intact words at 14px or greater, measures all 280 catalog labels, checks local board scrolling, and exercises keyboard and touch/click reveal without saved-state writes or page overflow. Five additional right-edge screenshots are required per profile: C09-320x568-large-right.png, C09-390x664-large-right.png, C09-390x844-large-right.png, C09-430x932-large-right.png, and C09-ending-320x568-large-right.png. Acceptance now requires 60 screenshots plus 22 postcard PNGs (82 total; at most one extra failure PNG). The 128 MiB artifact cap, zero retries, first-failure stop, and spending protections are unchanged.

All 60 screenshots and 22 downloaded postcard compositions require actual visual review before publication. The larger-text board deliberately permits contained horizontal scrolling so full labels, five logical columns, and comfortable tile sizes coexist. Standard-mode layout must remain unchanged; no clipped names, smaller accessibility fonts, renamed art, or engine-specific branches are permitted.


## Exact capture geometry after run 37971538569

WebKit C09 reached the first 320×568 larger-text capture after all preceding text, scroll and focus assertions passed. The helper measured root scrollHeight at 1008 CSS pixels; the original PNG and independently retained post-capture document height were 1021 CSS pixels (3063 device pixels at DPR 3). The former helper observed only root scrollHeight before the screenshot. Pinned Playwright 1.61.1 synchronizes WebKit screenshot style/layout and measures the maximum body/root scroll, offset and client extents. The failed run did not retain each pre-capture body/root metric, so the exact 13-pixel contributor is not established. This is a diagnosed capture-contract mismatch, not a claimed native pass.

Before each single routine screenshot, the helper now awaits fonts, flushes a temporary no-op stylesheet and layout on both engines, then awaits font readiness and two animation frames. Independent full-document metrics are measured immediately before and after capture. Every metric, viewport value and font-ready state must match exactly; genuine capture-time changes fail. Expected PNG dimensions derive from those DOM metrics, never the image header. Full-document width must equal viewport width, preserving the no-page-overflow requirement. No tolerance, capture retry, engine detection, extra screenshot, changed case or larger budget is introduced.

Each original screenshot has a small `.geometry.json` sidecar retaining both measurements even when dimension validation fails. Successful proof records include the same observations, and artifact acceptance checks sidecar identity, stability, exact DOM-derived PNG dimensions and full PNG decoding. Eight nonbrowser regressions cover all body/root extent contributors, settling order, one-shot capture, immutable evidence, the observed 13-pixel change failing, wrong PNG dimensions, horizontal overflow and invalid/unready geometry. Production and bundled font bytes are unchanged. Fresh full native and actual visual acceptance remain required.


## Observable scroll endpoint synchronization after run 37975666850

The same-source full execution completed WebKit C03 and passed the repaired capture contract at 320×568 and 390×664 larger-text left/right positions. C09 then failed at 390×844: a left tap succeeded, the test waited one animation frame, and its immediate isEnabled() snapshot still permitted a second tap. By the time native tap actionability was checked, the control correctly exposed aria-disabled=true at the left endpoint. That extra action timed out. The original failed evidence is retained; no production defect or completed acceptance is inferred from this partial run.

Arrow checks now wait for two identical geometry observations with matching left/right accessible edge states. Every native activation must move in the requested direction, keep board dimensions fixed, and settle before the next decision. A move that clamps to an edge must reach exactly zero or scrollWidth−clientWidth. Intermediate coordinates retain the browser's exact observed precision instead of introducing rounding rules or tolerances. At an already-observed endpoint, only the disabled state is checked; no extra native activation is requested. The five-activation ceiling, touch/click controls, keyboard Enter/Space behavior, endpoint focus, disabled no-op, row/column labels, no-save-write checks and all other assertions remain. There are no forced actions, sleeps, automatic run retries, production edits, or larger deadlines.

Six synthetic regressions cover delayed accessible-state updates, already-reached endpoints, fractional intermediate observations, strict rejection of unsettled/incorrect states, unchanged bounds, and valid subpixel near-edge ARIA that does not satisfy an exact commanded endpoint. Fresh complete native and actual visual verification are still required.

The app deliberately disables edge controls at offset ≤1 or ≥maximum−1. Settling mirrors that existing accessibility rule; it does not reinterpret it as proof of an exact destination. After the independently checked keyboard-reveal sequence, arrow tests explicitly establish scrollLeft=0 as their view precondition. All tested viewports have more than one pixel of overflow. Every route starts from a known exact end; native 70%-width steps eventually clamp to exactly zero or maximum, which is asserted independently of ARIA. A legitimate near-edge disabled starting state would fail with a clear no-extra-activation diagnostic rather than wait for an impossible ARIA transition or silently pass as an exact end. No numeric tolerance was added to destination checks.
