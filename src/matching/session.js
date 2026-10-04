// A tab keeps each envelope's temporary state when navigation unmounts its UI.
// The last observed storage bytes travel with the save, never with another pack.
export function openEnvelopeSession(engine, cache, storage) {
  const cached = cache.get(engine.STORAGE_KEY);
  if (cached) {
    try {
      if (storage.getItem(engine.STORAGE_KEY) !== cached.raw) {
        cached.blocked = true;
        cached.conflict = true;
      }
    } catch { cached.blocked = true; cached.unavailable = true; }
    return cached;
  }
  let session;
  try {
    const result = engine.readSave(storage.getItem(engine.STORAGE_KEY));
    session = {
      save: result.save ?? engine.newSave(), raw: result.sourceRaw,
      sourceRaw: result.sourceRaw, blocked: ['invalid', 'unsupported'].includes(result.status),
      invalid: ['invalid', 'unsupported'].includes(result.status), unavailable: false, conflict: false,
    };
  } catch {
    session = { save: engine.newSave(), raw: null, sourceRaw: null, blocked: true, invalid: true, unavailable: true, conflict: false };
  }
  cache.set(engine.STORAGE_KEY, session);
  return session;
}

export function commitEnvelopeSession(engine, session, next, storage) {
  if (!next) return false;
  if (!session.blocked) {
    try {
      if (storage.getItem(engine.STORAGE_KEY) !== session.raw) {
        session.blocked = true; session.conflict = true;
      } else {
        const raw = engine.serializeSave(next);
        storage.setItem(engine.STORAGE_KEY, raw);
        session.raw = raw; session.unavailable = false;
      }
    } catch { session.blocked = true; session.unavailable = true; }
  }
  session.save = next;
  return true;
}

export function observeEnvelopeStorage(engine, session, event) {
  // key=null denotes localStorage.clear(), which can otherwise miss a stale tab.
  if ((event.key === engine.STORAGE_KEY || event.key === null) && event.newValue !== session.raw) {
    session.blocked = true; session.conflict = true;
    return true;
  }
  return false;
}
