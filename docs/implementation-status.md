# Implementation Status

Repository: `BlindAnatomist/moticos-for-cynthia`

Visibility: public

Default branch: `main`

Status date: 2026-07-30

## Project identity

Moticos for Cynthia is a fresh, independent visual game project. It is not a resurrection of the discarded earlier experiment and is not part of Val Music Vault or Guitar Eyes.

Moticos is intended to be visually appealing and fun for Cynthia. It is not being designed as a VoiceOver game for the owner. The owner is not responsible for visual quality assurance.

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

## Generative collage iteration

Active iteration branch:

`work/generative-collage-iteration`

This branch is intentionally separated from both the frozen demo and the first-playable branch.

The iteration candidate introduces:

- procedural miniature collages rather than plain color labels;
- unique visual DNA for every spawned Clip;
- merge ancestry that preserves material from both parent pieces;
- accumulated lineage counts and generated artwork titles;
- faint board residue where pieces were removed;
- a meaningful three-use Chop action replacing cosmetic Shuffle;
- collage-aware postcard rendering;
- a final Motico arrival presentation;
- a development-only all-tier visual gallery at `?gallery=1`;
- the singular final tier name `Motico`.

The candidate remains unaccepted until logic tests, production build, desktop and mobile browser interaction, all-tier gallery screenshots, and exported postcard inspection pass on the exact branch head.

## Current boundaries

- `main` remains unchanged.
- Draft pull request 1 remains open and unmerged.
- The public Cynthia demo remains unchanged.
- Do not republish the demo from the generative branch until the iteration has passed visual and functional acceptance.
