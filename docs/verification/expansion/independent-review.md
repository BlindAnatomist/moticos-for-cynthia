# Independent expansion review

## Game design

Accepted the bounded separate-envelope design. Two active families per board preserve the finite-supply proof, pacing and readable board. Keep boards and Undo independent; no content gates, economy, migration or active four-family board. Preserve temporary play through switching, recheck inactive storage on resume, keep sound consistent, and make collection browsing independent of play selection. This is a twenty-piece increment toward the larger collection, not a production-completeness claim.

## Source and state safety

Independent review found two integration defects and the implementation repaired them before the final local gate:

1. Accessing the localStorage property itself could throw outside the original guard. Storage resolution now happens inside guarded get/set calls.
2. A muted tab could reopen another envelope with an unsynchronized sound flag, becoming audible after reload. The current sound choice now passes through a protected sound-only commit on the destination.

Twelve independent audit tests verify the repairs plus corruption/future/foreign-save retention, temporary session return, read denial, inactive-tab conflicts, storage.clear, URL/cache preservation, cross-envelope postcard catalogs, and active-only/lazy image mounting. No further source blocker was found. This is source/handler testing; native browser scheduling, rendering, sound and network behavior remain a separate gate. Stale-save protection does not provide an atomic cross-tab transaction.

## Direct pixel review

Inspected all six full-resolution new PNG masters and family composites at 50, 76 and 190 pixels, plus all twenty active pieces together on cream and dark teal. No blocking art defect was found. Key bow/shaft/teeth remain recognizable; horizontal drawbridge, upright stairway and diagonal passage differ at phone-tile scale. Moon skiff, balloon basket and wide voyager differ while retaining dominant cobalt crescent and subordinate bird. Existing bird family remains coral-led, avoiding cross-family confusion. All six new WebPs have real alpha and transparent corners.

Minor contrast caveat: cream detail softens on cream, and teal foliage recedes on dark teal. Main silhouettes and family identities remain readable. These are QA-composite pixels, not screenshots of the candidate rendered in a phone browser.

## Remaining acceptance gates

Combined executed coverage is 188 passing browser cases plus one intentional desktop-only skip. The first run passed 182 and exposed two incorrect global-name expectations in six Garden cases; the separately approved six-case retest passed after the test-only correction. Runtime and artwork stayed byte-identical. Actual Moonlit screenshots, lower collection scroll positions and six exported postcard designs passed independent visual review; Garden post-assert views and exports come from the successful retest. Native deployment readback remains the final publication check. Human testing is reserved for major meaningful changes or genuinely unresolved experience questions; it is not a routine gate for this increment.
