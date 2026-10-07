// Versioned, authored career content. The accepted registry remains the authority
// for piece IDs, family membership, tiers, artwork and conserved material.
import { getEnvelope } from '../matching/cohesion/registry.js';
export const SCHEMA_VERSION = 1;
export const RULES_VERSION = 1;
export const STORAGE_KEY = 'moticos.career.garden.v1';
export const LOCK_NAME = `${STORAGE_KEY}.writer`;
export const CATALOG = getEnvelope('matching-garden').catalog;
export const FAMILIES = CATALOG.FAMILIES;
export const CHAPTER = Object.freeze({ id: 'garden-correspondence', title: 'Garden Correspondence', minimumLevel: 4, nextTitle: 'A letter after dark', nextPreview: 'A future chapter can bring new paper families and new combinations. Its orders are still being authored.' });
export const LEVELS = Object.freeze([
  { level: 1, xp: 0, targetCeiling: 3, slots: 1 },
  { level: 2, xp: 80, targetCeiling: 4, slots: 2 },
  { level: 3, xp: 250, targetCeiling: 5, slots: 2 },
  { level: 4, xp: 500, targetCeiling: 5, slots: 2 },
].map(Object.freeze));
export const REWARDS = Object.freeze({ 2: { xp: 10, coins: 5 }, 3: { xp: 25, coins: 10 }, 4: { xp: 60, coins: 25 }, 5: { xp: 140, coins: 60 } });
export function target(familyId, tier, quantity = 1) {
  const family = FAMILIES.find(f => f.id === familyId);
  const piece = CATALOG.pieceOf(family?.pieceIds[tier - 1]);
  if (!piece || !REWARDS[tier]) throw new Error('Unknown authored target');
  return Object.freeze({ pieceId: piece.id, quantity });
}
const a = tier => target('bird', tier), b = tier => target('fern', tier);
const recipes = [[a(2)], [b(2)], [a(3)], [a(2), b(3)], [a(4)], [a(3), b(3)], [b(4)], [a(4), b(4)], [a(5)]];
const titles = ['A wing in the post', 'Tea with a fern', 'The way to the garden', 'Two small hellos', 'An open gate', 'Between bird and moon', 'The moon grows leaves', 'A meeting of gardens', 'The wandering aviary'];
const letters = ['A small bird is all a letter needs. Match two coral scraps to make Riverwing.', 'A fern, a cup, a little room to grow. Send a Fern Cup.', 'Fold the map again. A Wayfinder is four bird scraps brought together.', 'Two journeys can share an envelope. Keep a Riverwing beside a Nightgarden.', 'The garden opens. Your first coins can soon make a source more useful.', 'A bird finds the moonlit garden. Which request will you finish first?', 'Let the fronds build an arbor around the moon.', 'Two paper gardens, ready to meet in the mail.', 'Let the whole wandering garden take flight. This is the final letter in this chapter.'];
export function rewardsFor(requirements) {
  return requirements.reduce((sum, r) => ({ xp: sum.xp + REWARDS[CATALOG.pieceOf(r.pieceId).tier].xp * r.quantity, coins: sum.coins + REWARDS[CATALOG.pieceOf(r.pieceId).tier].coins * r.quantity }), { xp: 0, coins: 0 });
}
export const STORY_ORDERS = Object.freeze(recipes.map((requirements, i) => Object.freeze({ id: `garden-letter-${i + 1}`, title: titles[i], letter: letters[i], requirements: Object.freeze(requirements), ...rewardsFor(requirements) })));
export const ORDINARY_ORDERS = Object.freeze([[a(2), b(2)], [a(3)], [b(3)], [a(3), b(3)], [a(4)], [b(4)], [a(5)], [b(5)]].map((requirements, i) => Object.freeze({ id: `garden-repeat-${i + 1}`, title: 'Another paper hello', requirements: Object.freeze(requirements), ...rewardsFor(requirements) })));
export const UPGRADES = Object.freeze([
  { id: 'bird-sorter', familyId: 'bird', name: 'Bird sorter I', level: 2, price: 50, description: 'Bird draws repeat level 1, level 1, level 2. Six draws make a fresh level 4 instead of eight.' },
  { id: 'fern-sorter', familyId: 'fern', name: 'Fern sorter I', level: 2, price: 50, description: 'Fern draws repeat level 1, level 1, level 2. Six draws make a fresh level 4 instead of eight.' },
  { id: 'order-desk', familyId: null, name: 'Order desk', level: 3, price: 100, description: 'A third active request gives you one more order to choose from.' },
].map(Object.freeze));
export const SORTER_CYCLE = Object.freeze([1, 1, 2]);
export function levelDefinition(state) { return state.mode === 'replay' ? LEVELS.at(-1) : LEVELS.findLast(l => state.xp >= l.xp); }
export function coinBalance(state) { return state.coinsEarned - state.coinsSpent; }
export function orderCapacity(state) { return levelDefinition(state).slots + (state.upgrades['order-desk'] ? 1 : 0); }
export function recipeKey(requirements) {
  const counts = new Map();
  for (const r of requirements) { const p = CATALOG.pieceOf(r.pieceId); const key = `${p.familyId}:${p.tier}`; counts.set(key, (counts.get(key) ?? 0) + r.quantity); }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([id, n]) => `${id}:${n}`).join('|');
}
export function eligible(state, requirements) { return requirements.every(r => CATALOG.pieceOf(r.pieceId)?.tier <= levelDefinition(state).targetCeiling); }
