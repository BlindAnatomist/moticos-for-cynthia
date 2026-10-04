import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, newSave, serializeSave, STORAGE_KEY } from '../src/matching/game.js';

// These tests exercise the actual component handlers with deterministic hooks
// and hit geometry. They do not simulate React scheduling, native pointer
// capture, modal behavior, layout, or browser rendering. Playwright remains the
// acceptance gate for those behaviors; no DOM emulator dependency is needed.
const runtime = vi.hoisted(() => ({ active: null }));
vi.mock('react', async importOriginal => {
  const React = await importOriginal();
  return {
    ...React,
    useState(initial) {
      const owner = runtime.active, index = owner.cursor++;
      if (!owner.slots[index]) owner.slots[index] = { kind: 'state', value: typeof initial === 'function' ? initial() : initial };
      return [owner.slots[index].value, next => {
        const slot = owner.slots[index];
        slot.value = typeof next === 'function' ? next(slot.value) : next;
      }];
    },
    useRef(initial) {
      const owner = runtime.active, index = owner.cursor++;
      if (!owner.slots[index]) owner.slots[index] = { kind: 'ref', value: { current: initial } };
      return owner.slots[index].value;
    },
    useEffect(effect) {
      const owner = runtime.active, index = owner.cursor++;
      if (!owner.slots[index]) {
        owner.slots[index] = { kind: 'effect' };
        owner.pendingEffects.push(() => { owner.slots[index].cleanup = effect(); });
      }
    },
  };
});
vi.mock('../src/useMoticosAudio.js', () => ({ default: () => new Proxy({}, { get: () => () => {} }) }));
import MatchingGarden from '../src/matching/MatchingGarden.jsx';

let raw, readError, writeError, storage, documentListeners, windowListeners, activeCells, mounted;
const listen = (listeners, name, callback) => {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(callback);
};
function emit(listeners, name, event = {}) { for (const callback of listeners.get(name) ?? []) callback(event); }
function visit(node, callback) {
  if (Array.isArray(node)) { node.forEach(child => visit(child, callback)); return; }
  if (!node || typeof node !== 'object' || !node.props) return;
  callback(node);
  visit(node.props.children, callback);
}
function harness() {
  const owner = { slots: [], cursor: 0, pendingEffects: [], tree: null };
  const cells = Array.from({ length: 25 }, (_, index) => ({
    dataset: { matchingCell: String(index) },
    getBoundingClientRect: () => ({ left: index % 5 * 100, top: Math.floor(index / 5) * 100, width: 90, height: 90 }),
    focus: vi.fn(),
    setPointerCapture: vi.fn(),
    closest() { return this; },
  }));
  function render() {
    runtime.active = owner; owner.cursor = 0; activeCells = cells;
    owner.tree = MatchingGarden(); runtime.active = null;
    visit(owner.tree, node => {
      const ref = node.props.ref;
      if (typeof ref === 'function') ref(cells[node.props['data-matching-cell']]);
      else if (ref) ref.current = { contains: target => cells.includes(target) };
    });
    for (const effect of owner.pendingEffects.splice(0)) effect();
    return api;
  }
  function find(predicate) {
    let found;
    visit(owner.tree, node => { if (predicate(node)) found = node; });
    if (!found) throw new Error('Requested component control was not found');
    return found;
  }
  const api = {
    render, cells,
    cell: index => find(node => node.props['data-matching-cell'] === index),
    supply: family => find(node => node.props['aria-label']?.startsWith(`Add ${family} pair`)),
    tool: label => find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.some(child => child?.props?.children === label)),
    save: () => owner.slots.find(slot => slot.kind === 'state' && slot.value?.version === 1 && slot.value?.round)?.value,
    activate(index) { api.cell(index).props.onClick({ detail: 0 }); return render(); },
    add(family) { api.supply(family).props.onClick(); return render(); },
    event(index, extra = {}) {
      return { button: 0, isPrimary: true, pointerId: 1, clientX: index % 5 * 100 + 45, clientY: Math.floor(index / 5) * 100 + 45, currentTarget: cells[index], ...extra };
    },
    down(index, extra) { api.cell(index).props.onPointerDown(api.event(index, extra)); return render(); },
    up(index, extra) { api.cell(index).props.onPointerUp(api.event(index, extra)); return render(); },
    move(index, x, y) { api.cell(index).props.onPointerMove(api.event(index, { clientX: x, clientY: y })); return render(); },
    destroy() { for (const slot of owner.slots) slot.cleanup?.(); },
  };
  mounted.push(api); return render();
}

beforeEach(() => {
  vi.useFakeTimers(); raw = null; readError = false; writeError = false; mounted = [];
  documentListeners = new Map(); windowListeners = new Map();
  storage = {
    getItem: vi.fn(() => { if (readError) throw Error('Storage read unavailable'); return raw; }),
    setItem: vi.fn((key, value) => { expect(key).toBe(STORAGE_KEY); if (writeError) throw Error('Storage write unavailable'); raw = value; }),
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false }),
    addEventListener: (name, callback) => listen(windowListeners, name, callback),
    removeEventListener: (name, callback) => windowListeners.get(name)?.delete(callback),
  });
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: (name, callback) => listen(documentListeners, name, callback),
    removeEventListener: (name, callback) => documentListeners.get(name)?.delete(callback),
    elementFromPoint(x, y) {
      const col = Math.floor(x / 100), row = Math.floor(y / 100);
      return col >= 0 && col < 5 && row >= 0 && row < 5 && x % 100 < 90 && y % 100 < 90 ? activeCells[row * 5 + col] : null;
    },
  });
  vi.stubGlobal('requestAnimationFrame', callback => setTimeout(callback, 16));
});
afterEach(() => { mounted.forEach(instance => instance.destroy()); vi.useRealTimers(); vi.unstubAllGlobals(); runtime.active = null; });

describe('matching component save boundaries', () => {
  it('never overwrites an unread existing save after a transient initial read error', () => {
    const original = serializeSave(act(newSave(), { type: 'merge', from: 6, to: 7 }));
    raw = original; readError = true; const page = harness(); readError = false;
    page.add('bird').add('fern');
    expect(page.save().round.moves).toBe(2); expect(raw).toBe(original); expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('preserves corrupt and future save bytes during practice play', () => {
    for (const original of ['{"version":1,"round":{}}', '{"version":2,"newField":true}']) {
      raw = original; const page = harness(); page.add('bird');
      expect(page.save().round.moves).toBe(1); expect(raw).toBe(original); page.destroy();
    }
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('blocks a stale tab before it can overwrite another tab even without a delivered storage event', () => {
    raw = serializeSave(newSave()); const first = harness(), second = harness();
    first.add('bird'); const committed = raw;
    second.add('fern'); expect(raw).toBe(committed); expect(second.save().round.supply).toEqual({ bird: 12, fern: 10 });
    second.add('fern'); expect(raw).toBe(committed);
  });
  it('blocks writes when another tab changes this storage key', () => {
    const page = harness(); raw = serializeSave(act(newSave(), { type: 'supply', familyId: 'fern' }));
    const committed = raw; emit(windowListeners, 'storage', { key: STORAGE_KEY, newValue: raw });
    page.add('bird'); expect(raw).toBe(committed); expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('ignores storage events for unrelated saves and keeps normal writes working', () => {
    const page = harness(); emit(windowListeners, 'storage', { key: 'moticos.collection.garden.v1', newValue: 'unrelated' });
    page.add('bird').add('fern'); expect(JSON.parse(raw)).toEqual(page.save());
  });
  it.each(['read', 'write'])('preserves prior bytes and remains write-blocked after a later %s error', failure => {
    raw = serializeSave(newSave()); const page = harness(), original = raw;
    if (failure === 'read') readError = true; else writeError = true;
    page.add('bird'); readError = false; writeError = false;
    const attempts = storage.setItem.mock.calls.length; page.add('fern');
    expect(raw).toBe(original); expect(storage.setItem).toHaveBeenCalledTimes(attempts); expect(page.save().round.moves).toBe(2);
  });
});

describe('matching component input boundaries', () => {
  it.each([1, 2])('rejects button %i on empty and occupied cells without changing the board', button => {
    const page = harness().activate(6), original = serializeSave(page.save());
    page.down(0, { button }).up(0, { button });
    page.down(7, { button }).up(7, { button });
    expect(serializeSave(page.save())).toBe(original);
  });
  it('rejects non-primary pointers without preventing a primary tap-to-empty move', () => {
    const page = harness().activate(6);
    page.down(0, { isPrimary: false, pointerId: 2 }).up(0, { isPrimary: false, pointerId: 2 });
    expect(page.save().round.moves).toBe(0);
    page.down(0).up(0); expect(page.save().round.moves).toBe(1); expect(page.save().round.board[0].pieceId).toBe('b1'); expect(page.save().round.board[6]).toBeNull();
  });
  it('does not let an explicit wrong-picture drop be stolen by a nearby match', () => {
    const page = harness(), original = serializeSave(page.save());
    page.down(6).move(6, 305, 145).up(6, { clientX: 305, clientY: 145 });
    expect(serializeSave(page.save())).toBe(original); vi.advanceTimersByTime(200); page.render();
    page.down(6).move(6, 245, 145).up(6, { clientX: 245, clientY: 145 });
    expect(page.save().round.merges).toBe(1);
  });
  it('accepts a genuine gap near-miss and persists before its decorative flight', () => {
    const page = harness(); page.down(6).move(6, 297, 145).up(6, { clientX: 297, clientY: 145 });
    expect(page.save().round.board[7].pieceId).toBe('b2'); expect(JSON.parse(raw)).toEqual(page.save());
  });
  it('blocks repeated board actions during a flight, without depending on animation frames', () => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    const page = harness().activate(6).activate(7), original = serializeSave(page.save());
    page.activate(12).activate(16).add('bird'); page.tool('Undo').props.onClick(); page.render();
    expect(serializeSave(page.save())).toBe(original);
    vi.advanceTimersByTime(250); page.render(); page.tool('Undo').props.onClick(); page.render();
    expect(page.save().round.merges).toBe(0); expect(page.save().round.board[6].pieceId).toBe('b1');
  });
  it.each(['pointercancel', 'lostpointercapture', 'blur', 'hidden'])('cancels an interrupted drag on %s without a move or stuck interaction', reason => {
    const page = harness().down(6).move(6, 245, 145), original = serializeSave(page.save());
    if (reason === 'pointercancel') page.cell(6).props.onPointerCancel(page.event(6));
    if (reason === 'lostpointercapture') page.cell(6).props.onLostPointerCapture(page.event(6));
    if (reason === 'blur') emit(windowListeners, 'blur');
    if (reason === 'hidden') { document.hidden = true; emit(documentListeners, 'visibilitychange'); }
    page.render().up(6, { clientX: 245, clientY: 145 }); expect(serializeSave(page.save())).toBe(original);
    page.down(6).up(6).down(7).up(7); expect(page.save().round.merges).toBe(1);
  });
});
