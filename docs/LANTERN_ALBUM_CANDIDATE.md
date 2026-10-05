# Lantern Studio and a lasting collection

## Boundary

Repository: `BlindAnatomist/moticos-for-cynthia`, public. Local branch: `work/atelier-progression-20261004`. Starting commit: `d4c98b265dc29d627371aa6d9771765343f834b4`, the exact source of accepted Site version 4. Public counterpart: `0fcd3a3792d35fbedc7b5f94bbd5acb2bccf56ea`.

This checkpoint is local only. No push, PR, GitHub Actions run, merge, public art release, sharing change or Site deployment is included. Existing unrelated PRs are outside this assignment. The accepted version 4 and its thirty artworks remain the live baseline.

## Implemented slice

Lantern Studio adds ten original authored pieces in two matching families:

- Paper Lantern → Folded Glow → Lantern House → Lantern Tower → Lantern Palace
- Coral Spool → Ribbon Spool → Ribbon Bloom → Ribbon Loom → Ribbon Pavilion

The collection now has forty distinct authored pieces, eight final worlds and twenty-four optional postcard designs. Repeated instances, optimized crops, alternate exports and recolors do not add to the count. Forty is an intermediate checkpoint toward well above two hundred pieces, not completion of that goal.

The fourth envelope uses `moticos.matching.lantern-studio.v1`. It preserves the same two five-tier families, sixteen starter units per family, four initial pieces, six finite pair draws per family, thirty forward merges and twelve pair draws to both finales. Three same-family merges earn the first postcard. Identical pictures alone merge. No payment, waiting, randomized supply, new economy or content lock is introduced.

## The album now remembers what was earned

The Envelopes and Collection dialogs share whole-collection totals for discoveries, final worlds and postcards. These are derived from existing envelope saves and temporary tab sessions; no new persistence schema or secondary index is needed.

Final-world credit comes from permanent discoveries, not from whether a finale is currently sitting on the board. Cut, Undo and a fresh envelope no longer make a collected world disappear from the album. Each chooser card includes the five authored steps in both families and a concrete next-discovery recipe. The closest unfinished family is suggested, with authored order breaking ties. It is only a suggestion; all envelopes remain freely available.

The collection has one labeled native envelope selector instead of a growing row of tabs. The chooser can show all envelopes, in-progress envelopes, envelopes with both worlds collected or unopened envelopes. Empty filters have a clear recovery path. All of this stays inside the existing dialogs. The play surface gains no extra row, heading or persistent panel.

## Read-only collection semantics

- Browsing an unopened envelope shows zero discovered pieces and does not create a session, write storage or grant its two starter discoveries.
- Actually opening its board retains the engine's accepted two-starter discovery behavior.
- Active and cached temporary discoveries remain visible and labeled. Corrupt/future/inaccessible saves are neither overwritten nor credited with invented progress.
- A cached board that differs from newly read storage stays the tab's board and is marked temporary; the album never resolves that conflict or silently takes another tab's data.
- Storage events for registered envelope keys refresh an open album. Unknown external keys do not affect it.
- Existing per-envelope write guards, Undo histories, discovery retention and original-save download behavior are unchanged.

## Growing beyond two hundred

This slice implements collection navigation, cumulative progress and a content-admission validator, rather than merely repeating an extra ten-item list. The existing explicit family-route contract can register more than twenty envelopes without changing game rules or old save bytes. Only the active board mounts; chooser previews and the selected collection's images load lazily. Whole-collection reads occur in dialogs, never on each board action or during dragging.

Further content should arrive as authored thematic groups with distinct silhouettes, not a large undifferentiated image batch. The content pipeline should be sized for roughly 300 or more authored pieces, which the current two-family contract could represent as thirty envelopes. This is a capacity-planning scenario, not a fixed content list or permission to generate hundreds of pictures blindly. Exact themes and grouping remain an editorial decision. Each family needs a recognizable object identity that survives growth, meaningful silhouette changes at every level and concise compact labels. Final worlds should be compositionally distinct, rather than enlarged versions of the same object.

Pacing stays finite and understandable while the album supplies the longer arc. Future pacing/mechanic changes should receive their own explicit design and browser gates; expansion is not permission to introduce locks, waits, random rewards or a different matching rule. The new validator checks every registered piece's identity, asset uniqueness, route mass, crop coverage, concise label and predicted compact ink size. It does not substitute hashes or geometry for visual judgment.

Before each additional group is admitted: prove save isolation and old-byte compatibility; check all new art at compact and postcard sizes; check full progression, every postcard and one-screen geometry in WebKit/Chromium; inspect actual pixels independently. A future large collection also needs aggregate localStorage quota and loading measurements. Current quota failures preserve temporary play without eviction; there is no claim that hundreds of independent dense histories fit every browser's storage allowance.

## Verification and release gates

Exact results and image/source hashes are recorded in `docs/verification/lantern-album/` after the final integrated check.

The prepared browser suite covers the full original regression set and new four-envelope progression, six new postcard exports, read-only album browsing, filters, next discovery, permanent credit after reset/Undo, four-way navigation, corrupt/future saves, cross-tab changes, dialog focus and new-piece one-screen geometry. It collects 246 cases across the two iPhone WebKit emulations and desktop Chromium. Collection is not execution.

Local loopback/browser execution was previously denied in this environment. No bypass was attempted. Browser execution and direct rendered UI/postcard pixel review remain required before any release claim. The prepared workflow is inert except on `verify/lantern-album-20261004`: one standard Ubuntu job, thirty-five-minute cap, two browser workers, zero retries and one-day evidence. It must not be triggered without fresh approval under the owner's current Actions rule. No budget or spending setting may be changed.

The old one-screen rules remain: supported default-size phone boards and essential controls fit without scrolling; the 320×480 and enlarged-text fallbacks may scroll while keeping controls readable and reachable. This checkpoint does not claim physical-iPhone Safari or assistive-technology acceptance. Routine validation belongs to agent-operated QA. Cynthia is not needed for this increment.
