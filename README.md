# Moticos for Cynthia

Moticos is a collage-inspired merging game. Drag one clipping onto another clipping of the same tier to combine them into the next form.

## Development

Use Node.js 22. Install the dependency versions recorded in `package-lock.json`:

```bash
npm ci
npm run dev
```

## Verification

```bash
npm test
npm run build
npx playwright install --with-deps webkit chromium
npm run test:e2e
```

The first playable is being developed on `work/fresh-moticos-playable`. It is a fresh implementation based on the supplied React component, not a resurrection of the earlier experiment.

## Matching garden candidate

The default route runs the corrected matching-piece garden: two five-step illustrated paths, a finite pair supply, and postcards from level 3. Match two identical pictures to make the next form. Open `?classic` for the unchanged eight-tier game and `?gallery` for its original gallery. The superseded recipe study remains isolated at `?recipe-study` for regression testing. See [matching design and verification](docs/MATCHING_CANDIDATE.md) and [engine contracts](docs/MATCHING_ENGINE.md).

## Matching collection expansion (local candidate)

The default matching route now supports two independent ten-piece envelopes: Garden Correspondence and Moonlit Passage. The Envelopes control resumes each board and its own Undo history. Collection browsing does not change the active board. The original garden save key and v1 bytes remain compatible. The first envelope remains the live baseline while this candidate passes its separate browser/publication gates. See [expansion scope and verification](docs/MATCHING_COLLECTION_EXPANSION.md).
