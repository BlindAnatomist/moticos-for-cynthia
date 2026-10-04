# Riverside Reverie: third-envelope candidate

## Exact boundary

Repository: `BlindAnatomist/moticos-for-cynthia` (public). Private local branch: `work/third-envelope-candidate-20261004`. Starting local commit: `b19d687a52ab4f0435dbc1915fc603ceeea60cc9`, equivalent to accepted live Site v3 source `a2a1073c679b644038cdf90407eef71b31e5ea86` and public commit `ccb5b2b9c2d46b1dd0d772d90c6e0fc8d60f059d`.

This increment is local only. No new image has been publicly released; no repository push, PR, Actions run, merge, sharing change or deployment is part of this checkpoint. Accepted v3 remains unchanged. Existing unrelated open draft PRs are outside this assignment.

## One bounded content increment

Riverside Reverie contains two original five-tier matching journeys:

- River Map → River Ridge → River Crossing → River Cascade → River Citadel
- Cream Teacup → Ribbon Sip → Tea Chorus → Pleated Steam → Ribbon Reverie

The two starters reuse previously authored inactive source art, uniformly resized and padded as separate derivative files so their scale matches the eight new pieces. The original starter files are untouched. Eight new reference-guided built-in-imagegen illustrations supply the higher forms. The candidate has thirty distinct pieces and eighteen optional earnable postcard designs. Repeated board instances, crops, recolors and exports do not inflate that count. This milestone is not the ultimate professional collection above 200 pieces.

Map pieces retain folded cream paper, teal land and a cobalt river through peaks, an arch, steps and a citadel. Teacups retain the cream bowl and open gold handle while their paper steam grows into different ribbon forms. Neither family introduces cross-object recipes: two identical pictures at the same tier produce exactly the next authored picture.

The reducer and economy are unchanged. Each envelope has a 5×5 board, four starters per family, six finite pair draws per family, sixteen starter units per family and a thirty-forward-merge route to two finales. The first postcard arrives after three same-family merges. Invalid matches cost nothing. Movement, magnetic drag, tap-to-match, Cut, Undo, sound and collection persistence preserve the accepted rules.

## Navigation and persistence

Three boards have separate names, save keys, histories and discoveries. The new save key is `moticos.matching.riverside-reverie.v1`. Both earlier catalogs, piece IDs, keys, engine and session code remain byte-identical to the accepted baseline. No old save is migrated, normalized or bulk rewritten.

The chooser derives the collection total from the registered catalogs, rather than hardcoding twenty. At compact phone widths its pair of starter previews stacks vertically to free space for full titles. An opaque, pointer-transparent backing extends the sticky dialog header into its padding; the existing controls retain their positions. The stale-save notice now says “this envelope” for every journey. Both layout repairs require the pending browser/screenshot gate before visual acceptance is claimed.

The same storage limits apply: 512 KiB per envelope, 100 Undo snapshots, one million board actions. Quota or access failures preserve temporary play without evicting any other envelope. Sequential stale writes are detected before save; localStorage has no atomic compare-and-swap, so truly simultaneous-tab write exclusion is not claimed. Artwork bytes are never stored in saves.

## Verification at the private checkpoint

- 127 deterministic and actual-handler tests pass, including 22 new independent audit checks.
- All 900 global piece pairings are checked against all three active scopes.
- Every envelope finishes in either family order, with every tier Cut/Undo, all-six foreign-save directions and all-six three-envelope visit orders covered.
- All three envelopes pass 13,341 conservative inventories apiece and 10,000 seeded operations with 271 exact reloads each.
- Riverside additionally passes three independent seeds totaling 6,144 actions and 168 reloads.
- Production build passes; final integrated-art build and source/build hashes are retained in the verification folder.
- Full browser suite collects 222 cases across iPhone 13 WebKit, large iPhone WebKit and desktop Chromium. Collection is not execution. One existing desktop-only skip is intentional.
- New browser cases cover the complete third envelope in both orders, every new tier at 320/390px, six postcard exports, three-way navigation and Back/Forward, resets, temporary saves, quota/security errors, inactive external writes, mute persistence and compact chooser/collection/header geometry.

Local browser loopback access was previously denied. No bypass or repeated attempt was made. Browser tests, rendered screenshot inspection and actual browser postcard export remain unrun for this candidate. The prepared bounded verification workflow uses only standard `ubuntu-latest`, a 25-minute cap, two workers, zero retries and one-day evidence retention. It triggers only on the explicit verification branch `verify/third-envelope-20261004`; the work branch is inert. Running it and releasing the new art need fresh approval.

Independent pixel review of all ten pieces at native 50, 76 and 190 pixels found coherent families, distinct tier silhouettes and no blocking defect. Small master-scale edge flecks were not materially visible at these sizes. The cobalt and teal steam has reduced contrast on a dark-teal diagnostic background; it is clear on the actual light board-style background. This asset-composite review is separate from browser rendering. Complete provenance, exact alpha/asset checks and independent visual findings accompany the recovery snapshot. Routine agent QA is the next step. Cynthia is not needed until a major play milestone presents a genuinely human experience question.
