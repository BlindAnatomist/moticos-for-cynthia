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
import { getMatchingEngine } from '../src/matching/registry.js';

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
function harness(props) {
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
    owner.tree = MatchingGarden(props); runtime.active = null;
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
  it.each(['pointercancel', 'lostpointercapture', 'blur', 'hidden', 'resize'])('cancels an interrupted drag on %s without a move or stuck interaction', reason => {
    const page = harness().down(6).move(6, 245, 145), original = serializeSave(page.save());
    if (reason === 'pointercancel') page.cell(6).props.onPointerCancel(page.event(6));
    if (reason === 'lostpointercapture') page.cell(6).props.onLostPointerCapture(page.event(6));
    if (reason === 'blur') emit(windowListeners, 'blur');
    if (reason === 'resize') emit(windowListeners, 'resize');
    if (reason === 'hidden') { document.hidden = true; emit(documentListeners, 'visibilitychange'); }
    page.render().up(6, { clientX: 245, clientY: 145 }); expect(serializeSave(page.save())).toBe(original);
    page.down(6).up(6).down(7).up(7); expect(page.save().round.merges).toBe(1);
  });
  it('keeps a committed merge and one Undo after a viewport resize during flight', () => {
    const page = harness().activate(6).activate(7), committed = serializeSave(page.save());
    emit(windowListeners, 'resize'); page.render();
    expect(serializeSave(page.save())).toBe(committed);
    expect(page.save().round.merges).toBe(1);
    vi.advanceTimersByTime(1000); page.render();
    expect(serializeSave(page.save())).toBe(committed);
    page.tool('Undo').props.onClick(); page.render();
    expect(page.save().round.merges).toBe(0);
    expect(page.save().round.board[6].pieceId).toBe('b1');
    expect(page.save().round.board[7].pieceId).toBe('b1');
  });
});


describe('second envelope component handlers', () => {
  it('uses key/moon supply and matching rules in the same real handlers', () => {
    const moon = getMatchingEngine('moonlit-passage');
    storage.setItem = vi.fn((key, value) => { expect(key).toBe(moon.STORAGE_KEY); raw = value; });
    const page = harness({ envelopeId: 'moonlit-passage' });
    expect(page.save()).toEqual(moon.newSave());
    page.activate(6).activate(7); vi.advanceTimersByTime(1000); page.render();
    expect(page.save().round.board[7].pieceId).toBe('k2'); expect(moon.readSave(raw).status).toBe('loaded');
    page.add('moon'); expect(page.save().round.supply).toEqual({ key: 12, moon: 10 });
  });
  it('restores temporary key/moon progress and Undo from the shared session cache', () => {
    raw = 'unread moon save'; const cache = new Map();
    const props = { envelopeId: 'moonlit-passage', sessionCache: cache };
    const first = harness(props).add('key').add('moon'); const expected = structuredClone(first.save()); first.destroy();
    const returned = harness(props); expect(returned.save()).toEqual(expected);
    returned.tool('Undo').props.onClick(); returned.render();
    expect(returned.save().round.supply).toEqual({ key: 10, moon: 12 }); expect(raw).toBe('unread moon save');
  });
});

// The trial runs these very same input handlers with a one-family descriptor.
// This is deterministic handler coverage, not a browser-rendering claim.
import { LIGHT_LETTER_TRIAL } from '../src/matching/trial/LightLetterTrial.jsx';
import { LIGHT_LETTER_ENGINE as trialEngine } from '../src/matching/trial/catalog.js';
describe('private Light / Letter component handlers', () => {
  beforeEach(() => {
    storage.setItem = vi.fn((key, value) => { expect(key).toBe(trialEngine.STORAGE_KEY); if (writeError) throw Error('Unavailable'); raw = value; });
  });
  const trialProps = () => ({ envelopeId: 'trial-light-letter', trial: LIGHT_LETTER_TRIAL, sessionCache: new Map() });
  it('reaches all five tiers through actual shared handlers with one supply, then reloads and undoes', () => {
    const props = trialProps(), page = harness(props);
    for (let actions = 0; !page.save().round.board.some(tile => tile?.pieceId === 'll5'); actions++) {
      expect(actions).toBeLessThan(21);
      const pair = trialEngine.mergePairs(page.save().round.board).sort((a, b) => trialEngine.pieceOf(page.save().round.board[b[0]].pieceId).tier - trialEngine.pieceOf(page.save().round.board[a[0]].pieceId).tier)[0];
      if (pair) {
        const selected = page.save().round.board;
        // Clear selection left by the prior landing without invoking a second click.
        page.cell(pair[0]).props.onKeyDown({ key: 'Escape' }); page.render();
        page.activate(pair[0]).activate(pair[1]); vi.advanceTimersByTime(1000); page.render();
        expect(page.save().round.board).not.toBe(selected);
      } else page.add('light-letter');
    }
    expect(page.save().round).toMatchObject({ moves: 21, merges: 15, supply: { 'light-letter': 0 } });
    expect(page.save().discoveries).toEqual(['ll1', 'll2', 'll3', 'll4', 'll5']);
    expect(trialEngine.readSave(raw).status).toBe('loaded');
    const expected = structuredClone(page.save()); page.destroy();
    const reloaded = harness(trialProps()); expect(reloaded.save()).toEqual(expected);
    reloaded.tool('Undo').props.onClick(); reloaded.render();
    expect(reloaded.save().round.merges).toBe(14); expect(reloaded.save().discoveries).toEqual(expected.discoveries);
  });
  it('preserves corrupt trial bytes while handling real merges and supply', () => {
    raw = '{"version":33,"future":"preserve"}'; const original = raw;
    const page = harness(trialProps()).activate(6).activate(7);
    vi.advanceTimersByTime(1000); page.render().add('light-letter');
    expect(page.save().round.moves).toBe(2); expect(raw).toBe(original); expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('uses the same magnetic drag, wrong-level rejection and Cut rules', () => {
    const page = harness(trialProps()); page.down(6).move(6, 297, 145).up(6, { clientX: 297, clientY: 145 });
    expect(page.save().round.board[7].pieceId).toBe('ll2');
    vi.advanceTimersByTime(1000); page.render();
    const prior = trialEngine.serializeSave(page.save());
    page.down(7).move(7, 245, 245).up(7, { clientX: 245, clientY: 245 });
    vi.advanceTimersByTime(1000); page.render(); expect(trialEngine.serializeSave(page.save())).toBe(prior);
    page.tool('Cut').props.onClick(); page.render();
    expect(page.save().round.board.filter(Boolean).every(tile => tile.pieceId === 'll1')).toBe(true);
    expect(page.save().discoveries).toEqual(['ll1', 'll2']);
  });
});
