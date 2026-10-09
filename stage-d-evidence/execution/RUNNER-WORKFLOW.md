# Stage D bounded runner workflow

This is a newly reconstructed document. Independent static review cleared the reconstructed D01–D11 suite for final source binding; actual native execution and original-pixel visual review are still required.

## Fixed workflow

One standard ubuntu-latest public-repository job uses the pinned official Playwright v1.61.1-noble image and Node 24. Contents permission is read-only; checkout does not retain credentials. Only the reviewed branch, push event and first attempt are accepted. No budget, spending-stop or overage setting is changed.

1. Bind actual current-job start, including container startup.
2. Run the one-minute precheck: fresh source/baseline binding and exact reviewed authorization trailers. No expensive fixture replay occurs here.
3. Run setup under its immutable 180-second shared deadline. After installation, prepare-run performs bounded semantic fixture closure, all current Stage D contracts, exact collection and both builds.
4. Bind the exact rebuilt source/core/probe identities to the owner-authorized run.
5. Run both complete eleven-case profiles serially, with first-failure stop and no retries.
6. Validate and retain bounded native evidence or original failure diagnostics, then upload under the unchanged workflow limits.

The first fixture closure is charged to setup time and invoked with only the remaining deadline. Later runner entry checks require its same-run receipt and revalidate every source/input identity. Neither cache reuse nor prefix memoization permits unproved recipe initials or unchecked final states.

## Fixed ceilings

- Whole job: 2,160 seconds
- Setup including provisioning: 180 seconds
- Each complete profile: at most 900,000 ms, limited further by remaining admission
- Cleanup: 60 seconds; additional reserve: 120 seconds
- Workers 1; retries 0; repeatEach 1; maxFailures 1; run starts 1
- Sampled raw-artifact watchdog: 127 MiB, every 200 ms
- Retained/upload artifact hard ceiling: 134,217,728 bytes
- Profiles: stage-d-chromium-desktop and stage-d-webkit-phone
- Eleven complete cases per profile; 22 total instances
- 32 routine screenshots and 12 postcard PNGs per profile; 88 accepted original PNGs
- At most one explicit failure PNG; no video or traces

Setup has limited headroom under slower CI conditions. Exhausted time, failed collection/contracts, changed source/input/fixture identity, failed native cases, unconfirmed cleanup or excess evidence must fail closed. No allowance is enlarged to make a run pass.

Exclusive output creation prevents accidental reruns. Native completion remains NATIVE_PASS_PENDING_VISUAL_REVIEW. Finalization preserves setup and validator diagnostics, validates actual dist-stage-d serving mappings, and never converts partial output into acceptance. Publication is separate.

Independent review evidence is delivered separately in recovery-execution/INDEPENDENT-REVIEW.md. The final predicate/source inventory review is recorded in that external receipt; it is not native browser acceptance.
