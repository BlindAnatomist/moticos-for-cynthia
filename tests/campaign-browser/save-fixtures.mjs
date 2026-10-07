import assert from 'node:assert/strict';
import * as oldEngine from '../../src/career/engine.v1.js';
import * as oldContent from '../../src/career/content.v1.js';
import * as engine from '../../src/career/engine.js';
import * as content from '../../src/career/content.js';
export { oldEngine, oldContent, engine, content };
export const clone = value => structuredClone(value);
export function driver(E = engine, C = content) {
  const act = (s, action) => {
    const before = JSON.stringify(s);
    const result = E.reduceCareer(s, E.commandFor(s, action));
    assert.equal(JSON.stringify(s), before, 'Reducer must not mutate input');
    assert.equal(result.ok, true, `${action.type}: ${result.message}`);
    assert.equal(result.state.revision, s.revision + 1);
    E.validateCareer(result.state);
    return result.state;
  };
  function acquire(s, pieceId, reserved = new Set()) {
    const existing = s.board.find(t => t?.pieceId === pieceId && !reserved.has(t.id));
    if (existing) return [s, existing.id];
    const p = C.CATALOG.pieceOf(pieceId);
    assert(p, `No piece ${pieceId}`);
    if (p.tier === 1) {
      const prior = new Set(s.board.filter(Boolean).map(t => t.id));
      s = act(s, { type: 'supply', familyId: p.familyId, basic: true });
      return [s, s.board.find(t => t && !prior.has(t.id)).id];
    }
    const previous = C.CATALOG.previousPiece(pieceId).id;
    let a, b;
    [s, a] = acquire(s, previous, reserved); reserved.add(a);
    [s, b] = acquire(s, previous, reserved); reserved.delete(a);
    const from = s.board.findIndex(t => t?.id === a), to = s.board.findIndex(t => t?.id === b);
    s = act(s, { type: 'move', from, to, tileId: a, targetTileId: b });
    return [s, s.board[to].id];
  }
  function ready(s, order = s.orders[0]) {
    const reserved = new Set();
    for (const r of order.requirements) for (let i = 0; i < r.quantity; i++) {
      let id; [s, id] = acquire(s, r.pieceId, reserved); reserved.add(id);
    }
    assert(E.matchingTiles(s, order));
    return s;
  }
  function complete(s, order = s.orders[0]) {
    s = ready(s, order);
    return act(s, { type: 'complete', orderId: order.id, tileIds: E.matchingTiles(s, order) });
  }
  function route(count = 9, id = `save-review-route-${count}`) {
    let s = E.createCareer(id);
    for (let i = 0; i < count; i++) {
      const o = s.orders.find(o => o.storyLetterId === C.STORY_ORDERS[i].id);
      assert(o, `Unreachable story ${C.STORY_ORDERS[i].id}`);
      s = complete(s, o);
    }
    return s;
  }
  return { act, acquire, ready, complete, route };
}
export const old = driver(oldEngine, oldContent);
export const current = driver();
export function legacyFixtures() {
  const fresh = oldEngine.createCareer('save-review-v1-fresh');
  let pendingChangedLetters = old.route(5, 'save-review-v1-changed-letters');
  pendingChangedLetters = old.act(pendingChangedLetters, { type: 'purchase', upgradeId: 'bird-sorter', expectedLevel: 0 });
  for (let n = 0; n < 2; n++) pendingChangedLetters = old.act(pendingChangedLetters, { type: 'supply', familyId: 'bird' });
  pendingChangedLetters = old.act(pendingChangedLetters, { type: 'large-text', enabled: true });
  pendingChangedLetters = old.act(pendingChangedLetters, { type: 'sound', enabled: true });
  let capWithPromisedXP = old.act(old.route(8, 'save-review-v1-cap-promises'), { type: 'purchase', upgradeId: 'order-desk', expectedLevel: 0 });
  capWithPromisedXP = old.complete(capWithPromisedXP, capWithPromisedXP.orders.find(o => o.storyLetterId === 'garden-letter-9'));
  let recentHistory = old.act(capWithPromisedXP, { type: 'purchase', upgradeId: 'bird-sorter', expectedLevel: 0 });
  recentHistory = old.act(recentHistory, { type: 'purchase', upgradeId: 'fern-sorter', expectedLevel: 0 });
  const ordinary = recentHistory.orders[0];
  recentHistory = old.ready(recentHistory, ordinary);
  const prior = recentHistory;
  recentHistory = old.act(recentHistory, { type: 'supply', familyId: 'bird' });
  let prunedPurchaseReceipts = clone(recentHistory);
  for (let n = 0; n < 43; n++) prunedPurchaseReceipts = old.complete(prunedPurchaseReceipts, prunedPurchaseReceipts.orders[0]);
  assert(!prunedPurchaseReceipts.receipts.some(r => r.type === 'purchase'));
  return { fresh, pendingChangedLetters, capWithPromisedXP, recentHistory, prunedPurchaseReceipts, beforeLastSupply: prior };
}
export function storageHarness(initial, options = {}) {
  const protectedKeys = new Map([
    ['moticos.career.garden.v1', 'protected original career bytes'],
    ['moticos.matching.garden.v1', 'protected matching bytes'],
    ['moticos.collection.garden.v1', 'protected collection bytes'],
  ]);
  const map = new Map(protectedKeys);
  if (initial !== undefined) map.set(content.STORAGE_KEY, typeof initial === 'string' ? initial : JSON.stringify(initial));
  let active = 0, tail = Promise.resolve();
  const audit = [], flags = { failRead: false, failWrite: false, ...options };
  const locks = { request(name, opts, fn) {
    assert.equal(name, content.LOCK_NAME); assert.equal(opts.mode, 'exclusive');
    const result = tail.then(async () => {
      assert.equal(active, 0); active++;
      try { return await fn(); } finally { active--; }
    });
    tail = result.catch(() => {}); return result;
  } };
  const storage = {
    getItem(key) {
      assert.equal(active, 1, 'All storage reads require the exclusive writer lock');
      assert.equal(key, content.STORAGE_KEY, 'Old namespaces may not even be read');
      audit.push(['get', key]); if (flags.failRead) throw Error('Read denied');
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      assert.equal(active, 1, 'All storage writes require the exclusive writer lock');
      assert.equal(key, content.STORAGE_KEY); audit.push(['set', key, value]);
      if (flags.failWrite) throw Error('Quota exceeded'); map.set(key, value);
    },
  };
  return { storage, locks, map, flags, audit, protectedKeys };
}
// A schema-2 save using the genuinely smaller, immutable content-1 catalog.
// This is a migration fixture, not an impossible state manufactured by bypassing validation.
export function sameSchemaPreviousPack(legacyState) {
  const s = engine.upgradeCareer(legacyState);
  s.contentVersion = 1;
  s.chapterEntryVersions = { 'garden-correspondence': 1 };
  for (const id of ['key', 'moon']) {
    delete s.sources[id]; delete s.material[id]; delete s.upgrades[`${id}-sorter`];
    for (const h of s.history) { delete h.sources[id]; delete h.material[id]; }
  }
  engine.validateCareer(s);
  return s;
}
