import { ENVELOPES, getMatchingEngine } from './registry.js';

// Album views never create sessions or write storage. An unopened envelope is
// not credited with starter discoveries just because somebody browsed it.
export function readEnvelopeProgress(envelope, cache, storage) {
  const engine = getMatchingEngine(envelope.id), session = cache.get(envelope.storageKey);
  if (session) {
    let changed = false, unavailable = false;
    try { changed = storage.getItem(envelope.storageKey) !== session.raw; }
    catch { unavailable = true; }
    return { save: session.save, opened: true, temporary: Boolean(session.blocked || changed || unavailable),
      unread: Boolean(session.invalid), conflict: Boolean(session.conflict || changed), unavailable };
  }
  try {
    const result = engine.readSave(storage.getItem(envelope.storageKey));
    const unread = result.status === 'invalid' || result.status === 'unsupported';
    return { save: result.save, opened: result.status === 'loaded', temporary: unread, unread, conflict: false, unavailable: false };
  } catch {
    return { save: null, opened: false, temporary: true, unread: true, conflict: false, unavailable: true };
  }
}

export function summarizeEnvelope(envelope, observed) {
  const { catalog } = envelope, { save } = observed;
  const discovered = new Set(save?.discoveries ?? []);
  const families = catalog.FAMILIES.map(family => {
    const known = family.pieceIds.filter(id => discovered.has(id));
    const nextId = family.pieceIds.find(id => !discovered.has(id)) ?? null;
    return { ...family, discovered: known.length, complete: discovered.has(family.finalId),
      next: nextId ? catalog.CATALOG[nextId] : null,
      previous: nextId ? catalog.previousPiece(nextId) : null };
  });
  // Prefer the closest unfinished journey; ties keep the authored order. This
  // is a suggestion only. Every envelope and every family remains available.
  const nextFamily = families.filter(family => !family.complete)
    .sort((a, b) => b.discovered - a.discovered)[0] ?? null;
  const worlds = families.filter(family => family.complete).length;
  return { ...observed, envelope, families, nextFamily,
    discovered: catalog.PIECES.filter(piece => discovered.has(piece.id)).length,
    totalPieces: catalog.PIECES.length,
    postcards: catalog.PIECES.filter(piece => piece.tier >= 3 && discovered.has(piece.id)).length,
    totalPostcards: catalog.PIECES.filter(piece => piece.tier >= 3).length,
    worlds, totalWorlds: families.length,
    boardWorlds: catalog.FINALS.filter(id => save?.round.board.some(tile => tile?.pieceId === id)).length,
    complete: worlds === families.length,
  };
}

export function readAlbumProgress(cache, storage, active = null) {
  const entries = ENVELOPES.map(envelope => {
    const observed = readEnvelopeProgress(envelope, cache, storage);
    if (envelope.id === active?.id) { observed.save = active.save; observed.opened = true; }
    return summarizeEnvelope(envelope, observed);
  });
  const sum = key => entries.reduce((total, entry) => total + entry[key], 0);
  return { entries, discovered: sum('discovered'), totalPieces: sum('totalPieces'),
    postcards: sum('postcards'), totalPostcards: sum('totalPostcards'),
    worlds: sum('worlds'), totalWorlds: sum('totalWorlds'),
    temporary: entries.some(entry => entry.temporary), unread: entries.some(entry => entry.unread) };
}
