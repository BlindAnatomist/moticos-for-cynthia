import { ensurePostcardTitleFont, POSTCARD_TITLE_FONT } from '../fonts/postcardFont.js';
import { CATALOG } from './catalog.js';
export async function createCollectionPostcard(pieceId, catalog = CATALOG, subtitle = 'Garden correspondence') {
  const piece = catalog[pieceId];
  if (!piece) throw new Error('Unknown piece');
  const image = new Image();
  image.src = piece.art;
  await Promise.all([image.decode(), ensurePostcardTitleFont()]);
  const canvas = document.createElement('canvas');
  canvas.width = 1536; canvas.height = 1120;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#faf6e9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 332, 50, 872, 872);
  ctx.fillStyle = '#173e3b'; ctx.textAlign = 'center';
  ctx.font = POSTCARD_TITLE_FONT; ctx.fillText(piece.name, 768, 995);
  ctx.font = '18px sans-serif'; ctx.letterSpacing = '4px';
  ctx.fillText(subtitle === 'Garden correspondence' ? 'M O T I C O S  ·  G A R D E N  C O R R E S P O N D E N C E' : `M O T I C O S  ·  ${subtitle.toUpperCase()}`, 768, 1045);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Postcard could not be rendered');
  return { blob, filename: `moticos-${piece.name.toLowerCase().replaceAll(' ', '-')}.png` };
}
