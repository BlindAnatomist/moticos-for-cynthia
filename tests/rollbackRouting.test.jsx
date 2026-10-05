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
import RecoveryPage from '../src/matching/recovery/RecoveryPage.jsx';
import { PRESERVED_ENVELOPES } from '../src/matching/recovery/recoveryRegistry.js';
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

describe('rollback recovery navigation without losing sessions', () => {
  it.each(PRESERVED_ENVELOPES.map(e => [e.id]))('loads %s directly into read-only recovery without a board session or write', id => {
    location.search = `?envelope=${id}`;
    const root = renderer(MatchingCollection);
    expect(root.tree().type).toBe(RecoveryPage);
    expect(root.tree().props.sessions.size).toBe(0);
    expect(storage.setItem).not.toHaveBeenCalled();
    root.tree().props.onBack(); root.render();
    expect(root.tree().type).toBe(MatchingGarden);
    expect(root.tree().props.envelopeId).toBe('matching-garden');
    expect(location.search).toBe('');
  });
  it('keeps the same temporary sessions and sound through repeated recovery, Back, and Forward', () => {
    location.search = '?envelope=moonlit-passage';
    const root = renderer(MatchingCollection), initial = root.tree().props;
    initial.sessionCache.set('retained-temporary-save', { save: 'exact in-memory state' });
    initial.onSoundChoice(false); initial.onOpenRecovery(); root.render();
    expect(root.tree().type).toBe(RecoveryPage);
    expect(root.tree().props.sessions).toBe(initial.sessionCache);
    const recoveryUrl = location.href;
    root.tree().props.onBack(); root.render();
    expect(root.tree().type).toBe(MatchingGarden);
    expect(root.tree().props.envelopeId).toBe('moonlit-passage');
    expect(root.tree().props.sharedSound).toBe(false);
    expect(root.tree().props.sessionCache.get('retained-temporary-save')).toEqual({ save: 'exact in-memory state' });
    location.href = recoveryUrl; dispatch('popstate'); root.render();
    expect(root.tree().type).toBe(RecoveryPage);
    expect(root.tree().props.sessions).toBe(initial.sessionCache);
    location.search = '?envelope=lantern-studio'; dispatch('popstate'); root.render();
    expect(root.tree().props.envelopeId).toBe('lantern-studio');
    root.tree().props.onOpenRecovery(); root.render(); root.tree().props.onBack(); root.render();
    expect(root.tree().props.envelopeId).toBe('lantern-studio');
    expect(root.tree().props.sessionCache).toBe(initial.sessionCache);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('makes recovery reachable from both Collection and Envelopes without altering the board', () => {
    for (const kind of ['collection', 'envelopes']) {
      const open = vi.fn(), page = renderer(MatchingGarden, { onOpenRecovery: open, onChooseEnvelope() {} });
      const before = structuredClone(page.save());
      page.find(node => node.type === 'button' && (kind === 'envelopes' ? node.props.children === 'Envelopes' : Array.isArray(node.props.children) && node.props.children.some(child => child?.props?.children === 'Collection'))).props.onClick();
      page.render();
      page.find(node => node.type === 'button' && node.props.children === 'View and back up preserved saves').props.onClick();
      expect(open).toHaveBeenCalledOnce(); expect(page.save()).toEqual(before);
    }
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
