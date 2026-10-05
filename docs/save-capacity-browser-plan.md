# Pending browser acceptance plan

This is a prepared plan and collected test suite, not executed browser evidence. Local browser preview/socket access was previously denied. Do not try another local browser, port or tunneling route. The supported verification route is a separately approved, bounded GitHub-hosted Actions run under the existing zero-dollar stop. Do not alter budgets, enable overages or start the run without the user’s approval.

## Review/staging preconditions

1. Independently review the immutable source overlay, codec/validation, migration semantics, failure behavior and test assertions.
2. Integrate only the reviewed overlay with the separately reviewed content candidate. If using 120 pieces, update the capacity test helper’s registry import and the eight-envelope browser fixture coverage deliberately; preserve every prior scenario.
3. Obtain explicit permission for any required public repository staging and the bounded Actions run. Pin the exact staged commit, source fingerprint, test bytes and dependencies. The old 80-piece coverage contract remains frozen and must not be presented as proof for changed runtime.
4. Create a workflow only after its exact scope is reviewed/authorized. One preflight builds once, runs the offline checks and freezes `preflight-results/capacity-build-proof.json` with `node scripts/verifyCapacityBuild.mjs freeze` at the actual `GITHUB_SHA`. Profile jobs restore and verify those exact bytes. The prepared `serveCapacity.mjs` rejects a mismatched commit, source, test or output file before starting its server.

## Prepared six cases per profile

Run zero retries, one worker, stop after the first failure, six-minute suite maximum, and a separately capped job with reserve for evidence. Required profiles: desktop Chromium, iPhone 13 WebKit, and 430-by-932 WebKit. Preserve JSON results, full stdout, screenshots, traces on failure, actual browser versions, exact command, source/test/build hashes and test identity lists. Evidence must show 18 terminal zero-retry passes, not just green job summaries.

1. Load a genuine legacy 100-history save without writing it. Undo into compact format, reload, Undo again and assert exact data and visible boards.
2. Open every accepted envelope with dense compact history and matching sound settings; open/close its collection and verify that all raw bytes remain unchanged. Load the lazy artwork and capture a visible collection screenshot for every envelope. Record navigation/collection wall time separately from image loading and evidence capture; these are not input-latency measurements.
3. Inject a save-write quota failure after loading legacy bytes. Verify unchanged original storage, exact temporary Undo board and visible warning.
4. Load corrupt compact bytes, play temporarily and reload. Verify the corrupt source bytes remain exact and the warning stays truthful.
5. Open two tabs on the same legacy board. Let one perform two Undos and migrate. Verify the stale tab warns; its one Undo must produce a provably different attempted state while leaving the winner's exact bytes untouched. This is stale-tab protection, not a claim of atomic simultaneous CAS.
6. Store thirty distinct synthetic compact saves in actual browser localStorage, fill test-only origin space to the actual quota, and confirm a legacy-to-smaller replacement still works. Record the browser’s real failure type and readback. This is actual origin-quota evidence, not physical-phone storage capacity or 300-piece UI/art coverage.

Each explicit execution command, only after approval and staged preflight proof, is:

    MOTICOS_CAPACITY_BROWSER_APPROVED=1 npx --no-install playwright test --config=playwright.capacity.config.js --project=PROFILE

The environment flag is only an operator guard. It does not itself grant permission.

## Additional acceptance work after the focused gate

- Mixed saved sound choices are an explicit browser gap: existing UI navigation can inherit a session-wide sound choice and commit a sound-only migration. Offline component tests retain the exact round, 100 snapshots and discoveries; the focused fixture's matching sound settings do not prove this browser path.
- Review the actual screenshots at phone sizes, warnings and collection state. Exercise visible merge, move, Cut, supply, Undo, sound, envelope navigation and a confirmed fresh-envelope action on the integrated final build.
- Check interrupted/repeated navigation and first-use loading, not only warm cached views. Measure active move input-to-persist/frame latency and cold versus warm collection opening in each engine against the pinned baseline, capturing distributions and long tasks where supported. Do not infer mobile performance from Node numbers or navigation wall time.
- Run retained gameplay/visual/postcard cases for changed runtime after repinning their reviewed transport-aware assertions. The accepted old-runtime coverage is useful historical evidence, not release coverage for this change.
- Confirm that a rollback build retains the compact decoder and preserves any migrated bytes. A raw rollback to the old v1-only release offers protected temporary play, not resumed migrated progress.
- Physical-device/storage behavior, browser eviction and power loss remain outside emulated WebKit guarantees. If measured latency or quota is unsatisfactory, stop and evaluate incremental collection loading or transactional storage as a separate bounded change; do not trim history or silently reset data.

No workflow or action invocation is included in this private candidate.

## Evidence preservation requirements for the eventual hosted workflow

- Preserve complete stdout/stderr, structured results, collected and terminal test identities, exact command/browser versions, pinned source/test/build proof, screenshots and failure traces on success, failure and cancellation. Evidence packaging and upload steps must use an always-run path, with job time reserved after the six-minute suite limit.
- Before upload, create an ordered archive/part manifest with byte counts and SHA-256 hashes. Split losslessly into parts no larger than 200 MiB so the downloader's known 512 MiB limit cannot strand evidence. Keep every source artifact; splitting is not permission to drop traces or images.
- Verify artifact readback and reconstruction before reporting evidence safely preserved. Upload success or a green job alone is insufficient. Use full collected identities minus zero-retry terminal passes to identify interrupted/unstarted cases; a timed-out last-run file can contain no useful failed-test selection.
- This candidate includes no workflow. Review these always-run steps, timeout reserve, bounded part sizes and exact commit/coverage accounting before the user-approved run, not after a failure.
