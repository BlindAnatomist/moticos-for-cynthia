import { CATALOG } from '../src/career/content.js';
import { createCollectionPostcard } from '../src/matching/postcard.js';
import { createCampaignPostcard, clearCampaignPostcards, campaignPostcardStats } from '../src/career/postcardCache.js';

const digest = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
// Instrument only the isolated probe page, never the production application.
// Timings are observations, not thresholds and not a physical-device benchmark.
async function measure(work) {
  const decode = HTMLImageElement.prototype.decode, toBlob = HTMLCanvasElement.prototype.toBlob;
  const stages = { decodeMs: [], encodeMs: [] };
  HTMLImageElement.prototype.decode = async function (...args) {
    const start = performance.now();
    try { return await decode.apply(this, args); } finally { stages.decodeMs.push(performance.now() - start); }
  };
  HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
    const start = performance.now();
    return toBlob.call(this, blob => { stages.encodeMs.push(performance.now() - start); callback(blob); }, ...args);
  };
  const start = performance.now();
  try { return { result: await work(), durationMs: performance.now() - start, ...stages }; }
  finally { HTMLImageElement.prototype.decode = decode; HTMLCanvasElement.prototype.toBlob = toBlob; }
}
const publicMeasurement = ({ durationMs, decodeMs, encodeMs }) => ({ durationMs, decodeMs, encodeMs });
window.postcardProbe = {
  ids: CATALOG.PIECES.map(piece => piece.id),
  stats: campaignPostcardStats,
  async compare(pieceId) {
    const piece = CATALOG.pieceOf(pieceId);
    if (!piece) throw new Error('Unknown probe piece');
    clearCampaignPostcards();
    const subtitle = ['moon', 'key'].includes(piece.familyId) ? 'Moonlit Correspondence' : 'Garden Correspondence';
    const first = await measure(() => createCampaignPostcard(pieceId, CATALOG.CATALOG, subtitle));
    const repeat = await measure(() => createCampaignPostcard(pieceId, CATALOG.CATALOG, subtitle));
    const original = await measure(() => createCollectionPostcard(pieceId, CATALOG.CATALOG, subtitle));
    const [firstHash, repeatHash, originalHash] = await Promise.all([first.result.blob, repeat.result.blob, original.result.blob].map(digest));
    const bitmap = await createImageBitmap(first.result.blob), width = bitmap.width, height = bitmap.height;
    bitmap.close();
    return { pieceId, subtitle, width, height, bytes: first.result.blob.size, filename: first.result.filename,
      first: publicMeasurement(first), repeat: publicMeasurement(repeat), original: publicMeasurement(original),
      sha256: firstHash, byteEqual: firstHash === repeatHash && firstHash === originalHash,
      sameBlob: first.result.blob === repeat.result.blob, sameFilename: first.result.filename === original.result.filename,
      stats: campaignPostcardStats(),
      caveat: 'First means cache-empty in this isolated probe; image, network and font caches are not guaranteed cold. The original renderer is already loaded, so this excludes the real UI lazy-chunk request. Original runs last. No physical-device claim.' };
  },
  async concurrent(pieceId) {
    clearCampaignPostcards(); const before = campaignPostcardStats();
    const [a, b] = await Promise.all([createCampaignPostcard(pieceId, CATALOG.CATALOG), createCampaignPostcard(pieceId, CATALOG.CATALOG)]);
    const after = campaignPostcardStats();
    return { sameBlob: a.blob === b.blob, renders: after.renders - before.renders, joins: after.joins - before.joins };
  },
};
