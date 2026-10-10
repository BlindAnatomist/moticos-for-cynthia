# Direct piece dragging: scoped interaction update

Baseline: accepted commit `c5c7714588d0eff5b2a9a3c16de1c9467aa6d508` (320 pictures). Its previous browser acceptance describes the baseline only.

## Intended behavior

- On touch or pen, an occupied piece claims the gesture before pointerdown through `touch-action: none`. Moving seven CSS pixels starts the visual drag. A stationary or small-jitter tap uses the existing selection path.
- The source remains in the saved board until release. A decorative pointer-following ghost and eligible destination outline show the pending placement.
- Empty destinations move; identical non-final pictures merge. Invalid, same-cell and outside drops cancel without changing game data.
- Empty cells, gaps and the page outside the board keep native scrolling. Larger-text board arrows remain available. During an active drag, the board reveals horizontally near its left/right edge at a bounded per-frame distance.
- Release clears the gesture before invoking the existing move command, so repeated release/lost-capture cannot double-commit. Career identity, revision, source tile identity and busy state are rechecked. Cancel, capture loss, Escape, backgrounding, another pointer, and unmount do not commit.
- Positive-detail compatibility clicks immediately after a drag are suppressed. A new primary pointer gesture clears suppression; detail-zero keyboard/assistive activation remains available.
- Mouse uses the existing native HTML5 drag path, now with career identity checking and compatibility-click suppression. Keyboard destinations, focus-reveal helper, Enter/Space and tap selection remain unchanged.

This deliberately changes occupied-piece swipes into piece drags. Swipe an empty cell/gap or use the board arrows to scroll. This choice follows the requested direct-drag playtest improvement.

## Local verification and limits

The model/controller tests run the production model and hook body with mocked React hooks/DOM. They check transitions, cancellation, freshness, callback counts and cleanup, but do not certify browser pointer capture ordering, native panning, actual hit testing, or a physical iPhone. Source preservation checks invert each declared CareerGarden edit back to its exact accepted hash, invert the single BoardViewport copy edit, and verify every remaining accepted source file byte for byte.

The applicable current reducer/session and board-focus tests remain included. Historical Stage D preservation/fixture-byte tests intentionally refer to the old integration bytes; they are retained unchanged as baseline evidence and are not presented as a passing current aggregate. New focused browser tests must bind the changed candidate and label trusted Chromium touch, native mouse/keyboard, synthetic WebKit events, and any untested physical iPhone behavior separately.

No reducer, save format, artwork, merge rule, reward, progression or purchase logic is changed.
