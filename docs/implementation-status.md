# Implementation status

This is a private decoder-compatible rollback candidate with 80 playable pictures across the accepted eight envelopes. The default development and production scripts explicitly select those 80 pieces. The historic 40-piece default description no longer applies to this candidate.

Four newer envelopes, containing eight five-piece families, are retained as metadata-only recovery records. Their exact v1/v2 saves, discoveries, boards, sound and up to 100 retained Undo snapshots can be read and locally exported; the newer artwork, play controls and postcard PNGs are unavailable here. The reviewed decoder/runtime bytes, original artwork and dependencies are unchanged.

Independent review found no storage-loss or runtime must-fix defect. It independently repeated 329 deterministic tests and reproduced the rollback build. This supports private source preparation only. Browser execution, native downloads, screenshots, device layouts and actual postcard pixels have not been verified in this executor.

The focused private browser supplement now covers every preserved recovery record visibly, both recovery entry points and history navigation, native JSON correctness/freshness/failure/conflict exports, all eight playable catalogs' actual image decoding, one actual postcard PNG per playable envelope per profile (24 total), Garden's full 100-Undo path and a batch-envelope v2 resume/Undo/reload path. See `safe-rollback-browser-plan.md` for the exact matrix, evidence identities and remaining approval gate. It is not a full rerun of the historic 80-piece browser matrix.

The prepared gate is described in `rollback-browser-gate.md`. Browser execution, publication, Actions and deployment require explicit authorization. No local browser route is used by the offline preparation. Cynthia is not needed for the remaining engineering checks.
