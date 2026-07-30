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

The demo is served from a dedicated compiled `gh-pages` branch. It is a frozen snapshot and does not follow development branches automatically. Continuing development cannot alter Cynthia's current demo unless the compiled root files on `gh-pages` are deliberately replaced.

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

Exact accepted application commit:

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

## Published generative collage preview

Public iPhone preview address:

`https://blindanatomist.github.io/moticos-for-cynthia/collage-preview/`

The accepted application was compiled with project-relative asset paths and published only inside `gh-pages/collage-preview`. The frozen root demo was not replaced. Its root `index.html` blob remained:

`71a34b8ed4421f3710c923cdcba91a7231a05254`

Hosted verification run `30565696221` passed:

- accepted-application byte verification against commit `deeb973f16231404abd8decf3729e406e72e2246`;
- isolated production build;
- root-demo preservation check before and after publication;
- GitHub Pages availability at the separate subdirectory;
- Mobile Safari WebKit load at an iPhone 13 viewport;
- eight initial Clip tiles;
- a real WebKit tap on the sound control;
- a live Clip-to-Fragment merge;
- merge count advancing to 1;
- score advancing to 20;
- no browser console or page errors;
- hosted screenshot capture and visual inspection.

Hosted evidence artifact:

`sha256:c24f69911c58d823f66c20f8c97161978b25e1678e1f7ffd10e927ef735e06ee`

The one-use publication workflow was removed after verification. Publication PR 3 was closed without merging.

## Current boundaries

- `main` remains unchanged.
- Draft pull requests 1 and 2 remain open and unmerged.
- The original root demo remains available and unchanged.
- The accepted generative iteration is now available at the separate `collage-preview` address for Cynthia's real-iPhone play-experience test.
- Real-device feedback should evaluate comfort, beauty, clarity, sound, and desire to continue—not basic functionality already covered by automation.
- Do not replace the root demo or merge either implementation pull request without separate authorization.
