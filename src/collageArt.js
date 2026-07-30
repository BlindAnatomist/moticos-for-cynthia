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
  "CYNTHIA",
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

function createMotif(seed, index, tier, forcedKind) {
  const motifSeed = mixSeeds(seed, index, tier, 0x9e3779b9);
  const rng = makeSeededRng(motifSeed);
  const kind = forcedKind ?? motifKindForTier(tier, rng);
  const foreground = choose(PALETTE, rng);
  let background = choose(PALETTE, rng);
  if (background === foreground) background = "#F0E7D2";

  return {
    id: `${motifSeed.toString(16)}-${index}`,
    originSeed: seed,
    kind,
    variant: kind === "silhouette" ? choose(SILHOUETTES, rng) : Math.floor(rng() * 7),
    text:
      kind === "word"
        ? choose(WORDS, rng)
        : kind === "number"
          ? String(10 + Math.floor(rng() * 89))
          : "",
    x: between(8, 78, rng),
    y: between(8, 78, rng),
    width: between(kind === "word" ? 30 : 18, kind === "word" ? 68 : 50, rng),
    height: between(kind === "word" ? 13 : 18, kind === "word" ? 22 : 50, rng),
    rotation: between(-24, 24, rng),
    color: foreground,
    background,
    opacity: between(0.72, 1, rng),
    weight: rng() > 0.5 ? 700 : 500,
  };
}

function uniqueWords(motifs) {
  return [...new Set(motifs.filter((motif) => motif.text).map((motif) => motif.text))];
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

export function createFoundTile(tier = 0, rng = Math.random) {
  const seed = seedFromRng(rng);
  const motifCount = Math.min(7, 2 + tier);
  const motifs = Array.from({ length: motifCount }, (_, index) =>
    createMotif(seed, index, tier)
  );

  return {
    tier,
    seed,
    generation: tier,
    lineage: Math.max(1, 2 ** tier),
    motifs,
    words: uniqueWords(motifs),
  };
}

export function mergeTileArtwork(left, right, newTier, rng = Math.random) {
  const entropy = seedFromRng(rng);
  const seed = mixSeeds(left.seed, right.seed, newTier, entropy);
  const leftMotifs = shuffleWithSeed(left.motifs, mixSeeds(seed, 1));
  const rightMotifs = shuffleWithSeed(right.motifs, mixSeeds(seed, 2));
  const inherited = [];

  if (leftMotifs[0]) inherited.push(leftMotifs[0]);
  if (rightMotifs[0]) inherited.push(rightMotifs[0]);

  const remaining = shuffleWithSeed(
    [...leftMotifs.slice(1), ...rightMotifs.slice(1)],
    mixSeeds(seed, 3)
  );
  const inheritedTarget = Math.min(6, 2 + newTier);
  inherited.push(...remaining.slice(0, Math.max(0, inheritedTarget - inherited.length)));

  const additions = [createMotif(seed, 90 + newTier, newTier)];
  if (newTier >= 3) additions.push(createMotif(seed, 120 + newTier, newTier, "stamp"));
  if (newTier >= 5) additions.push(createMotif(seed, 150 + newTier, newTier, "glyph"));

  const motifs = [...inherited, ...additions].slice(0, 9);
  return {
    tier: newTier,
    seed,
    generation: Math.max(left.generation, right.generation) + 1,
    lineage: left.lineage + right.lineage,
    motifs,
    words: uniqueWords(motifs),
  };
}

function ensureMotifCount(tile, motifs, minimum, seedOffset) {
  const next = motifs.slice();
  while (next.length < minimum) {
    next.push(createMotif(tile.seed, seedOffset + next.length, Math.max(0, tile.tier - 1)));
  }
  return next;
}

export function chopTileArtwork(tile, rng = Math.random) {
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

  const makeChild = (seed, motifs) => ({
    tier: lowerTier,
    seed,
    generation: tile.generation + 1,
    lineage: Math.max(1, Math.ceil(tile.lineage / 2)),
    motifs: motifs.slice(0, 8),
    words: uniqueWords(motifs),
  });

  return [makeChild(seedA, motifsA), makeChild(seedB, motifsB)];
}

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
    `${first} / ${second} Again`,
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
