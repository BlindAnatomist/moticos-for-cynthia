# Implementation Status

Repository: `BlindAnatomist/moticos-for-cynthia`

Visibility: public

Default branch: `main`

Status date: 2026-07-31

## Product authority

Moticos is a visual, collage-inspired iPhone-first game for Cynthia. Cynthia's physical iPhone is the primary human acceptance platform. Mobile Safari WebKit is the primary automated browser gate. Desktop support is secondary.

`Moticos` is singular. It is an anagram of `osmotic` and is the authoritative name of the final form.

The owner is not responsible for visual quality assurance. Automated browser interaction, screenshots, postcard exports, and direct agent inspection must precede any request for Cynthia to test.

## Public versions

### 1. Frozen first playable

Public address:

`https://blindanatomist.github.io/moticos-for-cynthia/`

Exact verified application commit:

`75ee8a17dd62c7101167ed98b5890aad352e0c21`

This root demo remains frozen and does not follow development branches automatically.

### 2. Generative collage preview

Public address:

`https://blindanatomist.github.io/moticos-for-cynthia/collage-preview/`

Exact accepted application commit:

`deeb973f16231404abd8decf3729e406e72e2246`

Quality run:

`30562311268`

This version introduced unique procedural miniature collages, inherited visual ancestry, lineage counts, generated titles, residue, the three-use cutting mechanic, collage-aware postcard export, final arrival presentation, the all-tier gallery, iPhone safe-area support, 44-point controls, and Mobile Safari WebKit verification.

### 3. Found-composition preview

Public address:

`https://blindanatomist.github.io/moticos-for-cynthia/found-composition-preview/`

Exact application commit:

`986d4a4415f88faeecdbed6e714a27ebb2644fbe`

Hosted verification run:

`30572688304`

This version introduced the five-by-five board, larger pieces, magnetic near-miss acceptance, stronger lift-and-snap behavior, visible possible matches, a 20-piece composition carrying 128 scraps, and a 19-merge route to the final form.

### 4. Cynthia-feedback preview

Public address:

`https://blindanatomist.github.io/moticos-for-cynthia/cynthia-feedback-preview/`

Exact verified application commit:

`cf9d0b114e258839676b76b64962cdd5e159e2cc`

Exact quality run:

`30648298231`

Hosted verification run:

`30649489120`

Hosted evidence artifact:

- artifact ID: `8800817868`;
- SHA-256: `e986cc88cb44f346e37b4e529ba71fdcc4b6dedbeae60a36368c027e278c2e17`.

The fourth directory was added without replacing any earlier public version. Publication PR 9 was closed without merging.

## Cynthia real-iPhone feedback authority

Cynthia tested the found-composition version on her physical iPhone.

Accepted behavior:

- she liked the dragging and piece movement;
- she thought the game was pretty;
- the five-by-five tactile interaction should be preserved.

Requested refinement:

- replace sharp high-frequency sounds with gentler material sounds;
- remove confusing generated text such as number-and-name combinations;
- lengthen the session without returning to the 127-merge route;
- introduce bonuses or discoveries before the final artwork;
- make generated pieces more intentionally composed and less randomly accumulated;
- significantly improve the progression area;
- clearly distinguish native sharing from downloading and explain where downloads go;
- preserve singular `Moticos` terminology;
- rename the action from `Chop` to `Cut` while retaining `Chop` as a tier;
- offer both a found-pieces route and a route beginning from individual scraps.

## Implemented Cynthia-feedback refinement

The exact verified application includes:

- the accepted magnetic drag mechanism preserved in purpose and feel;
- a gentle material audio palette using low-pass pink and brown noise and muted low tones, with no bright ping effects;
- generated-title sanitization so bare numbers and Cynthia's name cannot accidentally form path-like or account-like text;
- a 25-piece `Found Pieces` route completing in 24 merges;
- a `From Scraps` route completing in 31 merges while converging on 128 scraps;
- correspondence discoveries every six meaningful moves;
- earned Keepsakes that preserve a chosen focal fragment through the next merge;
- a composition grammar with focal, support, accent, and structural roles, controlled density, negative space, palette coordination, and recomposition across merges;
- a two-column iPhone `Path to Moticos` archive with clear tier names, states, and current-stage emphasis;
- separate `Share postcard` and `Download postcard` actions;
- native file sharing through the iPhone share sheet when available;
- explicit confirmation that Safari downloads are found in Downloads in the Files app;
- final-tier and arrival language corrected to singular `Moticos`;
- the action renamed `Cut` while the tier remains `Chop`;
- transient reward and Keepsake notices implemented as pointer-transparent overlays so they never move the board during a gesture;
- synchronous drag-state handling so pointer-up cannot read stale React state.

## Exact verification record

Quality run `30648298231` passed:

- 11 deterministic game-logic, lineage, route, Keepsake, title, art-grammar, and audio-profile tests;
- production Vite build;
- iPhone 13 Mobile Safari WebKit;
- large 430-by-932 Mobile Safari WebKit;
- secondary desktop Chromium;
- 32 browser scenarios;
- one intentional desktop skip for the iPhone-only layout gate;
- complete `Found Pieces` progression through 24 real drag merges in all three browser profiles;
- complete `From Scraps` progression through 31 real drag merges in all three browser profiles;
- magnetic near-miss merge and Undo;
- Cut and board preservation;
- Keepsake earning, arming, and focal-fragment preservation;
- found-piece discovery;
- native share path;
- actual postcard downloads and explanatory confirmation;
- final Moticos arrival;
- recomposed all-tier gallery;
- screenshot and postcard evidence upload.

Primary evidence artifact:

- artifact ID: `8800502464`;
- SHA-256: `620862e04d4501ce8dfedd7d9b55d4d7f8e99ee0cf1585a5ac2229db73aba08d`;
- 27 evidence files.

Direct visual inspection of every screenshot set and all three postcard exports confirmed:

- no horizontal overflow, clipped board, displaced controls, or broken iPhone safe-area layout;
- the two starting routes are clear and visually distinct;
- the 25-piece board remains readable on both iPhone sizes;
- progression names, including `Correspondence`, are fully legible;
- found, made, waiting, and current progression states are distinguishable;
- reward notices do not reflow or obstruct play;
- Keepsake preservation is visible without overwhelming the artwork;
- Cut, magnetic merge, route discovery, and final arrival states remain composed;
- the final dialog fits both iPhone profiles;
- postcards are framed correctly and preserve distinct generated boards;
- the recomposed pieces show stronger hierarchy and intentional negative space than the previous version.

Hosted run `30649489120` then confirmed the public fourth preview in Mobile Safari WebKit:

- exact application marker `cf9d0b114e258839676b76b64962cdd5e159e2cc`;
- all four Pages entries present;
- the first three index blobs unchanged;
- 25-piece starting field;
- eight progression stages;
- sound-control interaction;
- both route selectors;
- a real hosted drag merge;
- no browser console or page errors;
- hosted screenshot capture and direct visual inspection.

## Current boundaries

- `main` remains unchanged.
- Draft PR 2 remains open and unmerged.
- All four public versions remain available.
- The fourth preview is the current Cynthia-feedback candidate.
- Exhibition Mode remains deferred until the human game is stable.
- No paid service or infrastructure was introduced.
