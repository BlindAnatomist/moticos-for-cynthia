# Moticos: matching-piece garden candidate

## Authority and boundary

Repository: `BlindAnatomist/moticos-for-cynthia`. Candidate branch: `work/matching-progression-20261004`. This isolated checkout begins at the delivered Site source `03342a2498c4e0a62a4401fca8180b696a820571`. Its public repository counterpart was `work/art-collection-playable-20261004@bbf7fc8334bad972234fe0590eec21dffd41e501`.

The explicit correction is a familiar matching-piece merge game: two identical pictures become the next distinct form. The collage idea belongs in what that form becomes. The earlier cross-object recipe interpretation is superseded, including the recipe-based scaling plan in `COLLECTION_PLAYABLE.md` and the heterogeneous foundation graph. Those files and the old recipe implementation remain historical, not current design authority.

The current public preview, original eight-tier game, paused integration WIP, and their existing saves are untouched. This candidate changes only its own default route. `?classic`/`?gallery` preserve the accepted old game; `?recipe-study` isolates the superseded recipe implementation for regression tests. No Actions run, main merge, public replacement, or sharing change is authorized by this checkpoint.

## Coherent small loop

Two families, five distinct artworks each:

- Bird → Riverwing → Wayfinder → Aviary Gate → Wandering Aviary
- Fern → Fern Cup → Nightgarden → Moonlit Arbor → Lunar Conservatory

Every nonterminal form obeys exactly the same rule: two copies of that form make one next form. Different families and different levels never merge. The final form remains on the board; it does not disappear into a bonus. Invalid actions cost nothing.

The 5×5 board begins with four birds and four ferns. Two compact supply controls show six remaining pair draws per family. Each deliberate draw adds two matching starters and deducts exactly two units. No automatic spawn, random drop, countdown, spending, energy, or unknown ingredient is introduced.

Both finales require thirty forward merges and twelve pair draws. This is a small pacing test close to the previously accepted 24/31-merge session scale, not a claim of measured playtime or production completeness. Four starting pieces let the player reach level 3 after three merges in either family, providing an early postcard reward before the fifteen-merge finale. Additional postcards accumulate at levels 4 and 5; earlier postcards stay in the collection.

Postcards never open automatically. The board is always the main surface, and the dialog has an immediate return to the unchanged board. Move, Cut, and Undo are free; Undo restores the supply as well as the board. A fresh-envelope confirmation explains that the current board and Undo history reset while discovered art remains.

## Capacity and consistency

Each family conserves sixteen starter-equivalent units between board and reserve. A level weighs 1, 2, 4, 8, or 16 units. Pair supply requires two spaces. A nearly full board necessarily has a legal matching pair, so refusing supply cannot strand it. Both an independent design exploration and the implemented validator cover all 13,341 conservative joint inventories; all reach both finales.

Exact implementation and persistence contracts are in `MATCHING_ENGINE.md`. The isolated save key is `moticos.matching.garden.v1`. Invalid or unsupported bytes are retained, never interpreted as a new valid save or overwritten; temporary play and an original-save download remain available. The old recipe/classic storage is never read or written. Every committed operation is saved synchronously before its decorative animation so a reload cannot discard an accepted merge.

Input uses rendered cell geometry and pointer capture. The accepted short flight, snap-back, soft sounds, tap and keyboard alternatives remain. A direct drop onto the wrong occupied artwork is rejected, even if a matching piece is nearby; magnetic assistance applies to matching targets and open-space near misses. This avoids visually contradictory merges. State-changing inputs are guarded during merge flight. Lost/canceled pointers and tab backgrounding clear the gesture.

## Art choice and scaling

The active collection contains ten genuinely distinct illustrations: six reused approved works and four new original higher-tier works. Unused art, board instances, recolors, and postcards are not counted as additional catalog pieces. Two independent pixel inspections checked family continuity and major-silhouette distinction at approximately 50 px. `matching-art-provenance.json` records the four built-in image-generation prompts, reference hashes, original masters, alpha checks, and final WebP hashes. No paid external generation was used.

The production goal remains well above 200 genuinely distinct pieces. A reasonable content-planning target is 288 authored works distributed across coherent matching families and themed envelopes, not 288 active board types. The bounded candidate intentionally validates the mechanics and visual grammar before mass asset production. Production expansion will need a data-driven pack registry, active-family quotas and independent conservation, save-version migration, lazy pack artwork, session pacing validation, and exact-ID collision checks. Those production systems are not claimed as complete here. Cross-object ingredient recipes are not part of the plan.

## Verification gates

Passed locally before browser publication:

- All original eleven game-logic tests and ten recipe regression tests
- Fifteen new matching-engine tests, including all one hundred catalog pairs
- Both finale orders at exactly thirty merges and twelve pair draws
- All 13,341 conservative inventories reach a complete board
- 10,000 deterministic mixed operation attempts; 271 exact save/reload checks
- Seventeen actual component-handler regression tests with deterministic hooks, storage and geometry (not a browser simulation)
- Production build
- Direct inspection of ten-form art at 50, 76, and 190 px

A separate implementation review found and repaired unread-save overwrite, stale-tab overwrite, and non-primary pointer-up movement. Seventeen handler regressions verify those repairs plus drag interruption, immediate-save timing, and wrong-target magnet behavior. No further blocking defect was found in the source review. The authored Playwright gate covers real full rounds, matching/mismatching drags, near misses, pair supply and Undo, Cut, dense boards, keyboard interruption, storage faults, modal return, phone geometry, export bytes and share cancellation in desktop Chromium and two iPhone WebKit profiles.

The local executor's browser/socket path is known blocked. No bypass or duplicate local-browser attempt is made. Browser scenarios and rendered phone screenshots are therefore **pending**, not passed. The parent owns an authorized separate browser gate and any publication decision. This candidate must not be described as ready for Cynthia until the rendered browser checks and screenshot inspection pass.

## Authorized verification proposal

A dedicated `.github/workflows/verify-matching-progression.yml` runs only when the separate `verify/matching-progression-20261004` branch is pushed after explicit approval. It has one standard `ubuntu-latest` job with a 25-minute cap, read-only contents permission, Node 22, exact dependency installation, all unit/handler tests, production build, and both iPhone WebKit profiles plus desktop Chromium. Browser tests use two workers and no retries. Screenshots, postcard PNGs and failure traces are retained for one day. The job cannot merge or deploy. Pushing the ordinary candidate work branch does not trigger that job.
