# Narrow small-screen art and verification-efficiency repair

Status: local only; browser re-verification is not authorized or started.
Base: one-screen candidate 10ff53fdec4243ca3f6f55adad98e4e70c03dcdb, tested publicly as 7b0e5c2e1984572a9d3fb81862e5d51d3e76275a.

## What the completed attempt established

GitHub run 37216957348 started 2026-10-04 16:29:35 UTC. The browser suite began at 16:31:18.968 and was cancelled at 17:04:51.471. Evidence upload finalized at 17:05:28.996, after the cutoff. Setup took about 1m44s and browser execution 33m32.5s. The approved job cap was 35 minutes; it was not extended.

The absence of a final reporter summary means there is no official final pass tally. Log reconstruction found 127 starts: 122 completed without a reported failure, 3 individual test timeouts, 2 unresolved when cancelled, and 86 not observed starting. Do not call unstarted or interrupted cases passes. The 3 timeout traces concern the Garden drag round on both WebKit profiles and the Moonlit key-then-moon round on large WebKit. Each emitted about 44,000 individually traced assertions. Geometry assertion recording consumed roughly 116–143s in each trace; screenshots consumed 12–18s. The Garden rounds had reached both final pieces; Moonlit had exported its six postcards before its later verification timed out. There was no recorded geometry mismatch in those failures.

All 706 saved ordinary-board geometry snapshots were independently reviewed with zero viewport/target/occlusion failures. Other snapshots comprised 24 dialogs and 16 intentional scrolling fallbacks. Both WebKit profiles completed all 19 new layout scenarios without a reported layout failure. This supports the observed layout states, not a full-suite or real-device certification.

The full raw artifact is privately retained and externally verified: 367,649,965 bytes, SHA256 e6220c76b866020330255aea4e8447d5c957f68403b9bf0b5df406cb02ee7221. It contains 942 screenshots, 746 geometry JSONs and 3 traces (1,725 total ZIP members).

## Actual piece-size finding

At 430×752, all 30 live tiers remain distinguishable in inspected pixels; cells are 76px and the art boxes 72×61px. At 390×664, cells are 68px and boxes 64×53px. The 430×932 viewport adds whitespace, not larger pieces.

At 320×568 the grid/control fit passes, but six labels wrap awkwardly and shrink the square image render to 25.5px before transparent margins. Moonhouse paints only 15.5×19.9px; the issue cannot be dismissed based on 51.5px cell targets. Riverwing, Wayfinder, Nightgarden, Moonhouse, Frond Key and Elsewhere are affected.

## Bounded repair

- Only compact board aliases change: Wing, Finder, Garden, House, Frond and Portal. Full catalog, selected-piece, accessible and postcard names remain unchanged.
- On compact widths only, the board display frame uses every nonzero-alpha pixel plus four source-pixel safety margins. A further 1px CSS inset protects the frame. The original artwork files are not edited; proportions are preserved. Collection/postcard rendering is unchanged.
- Above 380px the original centered square image rendering is retained.
- Actual painted bounds (alpha>=16) are captured separately from IMG canvas/slot geometry. A long-edge minimum guards against a large transparent canvas falsely passing as appropriately sized artwork. Naturally slender shapes remain slender.
- Fine-grained geometry conditions are preserved but aggregated into named violations. This removes redundant per-property trace events, not checks or evidence.

Expected geometry from exact source bounds and the previously measured smallest art slot is not a replacement for browser pixels. For example, Moonhouse should paint about 26.2×33.8px rather than 15.5×19.9px. New pixel inspection remains a gate before publication.
