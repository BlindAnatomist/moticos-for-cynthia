import { LOCK_NAME, STORAGE_KEY } from './content.v4.js';
import { createCareer, reduceCareer, validateCareer, upgradeCareer } from './engine.v4.js';

// The only persistent career writer. Never probes, migrates, deletes or writes
// old-mode keys. Native exclusive Web Locks make read/revision-check/write one
// serialized command across same-origin tabs. Compare/write alone is NOT a lock.
export const MAX_SAVE_CHARS = 1_000_000;
function encode(state) {
  const bytes = JSON.stringify(state);
  if (typeof bytes !== 'string' || bytes.length > MAX_SAVE_CHARS) throw new Error('This campaign is too large to save safely.');
  return bytes;
}
const browserStorage = { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) };
function decode(bytes) {
  if (typeof bytes !== 'string' || bytes.length > MAX_SAVE_CHARS) throw new Error('The saved career cannot be read safely.');
  const previous = JSON.parse(bytes), state = upgradeCareer(previous); validateCareer(state);
  if (state.mode !== 'career') throw new Error('Practice cannot replace a saved career.');
  return { state, upgraded: previous.schemaVersion !== state.schemaVersion || previous.contentVersion !== state.contentVersion };
}
export function createCareerSession({ storage = browserStorage, locks = globalThis.navigator?.locks, makeCareer = createCareer } = {}) {
  let state = null, status = 'opening', warning = null;
  let queue = Promise.resolve();
  const listeners = new Set();
  const report = result => { const out = { ...result, state, status, saved: status === 'saved', warning }; for (const fn of listeners) fn(out); return out; };
  const temporary = reason => { status = 'practice'; warning = `${reason} You are in unsaved practice. Progress and coins here are temporary; your previous saved career is protected. Reload to return to it when saving is available.`; };
  const serial = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  async function exclusive(fn) {
    if (!locks || typeof locks.request !== 'function') throw new Error('Saving needs Web Locks, which are unavailable in this browser.');
    return locks.request(LOCK_NAME, { mode: 'exclusive' }, fn);
  }
  function readSaved(bytes) {
    const decoded = decode(bytes);
    // Schema conversion and normal writes share the same exclusive writer lock.
    // Unknown/future bytes fail before this write and are never overwritten.
    if (decoded.upgraded) storage.setItem(STORAGE_KEY, encode(decoded.state));
    return decoded.state;
  }
  async function open() {
    return serial(async () => {
      if (state) return report({ ok: true, code: 'opened' });
      try {
        await exclusive(async () => {
          const bytes = storage.getItem(STORAGE_KEY);
          if (bytes !== null) state = readSaved(bytes);
          else { const fresh = makeCareer(); validateCareer(fresh); storage.setItem(STORAGE_KEY, encode(fresh)); state = fresh; }
          status = 'saved'; warning = null;
        });
      } catch (error) { state ??= makeCareer(); temporary(error.message || 'Saving is unavailable.'); }
      return report({ ok: true, code: status === 'saved' ? 'opened' : 'practice' });
    });
  }
  async function commit(action) {
    return serial(async () => {
      if (!state) return report({ ok: false, code: 'not-open', message: 'The career is still opening.' });
      if (status === 'practice') {
        const result = reduceCareer(state, action); if (result.ok) state = result.state;
        return report({ ...result, code: result.ok ? 'practice-applied' : result.code });
      }
      let result = null, candidate = null;
      try {
        await exclusive(async () => {
          const bytes = storage.getItem(STORAGE_KEY);
          if (bytes === null) throw new Error('The saved career disappeared in another tab.');
          const current = readSaved(bytes);
          if (current.careerId !== state.careerId || current.revision !== action.expectedRevision || action.careerId !== current.careerId) {
            state = current; result = { ok: false, code: 'stale', message: 'Another tab changed this career. The latest saved board is now shown; review it and try again.' }; return;
          }
          result = reduceCareer(current, action);
          if (!result.ok) { state = current; return; }
          candidate = result.state;
          // Payment, stock, history boundary and replacement orders are in these
          // single bytes. No animation, effect or callback writes a second save.
          storage.setItem(STORAGE_KEY, encode(candidate));
          state = candidate; status = 'saved'; warning = null;
        });
      } catch (error) {
        // Do not retry this write or overwrite unknown/future bytes. A failed
        // candidate is visibly temporary, never a falsely banked payout.
        if (candidate) state = candidate;
        temporary(error.message || 'This action could not be saved.');
        if (!result?.ok) result = { ok: false, code: 'storage-unavailable', message: warning };
        else result = { ...result, code: 'practice-applied' };
      }
      return report(result);
    });
  }
  async function refresh() {
    return serial(async () => {
      if (status !== 'saved') return report({ ok: false, code: 'practice' });
      try {
        await exclusive(async () => { state = readSaved(storage.getItem(STORAGE_KEY)); });
        return report({ ok: true, code: 'refreshed' });
      } catch (error) { temporary(error.message || 'The saved career is unavailable.'); return report({ ok: false, code: 'storage-unavailable' }); }
    });
  }
  return { open, commit, refresh, snapshot: () => ({ state, status, warning }), subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
}
