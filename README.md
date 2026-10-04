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

## Garden collection candidate

The default route runs the new 12-piece authored-art collection study. Open `?classic` for the unchanged eight-tier game and `?gallery` for its original gallery. See [the collection design and verification record](docs/COLLECTION_PLAYABLE.md).
