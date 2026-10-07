import { describe, expect, it } from 'vitest';
import { ENVELOPES, getMatchingEngine } from '../src/matching/batch/registry.js';
import { createMatchingEngine as createLegacyEngine } from './fixtures/legacy-matching-engine-v1.js';
import { createMatchingCatalog } from '../src/matching/catalogFactory.js';
import { createMatchingEngine } from '../src/matching/engine.js';
import { encodeStoredSave } from '../src/matching/storageCodec.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from '../src/matching/session.js';
import { readEnvelopeProgress } from '../src/matching/progress.js';
import { makeScaleEngine, denseSave, random, actions, memoryStorage } from './capacity/fixtures.js';
const garden = getMatchingEngine('matching-garden');
const clone = value => structuredClone(value);
function rewriteChecksum(value) {
  let hash = 0x811c9dc5;
  for (const code of JSON.stringify(value.data).split('').map(c => c.charCodeAt(0))) hash = Math.imul(hash ^ code, 0x01000193);
  value.checksum = (hash >>> 0).toString(16).padStart(8, '0');
  return JSON.stringify(value);
}

describe('lossless storage transport and legacy compatibility', () => {
  it.each(ENVELOPES.map(e => [e.id]))('%s retains all 100 snapshots and every successive Undo exactly', id => {
    const engine = getMatchingEngine(id), original = denseSave(engine, 43);
    let expected = original, loaded = engine.readSave(engine.serializeStoredSave(original)).save;
    expect(loaded).toEqual(original); expect(loaded.history).toHaveLength(100);
    expect(engine.serializeStoredSave(loaded)).toBe(engine.serializeStoredSave(original));
    for (let i = 0; i < 100; i++) {
      loaded = engine.act(loaded, { type: 'undo' }); expected = engine.act(expected, { type: 'undo' });
      expect(loaded).toEqual(expected);
      loaded = engine.readSave(engine.serializeStoredSave(loaded)).save;
      expect(loaded).toEqual(expected);
    }
    expect(engine.act(loaded, { type: 'undo' })).toBeNull();
  }, 30_000);
  it('preserves strict v1 fixture data, and legacy JSON is still the explicit export format', async () => {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile('tests/fixtures/matching-garden-v1.json', 'utf8');
    const save = garden.readSave(raw).save;
    expect(save).not.toBeNull(); expect(garden.readSave(garden.serializeStoredSave(save)).save).toEqual(save);
    expect(JSON.parse(garden.serializeSave(save))).toEqual(save);
  });
  it.each([1, 41, 137, 9421, 0xdeadbeef])('round-trips legal mixed actions, discoveries and sound for seed %i', seed => {
    const pick = random(seed); let save = garden.newSave();
    const seen = new Set();
    for (let step = 0; step < 220; step++) {
      let choices = actions(garden, save);
      // Prefer operation categories evenly rather than hundreds of possible moves.
      const types = [...new Set(choices.map(a => a.type))];
      const type = types[Math.floor(pick() * types.length)]; choices = choices.filter(a => a.type === type);
      let action = choices[Math.floor(pick() * choices.length)];
      if (step % 17 === 1 && save.history.length) action = { type: 'undo' };
      if (step % 23 === 2) action = { type: 'sound', enabled: !save.sound };
      if (step % 101 === 99) action = { type: 'reset' };
      const next = garden.act(save, action); expect(next).not.toBeNull(); seen.add(action.type);
      const before = JSON.stringify(next); const stored = garden.serializeStoredSave(next); const loaded = garden.readSave(stored);
      expect(loaded.status).toBe('loaded'); expect(JSON.stringify(loaded.save)).toBe(before); expect(JSON.stringify(next)).toBe(before);
      expect(garden.serializeStoredSave(loaded.save)).toBe(stored); save = loaded.save;
    }
    for (const type of ['move', 'merge', 'cut', 'supply', 'undo', 'sound', 'reset']) expect(seen.has(type)).toBe(true);
  }, 30_000);
  it('marks the wrapper as future data to the exact old version contract', () => {
    const saved = JSON.parse(garden.serializeStoredSave(denseSave(garden)));
    expect(saved.version).toBeGreaterThan(garden.PACK_VERSION);
    expect(saved.version).toBe(2);
    const legacy = createLegacyEngine({ catalog: ENVELOPES[0].catalog, storageKey: garden.STORAGE_KEY });
    expect(legacy.readSave(JSON.stringify(saved)).status).toBe('unsupported');
  });
});

describe('bounded corruption rejection', () => {
  it.each([[175, 'loaded'], [300, 'invalid']])('applies the expanded v1 byte ceiling to a valid compact catalog with %i-character ID padding', (padding, status) => {
    const families = ['a', 'b'].map(letter => ({ id: `family-${letter}`, name: letter, shortName: letter, color: '#123456',
      pieceIds: [1, 2, 3, 4, 5].map(tier => `${letter}-${'x'.repeat(padding)}-${tier}`) }));
    const rows = families.flatMap(family => family.pieceIds.map((id, index) => [id, family.id, index + 1, id, id, id, id]));
    const catalog = createMatchingCatalog({ id: 'expanded-bound', families, rows });
    const engine = createMatchingEngine({ catalog, storageKey: 'moticos.matching.expanded-bound.v1' });
    const save = denseSave(engine), expanded = JSON.stringify(save);
    // Direct codec output models incoming data; the public writer already enforces the ceiling.
    const compact = encodeStoredSave(save, families.map(family => family.id));
    expect(engine.validSave(save)).toBe(true);
    expect(new TextEncoder().encode(compact).length).toBeLessThan(engine.MAX_SAVE_BYTES);
    expect(engine.readSave(compact)).toEqual({ status, save: status === 'loaded' ? save : null, sourceRaw: compact });
    expect(engine.readSave(expanded).status).toBe(status);
    if (status === 'loaded') {
      expect(new TextEncoder().encode(expanded).length).toBeLessThanOrEqual(engine.MAX_SAVE_BYTES);
      expect(engine.readSave(engine.serializeStoredSave(save)).save).toEqual(save);
    } else {
      expect(new TextEncoder().encode(expanded).length).toBeGreaterThan(engine.MAX_SAVE_BYTES);
      expect(() => engine.serializeStoredSave(save)).toThrow(RangeError);
      const storage = memoryStorage(); storage.bytes.set(engine.STORAGE_KEY, compact);
      const session = openEnvelopeSession(engine, new Map(), storage);
      commitEnvelopeSession(engine, session, engine.act(session.save, { type: 'merge', from: 6, to: 7 }), storage);
      expect(session.blocked).toBe(true); expect(storage.writes).toBe(0);
      expect(storage.getItem(engine.STORAGE_KEY)).toBe(compact);
    }
  });
  const mutations = [
    x => { x.data[3][0][0][0][0] = 25; },
    x => { x.data[3][0][0][1][0] = x.data[3][0][0][0][0]; },
    x => { x.data[3][0][0].push([0, null]); },
    x => { x.data[3].push(...clone(x.data[3])); },
    x => { x.data[2][0].push(null); },
    x => { x.data[2][1][0] = 999; },
    x => { x.data[2][0][0] = ['__proto__', 1]; },
    x => { x.data[3][0][2] += 2; },
    x => { x.data[4] = ['b5', 'f5']; },
    x => { x.data[1].reverse(); },
    x => { x.extra = 'refuse'; },
    x => { x.data[2][4] = -1; },
  ];
  it.each(mutations.map((fn, i) => [i, fn]))('rejects structurally or semantically corrupt compact data %i even with a recalculated checksum', (_, mutate) => {
    const data = JSON.parse(garden.serializeStoredSave(denseSave(garden))); mutate(data);
    const raw = rewriteChecksum(data), result = garden.readSave(raw);
    expect(result).toEqual({ status: 'invalid', save: null, sourceRaw: raw });
  });
  it('refuses checksum corruption, truncation, huge data and unknown formats without rewriting bytes', () => {
    const data = JSON.parse(garden.serializeStoredSave(denseSave(garden)));
    data.checksum = '00000000';
    for (const raw of [JSON.stringify(data), JSON.stringify(data).slice(0, -1), ' '.repeat(garden.MAX_SAVE_BYTES + 1), '{"version":3}', '{"version":2,"format":"unknown"}']) {
      const storage = memoryStorage(); storage.bytes.set(garden.STORAGE_KEY, raw);
      const session = openEnvelopeSession(garden, new Map(), storage);
      commitEnvelopeSession(garden, session, garden.act(session.save, { type: 'merge', from: 6, to: 7 }), storage);
      expect(session.blocked).toBe(true); expect(storage.getItem(garden.STORAGE_KEY)).toBe(raw); expect(storage.writes).toBe(0);
    }
  });
  it('cannot import another envelope under a different family identity', () => {
    const other = getMatchingEngine('moonlit-passage');
    expect(other.readSave(garden.serializeStoredSave(denseSave(garden))).status).toBe('invalid');
  });
});

describe('nondestructive migration and failures', () => {
  it('opening and browsing do not migrate; first successful action atomically replaces only its own key', () => {
    const storage = memoryStorage(), cache = new Map(), original = denseSave(garden);
    const legacy = ` \n${JSON.stringify(original, null, 1)}\n`; storage.bytes.set(garden.STORAGE_KEY, legacy); storage.bytes.set('unrelated', 'exact');
    const session = openEnvelopeSession(garden, cache, storage);
    expect(storage.writes).toBe(0); expect(storage.getItem(garden.STORAGE_KEY)).toBe(legacy);
    const next = garden.act(session.save, { type: 'undo' }); commitEnvelopeSession(garden, session, next, storage);
    expect(storage.writes).toBe(1); expect(garden.readSave(storage.getItem(garden.STORAGE_KEY)).save).toEqual(next);
    expect(storage.getItem('unrelated')).toBe('exact'); expect(session.sourceRaw).toBe(legacy);
  });
  it.each(['read', 'write'])('preserves full legacy bytes and temporary state if migration %s fails', failure => {
    const storage = memoryStorage(), legacy = garden.serializeSave(denseSave(garden)); storage.bytes.set(garden.STORAGE_KEY, legacy);
    const session = openEnvelopeSession(garden, new Map(), storage), next = garden.act(session.save, { type: 'undo' });
    if (failure === 'read') storage.failRead(true); else storage.failWrite(true);
    commitEnvelopeSession(garden, session, next, storage); storage.failRead(false); storage.failWrite(false);
    expect(session.save).toEqual(next); expect(session.blocked).toBe(true); expect(storage.getItem(garden.STORAGE_KEY)).toBe(legacy);
    const attempts = storage.writes; commitEnvelopeSession(garden, session, garden.act(next, { type: 'undo' }), storage);
    expect(storage.writes).toBe(attempts); expect(storage.getItem(garden.STORAGE_KEY)).toBe(legacy);
  });
  it('has no async save job: rapid action, Undo, sound and reset sequences persist the exact last state', () => {
    const storage = memoryStorage(), session = openEnvelopeSession(garden, new Map(), storage);
    for (const action of [{ type: 'merge', from: 6, to: 7 }, { type: 'undo' }, { type: 'supply', familyId: 'bird' }, { type: 'sound', enabled: false }, { type: 'reset' }]) {
      const next = garden.act(session.save, action); expect(commitEnvelopeSession(garden, session, next, storage)).toBe(true);
      expect(garden.readSave(storage.getItem(garden.STORAGE_KEY)).save).toEqual(next);
    }
  });
  it('detects an external write made during serialization before comparing-and-committing', () => {
    const storage = memoryStorage(), session = openEnvelopeSession(garden, new Map(), storage);
    const external = garden.serializeSave(garden.act(garden.newSave(), { type: 'supply', familyId: 'fern' }));
    const wrapped = { ...garden, serializeStoredSave(next) { storage.bytes.set(garden.STORAGE_KEY, external); return garden.serializeStoredSave(next); } };
    commitEnvelopeSession(wrapped, session, garden.act(session.save, { type: 'merge', from: 6, to: 7 }), storage);
    expect(session.conflict).toBe(true); expect(storage.getItem(garden.STORAGE_KEY)).toBe(external); expect(storage.writes).toBe(0);
  });
  it('retains stale-tab/event protection after compact migration', () => {
    const storage = memoryStorage(), old = openEnvelopeSession(garden, new Map(), storage), current = openEnvelopeSession(garden, new Map(), storage);
    commitEnvelopeSession(garden, current, garden.act(current.save, { type: 'merge', from: 6, to: 7 }), storage);
    const raw = storage.getItem(garden.STORAGE_KEY);
    commitEnvelopeSession(garden, old, garden.act(old.save, { type: 'supply', familyId: 'fern' }), storage);
    expect(old.conflict).toBe(true); expect(storage.getItem(garden.STORAGE_KEY)).toBe(raw);
    expect(observeEnvelopeStorage(garden, current, { key: null, newValue: null })).toBe(true);
  });
  it('fits all thirty dense 100-history saves under a simulated 5 MiB UTF-16 budget without pruning', () => {
    const storage = memoryStorage({ limit: 5 * 1024 * 1024 });
    for (let i = 0; i < 30; i++) {
      const { engine } = makeScaleEngine(i), save = denseSave(engine, i + 99);
      const session = openEnvelopeSession(engine, new Map(), storage);
      commitEnvelopeSession(engine, session, save, storage);
      expect(session.blocked).toBe(false); expect(engine.readSave(storage.getItem(engine.STORAGE_KEY)).save).toEqual(save);
      expect(session.save.history).toHaveLength(100);
    }
    expect(storage.bytes.size).toBe(30);
  }, 30_000);
});

describe('read-only collection cache', () => {
  const envelope = ENVELOPES.find(e => e.id === 'matching-garden');
  it('reuses only byte-identical validated saves, with no sessions or writes', () => {
    const storage = memoryStorage(), cache = new Map(), save = denseSave(garden);
    storage.bytes.set(garden.STORAGE_KEY, garden.serializeStoredSave(save));
    const first = readEnvelopeProgress(envelope, cache, storage), second = readEnvelopeProgress(envelope, cache, storage);
    expect(second.save).toBe(first.save); expect(second.save).toEqual(save); expect(Object.isFrozen(second.save.history[0].board)).toBe(true);
    expect(cache.size).toBe(0); expect(storage.writes).toBe(0);
    storage.bytes.set(garden.STORAGE_KEY, garden.serializeStoredSave(garden.act(save, { type: 'undo' })));
    expect(readEnvelopeProgress(envelope, cache, storage).save).not.toBe(first.save);
  });
  it('checks denial, corruption, future data, deletion and recovery before using cached progress', () => {
    const storage = memoryStorage(), cache = new Map(), good = garden.serializeStoredSave(denseSave(garden));
    storage.bytes.set(garden.STORAGE_KEY, good); expect(readEnvelopeProgress(envelope, cache, storage).opened).toBe(true);
    storage.failRead(true); expect(readEnvelopeProgress(envelope, cache, storage).unavailable).toBe(true); storage.failRead(false);
    for (const raw of ['{bad', '{"version":99}']) { storage.bytes.set(garden.STORAGE_KEY, raw); expect(readEnvelopeProgress(envelope, cache, storage).unread).toBe(true); }
    storage.bytes.delete(garden.STORAGE_KEY); expect(readEnvelopeProgress(envelope, cache, storage).opened).toBe(false);
    storage.bytes.set(garden.STORAGE_KEY, good); expect(readEnvelopeProgress(envelope, cache, storage).opened).toBe(true);
    expect(storage.writes).toBe(0); expect(cache.size).toBe(0);
  });
});
