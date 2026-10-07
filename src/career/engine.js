import { CATALOG, FAMILIES, SCHEMA_VERSION, RULES_VERSION, CHAPTER, STORY_ORDERS, ORDINARY_ORDERS, UPGRADES, SORTER_CYCLE, levelDefinition, coinBalance, orderCapacity, recipeKey, eligible } from './content.js';
export const HISTORY_LIMIT = 32;
export const RECEIPT_LIMIT = 40;
const MAX = Number.MAX_SAFE_INTEGER - 1000;
const clone = value => structuredClone(value);
const integer = (n, min = 0, max = MAX) => Number.isSafeInteger(n) && n >= min && n <= max;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const slot = n => integer(n, 0, 24);
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && same(Object.keys(value).sort(), [...keys].sort());
function familyOf(id) { return FAMILIES.find(f => f.id === id); }
function allocateTile(s, pieceId) { return { id: `${s.careerId}:tile:${s.nextTileSeq++}`, pieceId }; }
function discover(s) { s.discoveries = [...new Set([...s.discoveries, ...s.board.filter(Boolean).map(t => t.pieceId)])]; }
export function chapterComplete(s) { return s.mode === 'career' && levelDefinition(s).level >= CHAPTER.minimumLevel && STORY_ORDERS.every(o => s.milestones.includes(o.id)); }
export function nextOutput(s, familyId, basic = false) {
  const source = s.sources[familyId], family = familyOf(familyId);
  if (!source || !family) return null;
  const tier = !basic && source.sorter ? SORTER_CYCLE[source.cursor % SORTER_CYCLE.length] : 1;
  return CATALOG.pieceOf(family.pieceIds[tier - 1]);
}
function issue(s, template, slot, origin) {
  const xp = origin === 'practice' || (origin === 'ordinary' && levelDefinition(s).level === 4) ? 0 : template.xp;
  const order = { id: `${s.careerId}:order:${s.nextOrderSeq++}`, slot, templateId: template.id, origin, storyLetterId: origin === 'ordinary' ? null : template.id, requirements: clone(template.requirements), xp, coins: origin === 'practice' ? 0 : template.coins, rulesVersion: RULES_VERSION };
  s.orders.push(order);
}
export function refill(s) {
  if (s.mode === 'replay') return;
  const capacity = orderCapacity(s), allStoryComplete = STORY_ORDERS.every(o => s.milestones.includes(o.id));
  for (let index = 0; index < capacity; index++) {
    if (s.orders.some(o => o.slot === index)) continue;
    if (index < 2 && !allStoryComplete) {
      const next = STORY_ORDERS.find(t => !s.milestones.includes(t.id) && !s.orders.some(o => o.storyLetterId === t.id));
      if (next && eligible(s, next.requirements)) issue(s, next, index, 'story');
      continue;
    }
    for (let attempt = 0; attempt < ORDINARY_ORDERS.length; attempt++) {
      const template = ORDINARY_ORDERS[s.ordinaryCursor % ORDINARY_ORDERS.length];
      s.ordinaryCursor = (s.ordinaryCursor + 1) % ORDINARY_ORDERS.length;
      if (eligible(s, template.requirements) && !s.orders.some(o => recipeKey(o.requirements) === recipeKey(template.requirements))) { issue(s, template, index, 'ordinary'); break; }
    }
  }
  s.orders.sort((a, b) => a.slot - b.slot);
}
// IDs need local uniqueness, not authentication. In an insecure or restricted
// browser without randomUUID, the explicit unsaved-practice route still opens.
export function newCareerId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === 'function') return [...globalThis.crypto.getRandomValues(new Uint32Array(4))].map(n => n.toString(16).padStart(8, '0')).join('-');
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export function createCareer(careerId = newCareerId()) {
  assert(typeof careerId === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(careerId), 'Invalid career ID');
  const s = { schemaVersion: SCHEMA_VERSION, rulesVersion: RULES_VERSION, mode: 'career', careerId, chapterId: CHAPTER.id, revision: 0, nextTileSeq: 1, nextOrderSeq: 1, board: Array(25).fill(null), sources: Object.fromEntries(FAMILIES.map(f => [f.id, { sorter: 0, cursor: 0 }])), upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, 0])), orders: [], xp: 0, coinsEarned: 0, coinsSpent: 0, milestones: [], ordinaryCursor: 0, discoveries: [], material: Object.fromEntries(FAMILIES.map(f => [f.id, { initial: 4, generated: 0, delivered: 0, recycled: 0 }])), receipts: [], history: [], sound: false, largeText: false };
  // Arrange matching starters side by side; grant once, never on clearing.
  FAMILIES.forEach((f, familyIndex) => { for (let i = 0; i < 4; i++) s.board[familyIndex * 5 + i] = allocateTile(s, f.starterId); });
  refill(s); discover(s); validateCareer(s); return s;
}
export function createReplay(storyLetterId, careerId = newCareerId()) {
  const template = STORY_ORDERS.find(t => t.id === storyLetterId); assert(template, 'Unknown letter');
  const s = createCareer(careerId); s.mode = 'replay'; s.orders = []; s.history = []; s.replayLetterId = storyLetterId;
  issue(s, template, 0, 'practice'); validateCareer(s); return s;
}
function validateBoard(board, s) {
  assert(Array.isArray(board) && board.length === 25, 'Invalid board');
  const ids = new Set();
  for (const t of board) {
    if (t === null) continue;
    assert(exactKeys(t, ['id', 'pieceId']) && CATALOG.pieceOf(t.pieceId), 'Unknown tile');
    const prefix = `${s.careerId}:tile:`;
    assert(typeof t.id === 'string' && t.id.startsWith(prefix), 'Invalid tile identity');
    const n = Number(t.id.slice(prefix.length));
    assert(integer(n, 1) && t.id === `${prefix}${n}` && n < s.nextTileSeq && !ids.has(t.id), 'Duplicate or invalid tile sequence'); ids.add(t.id);
  }
}
function validateReversible(part, s) {
  validateBoard(part.board, s);
  assert(exactKeys(part.sources, FAMILIES.map(f => f.id)) && exactKeys(part.material, FAMILIES.map(f => f.id)), 'Unknown source or material family');
  for (const family of FAMILIES) {
    const source = part.sources[family.id], m = part.material[family.id];
    assert(exactKeys(source, ['sorter', 'cursor']) && integer(source.sorter, 0, 1) && integer(source.cursor, 0, 2), 'Invalid source');
    assert(source.sorter === s.upgrades[`${family.id}-sorter`] && (source.sorter || source.cursor === 0), 'Invalid sorter cursor');
    assert(exactKeys(m, ['initial', 'generated', 'delivered', 'recycled']) && ['initial', 'generated', 'delivered', 'recycled'].every(k => integer(m[k])) && m.initial === 4, 'Invalid material');
    const live = part.board.reduce((sum, t) => sum + (CATALOG.pieceOf(t?.pieceId)?.familyId === family.id ? CATALOG.pieceOf(t.pieceId).mass : 0), 0);
    assert(Number.isSafeInteger(m.initial + m.generated) && m.initial + m.generated === live + m.delivered + m.recycled, 'Material is not conserved');
    if (part !== s) assert(m.delivered === s.material[family.id].delivered, 'History crosses delivery');
  }
}
export function validateCareer(s) {
  assert(s && typeof s === 'object' && s.schemaVersion === SCHEMA_VERSION && s.rulesVersion === RULES_VERSION, 'Unsupported career version');
  assert(typeof s.careerId === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(s.careerId) && ['career', 'replay'].includes(s.mode) && s.chapterId === CHAPTER.id, 'Invalid career identity');
  for (const k of ['revision', 'nextTileSeq', 'nextOrderSeq', 'xp', 'coinsEarned', 'coinsSpent']) assert(integer(s[k], ['nextTileSeq', 'nextOrderSeq'].includes(k) ? 1 : 0), `Invalid ${k}`);
  assert(s.coinsSpent <= s.coinsEarned && typeof s.sound === 'boolean' && typeof s.largeText === 'boolean', 'Invalid balance or setting');
  assert(exactKeys(s.upgrades, UPGRADES.map(u => u.id)) && UPGRADES.every(u => integer(s.upgrades[u.id], 0, 1)), 'Unknown upgrades');
  assert(s.coinsSpent === UPGRADES.reduce((n, u) => n + s.upgrades[u.id] * u.price, 0), 'Upgrade spending mismatch');
  assert(UPGRADES.every(u => !s.upgrades[u.id] || levelDefinition(s).level >= u.level), 'Ineligible upgrade');
  validateReversible(s, s);
  assert(Array.isArray(s.discoveries) && new Set(s.discoveries).size === s.discoveries.length && s.discoveries.every(id => CATALOG.pieceOf(id)) && s.board.every(t => !t || s.discoveries.includes(t.pieceId)), 'Invalid discoveries');
  assert(Array.isArray(s.milestones) && new Set(s.milestones).size === s.milestones.length && s.milestones.every(id => STORY_ORDERS.some(t => t.id === id)), 'Invalid story milestones');
  assert(integer(s.ordinaryCursor, 0, ORDINARY_ORDERS.length - 1), 'Invalid ordinary cursor');
  assert(Array.isArray(s.orders) && s.orders.length <= orderCapacity(s), 'Invalid order capacity');
  const orderIds = new Set(), orderSlots = new Set(), storyIds = new Set();
  for (const o of s.orders) {
    const prefix = `${s.careerId}:order:`, n = Number(o?.id?.slice(prefix.length));
    assert(typeof o?.id === 'string' && o.id === `${prefix}${n}` && integer(n, 1) && n < s.nextOrderSeq && !orderIds.has(o.id), 'Invalid order identity'); orderIds.add(o.id);
    assert(integer(o.slot, 0, orderCapacity(s) - 1) && !orderSlots.has(o.slot), 'Invalid order slot'); orderSlots.add(o.slot);
    assert(o.rulesVersion === RULES_VERSION && ['story', 'ordinary', 'practice'].includes(o.origin), 'Invalid order origin');
    const template = (o.origin === 'ordinary' ? ORDINARY_ORDERS : STORY_ORDERS).find(t => t.id === o.templateId);
    assert(template && same(o.requirements, template.requirements) && eligible(s, o.requirements), 'Invalid order recipe');
    if (o.origin === 'ordinary') assert(o.storyLetterId === null && o.coins === template.coins && (o.xp === template.xp || (o.xp === 0 && levelDefinition(s).level === 4)), 'Invalid ordinary reward');
    else {
      assert(o.storyLetterId === template.id && !s.milestones.includes(template.id) && !storyIds.has(template.id), 'Completed or duplicated story'); storyIds.add(template.id);
      assert(o.xp === (o.origin === 'practice' ? 0 : template.xp) && o.coins === (o.origin === 'practice' ? 0 : template.coins), 'Invalid pinned story reward');
    }
    assert((s.mode === 'replay') === (o.origin === 'practice'), 'Practice cannot enter career');
  }
  if (s.mode === 'replay') assert(s.xp === 0 && s.coinsEarned === 0 && s.coinsSpent === 0 && s.milestones.length === 0 && STORY_ORDERS.some(t => t.id === s.replayLetterId), 'Replay cannot reward');
  assert(Array.isArray(s.history) && s.history.length <= HISTORY_LIMIT, 'Invalid history');
  s.history.forEach(h => { assert(['move', 'merge', 'cut', 'recycle', 'supply'].includes(h.label), 'Invalid history label'); validateReversible(h, s); });
  assert(Array.isArray(s.receipts) && s.receipts.length <= RECEIPT_LIMIT, 'Invalid receipts');
  const receiptIds = new Set(); let receiptRevision = 0;
  for (const r of s.receipts) {
    assert(r && ['delivery', 'purchase', 'practice'].includes(r.type) && integer(r.revision, 1, s.revision) && r.revision > receiptRevision && typeof r.id === 'string' && !receiptIds.has(r.id) && integer(r.xp) && integer(r.coins), 'Invalid receipt identity');
    receiptRevision = r.revision; receiptIds.add(r.id);
    if (r.type === 'purchase') {
      const upgrade = UPGRADES.find(u => u.id === r.id);
      assert(s.mode === 'career' && upgrade && s.upgrades[upgrade.id] === 1 && r.xp === 0 && r.coins === upgrade.price, 'Invalid purchase receipt');
    } else {
      const prefix = `${s.careerId}:order:`, n = Number(r.id.slice(prefix.length));
      assert(r.id === `${prefix}${n}` && integer(n, 1) && n < s.nextOrderSeq && !orderIds.has(r.id), 'Invalid delivery receipt identity');
      const isStory = r.storyLetterId !== null;
      const template = (isStory ? STORY_ORDERS : ORDINARY_ORDERS).find(t => t.id === r.templateId);
      assert(template && (!isStory || r.storyLetterId === template.id), 'Unknown receipt template or letter');
      if (r.type === 'practice') assert(s.mode === 'replay' && isStory && r.storyLetterId === s.replayLetterId && r.xp === 0 && r.coins === 0, 'Invalid practice receipt');
      else {
        assert(s.mode === 'career' && r.coins === template.coins && (r.xp === template.xp || (!isStory && r.xp === 0 && levelDefinition(s).level === 4)), 'Invalid delivery receipt rewards');
        if (isStory) assert(s.milestones.includes(r.storyLetterId), 'Uncompleted story receipt');
      }
    }
  }
  return true;
}
function snapshot(s, label) { return { label, board: clone(s.board), sources: clone(s.sources), material: clone(s.material) }; }
function pushHistory(s, original, label) { s.history.push(snapshot(original, label)); s.history = s.history.slice(-HISTORY_LIMIT); }
function receipt(s, r) { s.receipts.push({ ...r, revision: s.revision }); s.receipts = s.receipts.slice(-RECEIPT_LIMIT); }
export function matchingTiles(s, order) {
  if (!order) return null;
  const used = new Set(), ids = [];
  for (const requirement of order.requirements) {
    const candidates = s.board.filter(t => t?.pieceId === requirement.pieceId && !used.has(t.id));
    if (candidates.length < requirement.quantity) return null;
    for (const t of candidates.slice(0, requirement.quantity)) { used.add(t.id); ids.push(t.id); }
  }
  return ids;
}
export function compatiblePairs(s) {
  const pairs = [];
  s.board.forEach((tile, from) => { if (!tile || !CATALOG.nextPiece(tile.pieceId)) return; s.board.forEach((other, to) => { if (to > from && tile.pieceId === other?.pieceId) pairs.push([from, to]); }); });
  return pairs;
}
const fail = (state, code, message) => ({ ok: false, state, code, message });
export function reduceCareer(state, action) {
  try { validateCareer(state); } catch (error) { return fail(state, 'invalid-state', error.message); }
  if (!action || action.expectedRevision !== state.revision || action.careerId !== state.careerId) return fail(state, 'stale', 'The board changed. Review it and try again.');
  const s = clone(state); s.revision++;
  try {
    switch (action.type) {
      case 'supply': {
        const family = familyOf(action.familyId); assert(family, 'Unknown source');
        const index = action.to == null ? s.board.indexOf(null) : action.to;
        assert(slot(index) && s.board[index] === null, 'The board is full or that space is occupied. Merge, Cut or Recycle to make room.');
        const piece = nextOutput(s, family.id, Boolean(action.basic));
        s.board[index] = allocateTile(s, piece.id); s.material[family.id].generated += piece.mass;
        if (!action.basic && s.sources[family.id].sorter) s.sources[family.id].cursor = (s.sources[family.id].cursor + 1) % 3;
        pushHistory(s, state, 'supply'); break;
      }
      case 'move': {
        const { from, to } = action; assert(slot(from) && slot(to) && from !== to && s.board[from], 'Choose a piece and another space');
        const tile = s.board[from], destination = s.board[to];
        assert(action.tileId === tile.id && (action.targetTileId ?? null) === (destination?.id ?? null), 'The selected pieces changed');
        if (!destination) { s.board[to] = tile; s.board[from] = null; pushHistory(s, state, 'move'); }
        else {
          assert(tile.pieceId === destination.pieceId, 'Match two identical pictures from the same family and level.');
          const next = CATALOG.nextPiece(tile.pieceId); assert(next, 'This picture is complete. Send it, keep it, Cut or Recycle it.');
          s.board[to] = allocateTile(s, next.id); s.board[from] = null; pushHistory(s, state, 'merge');
        }
        break;
      }
      case 'cut': {
        const tile = s.board[action.at]; assert(slot(action.at) && tile?.id === action.tileId, 'Select a piece to Cut');
        const previous = CATALOG.previousPiece(tile.pieceId), empty = s.board.indexOf(null);
        assert(previous, 'Level 1 is already a single scrap'); assert(empty !== -1, 'Cut needs one empty space. Recycle a piece to make room.');
        s.board[action.at] = allocateTile(s, previous.id); s.board[empty] = allocateTile(s, previous.id); pushHistory(s, state, 'cut'); break;
      }
      case 'recycle': {
        const tile = s.board[action.at]; assert(slot(action.at) && tile?.id === action.tileId, 'Select a piece to Recycle');
        const piece = CATALOG.pieceOf(tile.pieceId); assert(piece.tier < 3 || action.confirmed === true, 'Confirm recycling this valuable picture');
        s.material[piece.familyId].recycled += piece.mass; s.board[action.at] = null; pushHistory(s, state, 'recycle'); break;
      }
      case 'undo': {
        const previous = s.history.pop(); assert(previous, 'Nothing to Undo. A completed order or purchase begins a new page.');
        s.board = previous.board; s.sources = previous.sources; s.material = previous.material; break;
      }
      case 'complete': {
        const order = s.orders.find(o => o.id === action.orderId); assert(order, 'That order is no longer active');
        assert(Array.isArray(action.tileIds) && new Set(action.tileIds).size === action.tileIds.length && action.tileIds.length === order.requirements.reduce((n, r) => n + r.quantity, 0), 'Choose each requested piece exactly once');
        const tiles = action.tileIds.map(id => s.board.find(t => t?.id === id)); assert(tiles.every(Boolean), 'The requested pieces are no longer here');
        const actual = tiles.map(t => ({ pieceId: t.pieceId, quantity: 1 })); assert(recipeKey(actual) === recipeKey(order.requirements), 'These pieces do not match the order');
        if (order.origin === 'story') assert(!s.milestones.includes(order.storyLetterId), 'This letter has already been completed');
        const ids = new Set(action.tileIds);
        s.board = s.board.map(t => { if (!t || !ids.has(t.id)) return t; const p = CATALOG.pieceOf(t.pieceId); s.material[p.familyId].delivered += p.mass; return null; });
        s.xp += order.xp; s.coinsEarned += order.coins;
        if (order.origin === 'story') s.milestones.push(order.storyLetterId);
        s.orders = s.orders.filter(o => o.id !== order.id); s.history = [];
        receipt(s, { id: order.id, type: order.origin === 'practice' ? 'practice' : 'delivery', storyLetterId: order.storyLetterId, templateId: order.templateId, xp: order.xp, coins: order.coins }); refill(s); break;
      }
      case 'purchase': {
        const upgrade = UPGRADES.find(u => u.id === action.upgradeId); assert(upgrade, 'Unknown upgrade');
        assert(s.mode === 'career' && action.expectedLevel === 0 && s.upgrades[upgrade.id] === 0, 'This upgrade is already owned or unavailable');
        assert(levelDefinition(s).level >= upgrade.level, `Unlocks at player level ${upgrade.level}`); assert(coinBalance(s) >= upgrade.price, 'Complete more orders to earn the coins for this upgrade');
        s.coinsSpent += upgrade.price; s.upgrades[upgrade.id] = 1;
        if (upgrade.familyId) s.sources[upgrade.familyId] = { sorter: 1, cursor: 0 };
        s.history = []; receipt(s, { id: upgrade.id, type: 'purchase', xp: 0, coins: upgrade.price });
        if (upgrade.id === 'order-desk') refill(s); break;
      }
      case 'large-text': assert(typeof action.enabled === 'boolean', 'Invalid text-size choice'); s.largeText = action.enabled; break;
      case 'sound': assert(typeof action.enabled === 'boolean', 'Invalid sound choice'); s.sound = action.enabled; break;
      default: return fail(state, 'unknown-action', 'Unknown action');
    }
    discover(s); validateCareer(s); return { ok: true, state: s, code: 'applied', action: action.type };
  } catch (error) { return fail(state, 'invalid-action', error.message); }
}
export function commandFor(state, action) { return { ...action, careerId: state.careerId, expectedRevision: state.revision }; }
