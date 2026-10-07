// Native Node fallback only: mirrors the two selected Vite aliases. It does not
// transpile JSX, build an app, render React or claim a production-build pass.
export async function resolve(specifier, context, nextResolve) {
  if (['./registry.js', './boardArt.js'].includes(specifier) && context.parentURL?.includes('/src/matching/')) {
    return nextResolve(new URL(`../../src/matching/expansion200/${specifier.slice(2)}`, import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}
