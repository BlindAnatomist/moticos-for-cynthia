# Garden correspondence: playable vertical slice

## Scope and provenance

This isolated candidate builds on `8a146bf894f7ada1bcbf8ee42a2425c15fdcf50b`, the dependency-reproducibility checkpoint whose application source derives from the accepted `40a0d174c9933c167dcdb5469502ac925da9edc1` development line. The package lock and direct dependency pins are preserved. It does not merge or replace `main`, the existing development branch, or any public preview.

The default entry is the new collection study. `?classic` retains the prior eight-tier game and its Found Pieces and From Scraps routes. `?gallery` retains its gallery. No old game logic, art generation, audio profile, or drag implementation is changed. The legacy browser suite's entry URLs now explicitly request `?classic`.

The fixture contains **12 distinct illustrated pieces**: six starters, four intermediate correspondences, two final gardens. This is a small playable art-and-interaction study, not the production catalog. All artwork is supplied original generated art; the 12 web assets are resized WebP encodings of verified transparent masters. The separate sample postcard is not included. The game's postcard renderer uses the finale actually earned.

## Intentional design changes

The 5×5 board remains the dominant phone surface. The compact collection, help, and postcard controls reveal secondary views only on request. A finale does not interrupt play with a modal or replace the board. A dedicated status row avoids floating reward notices covering controls or text.

The new recipe mode addresses a limitation of tier-only merging: combining any two similarly ranked pictures cannot reliably create a specific authored collage. A single order-independent recipe lookup now governs acceptance, magnetic targets, highlights, and hints. The older tier game stays available as a baseline.

This mode preserves the accepted tactile mechanics: actual cell geometry, pointer capture, synchronous drag state, 6-pixel lift threshold, gentle magnetic pull (0.28–0.62), forgiving target radius (at least 52 pixels or 95% of a cell), 190-ms flight, and 170-ms snap-back. The gentle existing sound palette is reused. Reduced motion removes motion while keeping outcomes unchanged.

## A complete small round

Eight board instances represent six distinct starters, with one extra Bird and Fern. All material needed for both gardens is present from the beginning. The extra starters are deliberate: six alone allow players to allocate shared resources to conflicting branches and stall before any finale. Eight remove that hidden resource trap without a random supplier or a grind loop.

- Bird + Map → Riverwing
- Key + Fern → Frond Key
- Riverwing + Frond Key → Wayfinder Garden
- Bird + Moon → Crescent Courier
- Cup + Fern → Fern Cup
- Crescent Courier + Fern Cup → Nightgarden Nest

Both gardens take six successful merges. Invalid attempts cost nothing. Pieces may move into empty spaces. A selected crafted piece can be cut into its exact original parents, including nested ancestry. Undo supports up to 100 board operations. Discovered art remains in the journal when a piece is consumed, cut, undone, or the board is reset. A reset asks before discarding the current arrangement and Undo history.

There is no timer, score, stamina, payment, or random collectible drop. The point of this slice is seeing the visual relationship and keeping an earned artwork, not padding the session length.

## Architecture toward a catalog well above 200

The production planning target is **288 genuinely distinct illustrated works**, with an initial budget of 48 starters, 144 intermediate works, and 96 final compositions. These are content targets, not assets already made. Seeds, recolors, board instances, and exported postcards do not count toward that number.

Catalog identity, board state, recipe relationships, and collection progress are separate:

- Immutable catalog entries have stable IDs, title, short label, rank, pack, description, and art URL.
- Recipes name explicit input and output IDs. Rank organizes the catalog; it does not authorize a merge.
- Board instances retain their real parent objects so reversible experimentation is exact.
- A versioned, isolated browser save stores the current round, Undo snapshots, discovered IDs, and sound choice.
- Validation rejects malformed saves, unknown IDs, invented ancestry, resource duplication/loss, and unsupported versions. The original game's storage is not reused.

Scale by authored themed envelopes and occasional cross-envelope correspondences, with about 8–16 relevant works visible per session. The active recipe graph and a bounded kit of pieces determine the board; the whole 288-item collection never floods a 25-cell board. Thumbnail/full-art variants should be loaded per active pack or opened artwork. The current 12 WebP assets total under 0.8 MB before HTTP compression.

Each envelope should yield a satisfying new discovery in a few meaningful decisions, followed by a coherent final composition. Later envelopes can add branching or cross-set recipes and depth without requiring hundreds of identical preliminary merges. Replay can pursue alternate compositions; missing ingredients should come from a transparent targeted supply or authored kit, never opaque random rarity. Before accepting a pack, test every legal inventory transition for solvability, exact-parent recovery, and conservation.

The next milestone after this slice passes phone/browser QA is one deeper envelope with genuinely alternative outcomes, tested for interest and legibility, then a consistent art-production specification and catalog batching. Do not generate hundreds of assets before that loop is accepted.

## Accessibility and resilience

Semantic buttons, descriptive piece/position labels, a roving keyboard focus target, arrow-key navigation, Enter/Space activation, visible focus, status announcements, 44-pixel utility controls, modal focus containment/return, safe-area padding, and reduced-motion support are part of the implementation. This remains a visual game. Automated semantics checks are not a claim of physical VoiceOver acceptance.

The board and discovered journal persist in this browser only. No account or cloud sync is added. If storage is unavailable, the game continues in memory and says so. Native file sharing and downloading are separate actions. The postcard is prepared before pressing Share to preserve the browser's user-activation window. Download instructions explain the iPhone Files app.

## Verification status at checkpoint

- Original 11 deterministic tests pass.
- New 10 deterministic tests pass, including exhaustive legal recipe inventories and both finale orders.
- Production build passes; direct dependencies and lock checksum remain unchanged.
- Independent review checked 25 reachable inventories, 50 cut/recombine cases, and 10,000 seeded move/merge/cut/save-load operations.
- Two source-level interaction races were repaired: old snap-back cleanup canceling a later gesture, and keyboard movement during a live drag producing a null round.
- Dialog cleanup is safe under React StrictMode effect replay; malformed discovery IDs are filtered as own catalog members.
- Browser execution in the local shell is blocked by the executor's socket restrictions; no local browser pass is claimed. A separately authorized single hosted verification job will provide WebKit/Chromium interaction, screenshot, and real postcard evidence. Its outcome must be recorded separately.

No merge or production deployment is part of this checkpoint.
