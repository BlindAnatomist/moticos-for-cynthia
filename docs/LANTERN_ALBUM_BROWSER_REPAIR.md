# Lantern album: selector repair and bounded evidence

## Exact boundary and verified failure

Local branch: `work/lantern-album-label-repair-20261005`, starting from `5ab3efe08fb2fe88e9aa0da9fb4c3e55d6678866`. The corresponding public candidate is `bf612a858e33563e0c7deebd4f792a404adfec47`, public tree `85fd69228e92f186ec12d6ec5ab9018b3dc27b90`.

The one authorized run, `37247073900`, ended cancelled at its configured 35-minute job limit. Setup, all 225 unit/handler tests, finite-inventory and catalog validators, and production build passed. The line log shows 115 of 246 browser cases starting: all 82 iPhone 13 cases, 33 large-iPhone cases and no Chromium cases. It prints 21 failures, all exact-label `selectOption` timeouts. A complete pass count is not recoverable from that line log alone. No game assertion mismatch or console-log flood appears there; this does not certify the unexecuted cases.

Twelve failed cases had 45-second budgets, six had 240-second budgets and three had 300-second budgets. Their combined budgets total 48 worker-minutes with two workers. Some of that time was legitimate progression before the failed selection, so it must not all be described as idle time.

The two new selects were nested inside labels containing their visible caption plus every option. Playwright 1.61.1's label-text algorithm therefore produced, for example, `Browse envelopeGarden CorrespondenceMoonlit PassageRiverside ReverieLantern Studio`. The exact `Browse envelope` locator could not match it. A six-assertion reproduction using the installed selector functions confirms the cause and the sibling-label remedy.

## Local repair

`AlbumPicker.jsx` gives each select an explicit ID and a separate visible `label` linked by `htmlFor`. The existing `.mg-album-picker` remains the wrapper, preserving layout and target sizing. Structural tests exercise real React markup, fixed label text as options grow and unchanged selection callbacks. Game rules, save data, discovery calculations, artwork and play-screen CSS are unchanged.

The existing read-only album test is tagged as the selector preflight and expanded to exercise every envelope and filter. Its three browser-profile instances run first with one-failure stopping, zero retries and a two-minute global ceiling. The remaining 243 cases run only after those pass. The partition contains all 246 unique cases exactly once, with no reduced coverage. Separate progress/output/report folders preserve preflight results instead of letting the second invocation erase them.

All shared album selection helpers check exact label, accessible name, role, visibility and enabled state, with a 7.5-second selection timeout. A missing control can no longer consume the remaining four- or five-minute progression budget. The main phase has a maximum 25-minute global ceiling, shortened by actual elapsed rescue/setup/preflight time to reserve six minutes for evidence packaging and upload within the unchanged 35-minute job cap. Runner setup receives an additional conservative fifteen-second allowance. Each artifact upload also has a one-minute step ceiling. A slow or failed transfer is reported as incomplete preservation; the reserve is not a network-speed guarantee. Timeouts still mean incomplete verification, never a pass.

There is no evidence supporting an album-performance rewrite. Its read model runs only in open dialogs, and only four envelopes are currently registered. A small source-level benchmark is useful diagnostically but is not a browser or future 300-piece performance guarantee.

## Oversized evidence and proposed recovery

GitHub successfully uploaded artifact `11320307306`, containing 1,792 files. Its exact ZIP is 654,533,926 bytes with SHA-256 `075aae2f23f379516eaae1eff75a88298280fe7452a715c7d0edd06454ffc750`. It expires at `2026-10-06T00:55:21Z`.

The connected artifact downloader refused it above its 536,870,912-byte limit. An official cloud-browser attempt was signed out; no login or handoff was initiated. The raw ZIP, screenshots and traces have not been retrieved or visually reviewed. Complete logs, metadata and independent diagnosis were privately saved and externally verified separately. That smaller recovery explicitly does not claim to contain the raw artifact.

The next workflow is a proposal, inert on `verify/lantern-album-labels-20261005` until fresh approval. It remains one standard Ubuntu job with the same 35-minute limit, two browser workers, zero retries and one-day evidence retention. In that same job, a narrowly scoped best-effort rescue uses GitHub's normal ephemeral job token with `actions: read` to retrieve only artifact `11320307306`. It checks exact size and SHA before splitting the original ZIP into four pieces, each at most 200 MiB. It neither reruns the prior tests nor changes spending controls. An expired or failed rescue is reported separately and must not be described as preserved evidence.

Current browser evidence is also packaged without dropping files, split into at most sixteen 200 MiB pieces and uploaded separately. Each piece includes the ordered reconstruction manifest and hashes. Reassembly restores exact archive bytes and all original members. This stays comfortably below the connector's per-artifact ceiling. The packaging helper rejects unsafe paths and symlinks and fails closed without a success manifest on integrity or size errors.

Normal GitHub API download behavior and CLI usage are documented at:
- https://docs.github.com/en/rest/actions/artifacts?apiVersion=2022-11-28#download-an-artifact
- https://cli.github.com/manual/gh_api

No corrected browser execution, public repair push or Site replacement has occurred at this local checkpoint. The accepted public Site remains version 4. A new passing browser and actual-pixel gate is required before the conditional replacement. Cynthia is not needed for this bounded correction.
