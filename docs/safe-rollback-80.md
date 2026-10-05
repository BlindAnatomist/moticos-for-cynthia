# Moticos: private 80-playable recovery candidate

## Decision boundary

This is a prepared rollback candidate, not an executed rollback or release approval. Nothing has been pushed, published, deployed, uploaded, or run in GitHub Actions. No live or player storage has been accessed. All test saves are synthetic.

Use this candidate instead of blindly restoring the old 80-piece JavaScript after compact v2 saves exist. It preserves the reviewed dual v1/v2 decoder and session guards. It also retains text metadata for the four additional envelopes, so a player can find, read and back up those saves during the rollback.

Runtime, original artwork, dependency lock and build authority are pinned in `tests/verification/rollback-authority.json`. Its inventories contain only repository-relative paths, byte counts and cryptographic hashes. CI compares against those reviewed records and never regenerates them.

## Player-visible behavior

- The original eight envelopes and 80 pictures remain playable, with unchanged artwork, catalogs and game rules. Default `dev` and `build` scripts explicitly select the 80-piece batch to avoid accidentally producing the historic 40-piece app.
- The Collection and Envelopes dialogs explain the recovery edition and expose “View and back up preserved saves”.
- `?save-recovery=1` opens the read-only recovery page. Direct saved links to any of the four newer envelopes also open recovery instead of silently showing Garden.
- Small Talk (Hand Signals / Face Value), Hello Again (Line Again / Hat Trick), Off Beat (Fine Teeth / Cut Time), and Return Mail (Return Post / Shell Mail) are read-only. Their boards, discoveries, sound and up to 100 retained Undo snapshots are decoded with the exact reviewed runtime and exact retained identities.
- Each envelope has named family progress, discovered piece names, a named current-board list, and an expandable complete v1 record including every Undo snapshot. Missing saves receive no starter-discovery credit. Corrupt, unknown-version or inaccessible saves are labelled honestly.
- The newer forty images are absent. Their play controls, visual collection images and postcard PNG export are unavailable. A JSON save backup does not replace a postcard image.
- Viewing recovery never creates sessions, writes, migrates, deletes, resets, or repairs storage. Returning to the board retains the same session cache, including temporary work. Back/Forward route handling is covered by deterministic handler tests.
- Every download re-reads all twelve known storage keys, capturing exact original bytes and separate validated canonical v1 saves plus all catalog names/identities. It also includes any blocked or stale tab's temporary v1 state separately and the source seen when that session opened. It never silently chooses a stale tab over stored data.
- Downloads are local JSON files, with no network transmission. The interface asks the player to verify that the download actually arrived. Reads occur per key, not as an atomic multi-key transaction. A concurrently active tab can change after capture.
- Invalid/future data is preserved as raw text but is not claimed to be decoded. If browser storage denies a read, those inaccessible bytes cannot be included; the UI and export disclose that limitation.

## Returning to 120 pieces and recovering a backup

If the compatible 120-piece edition returns at the same website origin and browser profile, its exact keys and decoder read all twelve retained saves directly. No recovery import or overwrite is required. This has been verified against the approved combined candidate using both raw sources and exported canonical v1 records, all with 100 retained snapshots.

There is deliberately no import UI. The JSON backup is usable evidence for a separately approved recovery tool or assisted restoration. Never put the whole bundle into an envelope key, replace a current save without a conflict review, or erase site data. Any later restoration should validate each candidate against its exact envelope catalog, compare current stored bytes, retain both conflicting versions, and require authorization before writing. No such write is part of this task.

Browser eviction, cleared website data, a different origin/profile, private browsing expiry, power loss, and simultaneous cross-tab atomicity are not solved by this candidate. Keep the downloaded backup outside website storage.

## Verification completed

- 231 existing deterministic tests, including protected-source, per-envelope, geometry-handler, album and game-rule regressions.
- 15 existing batch tests.
- 83 rollback/capacity/routing tests, including 2,400 successive Undo comparisons (twelve envelopes × two storage formats × 100 snapshots), discoveries/sound preservation, all-key export, corrupt/future/unavailable sources, v1 migration, stale conflict, quota failure, local download contents, and repeated recovery/history navigation.
- Independent-source comparison: exact retained metadata and all twelve exported/raw saves readable by the approved 120-piece runtime, zero recovery storage writes.
- Default 80-piece build, batch 80-piece build, and explicit rollback build. Production outputs have all accepted public bytes and all forty batch WebPs unchanged; no new forty-piece artwork is included.
- Browser cases collected only: 48 cases across desktop Chromium and two iPhone WebKit sizes. Zero browser cases executed and zero screenshots inspected. Twelve additional offline plan/reporter checks cover the bounded supplemental matrix.

The single local Chromium availability attempt failed because this executor prohibits the browser's required socket operation. The exact failure is retained. The restriction was respected; no alternative browser route or Actions run was attempted. Native React scheduling, dialog focus/scroll restoration, device layout, actual file downloads, WebKit behavior, and real browser storage quota/eviction remain unverified here.

The browser suite uses only synthetic data and awaits the parent's separate execution decision. Its sixteen cases per profile are specified in `safe-rollback-browser-plan.md`: visible preserved records/history, both recovery entry points, non-default navigation, native JSON freshness/failure/conflict/quota exports, full Garden Undo and batch v2 resume, all ten decoded artworks in each playable envelope, and eight representative native postcard PNGs per profile (24 total). It is additional rollback coverage, not a claim that the existing 80-piece browser acceptance matrix was rerun.

## Reproducible local verification

Run from the candidate directory with the pinned dependencies:

1. `npm test`
2. `npm run test:batch`
3. `npm run test:rollback`
4. `npm run build`
5. `npm run build:batch`
6. `npm run build:rollback`
7. `node scripts/verifyRollbackBuild.mjs`
8. `node ../scripts/verify-reentry.mjs` using the accompanying byte-pinned approved-reference modules.
9. `node node_modules/@playwright/test/cli.js test --config=playwright.rollback.config.js --list` lists coverage without browser execution.

The in-tree authority and complete source inventories make this verification tree independently runnable. Do not replace a frozen inventory to make a failed comparison pass. The default `dist` and explicit `dist-rollback` outputs reproduce the same reviewed 80-playable build. Historical batch verification is separate from this focused rollback gate.
