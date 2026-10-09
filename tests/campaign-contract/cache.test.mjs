import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPostcardCache, PostcardBusyError, createCampaignPostcard, clearCampaignPostcards } from '../../src/career/postcardCache.js';

const catalog = { a: { art: '/a.webp', name: 'Paper Bird' }, b: { art: '/b.webp', name: 'Paper Key' }, c: { art: '/c.webp', name: 'Paper Moon' } };
const output = (n = 4, filename = 'paper.png') => ({ blob: new Blob(['x'.repeat(n)], { type: 'image/png' }), filename });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('completed repeat returns the same immutable Blob and filename without another render', async () => {
  let count = 0;
  const cache = createPostcardCache({ render: async () => { count++; return output(); } });
  const first = await cache.get('a', catalog, 'Garden');
  assert.equal(await cache.get('a', catalog, 'Garden'), first);
  assert(Object.isFrozen(first)); assert.equal(count, 1);
  assert.deepEqual([cache.snapshot().hits, cache.snapshot().renders, cache.snapshot().retainedBytes], [1, 1, 4]);
});
test('concurrent and Strict Mode-style reopen callers share one in-flight promise', async () => {
  const job = deferred(); let calls = 0;
  const cache = createPostcardCache({ render: () => { calls++; return job.promise; } });
  const first = cache.get('a', catalog), second = cache.get('a', catalog);
  assert.equal(first, second); assert.equal(cache.snapshot().inFlight, 1);
  job.resolve(output()); assert.equal(await first, await second); assert.equal(calls, 1);
  assert.equal(cache.snapshot().joins, 1); assert.equal(cache.snapshot().inFlight, 0);
});
test('art, title, subtitle and render version participate in collision-safe identity', async () => {
  const inputs = [];
  const cache = createPostcardCache({ render: async (...args) => { inputs.push(args); return output(); }, maxEntries: 10 });
  await cache.get('a', catalog, 'Garden');
  await cache.get('a', { a: { ...catalog.a, art: '/revised.webp' } }, 'Garden');
  await cache.get('a', { a: { ...catalog.a, name: 'New title' } }, 'Garden');
  await cache.get('a', catalog, 'Moon');
  await cache.get('alias', { alias: catalog.a }, 'Garden');
  assert.equal(inputs.length, 4); assert.equal(cache.snapshot().hits, 1);
  assert.notEqual(createPostcardCache({ render: async () => output(), renderVersion: 'next' }).snapshot().renderVersion, cache.snapshot().renderVersion);
});
test('catalog fields are snapshotted before asynchronous work begins', async () => {
  const mutable = { a: { ...catalog.a } }; let observed;
  const cache = createPostcardCache({ render: async (_, input) => { observed = input.a; return output(); } });
  const first = cache.get('a', mutable); mutable.a.name = 'Mutated';
  await first; assert.equal(observed.name, 'Paper Bird'); assert(Object.isFrozen(observed));
  await cache.get('a', mutable); assert.equal(observed.name, 'Mutated'); assert.equal(cache.snapshot().renders, 2);
});
test('failed render is evicted and the same postcard can retry', async () => {
  let calls = 0;
  const cache = createPostcardCache({ render: async () => { if (++calls === 1) throw new Error('decode failed'); return output(); } });
  await assert.rejects(cache.get('a', catalog), /decode failed/);
  assert.equal(cache.snapshot().inFlight, 0); assert.equal(cache.snapshot().completedEntries, 0);
  assert((await cache.get('a', catalog)).blob); assert.equal(calls, 2);
});
test('synchronous render errors and invalid output do not poison the cache', async () => {
  let calls = 0;
  const cache = createPostcardCache({ render: () => { calls++; if (calls === 1) throw new Error('canvas unavailable'); if (calls === 2) return { blob: null, filename: 'x' }; return output(); } });
  await assert.rejects(cache.get('a', catalog), /canvas unavailable/);
  await assert.rejects(cache.get('a', catalog), /Invalid postcard/);
  assert((await cache.get('a', catalog)).blob); assert.equal(cache.snapshot().errors, 2);
});
test('LRU entry bound retains the most recently reopened postcard', async () => {
  const calls = [];
  const cache = createPostcardCache({ render: async id => { calls.push(id); return output(); }, maxEntries: 2 });
  const a = await cache.get('a', catalog); await cache.get('b', catalog); await cache.get('a', catalog); await cache.get('c', catalog);
  assert.equal(await cache.get('a', catalog), a); await cache.get('b', catalog);
  assert.deepEqual(calls, ['a', 'b', 'c', 'b']); assert.equal(cache.snapshot().completedEntries, 2);
});
test('Blob byte budget evicts as many old outputs as needed', async () => {
  const cache = createPostcardCache({ render: async id => output(id === 'c' ? 7 : 4), maxBytes: 10 });
  await cache.get('a', catalog); await cache.get('b', catalog); await cache.get('c', catalog);
  assert.equal(cache.snapshot().retainedBytes, 7); assert.equal(cache.snapshot().completedEntries, 1); assert.equal(cache.snapshot().evictions, 2);
});
test('oversize output is delivered but never retained', async () => {
  const cache = createPostcardCache({ render: async () => output(11), maxBytes: 10 });
  assert.equal((await cache.get('a', catalog)).blob.size, 11); await cache.get('a', catalog);
  assert.equal(cache.snapshot().retainedBytes, 0); assert.equal(cache.snapshot().skippedOversize, 2);
});
test('in-flight work has a hard bound while same-card joins still succeed', async () => {
  const job = deferred(); const cache = createPostcardCache({ render: () => job.promise, maxPending: 1 });
  const first = cache.get('a', catalog); assert.equal(cache.get('a', catalog), first);
  await assert.rejects(cache.get('b', catalog), PostcardBusyError);
  job.resolve(output()); await first; await cache.get('b', catalog);
  assert.equal(cache.snapshot().inFlight, 0); assert.equal(cache.snapshot().rejectedBusy, 1);
});
test('clear prevents late completion from repopulating the cache or reusing a stale job', async () => {
  const jobs = [deferred(), deferred()]; let call = 0;
  const cache = createPostcardCache({ render: () => jobs[call++].promise });
  const old = cache.get('a', catalog); cache.clear(); const fresh = cache.get('a', catalog);
  assert.notEqual(old, fresh); assert.equal(cache.snapshot().inFlight, 2);
  jobs[1].resolve(output(5)); const newest = await fresh;
  jobs[0].resolve(output(4)); await old;
  assert.equal(await cache.get('a', catalog), newest); assert.equal(cache.snapshot().retainedBytes, 5);
  assert.equal(cache.snapshot().discardedStale, 1); assert.equal(cache.snapshot().inFlight, 0);
});
test('clear releases successful Blob references and repeated clearing cannot bypass in-flight limit', async () => {
  const job = deferred(); const cache = createPostcardCache({ render: () => job.promise, maxPending: 1 });
  const first = cache.get('a', catalog); cache.clear(); cache.clear();
  await assert.rejects(cache.get('b', catalog), PostcardBusyError);
  job.resolve(output()); await first;
  await cache.get('b', catalog); assert.equal(cache.snapshot().retainedBytes, 4);
  cache.clear(); assert.equal(cache.snapshot().retainedBytes, 0); assert.equal(cache.snapshot().completedEntries, 0);
});
test('invalid keys and options fail before rendering', async () => {
  let calls = 0; const render = async () => { calls++; return output(); };
  for (const settings of [{ maxEntries: 0 }, { maxBytes: Infinity }, { maxPending: -1 }, { renderVersion: '' }]) assert.throws(() => createPostcardCache({ render, ...settings }), TypeError);
  const cache = createPostcardCache({ render });
  for (const [id, input, title] of [['missing', catalog, 'Garden'], ['toString', catalog, 'Garden'], ['a', catalog, null], ['a', { a: { art: null, name: 'x' } }, 'Garden']]) await assert.rejects(cache.get(id, input, title));
  assert.equal(calls, 0);
});
test('optional timing observer cannot change success or leak identifying input', async () => {
  let now = 0; const events = [];
  const cache = createPostcardCache({ render: async () => { now = 12; return output(); }, now: () => now, onEvent: event => { events.push(event); throw new Error('observer failed'); } });
  await cache.get('a', catalog); await cache.get('a', catalog);
  assert.equal(events.find(e => e.type === 'render-complete').durationMs, 12);
  assert(!JSON.stringify(events).includes('Paper Bird')); assert.equal(cache.snapshot().hits, 1);
});
test('campaign wrapper delegates the actual font-bound renderer and repeats with no new image or canvas work', async () => {
  const previousFontFace = Object.getOwnPropertyDescriptor(globalThis, 'FontFace');
  Object.defineProperty(globalThis, 'FontFace', {configurable:true, value:class {constructor(family,source,descriptors){this.family=family;Object.assign(this,descriptors);}async load(){this.status='loaded';return this;}}});
  const previousImage = Object.getOwnPropertyDescriptor(globalThis, 'Image'), previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let images = 0, canvases = 0; const operations = [];
  class FakeImage { constructor() { images++; } async decode() { operations.push(['decode', this.src]); } }
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: FakeImage });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { fonts:new Set(), createElement(tag) {
    assert.equal(tag, 'canvas'); canvases++;
    const log = [], context = new Proxy({}, {
      set(target, property, value) { log.push(['set', property, value]); target[property] = value; return true; },
      get(target, property) { if (property in target) return target[property]; return (...args) => { log.push([property, ...args.map(value => value instanceof FakeImage ? value.src : value)]); }; },
    });
    return { getContext: type => { assert.equal(type, '2d'); return context; }, toBlob(callback, type) { assert.equal(type, 'image/png'); operations.push(log); callback(new Blob([JSON.stringify(log)], { type })); } };
  } } });
  try {
    clearCampaignPostcards();
    const { createCollectionPostcard } = await import('../../src/matching/postcard.js');
    const original = await createCollectionPostcard('a', catalog, 'Garden');
    const first = await createCampaignPostcard('a', catalog, 'Garden');
    const repeated = await createCampaignPostcard('a', catalog, 'Garden');
    assert.deepEqual(operations[1], operations[3]);
    assert.equal(await original.blob.text(), await first.blob.text());
    assert.equal(original.filename, first.filename); assert.equal(first.blob, repeated.blob);
    assert.equal(images, 2); assert.equal(canvases, 2);
    // This compares drawing commands under mocks, not actual raster pixels.
  } finally {
    clearCampaignPostcards();
    for (const [name, descriptor] of [['Image', previousImage], ['document', previousDocument], ['FontFace', previousFontFace]]) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  }
});
test('reviewed typography renderer and unchanged download/share module remain pinned', async () => {
  const hashes = { 'src/matching/postcard.js': 'cd0f98b4ac19164059359ab1b410a0ba3896c80148950c28455396caa2302217', 'src/exportPostcard.js': 'ad429cc31a7025d0f9b3d19f4faa53276411faf8ba9aebab780a3bf78d06e442' };
  for (const [path, expected] of Object.entries(hashes)) assert.equal(createHash('sha256').update(await readFile(new URL(`../../${path}`, import.meta.url))).digest('hex'), expected, path);
});
