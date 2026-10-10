import assert from 'node:assert/strict';

// A scrolling exception comes from an explicitly saved and rendered preference,
// never from observing that content already overflows the viewport.
export function layoutOptionsForSurface({width,compact,largeText,renderedLargeText}) {
  assert(Number.isFinite(width)&&width>0,'A real viewport width is required');
  for(const flag of [compact,largeText,renderedLargeText])assert.equal(typeof flag,'boolean');
  assert.equal(compact,width<=650,'Rendered surface must agree with the actual CSS viewport breakpoint');
  assert.equal(largeText,renderedLargeText,'Saved and rendered text preferences must agree');
  return{mode:largeText?'large-text':compact?'standard-phone':'desktop'};
}
