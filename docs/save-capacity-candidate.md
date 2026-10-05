# Lossless save-capacity candidate (private, not deployed)

## Status and scope

Based on accepted 80-piece commit `cf172905dc3fec335d4117e86bb9847149b01122`, tree `69ce7c3f8f0a61234649fcd94ae81f4f74c73444`. The candidate is an isolated source export, not a new remote branch or commit. Only four runtime files change. Artwork, storage keys, game rules, accepted 100-step Undo limit, dependency manifests and lockfile remain unchanged.

This preserves every retained board snapshot, counter, supply, discovery and sound choice, except for the changes deliberately made by an accepted action. It never prunes during migration, resets a board, deletes another save, or retries a failed write with reduced data. “Lossless” means exact game-data values and Undo behavior; the JSON storage encoding deliberately changes after a successful action. Original bytes remain exact for read-only session opens, unrelated saves, and failed/blocked commits. Existing session-wide sound synchronization can commit a sound-only action when navigating to an envelope with a different saved sound choice; this accepted behavior is unchanged and can trigger migration.

## Design decision

The dominant cost was repeating full 25-cell boards in all 100 retained Undo snapshots. Each legal action changes exactly two cells. The new transport stores the first complete retained board and the exact cell changes, full supplies and counters for each subsequent snapshot. It is a small synchronous codec, not a new storage framework or replay of inferred actions.

The in-memory save remains strict v1. `serializeSave` remains the legacy JSON/export API. `serializeStoredSave` validates that entire v1 save and selects the smaller of legacy JSON and a version-2 `moticos-round-delta-v1` wrapper. A checksum detects accidental corruption. The decoder bounds history/cell expansion and still runs the full existing semantic validation, including legal successive rounds and discovery prerequisites. After semantic validation, it also enforces the existing 512 KiB canonical v1 byte ceiling, matching the writer. The checksum is not authentication.

### Migration, errors and ordering

- Both plain v1 and the exact supported wrapper are accepted.
- Opening the storage session or browsing the collection never writes or migrates it. At UI navigation, the existing shared-sound behavior can perform a sound-only action if the destination's saved choice differs; this preserves its complete round, history and discoveries.
- The next legitimate action prepares the full stored representation before the final raw-byte compare and one-key `setItem`.
- No asynchronous compression, write queue, delayed flush or unload job exists, so an older compression result cannot overwrite a newer action, Undo, reset, sound change or navigation.
- If serialization, reading, or quota fails, the existing raw bytes stay in place; temporary state remains in the current tab and later automatic writes remain blocked, matching the accepted behavior.
- Corrupt or unknown-version bytes are left untouched. There is no automatic fallback that replaces them with a new save.
- Old code classifies the wrapper’s version 2 as unsupported, preserving the bytes. Old already-open tabs retain compare-before-write and storage-event protection. A rollback must retain this decoder; the old release alone cannot resume a compact save, although it will preserve it and offer the existing original-save download.

### Honest concurrency/durability boundary

`localStorage` has no transaction or atomic compare-and-swap across tabs. The synchronous final compare minimizes the window and prevents an observed stale overwrite, but two old/noncooperating writers can still race. This is pre-existing and is not solved or concealed here. Atomic one-key replacement on quota failure is different from a multi-tab transaction or a power-loss durability guarantee.

Browser storage is device/origin-local and may be cleared or evicted. This change is capacity relief, not backup, cloud sync or a guarantee against browser data loss. A site-origin change would not migrate user saves.

### Alternatives evaluated

- Native gzip plus base64 is smaller in the Node comparison (roughly half this codec’s stored size) but introduces async encode/decode, pending-load UI, sequencing, navigation/unload, unsupported-browser and corrupt-stream failure paths. The extra reduction is not presently required to fit the modeled 300-piece inventory.
- IndexedDB provides transactions and a larger asynchronous store, but requires async startup, explicit per-envelope conflict versions, transaction-completion handling, blocked/versionchange handling, a migration authority marker and a plan for old tabs still writing localStorage. Keeping all legacy bytes as backup consumes their original quota; deleting them would contradict this scope without a separately reviewed retention plan. It remains the stronger next step if true multiwriter guarantees, much larger histories, attachments, or measured browser limits require it.
- A server-backed design would change this explicitly local product and add authentication, data transmission, synchronization and operational scope. It is not part of this candidate.

Relevant platform specifications: [Web storage](https://html.spec.whatwg.org/multipage/webstorage.html), [IndexedDB](https://w3c.github.io/IndexedDB/), [Compression Streams](https://compression.spec.whatwg.org/).

## Collection loading

Collection reads keep one immutable validated snapshot per envelope/storage interface, keyed by exact current bytes. They still read storage on every observation and invalidate on changed bytes. They do not create play sessions, write saves, or reuse data after read denial. A WeakMap releases a discarded storage interface and its cache. This removes repeated full-history parsing/validation when revisiting the album. The first cold read still validates all requested histories; its phone cost remains a browser gate. Existing lazy image loading and envelope-local art views are unchanged.

## Evidence

`evidence/capacity-measurements.json` is the complete reproducible Node report. Fixtures have 24 occupied cells, 100 legal retained histories, nonperiodic moves, and deliberately longer synthetic IDs. They are capacity fixtures, not 300 authored pictures.

| Synthetic scale | Legacy estimated UTF-16 including keys | Compact estimated UTF-16 including keys |
| --- | ---: | ---: |
| 80 pieces / 8 envelopes | 1,849,520 bytes | 96,060 bytes |
| 120 pieces / 12 envelopes | 2,783,988 bytes | 144,488 bytes |
| 300 pieces / 30 envelopes | 7,032,780 bytes | 365,124 bytes |

At 30 envelopes this is a 94.8% reduction (about 19.3 times smaller). A simulated 5 MiB quota admitted 22 legacy dense saves and all 30 compact saves. A near-full modeled store migrated 22 existing envelopes one legitimate Undo at a time with exact results; the Undo action, not migration, changed history from 100 to 99.

Node 24 measurements on this cloud executor:
- 30 cold legacy reads: median 72.06 ms, p95 79.97 ms
- 30 cold compact reads, including the expanded-size check: median 64.06 ms, p95 93.31 ms
- 30 warm cached album summaries: median 0.17 ms, p95 0.35 ms
- One active move plus serialization: legacy median 3.26 ms; compact 3.40 ms

Those timings exclude actual browser disk I/O and phone rendering. Compression does not eliminate full semantic validation per move. The compact cold-read p95 was slower in this refreshed run; no consistent cold-read or phone speed-up is claimed.

Completed checks:
- 229 existing unit/regression cases passed after three transport-only assertions were adapted to the decoder; no gameplay expectation was removed.
- Two additional component regressions passed for inherited sound-only migration and unchanged matching-sound legacy bytes, giving 231 cases in the existing test command.
- 40 new capacity/property/fault/cache cases passed, including all 100 successive Undos in every accepted envelope and two expanded-size boundary cases. The oversized regression failed before the decoder correction and passed afterward.
- 15 existing batch cases passed.
- 13 config/build-identity tests passed without a browser or server.
- Normal and 80-piece candidate production builds passed. Existing large-chunk warnings remain.
- Existing browser suites collect successfully; a new six-case, three-profile suite collects all 18 cases. Collection is not execution.

The initial independent review identified the expanded-size boundary, a same-state stale-tab test blind spot, a collection screenshot taken after dismissal, and overbroad wording about read-only UI entry. The bounded correction also makes the two tabs' expected states differ and captures each visible collection after artwork readiness. The four original runtime-file scope and all prior accepted coverage remain unchanged. This correction is a separate implementation delta awaiting independent re-review; refreshed logs and the review record are under `evidence/review-delta/`.

No browser run, new Actions, remote commit, push, deployment, image generation, new dependency install or spend occurred. The 299 offline cases and both builds passed. Independent delta review and browser validation remain required. Cynthia is not needed to perform engineering QA.

## Repeat offline checks

From the candidate source directory with the existing lockfile’s dependencies available:

    npm test
    npx --no-install vitest run tests/saveCapacity.test.js tests/collageBatch.test.js
    npm run build
    npm run build:batch
    npx --no-install vitest run tests/capacityBrowserConfig.test.js
    node scripts/measureSaveCapacity.mjs

No default package scripts or dependency versions were changed. The browser configuration and tests are described in `save-capacity-browser-plan.md`.
