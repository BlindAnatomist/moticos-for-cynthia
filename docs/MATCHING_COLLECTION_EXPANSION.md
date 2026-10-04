# Matching collection: second-envelope candidate

## Boundary and starting point

Repository: `BlindAnatomist/moticos-for-cynthia` (public). Local branch: `work/matching-collection-expansion-20261004`. Exact starting Site source: `c897dd81bca4d9cc1652e2c155bdf08fd9a849c0`; corresponding public baseline: `bdf209e69b241cdbd2ae561513c48b21a2db25d6` on `work/matching-progression-20261004`.

The published version 2 remains the preserved functional baseline. This branch is an isolated candidate, not a live release. The source and six new images were authorized for the isolated public work branch. Two explicitly approved standard-runner jobs completed the verification below. Main and the accepted live version are preserved until the conditional preview deployment.

## The bounded increment

One new envelope, Moonlit Passage, adds two coherent matching families:

- Round Key → Frond Key → Drawbridge Key → Stairway Key → Elsewhere Key
- Cobalt Moon → Crescent Courier → Lunar Skiff → Crescent Balloon → Orbit Voyager

The four lower forms reuse previously approved, previously inactive matching art. Six higher forms are new original reference-guided cut-paper illustrations. The matching catalog now contains twenty distinct authored pieces across two envelopes and twelve earnable postcard artworks. Duplicate board instances, postcard exports and recolors do not count as extra catalog pieces. This is an incremental milestone toward well above 200 distinct pieces, not the full target.

Every envelope retains two five-tier families, the 5×5 board, four starters per family, six finite pair draws per family, identical-picture-only merging and independent sixteen-unit conservation. Both finales take thirty forward merges and twelve draws along the straightforward route. Three merges within one family can earn the first postcard; tiers 4 and 5 add two more. Invalid attempts, Cut, movement and Undo retain the accepted rules. There is no economy, waiting, randomized supply, completion lock or new difficulty system.

## Navigation without resets

Envelopes are immediately available from the footer. Navigation changes the URL and preserves each visited board and independent Undo stack. Browser Back/Forward restores the corresponding envelope. Only the active envelope is mounted; collection views show one envelope at a time, and their images load lazily. The board's discovery counter remains local (for example 2/10), and browsing another envelope's collection does not switch play.

Postcards stay optional. They can be opened from either envelope's collection and return to the unchanged active board. A fresh-envelope confirmation names the selected envelope, resets only that board/history, and retains its discoveries. The current mute choice follows navigation and is synchronized through the destination's protected save path without adding an Undo step.

## Persistence and content contract

`catalogFactory.js` creates immutable two-family/five-tier catalogs with ordered explicit piece IDs. The engine derives previous/next routes from these lists, not from ID spelling. Registry checks prevent cross-envelope ID or storage-key collisions. Existing garden records and piece IDs are unchanged.

`engine.js` implements the accepted reducer and strict validator for one scoped catalog. Garden's public API remains in `game.js`, with exact `moticos.matching.garden.v1` key and v1 save shape. Moonlit Passage uses `moticos.matching.moonlit-passage.v1`. No existing bytes are migrated, normalized, deleted or bulk rewritten. Foreign-envelope pieces cannot validate in a save.

`session.js` preserves each visited envelope's save and last-observed storage guard in a tab-local cache. Protected temporary play survives switching even when an original save is corrupt, future-versioned, blocked, stale, or a quota write fails. Resuming a cached envelope rereads its storage bytes before allowing another write. Original-save exports include the envelope ID in their filename. Property access to localStorage itself is guarded.

Stale-write protection is a sequential read-before-write check; browser localStorage does not provide an atomic compare-and-swap. The implementation does not claim to exclude truly simultaneous cross-tab writes. No broader concurrency guarantee is introduced here.

Save limits remain 512 KiB per envelope, one million board actions, and one hundred Undo snapshots. A measured dense 24-piece board with one hundred movement snapshots serialized to 88,050 bytes for Garden and 87,949 bytes for Moonlit Passage. These are measured representative high-history cases, not a mathematical storage upper bound. More envelopes accumulate independent storage; quota failures retain temporary play and never silently evict older progress. Artwork bytes are not stored inside saves.

## Verification and proof limits

Local verification for the completed source/art snapshot is recorded under `docs/verification/`:

- The unchanged garden catalog equals the prior records, and a captured pre-expansion v1 save round-trips byte-for-byte.
- 97 deterministic/actual-handler tests cover both envelope engines, all 400 global pairings, every tier Cut and Undo, independent completion in both orders, strict input rejection, separate save keys, temporary play, inactive-tab changes, mute navigation, URL handling and postcard catalog selection.
- Each envelope passes all 13,341 conservative inventories and 10,000 deterministic mixed actions with 271 exact reload checks.
- Production build passes.
- New art is reviewed as actual 50/76/190-pixel composites; this is distinct from rendered browser/phone evidence.

Independent review caught two regressions during implementation: unguarded evaluation of the localStorage getter and mute loss on destination reload. Both were repaired and tested before this checkpoint.

The browser gate is complete across the two iPhone WebKit emulations and desktop Chromium. Run `37176745549` passed 182 cases and one intentional desktop-only skip, while six Garden full-round cases stopped at an incorrect test-fixture expected set. Both obsolete assertions were scoped back to the Garden's exact ten permanent IDs; no runtime or artwork changed. The separately authorized targeted run `37177831714` then passed all six cases, including the remaining Garden collection, six postcard downloads, reload and Undo checks. Combined coverage is 188 passing browser cases plus one intentional skip on the same runtime/artwork.

The suite retains prior regressions and adds complete Moonlit rounds, new postcard exports, switching, Back/Forward, corrupt/quota/security cases, inactive cross-tab changes, compact dialogs, collection scroll coverage and mute reload. Local socket/browser access was known blocked; no bypass was attempted. Both jobs used standard runners with a 25-minute cap and zero browser retries. Full run and artifact identities are recorded in `docs/verification/expansion/browser-verification.json`.

Actual Moonlit browser screenshots and postcards received independent direct pixel review, including all 30 iPhone 13 captures, both family orders, all lower collection scroll positions and all six new postcard designs. No blocking visual defect was found. Two non-blocking layout refinements remain optional: a narrow scrolled-content seam above the sticky collection heading, and tight right spacing on the Garden chooser title at 320px. Physical-device Safari and full assistive-technology acceptance are not claimed.

The twenty-piece candidate does not prove long-term variety across hundreds of pieces. Routine increments use automated testing and agent-operated review; they do not require another Cynthia playtest. Reserve human playtesting for a major meaningful change or a genuinely unresolved experience question. Later content expansion should follow completed engineering and visual gates, not mass generation.
