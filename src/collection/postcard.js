import { CATALOG } from './catalog.js';
export async function createCollectionPostcard(pieceId) {
  const piece = CATALOG[pieceId];
  if (!piece) throw new Error('Unknown piece');
  const image = new Image();
  image.src = piece.art;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1536; canvas.height = 1120;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#faf6e9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 332, 50, 872, 872);
  ctx.fillStyle = '#173e3b'; ctx.textAlign = 'center';
  ctx.font = '42px Georgia, serif'; ctx.fillText(piece.name, 768, 995);
  ctx.font = '18px sans-serif'; ctx.letterSpacing = '4px';
  ctx.fillText('M O T I C O S  ·  G A R D E N  C O R R E S P O N D E N C E', 768, 1045);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Postcard could not be rendered');
  return { blob, filename: `moticos-${piece.name.toLowerCase().replaceAll(' ', '-')}.png` };
}
