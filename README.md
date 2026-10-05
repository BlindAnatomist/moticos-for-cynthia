# Moticos

A visual, identical-picture merge game with authored collage families. Two copies of one picture advance to the next picture in the same five-stage chain.

This rollback verification candidate plays the accepted 80 pictures across eight envelopes by default. Both `npm run dev` and `npm run build` explicitly enable that 80-piece collection. `build:batch` and `build:rollback` also produce 80-playable builds. The four newer envelopes from the 120-piece candidate are read-only here: players can see their named saved progress, retained Undo history and local JSON recovery export. Their newer pictures and postcard PNGs are unavailable in this edition.

Read [the recovery runbook](docs/safe-rollback-80.md), [focused browser plan](docs/safe-rollback-browser-plan.md) and [bounded execution gate](docs/rollback-browser-gate.md) before a runnable handoff. This preparation does not authorize a browser run, Actions, publication, deployment, upload or player-data change.

## Local checks

- npm ci (only when preparing an authorized dependency environment)
- npm test
- npm run test:batch
- npm run test:rollback
- node node_modules/vitest/vitest.mjs run tests/rollbackBrowserPlan.test.js tests/rollbackGate.test.js tests/rollbackCoverage.test.js tests/playwrightInvocation.test.js
- npm run build
- npm run build:batch
- npm run build:rollback
- node scripts/verifyRollbackBuild.mjs

The in-tree `tests/verification/rollback-authority.json` and `rollback-frozen-inventory.json` carry the pinned authority for parity checks without private checkpoint files. Browser listing starts no browser. The focused rollback gate supplements the historical 80-piece evidence; it does not rerun or replace that entire matrix. Native browser evidence, downloaded-file inspection, actual screenshots and all 24 sampled postcard PNGs still require separate execution approval and review.

## Preservation

The original 80 artworks, envelope identities and game rules stay unchanged. The exact reviewed decoder and session guards read legacy v1 and compact v2 saves without deleting or pruning histories. The four newer save keys and eight families remain visible through a read-only recovery page. Backup downloads keep exact raw sources, validated v1 saves and temporary/conflicting tab state separately; no automatic import or overwrite occurs.

No existing main or live preview was changed. A future 300-piece collection still needs its own storage, performance, content and play-experience evidence.
