import {useEffect, useRef, useState} from 'react';
import {dragMoved, dragIsCurrent, dragDestination, dragEdgeStep} from './boardDrag.js';

// Touch/pen use Pointer Events. Mouse retains the existing HTML5 drag route.
// touch-action is set on occupied cells in CSS before the gesture begins.
export default function useBoardDrag({stateRef, busyRef, nextPiece, move}) {
  const [visual, setVisual] = useState(null);
  const active = useRef(null), suppressUntil = useRef(0), frame = useRef(null);
  const latest = useRef(null);
  latest.current = {stateRef, busyRef, nextPiece, move};
  const suppressClick = () => { suppressUntil.current = Date.now() + 900; };
  function clear() {
    const previous = active.current;
    active.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setVisual(null);
    if (previous?.element.hasPointerCapture?.(previous.pointerId)) {
      try { previous.element.releasePointerCapture(previous.pointerId); } catch { /* already released */ }
    }
    return previous;
  }
  function cancel() {
    if (active.current) suppressClick();
    clear();
  }
  function targetAt(start) {
    const boardRect = start.board.getBoundingClientRect();
    if (start.x < boardRect.left || start.x > boardRect.right || start.y < boardRect.top || start.y > boardRect.bottom) return null;
    const cell = document.elementFromPoint(start.x, start.y)?.closest('[data-career-cell]');
    if (!cell || !start.board.contains(cell)) return null;
    return dragDestination(start, latest.current.stateRef.current, Number(cell.dataset.careerCell), latest.current.nextPiece);
  }
  function paint(start) {
    setVisual({from: start.from, pieceId: start.pieceId, x: start.x, y: start.y, width: start.width, to: targetAt(start)});
  }
  function tick(now) {
    frame.current = null;
    const start = active.current;
    if (!start?.dragging) return;
    if (latest.current.busyRef.current || !dragIsCurrent(start, latest.current.stateRef.current)) { cancel(); return; }
    const step = dragEdgeStep(start.x, start.y, start.board.getBoundingClientRect(), start.lastFrame === null ? 16 : now - start.lastFrame);
    start.lastFrame = now;
    const previous = start.board.scrollLeft;
    start.board.scrollLeft += step;
    if (start.board.scrollLeft !== previous) paint(start);
    frame.current = requestAnimationFrame(tick);
  }
  function down(event, from) {
    // A new real gesture ends suppression left by an earlier drag; accessibility
    // activation has no pointerdown and is never suppressed by the click filter.
    if (active.current && event.pointerId !== active.current.pointerId) { cancel(); return; }
    if (event.isPrimary === false) return;
    suppressUntil.current = 0;
    if (!['touch', 'pen'].includes(event.pointerType) || event.isPrimary === false || event.button !== 0 || latest.current.busyRef.current) return;
    const state = latest.current.stateRef.current, tile = state.board[from];
    if (!tile) return;
    const element = event.currentTarget, board = element.closest('.career-board');
    if (!board) return;
    const rect = element.getBoundingClientRect();
    active.current = {from, tileId: tile.id, pieceId: tile.pieceId, careerId: state.careerId, revision: state.revision, pointerId: event.pointerId, element, board, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, width: rect.width, dragging: false, lastFrame: null};
    try { element.setPointerCapture(event.pointerId); } catch { cancel(); }
  }
  function update(event) {
    const start = active.current;
    if (!start || event.pointerId !== start.pointerId) return;
    if (latest.current.busyRef.current || !dragIsCurrent(start, latest.current.stateRef.current)) { cancel(); return; }
    start.x = event.clientX; start.y = event.clientY;
    if (!start.dragging && !dragMoved(start, start.x, start.y)) return;
    start.dragging = true;
    event.preventDefault();
    suppressClick();
    paint(start);
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  }
  function up(event) {
    const start = active.current;
    if (!start || event.pointerId !== start.pointerId) return;
    if (!start.dragging) { clear(); return; }
    event.preventDefault(); suppressClick();
    start.x = event.clientX; start.y = event.clientY;
    const to = !latest.current.busyRef.current ? targetAt(start) : null;
    clear(); // Release/cancel can never commit again, including lost capture.
    if (to !== null) latest.current.move(start.from, to);
  }
  function click(event) {
    const pointerActivation = event.detail > 0;
    if (pointerActivation && Date.now() < suppressUntil.current) {
      event.preventDefault(); event.stopPropagation(); return true;
    }
    return false;
  }
  useEffect(() => {
    const blur = () => cancel();
    const hidden = () => { if (document.hidden) cancel(); };
    const key = event => { if (event.key === 'Escape') cancel(); };
    const additional = event => { if (active.current && event.pointerId !== active.current.pointerId) cancel(); };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', additional, true);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', additional, true);
      const previous = active.current; active.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (previous?.element.hasPointerCapture?.(previous.pointerId)) {
        try { previous.element.releasePointerCapture(previous.pointerId); } catch { /* already released */ }
      }
    };
  }, []);
  return {visual, down, update, up, cancel, click, suppressClick, nativeStart(event) {
    if (active.current) { event.preventDefault(); return false; }
    return true;
  }};
}
