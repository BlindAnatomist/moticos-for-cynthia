# One-screen matching layout candidate

Status: isolated, unpublished implementation; browser acceptance pending.
Base: test-fixture correction `43f0a43e3523d0d823751c8becf119148680e73e`.
The accepted public version 3 and prior candidate remain unchanged.

## What the prior evidence proves

The five-by-five board itself was within both recorded phone viewports. The entire play surface was not. The screenshot helper used full-page captures, which made a tall page look like one complete screen.

- iPhone 13 profile: actual viewport 390×664 CSS px, device screen 390×844; full page 390×938. Board approximately y203–569, supply y579–634, tool buttons y719–767.
- Large profile: viewport and screen both 430×932; full page 430×954. Board approximately y179–585, supply y595–650, tool buttons y735–783, footer buttons ending around y934.
- Bounds above are from inspected recorded pixels (rounded), not retained DOM rectangles. Viewports are confirmed from Playwright trace context metadata and the installed device descriptor.
- Initial screenshots from the accepted expansion evidence and third-envelope evidence are byte-identical for each size: iPhone 13 SHA256 `6454d1fa712653758c456a8766a80e8eaceb075472c7d9f42b44341204328f26`; large SHA256 `96cf103b357e6becc76718ecc4079fab007e4fee506e92f9aaff4d7fd3b33d3f`.
- Existing tests checked horizontal overflow, minimum targets, and the board's bottom, but not every control's viewport containment or document-height overflow.
- The failing chooser test concerned a separately scrolling dialog. Its test fixture tried to scroll a button already visible. That issue did not cause the tall main play screen.

## Layout contract

At standard text size, all 25 board cells, both supply buttons, Sound, Help, Undo, Cut, Hint, Collection, Envelopes, Postcard and Fresh envelope must fit in one viewport. Exact target viewports are 320×568, 390×664, 430×752 (explicit toolbar allowance), and 430×932. Fit means no clipping, covered controls, auto-scroll dependency, page overflow or undersized hit targets.

The board receives the remaining height after compact readable controls. It is square and width/height constrained; its 252px minimum has 44px cells (five cells plus 32px total padding/gaps). Labels use 10px rather than the prior 8–9px compact styles, wrap without ellipsis, and preserve full accessible names. Artwork and text must still pass pixel inspection; arithmetic does not establish visual quality.

The long introductory heading remains available to screen readers, while the visible header contains title, current envelope and discovery progress. Selected-piece detail and operational feedback remain visible. Save protection has a persistent visible warning control; its existing full explanation and original-save download remain in a focused, dismissible dialog. All entry points remain on the play screen.

Small viewport units keep the layout budget stable against Safari toolbar expansion. Safe-area padding is subtracted. Text enlargement intentionally switches to a taller, readable five-column grid and permits vertical scrolling. Very short viewports and browsers lacking container-query units use honest natural-flow fallback. No claim is made that arbitrary zoom, safe-area combinations, landscape or old browsers fit one screen. No page-overflow clipping is used to simulate success.

Matching identities, supplies, saved-board formats, inventory, collection retention, postcards and reset confirmation are unchanged. Resize cancels an unfinished drag; an already committed merge remains committed and only its decorative flight is retargeted.

## Research provenance

No cited prior comparative merge-game screen-layout study was located in the candidate design documents. Do not claim one was previously performed. Those documents recorded the user's correction from heterogeneous recipes to identical-piece merging.

Official sources checked during this review:
- Travel Town, The Merge Board: https://support.traveltowngame.com/hc/en-us/articles/4833664499090-The-Merge-Board
- Travel Town, How to Sell Items: https://support.traveltowngame.com/hc/en-us/articles/4833675472786-How-to-Sell-Items
- Travel Town, What are Board Items?: https://support.traveltowngame.com/hc/en-us/articles/4833684165522-What-are-Board-Items

These describe a board-centered main play area, matching identical items, and bottom-of-screen inventory/item controls. They support immediate main-play access, but do not establish a universal screen-layout rule for every merge-game subgenre.

Implementation compatibility reference: Safari 16 supports size container queries and cqw/cqh units: https://webkit.org/blog/13152/webkit-features-in-safari-16-0/

## Verification gate

Local verification passed: 129 engine/component tests, production build, and finite-inventory validation for all three envelopes. The matching-only browser list contains 213 cases, including 57 new layout cases. No browser case has run for this candidate.

Local engine/component tests and build are necessary but cannot validate browser pixels. The prepared inert workflow runs all matching-mode tests plus strict new layout checks in WebKit iPhone profiles and Chromium, excluding 66 unaffected historical classic/recipe cases. Standard Linux runner, two workers, zero retries, 35-minute job cap, one-day artifacts. It never deploys. A separate approval is required before its verification branch is pushed.

Required browser outputs include viewport-only PNGs and measured geometry, all 30 pieces across real progression, control hit/occlusion bounds, full/exhausted/completed boards, warning recovery, modal return, keyboard behavior, resize during interaction, and simulated text enlargement. Simulated enlarged fonts are not real-device Safari zoom or VoiceOver testing. Real iPhone and VoiceOver verification remain distinct limitations.
