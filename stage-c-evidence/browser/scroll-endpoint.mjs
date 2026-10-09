import assert from 'node:assert/strict';

// A scroll event and the accessible edge state can arrive on different frames.
// Read geometry and both button states together; never use isEnabled() as an
// instruction to issue another action while the preceding scroll is settling.
export function inspectScrollEndpoint(board) {
  const tools = board.closest('.career-board-frame');
  return {
    offset: board.scrollLeft, maximum: board.scrollWidth - board.clientWidth,
    width: board.clientWidth,
    leftDisabled: tools.querySelector('[aria-label="Scroll board left"]').getAttribute('aria-disabled') === 'true',
    rightDisabled: tools.querySelector('[aria-label="Scroll board right"]').getAttribute('aria-disabled') === 'true',
  };
}

export function scrollSnapshotReady(a, b, {direction, previous = null, target = null}) {
  if (JSON.stringify(a) !== JSON.stringify(b)) return false;
  // Mirror BoardViewport's existing edge-state rule. This is not a tolerance
  // for a commanded destination: target, when present, is still exact below.
  if (b.leftDisabled !== !(b.offset > 1) || b.rightDisabled !== !(b.offset < b.maximum - 1)) return false;
  if (previous !== null && direction * (b.offset - previous) <= 0) return false;
  return target === null || b.offset === target;
}

export async function reachScrollEndpoint({settle, activate}, direction) {
  assert(direction === -1 || direction === 1);
  let state = await settle({direction});
  const steps = [];
  for (;;) {
    const endpoint = direction < 0 ? 0 : state.maximum;
    if (state.offset === endpoint) return {presses: steps.length, offset: state.offset, steps};
    assert(steps.length < 5, 'Board scroll endpoint must be reached within five native activations');
    assert.equal(direction < 0 ? state.leftDisabled : state.rightDisabled, false, 'Control is disabled before the exact endpoint; do not request another native activation');
    const before = state;
    const planned = Math.min(before.maximum, Math.max(0, before.offset + direction * before.width * .7));
    await activate();
    // Edge destinations are exact. Intermediate offsets are observed at native
    // precision, not rounded or accepted through a manufactured pixel tolerance.
    state = await settle({direction, previous: before.offset, target: planned === endpoint ? endpoint : null});
    assert.equal(state.maximum, before.maximum); assert.equal(state.width, before.width);
    assert(direction * (state.offset - before.offset) > 0, 'Every native activation must advance the board');
    assert(state.offset >= 0 && state.offset <= state.maximum, 'Scroll remains within exact bounds');
    steps.push({before: before.offset, after: state.offset, clampedTarget: planned === endpoint ? endpoint : null});
  }
}
