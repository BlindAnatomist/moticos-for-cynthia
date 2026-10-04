import { useEffect, useRef, useState } from 'react';
import { BookOpen, HelpCircle, Image as ImageIcon, Lightbulb, RotateCcw, Scissors, Undo2, Volume2, VolumeX, Plus, ArrowRight } from 'lucide-react';
import useMoticosAudio from '../useMoticosAudio.js';
import { FLIGHT_MS } from '../moticosConstants.js';
import { downloadPostcard, sharePostcard } from '../exportPostcard.js';
import { DEFAULT_ENVELOPE_ID, ENVELOPES, getEnvelope, getMatchingEngine } from './registry.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from './session.js';
import { createCollectionPostcard } from './postcard.js';
import CollectionDialog from '../collection/CollectionDialog.jsx';
import './matching.css';

// Access to the storage property itself can throw (for example blocked cookies).
// Resolve it only inside the guarded session operation.
const browserStorage = {
  getItem: key => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
};

function Art({ id, catalog, className = '', description = false, lazy = false }) {
  const piece = catalog[id];
  return <img className={`cg-art ${className}`} src={piece.art} alt={description ? piece.description : ''} draggable="false" loading={lazy ? 'lazy' : 'eager'} width="768" height="768" />;
}
function PostcardContent({ pieceId, envelope }) {
  const CATALOG = envelope.catalog.CATALOG;
  const [postcard, setPostcard] = useState(null);
  const [status, setStatus] = useState('Preparing your postcard…');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let canceled = false;
    setPostcard(null); setStatus('Preparing your postcard…');
    createCollectionPostcard(pieceId, CATALOG, envelope.subtitle).then(p => { if (!canceled) { setPostcard(p); setStatus('Ready to keep or send.'); } }).catch(() => { if (!canceled) setStatus('The postcard could not be prepared. Close it and try again.'); });
    return () => { canceled = true; };
  }, [pieceId]);
  async function share() {
    if (!postcard || busy) return;
    setBusy(true);
    try { const result = await sharePostcard(postcard); setStatus(result.shared ? 'Share sheet opened.' : 'Sharing is unavailable in this browser. Download the postcard instead.'); }
    catch (error) { setStatus(error.name === 'AbortError' ? 'Sharing canceled. Your postcard is still here.' : 'Sharing failed. You can download the postcard instead.'); }
    finally { setBusy(false); }
  }
  return <>
    <figure className="cg-postcard"><Art catalog={CATALOG} id={pieceId} description /><figcaption>{CATALOG[pieceId].name}<small>MOTICOS · {envelope.subtitle.toUpperCase()}</small></figcaption></figure>
    <div className="cg-postcard-actions"><button className="cg-button cg-primary" onClick={share} disabled={!postcard || busy}>Share postcard</button><button className="cg-button" disabled={!postcard || busy} onClick={() => { downloadPostcard(postcard); setStatus('Postcard downloaded. On iPhone, find it in Safari Downloads in the Files app.'); }}>Download postcard</button></div>
    <p className="cg-export-status" role="status">{status}</p>
  </>;
}
export default function MatchingGarden({ envelopeId = DEFAULT_ENVELOPE_ID, sessionCache = new Map(), onChooseEnvelope = null, sharedSound = null, onSoundChoice = null } = {}) {
  const envelope = getEnvelope(envelopeId);
  const engine = getMatchingEngine(envelopeId);
  const { CATALOG, PIECES, FAMILIES, FINALS, nextPiece, nameOf, act, compatible, mergePairs } = engine;
  const [initial] = useState(() => openEnvelopeSession(engine, sessionCache, browserStorage));
  const [save, setSave] = useState(initial.save);
  const stateRef = useRef(save); stateRef.current = save;
  const [selected, setSelected] = useState(null);
  const [focusIndex, setFocusIndex] = useState(6);
  const [drag, setDragState] = useState(null);
  const dragRef = useRef(null);
  const [flight, setFlight] = useState(null);
  const flightRef = useRef(null);
  const [pasteIndex, setPasteIndex] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [notice, setNotice] = useState(`Start with two matching ${FAMILIES[0].id} pieces or two matching ${FAMILIES[1].id} pieces.`);
  const [storageWarning, setStorageWarning] = useState(initial.unavailable);
  const [storageConflict, setStorageConflict] = useState(initial.conflict);
  const [collectionEnvelopeId, setCollectionEnvelopeId] = useState(envelopeId);
  const [hint, setHint] = useState([]);
  const boardRef = useRef(null), cells = useRef([]), timers = useRef(new Set());
  const soundEnabled = sharedSound ?? save.sound;
  const soundRef = useRef(soundEnabled); soundRef.current = soundEnabled;
  const audio = useMoticosAudio(soundEnabled);
  useEffect(() => {
    if (sharedSound === null) onSoundChoice?.(stateRef.current.sound);
    else if (stateRef.current.sound !== sharedSound) perform({ type: 'sound', enabled: sharedSound });
  }, [sharedSound]);
  const audioRef = useRef(audio); audioRef.current = audio;
  const round = save.round, board = round.board;
  const selectedTile = board[selected], selectedPiece = CATALOG[selectedTile?.pieceId];
  const completed = FINALS.filter(id => board.some(t => t?.pieceId === id));
  const postcards = PIECES.filter(p => p.tier >= 3 && save.discoveries.includes(p.id));
  const busy = Boolean(flight);
  const emptyCount = board.filter(t => !t).length;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function schedule(callback, delay) { const timer = setTimeout(() => { timers.current.delete(timer); callback(); }, delay); timers.current.add(timer); return timer; }
  function clearTimers() { for (const timer of timers.current) clearTimeout(timer); timers.current.clear(); }
  function setDrag(value) { dragRef.current = value; setDragState(value); }
  function cancelInteraction() { setDrag(null); flightRef.current = null; setFlight(null); }
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); }, []);
  useEffect(() => {
    const cancel = () => { if (document.hidden) setDrag(null); };
    document.addEventListener('visibilitychange', cancel);
    const changed = event => {
      if (observeEnvelopeStorage(engine, initial, event)) setStorageConflict(true);
    };
    window.addEventListener('storage', changed);
    window.addEventListener('blur', cancelGesture);
    function cancelGesture() { setDrag(null); }
    return () => { document.removeEventListener('visibilitychange', cancel); window.removeEventListener('blur', cancelGesture); window.removeEventListener('storage', changed); };
  }, []);
  function updateSave(next) {
    if (!next) return false;
    // Save before decorative flight, or retain protected temporary state in this tab.
    commitEnvelopeSession(engine, initial, next, browserStorage);
    setStorageWarning(initial.unavailable); setStorageConflict(initial.conflict);
    stateRef.current = next; setSave(next); setHint([]); return true;
  }
  function perform(action) { return updateSave(act(stateRef.current, action)); }
  function center(index) {
    const rect = cells.current[index]?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: Math.min(rect.width, rect.height) } : null;
  }
  function cellAt(x, y) {
    const cell = document.elementFromPoint(x, y)?.closest?.('[data-matching-cell]');
    return cell && boardRef.current?.contains(cell) ? Number(cell.dataset.matchingCell) : -1;
  }
  function magneticTarget(x, y, from) {
    const currentBoard = stateRef.current.round.board;
    let best = null;
    currentBoard.forEach((tile, index) => {
      if (index === from || !compatible(currentBoard[from], tile)) return;
      const c = center(index); if (!c) return;
      const distance = Math.hypot(x - c.x, y - c.y), radius = Math.max(44, c.size * 0.8);
      if (distance <= radius && (!best || distance < best.distance)) best = { index, center: c, distance, radius };
    });
    return best;
  }
  function focusCell(index) { setFocusIndex(index); cells.current[index]?.focus({ preventScroll: true }); }
  function completeMerge(from, to, source = null) {
    if (flightRef.current || overlay) return;
    const snapshot = stateRef.current;
    const next = act(snapshot, { type: 'merge', from, to });
    if (!next) return;
    const target = center(to), origin = source ?? center(from);
    if (!origin || !target) return;
    const resultPiece = CATALOG[next.round.board[to].pieceId];
    const isNew = !snapshot.discoveries.includes(resultPiece.id);
    flightRef.current = { from, to };
    setFlight({ from, to, tile: snapshot.round.board[from], ...origin });
    updateSave(next);
    setDrag(null); setSelected(null); setHint([]);
    requestAnimationFrame(() => setFlight(current => current ? { ...current, x: target.x, y: target.y } : current));
    schedule(() => {
      flightRef.current = null; setFlight(null); setPasteIndex(to); setSelected(to); focusCell(to);
      const title = resultPiece.name;
      const message = resultPiece.tier === 5 ? `${title} complete. One whole little world, made by you.` : isNew && resultPiece.tier >= 3 ? `${title} discovered. A new postcard is ready whenever you want it.` : `${title}${isNew ? ' discovered' : ' made'}. Match two of these to grow the next piece.`;
      setNotice(message);
      if (soundRef.current) { if (resultPiece.tier >= 3 && isNew) audioRef.current.playArrival(); else audioRef.current.playMerge(); }
      schedule(() => setPasteIndex(current => current === to ? null : current), 320);
    }, reducedMotion() ? 0 : FLIGHT_MS);
  }
  function choose(index) {
    if (dragRef.current || flightRef.current || overlay) return;
    setHint([]);
    const currentBoard = stateRef.current.round.board;
    if (selected === index) { setSelected(null); return; }
    if (selected !== null && currentBoard[selected]) {
      if (compatible(currentBoard[selected], currentBoard[index])) { completeMerge(selected, index); return; }
      if (!currentBoard[index]) {
        perform({ type: 'move', from: selected, to: index }); setSelected(index); focusCell(index); setNotice(`${nameOf(currentBoard[selected])} moved.`); return;
      }
      setNotice(currentBoard[selected].pieceId === currentBoard[index].pieceId ? 'This is a finished piece. Its postcard is yours to keep.' : 'Match the exact same picture and level. These pieces stay safe.');
    }
    if (currentBoard[index]) { setSelected(index); audio.playPickup(); }
  }
  function pointerDown(event, index) {
    if (event.button !== 0 || event.isPrimary === false || dragRef.current || flightRef.current || !stateRef.current.round.board[index] || overlay) return;
    const c = center(index); if (!c) return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { return; }
    setDrag({ index, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, rawX: event.clientX, rawY: event.clientY, size: c.size, dragging: false });
    audio.playPickup();
  }
  function pointerMove(event) {
    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId || current.snapBack) return;
    const x = event.clientX, y = event.clientY;
    const dragging = current.dragging || Math.hypot(x - current.startX, y - current.startY) > 6;
    const direct = cellAt(x, y), currentBoard = stateRef.current.round.board;
    // A deliberate drop on different artwork must not be stolen by a nearby
    // matching piece. Magnetism is for matching targets and open-space misses.
    const blocked = direct >= 0 && direct !== current.index && currentBoard[direct] && !compatible(currentBoard[current.index], currentBoard[direct]);
    const magnetic = dragging && !blocked ? magneticTarget(x, y, current.index) : null;
    const pull = magnetic ? 0.28 + (1 - magnetic.distance / magnetic.radius) * 0.34 : 0;
    setDrag({ ...current, dragging, rawX: x, rawY: y, x: x + ((magnetic?.center.x ?? x) - x) * pull, y: y + ((magnetic?.center.y ?? y) - y) * pull, magneticIndex: magnetic?.index ?? null });
  }
  function pointerUp(event, index) {
    if (event.button !== 0 || event.isPrimary === false) return;
    const current = dragRef.current;
    if (!current) { if (!stateRef.current.round.board[index] && !flightRef.current) choose(index); return; }
    if (current.pointerId !== event.pointerId || current.snapBack) return;
    if (!current.dragging) { setDrag(null); choose(current.index); return; }
    const currentBoard = stateRef.current.round.board;
    const direct = cellAt(event.clientX, event.clientY);
    const directOccupied = direct >= 0 && currentBoard[direct];
    const blocked = directOccupied && direct !== current.index && !compatible(currentBoard[current.index], currentBoard[direct]);
    const magnetic = !blocked ? magneticTarget(event.clientX, event.clientY, current.index) : null;
    const target = directOccupied ? direct : magnetic?.index ?? direct;
    if (target !== current.index && compatible(currentBoard[current.index], currentBoard[target])) { completeMerge(current.index, target, current); return; }
    if (direct >= 0 && !currentBoard[direct]) {
      perform({ type: 'move', from: current.index, to: direct }); setSelected(direct); setDrag(null); focusCell(direct); setNotice(`${nameOf(currentBoard[current.index])} moved.`); return;
    }
    const origin = center(current.index);
    if (!origin) { setDrag(null); return; }
    setDrag({ ...current, ...origin, snapBack: true });
    setNotice('Match two identical pictures. Nothing was lost.'); audio.playDenied();
    const gesture = dragRef.current;
    schedule(() => { if (dragRef.current === gesture) setDrag(null); }, reducedMotion() ? 0 : 170);
  }
  function undo() {
    if (!stateRef.current.history.length || flightRef.current) return;
    clearTimers(); cancelInteraction(); perform({ type: 'undo' });
    setSelected(null); setPasteIndex(null); setHint([]); setNotice('Last move undone. Your discovered art is kept.');
  }
  function cut() {
    if (dragRef.current || flightRef.current || selected === null) return;
    const name = nameOf(stateRef.current.round.board[selected]);
    if (!perform({ type: 'cut', index: selected })) return;
    setSelected(null); setNotice(`${name} returned to two matching pieces.`); audio.playCut();
  }
  function supply(familyId) {
    if (dragRef.current || flightRef.current) return;
    if (!perform({ type: 'supply', familyId })) { setNotice('Make room for a pair by merging two matching pieces.'); return; }
    setSelected(null); setNotice(`A fresh ${familyId} pair. Match them to make the next piece.`); audio.playPickup();
  }
  function showHint() {
    const current = stateRef.current.round;
    const pairs = mergePairs(current.board);
    const pair = pairs.sort((a, b) => CATALOG[current.board[b[0]].pieceId].tier - CATALOG[current.board[a[0]].pieceId].tier)[0];
    if (pair) { setHint(pair); setNotice(`Match the two highlighted ${CATALOG[current.board[pair[0]].pieceId].shortName} pieces.`); }
    else if (completed.length === 2) setNotice('Both worlds are complete. Keep any postcard, or open a fresh envelope.');
    else { const family = FAMILIES.find(f => current.supply[f.id] > 0); setNotice(family ? `Add a ${family.id} pair from the envelope below the board.` : 'Your matching pieces can be brought together from anywhere on the board.'); }
  }
  function resetRound() {
    clearTimers(); cancelInteraction(); perform({ type: 'reset' });
    setSelected(null); setHint([]); setPasteIndex(null); setOverlay(null); setNotice('A fresh envelope. Your discovered art and postcards are still safe.');
  }
  function onKey(event, index) {
    const row = Math.floor(index / 5), col = index % 5;
    const target = { ArrowRight: row * 5 + Math.min(4, col + 1), ArrowLeft: row * 5 + Math.max(0, col - 1), ArrowUp: Math.max(0, index - 5), ArrowDown: Math.min(24, index + 5), Home: row * 5, End: row * 5 + 4 }[event.key];
    if (target !== undefined) { event.preventDefault(); focusCell(target); }
    if (event.key === 'Escape') { setSelected(null); setHint([]); setDrag(null); }
  }
  function openOverlay(value) { if (flightRef.current) return; setDrag(null); setOverlay(value); }
  function downloadOriginal() {
    downloadPostcard({ blob: new Blob([initial.sourceRaw ?? ''], { type: 'application/json' }), filename: `moticos-${envelopeId}-original-save.json`, schedule });
  }
  const activeIndex = drag?.dragging ? drag.index : selected;
  const activeTile = board[activeIndex];
  const targetPiece = selectedPiece ? nextPiece(selectedPiece.id) : CATALOG[FAMILIES[0].pieceIds[1]];
  const inspectorPiece = selectedPiece ?? CATALOG[FAMILIES[0].starterId];
  const matchingCount = selectedTile ? board.filter((t, i) => i !== selected && compatible(selectedTile, t)).length : 0;
  const postcardId = selectedPiece?.tier >= 3 ? selectedPiece.id : [...postcards].sort((a, b) => a.tier - b.tier).at(-1)?.id;
  return <main className="cg-page mg-page">
    <div className="cg-shell">
      <header className="cg-header"><div><h1>Moticos<span aria-hidden="true">✳</span></h1><p>{envelope.subtitle}</p></div><div className="cg-header-actions"><button className="cg-icon-button" aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'} aria-pressed={soundEnabled} onClick={() => { const enabled = !soundEnabled; perform({ type: 'sound', enabled }); onSoundChoice?.(enabled); if (enabled) audio.playEnabledCue(); }}>{soundEnabled ? <Volume2 /> : <VolumeX />}</button><button className="cg-icon-button" aria-label="How to play" disabled={busy} onClick={() => openOverlay({ type: 'help' })}><HelpCircle /></button></div></header>
      <div className="cg-mission"><div><span className="cg-eyebrow">One envelope · two little worlds</span><h2>{completed.length === 2 ? 'Two worlds, made by you.' : 'Match a pair. Grow a world.'}</h2></div><span className="cg-progress" aria-label={`${save.discoveries.length} of ${PIECES.length} pieces discovered`}>{save.discoveries.length}<span>/{PIECES.length}</span></span></div>
      <p className="cg-instruction" id="mg-instruction">Match two identical pictures. Drag together, or tap both.</p>
      <section className="cg-board" aria-label="Matching collage board, five by five" aria-describedby="mg-instruction mg-keyboard-help" ref={boardRef}>
        {board.map((tile, index) => {
          const piece = CATALOG[tile?.pieceId];
          const match = index !== activeIndex && compatible(activeTile, tile);
          const isSource = (drag?.dragging && drag.index === index) || flight?.from === index;
          const hovering = drag?.dragging && drag.magneticIndex === index;
          return <button key={index} type="button" ref={el => { cells.current[index] = el; }} data-matching-cell={index} data-piece-id={tile?.pieceId ?? 'empty'} tabIndex={index === focusIndex ? 0 : -1} onFocus={() => setFocusIndex(index)} onKeyDown={event => onKey(event, index)} aria-label={`${piece ? `${piece.name}, level ${piece.tier}` : 'Empty space'}, row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}${match ? ', matches selected piece' : ''}`} aria-pressed={selected === index} className={`cg-cell ${tile ? 'has-art' : 'is-empty'}${selected === index ? ' is-selected' : ''}${match ? ' is-match' : ''}${hovering ? ' is-target' : ''}${hint.includes(index) ? ' is-hint' : ''}${isSource ? ' is-source' : ''}${pasteIndex === index ? ' is-pasted' : ''}${flight?.to === index ? ' is-arriving' : ''}`} onPointerDown={event => pointerDown(event, index)} onPointerMove={pointerMove} onPointerUp={event => pointerUp(event, index)} onPointerCancel={event => { if (dragRef.current?.pointerId === event.pointerId) setDrag(null); }} onLostPointerCapture={event => { const d = dragRef.current; if (d?.pointerId === event.pointerId && !d.snapBack) setDrag(null); }} onClick={event => { if (event.detail === 0) choose(index); }}>
            {piece ? <><span className={`mg-level mg-${piece.familyId}`} aria-hidden="true">{piece.tier}</span><Art catalog={CATALOG} id={piece.id} /><span className="cg-cell-name">{piece.shortName}</span>{piece.tier === 5 && <span className="cg-finale-mark" aria-hidden="true">✳</span>}</> : <span className="cg-empty-mark" aria-hidden="true">·</span>}
          </button>;
        })}
      </section>
      {((drag?.dragging && board[drag.index]) || flight) && (() => { const floating = flight ?? drag; const tile = flight?.tile ?? board[drag.index]; return <div aria-hidden="true" className={`cg-floating${flight ? ' is-flying' : ''}${drag?.snapBack ? ' snap-back' : ''}`} style={{ left: floating.x - floating.size / 2, top: floating.y - floating.size / 2, width: floating.size, height: floating.size }}><Art catalog={CATALOG} id={tile.pieceId} /></div>; })()}
      <p id="mg-keyboard-help" className="cg-sr-only">Use arrow keys to move around the board. Enter or Space selects a piece, then activate the identical picture to merge or an empty space to move. Escape clears the selection.</p>
      <div className="mg-supply" aria-label="Clipping envelope">
        {FAMILIES.map(family => <button key={family.id} className={`mg-supply-button mg-${family.id}`} onClick={() => supply(family.id)} disabled={round.supply[family.id] < 2 || emptyCount < 2 || busy || Boolean(drag)} aria-label={`Add ${family.id} pair, ${round.supply[family.id] / 2} pairs left`}><Art catalog={CATALOG} id={family.starterId} /><span><strong>{round.supply[family.id] ? `Add ${family.id} pair` : `${family.name} supplied`}</strong><small>{round.supply[family.id] / 2} pairs left in envelope</small></span><Plus aria-hidden="true" /></button>)}
      </div>
      <div className="cg-inspector mg-inspector" aria-live="polite"><Art catalog={CATALOG} id={inspectorPiece.id} /><div><strong>{selectedPiece ? selectedPiece.name : 'Same picture. Next discovery.'}</strong><span>{targetPiece ? `2 ${inspectorPiece.shortName} pieces → ${targetPiece.name}` : 'A finished world. Your postcard is ready.'}</span><small>{selectedPiece ? `Level ${selectedPiece.tier} of 5${targetPiece ? matchingCount ? ' · matching pieces glow' : ` · make another ${selectedPiece.shortName}` : ''}` : `${FAMILIES[0].shortName} matches ${FAMILIES[0].shortName.toLowerCase()}. ${FAMILIES[1].shortName} matches ${FAMILIES[1].shortName.toLowerCase()}.`}</small></div>{targetPiece && <Art catalog={CATALOG} className="mg-next-art" id={targetPiece.id} />}</div>
      <nav className="cg-tools" aria-label="Board tools"><button className="cg-tool" onClick={undo} disabled={!save.history.length || busy}><Undo2 /><span>Undo</span></button><button className="cg-tool" onClick={cut} disabled={!selectedPiece || selectedPiece.tier < 2 || !emptyCount || busy}><Scissors /><span>Cut</span></button><button className="cg-tool" onClick={showHint} disabled={busy}><Lightbulb /><span>Hint</span></button><button className="cg-tool" onClick={() => openOverlay({ type: 'collection' })} disabled={busy}><BookOpen /><span>Collection</span></button></nav>
      <div className="cg-notice" role="status" aria-live="polite">{emptyCount < 2 && Object.values(round.supply).some(amount => amount > 0) ? 'Merge matching pieces to make room for a fresh pair.' : notice}</div>
      <button className={`cg-postcard-button ${postcardId ? 'is-ready' : ''}`} onClick={() => openOverlay({ type: 'postcard', pieceId: postcardId })} disabled={!postcardId || busy}><ImageIcon /><span>{postcardId ? 'Open your postcard' : 'Your first postcard arrives at level 3'}</span>{postcardId && <span aria-hidden="true">↗</span>}</button>
      {storageConflict ? <p className="cg-save-warning" role="alert">Another tab changed this garden. This tab will not overwrite it. Reload to continue the saved board, or keep this tab open for temporary play.</p> : initial.invalid ? <p className="cg-save-warning" role="alert">Your existing save could not be read and has been left untouched. This practice board is temporary. {typeof initial.sourceRaw === 'string' && <button className="mg-text-button" onClick={downloadOriginal}>Download original save</button>}</p> : storageWarning && <p className="cg-save-warning" role="alert">This browser cannot safely save progress. Keep this tab open to continue your board.</p>}
      <footer className="cg-footer"><span>{initial.blocked || storageWarning || storageConflict ? 'Playing in this tab' : 'Progress saves in this browser'}</span><div className="mg-footer-actions">{onChooseEnvelope && <button onClick={() => openOverlay({ type: 'envelopes' })} disabled={busy}>Envelopes</button>}<button onClick={() => openOverlay({ type: 'reset' })} disabled={busy}>Fresh envelope</button></div></footer>
    </div>
    {overlay && <CollectionDialog title={overlay.type === 'postcard' ? 'Your correspondence' : overlay.type === 'collection' ? 'Your collection' : overlay.type === 'envelopes' ? 'Your envelopes' : overlay.type === 'reset' ? 'Open a fresh envelope?' : 'Two of a kind'} onClose={() => setOverlay(null)} className={overlay.type === 'postcard' ? 'cg-dialog-postcard' : ''}>
      {overlay.type === 'postcard' && <PostcardContent key={overlay.pieceId} pieceId={overlay.pieceId} envelope={getEnvelope(overlay.envelopeId ?? envelopeId)} />}
      {overlay.type === 'help' && <div className="cg-help"><div className="mg-help-equation"><Art catalog={CATALOG} id={FAMILIES[0].starterId} /><span>+</span><Art catalog={CATALOG} id={FAMILIES[0].starterId} /><ArrowRight /><Art catalog={CATALOG} id={FAMILIES[0].pieceIds[1]} /></div><p>Two identical pictures make one new piece. {FAMILIES[0].shortName} matches {FAMILIES[0].shortName.toLowerCase()}, {FAMILIES[1].shortName.toLowerCase()} matches {FAMILIES[1].shortName.toLowerCase()}, and two {CATALOG[FAMILIES[0].pieceIds[1]].name} pieces make {CATALOG[FAMILIES[0].pieceIds[2]].name}.</p><ol><li>Drag one piece onto its match, or tap a piece and then its match. Matching pieces glow.</li><li>The two buttons below the board add a matching pair from your envelope. Each path has enough pieces to reach level 5. There is no waiting or payment.</li><li>Keep matching your new pieces. Level 3 earns your first postcard; levels 4 and 5 reveal more. Open a postcard whenever you like, then return to the same board.</li><li>Undo takes back a move, including a supplied pair. Cut turns a selected made piece into two of its previous level when there is space.</li></ol><p>Invalid matches cost nothing. Every discovered picture stays in your collection, including its postcard, even after a merge, Cut, Undo or fresh envelope.</p><p>Each envelope has ten distinct pieces and six postcards to discover. Use Envelopes to visit another journey; each board and its Undo history wait for you. More of the collection is still being made.</p><h3>Keyboard</h3><p>Tab to the board, use arrow keys, and press Enter or Space to select and match. Escape clears the selection.</p></div>}
      {overlay.type === 'reset' && <div className="cg-help"><p>This starts {envelope.title} again with a full envelope and clears the current board and Undo history. Your discovered art and postcards stay in the collection.</p><button className="cg-button cg-primary" onClick={resetRound}><RotateCcw size={18} /> Start fresh</button></div>}
      {overlay.type === 'envelopes' && <EnvelopeChooser currentId={envelopeId} sessionCache={sessionCache} onChoose={id => { if (id === envelopeId) setOverlay(null); else onChooseEnvelope?.(id); }} />}
      {overlay.type === 'collection' && <CollectionContent envelopeId={collectionEnvelopeId} sessionCache={sessionCache} activeSave={save} activeId={envelopeId} onSelect={setCollectionEnvelopeId} onPostcard={id => setOverlay({ type: 'postcard', pieceId: id, envelopeId: collectionEnvelopeId })} />}

    </CollectionDialog>}
  </main>;
}

function snapshot(envelope, cache) {
  const session = cache.get(envelope.storageKey);
  if (session) return { save: session.save, temporary: session.blocked, unread: session.invalid };
  try {
    const engine = getMatchingEngine(envelope.id), result = engine.readSave(localStorage.getItem(engine.STORAGE_KEY));
    return { save: result.save ?? engine.newSave(), temporary: result.status === 'invalid' || result.status === 'unsupported', unread: result.status === 'invalid' || result.status === 'unsupported' };
  } catch { return { save: getMatchingEngine(envelope.id).newSave(), temporary: true, unread: true }; }
}
function EnvelopeChooser({ currentId, sessionCache, onChoose }) {
  return <div className="mg-envelope-list"><p className="cg-collection-intro">Two matching journeys in every envelope. Your boards, Undo history, and discoveries stay where you leave them.</p>{ENVELOPES.map(envelope => {
    const { save, temporary, unread } = snapshot(envelope, sessionCache);
    const catalog = envelope.catalog, complete = catalog.FINALS.filter(id => save.round.board.some(tile => tile?.pieceId === id)).length;
    return <article className="mg-envelope-card" key={envelope.id}>
      <div className="mg-envelope-art" aria-hidden="true">{catalog.STARTERS.map(id => <Art key={id} catalog={catalog.CATALOG} id={id} lazy />)}</div>
      <div><h3>{envelope.title}</h3><p>{envelope.description}</p><small>{unread ? 'Saved board left untouched' : `${save.discoveries.length} / ${catalog.PIECES.length} discovered · ${complete} / 2 worlds complete`}{temporary ? ' · temporary play kept in this tab' : ''}</small></div>
      <button className="cg-button" aria-current={currentId === envelope.id ? 'true' : undefined} onClick={() => onChoose(envelope.id)}>{currentId === envelope.id ? 'Back to this board' : `Open ${envelope.title}`}</button>
    </article>;
  })}<p className="cg-collection-note">20 distinct artworks across two envelopes. This is the next part of a growing collection.</p></div>;
}
function CollectionContent({ envelopeId, sessionCache, activeSave, activeId, onSelect, onPostcard }) {
  const envelope = getEnvelope(envelopeId), { CATALOG, PIECES, FAMILIES } = envelope.catalog;
  const observed = snapshot(envelope, sessionCache), save = envelopeId === activeId ? activeSave : observed.save;
  return <><nav className="mg-collection-tabs" aria-label="Collection envelopes">{ENVELOPES.map(item => <button key={item.id} className="cg-button" aria-pressed={item.id === envelopeId} onClick={() => onSelect(item.id)}>{item.title}</button>)}</nav>
    <p className="cg-collection-intro">{save.discoveries.length} of {PIECES.length} discovered in {envelope.title}. Each step is made by matching two identical pieces from the step before it.</p>
    {observed.unread && <p className="cg-save-warning" role="status">This envelope’s saved collection cannot be read. Its original save is untouched; temporary discoveries are shown here.</p>}
    {FAMILIES.map(family => <section className="mg-family-collection" key={family.id}><h3>{family.name}</h3><div className="mg-chain">{family.pieceIds.map(id => { const piece = CATALOG[id], known = save.discoveries.includes(id); return <article className={`cg-collection-piece${known ? '' : ' is-undiscovered'}`} key={id}><span className="mg-chain-level">Level {piece.tier}</span>{known ? <Art catalog={CATALOG} id={id} description lazy /> : <div className="cg-mystery" aria-hidden="true">?</div>}<h4>{known ? piece.name : `A new ${family.id} discovery`}</h4><p>{piece.tier === 1 ? 'From your envelope' : `2 × ${CATALOG[family.pieceIds[piece.tier - 2]].name}`}</p>{known && piece.tier >= 3 && <button className="cg-button" onClick={() => onPostcard(id)}>Open postcard</button>}</article>; })}</div></section>)}
    <p className="cg-collection-note">Every discovered artwork stays here. Your earlier postcards are always available.</p></>;
}
