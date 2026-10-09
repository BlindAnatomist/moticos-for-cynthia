# Stage D reconstructed execution preparation

Status: independently reviewed for static readiness; native browser acceptance and original-pixel review remain pending. The temporary unconditional reconstruction blocker has been replaced by a meaningful source-binding predicate after the independent D01–D11 review and owner-directed clearance.

## Provenance

The original cloud files were partially lost. Ten execution files were recovered exactly against preserved byte count, Git blob SHA and SHA-256: binding, collection, git-read, paths, policy, reporter, server-core, step-journal, validate-all and validate. Other execution files and these documents are new reconstructions. New source/build/probe fingerprints are required; historical fingerprints and test results do not certify the new bytes.

## Mandatory gates

assertReconstructionReviewed requires freshly verified source integrity, ACCEPTED_SOURCE_FOR_AUTHORIZED_RUN status and exact accepted-baseline equality. Provisional source, altered bytes and baseline mismatch fail closed. The existing environment, first-attempt, exact reviewed source/build/probe commit trailers and bounded owner-approval checks remain mandatory and unchanged.

precheck performs the inexpensive binding/authorization checks inside its one-minute step. Setup and preparation share the original 180-second deadline starting at the actual job start, including container provisioning and installation. prepare-run executes the full fixture closure as a bounded child under the remaining deadline, then all current Stage D top-level, browser and execution contracts, exact collection-only inventory and core/probe builds. Historical version-specific A/B/C tests are not represented as passing current-320 tests.

## Fixture closure and cache

Closure verifies all live input hashes, three exact historical seeds, every recipe's trusted initial-state upgrade, every unique reducer transition, and every final state/hash. New legacy-v1 starts from the actual v1 constructor. Prefix memoization is local to one invocation, keys the engine/initial-state/ordered-action chain, and clones cached states. Reports distinguish declared commands from unique replayed transitions.

The receipt lives in stage-d-setup-results and binds fixture SHA, source fingerprint, validator implementation SHA, input inventory and run/attempt/commit identity. Every cache use rechecks live source and input hashes. Changed identity is rejected. The receipt avoids repeated reducer replay, never identity verification. runAll requires an existing valid receipt; it cannot silently begin another expensive replay.

The current fixture pack contains 68 states, 65 recipes and 4,326 declared commands, with 1,813 unique transitions. Local memoized replay measured about 43.8 seconds under the observed load. The fresh runtime suite measured about 66.9 seconds separately. Actual CI provisioning/install may be slower; the shared 180-second limit remains binding and failure is preferable to expanding the allowance.

## Evidence limits

Two complete eleven-case profiles run serially, stopping at the first failure. Accepted native evidence requires 32 routine screenshots and 12 postcard PNGs per profile, complete journals, confirmed cleanup and 88 originals total. Native completion means NATIVE_PASS_PENDING_VISUAL_REVIEW; it does not authorize publication.

The job remains capped at 36 minutes; each profile at 900,000 ms subject to remaining admission; cleanup 60 seconds and reserve 120 seconds. Workers 1, retries 0, repeatEach 1, maxFailures 1 and run starts 1 remain fixed. The 127 MiB raw-artifact watchdog is sampled every 200 ms; the retained/upload artifact has a hard 128 MiB ceiling. No trace or video is allowed, with at most one explicit failure PNG.

No native browser run, GitHub Actions run, remote write, upload or publication was performed during reconstruction.

Independent review evidence is delivered separately in recovery-execution/INDEPENDENT-REVIEW.md. The final predicate/source inventory review is recorded in that external receipt; it is not native browser acceptance.
