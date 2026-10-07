import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENVELOPES, getMatchingEngine } from '../src/matching/registry.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from '../src/matching/session.js';

// Independent source-level audit. These deliberately invoke real handlers with
// deterministic hook slots; they are not native browser, rendering, or audio QA.
const runtime = vi.hoisted(() => ({ active: null }));
vi.mock('react', async importOriginal => {
  const React = await importOriginal();
  return {
    ...React,
    useState(initial) {
      const owner = runtime.active, index = owner.cursor++;
      if (!owner.slots[index]) owner.slots[index] = { kind: 'state', value: typeof initial === 'function' ? initial() : initial };
      return [owner.slots[index].value, next => {
        const slot = owner.slots[index]; slot.value = typeof next === 'function' ? next(slot.value) : next;
      }];
    },
    useRef(initial) {
      const owner = runtime.active, index = owner.cursor++;
      if (!owner.slots[index]) owner.slots[index] = { kind: 'ref', value: { current: initial } };
      return owner.slots[index].value;
    },
    useEffect(effect, deps) {
      const owner = runtime.active, index = owner.cursor++, old = owner.slots[index];
      if (!old || !deps || deps.some((value, i) => !Object.is(value, old.deps?.[i]))) {
        owner.pendingEffects.push(() => { old?.cleanup?.(); owner.slots[index] = { kind: 'effect', deps, cleanup: effect() }; });
      }
    },
  };
});
vi.mock('../src/useMoticosAudio.js', () => ({ default: () => new Proxy({}, { get: () => () => {} }) }));
import MatchingGarden from '../src/matching/MatchingGarden.jsx';
import MatchingCollection, { envelopeFromSearch } from '../src/matching/MatchingCollection.jsx';

const garden = getMatchingEngine('matching-garden');
const moonlit = getMatchingEngine('moonlit-passage');
let values, storage, mounted, listeners, location;
function walk(node, visitor) {
  if (Array.isArray(node)) { node.forEach(child => walk(child, visitor)); return; }
  if (!node || typeof node !== 'object' || !node.props) return;
  visitor(node); walk(node.props.children, visitor);
}
function renderer(component, initialProps = {}) {
  const owner = { cursor: 0, slots: [], pendingEffects: [], tree: null, props: initialProps };
  const cells = Array.from({ length: 25 }, (_, index) => ({
    getBoundingClientRect: () => ({ left: index % 5 * 100, top: Math.floor(index / 5) * 100, width: 90, height: 90 }), focus: vi.fn(),
  }));
  const api = {
    render(props = owner.props) {
      owner.props = props; owner.cursor = 0; runtime.active = owner;
      try { owner.tree = component(props); } finally { runtime.active = null; }
      walk(owner.tree, node => {
        if (typeof node.props.ref === 'function') node.props.ref(cells[node.props['data-matching-cell']]);
        else if (node.props.ref) node.props.ref.current = { contains: target => cells.includes(target) };
      });
      for (const effect of owner.pendingEffects.splice(0)) effect();
      return api;
    },
    tree: () => owner.tree,
    find(predicate) {
      let result; walk(owner.tree, node => { if (predicate(node)) result = node; });
      if (!result) throw Error('Audit control not found'); return result;
    },
    save: () => owner.slots.find(slot => slot.kind === 'state' && slot.value?.version === 1 && slot.value?.round)?.value,
    add(family) { api.find(node => node.props['aria-label']?.startsWith(`Add ${family} pair`)).props.onClick(); return api.render(); },
    destroy() { for (const slot of owner.slots) slot.cleanup?.(); },
  };
  mounted.push(api); return api.render();
}
function dispatch(type, event = {}) { for (const listener of listeners.get(type) ?? []) listener(event); }
beforeEach(() => {
  vi.useFakeTimers(); values = new Map(); mounted = []; listeners = new Map();
  storage = { getItem: vi.fn(key => values.get(key) ?? null), setItem: vi.fn((key, value) => values.set(key, value)) };
  location = new URL('https://example.test/moticos/?keep=1#board');
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {
    location,
    history: { pushState: vi.fn((state, unused, url) => { location.href = String(url); }) },
    matchMedia: () => ({ matches: true }),
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
  });
  vi.stubGlobal('document', { hidden: false, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('requestAnimationFrame', fn => setTimeout(fn, 16));
});
afterEach(() => { mounted.forEach(item => item.destroy()); vi.unstubAllGlobals(); vi.useRealTimers(); runtime.active = null; });

describe('independent expansion session audit', () => {
  it.each(ENVELOPES.map(envelope => [envelope.id]))('%s protects corrupt, future, empty-string, and foreign bytes through play, reset, and remount', id => {
    const engine = getMatchingEngine(id), foreign = engine === garden ? moonlit : garden;
    for (const raw of ['', 'not json', '{"version":99,"payload":"keep me"}', foreign.serializeSave(foreign.newSave())]) {
      values.set(engine.STORAGE_KEY, raw); const cache = new Map();
      const session = openEnvelopeSession(engine, cache, storage);
      expect(session.blocked).toBe(true);
      commitEnvelopeSession(engine, session, engine.act(session.save, { type: 'supply', familyId: engine.FAMILIES[0].id }), storage);
      const played = session.save;
      expect(openEnvelopeSession(engine, cache, storage)).toBe(session);
      expect(session.save).toEqual(played);
      commitEnvelopeSession(engine, session, engine.act(session.save, { type: 'reset' }), storage);
      expect(values.get(engine.STORAGE_KEY)).toBe(raw);
      expect(session.sourceRaw).toBe(raw);
    }
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('retains two distinct temporary boards, histories, and sound through envelope round trips', () => {
    const cache = new Map(); values.set(garden.STORAGE_KEY, '{broken'); values.set(moonlit.STORAGE_KEY, '{also broken');
    const first = openEnvelopeSession(garden, cache, storage), second = openEnvelopeSession(moonlit, cache, storage);
    commitEnvelopeSession(garden, first, garden.act(first.save, { type: 'merge', from: 6, to: 7 }), storage);
    commitEnvelopeSession(moonlit, second, moonlit.act(second.save, { type: 'supply', familyId: 'moon' }), storage);
    commitEnvelopeSession(garden, first, garden.act(first.save, { type: 'sound', enabled: false }), storage);
    expect(openEnvelopeSession(garden, cache, storage).save).toEqual(first.save);
    expect(first.save.round.board[7].pieceId).toBe('b2'); expect(first.save.sound).toBe(false);
    expect(first.save.history).toHaveLength(1); expect(second.save.history).toHaveLength(1);
    expect(second.save.round.supply.moon).toBe(10); expect(second.save.round.board.some(tile => tile?.pieceId.startsWith('b'))).toBe(false);
    expect([...values.values()]).toEqual(['{broken', '{also broken']);
  });
  it('detects an inactive-envelope write before remount, preserves the local branch, and does not overwrite the new bytes', () => {
    const cache = new Map(), session = openEnvelopeSession(garden, cache, storage);
    commitEnvelopeSession(garden, session, garden.act(session.save, { type: 'supply', familyId: 'bird' }), storage);
    const local = session.save;
    const external = garden.serializeSave(garden.act(garden.newSave(), { type: 'merge', from: 6, to: 7 }));
    values.set(garden.STORAGE_KEY, external);
    expect(openEnvelopeSession(garden, cache, storage)).toBe(session); expect(session.conflict).toBe(true); expect(session.save).toEqual(local);
    commitEnvelopeSession(garden, session, garden.act(session.save, { type: 'supply', familyId: 'fern' }), storage);
    expect(values.get(garden.STORAGE_KEY)).toBe(external);
  });
  it('localStorage.clear blocks a previously stored board but unrelated envelope events do not', () => {
    const cache = new Map(), session = openEnvelopeSession(garden, cache, storage);
    commitEnvelopeSession(garden, session, garden.act(session.save, { type: 'supply', familyId: 'bird' }), storage);
    expect(observeEnvelopeStorage(garden, session, { key: moonlit.STORAGE_KEY, newValue: 'anything' })).toBe(false);
    expect(session.blocked).toBe(false);
    expect(observeEnvelopeStorage(garden, session, { key: null, newValue: null })).toBe(true);
    expect(session.blocked).toBe(true);
  });
  it('a storage read error while revisiting blocks later writes but retains temporary history', () => {
    const cache = new Map(), session = openEnvelopeSession(moonlit, cache, storage);
    commitEnvelopeSession(moonlit, session, moonlit.act(session.save, { type: 'supply', familyId: 'moon' }), storage);
    const persisted = values.get(moonlit.STORAGE_KEY);
    storage.getItem.mockImplementationOnce(() => { throw Error('Read denied'); });
    expect(openEnvelopeSession(moonlit, cache, storage)).toBe(session);
    commitEnvelopeSession(moonlit, session, moonlit.act(session.save, { type: 'supply', familyId: 'key' }), storage);
    expect(session.save.history).toHaveLength(2); expect(session.unavailable).toBe(true);
    expect(values.get(moonlit.STORAGE_KEY)).toBe(persisted);
  });
});

describe('independent expansion handler audit', () => {
  it('survives a throwing localStorage property getter and permits temporary play', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('Storage is blocked', 'SecurityError'); } });
    const page = renderer(MatchingGarden, { sessionCache: new Map() }).add('bird');
    expect(page.save().round.moves).toBe(1);
  });
  it('writes the inherited mute choice with a newly active envelope, so a reload stays muted', () => {
    const page = renderer(MatchingGarden, { envelopeId: 'moonlit-passage', sessionCache: new Map(), sharedSound: false }).add('key');
    expect(page.find(node => node.props['aria-label'] === 'Enable sound')).toBeTruthy();
    expect(moonlit.readSave(values.get(moonlit.STORAGE_KEY)).save.sound).toBe(false);
    page.destroy();
    const reload = renderer(MatchingGarden, { envelopeId: 'moonlit-passage', sessionCache: new Map() });
    expect(reload.find(node => node.props['aria-label'] === 'Enable sound')).toBeTruthy();
  });
  it('routes only known envelopes and keeps the same tab cache through history navigation', () => {
    expect(envelopeFromSearch('?envelope=constructor')).toBe('matching-garden');
    expect(envelopeFromSearch('?envelope=__proto__')).toBe('matching-garden');
    expect(envelopeFromSearch('?envelope=moonlit-passage')).toBe('moonlit-passage');
    const root = renderer(MatchingCollection), initial = root.tree().props;
    initial.onChooseEnvelope('moonlit-passage'); root.render();
    expect(root.tree().props.envelopeId).toBe('moonlit-passage');
    expect(root.tree().props.sessionCache).toBe(initial.sessionCache);
    expect(location.search).toBe('?keep=1&envelope=moonlit-passage'); expect(location.hash).toBe('#board');
    location.search = '?keep=1'; dispatch('popstate'); root.render();
    expect(root.tree().props.envelopeId).toBe('matching-garden');
    location.search = '?keep=1&envelope=moonlit-passage'; dispatch('popstate'); root.render();
    expect(root.tree().props.envelopeId).toBe('moonlit-passage');
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
  });
});

describe('independent collection and resource audit', () => {
  it('a shared mute sync and temporary play never replace protected source bytes', () => {
    const original = '{"version":7,"moonlit":"keep exactly"}'; values.set(moonlit.STORAGE_KEY, original);
    const cache = new Map();
    const page = renderer(MatchingGarden, { envelopeId: 'moonlit-passage', sessionCache: cache, sharedSound: false }).add('key');
    expect(page.save().sound).toBe(false); expect(page.save().history).toHaveLength(1);
    page.destroy();
    const resumed = renderer(MatchingGarden, { envelopeId: 'moonlit-passage', sessionCache: cache, sharedSound: false });
    expect(resumed.save().sound).toBe(false); expect(resumed.save().round.moves).toBe(1);
    expect(cache.get(moonlit.STORAGE_KEY).sourceRaw).toBe(original);
    expect(values.get(moonlit.STORAGE_KEY)).toBe(original); expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('catalogued Moonlit postcards opened from Garden retain their own catalog and close to the unchanged Garden board', () => {
    let save = moonlit.newSave();
    for (const [from, to] of [[6, 7], [12, 16], [7, 16]]) save = moonlit.act(save, { type: 'merge', from, to });
    values.set(moonlit.STORAGE_KEY, moonlit.serializeSave(save));
    const page = renderer(MatchingGarden, { sessionCache: new Map() }), before = structuredClone(page.save());
    page.find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.some(child => child?.props?.children === 'Collection')).props.onClick(); page.render();
    let content = page.find(node => node.type?.name === 'CollectionContent');
    content.props.onSelect('moonlit-passage'); page.render();
    content = page.find(node => node.type?.name === 'CollectionContent');
    const collection = renderer(content.type, content.props);
    collection.find(node => node.type === 'button' && node.props.children === 'Open postcard').props.onClick(); page.render();
    const postcard = page.find(node => node.type?.name === 'PostcardContent');
    expect(postcard.props.pieceId).toBe('k3'); expect(postcard.props.envelope.id).toBe('moonlit-passage');
    expect(postcard.props.envelope.catalog.CATALOG.k3.name).toBe('Drawbridge Key');
    expect(postcard.props.envelope.catalog.CATALOG.b3).toBeUndefined();
    page.find(node => node.type?.name === 'CollectionDialog').props.onClose(); page.render();
    expect(page.save()).toEqual(before); expect(values.get(garden.STORAGE_KEY)).toBeUndefined();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('initial rendering mounts only active artwork; the chooser mounts only lazy starters, not the entire catalog', () => {
    const page = renderer(MatchingGarden, { sessionCache: new Map(), onChooseEnvelope() {} });
    const artIds = [];
    walk(page.tree(), node => { if (node.type?.name === 'Art') artIds.push(node.props.id); });
    expect([...new Set(artIds)].sort()).toEqual(['b1', 'b2', 'f1']);
    page.find(node => node.type === 'button' && node.props.children === 'Envelopes').props.onClick(); page.render();
    const element = page.find(node => node.type?.name === 'EnvelopeChooser'), chooser = renderer(element.type, element.props);
    const previews = [];
    walk(chooser.tree(), node => { if (node.type?.name === 'Art') previews.push(node.props); });
    expect(previews.map(props => props.id).sort()).toEqual(['b1', 'f1', 'k1', 'l1', 'm1', 'r1', 's1', 't1']);
    expect(previews.every(props => props.lazy === true)).toBe(true);
  });
});
