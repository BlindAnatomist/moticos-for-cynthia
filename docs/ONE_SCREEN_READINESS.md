# Follow-up corrections after the completed compact-art browser run

Status: local only. Browser verification and publication are pending approval.
Base: d26aacb87d9d8b57dcd26c875706d82b8061c77e, publicly tested as 9d265baa5a572e09a589df7134f30cae52fbd18f.

## Verified prior outcome

Run 37224405794 completed all 213 browser cases: 199 passed and 14 failed. Browser execution was 21.2 minutes; total run elapsed time was 23m24s. GitHub's run-specific usage endpoint reported zero billable Ubuntu milliseconds for its one standard ubuntu-latest job on the public repository. This is runner-usage evidence, not an account-wide invoice/storage audit.

The complete artifact was privately saved and externally verified: 480,185,847 bytes, SHA256 620faf6cd129faa5c95e38aca63f7b9b760fea853d39cf15bfa0d72bb69e86c9; 3,411 members include 1,136 screenshots, 913 geometry records, 14 traces and per-test terminal results.

## Four bounded corrections

1. Five WebKit progression failures exposed delayed React compact-label updates after CSS resized the board. One screenshot still showed two-line Frond Key about 200ms after resize; the short alias appeared about 470ms after resize. The new labels are two CSS-selected spans, switching at the exact same 380px breakpoint as crop rendering. Tests inspect the visible label, demand exactly one correct variant and retain parent/visible-child clipping and font checks. Full accessible names remain unchanged.
2. Three 320×480 fallback failures exposed genuinely undersized painted artwork when the board shrank to its old 252px minimum. The minimum is now 289px, preserving the prior 289.6px board at supported 320×568 while allowing taller natural-flow content on exceptionally short viewports. The painted-art threshold remains 30px along its long edge.
3. Four Chromium keyboard tests asserted stricter in-dialog Tab cycling than native dialog behavior guaranteed. The recorded failure alone did not prove focus entered the background game. Matching dialogs now explicitly cycle ordinary Tab/Shift+Tab through visible enabled controls, with diagnostics and both-boundary tests. Escape, browser modifier shortcuts and opener restoration remain unchanged. Historical recipe dialogs keep their old default behavior.
4. Two enlarged-text Chromium tests detected title/star font-box overflow of 2px. Enlarged-title line height now accommodates the glyphs; the no-truncation checks are unchanged.

## Visual review preserved

All 30 settled compact tiers were recognizable after the preceding crop repair. The six compact aliases yielded substantially larger identifiable painted artwork; House improved from about 15.5×19.9px to 26.2×33.8px. Badge overlaps observed in Map/Cascade/Fern Cup/Chorus remained minor and did not obscure their defining silhouettes. Primary 390×664 and 430×752 sizing remained healthy. This follow-up does not redraw any assets or expand game scope.

Independent source review supports the corrections. Its claim is deliberately limited to the defined viewport/inset matrix; arbitrary wider-but-short windows and real-device VoiceOver are not certified by these automated tests.

The next proposed gate remains a single standard Linux job: 213 browser cases, 35-minute cap, two workers, zero retries, one-day evidence. No new run may start without the owner's approval, and the preview remains unchanged until tests and actual-pixel review pass.
