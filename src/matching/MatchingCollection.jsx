import { useEffect, useRef, useState } from 'react';
import MatchingGarden from './MatchingGarden.jsx';
import { DEFAULT_ENVELOPE_ID, getEnvelope } from './registry.js';

export function envelopeFromSearch(search) {
  const id = new URLSearchParams(search).get('envelope');
  return getEnvelope(id)?.id ?? DEFAULT_ENVELOPE_ID;
}

export default function MatchingCollection() {
  const [envelopeId, setEnvelopeId] = useState(() => envelopeFromSearch(window.location.search));
  const [sound, setSound] = useState(null);
  const sessions = useRef(new Map());
  useEffect(() => {
    const navigate = () => setEnvelopeId(envelopeFromSearch(window.location.search));
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
  return <MatchingGarden key={envelopeId} envelopeId={envelopeId} sessionCache={sessions.current} onChooseEnvelope={choose} sharedSound={sound} onSoundChoice={setSound} />;
}
