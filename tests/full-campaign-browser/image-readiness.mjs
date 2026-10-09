// Evidence only: this observes rendered DOM, including unsaved practice tiles.
// It must not infer that DOM from the last successfully persisted career.
export function inspectImageReadiness(root = document) {
  const sized = element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0 && element.getClientRects().length > 0; };
  const cells = [...root.querySelectorAll('.career-cell.has-piece')].filter(sized);
  const missing = cells.filter(cell => !cell.querySelector('img')).map(cell => cell.dataset.careerCell);
  const images = [...root.querySelectorAll('.career-shell img')].filter(img => sized(img) || cells.includes(img.closest('.career-cell'))).map(img => {
    const cell = img.closest('.career-cell'), crop = img.closest('.career-art-crop'), r = img.getBoundingClientRect();
    return {cell: cell?.dataset.careerCell ?? null, pieceId: cell?.dataset.pieceId ?? null, src: img.currentSrc || img.src,
      complete: img.complete, natural: [img.naturalWidth, img.naturalHeight], display: [r.width, r.height],
      ready: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && sized(img) && (!crop || sized(crop) && sized(img.parentElement))};
  });
  return {ready: missing.length === 0 && images.length > 0 && images.every(img => img.ready), missing, images};
}
