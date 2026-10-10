// A drag is presentation-only until release. Keep tile/revision identity from pickup.
export const DRAG_DISTANCE = 7;
export function dragMoved(start, x, y) {
  return Math.hypot(x - start.startX, y - start.startY) >= DRAG_DISTANCE;
}
export function dragIsCurrent(start, state) {
  return state.careerId === start.careerId && state.revision === start.revision && state.board[start.from]?.id === start.tileId;
}
export function dragDestination(start, state, to, nextPiece) {
  if (!dragIsCurrent(start, state) || !Number.isInteger(to) || to < 0 || to >= state.board.length || to === start.from) return null;
  const source = state.board[start.from], target = state.board[to];
  return !target || (target.pieceId === source.pieceId && nextPiece(source.pieceId)) ? to : null;
}
export function dragEdgeStep(x, y, rect, elapsed = 16) {
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return 0;
  const edge = Math.min(28, (rect.right - rect.left) / 4);
  const direction = x < rect.left + edge ? -1 : x > rect.right - edge ? 1 : 0;
  return direction * Math.min(12, Math.max(0, elapsed) * .45);
}
