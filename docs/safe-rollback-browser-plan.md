# Focused private rollback browser supplement

## Status and authority

This document prepares a harness; it does not authorize its execution. No browser was launched for this correction. The known executor socket restriction remains respected. Any future execution route requires separate approval. Do not run Actions, upload, deploy, change live/player data or use another browser route to bypass that restriction.

The accepted runtime is frozen at `cc5fe6e073d41f20d0a97eb1af782d5e6094b61a82af91c60610bda4ccc9c960`; the exact 89-file production build fingerprint is `07aa05334317c814f1bb450a7e9dd155f8fead91db19ece8e83af5e3f02e7046`. This correction changes documentation and verification code only. The in-tree complete source manifest pins the final harness separately. The server refuses to start if those source/build inventories no longer match.

## Bounded matrix

Sixteen cases run once per profile: desktop Chromium 1280×720, iPhone-sized WebKit 390×664, and iPhone-sized WebKit 430×932. Total: 48 zero-retry cases, no skipped acceptance cases. The first failure stops the run. An explicitly selected single profile can produce a bounded partial manifest, but it cannot claim the other profiles passed.

Eight preservation cases:

1. Open each newer-envelope saved URL directly into recovery. Require no board/play/reset/postcard controls; scroll every preserved record into view, show and capture both named families and discoveries, expand and compare the entire 100-history JSON, capture named board positions, focus and scroll the expanded history region, and capture top controls. Download and inspect the complete native JSON file.
2. Start from Moonlit Passage with a populated save. Enter recovery through Envelopes and Collection, repeat return navigation, browser Back/Forward and reload, then verify the same selected envelope, exact board, sound and stored history. Verify recovery focus, native dialog closure/focus return and restored body scrolling.
3. Export while in recovery, change one newer-envelope source from a second synthetic tab, observe updated history, refresh, then export again. The new file must contain the winner's exact fresh bytes; recovery must make no storage writes.
4. Export empty, corrupt, future-version and selectively read-denied entries. Verify explicit statuses, raw availability, null decoded records, visible failure records and untouched underlying sources. Inject one download-initiation exception, check the visible failure message and zero writes, restore the native API, then require a successful native download. Repeat with the localStorage property itself denied; inaccessible data must not be claimed as captured.
5. Let a second tab commit two Undos while the original tab retains its pre-change state. Make one temporary Undo in the stale tab. Export distinct 98-history stored winner and 99-history temporary loser, preserve the session-opening source, and return to the temporary board without any overwrite.
6. Inject a synthetic quota error, Undo once, export unchanged stored history plus separate temporary state, then return to the same temporary board. Confirm recovery performs no further write attempt.
7. Retain the existing Garden 100-Undo path with reload checks and exact state comparisons after every Undo. Newer-envelope bytes remain untouched.
8. Resume an accepted batch envelope's compact v2 save; Undo, reload and verify 99 retained histories, sound, board, recovery export and return. Newer-envelope bytes remain exact.

Eight artwork/export cases, one per playable envelope:

- Resume its exact saved URL and verify the actual board and sound.
- Require current board artwork to decode, then open the real Collection. Scroll and decode all ten actual images with nonzero dimensions, capture each named family in the viewport, and keep the saved board/history unchanged.
- Open the chosen real postcard through its collection article; require preview art decoding and the actual native download event. Inspect the saved filename, PNG signature, 1536×1120 dimensions, browser image decoding and nonblank pixel diversity; attach the actual PNG and viewport screenshot.
- The sample selects exactly one postcard in each of eight envelopes per profile, collectively spanning tiers 3, 4 and 5 and original-public/accepted-batch assets. That is 24 actual PNGs. Exact piece IDs are defined by `POSTCARD_SAMPLES` in `tests/rollback-browser/plan.js` and checked offline. This is not a rerun of all 48 original postcard compositions.

## Evidence and review

The custom reporter validates frozen source/build inputs, records each terminal case, profile, status and retry, and hashes every attached screenshot/JSON/PNG. It emits `rollback-test-results/evidence-manifest.json`, rejects missing/nonterminal/retried/skipped cases and missing/duplicate native postcard outputs, and records review as pending. A failed or interrupted run cannot become acceptance from a successful subset.

Review every actual screenshot and all 24 actual postcard PNG pixels. Mark individual findings/review outcomes in a separate review record keyed to the manifest hash and artifact hashes. The harness never grants visual approval automatically. Preserve JSON downloads too: compare all known keys, exact raw strings, canonical states and catalog identities; distinguish synthetic empty/failure fixtures from missing evidence.

The source tests cover all twelve envelopes' 100 retained history states deterministically. The focused browser supplement proves wiring and native behavior in representative playback paths, while the unchanged historical 80-piece evidence remains historical. Do not describe this supplement as a full rerun of that earlier matrix.

## Remaining limits

No native browser, screenshot, downloaded-file or pixel result is established by collection or these offline tests. Native WebKit at iPhone dimensions is not physical-iPhone Safari proof. Synthetic quota/read-denial tests do not prove actual storage capacity or eviction durability. Per-key exports are not atomic across twelve keys; browser eviction, user-cleared data, changed origins/profiles, private browsing expiry, power loss and simultaneous write races remain outside the guarantee.
