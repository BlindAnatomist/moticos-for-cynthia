# Implementation Status

Repository: `BlindAnatomist/moticos-for-cynthia`

Visibility: public

Default branch: `main`

Status date: 2026-07-30

## Project identity

Moticos for Cynthia is a fresh, independent visual game project. It is not a resurrection of the discarded earlier experiment and is not part of Val Music Vault or Guitar Eyes.

Moticos is intended to be visually appealing and fun for Cynthia. Cynthia's iPhone is the primary platform and acceptance authority. Desktop support is secondary. The owner is not responsible for visual quality assurance.

## Verified first playable

Baseline development branch:

`work/fresh-moticos-playable`

Draft pull request:

`1 — Fresh Moticos first playable`

The accepted first playable passed deterministic logic tests, production build, desktop and mobile-sized Chromium interaction tests, screenshot capture, a legal seven-merge route to Panel, postcard unlocking, and actual postcard PNG download.

Exact verified application commit before later documentation and publication-support changes:

`75ee8a17dd62c7101167ed98b5890aad352e0c21`

## Frozen Cynthia demo

Public address:

`https://blindanatomist.github.io/moticos-for-cynthia/`

The demo is served from a dedicated compiled `gh-pages` branch. It is a frozen snapshot and does not follow development branches automatically. Continuing development cannot alter Cynthia's current demo unless the compiled `gh-pages` branch is deliberately replaced.

Hosted acceptance run `30552836701` confirmed against the public address:

- page title `Moticos`;
- eight initial Clip tiles;
- a live drag merge scoring 20 points;
- merge count advancing to 1;
- highest tier advancing to Fragment;
- Undo restoring the initial state;
- Shuffle decrementing from 3 to 2;
- no console or page errors.

## Accepted generative collage iteration

Active iteration branch:

`work/generative-collage-iteration`

Draft pull request:

`2 — Generative collage iteration`

This branch is intentionally separated from both the frozen demo and the first-playable branch.

The iteration introduces:

- procedural miniature collages rather than plain color labels;
- unique visual DNA for every spawned Clip;
- merge ancestry that preserves material from both parent pieces;
- accumulated lineage counts and generated artwork titles;
- faint board residue where pieces were removed;
- a meaningful three-use Chop action replacing cosmetic Shuffle;
- collage-aware postcard rendering;
- a final Motico arrival presentation;
- a development-only all-tier visual gallery at `?gallery=1`;
- the singular final tier name `Motico`;
- iPhone safe-area support through `viewport-fit=cover` and environment insets;
- 44-point tap targets for phone controls;
- Mobile Safari WebKit as the primary automated browser gate.

Exact accepted branch head:

`deeb973f16231404abd8decf3729e406e72e2246`

Quality run `30562311268` passed:

- eight deterministic logic tests, including the final Correspondence-to-Motico merge and 128-scrap lineage;
- production Vite build;
- WebKit installation and execution;
- an iPhone 13 Mobile Safari profile;
- a large 430-by-932 Mobile Safari profile;
- secondary desktop Chromium coverage;
- 20 browser scenarios passed and one desktop-only skip;
- iPhone viewport containment and no horizontal overflow;
- 44-point tap-target verification;
- sound toggle and New board through touch taps;
- merge, Undo, Chop, residue, scoring, and lineage behavior;
- legal progression to Panel;
- actual postcard PNG downloads in both iPhone profiles;
- final Motico arrival containment and dismissal;
- all-tier gallery rendering.

Visual inspection of the exact evidence confirmed that the initial board, post-merge board, Chop state, Panel state, final arrival, progression, and postcards remain legible and composed on both iPhone sizes. The sound button is no longer blocked by the title.

Evidence artifact:

`sha256:920583cf2d11020f163e870a00f17876d6e4eee1a1a2cb18104209b106740956`

## Current boundaries

- `main` remains unchanged.
- Draft pull requests 1 and 2 remain open and unmerged.
- The public Cynthia demo remains the verified first-playable snapshot and has not been replaced.
- The generative iteration is automatically accepted for iPhone-oriented preview publication, but it has not yet received real-device play-experience feedback from Cynthia.
- Do not replace the root demo or merge either pull request without separate authorization.
