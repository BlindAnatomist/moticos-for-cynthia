import { createMatchingCatalog } from '../catalogFactory.js';

// A visual revision has no save identity or rule fields. Rebuilding through the
// same catalog factory retains the original routes, tiers and material exactly.
export function applyVisualRevision(catalog, revisions) {
  if (!Array.isArray(revisions) || revisions.length !== catalog.PIECES.length ||
      new Set(revisions.map(item => item?.id)).size !== catalog.PIECES.length) {
    throw new TypeError('A visual revision must cover one complete envelope exactly once.');
  }
  const byId = new Map(revisions.map(item => [item.id, item]));
  for (const piece of catalog.PIECES) {
    const item = byId.get(piece.id);
    if (!item || Object.keys(item).some(key => !['id', 'art', 'description', 'shortName'].includes(key)) ||
        !['art', 'description'].every(key => typeof item[key] === 'string' && item[key].trim()) ||
        (Object.hasOwn(item, 'shortName') && (typeof item.shortName !== 'string' || !item.shortName.trim()))) {
      throw new TypeError(`Invalid visual-only revision for ${piece.id}.`);
    }
  }
  return createMatchingCatalog({
    id: catalog.PACK_ID,
    families: catalog.FAMILIES,
    rows: catalog.PIECES.map(piece => {
      const item = byId.get(piece.id);
      return [piece.id, piece.familyId, piece.tier, piece.name,
        item.shortName ?? piece.shortName, item.description, piece.id];
    }),
    artUrl: id => byId.get(id).art,
  });
}
