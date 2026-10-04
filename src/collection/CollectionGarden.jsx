import { useEffect, useRef, useState } from 'react';
import { BookOpen, HelpCircle, Image as ImageIcon, Lightbulb, RotateCcw, Scissors, Undo2, Volume2, VolumeX } from 'lucide-react';
import useMoticosAudio from '../useMoticosAudio.js';
import { FLIGHT_MS } from '../moticosConstants.js';
import { downloadPostcard, sharePostcard } from '../exportPostcard.js';
import { CATALOG, PIECES, RECIPES, FINALS, recipeFor, nameOf } from './catalog.js';
import { STORAGE_KEY, newSave, parseSave, createRound, compatible, mergePieces, movePiece, cutPiece, availableRecipes, completedFinals } from './collectionLogic.js';
import { createCollectionPostcard } from './postcard.js';
import CollectionDialog from './CollectionDialog.jsx';
import './collection.css';

function readInitialSave() {
  try { return parseSave(localStorage.getItem(STORAGE_KEY)) ?? newSave(); }
  catch { return newSave(); }
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
    createCollectionPostcard(pieceId).then(p => { if (!canceled) { setPostcard(p); setStatus('Ready to keep or send.'); } }).catch(() => { if (!canceled) setStatus('The postcard could not be prepared. Close it and try again.'); });
    return () => { canceled = true; };
  }, [pieceId]);
  async function share() {
    if (!postcard || busy) return;
    setBusy(true);
    try {
      const result = await sharePostcard(postcard);
      setStatus(result.shared ? 'Share sheet opened.' : 'Sharing is unavailable in this browser. Download the postcard instead.');
    } catch (error) { setStatus(error.name === 'AbortError' ? 'Sharing canceled. Your postcard is still here.' : 'Sharing failed. You can download the postcard instead.'); }
    finally { setBusy(false); }
  }
  return <>
    <figure className="cg-postcard"><Art id={pieceId} description /><figcaption>{CATALOG[pieceId].name}<small>MOTICOS · GARDEN CORRESPONDENCE</small></figcaption></figure>
    <div className="cg-postcard-actions"><button className="cg-button cg-primary" onClick={share} disabled={!postcard || busy}>Share postcard</button><button className="cg-button" disabled={!postcard || busy} onClick={() => { downloadPostcard(postcard); setStatus('Postcard downloaded. On iPhone, find it in Safari Downloads in the Files app.'); }}>Download postcard</button></div>
    <p className="cg-export-status" role="status">{status}</p>
  </>;
}
export default function CollectionGarden() {
  const [save, setSave] = useState(readInitialSave);
  const stateRef = useRef(save); stateRef.current = save;
  const [selected, setSelected] = useState(null);
  const [focusIndex, setFocusIndex] = useState(6);
  const [drag, setDragState] = useState(null);
  const dragRef = useRef(null);
  const [flight, setFlight] = useState(null);
  const flightRef = useRef(null);
  const [pasteIndex, setPasteIndex] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [notice, setNotice] = useState('Make a garden from found pieces.');
  const [storageWarning, setStorageWarning] = useState(false);
  const [hint, setHint] = useState(null);
  const boardRef = useRef(null), cells = useRef([]), timers = useRef(new Set());
  const audio = useMoticosAudio(save.sound);
  const audioRef = useRef(audio); audioRef.current = audio;
  const round = save.round, board = round.board;
  const selectedTile = board[selected], selectedPiece = CATALOG[selectedTile?.pieceId];
  const finals = completedFinals(board);
  const discoveredFinals = FINALS.filter(id => save.discoveries.includes(id));
  const busy = Boolean(flight);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function schedule(callback, delay) { const timer = setTimeout(() => { timers.current.delete(timer); callback(); }, delay); timers.current.add(timer); return timer; }
  function clearTimers() { for (const timer of timers.current) clearTimeout(timer); timers.current.clear(); }
  function setDrag(value) { dragRef.current = value; setDragState(value); }
  function cancelInteraction() { setDrag(null); flightRef.current = null; setFlight(null); }
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); setStorageWarning(false); }
    catch { setStorageWarning(true); }
  }, [save]);
  useEffect(() => {
    const cancel = () => { if (document.hidden) setDrag(null); };
    document.addEventListener('visibilitychange', cancel);
    return () => document.removeEventListener('visibilitychange', cancel);
  }, []);
  function updateSave(next) { stateRef.current = next; setSave(next); }
  function applyRound(next, resultId = null) {
    if (!next) return false;
    const current = stateRef.current;
    updateSave({ ...current, round: next, history: [...current.history.slice(-99), current.round], discoveries: resultId ? [...new Set([...current.discoveries, resultId])] : current.discoveries });
    setHint(null);
  }
  function center(index) {
    const rect = cells.current[index]?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: Math.min(rect.width, rect.height) } : null;
  }
  function cellAt(x, y) {
    const cell = document.elementFromPoint(x, y)?.closest?.('[data-collection-cell]');
    return cell && boardRef.current?.contains(cell) ? Number(cell.dataset.collectionCell) : -1;
  }
  function magneticTarget(x, y, from) {
    const currentBoard = stateRef.current.round.board;
    let best = null;
    currentBoard.forEach((tile, index) => {
      if (index === from || !compatible(currentBoard[from], tile)) return;
      const c = center(index); if (!c) return;
      const distance = Math.hypot(x - c.x, y - c.y), radius = Math.max(52, c.size * 0.95);
      if (distance <= radius && (!best || distance < best.distance)) best = { index, center: c, distance, radius };
    });
    return best;
  }
  function focusCell(index) { setFocusIndex(index); requestAnimationFrame(() => cells.current[index]?.focus({ preventScroll: true })); }
  function completeMerge(from, to, source = null) {
    if (flightRef.current) return;
    const snapshot = stateRef.current.round;
    const next = mergePieces(snapshot, from, to);
    if (!next) return;
    const target = center(to), origin = source ?? center(from);
    if (!origin || !target) return;
    const recipe = recipeFor(snapshot.board[from].pieceId, snapshot.board[to].pieceId);
    flightRef.current = { from, to };
    setFlight({ from, to, tile: snapshot.board[from], ...origin });
    setDrag(null); setSelected(null); setHint(null);
    requestAnimationFrame(() => setFlight(current => current ? { ...current, x: target.x, y: target.y } : current));
    schedule(() => {
      applyRound(next, recipe.result);
      flightRef.current = null; setFlight(null); setPasteIndex(to); setSelected(to); focusCell(to);
      const title = CATALOG[recipe.result].name;
      const isFinal = FINALS.includes(recipe.result);
      setNotice(isFinal ? `${title} found. Your postcard is ready to open.` : `${title} discovered. See how the two pieces live together.`);
      if (stateRef.current.sound) {
        if (isFinal) audioRef.current.playArrival(); else audioRef.current.playMerge();
      }
      schedule(() => setPasteIndex(null), 320);
    }, reducedMotion() ? 0 : FLIGHT_MS);
  }
  function choose(index) {
    if (dragRef.current || flightRef.current || overlay) return;
    setHint(null);
    const currentBoard = stateRef.current.round.board;
    if (selected === index) { setSelected(null); return; }
    if (selected !== null && currentBoard[selected]) {
      if (compatible(currentBoard[selected], currentBoard[index])) { completeMerge(selected, index); return; }
      if (!currentBoard[index]) {
        applyRound(movePiece(stateRef.current.round, selected, index)); setSelected(index); focusCell(index);
        setNotice(`${nameOf(currentBoard[selected])} moved.`); return;
      }
    }
    if (currentBoard[index]) { setSelected(index); audio.playPickup(); }
  }
  function pointerDown(event, index) {
    if (event.button !== 0 || dragRef.current || flightRef.current || !board[index] || overlay) return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { return; }
    const c = center(index); if (!c) return;
    setDrag({ index, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, rawX: event.clientX, rawY: event.clientY, size: c.size, dragging: false });
    audio.playPickup();
  }
  function pointerMove(event) {
    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId || current.snapBack) return;
    const x = event.clientX, y = event.clientY;
    const dragging = current.dragging || Math.hypot(x - current.startX, y - current.startY) > 6;
    const magnetic = dragging ? magneticTarget(x, y, current.index) : null;
    const pull = magnetic ? 0.28 + (1 - magnetic.distance / magnetic.radius) * 0.34 : 0;
    setDrag({ ...current, dragging, rawX: x, rawY: y, x: x + ((magnetic?.center.x ?? x) - x) * pull, y: y + ((magnetic?.center.y ?? y) - y) * pull, magneticIndex: magnetic?.index ?? null });
  }
  function pointerUp(event, index) {
    const current = dragRef.current;
    if (!current) { if (!board[index] && !flightRef.current) choose(index); return; }
    if (current.pointerId !== event.pointerId) return;
    if (current.snapBack) return;
    if (!current.dragging) { setDrag(null); choose(current.index); return; }
    const direct = cellAt(event.clientX, event.clientY);
    const magnetic = magneticTarget(event.clientX, event.clientY, current.index);
    // Keep the accepted generous near-miss magnetic drop for compatible art.
    const target = magnetic?.index ?? direct;
    if (target !== current.index && compatible(board[current.index], board[target])) { completeMerge(current.index, target, current); return; }
    if (direct >= 0 && !board[direct]) {
      applyRound(movePiece(stateRef.current.round, current.index, direct)); setSelected(direct); setDrag(null); focusCell(direct); setNotice(`${nameOf(board[current.index])} moved.`); return;
    }
    const origin = center(current.index);
    if (!origin) { setDrag(null); return; }
    setDrag({ ...current, ...origin, snapBack: true });
    setNotice('Those pieces do not combine. Nothing was lost.'); audio.playDenied();
    const gesture = dragRef.current;
    schedule(() => { if (dragRef.current === gesture) setDrag(null); }, reducedMotion() ? 0 : 170);
  }
  function undo() {
    const current = stateRef.current;
    if (!current.history.length || flightRef.current) return;
    clearTimers(); cancelInteraction();
    updateSave({ ...current, round: current.history.at(-1), history: current.history.slice(0, -1) });
    setSelected(null); setPasteIndex(null); setHint(null); setNotice('Last move undone. Your discoveries are kept in the collection.');
  }
  function cut() {
    if (dragRef.current || flightRef.current || selected === null) return;
    const next = cutPiece(stateRef.current.round, selected);
    if (!next) return;
    const name = nameOf(board[selected]);
    applyRound(next); setSelected(null); setNotice(`${name} cut into its original two pieces.`); audio.playCut();
  }
  function showHint() {
    const options = availableRecipes(board);
    const chosen = options.find(r => !save.discoveries.includes(r.result)) ?? options[0];
    if (chosen) { setHint(chosen); setNotice(`${chosen.clue} Try ${chosen.parents.map(id => CATALOG[id].name).join(' and ')}.`); }
    else setNotice(finals.length === 2 ? 'Both gardens are complete. Open a postcard, or start a fresh board.' : 'Select a made piece and Cut to try another pairing.');
  }
  function resetRound() {
    clearTimers(); cancelInteraction();
    updateSave({ ...stateRef.current, round: createRound(), history: [] });
    setSelected(null); setHint(null); setPasteIndex(null); setOverlay(null); setNotice('A fresh board. Your collection is still safe.');
  }
  function onKey(event, index) {
    const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -5, ArrowDown: 5 }[event.key];
    if (offset) { event.preventDefault(); focusCell(Math.max(0, Math.min(24, index + offset))); }
    if (event.key === 'Escape') { setSelected(null); setHint(null); setDrag(null); }
  }
  const activeIndex = drag?.dragging ? drag.index : selected;
  const activeTile = board[activeIndex];
  const hintIds = hint?.parents ?? [];
  const selectedMatches = selectedTile ? board.filter(t => compatible(selectedTile, t)).map(nameOf) : [];
  const postcardId = FINALS.includes(selectedTile?.pieceId) ? selectedTile.pieceId : discoveredFinals.at(-1);
  return <main className="cg-page">
    <div className="cg-shell">
      <header className="cg-header"><div><h1>Moticos<span aria-hidden="true">✳</span></h1><p>Garden correspondence</p></div><div className="cg-header-actions"><button className="cg-icon-button" aria-label={save.sound ? 'Mute sound' : 'Enable sound'} aria-pressed={save.sound} onClick={() => { updateSave({ ...save, sound: !save.sound }); if (!save.sound) audio.playEnabledCue(); }}>{save.sound ? <Volume2 /> : <VolumeX />}</button><button className="cg-icon-button" aria-label="How to play" disabled={busy} onClick={() => { setDrag(null); setOverlay({ type: 'help' }); }}><HelpCircle /></button></div></header>
      <div className="cg-mission"><div><span className="cg-eyebrow">A small collection, two gardens</span><h2>{finals.length === 2 ? 'Two little worlds, made by you.' : 'What belongs together?'}</h2></div><span className="cg-progress" aria-label={`${save.discoveries.length} of 12 pieces discovered`}>{save.discoveries.length}<span>/12</span></span></div>
      <p className="cg-instruction" id="cg-instruction">Drag a piece onto a kindred piece. Or tap one, then the other.</p>
      <section className="cg-board" aria-label="Garden collage board, five by five" aria-describedby="cg-instruction cg-keyboard-help" ref={boardRef}>
        {board.map((tile, index) => {
          const piece = CATALOG[tile?.pieceId];
          const match = index !== activeIndex && compatible(activeTile, tile);
          const isSource = (drag?.dragging && drag.index === index) || flight?.from === index;
          const hovering = drag?.dragging && drag.magneticIndex === index;
          return <button key={index} type="button" ref={el => { cells.current[index] = el; }} data-collection-cell={index} data-piece-id={tile?.pieceId ?? 'empty'} tabIndex={index === focusIndex ? 0 : -1} onFocus={() => setFocusIndex(index)} onKeyDown={event => onKey(event, index)} aria-label={`${piece ? piece.name : 'Empty space'}, row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}${match ? ', combines with selected piece' : ''}`} aria-pressed={selected === index} className={`cg-cell ${tile ? 'has-art' : 'is-empty'}${selected === index ? ' is-selected' : ''}${match ? ' is-match' : ''}${hovering ? ' is-target' : ''}${hintIds.includes(tile?.pieceId) ? ' is-hint' : ''}${isSource ? ' is-source' : ''}${pasteIndex === index ? ' is-pasted' : ''}`} onPointerDown={event => pointerDown(event, index)} onPointerMove={pointerMove} onPointerUp={event => pointerUp(event, index)} onPointerCancel={event => { if (dragRef.current?.pointerId === event.pointerId) setDrag(null); }} onClick={event => { if (event.detail === 0) choose(index); }}>
            {piece ? <><Art id={piece.id} /><span className="cg-cell-name">{piece.shortName}</span>{piece.rank === 2 && <span className="cg-finale-mark" aria-hidden="true">✳</span>}</> : <span className="cg-empty-mark" aria-hidden="true">·</span>}
          </button>;
        })}
      </section>
      {((drag?.dragging && board[drag.index]) || flight) && (() => { const floating = flight ?? drag; const tile = flight?.tile ?? board[drag.index]; return <div aria-hidden="true" className={`cg-floating${flight ? ' is-flying' : ''}${drag?.snapBack ? ' snap-back' : ''}`} style={{ left: floating.x - floating.size / 2, top: floating.y - floating.size / 2, width: floating.size, height: floating.size }}><Art id={tile.pieceId} /></div>; })()}
      <p id="cg-keyboard-help" className="cg-sr-only">Use arrow keys to move around the board. Press Enter or Space to select a piece, then activate a compatible piece to combine or an empty space to move. Escape clears the selection.</p>
      <div className="cg-inspector" aria-live="polite">{selectedPiece ? <><Art id={selectedPiece.id} /><div><strong>{selectedPiece.name}</strong><span>{selectedPiece.rank === 2 ? 'A finished garden. Open its postcard below.' : selectedMatches.length ? `Try it with ${[...new Set(selectedMatches)].join(' or ')}.` : 'Cut this piece to try a different branch.'}</span></div></> : <><span className="cg-inspector-symbol" aria-hidden="true">✂</span><div><strong>{finals.length === 2 ? 'Both gardens are on the table' : 'A bird. A map. A possibility.'}</strong><span>{finals.length === 2 ? 'Keep a postcard, or make them again.' : 'Select a piece to see what it can become.'}</span></div></>}</div>
      <nav className="cg-tools" aria-label="Board tools"><button className="cg-tool" onClick={undo} disabled={!save.history.length || busy}><Undo2 /><span>Undo</span></button><button className="cg-tool" onClick={cut} disabled={!selectedTile?.parents || busy}><Scissors /><span>Cut</span></button><button className="cg-tool" onClick={showHint} disabled={busy}><Lightbulb /><span>Hint</span></button><button className="cg-tool" onClick={() => { setDrag(null); setOverlay({ type: 'collection' }); }} disabled={busy}><BookOpen /><span>Collection</span></button></nav>
      <div className="cg-notice" role="status" aria-live="polite">{notice}</div>
      <button className={`cg-postcard-button ${postcardId ? 'is-ready' : ''}`} onClick={() => { setDrag(null); setOverlay({ type: 'postcard', pieceId: postcardId }); }} disabled={!postcardId || busy}><ImageIcon /><span>{postcardId ? 'Open your postcard' : 'A postcard awaits your first garden'}</span>{postcardId && <span aria-hidden="true">↗</span>}</button>
      {storageWarning && <p className="cg-save-warning" role="alert">This browser cannot save progress. Keep this tab open to continue your board.</p>}
      <footer className="cg-footer"><span>12-piece playable study</span><button onClick={() => { setDrag(null); setOverlay({ type: 'reset' }); }} disabled={busy}>Fresh board</button><a href="?classic">Original game</a></footer>
    </div>
    {overlay && <CollectionDialog title={overlay.type === 'postcard' ? 'Your correspondence' : overlay.type === 'collection' ? 'The garden collection' : overlay.type === 'reset' ? 'Start a fresh board?' : 'A few things to try'} onClose={() => setOverlay(null)} className={overlay.type === 'postcard' ? 'cg-dialog-postcard' : ''}>
      {overlay.type === 'postcard' && <PostcardContent pieceId={overlay.pieceId} />}
      {overlay.type === 'help' && <div className="cg-help"><p>Make two small gardens from eight found clippings. There are six different starter pictures, with an extra bird and fern so you can make both gardens.</p><ol><li>Drag a piece onto another, or tap a piece and then its partner. Kindred pieces glow.</li><li>Try Bird + Map, or Bird + Moon. The new artwork carries something from each parent.</li><li>Combine two made pieces to discover a finished garden. Your postcard stays tucked away until you open it.</li><li>Undo takes back a move. Select a made piece and Cut to recover its exact parents. Both are free.</li></ol><p>There is no timer, score, or penalty for trying. Your board and discoveries save in this browser. The collection keeps discoveries when you undo, cut, or start over.</p><p>This is a 12-piece playable study toward a much larger collection, not the finished catalog.</p><h3>Keyboard</h3><p>Tab to the board, use arrow keys, and press Enter or Space to select and combine. Escape clears the selection.</p></div>}
      {overlay.type === 'reset' && <div className="cg-help"><p>This resets the current board and its Undo history. All discovered artwork stays in your collection.</p><button className="cg-button cg-primary" onClick={resetRound}><RotateCcw size={18} /> Start fresh</button></div>}
      {overlay.type === 'collection' && <><p className="cg-collection-intro">{save.discoveries.length} of 12 discovered. The small things become whole new worlds.</p><div className="cg-collection-grid">{PIECES.map(piece => { const known = save.discoveries.includes(piece.id); const recipe = RECIPES.find(r => r.result === piece.id); return <article className={`cg-collection-piece${known ? '' : ' is-undiscovered'}`} key={piece.id}>{known ? <Art id={piece.id} description /> : <div className="cg-mystery" aria-hidden="true">?</div>}<h3>{known ? piece.name : piece.rank === 2 ? 'A hidden garden' : 'A new correspondence'}</h3><p>{recipe ? recipe.parents.map(id => CATALOG[id].name).join(' + ') : 'Found in the envelope'}</p>{known && piece.rank === 2 && <button className="cg-button" onClick={() => setOverlay({ type: 'postcard', pieceId: piece.id })}>Open postcard</button>}</article>; })}</div><p className="cg-collection-note">Collected art stays here, even when you combine its pieces.</p></>}
    </CollectionDialog>}
  </main>;
}
