const UINT32_MAX = 0xffffffff;

const WORDS = [
  "DEAR",
  "PLEASE",
  "RETURN",
  "AGAIN",
  "BLUE",
  "FOUND",
  "AFTER",
  "YOURS",
  "MAYBE",
  "POST",
  "SIDEWALK",
  "TENDER",
  "HELLO",
  "CUT",
  "PASTE",
  "ELSEWHERE",
  "OPEN",
  "PRIVATE",
  "RABBIT",
  "NIGHT",
  "SENT",
  "KEEP",
  "REPLY",
  "THREAD",
  "REMEMBER",
  "NEAR",
];

const PALETTE = [
  "#221F1D",
  "#F0E7D2",
  "#A83228",
  "#D9A441",
  "#365D54",
  "#31566E",
  "#C9A876",
  "#D8C9A5",
];

const MOTIF_KINDS = [
  "word",
  "silhouette",
  "glyph",
  "stripe",
  "stamp",
  "number",
  "tape",
];

const SILHOUETTES = ["eye", "bird", "shoe", "profile", "flower", "machine", "map"];

const SUPPORT_ZONES = [
  { x: [4, 20], y: [5, 20], width: [22, 38], height: [16, 32], rotation: [-15, 8] },
  { x: [62, 76], y: [8, 24], width: [18, 32], height: [18, 34], rotation: [-8, 16] },
  { x: [5, 22], y: [63, 77], width: [24, 42], height: [14, 28], rotation: [-12, 12] },
  { x: [58, 73], y: [62, 76], width: [22, 38], height: [16, 31], rotation: [-14, 10] },
];

export function mixSeeds(...values) {
  let hash = 2166136261;
  values.forEach((value) => {
    const normalized = Number(value) >>> 0;
    hash ^= normalized;
    hash = Math.imul(hash, 16777619);
    hash ^= hash >>> 13;
  });
  return hash >>> 0;
}

export function makeSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromRng(rng) {
  return Math.floor(rng() * UINT32_MAX) >>> 0;
}

function choose(items, rng) {
  return items[Math.floor(rng() * items.length) % items.length];
}

function between(min, max, rng) {
  return min + (max - min) * rng();
}

function motifKindForTier(tier, rng) {
  const weighted = tier === 0
    ? ["word", "silhouette", "stripe", "number"]
    : tier <= 2
      ? ["word", "silhouette", "glyph", "stripe", "tape", "number"]
      : MOTIF_KINDS;
  return choose(weighted, rng);
}

function createMotif(seed, index, tier, forcedKind, options = {}) {
  const motifSeed = mixSeeds(seed, index, tier, 0x9e3779b9);
  const rng = makeSeededRng(motifSeed);
  const kind = forcedKind ?? motifKindForTier(tier, rng);
  const foreground = choose(PALETTE, rng);
  let background = choose(PALETTE, rng);
  if (background === foreground) background = "#F0E7D2";

  return {
    id: `${motifSeed.toString(16)}-${index}`,
    originSeed: options.originSeed ?? seed,
    kind,
    variant: kind === "silhouette" ? choose(SILHOUETTES, rng) : Math.floor(rng() * 7),
    text:
      kind === "word"
        ? choose(WORDS, rng)
        : kind === "number"
          ? `No. ${10 + Math.floor(rng() * 89)}`
          : "",
    x: 12,
    y: 12,
    width: kind === "word" ? 52 : 36,
    height: kind === "word" ? 18 : 36,
    rotation: 0,
    color: foreground,
    background,
    opacity: between(0.76, 1, rng),
    weight: rng() > 0.5 ? 700 : 500,
    excludeFromTitle: Boolean(options.excludeFromTitle),
    correspondence: Boolean(options.correspondence),
    kept: Boolean(options.kept),
  };
}

function titleWords(motifs) {
  return [...new Set(
    motifs
      .filter((motif) => motif.kind === "word" && motif.text && !motif.excludeFromTitle)
      .map((motif) => motif.text)
  )];
}

function shuffleWithSeed(values, seed) {
  const next = values.slice();
  const rng = makeSeededRng(seed);
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function targetMotifCount(tier) {
  if (tier <= 1) return 3;
  if (tier <= 4) return 4;
  return 5;
}

function harmonize(motif, harmony, index) {
  const foreground = harmony[index % harmony.length];
  const background = harmony[(index + 1) % harmony.length];
  return {
    ...motif,
    color: motif.kind === "tape" ? motif.color : foreground,
    background: motif.kind === "tape" ? motif.background : background,
  };
}

function placeFocal(motif, rng) {
  const word = motif.kind === "word";
  return {
    ...motif,
    role: "focal",
    x: between(17, 29, rng),
    y: between(19, 31, rng),
    width: between(word ? 50 : 45, word ? 70 : 64, rng),
    height: between(word ? 17 : 38, word ? 24 : 58, rng),
    rotation: between(-7, 7, rng),
    opacity: between(0.9, 1, rng),
  };
}

function placeSupport(motif, zone, rng, index) {
  const word = motif.kind === "word";
  return {
    ...motif,
    role: "support",
    x: between(zone.x[0], zone.x[1], rng),
    y: between(zone.y[0], zone.y[1], rng),
    width: between(
      word ? Math.max(30, zone.width[0]) : zone.width[0],
      word ? Math.max(44, zone.width[1]) : zone.width[1],
      rng
    ),
    height: between(
      word ? 13 : zone.height[0],
      word ? 20 : zone.height[1],
      rng
    ),
    rotation: between(zone.rotation[0], zone.rotation[1], rng),
    opacity: between(index > 2 ? 0.68 : 0.78, 0.94, rng),
  };
}

export function composeMotifs(candidates, seed, tier, options = {}) {
  const rng = makeSeededRng(mixSeeds(seed, tier, 0xc011a6e));
  const target = targetMotifCount(tier);
  const requiredIds = new Set(options.requiredMotifIds ?? []);
  const preservedId = options.preserveMotifId ?? null;
  if (preservedId) requiredIds.add(preservedId);

  const required = candidates.filter((motif) => requiredIds.has(motif.id));
  const remaining = shuffleWithSeed(
    candidates.filter((motif) => !requiredIds.has(motif.id)),
    mixSeeds(seed, 0x51e1ec7)
  );

  const chosen = [];
  [...required, ...remaining].forEach((motif) => {
    if (chosen.length >= target) return;
    if (!chosen.some((current) => current.id === motif.id)) chosen.push(motif);
  });

  while (chosen.length < target) {
    chosen.push(createMotif(seed, 400 + chosen.length, tier));
  }

  let focalIndex = chosen.findIndex((motif) => motif.id === preservedId);
  if (focalIndex === -1) {
    focalIndex = chosen.findIndex((motif) => ["silhouette", "word", "glyph"].includes(motif.kind));
  }
  if (focalIndex === -1) focalIndex = 0;
  const [focal] = chosen.splice(focalIndex, 1);
  chosen.unshift(focal);

  const harmonyRng = makeSeededRng(mixSeeds(seed, 0xface));
  const harmony = shuffleWithSeed(PALETTE, mixSeeds(seed, 0xbead)).slice(0, 3);
  if (!harmony.includes("#F0E7D2") && harmonyRng() > 0.35) harmony[2] = "#F0E7D2";

  return chosen.map((motif, index) => {
    const marked = {
      ...motif,
      kept: motif.id === preservedId || motif.kept,
    };
    const placed = index === 0
      ? placeFocal(marked, rng)
      : placeSupport(marked, SUPPORT_ZONES[(index - 1) % SUPPORT_ZONES.length], rng, index);
    return harmonize(placed, harmony, index);
  });
}

export function createFoundTile(tier = 0, rng = Math.random, options = {}) {
  const seed = seedFromRng(rng);
  const rawCount = Math.min(7, 3 + tier);
  const candidates = Array.from({ length: rawCount }, (_, index) =>
    createMotif(seed, index, tier)
  );
  if (options.discovered && tier >= 2) {
    candidates.push(createMotif(seed, 70 + tier, tier, "stamp", { correspondence: true }));
  }
  const motifs = composeMotifs(candidates, seed, tier);

  return {
    tier,
    seed,
    generation: tier,
    lineage: Math.max(1, 2 ** tier),
    motifs,
    words: titleWords(motifs),
    focalMotifId: motifs[0]?.id ?? null,
    correspondenceCount: options.discovered ? 1 : 0,
  };
}

export function mergeTileArtwork(left, right, newTier, rng = Math.random, options = {}) {
  const entropy = seedFromRng(rng);
  const seed = mixSeeds(left.seed, right.seed, newTier, entropy);
  const leftMotifs = shuffleWithSeed(left.motifs, mixSeeds(seed, 1));
  const rightMotifs = shuffleWithSeed(right.motifs, mixSeeds(seed, 2));
  const candidates = [...leftMotifs, ...rightMotifs];
  const requiredMotifIds = [leftMotifs[0]?.id, rightMotifs[0]?.id].filter(Boolean);

  if (newTier >= 2) candidates.push(createMotif(seed, 90 + newTier, newTier, "tape"));
  if (newTier >= 3) candidates.push(createMotif(seed, 120 + newTier, newTier, "stamp", {
    correspondence: options.correspondence,
  }));
  if (newTier >= 5) candidates.push(createMotif(seed, 150 + newTier, newTier, "glyph"));
  if (newTier === 7 && seed % 7 === 0) {
    candidates.push({
      ...createMotif(seed, 777, newTier, "word", { excludeFromTitle: true }),
      text: "FOR CYNTHIA",
      correspondence: true,
    });
  }

  const motifs = composeMotifs(candidates, seed, newTier, {
    requiredMotifIds,
    preserveMotifId: options.preserveMotifId,
  });

  return {
    tier: newTier,
    seed,
    generation: Math.max(left.generation, right.generation) + 1,
    lineage: left.lineage + right.lineage,
    motifs,
    words: titleWords(motifs),
    focalMotifId: motifs[0]?.id ?? null,
    correspondenceCount:
      (left.correspondenceCount ?? 0) +
      (right.correspondenceCount ?? 0) +
      (options.correspondence ? 1 : 0),
  };
}

function ensureMotifCount(tile, motifs, minimum, seedOffset) {
  const next = motifs.slice();
  while (next.length < minimum) {
    next.push(createMotif(tile.seed, seedOffset + next.length, Math.max(0, tile.tier - 1)));
  }
  return next;
}

export function cutTileArtwork(tile, rng = Math.random) {
  const lowerTier = Math.max(0, tile.tier - 1);
  const seedA = mixSeeds(tile.seed, seedFromRng(rng), 0xa11ce);
  const seedB = mixSeeds(tile.seed, seedFromRng(rng), 0xb0b);
  const motifsA = ensureMotifCount(
    tile,
    tile.motifs.filter((_, index) => index % 2 === 0),
    2,
    210
  );
  const motifsB = ensureMotifCount(
    tile,
    tile.motifs.filter((_, index) => index % 2 === 1),
    2,
    240
  );

  motifsA.push(createMotif(seedA, 270, lowerTier, "stripe"));
  motifsB.push(createMotif(seedB, 271, lowerTier, "tape"));

  const makeChild = (seed, candidates) => {
    const motifs = composeMotifs(candidates, seed, lowerTier);
    return {
      tier: lowerTier,
      seed,
      generation: tile.generation + 1,
      lineage: Math.max(1, Math.ceil(tile.lineage / 2)),
      motifs,
      words: titleWords(motifs),
      focalMotifId: motifs[0]?.id ?? null,
      correspondenceCount: tile.correspondenceCount ?? 0,
    };
  };

  return [makeChild(seedA, motifsA), makeChild(seedB, motifsB)];
}

export const chopTileArtwork = cutTileArtwork;

export function createResidue(tile) {
  const rng = makeSeededRng(mixSeeds(tile.seed, tile.tier, 0x51de));
  return {
    seed: tile.seed,
    rotation: between(-18, 18, rng),
    color: choose(["#6D6458", "#8A6A4A", "#31566E", "#A83228"], rng),
    variant: Math.floor(rng() * 4),
    opacity: between(0.12, 0.24, rng),
  };
}

function titleCase(word) {
  return `${word.slice(0, 1)}${word.slice(1).toLowerCase()}`;
}

export function titleForTile(tile) {
  const fallbackRng = makeSeededRng(mixSeeds(tile.seed, tile.lineage));
  const words = tile.words.length >= 2
    ? tile.words
    : [...tile.words, choose(WORDS, fallbackRng), choose(WORDS, fallbackRng)];
  const first = titleCase(words[0]);
  const second = titleCase(words[1] === words[0] ? choose(WORDS, fallbackRng) : words[1]);
  const forms = [
    `Dear ${first}, After ${second}`,
    `${first} Returns Again`,
    `Please Return ${first}`,
    `${first} Sent Elsewhere`,
    `For ${first}, Maybe ${second}`,
  ];
  return forms[tile.seed % forms.length];
}

export function tileTier(value) {
  return value === null ? null : value.tier;
}

export function collagePalette() {
  return PALETTE.slice();
}
