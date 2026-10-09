# Status clarification for the separate 240-piece candidate

The original document below is preserved as a historical r13/200-piece preparation record. Its preparation prohibitions, proposed timings and approval status describe that earlier phase; they are not a new authorization or a current 240-piece execution budget. The later accepted 200-piece verification cycle and its evidence remain separate and unchanged. Its approval cannot authorize a 240-piece run.

The current 240-piece scope is only a proposal in [stage-b-evidence/execution/PROPOSAL.md](../stage-b-evidence/execution/PROPOSAL.md). Its new verification branch, case inventory and caps are NOT yet owner-approved. Only a future explicit 240-specific owner authorization, followed by review of the exact final source/build identities and normal tool approval, can activate that scope. Do not reuse 200-piece approval, trailers, branch or budget as permission for 240. No merge, deployment, billing or security change is implied.

Historical source text follows unchanged. Statements such as “no run authorized” or references to then-deferred validator work must be read in that historical context; they do not supersede later, explicitly bounded 200-piece authorization and do not establish any 240-piece authority.

---

# Proposed private r13 verification scope — no run authorized

This revision prepares native Stage A coverage for independent review before any new run request. The existing repository/ref/workflow scaffold is historical. Its r5 single-run approval is spent; it must not be reused as authorization or pushed to automatically. Before a future run request, the coordinator must review this exact source, obtain fresh pinned build identities, and resolve a distinct approved destination/ref in the dispatch/workflow scaffold. No remote configuration is changed here. Do not use old source/build trailers for r13.

## Exact scope

| Case | Reducer setup, not browser play | Native actions and required result | Case ceiling |
|---|---|---|---:|
| D11 | Actual v4 in-progress and original113-completed saves; completed save owns desk/sorter and retained stock | Migrate/reload both; no automatic entry; defer invitation without writes; explicitly begin Small Impressions; preserve board, balances, cursors, paid-desk and held promises; opening letters issued once; reload stable |75s|
| D12 | Second Look entry with legitimately made pn2 callback and retained b5 | Make/send first3 letters; Camera unavailable before first send, then available with zero gifted material before second send; pn2 consumed and b5 retained; reload stable |90s|
| D13 | Completed Second Look, then a separately labelled post-letter3 Loose Ends stock checkpoint | Enter Loose Ends; both sources available and draw from each; select competing request without consuming stock; merge to create second sp2; send exact2sp2+1zp3; retain cj3 and leave competing request blocked on shared zp3 |90s|
| D14 | Actual completed20-chapter/200-discovery reducer state | Traverse all ten pages and hash-check each of200card images; select chapter/family/volume; original160 stays separately complete; open/export Camera-family cm5; navigate original ending; saved bytes unchanged across UI and reload |60s|

D01–D10 retain their original game/safety coverage, with D09 restricted to original160 gallery traversal because D14 now performs the full200-card traversal as well as continuation navigation. D02 still checks all16 original entries/endings. M01–M08 are unchanged, including the existing HUD-validator limitation. No attempt is made to repeat all arithmetic from the17 Stage A Node contracts in UI.

## Concrete regrouping within unchanged caps

The proposed Chromium planning allocation is270seconds for D01–D10,315seconds for the four new individual ceilings, and15seconds for server/start overhead =600seconds. This planning subdivision is not a new hidden timeout: the existing600-second global cap is the actual aggregate stop. Original individual case ceilings are unchanged. If the aggregate cannot complete, it fails; cases are not skipped, retried or declared accepted. The older r5 Chromium measurement (84.737seconds) establishes only historical headroom, not fit of r13. The latest independent r11 preflight measurement reported by the coordinator was175.697seconds, not an r13 measurement. New r13 browser fit remains unmeasured.

| Aggregate allocation | Seconds |
|---|---:|
| Setup including checkout/Node/dependencies |300|
| Preflight including exact collection, sealed guard/original/Stage A tests and both builds |300|
| Chromium |600|
| WebKit phone |420|
| Two group cleanup allowances |30|
| Finalization/upload reserve |120|
| Total allocated / job hard cap |1770 /1800|

No limit is widened. R13 restores the200-card traversal accidentally omitted in r12; D09 performs160 and D14 performs200. It does not claim selector sampling as complete new40-art coverage. D14 retains its60-second hard cap. Fit is unmeasured: the proposed internal D14 allocation is15seconds for seeded-fixture preparation/loading,30seconds for ten complete pages including per-card readiness/identity/hash checks, and15seconds for selectors/postcard/reload. These are planning allowances, not measurements or new timers. If review finds60seconds implausible, a specific alternative for approval is D14 at90seconds with D02 reduced from150seconds to120seconds and its scene tour narrowed to chapters1,4,12,16, while keeping all original16 Node routes and preserving the600-second group total; neither deadline nor scene reduction is implemented here. If independent review finds600seconds implausible, the specific next proposal is to replace D02's16-chapter browser tour with four representative original chapters (1,4,12,16) while keeping the original16-chapter Node routes and original-font/art checks; that would require separate scope review. Do not silently perform that reduction or increase time limits.

## Artifact reallocation, unchanged totals

Four D02 screenshots (chapters4/8/12/16) become D11-entry, D12-camera, D13-competition and D14-new-family. D02 scene records remain. The D09-tw5 export becomes D14-cm5; D09-b1 export, Written postcard screenshot and D10 Written/legacy renderer equivalence remain. Required total23 screenshots+2 exports=25original PNGs, plus the existing allowance for one failure screenshot, one failure trace and60MiB whole-artifact cap. The source manifest, exact collected test inventory, first-attempt terminal reports/events and case records must all agree; omission fails.

## Unchanged authorization/execution contract

One worker, no retries, maxFailures1, first attempt only. Existing source/build approval trailers and wrapper checks remain fail-closed. Setup/preflight/group clocks and reserve admission checks remain unchanged. No full preflight or browser execution is authorized here. The supported coordinator environment may independently collect and build the exact source before requesting any run. This Mac must not substitute installed Playwright1.57 for pinned1.61.1 or install dependencies. No Actions, push, publication, deployment, preview/main change, sharing or spending.
