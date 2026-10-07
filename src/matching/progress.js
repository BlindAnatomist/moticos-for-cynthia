import { ENVELOPES, getMatchingEngine } from './registry.js';

// One validated snapshot per envelope and storage interface, separate from play
// sessions. Rechecking bytes on every read still detects inactive/stale tabs.
// Weak ownership allows discarded storage interfaces and all their data to go.
const validatedReads = new WeakMap();
function freezeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeData); Object.freeze(value);
  }
  return value;
}
export function readObservedSave(engine, storage) {
  const raw = storage.getItem(engine.STORAGE_KEY);
  let reads = validatedReads.get(storage);
  const prior = reads?.get(engine.STORAGE_KEY);
  if (prior && prior.raw === raw && prior.engine === engine) return prior.result;
  const result = engine.readSave(raw);
  if (!reads) { reads = new Map(); validatedReads.set(storage, reads); }
  // Never retain stale parsed history after a change or cache storage failures.
  reads.delete(engine.STORAGE_KEY);
  if (result.status === 'loaded' || result.status === 'empty') {
    reads.set(engine.STORAGE_KEY, { raw, engine, result: freezeData(result) });
  }
  return result;
}

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
    const result = readObservedSave(engine, storage);
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

// Guidance is derived from discoveries, never stored. Undo and Cut keep earned
// discoveries, so the idle inspector must not restart at the first family.
export function idleDiscovery(envelope, save) {
  const summary = summarizeEnvelope(envelope, { save });
  const family = summary.nextFamily;
  if (!family) return { complete: true, family: null,
    piece: envelope.catalog.CATALOG[envelope.catalog.FINALS.at(-1)], next: null };
  return { complete: false, family,
    piece: family.previous ?? envelope.catalog.CATALOG[family.starterId], next: family.next };
}

// A suggestion cannot unlock, initialize, or repair another envelope. Keep
// unread and temporary states out of the suggestion; they stay freely visible
// in the ordinary chooser with their existing save-protection explanation.
export function nextEnvelopeSuggestion(album, currentId) {
  const index = album.entries.findIndex(entry => entry.envelope.id === currentId);
  if (index < 0 || !album.entries[index].complete || album.entries[index].temporary || album.entries[index].unread) return null;
  const following = [...album.entries.slice(index + 1), ...album.entries.slice(0, index)];
  return following.find(entry => !entry.complete && !entry.unread && !entry.temporary) ?? null;
}
