import { titleForTile } from "./collageArt.js";
import { drawCollageTile } from "./collageCanvas.js";
import { SIZE } from "./gameLogic.js";
import { TIERS } from "./moticosConstants.js";

export default async function renderPostcardImage({ board, highest, score, merges }) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // System fonts remain a valid fallback.
    }
  }

  const width = 600;
  const height = 780;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable.");

  ctx.fillStyle = "#E8E0CC";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#221F1D";
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, width - 28, height - 28);
  ctx.setLineDash([2, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#C9A876";
  ctx.strokeRect(26, 26, width - 52, height - 52);
  ctx.setLineDash([]);

  ctx.fillStyle = "#221F1D";
  ctx.textAlign = "center";
  ctx.font = "44px 'Special Elite', monospace";
  ctx.fillText("MOTICOS", width / 2, 82);

  ctx.font = "16px 'Archivo', sans-serif";
  ctx.fillStyle = "#5B5347";
  ctx.fillText(
    `Highest: ${TIERS[highest].name}   Score: ${score}   Merges: ${merges}`,
    width / 2,
    110
  );

  const featured = board.find((tile) => tile?.tier === highest);
  if (featured) {
    ctx.font = "italic 15px Georgia, serif";
    ctx.fillStyle = "#6A5C4D";
    ctx.fillText(titleForTile(featured), width / 2, 136, 500);
  }

  const gridSize = 480;
  const gridX = (width - gridSize) / 2;
  const gridY = 160;
  const cell = gridSize / SIZE;
  const gap = 4;

  board.forEach((tile, index) => {
    if (!tile) return;
    const row = Math.floor(index / SIZE);
    const column = index % SIZE;
    const x = gridX + column * cell + gap / 2;
    const y = gridY + row * cell + gap / 2;
    drawCollageTile(ctx, x, y, cell - gap, cell - gap, tile);
  });

  ctx.strokeStyle = "#31566E";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width - 90, height - 90, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width - 90, height - 90, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#31566E";
  ctx.font = "11px 'Archivo', sans-serif";
  ctx.fillText("MOTICOS", width - 90, height - 94);
  const date = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  ctx.fillText(date, width - 90, height - 78);

  ctx.textAlign = "left";
  ctx.font = "12px Georgia, serif";
  ctx.fillStyle = "#6A5C4D";
  ctx.fillText("cut, remembered, sent", 54, height - 74);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Postcard rendering failed.");

  return {
    blob,
    filename: `moticos-${TIERS[highest].name.toLowerCase()}-${Date.now()}.png`,
  };
}

export function downloadPostcard({ blob, filename, schedule = window.setTimeout }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  schedule(() => URL.revokeObjectURL(url), 1_000);
}

export async function sharePostcard({ blob, filename }) {
  const file = new File([blob], filename, { type: "image/png" });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
    return { shared: false, reason: "unavailable" };
  }
  await navigator.share({
    title: "Moticos postcard",
    text: "A Moticos correspondence",
    files: [file],
  });
  return { shared: true };
}
