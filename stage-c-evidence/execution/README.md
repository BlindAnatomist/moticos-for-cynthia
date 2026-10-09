# Guarded Stage C execution

This isolated harness runs only C01–C10 in two serial profiles. It does not invoke the accepted 240/58-instance gate or its preflight. Production runtime and the accepted 240 workflow are unchanged.

## Private preparation, no browser

From the repository root, generate the reducer fixtures once with `node stage-c-evidence/browser/prepare-fixtures.mjs`, finish all source changes, then run `node stage-c-evidence/execution/binding.mjs seal`. The explicit source inventory works without local Git. It covers runtime, assets, fixtures, shared utility dependencies, tests, and workflows. Do not alter sealed inputs afterward.

Set `MOTICOS_STAGE_C_PROBE_OUTPUT` to a new absolute external directory, then run `node stage-c-evidence/execution/prepare.mjs` once in the pinned Node 24 / Playwright 1.61.1 environment. This performs only focused Stage C contracts, exact `--list` collection, the career build, and the dual current/v6 probe build. It never launches a browser. Outputs are `stage-c-source.json`, `stage-c-build.json`, and `stage-c-browser-results/`. The build fingerprint is SHA256 of compact JSON for the build proof with its own `buildFingerprint` field excluded; the probe fingerprint is SHA256 of the exact `probe-build.json` bytes.

## Fresh exact run binding

The final commit must descend from accepted 240 commit `8c12d874b27ce6108b1fb770037d99d3444bf0d0`, whose tree is pinned. Four unique final-commit trailers bind the actual reviewed candidate:

* `Moticos-280-Reviewed-Source: <source fingerprint>`
* `Moticos-280-Reviewed-Build: <core build fingerprint>`
* `Moticos-280-Reviewed-Probe: <probe fingerprint>`
* `Moticos-280-Run-Authorization: Sentinel_59577051eb888191ba3a1a1c86bca4f9`

Only the parent coordinator may publish the authorized commit. A push to the exact 280 verification branch is the sole trigger; rerun attempts and other targets are rejected. The runner checks final HEAD, accepted ancestor/tree, source inventory, installed dependency versions, collection, core/probe bytes, approval identity and complete remaining budget. It never changes payment budgets or enables overages. An allowance stop is a blocker, not grounds to restart.

The job ceiling is 2,160 seconds: 240 setup, 870 per profile, 60 cleanup, and 120 reserve. Browser processes run in isolated POSIX process groups with deadline/artifact watchdogs, one worker, zero retries and global stop on first failure. The second profile requires a fully validated first-profile pass. Skipped, interrupted, flaky, retried, unbound or absent evidence cannot pass.

Exactly 50 named screenshots and 22 real 1536×1120 postcard exports are required for success. Byte identity, full PNG decode/CRC validation, suggested filenames and renderer/cache parity are checked. At most one extra failure screenshot and one failure trace are preserved; videos are disabled. Failure traces omit sources, snapshots, screenshots and attachments. The total artifact cap is 128 MiB. Finalization always attempts bounded diagnostics and preserves safe raw bytes; over-cap output is explicitly incomplete. A native pass still requires separate actual visual inspection of all 22 exported compositions before any publication decision.
