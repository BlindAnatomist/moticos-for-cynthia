import { useEffect, useRef, useState } from 'react';
import MatchingGarden from './MatchingGarden.jsx';
import RecoveryPage from './recovery/RecoveryPage.jsx';
import { recoveryRequested, recoveryLocation } from './recovery/snapshot.js';
import { DEFAULT_ENVELOPE_ID, getEnvelope } from './registry.js';

export function envelopeFromSearch(search) {
  const id = new URLSearchParams(search).get('envelope');
  return getEnvelope(id)?.id ?? DEFAULT_ENVELOPE_ID;
}

export default function MatchingCollection() {
  const [envelopeId, setEnvelopeId] = useState(() => envelopeFromSearch(window.location.search));
  const [sound, setSound] = useState(null);
  const [recovering, setRecovering] = useState(() => recoveryRequested(window.location.search));
  const sessions = useRef(new Map());
  useEffect(() => {
    const navigate = () => { setEnvelopeId(envelopeFromSearch(window.location.search)); setRecovering(recoveryRequested(window.location.search)); };
    window.addEventListener('popstate', navigate);
    return () => window.removeEventListener('popstate', navigate);
  }, []);
  function choose(id) {
    if (!getEnvelope(id) || id === envelopeId) return;
    const url = new URL(window.location.href);
    if (id === DEFAULT_ENVELOPE_ID) url.searchParams.delete('envelope');
    else url.searchParams.set('envelope', id);
    window.history.pushState(null, '', url);
    setEnvelopeId(id);
  }
  function showRecovery(open) {
    window.history.pushState(null, '', recoveryLocation(window.location.href, open));
    setRecovering(open);
    if (!open) setEnvelopeId(envelopeFromSearch(window.location.search));
  }
  if (recovering) return <RecoveryPage sessions={sessions.current} onBack={() => showRecovery(false)} />;
  return <MatchingGarden key={envelopeId} envelopeId={envelopeId} onOpenRecovery={() => showRecovery(true)} sessionCache={sessions.current} onChooseEnvelope={choose} sharedSound={sound} onSoundChoice={setSound} />;
}
