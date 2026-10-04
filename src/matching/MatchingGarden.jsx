import { useEffect, useRef, useState } from 'react';
import { BookOpen, HelpCircle, Image as ImageIcon, Lightbulb, RotateCcw, Scissors, Undo2, Volume2, VolumeX, Plus, ArrowRight } from 'lucide-react';
import useMoticosAudio from '../useMoticosAudio.js';
import { FLIGHT_MS } from '../moticosConstants.js';
import { downloadPostcard, sharePostcard } from '../exportPostcard.js';
import { CATALOG, PIECES, FAMILIES, FINALS, nextPiece, nameOf } from './catalog.js';
import { STORAGE_KEY, newSave, readSave, serializeSave, act, compatible, mergePairs } from './game.js';
import { createCollectionPostcard } from './postcard.js';
import CollectionDialog from '../collection/CollectionDialog.jsx';
import './matching.css';

function initialState() {
  try {
    const result = readSave(localStorage.getItem(STORAGE_KEY));
    return { save: result.save ?? newSave(), blocked: ['invalid', 'unsupported'].includes(result.status), raw: result.sourceRaw, unavailable: false };
  } catch { return { save: newSave(), blocked: true, raw: null, unavailable: true }; }
}
function Art({ id, className = '', description = false }) {
  const piece = CATALOG[id];
  return <img className={`cg-art ${className}`} src={piece.art} alt={description ? piece.description : ''} draggable="false" width="768" height="768" />;
}
function PostcardContent({ pieceId }) {
  const [postcard, setPostcard] = useState(null);
  const [status, setStatus] = useState('Preparing your postcard…');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let canceled = false;
    setPostcard(null); setStatus('Preparing your postcard…');
    createCollectionPostcard(pieceId).then(p => { if (!canceled) { setPostcard(p); setStatus('Ready to keep or send.'); } }).catch(() => { if (!canceled) setStatus('The postcard could not be prepared. Close it and try again.'); });
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
    <figure className="cg-postcard"><Art id={pieceId} description /><figcaption>{CATALOG[pieceId].name}<small>MOTICOS · GARDEN CORRESPONDENCE</small></figcaption></figure>
    <div className="cg-postcard-actions"><button className="cg-button cg-primary" onClick={share} disabled={!postcard || busy}>Share postcard</button><button className="cg-button" disabled={!postcard || busy} onClick={() => { downloadPostcard(postcard); setStatus('Postcard downloaded. On iPhone, find it in Safari Downloads in the Files app.'); }}>Download postcard</button></div>
    <p className="cg-export-status" role="status">{status}</p>
  </>;
}
export default function MatchingGarden() {
  const [initial] = useState(initialState);
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
  const [notice, setNotice] = useState('Start with two matching birds or two matching ferns.');
  const [storageWarning, setStorageWarning] = useState(initial.unavailable);
  const [storageConflict, setStorageConflict] = useState(false);
  const storageGuard = useRef({ raw: initial.raw, blocked: initial.blocked });
  const [hint, setHint] = useState([]);
  const boardRef = useRef(null), cells = useRef([]), timers = useRef(new Set());
  const audio = useMoticosAudio(save.sound);
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
      if (event.key === STORAGE_KEY && event.newValue !== storageGuard.current.raw) { storageGuard.current.blocked = true; setStorageConflict(true); }
    };
    window.addEventListener('storage', changed);
    window.addEventListener('blur', cancelGesture);
    function cancelGesture() { setDrag(null); }
    return () => { document.removeEventListener('visibilitychange', cancel); window.removeEventListener('blur', cancelGesture); window.removeEventListener('storage', changed); };
  }, []);
  function updateSave(next) {
    if (!next) return false;
    // Persist the committed operation before its decorative flight. Reloading
    // during animation must not discard a successful merge or supplied pair.
    if (!storageGuard.current.blocked) {
      try {
        // Never let an unread save or a stale tab replace another board.
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== storageGuard.current.raw) { storageGuard.current.blocked = true; setStorageConflict(true); }
        else {
          const raw = serializeSave(next);
          localStorage.setItem(STORAGE_KEY, raw);
          storageGuard.current.raw = raw; setStorageWarning(false);
        }
      } catch { storageGuard.current.blocked = true; setStorageWarning(true); }
    }
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
      if (stateRef.current.sound) { if (resultPiece.tier >= 3 && isNew) audioRef.current.playArrival(); else audioRef.current.playMerge(); }
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
    setSelected(null); setNotice(`A fresh ${familyId === 'bird' ? 'bird' : 'fern'} pair. Match them to make the next piece.`); audio.playPickup();
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
    downloadPostcard({ blob: new Blob([initial.raw ?? ''], { type: 'application/json' }), filename: 'moticos-original-save.json', schedule });
  }
  const activeIndex = drag?.dragging ? drag.index : selected;
  const activeTile = board[activeIndex];
  const targetPiece = selectedPiece ? nextPiece(selectedPiece.id) : CATALOG.b2;
  const inspectorPiece = selectedPiece ?? CATALOG.b1;
  const matchingCount = selectedTile ? board.filter((t, i) => i !== selected && compatible(selectedTile, t)).length : 0;
  const postcardId = selectedPiece?.tier >= 3 ? selectedPiece.id : [...postcards].sort((a, b) => a.tier - b.tier).at(-1)?.id;
  return <main className="cg-page mg-page">
    <div className="cg-shell">
      <header className="cg-header"><div><h1>Moticos<span aria-hidden="true">✳</span></h1><p>Garden correspondence</p></div><div className="cg-header-actions"><button className="cg-icon-button" aria-label={save.sound ? 'Mute sound' : 'Enable sound'} aria-pressed={save.sound} onClick={() => { perform({ type: 'sound', enabled: !stateRef.current.sound }); if (!stateRef.current.sound) return; audio.playEnabledCue(); }}>{save.sound ? <Volume2 /> : <VolumeX />}</button><button className="cg-icon-button" aria-label="How to play" disabled={busy} onClick={() => openOverlay({ type: 'help' })}><HelpCircle /></button></div></header>
      <div className="cg-mission"><div><span className="cg-eyebrow">One envelope · two little worlds</span><h2>{completed.length === 2 ? 'Two worlds, made by you.' : 'Match a pair. Grow a world.'}</h2></div><span className="cg-progress" aria-label={`${save.discoveries.length} of ${PIECES.length} pieces discovered`}>{save.discoveries.length}<span>/{PIECES.length}</span></span></div>
      <p className="cg-instruction" id="mg-instruction">Match two identical pictures. Drag together, or tap both.</p>
      <section className="cg-board" aria-label="Matching collage board, five by five" aria-describedby="mg-instruction mg-keyboard-help" ref={boardRef}>
        {board.map((tile, index) => {
          const piece = CATALOG[tile?.pieceId];
          const match = index !== activeIndex && compatible(activeTile, tile);
          const isSource = (drag?.dragging && drag.index === index) || flight?.from === index;
          const hovering = drag?.dragging && drag.magneticIndex === index;
          return <button key={index} type="button" ref={el => { cells.current[index] = el; }} data-matching-cell={index} data-piece-id={tile?.pieceId ?? 'empty'} tabIndex={index === focusIndex ? 0 : -1} onFocus={() => setFocusIndex(index)} onKeyDown={event => onKey(event, index)} aria-label={`${piece ? `${piece.name}, level ${piece.tier}` : 'Empty space'}, row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}${match ? ', matches selected piece' : ''}`} aria-pressed={selected === index} className={`cg-cell ${tile ? 'has-art' : 'is-empty'}${selected === index ? ' is-selected' : ''}${match ? ' is-match' : ''}${hovering ? ' is-target' : ''}${hint.includes(index) ? ' is-hint' : ''}${isSource ? ' is-source' : ''}${pasteIndex === index ? ' is-pasted' : ''}${flight?.to === index ? ' is-arriving' : ''}`} onPointerDown={event => pointerDown(event, index)} onPointerMove={pointerMove} onPointerUp={event => pointerUp(event, index)} onPointerCancel={event => { if (dragRef.current?.pointerId === event.pointerId) setDrag(null); }} onLostPointerCapture={event => { const d = dragRef.current; if (d?.pointerId === event.pointerId && !d.snapBack) setDrag(null); }} onClick={event => { if (event.detail === 0) choose(index); }}>
            {piece ? <><span className={`mg-level mg-${piece.familyId}`} aria-hidden="true">{piece.tier}</span><Art id={piece.id} /><span className="cg-cell-name">{piece.shortName}</span>{piece.tier === 5 && <span className="cg-finale-mark" aria-hidden="true">✳</span>}</> : <span className="cg-empty-mark" aria-hidden="true">·</span>}
          </button>;
        })}
      </section>
      {((drag?.dragging && board[drag.index]) || flight) && (() => { const floating = flight ?? drag; const tile = flight?.tile ?? board[drag.index]; return <div aria-hidden="true" className={`cg-floating${flight ? ' is-flying' : ''}${drag?.snapBack ? ' snap-back' : ''}`} style={{ left: floating.x - floating.size / 2, top: floating.y - floating.size / 2, width: floating.size, height: floating.size }}><Art id={tile.pieceId} /></div>; })()}
      <p id="mg-keyboard-help" className="cg-sr-only">Use arrow keys to move around the board. Enter or Space selects a piece, then activate the identical picture to merge or an empty space to move. Escape clears the selection.</p>
      <div className="mg-supply" aria-label="Clipping envelope">
        {FAMILIES.map(family => <button key={family.id} className={`mg-supply-button mg-${family.id}`} onClick={() => supply(family.id)} disabled={round.supply[family.id] < 2 || emptyCount < 2 || busy || Boolean(drag)} aria-label={`Add ${family.id} pair, ${round.supply[family.id] / 2} pairs left`}><Art id={family.starterId} /><span><strong>{round.supply[family.id] ? `Add ${family.id} pair` : `${family.name} supplied`}</strong><small>{round.supply[family.id] / 2} pairs left in envelope</small></span><Plus aria-hidden="true" /></button>)}
      </div>
      <div className="cg-inspector mg-inspector" aria-live="polite"><Art id={inspectorPiece.id} /><div><strong>{selectedPiece ? selectedPiece.name : 'Same picture. Next discovery.'}</strong><span>{targetPiece ? `2 ${inspectorPiece.shortName} pieces → ${targetPiece.name}` : 'A finished world. Your postcard is ready.'}</span><small>{selectedPiece ? `Level ${selectedPiece.tier} of 5${targetPiece ? matchingCount ? ' · matching pieces glow' : ` · make another ${selectedPiece.shortName}` : ''}` : 'Birds match birds. Ferns match ferns.'}</small></div>{targetPiece && <Art className="mg-next-art" id={targetPiece.id} />}</div>
      <nav className="cg-tools" aria-label="Board tools"><button className="cg-tool" onClick={undo} disabled={!save.history.length || busy}><Undo2 /><span>Undo</span></button><button className="cg-tool" onClick={cut} disabled={!selectedPiece || selectedPiece.tier < 2 || !emptyCount || busy}><Scissors /><span>Cut</span></button><button className="cg-tool" onClick={showHint} disabled={busy}><Lightbulb /><span>Hint</span></button><button className="cg-tool" onClick={() => openOverlay({ type: 'collection' })} disabled={busy}><BookOpen /><span>Collection</span></button></nav>
      <div className="cg-notice" role="status" aria-live="polite">{emptyCount < 2 && round.supply.bird + round.supply.fern > 0 ? 'Merge matching pieces to make room for a fresh pair.' : notice}</div>
      <button className={`cg-postcard-button ${postcardId ? 'is-ready' : ''}`} onClick={() => openOverlay({ type: 'postcard', pieceId: postcardId })} disabled={!postcardId || busy}><ImageIcon /><span>{postcardId ? 'Open your postcard' : 'Your first postcard arrives at level 3'}</span>{postcardId && <span aria-hidden="true">↗</span>}</button>
      {storageConflict ? <p className="cg-save-warning" role="alert">Another tab changed this garden. This tab will not overwrite it. Reload to continue the saved board, or keep this tab open for temporary play.</p> : initial.blocked ? <p className="cg-save-warning" role="alert">Your existing save could not be read and has been left untouched. This practice board is temporary. {typeof initial.raw === 'string' && <button className="mg-text-button" onClick={downloadOriginal}>Download original save</button>}</p> : storageWarning && <p className="cg-save-warning" role="alert">This browser cannot safely save progress. Keep this tab open to continue your board.</p>}
      <footer className="cg-footer"><span>{initial.blocked || storageWarning || storageConflict ? 'Playing in this tab' : 'Progress saves in this browser'}</span><button onClick={() => openOverlay({ type: 'reset' })} disabled={busy}>Fresh envelope</button></footer>
    </div>
    {overlay && <CollectionDialog title={overlay.type === 'postcard' ? 'Your correspondence' : overlay.type === 'collection' ? 'Your two garden paths' : overlay.type === 'reset' ? 'Open a fresh envelope?' : 'Two of a kind'} onClose={() => setOverlay(null)} className={overlay.type === 'postcard' ? 'cg-dialog-postcard' : ''}>
      {overlay.type === 'postcard' && <PostcardContent key={overlay.pieceId} pieceId={overlay.pieceId} />}
      {overlay.type === 'help' && <div className="cg-help"><div className="mg-help-equation"><Art id="b1" /><span>+</span><Art id="b1" /><ArrowRight /><Art id="b2" /></div><p>Two identical pictures make one new piece. A bird matches a bird, a fern matches a fern, and two Riverwings make a Wayfinder.</p><ol><li>Drag one piece onto its match, or tap a piece and then its match. Matching pieces glow.</li><li>The two buttons below the board add a matching pair from your envelope. Each path has enough pieces to reach level 5. There is no waiting or payment.</li><li>Keep matching your new pieces. Level 3 earns your first postcard; levels 4 and 5 reveal more. Open a postcard whenever you like, then return to the same board.</li><li>Undo takes back a move, including a supplied pair. Cut turns a selected made piece into two of its previous level when there is space.</li></ol><p>Invalid matches cost nothing. Every discovered picture stays in your collection, including its postcard, even after a merge, Cut, Undo or fresh envelope.</p><p>This 10-piece garden is a test of the play experience before the full collection is built.</p><h3>Keyboard</h3><p>Tab to the board, use arrow keys, and press Enter or Space to select and match. Escape clears the selection.</p></div>}
      {overlay.type === 'reset' && <div className="cg-help"><p>This starts this garden again with a full envelope and clears the current board and Undo history. Your discovered art and postcards stay in the collection.</p><button className="cg-button cg-primary" onClick={resetRound}><RotateCcw size={18} /> Start fresh</button></div>}
      {overlay.type === 'collection' && <><p className="cg-collection-intro">{save.discoveries.length} of {PIECES.length} discovered. Each step is made by matching two identical pieces from the step before it.</p>{FAMILIES.map(family => <section className="mg-family-collection" key={family.id}><h3>{family.name}</h3><div className="mg-chain">{family.pieceIds.map(id => { const piece = CATALOG[id], known = save.discoveries.includes(id); return <article className={`cg-collection-piece${known ? '' : ' is-undiscovered'}`} key={id}><span className="mg-chain-level">Level {piece.tier}</span>{known ? <Art id={id} description /> : <div className="cg-mystery" aria-hidden="true">?</div>}<h4>{known ? piece.name : `A new ${family.id === 'bird' ? 'bird' : 'garden'} discovery`}</h4><p>{piece.tier === 1 ? 'From your envelope' : `2 × ${CATALOG[family.pieceIds[piece.tier - 2]].name}`}</p>{known && piece.tier >= 3 && <button className="cg-button" onClick={() => setOverlay({ type: 'postcard', pieceId: id })}>Open postcard</button>}</article>; })}</div></section>)}<p className="cg-collection-note">Every discovered artwork stays here. Your earlier postcards are always available.</p></>}
    </CollectionDialog>}
  </main>;
}
