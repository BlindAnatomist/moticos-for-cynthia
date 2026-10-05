import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const COLLECTION_TIMEOUT_MS = 120000;
export const TRACE_POLICY = Object.freeze({ mode: 'retain-on-failure', screenshots: false, snapshots: false, sources: true, attachments: false });

// A DOM/ARIA presence check alone does not establish native-modal paint state.
export function collectionStateViolations(state, envelope) {
  const problems = [];
  if (state.dialogCount !== 1) problems.push('missing-or-duplicate-dialog');
  if (!state.open || !state.modal) problems.push('dialog-not-in-modal-top-layer');
  if (!state.visible || state.bodyOverflow !== 'hidden') problems.push('dialog-not-visibly-open');
  if (state.envelope !== envelope) problems.push('wrong-envelope');
  if (state.images?.length !== 10) problems.push('missing-collection-images');
  if (state.images?.some(image => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0)) problems.push('image-loading-stall');
  if (state.hitTests?.length !== 3 || state.hitTests.some(hit => !hit.insideDialog)) problems.push('dialog-occluded-or-outside-viewport');
  return problems;
}

export function openCollectionJournal(path, profile, envelopes, now = () => performance.now()) {
  mkdirSync(dirname(path), { recursive: true });
  const started = now();
  const record = (event, details = {}) => {
    const value = { event, elapsedMs: Math.round(now() - started), ...details };
    appendFileSync(path, JSON.stringify(value) + '\n');
    return value;
  };
  record('begin', { profile, envelopes, timeoutMs: COLLECTION_TIMEOUT_MS });
  return record;
}

// Only the full successful sequence is completion proof. Partial journals are
// useful diagnosis, and never a substitute for the missing terminal assertions.
export function verifyCollectionJournal(events, profile, envelopes) {
  assert(events.length > 1); const first = events[0];
  assert.equal(first.event, 'begin'); assert.equal(first.profile, profile);
  assert.deepEqual(first.envelopes, envelopes); assert.equal(first.timeoutMs, COLLECTION_TIMEOUT_MS);
  let cursor = 1, priorTime = -1;
  const next = (event, envelope) => {
    const value = events[cursor++]; assert(value, `Missing collection event: ${event}`);
    assert.equal(value.event, event); if (envelope) assert.equal(value.envelope, envelope);
    return value;
  };
  next('seeded');
  for (const envelope of envelopes) {
    for (const phase of ['navigation-start', 'board-ready', 'open-start', 'dialog-open']) next(phase, envelope);
    for (let image = 0; image < 10; image++) {
      assert.equal(next('image-start', envelope).image, image);
      const value = next('image-decoded', envelope); assert.equal(value.image, image);
      assert(value.source && value.naturalWidth > 0 && value.naturalHeight > 0);
    }
    const before = next('capture-before', envelope), after = next('capture-after', envelope);
    assert.deepEqual(collectionStateViolations(before.state, envelope), []);
    assert.deepEqual(collectionStateViolations(after.state, envelope), []);
    assert.deepEqual(before.state.images, after.state.images, 'Collection changed during capture');
    assert.deepEqual(before.state.rect, after.state.rect, 'Dialog geometry drifted during capture');
    assert.equal(before.state.scrollTop, after.state.scrollTop, 'Dialog scroll drifted during capture');
    assert.equal(after.path, `batch-test-results/storage-views/${profile}-collection-${envelope}.png`);
    next('closed', envelope);
  }
  assert.equal(next('saved-bytes-verified').count, 12);
  next('complete'); assert.equal(cursor, events.length);
  for (const value of events) { assert(Number.isFinite(value.elapsedMs) && value.elapsedMs >= priorTime); priorTime = value.elapsedMs; }
  assert(priorTime < COLLECTION_TIMEOUT_MS, 'Collection exceeded its case cap');
  return { envelopes: envelopes.length, decodedImages: envelopes.length * 10, captures: envelopes.length, savedBytesUnchanged: true };
}
