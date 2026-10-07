// Campaign-only reuse. The accepted collection renderer stays unchanged and is
// called on a miss, so a cache hit cannot change the PNG's pixels or filename.
export const POSTCARD_RENDER_VERSION = 'collection-v1-1536x1120';
const DEFAULT_SUBTITLE = 'Garden correspondence';

export class PostcardBusyError extends Error {
  constructor() {
    super('Other postcards are still being prepared. Close and reopen this picture to try again.');
    this.name = 'PostcardBusyError';
  }
}

export function createPostcardCache({
  render,
  maxEntries = 6,
  maxBytes = 12 * 1024 * 1024,
  maxPending = 4,
  renderVersion = POSTCARD_RENDER_VERSION,
  now = () => globalThis.performance?.now() ?? Date.now(),
  onEvent = null,
} = {}) {
  if (typeof render !== 'function') throw new TypeError('A postcard renderer is required');
  for (const [name, value] of Object.entries({ maxEntries, maxBytes, maxPending })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive safe integer`);
  }
  if (typeof renderVersion !== 'string' || !renderVersion) throw new TypeError('A render version is required');
  const completed = new Map(), pending = new Map();
  let retainedBytes = 0, generation = 0;
  const counters = { hits: 0, misses: 0, joins: 0, renders: 0, errors: 0, evictions: 0, skippedOversize: 0, discardedStale: 0, rejectedBusy: 0, clears: 0 };
  const event = (type, data = {}) => {
    // Optional local measurements must never break rendering or collect art IDs.
    try { onEvent?.(Object.freeze({ type, ...data })); } catch { /* observation only */ }
  };
  const snapshot = () => Object.freeze({ ...counters, completedEntries: completed.size, retainedBytes, inFlight: pending.size, maxEntries, maxBytes, maxPending, renderVersion });
  function clear() {
    completed.clear(); retainedBytes = 0; generation += 1; counters.clears += 1;
    // Canvas work has no cancellation API. Keep old jobs counted until settled,
    // but neither reuse them nor let their late results repopulate this cache.
    event('clear');
  }
  function get(pieceId, catalog, subtitle = DEFAULT_SUBTITLE) {
    let piece, key;
    try {
      if (!catalog || !Object.hasOwn(catalog, pieceId)) throw new Error('Unknown piece');
      piece = catalog[pieceId];
      if (!piece || typeof piece.art !== 'string' || !piece.art || typeof piece.name !== 'string' || !piece.name || typeof subtitle !== 'string') throw new TypeError('Invalid postcard input');
      key = JSON.stringify([renderVersion, piece.art, piece.name, subtitle]);
    } catch (error) { return Promise.reject(error); }
    const cached = completed.get(key);
    if (cached) {
      completed.delete(key); completed.set(key, cached);
      counters.hits += 1; event('hit', { bytes: cached.blob.size });
      return Promise.resolve(cached);
    }
    const epoch = generation, pendingKey = `${epoch}:${key}`;
    if (pending.has(pendingKey)) {
      counters.joins += 1; event('join');
      return pending.get(pendingKey);
    }
    if (pending.size >= maxPending) {
      counters.rejectedBusy += 1; event('busy');
      return Promise.reject(new PostcardBusyError());
    }
    counters.misses += 1;
    // Snapshot the actual fields used by the renderer before its asynchronous
    // work starts. A caller mutating its catalog cannot poison this cache key.
    const input = Object.freeze({ [pieceId]: Object.freeze({ art: piece.art, name: piece.name }) });
    const started = now();
    const result = Promise.resolve().then(() => {
      counters.renders += 1; event('render-start');
      return render(pieceId, input, subtitle);
    }).then(postcard => {
      if (!(postcard?.blob instanceof Blob) || postcard.blob.size === 0 || typeof postcard.filename !== 'string' || !postcard.filename) throw new Error('Invalid postcard result');
      const value = Object.freeze({ blob: postcard.blob, filename: postcard.filename });
      if (generation !== epoch) counters.discardedStale += 1;
      else if (value.blob.size > maxBytes) counters.skippedOversize += 1;
      else {
        while (completed.size >= maxEntries || retainedBytes + value.blob.size > maxBytes) {
          const oldestKey = completed.keys().next().value;
          retainedBytes -= completed.get(oldestKey).blob.size;
          completed.delete(oldestKey); counters.evictions += 1;
        }
        completed.set(key, value); retainedBytes += value.blob.size;
      }
      event('render-complete', { durationMs: Math.max(0, now() - started), bytes: value.blob.size, retained: completed.get(key) === value });
      return value;
    }).catch(error => {
      counters.errors += 1; event('render-error', { durationMs: Math.max(0, now() - started) });
      throw error;
    }).finally(() => { pending.delete(pendingKey); });
    pending.set(pendingKey, result);
    return result;
  }
  return Object.freeze({ get, clear, snapshot });
}

// Only PNG Blobs and filenames survive a dialog closing. No canvas, decoded
// Image, DOM node, object URL, localStorage, or game-save data is retained here.
const campaignCache = createPostcardCache({
  render: async (...args) => (await import('../matching/postcard.js')).createCollectionPostcard(...args),
});
export const createCampaignPostcard = (...args) => campaignCache.get(...args);
export const clearCampaignPostcards = () => campaignCache.clear();
export const campaignPostcardStats = () => campaignCache.snapshot();
