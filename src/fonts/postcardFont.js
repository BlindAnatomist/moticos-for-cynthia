export const POSTCARD_TITLE_FAMILY = 'Moticos Serif';
export const POSTCARD_TITLE_FONT = `42px "${POSTCARD_TITLE_FAMILY}"`;
export const POSTCARD_TITLE_FONT_URL = new URL('./LiberationSerif-Regular.ttf', import.meta.url).href;
const loads = new WeakMap();

// Canvas must wait for the actual bundled face, not a platform serif fallback.
// The standalone export probe has no career stylesheet, so register the same
// face there too. A failed load is not cached: the existing Retry action works.
export function ensurePostcardTitleFont() {
  const fonts = globalThis.document?.fonts;
  if (!fonts || typeof globalThis.FontFace !== 'function') return Promise.reject(new Error('Postcard font loading is unavailable'));
  if (loads.has(fonts)) return loads.get(fonts);
  const pending = Promise.resolve().then(async () => {
    const existing = [...fonts].find(face => face.family.replace(/["']/g, '') === POSTCARD_TITLE_FAMILY && face.style === 'normal' && face.weight === '400' && face.status !== 'error');
    const face = existing ?? new FontFace(POSTCARD_TITLE_FAMILY, `url("${POSTCARD_TITLE_FONT_URL}")`, {style: 'normal', weight: '400'});
    await face.load();
    if (face.status !== 'loaded') throw new Error('Postcard title font did not load');
    if (!existing) fonts.add(face);
    return face;
  }).catch(error => { loads.delete(fonts); throw error; });
  loads.set(fonts, pending);
  return pending;
}
