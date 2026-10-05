# Focused large-iPhone recheck

Prepared privately. This document authorizes no browser execution, public write,
Actions run, upload, merge, or deployment. Those require a fresh bounded approval.

## Preserved result and remaining gate

Run 37378736660, commit eae031dc11e3adb5176ef72806a6e9d59acc4ea7, passed
18 desktop and 18 small-iPhone cases. Large iPhone passed 13, timed out in the
12-envelope collection case, and skipped the final four storage cases after that
failure. Its visual evidence was not fully retrievable, so the proposed recheck
runs all 18 large-profile cases, with no other browser profile rerun.

Runtime source/assets/dependencies remain fingerprint
`4a1a82130f519282ca4634049ede94a8fb8ce34c930eab4cbe6df895a85d5848`.
The original source tree was `af8cc16e2d34166326fda815b32bc2753777104b`.
Both contracts retain exactly the same 54 case identities, 40 new pieces,
24 new postcards, and twelve envelope identities. The original contract is
preserved as `tests/verification/expansion120-prior-coverage-contract.json`.

## Diagnosis and correction limits

The prior 60-second collection cap was near the observed small-iPhone duration
(54.739 seconds); desktop took 16.960 seconds. The large failure reached eleven
collection attachments and the twelfth envelope, Return Mail. Its failure PNG
shows the board while its later accessibility snapshot lists the collection.
These are distinct observations, not a synchronized contradiction that proves a
runtime modal bug or proves timing to be the only cause.

Installed Playwright 1.61.1 establishes the observation order:

- `node_modules/playwright/lib/index.js:606–609`: failure PNG has a 5-second cap.
- `lib/index.js:614–616,653–655`: body-finished callback captures the failure PNG.
- `lib/index.js:622–642`: context close stops tracing, then obtains the later ARIA snapshot.
- `lib/worker/workerProcessEntry.js:1665–1688`: body completion precedes fixture teardown.

The unchanged app calls native `showModal()` in
`src/collection/CollectionDialog.jsx:8`. Its modal is opened from a React effect.
A pending UI transition can therefore be observed at different moments. The
original trace could not be restored, so the exact original failing operation
remains unproven.

The harness now gives this one twelve-envelope case a 120-second cap. Other case
caps remain 60 seconds, or 180 seconds for each full ten-picture progression.
The global browser cap remains 480–540 seconds. This is a time allowance plus
additional diagnosis, not a claim that extending time repairs the runtime.

Each envelope records navigation, board readiness, opening, each of ten real
lazy-image decodes, capture-before/capture-after native-modal state, closing, and
finally exact unchanged save bytes. Journals flush after every phase. Invalid
states are written before their assertions fail. Native open/modal state,
viewport intersection, visible style, three top-layer hit tests, image dimensions,
selected envelope, geometry and scroll position bracket the capture. A missing,
reordered, wrong-profile or incomplete journal cannot pass completion. The twelve
collection PNGs remain viewport samples; they do not visually show all 120 pieces.
All 120 images must decode, and the forty newly earned pieces still have all 80
native/320px board captures plus geometry. All 24 real postcard exports and the
four previously unstarted storage cases remain required.

## Bounded failure evidence

The failed original inventory contained 365,510,219 raw bytes, including
181,339,014 bytes under temporary trace paths and a 32,540,417-byte trace ZIP.
Automatic trace snapshots/screencasts and their network/image resources can
persist on failure; whole-file object deduplication cannot remove identical
content embedded inside a ZIP.

The proposed trace policy is explicit: retain action/source traces on failure,
with automatic screenshots, snapshots and attachment duplication disabled.
Installed Playwright `lib/worker/workerProcessEntry.js:582–588` merges these
options; `playwright-core/lib/coreBundle.js:24718–24719` enables HAR only when
snapshots are enabled, and `:24751–24755` separately controls screencasts and the
snapshotter. Thus this policy does not produce automatic replay DOM snapshots,
screencast frames or network bodies. Required explicit PNGs are unchanged.

Every failing test additionally attempts timestamped before-image state, an
explicit PNG, after-image state and an accessibility snapshot. Each browser
observation has an independent 5-second outer bound (including hung evaluations); unavailable observations are recorded,
and diagnosis errors never replace the original test result. These observations
are explicitly non-atomic. The separate diagnosis archive prioritizes the
collection journal and bracketed failure state; it remains diagnostic-only.

The complete archive still preserves every generated raw path and byte,
including trace internals, explicit screenshots, exports, reports and journals.
No generated file is deleted, truncated, downsampled or silently excluded to fit.
The existing two-part 90 MiB complete-evidence limit fails closed on overflow;
the independent 8 MiB diagnosis cannot turn overflow into complete proof.
Full archive SHA/length and every restored raw file must be checked before review.

## Proposed one-run boundary

- Proposed staging branch: `work/expansion-120-large-staging-20261005`.
- Sole trigger branch: `verify/expansion-120-large-20261005`.
- Check both branch names read-only before any approved publication.
- Standard GitHub-hosted `ubuntu-latest`, contents:read, run attempt 1 only.
- One build job capped at 7 minutes, one large-WebKit job at 15 minutes: 22 runner-minutes maximum.
- One exact expansion build is restored by the browser job; normal/batch isolation builds also run in preflight.
- One worker, zero retries, stop on first failure; no partial-suite filter or alternate execution profile admitted.
- Never start with under eight browser minutes remaining; preserve 120 seconds for evidence and 15 seconds scheduling margin.
- Preflight 32 MiB plus one profile 98 MiB (90 complete + 8 diagnostic): at most 130 MiB retained, one day.
- Included allowance only, using the owner's stated automatic zero-dollar spending stop. No allowance/budget/stop changes or paid overages.
- Stop and notify if the spending stop blocks work; no automatic retry or deployment.

## Acceptance across the two runs

`verifyExpansion120Recheck.mjs` validates the retained desktop/small evidence
against the original frozen contract, original commit, original harness hash,
raw terminal events, required images and exports. It validates the large recheck
against the new harness, complete collection journal and exact same emitted
runtime/build bytes. Its cross-run record labels each original profile with run
37378736660, its old commit, contract and harness; the recheck retains its own
commit/harness. It never pretends the three profiles used one new harness or run.

Machine completion still requires all 54 unique terminal zero-retry passes,
72 actual exports, complete restored artifacts, the preserved original visual
verdict, and direct visual review of the new large-profile artifacts. Browser
success, new runtime modal behavior and final visual acceptance are unverified
until this separately approved gate completes. Cynthia is not needed for this
engineering gate.
