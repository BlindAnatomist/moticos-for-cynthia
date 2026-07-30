export const POSTCARD_MIN_TIER = 3;
export const FLIGHT_MS = 190;

export const SHAPES = [
  [[10, 0], [90, 5], [100, 40], [85, 100], [15, 95], [0, 55]],
  [[5, 10], [60, 0], [100, 20], [95, 70], [70, 100], [20, 90], [0, 50]],
  [[15, 0], [70, 5], [100, 35], [90, 75], [60, 100], [25, 85], [0, 60], [5, 25]],
  [[0, 20], [30, 0], [75, 5], [100, 30], [90, 65], [100, 90], [60, 100], [20, 90], [0, 60]],
  [[10, 5], [50, 0], [90, 10], [100, 45], [85, 80], [100, 100], [50, 90], [0, 100], [5, 60]],
];

export const GRAIN =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/></svg>";

export const FIBER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
  "<filter id='f'><feTurbulence type='turbulence' baseFrequency='0.012 0.09' numOctaves='2' seed='7'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%25' height='100%25' filter='url(%23f)' opacity='0.5'/></svg>";

export const TIERS = [
  { name: "Clip", bg: "#C9A876", ink: "#3B2E1F", shape: 0 },
  { name: "Fragment", bg: "#E4D9BB", ink: "#3B2E1F", shape: 1 },
  { name: "Glyph", bg: "#221F1D", ink: "#EDE6D6", shape: 2 },
  { name: "Panel", bg: "#A83228", ink: "#FFF8E8", shape: 1 },
  { name: "Chop", bg: "#365D54", ink: "#FFF8E8", shape: 3 },
  { name: "Assemblage", bg: "#D9A441", ink: "#221F1D", shape: 2 },
  { name: "Correspondence", bg: "#31566E", ink: "#FFF8E8", shape: 4 },
  {
    name: "Moticos",
    bg: "conic-gradient(from 45deg, #A83228, #D9A441, #365D54, #31566E, #A83228)",
    ink: "#221F1D",
    shape: 3,
    special: true,
  },
];

export function clipPathOf(points) {
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
}

export function drawTilePath(ctx, x, y, width, height, points) {
  ctx.beginPath();
  points.forEach(([pointX, pointY], index) => {
    const absoluteX = x + (pointX / 100) * width;
    const absoluteY = y + (pointY / 100) * height;
    if (index === 0) ctx.moveTo(absoluteX, absoluteY);
    else ctx.lineTo(absoluteX, absoluteY);
  });
  ctx.closePath();
}

export function tileBackground(tier) {
  return `url("${GRAIN}") repeat, ${tier.bg}`;
}

export function labelSize(name) {
  if (name.length > 10) return 9;
  if (name.length > 7) return 10;
  return 11;
}

export function btnBase(disabled) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: disabled ? "#B8AC93" : "#221F1D",
    color: "#EDE6D6",
    border: "none",
    borderRadius: 7,
    padding: "9px 14px",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.4,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.65 : 1,
    boxShadow: disabled ? "none" : "0 2px 4px rgba(0,0,0,0.3)",
  };
}
