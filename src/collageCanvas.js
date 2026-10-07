import { makeSeededRng } from "./collageArt.js";
import { SHAPES, TIERS, drawTilePath } from "./moticosConstants.js";

function drawSilhouette(ctx, motif, width, height) {
  const variant = motif.variant;
  if (variant === "eye") {
    ctx.fillStyle = motif.background;
    ctx.beginPath();
    ctx.ellipse(0, 0, width / 2, height / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = motif.color;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F0E7D2";
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) / 11, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (variant === "flower") {
    ctx.fillStyle = motif.color;
    for (let angle = 0; angle < 360; angle += 72) {
      const radians = (angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(
        Math.cos(radians) * width * 0.24,
        Math.sin(radians) * height * 0.24,
        Math.min(width, height) * 0.18,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = motif.background;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) * 0.15, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (variant === "machine") {
    ctx.fillStyle = motif.background;
    ctx.fillRect(-width / 2, -height * 0.32, width, height * 0.64);
    ctx.fillStyle = motif.color;
    ctx.beginPath();
    ctx.arc(-width * 0.22, 0, height * 0.18, 0, Math.PI * 2);
    ctx.arc(width * 0.22, 0, height * 0.18, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.fillStyle = motif.color;
  ctx.beginPath();
  if (variant === "shoe") {
    ctx.moveTo(-width / 2, -height * 0.3);
    ctx.lineTo(-width * 0.08, height * 0.05);
    ctx.quadraticCurveTo(width * 0.25, height * 0.25, width / 2, height * 0.3);
    ctx.lineTo(width * 0.42, height / 2);
    ctx.lineTo(-width * 0.4, height * 0.42);
  } else if (variant === "bird") {
    ctx.moveTo(-width / 2, 0);
    ctx.quadraticCurveTo(-width * 0.15, -height / 2, width * 0.08, 0);
    ctx.quadraticCurveTo(width * 0.3, -height * 0.35, width / 2, -height * 0.1);
    ctx.quadraticCurveTo(width * 0.28, height * 0.05, width * 0.08, height / 2);
  } else if (variant === "profile") {
    ctx.moveTo(-width * 0.28, height / 2);
    ctx.quadraticCurveTo(-width / 2, 0, -width * 0.16, -height * 0.42);
    ctx.quadraticCurveTo(width * 0.12, -height / 2, width * 0.22, -height * 0.2);
    ctx.lineTo(width / 2, -height * 0.04);
    ctx.lineTo(width * 0.2, height * 0.08);
    ctx.quadraticCurveTo(width * 0.15, height * 0.42, -width * 0.28, height / 2);
  } else {
    ctx.moveTo(-width / 2, height * 0.3);
    ctx.bezierCurveTo(-width * 0.25, -height * 0.45, 0, height * 0.5, width * 0.1, -height * 0.3);
    ctx.bezierCurveTo(width * 0.25, height * 0.35, width * 0.4, 0, width / 2, -height * 0.45);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGlyph(ctx, motif, width, height) {
  ctx.strokeStyle = motif.color;
  ctx.lineWidth = Math.max(2, width * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const variant = Number(motif.variant) % 4;
  if (variant === 0) {
    ctx.moveTo(-width / 2, height / 2);
    ctx.lineTo(-width * 0.16, -height / 2);
    ctx.lineTo(width * 0.08, height / 2);
    ctx.lineTo(width / 2, -height * 0.32);
  } else if (variant === 1) {
    ctx.moveTo(-width / 2, 0);
    ctx.bezierCurveTo(-width * 0.3, -height / 2, width * 0.02, height / 2, width / 2, -height * 0.28);
  } else if (variant === 2) {
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(width / 2, height / 2);
    ctx.moveTo(width / 2, -height / 2);
    ctx.lineTo(-width / 2, height / 2);
  } else {
    ctx.moveTo(-width / 2, height * 0.3);
    ctx.quadraticCurveTo(0, -height * 0.6, width / 2, height * 0.3);
    ctx.quadraticCurveTo(0, height * 0.55, -width / 2, height * 0.3);
  }
  ctx.stroke();
}

function drawMotif(ctx, motif, tileWidth, tileHeight) {
  const centerX = ((motif.x + motif.width / 2) / 100) * tileWidth;
  const centerY = ((motif.y + motif.height / 2) / 100) * tileHeight;
  const width = (motif.width / 100) * tileWidth;
  const height = (motif.height / 100) * tileHeight;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((motif.rotation * Math.PI) / 180);
  ctx.globalAlpha = motif.opacity;

  if (motif.kind === "word") {
    ctx.fillStyle = motif.background;
    ctx.fillRect(-width / 2 - 2, -height / 2 - 1, width + 4, height + 2);
    ctx.fillStyle = motif.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${motif.weight} ${Math.max(7, height * 0.62)}px Georgia, serif`;
    ctx.fillText(motif.text, 0, 1, width);
  } else if (motif.kind === "number") {
    ctx.fillStyle = motif.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(11, height)}px monospace`;
    ctx.fillText(motif.text, 0, 0, width);
  } else if (motif.kind === "stripe") {
    ctx.fillStyle = motif.background;
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeStyle = motif.color;
    ctx.lineWidth = Math.max(2, width * 0.08);
    [-0.36, 0, 0.36].forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(-width / 2 + width * offset, height / 2);
      ctx.lineTo(width * offset, -height / 2);
      ctx.stroke();
    });
  } else if (motif.kind === "tape") {
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = "#F2D98D";
    ctx.strokeStyle = "#8F7A43";
    ctx.lineWidth = 0.8;
    ctx.fillRect(-width / 2, -height * 0.2, width, Math.max(6, height * 0.4));
    ctx.strokeRect(-width / 2, -height * 0.2, width, Math.max(6, height * 0.4));
  } else if (motif.kind === "stamp") {
    const radius = Math.min(width, height) / 2;
    ctx.strokeStyle = motif.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.arc(0, 0, radius * 0.73, 0, Math.PI * 2);
    ctx.moveTo(-radius * 0.7, 0);
    ctx.lineTo(radius * 0.7, 0);
    ctx.stroke();
  } else if (motif.kind === "glyph") {
    drawGlyph(ctx, motif, width, height);
  } else {
    drawSilhouette(ctx, motif, width, height);
  }

  ctx.restore();
}

export function drawCollageTile(ctx, x, y, width, height, tile, options = {}) {
  const { showLabel = true } = options;
  const tier = TIERS[tile.tier];

  ctx.save();
  drawTilePath(ctx, x, y, width, height, SHAPES[tier.shape]);
  ctx.clip();

  if (tier.special && ctx.createConicGradient) {
    const gradient = ctx.createConicGradient(Math.PI / 4, x + width / 2, y + height / 2);
    ["#A83228", "#D9A441", "#365D54", "#31566E", "#A83228"].forEach((color, index, stops) => {
      gradient.addColorStop(index / (stops.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = tier.canvasBg ?? tier.bg;
  }
  ctx.fillRect(x, y, width, height);

  ctx.save();
  ctx.translate(x, y);
  tile.motifs.forEach((motif) => drawMotif(ctx, motif, width, height));
  ctx.restore();

  const grain = makeSeededRng(tile.seed);
  ctx.fillStyle = "rgba(34,31,29,.08)";
  for (let index = 0; index < 28; index += 1) {
    ctx.fillRect(x + grain() * width, y + grain() * height, 0.6 + grain() * 1.2, 0.6 + grain() * 1.2);
  }

  ctx.restore();

  ctx.save();
  drawTilePath(ctx, x, y, width, height, SHAPES[tier.shape]);
  ctx.strokeStyle = "rgba(34,31,29,.25)";
  ctx.lineWidth = Math.max(0.8, width * 0.012);
  ctx.stroke();
  ctx.restore();

  if (showLabel) {
    const labelWidth = Math.min(width * 0.84, Math.max(30, tier.name.length * width * 0.065));
    const labelHeight = Math.max(8, height * 0.14);
    ctx.fillStyle = "rgba(240,231,210,.86)";
    ctx.fillRect(x + (width - labelWidth) / 2, y + height * 0.76, labelWidth, labelHeight);
    ctx.fillStyle = tier.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(6, height * 0.1)}px Arial, sans-serif`;
    ctx.fillText(tier.name.toUpperCase(), x + width / 2, y + height * 0.83, labelWidth - 4);
  }
}
