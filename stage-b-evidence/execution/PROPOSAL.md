## Adaptive compact HUD correction status — 2026-10-09

Run 37883703846 passed 14 desktop cases and the first two phone cases, then M03 exposed a real 320×568 artwork-size regression: the universal two-row HUD measured 93px tall, leaving a 263px board. Four captured pieces fell below the unchanged 28px measured-ink requirement. The narrow CSS revision restores the normal single-row HUD, permits full progress labels to wrap only within their own column, and keeps natural header height when longer text needs it. The existing enlarged-text layout remains separate and scrollable. Full labels, 44px controls, artwork, scoring, test assertions, 58-case scope and limits are preserved.

The affected build and focused local contracts can be checked here; the supported cloud browser could not reach the local diagnostic HTTP server, so no post-fix browser render or native geometry pass is claimed. Prior starts are consumed. The owner subsequently explicitly approved uploading this revised phone-layout correction, updating this technical verification note, and starting one new 58-case GitHub run under the unchanged limits: one worker, zero automatic retries, a 108-minute hard job cap, a 124 MiB evidence cap, the standard public GitHub runner and unchanged spending protection. Bind this fresh approval to the final source/core/probe identities. No laptop work is authorized; any further start requires new approval. Earlier status records below are historical. Preview replacement remains conditional on native and visual acceptance and must preserve its existing audience.

---

## Mobile HUD correction status — 2026-10-09

Run 37881593682 passed all 22 historical browser cases and Stage B B14/B15, then B16 exposed a real normal-text HUD overflow at 320×844: the full final-volume completion title overlapped the coin display. The local CSS correction gives progress a full-width row, keeps wallet/actions on their own 44-pixel row, and auto-sizes the compact shell header. No text, accessible name, action, reward, artwork, test assertion, or run limit is removed or weakened. Static checks and a fresh affected build do not establish native visual acceptance. The earlier run approvals are consumed. The owner subsequently explicitly approved uploading this three-file HUD correction and starting one new 58-case run under the unchanged limits: one worker, zero automatic retries, a 108-minute hard job cap, a 124 MiB evidence cap, the standard public GitHub runner and unchanged spending protection. Bind this fresh approval to the final source/core/probe identities in the commit trailers. No laptop work is authorized. Earlier status records below are historical; any further start would require new approval.

---

## Runtime-path correction status — 2026-10-09

Corrected start 37879891982 passed setup, full preparation and authorization binding, then failed before browser cases began because Playwright resolved relative server/output paths from the nested config directory. The new local correction anchors server, reporter and raw-result paths to the repository root, retains strict source integrity, and preserves bounded failure diagnostics. Both previously approved starts are consumed. The owner subsequently explicitly approved uploading this path correction and starting one new 58-case GitHub run: one worker, zero automatic retries, a 108-minute hard job cap, a 124 MiB evidence cap, the standard public runner and unchanged spending protection. Bind this fresh approval to the final corrected source/core/probe identities in the commit trailers. No laptop work is authorized. Earlier status records below are historical; any further start would require new approval.

---

## Correction status — 2026-10-09

The first approved start, run 37879339607, failed before any runner job began. The local workflow correction moves runner-dependent paths from job-level expressions into the initial shell step. GitHub’s official schema excludes the runner context from job env. The exact server annotation was not retrieved. The earlier one-start approval is consumed. The owner subsequently explicitly approved uploading this correction and starting one new 58-case run with the same 108-minute limit, zero automatic retries and unchanged spending protection. The final corrected source/core/probe identities and this fresh approval must be bound in the commit trailers. The failed attempt must not be rerun, and any additional start would require new approval. The previous activation record below describes the first start only.

---

## Activation status — 2026-10-09

The owner explicitly approved transfer and one complete 58-case verification run with the proposed 108-minute hard stop, zero automatic retries, and unchanged spending protection. The active workflow is now `.github/workflows/verify-full-campaign-240.yml`; the proposal JSON remains as the reviewed template. Exact final source/core/probe identities and this one-run authority must be bound by the commit trailers before publication. Browser and visual acceptance are still pending. Conditional preview replacement is separate and may occur only after both pass. No laptop work, additional run, paid overage, budget change, or deployment is performed by activating this workflow.

The reviewed proposal below is retained as its preparation record. Its statements that approval is pending or the workflow is dormant describe that earlier checkpoint.

---

# Unapproved 240-piece verification proposal

No run is authorized by this source. The workflow JSON is deliberately outside `.github/workflows`. Existing 200-piece workflows, tests and limits are unchanged. The separate 36-case collection-only config remains execution-disabled. The new combined execution config fails closed without fresh 240-specific commit trailers, exact source/core/probe build identities, a new approval record, the proposed repository/ref, attempt 1 and a standard GitHub-hosted Linux runner. Earlier 200-piece authorization cannot satisfy it.

## Exact scope

One sequential job on `ubuntu-latest`: all 14 historical Chromium cases, all eight historical WebKit phone cases, then all 18 new cases on Chromium and all 18 on WebKit phone. Total 58, one worker, zero test retries, stop after the first failed profile. No case filtering or alternate CLI is accepted. The B1/B2 cases additionally inspect ending navigation separation, wrapping and keyboard focus; B2 verifies the repeated ending note is displayed once. Original artwork/content/rewards remain unchanged.

Parallel profiles could reduce elapsed time, but independent setup/builds, simultaneous failures and artifact merging would add runner consumption and coordination risk. This proposal uses serial execution and early stopping. It does not silently substitute a parallel or reduced scope.

## Measured work and predictions

The independent reviewer reports these measured results for the accepted 200-piece run: Chromium 147.586s, WebKit 110.952s, preflight 175.196s and approximately 8m12s for the job. They measure that earlier 22-case/source scope, not this 58-case candidate. They do not validate the 240-piece scheduling estimate or authorize its new caps.

Local Mac Node 24.21.0 fixture-only measurement: original sixteen-chapter cold route 18.74s; new completed240 route 4.95s; all240 discovery after completion 42.32s; cached all240 clone 0.0032s; occupied eight-family fixture 1.58s; paid-desk chapter24 fixture 4.25s. These are reducer CPU measurements, not browser/public-runner timings. The all240 cache is per worker: each new browser profile pays its cold cost. No Playwright1.57 execution was substituted for pinned1.61.1.

Planning expectation is approximately 20–45 minutes overall, with low confidence until native 240 evidence exists. This is a scheduling hypothesis: roughly 3–8 minutes setup/preflight, 4–10 minutes historical UI and 6–13 minutes per new profile, plus artifact finalization; it is not measured fit. The hard ceilings below, not the estimate, govern failure. If they prove unrealistic, stop and propose a reviewed change rather than skip or retry cases.

## Explicit proposed ceilings

| Component | Seconds |
|---|---:|
| Setup | 300 |
| Combined pinned preflight, Node suites, collection and three builds | 600 |
| Historical Chromium / WebKit | 600 / 420 |
| New Chromium / WebKit | 2,120 / 2,120 |
| Four process cleanup allowances | 60 |
| Finalization and upload reserve | 180 |
| Allocated total / hard job cap | 6,400 / 6,480 (108 minutes) |

The new profile deadlines retain the explicit B1–B18 limits from the reviewed QA draft. Historical global limits remain 600/420s. A complete-scope admission check reserves every remaining group and cleanup/finalization before each launch. Setup and preflight have independent timeouts; the job cap includes checkout and action overhead. This proposal requests one new run start; it does not consume or expand the earlier three-start 200-piece cycle. The 108-minute worst-case allocation is a new proposal requiring owner approval, not a claim that the prior budget already covers it.

## Evidence and size

Required originals: 23 historical screenshots + two historical postcards + 16 new layout screenshots + 16 new-family postcards = 57 PNGs. At most one extra failure screenshot and one failure trace; raw video disabled. New PNGs are retained once under the raw result directory with hashed JSON references rather than attached again through Playwright's file-copy mechanism. JSON attachments may be duplicated by Playwright and count toward bytes.

Proposed total cap 124 MiB: historical partition 60 MiB and new partition 64 MiB, including logs/manifests and reserves. These are explicit proposed caps, not measured output sizes. A 1536×1120 RGBA postcard has about 6.56 MiB of uncompressed pixels; PNG compression is content-dependent. Sixteen poorly compressing exports alone could exceed 64 MiB, so fit is unproven. On excess, acceptance fails, raw files remain untouched, and only a bounded diagnostic inventory is uploaded. No silent downscaling, deletion or substitute image evidence is allowed. One-day artifact retention; coordinator must preserve evidence promptly.

Acceptance requires exact collected and terminal case/event identities, one successful result per case with no retries/skips, bound source/core/probe identities, successful sealed Node/preflight records, all historical originals, a distinct native proof for every new case, all eight family exports and all eight layout screenshots per new profile, byte hashes/full PNG decoding, renderer parity, and total artifact limits. Failed or incomplete evidence never produces a passed package.

## Review and activation

Local checks can run `node --test stage-b-evidence/execution/contracts.test.mjs`; negative fixtures are synthetic validator tests, not native evidence. With existing pinned dependencies, `node stage-b-evidence/execution/prepare.mjs` performs collection/tests/three builds only; set `MOTICOS_STAGE_B_PROBE_OUTPUT` to a new external absolute directory. It validates all explicitly registered Stage B suites and refuses old output. The expected aggregate is 141 Node checks (99 historical, 17 runtime, 14 browser contracts, eleven harness/presentation/collection/workflow/process contracts), subject to independent fresh collection.

Confirm the repository remains public, standard GitHub-hosted runner eligibility and the owner’s zero-dollar spending stop before requesting publication; no billing setting is changed by this proposal.

Before any publication, independently review the final exact source, pinned collection and builds; review this proposal and obtain explicit owner authority; reconcile the dormant workflow into the intended destination and reseal/rebuild that final source; add truthful `Moticos-240-Reviewed-Source`, `Moticos-240-Reviewed-Build`, `Moticos-240-Reviewed-Probe` and `Moticos-240-Run-Authorization` trailers. Never fabricate those values or reuse old ones. Follow TRANSFER-PROCEDURE.md for technical transfer after normal authorization.

This candidate also fixes two reported desktop presentation defects: ending actions now have a wrapping flex layout with separate 44px targets; identical adjacent ending/completion copy is suppressed without changing underlying authored text or hiding distinct notes. Fresh native screenshots and visual review are still required. Wayfinder's contained Way/finder split remains a documented aesthetic caveat. Earlier 200-piece evidence remains unchanged and is not acceptance of this candidate.
