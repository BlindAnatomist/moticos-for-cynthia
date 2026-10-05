# Lantern Studio: exact remaining browser continuation

## Scope

This is a verification-only continuation of public checkpoint `b1d8aef0d5d3dea04fef9ef265ffaffc70b4a33c`, local source `95659a66ab2ae957faad0ea1355af67a9872c293`. It changes no runtime, artwork, dependency, configuration or existing browser-test bytes. It neither merges main nor deploys from CI.

Corrected run [37254210619](https://github.com/BlindAnatomist/moticos-for-cynthia/actions/runs/37254210619) passed 3 selector preflights plus 167 main cases. At its 25-minute browser ceiling, two cases were interrupted and 74 had not started. No individual assertion failed. Its final Playwright last-run file lists no failed tests; `--last-failed` would silently omit the unresolved cases and is not used.

The selected 76 identities comprise 9 large-iPhone cases and 67 Chromium cases. The manifest comes from the exact full 246-case collection minus the 170 successful terminal events, including both interrupted cases. A full rerun would repeat completed work unnecessarily.

## Guard and evidence

`tests/verification/lantern-coverage-contract.json` records the exact 170/76 split, prior evidence hashes and 99 pinned runtime/art/dependency/browser-test/tool files. `verifyRemainingCoverage.mjs` verifies the source and complete directory inventories, collects both full and selected identity sets, rejects omissions/duplicates/changed titles, and requires every selected case to start and finish once with status `passed` and retry zero. A successful completion produces a machine-readable 246-case union proof. An interrupted run cannot satisfy it.

The corrected evidence archive is 1,037,984,304 bytes, SHA-256 `2040258ea7eff9942bbd66ae9912eaf74f85bb4906b65efd2e3f4d724fe3ae5c`. All 5,598 source-member hashes were verified after both initial retrieval and private external readback. The earlier oversized evidence was rescued separately without rerunning its tests: exact 654,533,926-byte ZIP, SHA-256 `075aae2f23f379516eaae1eff75a88298280fe7452a715c7d0edd06454ffc750`, all 1,792 members validated.

The public repository contains only technical verification metadata, not private recovery identities or local transfer credentials.

## Budget and preservation

One standard `ubuntu-latest` job, 25-minute hard job cap, two browser workers, zero retries. The browser phase is capped at 15 minutes and shortened further if earlier work consumes the six-minute evidence reserve. No prior rescue is repeated and no extra job or automatic retry is enabled. The 76-case estimate is approximately six browser minutes from matched case durations; eight to twelve minutes is the operational estimate rather than a guarantee.

All screenshots, geometry, traces, event streams and HTML reports produced are losslessly archived into 200 MiB parts with SHA-256 manifests. Packaging has a three-minute cap and each upload a one-minute cap. The reserve covers the expected bounded output; abnormal slow uploads or unusually many parts can still exhaust the hard job cap and must be reported as incomplete preservation rather than successful evidence capture.

## Visual review already completed

Independent inspection covered all ten new rendered tiers at 320×568, 390×664 and 430×752; default/enlarged album states; retained-world filtering; six exported postcards; and four focus-return screenshots. Across 148 nonmodal board snapshots and 5,358 control measurements, no geometry/hit-test violation was found and the smallest target was 44 CSS pixels. Both phone profiles' relevant Lantern/album/keyboard cases passed. These results do not substitute for the remaining Chromium and large-iPhone cases.

Local verification: 18 continuation-guard tests; exact full/remaining dry collections; 99 unchanged-file pins. Existing source checks and final browser results are recorded separately. Conditional release requires the full 246 unique-case union and clean remaining visual evidence. Physical iPhone Safari/VoiceOver remains unverified.
