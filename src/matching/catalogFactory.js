export const BOARD_SIZE = 5;
export const PACK_VERSION = 1;
export const FAMILY_MATERIAL = 16;
const base = import.meta.env?.BASE_URL ?? '/';
const safeId = id => typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id) && !Object.hasOwn(Object.prototype, id);

// Exactly two authored five-picture journeys form an envelope. Routes use
// explicit pieceIds, so unrelated names or non-sequential IDs are safe.
export function createMatchingCatalog({ id, rows, families, artUrl = asset => `${base}art/${asset}.webp` }) {
  if (typeof artUrl !== 'function') throw new TypeError('An artwork URL resolver must be a function.');
  if (!safeId(id) || !Array.isArray(rows) || rows.length !== 10 || !Array.isArray(families) || families.length !== 2 ||
      new Set(families.map(family => family.id)).size !== 2 ||
      !families.every(family => safeId(family.id) && Array.isArray(family.pieceIds) && family.pieceIds.length === 5)) {
    throw new TypeError('An envelope must contain exactly two distinct five-tier families.');
  }
  const routeIds = families.flatMap(family => family.pieceIds);
  if (new Set(routeIds).size !== 10 || !routeIds.every(safeId) || new Set(rows.map(row => row[0])).size !== 10 ||
      !rows.every(row => {
        if (!Array.isArray(row) || row.length !== 7) return false;
        const [pieceId, familyId, tier, name, shortName, description, asset] = row;
        const family = families.find(item => item.id === familyId);
        return family && Number.isInteger(tier) && tier >= 1 && tier <= 5 && family.pieceIds[tier - 1] === pieceId &&
          [name, shortName, description, asset].every(value => typeof value === 'string' && value.length > 0);
      })) {
    throw new TypeError('Each picture must occur once at its explicit family tier.');
  }
  const PIECES = Object.freeze(rows.map(([pieceId, familyId, tier, name, shortName, description, asset]) => Object.freeze({
    id: pieceId, familyId, tier, rank: tier - 1, name, shortName, description, packId: id,
    mass: 2 ** (tier - 1), art: artUrl(asset),
  })));
  const CATALOG = Object.freeze(Object.fromEntries(PIECES.map(piece => [piece.id, piece])));
  const FAMILIES = Object.freeze(families.map(({ id: familyId, name, shortName, color, pieceIds }) => Object.freeze({
    id: familyId, name, shortName, color, pieceIds: Object.freeze([...pieceIds]),
    starterId: pieceIds[0], finalId: pieceIds.at(-1), material: FAMILY_MATERIAL,
  })));
  const STARTERS = Object.freeze(FAMILIES.map(family => family.starterId));
  const FINALS = Object.freeze(FAMILIES.map(family => family.finalId));
  const next = Object.freeze(Object.fromEntries(FAMILIES.flatMap(family => family.pieceIds.map((pieceId, i) => [pieceId, family.pieceIds[i + 1] ?? null]))));
  const previous = Object.freeze(Object.fromEntries(FAMILIES.flatMap(family => family.pieceIds.map((pieceId, i) => [pieceId, family.pieceIds[i - 1] ?? null]))));
  function pieceOf(pieceId) { return typeof pieceId === 'string' && Object.hasOwn(CATALOG, pieceId) ? CATALOG[pieceId] : null; }
  function nextPiece(pieceId) { return pieceOf(pieceId) ? pieceOf(next[pieceId]) : null; }
  function previousPiece(pieceId) { return pieceOf(pieceId) ? pieceOf(previous[pieceId]) : null; }
  function idOf(tile) {
    if (typeof tile === 'string') return pieceOf(tile)?.id ?? null;
    if (!tile || typeof tile !== 'object' || Object.getPrototypeOf(tile) !== Object.prototype) return null;
    const property = Object.getOwnPropertyDescriptor(tile, 'pieceId');
    return property && Object.hasOwn(property, 'value') ? pieceOf(property.value)?.id ?? null : null;
  }
  function nameOf(tile) { return pieceOf(idOf(tile))?.name ?? ''; }
  return Object.freeze({
    BOARD_SIZE, PACK_ID: id, PACK_VERSION, FAMILY_MATERIAL,
    PIECES, CATALOG, FAMILIES, STARTERS, FINALS, pieceOf, idOf, nextPiece, previousPiece, nameOf,
  });
}
