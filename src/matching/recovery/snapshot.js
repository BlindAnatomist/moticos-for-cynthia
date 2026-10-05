import { RECOVERY_ENVELOPES, getRecoveryEngine, isPreservedEnvelope } from './recoveryRegistry.js';
import { summarizeEnvelope } from '../progress.js';

export function recoveryRequested(search) {
  const params = new URLSearchParams(search);
  return params.has('save-recovery') || isPreservedEnvelope(params.get('envelope'));
}
export function recoveryLocation(href, open) {
  const url = new URL(href);
  if (open) url.searchParams.set('save-recovery', '1');
  else { url.searchParams.delete('save-recovery'); if (isPreservedEnvelope(url.searchParams.get('envelope'))) url.searchParams.delete('envelope'); }
  return url;
}

// Snapshot only. Never create a play session, migrate a key or write any bytes.
// Re-read on every export so an earlier screen cannot export a stale cached save.
export function captureRecovery(storage, sessions = new Map(), capturedAt = new Date().toISOString()) {
  const entries = RECOVERY_ENVELOPES.map(envelope => {
    const engine = getRecoveryEngine(envelope.id);
    let sourceRaw = null, result, sourceCaptured = false;
    try { sourceRaw = storage.getItem(envelope.storageKey); sourceCaptured = true; result = engine.readSave(sourceRaw); }
    catch { result = { status: 'unavailable', save: null }; }
    const session = sessions.get(envelope.storageKey);
    const sessionSave = session && engine.validSave(session.save) ? session.save : null;
    const hasTemporary = Boolean(session && (session.blocked || !sourceCaptured || session.raw !== sourceRaw));
    return {
      envelopeId: envelope.id, title: envelope.title, storageKey: envelope.storageKey,
      playable: !isPreservedEnvelope(envelope.id), status: result.status, sourceCaptured,
      sourceRaw, decodedV1: result.save ? engine.serializeSave(result.save) : null,
      catalog: {
        families: envelope.catalog.FAMILIES.map(family => ({ ...family, pieceIds: [...family.pieceIds] })),
        pieces: envelope.catalog.PIECES.map(({ id, familyId, tier, name, shortName, description, mass }) => ({ id, familyId, tier, name, shortName, description, mass })),
      },
      // Distinguish current stored data from a blocked/stale tab's recoverable work.
      temporaryV1: hasTemporary && sessionSave ? engine.serializeSave(sessionSave) : null,
      originalAtSessionOpenRaw: session?.sourceRaw ?? null,
      sessionConflict: Boolean(session?.conflict || (session && sourceCaptured && session.raw !== sourceRaw)),
    };
  });
  return { format: 'moticos-read-only-recovery-v1', capturedAt,
    notice: 'Read-only snapshot of the 12 known envelope keys. Each key is read separately; another tab may change after capture. Raw sources are exact. decodedV1 and temporaryV1 are separate canonical v1 saves, not automatic imports. Keep this file private. Newer artwork and postcard PNGs are not included.',
    entries,
  };
}

export function summarizeRecoveryEntry(entry) {
  const envelope = RECOVERY_ENVELOPES.find(item => item.id === entry.envelopeId);
  const save = entry.decodedV1 ? JSON.parse(entry.decodedV1) : null;
  return summarizeEnvelope(envelope, { save, opened: entry.status === 'loaded', temporary: false,
    unread: !['loaded', 'empty'].includes(entry.status), unavailable: entry.status === 'unavailable', conflict: entry.sessionConflict });
}

export function recoveryDownload(snapshot, browser = window) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2) + '\n'], { type: 'application/json;charset=utf-8' });
  const url = browser.URL.createObjectURL(blob), link = browser.document.createElement('a');
  try {
    link.href = url; link.download = 'moticos-preserved-saves.json'; browser.document.body.appendChild(link); link.click();
  } finally {
    link.remove(); browser.setTimeout(() => browser.URL.revokeObjectURL(url), 30000);
  }
}
