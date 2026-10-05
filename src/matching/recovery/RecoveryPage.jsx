import { useEffect, useState } from 'react';
import { captureRecovery, recoveryDownload, summarizeRecoveryEntry } from './snapshot.js';
import './recovery.css';

function browserStorage() { try { return window.localStorage; } catch { return null; } }
export function RecoveryContents({ snapshot }) {
  return <>
    <p>The original 80 pictures are playable in this recovery edition. Small Talk, Hello Again, Off Beat and Return Mail are read-only here. Their saved boards, discoveries, sound setting and up to 100 Undo snapshots remain in this browser.</p>
    <p>You can read their progress and download a private backup below. Their newer artwork, play controls and postcard PNG exports are unavailable in this edition. Their saves will be readable again when a compatible 120-piece edition returns at this same website address and browser profile. Do not clear this website’s data.</p>
    <p>The backup includes exact stored bytes, validated v1 saves, and any temporary work in this tab separately. It is a recovery file, not a postcard, and this edition has no import button. Keep it for a compatible recovery tool or assisted restoration; never paste it over an existing save without reviewing conflicts.</p>
    {snapshot.entries.some(entry => !['loaded', 'empty'].includes(entry.status)) && <p role="alert">Some saves are unreadable or browser storage is unavailable. Available raw bytes are included in the backup, but their progress cannot be verified here. A backup cannot include bytes the browser refuses to read.</p>}
    <p>Saved progress, checked {snapshot.capturedAt}. Another tab can change it; refresh or download to read it again.</p>
    <div className="mr-entries">{snapshot.entries.map(entry => {
      const summary = summarizeRecoveryEntry(entry), save = summary.save;
      return <section key={entry.envelopeId} aria-label={`${entry.title} preserved save`}>
        <h2>{entry.title} <small>{entry.playable ? 'Playable' : 'Read-only'}</small></h2>
        {entry.status === 'empty' ? <p>No stored save was found. No starter discoveries are credited.</p>
          : entry.status !== 'loaded' ? <p>{entry.status === 'unavailable' ? 'Browser storage could not be read.' : 'The stored save cannot be decoded by this edition.'} No save has been replaced.</p>
          : <>
            <p>{summary.discovered} / {summary.totalPieces} pictures discovered · {summary.worlds} / {summary.totalWorlds} worlds · {save.history.length} Undo snapshots retained · sound {save.sound ? 'on' : 'off'}</p>
            <ul>{summary.families.map(family => <li key={family.id}>{family.name}: {family.discovered} / {family.pieceIds.length}{family.complete ? ', world collected' : ''}. Discovered: {family.pieceIds.filter(id => save.discoveries.includes(id)).map(id => summary.envelope.catalog.CATALOG[id].name).join(', ') || 'none'}.</li>)}</ul>
            <details><summary>Read current board and all {save.history.length} Undo snapshots</summary><p>Rows and columns run from 1 to 5. The complete v1 record below includes the board, supply, move counts, discoveries, sound and every retained snapshot, in history order.</p><ul>{save.round.board.flatMap((tile, cell) => tile ? [<li key={cell}>Row {Math.floor(cell / 5) + 1}, column {cell % 5 + 1}: {summary.envelope.catalog.CATALOG[tile.pieceId].name} (instance {tile.instanceId})</li>] : [])}</ul><pre tabIndex={0}>{JSON.stringify(save, null, 2)}</pre></details>
          </>}
        {entry.temporaryV1 && <p role="status">This tab also has temporary{entry.sessionConflict ? ' or conflicting' : ''} work. The download keeps it separately from the current stored save.</p>}
      </section>;
    })}</div>
  </>;
}
export default function RecoveryPage({ sessions, onBack }) {
  const read = () => captureRecovery(browserStorage(), sessions);
  const [snapshot, setSnapshot] = useState(read), [message, setMessage] = useState('');
  useEffect(() => {
    const refresh = () => setSnapshot(read());
    window.addEventListener('storage', refresh); window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [sessions]);
  function download() {
    try {
      const latest = read(); setSnapshot(latest); recoveryDownload(latest);
      setMessage('Backup download requested. Check that moticos-preserved-saves.json is in your downloads. Keep the file private.');
    } catch { setMessage('The backup download could not be started. Keep this tab open and try again; no stored saves were changed.'); }
  }
  return <main className="mr-page"><h1>Moticos preserved saves</h1>
    <div className="mr-controls"><button autoFocus onClick={onBack}>Back to the 80-piece collection</button><button onClick={() => { setSnapshot(read()); setMessage('Saved progress refreshed.'); }}>Refresh saved progress</button><button onClick={download}>Download all preserved saves</button></div>
    <p role="status">{message}</p><RecoveryContents snapshot={snapshot} />
  </main>;
}
