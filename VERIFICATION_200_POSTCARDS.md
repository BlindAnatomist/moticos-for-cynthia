# Focused 200-piece postcard presentation gate

This is a separately labeled 12-case visual gate, not a new 99-case gameplay run. The prior 99-case pass and original 320 px WebKit header failure remain historical evidence. No workflow deploys the game or updates Main.

The only new runtime change is in the 200-only CSS wrapper: postcard headings and Back buttons use separate grid rows through 430px, and at widths up to 380px the image box removes 4dvh of unused vertical space. Original square artwork remains width-limited and uncropped. All 262 protected runtime/art files covering the prior 160 pieces, all 40 new artwork bytes, export/save code and all lower build modes are unchanged.

Four new-envelope cases per profile load explicitly labeled legal full-discovery fixtures. Each case opens its six earned postcards, captures art and actions views at 320 x 568, 390 x 664 and 430 x 752, and downloads each actual 1536 x 1120 PNG. Three profiles yield 12 exact cases, 432 presentation images and 72 exports. The gate requires complete heading text bounds/hits, no heading/Back overlap, visible full artwork and postcard titles, 44 px actions, bounded internal scroll, Close/Escape/reopen/focus restoration and exact board/save retention.

The exact push destination is BlindAnatomist/moticos-for-cynthia, branch verify/postcards-200-20261007, workflow verify-expansion-200-postcards.yml, attempt 1 only. One worker, zero retries and serial fail-fast profiles are required. Preflight has an 8-minute job cap; each of three profile jobs has 14 minutes. Maximum configured allocation is 50 standard runner-minutes. Each browser gets 6-8 minutes with a 3-minute evidence reserve; insufficient remaining time fails closed before starting.

The proven lossless SHA256-object multipart transport is reused. Complete artifacts are capped at 96 MiB preflight, 144 MiB per WebKit profile and 48 MiB Chromium, with 8 MiB diagnostic salvage per browser: 456 MiB plus small identity receipts, within the approved 460 MiB limit. Artifacts expire after one day. Missing/over-cap/interrupted/diagnostic-only evidence cannot pass. No retry is automatic.

The entire exact allowed source projection is bound to the current commit, sole build and run. Private notes, recovery archives, art masters, credentials and local Git history are excluded. Local tests and read-only case collection do not count as browser execution. Actual screenshots and exports require independent visual review; physical-device and owner-operated VoiceOver acceptance remain separate.
