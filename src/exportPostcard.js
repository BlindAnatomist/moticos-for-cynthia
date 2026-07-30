import { SIZE } from "./gameLogic.js";
import { SHAPES, TIERS, drawTilePath } from "./moticosConstants.js";

export default async function exportPostcardImage({
  board,
  highest,
  score,
  merges,
  schedule,
}) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // System fonts remain a valid fallback.
    }
  }

  const width = 600;
  const height = 760;
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
  ctx.fillText("MOTICOS", width / 2, 92);

  ctx.font = "16px 'Archivo', sans-serif";
  ctx.fillStyle = "#5B5347";
  ctx.fillText(
    `Highest: ${TIERS[highest].name}   Score: ${score}   Merges: ${merges}`,
    width / 2,
    120
  );

  const gridSize = 480;
  const gridX = (width - gridSize) / 2;
  const gridY = 150;
  const cell = gridSize / SIZE;
  const gap = 4;

  board.forEach((value, index) => {
    if (value === null) return;
    const row = Math.floor(index / SIZE);
    const column = index % SIZE;
    const x = gridX + column * cell;
    const y = gridY + row * cell;
    const tier = TIERS[value];

    drawTilePath(
      ctx,
      x + gap / 2,
      y + gap / 2,
      cell - gap,
      cell - gap,
      SHAPES[tier.shape]
    );

    if (tier.special && ctx.createConicGradient) {
      const gradient = ctx.createConicGradient(
        Math.PI / 4,
        x + cell / 2,
        y + cell / 2
      );
      const stops = ["#A83228", "#D9A441", "#365D54", "#31566E", "#A83228"];
      stops.forEach((color, stopIndex) => {
        gradient.addColorStop(stopIndex / (stops.length - 1), color);
      });
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = tier.special ? "#D9A441" : tier.bg;
    }

    ctx.fill();
    ctx.fillStyle = tier.ink;
    ctx.font = "10px 'Archivo', sans-serif";
    ctx.fillText(tier.name, x + cell / 2, y + cell / 2 + 3);
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

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Postcard rendering failed.");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `moticos-${TIERS[highest].name.toLowerCase()}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  schedule(() => URL.revokeObjectURL(url), 1_000);
}
