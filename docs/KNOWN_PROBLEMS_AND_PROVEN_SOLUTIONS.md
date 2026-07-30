# Known Problems and Proven Solutions

This is the consolidated operational memory for Moticos.

Record a problem only after it has occurred and its cause or solution has evidence. Do not import unrelated incidents from other repositories.

## Repository-wide proven standards

### Change method after two confirmed failures

When the same connector, transfer path, command, workflow, or deployment mechanism fails twice for the same established reason, stop repeating it and choose a materially different route.

### Visual interaction failures are geometry and state failures

For drag-and-drop defects, inspect the actual target geometry, pointer capture, animation state, responsive dimensions, and delayed state transitions. Do not patch only the visible symptom.

The blind owner must not be asked to validate visual alignment or appearance that can be inspected through screenshots and browser tooling.

## Proven incidents

### MOT-001 — Grid arithmetic targeted the wrong visual cell

Status: `proven`

First observed: 2026-07-29

Affected area: drag-and-drop targeting and merge flight

#### Symptoms

The supplied component divided the board's outer rectangle into six equal bands. The rendered board also contained padding and grid gaps, so pointer coordinates near cell boundaries could resolve to the wrong target and the merge flight could end off-center.

#### Cause

Interaction geometry was inferred from the board container instead of read from the rendered cell elements.

#### Proven solution

Each cell now carries a stable `data-cell-index` and DOM reference. Drop targeting uses `document.elementFromPoint`, and flight centers use the target cell's actual bounding rectangle. Desktop and mobile-sized Chromium merge tests passed in Quality run 4.

#### Prevention rule

Use rendered target geometry for pointer interactions whenever CSS gaps, padding, transforms, or responsive sizing affect layout.

#### Scope

Repository-wide interaction standard.

### MOT-002 — Eight unique tiers created a permanent dead board

Status: `proven`

First observed: 2026-07-29

Affected area: tile spawning and game continuity

#### Symptoms

A board containing one tile from each of the eight tiers had no legal merge. Because Moticos allows equal tiles to merge from anywhere, changing positions with Shuffle could not create a match.

#### Cause

Every spawn was always a Clip, with no continuity rule for a board lacking duplicate tiers.

#### Proven solution

Normal spawns remain Clips while a merge exists. When no duplicate tier remains, the next spawn copies one existing non-top tier, guaranteeing a rescue match. Deterministic unit tests cover detection and rescue behavior.

#### Prevention rule

Game-continuity mechanics must restore a legal action, not merely rearrange an impossible state.

#### Scope

Moticos game logic.

### MOT-003 — Vitest collected the Playwright suite

Status: `proven`

First observed: 2026-07-29

Affected area: automated verification

#### Symptoms

The first quality run passed all six game-logic tests but failed because Vitest also collected `tests/e2e/moticos.spec.js` and attempted to execute Playwright's `test.beforeEach`.

#### Cause

The generic `vitest run` command searched both unit and browser-test directories.

#### Proven solution

The unit script now targets `tests/gameLogic.test.js` explicitly. Playwright remains isolated under `npm run test:e2e`. The corrected quality run passed unit, build, and browser stages.

#### Prevention rule

Different test runners must have explicit, non-overlapping collection boundaries.

#### Scope

Repository automation.

### MOT-004 — Repeating fiber texture produced visible wallpaper seams

Status: `proven`

First observed: 2026-07-29

Affected area: page background

#### Symptoms

Desktop and mobile screenshots showed the paper-fiber SVG repeating in conspicuous vertical bands that competed with the board.

#### Cause

The turbulence tile was not stitched at its boundaries and used enough opacity to make each repeat conspicuous.

#### Proven solution

The fiber turbulence now uses `stitchTiles="stitch"` and lower opacity. Final screenshots must confirm that the surface reads as paper rather than tiled wallpaper.

#### Prevention rule

Inspect procedural textures at full-page scale; a locally attractive tile can become distracting when repeated.

#### Scope

Moticos visual design.

### MOT-005 — Tier label broke in the middle of a word

Status: `proven`

First observed: 2026-07-29

Affected area: tile typography and progression visibility

#### Symptoms

Post-merge desktop and mobile screenshots showed `FRAGMENT` split into arbitrary letter groups inside the tile. The pale Fragment swatch was also difficult to distinguish from the page background.

#### Cause

The tile label permitted breaking anywhere and retained a minimum font size too large for longer tier names. The progression relied on a clipped box shadow that did not produce a dependable visible edge.

#### Proven solution

Tier labels now remain on one line and use tier-length-aware maximum sizes. Unlocked progression swatches now use a nested dark silhouette behind the colored shape, producing a true shape-following border. Final screenshots must verify Fragment at desktop and mobile sizes.

#### Prevention rule

Do not rely on arbitrary word breaking inside compact visual tokens; define deliberate typography for the longest real label.

#### Scope

Moticos tile and progression typography.

### MOT-006 — Decorative title intercepted the iPhone sound control

Status: `proven`

First observed: 2026-07-30

Affected area: iPhone header interaction

#### Symptoms

The sound icon was visible and its button measured 44 points, but Mobile Safari WebKit could not tap it. Playwright reported that the `MOTICOS` heading intercepted every pointer attempt in both tested iPhone profiles.

#### Cause

The absolutely positioned sound button occupied the same header layer as a full-width heading box. The visible text did not appear to overlap the icon, but the heading's rectangular hit region still covered the control.

#### Proven solution

The decorative heading now uses `pointer-events: none`, while the sound button retains its own 44-point interactive target. Quality run `30562311268` passed the exact touch tap in both the iPhone 13 and 430-by-932 Mobile Safari WebKit projects.

#### Prevention rule

Do not judge mobile hit testing from visible artwork alone. Verify the actual topmost hit region with real tap actions in the target browser engine, especially when absolute controls overlap full-width decorative elements.

#### Scope

Repository-wide iPhone interaction standard.

## Incident entry template

### MOT-000 — Concise problem name

Status: `investigating`, `proven`, `failed-do-not-repeat`, or `superseded`

First observed: YYYY-MM-DD

Affected area:

#### Symptoms

Describe what the player, test, workflow, or hosted environment actually did.

#### Cause

State the established mechanism and distinguish evidence from inference.

#### Failed approaches

Record attempted approaches that failed or should not be repeated.

#### Proven solution

Describe the exact solution that worked, including files, commits, tests, screenshots, or acceptance evidence.

#### Prevention rule

State the reusable rule.

#### Scope

State whether the rule is component-specific, repository-wide, or a candidate for use elsewhere.
