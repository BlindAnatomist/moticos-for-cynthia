import { describe, expect, it } from 'vitest';
import { getMatchingEngine } from '../src/matching/registry.js';
import { openEnvelopeSession, commitEnvelopeSession, observeEnvelopeStorage } from '../src/matching/session.js';
const garden = getMatchingEngine('matching-garden'), moon = getMatchingEngine('moonlit-passage');
function fixture() {
  const bytes = new Map(); let readsFail = false, writesFail = false;
  const storage = { getItem(key) { if (readsFail) throw Error('Read blocked'); return bytes.get(key) ?? null; }, setItem(key, raw) { if (writesFail) throw Error('Quota'); bytes.set(key, raw); } };
  return { cache: new Map(), bytes, storage, failReads(value) { readsFail = value; }, failWrites(value) { writesFail = value; } };
}
function play(engine, session, storage, familyId = engine.FAMILIES[0].id) {
  const next = engine.act(session.save, { type: 'supply', familyId });
  expect(commitEnvelopeSession(engine, session, next, storage)).toBe(true); return session;
}

describe('independent envelope sessions and protected temporary play', () => {
  it('visits both envelopes without writing or migrating any storage', () => {
    const f = fixture(), g = openEnvelopeSession(garden, f.cache, f.storage), m = openEnvelopeSession(moon, f.cache, f.storage);
    expect(g.save).toEqual(garden.newSave()); expect(m.save).toEqual(moon.newSave()); expect(f.bytes.size).toBe(0);
    expect(f.cache.size).toBe(2);
  });
  it('retains each partly played board and its Undo stack through repeated switches', () => {
    const f = fixture();
    const g = play(garden, openEnvelopeSession(garden, f.cache, f.storage), f.storage);
    const gBefore = structuredClone(g.save), gBytes = f.bytes.get(garden.STORAGE_KEY);
    const m = play(moon, openEnvelopeSession(moon, f.cache, f.storage), f.storage);
    const mBefore = structuredClone(m.save), mBytes = f.bytes.get(moon.STORAGE_KEY);
    for (let i = 0; i < 30; i++) {
      expect(openEnvelopeSession(garden, f.cache, f.storage).save).toEqual(gBefore);
      expect(openEnvelopeSession(moon, f.cache, f.storage).save).toEqual(mBefore);
    }
    expect(f.bytes.get(garden.STORAGE_KEY)).toBe(gBytes); expect(f.bytes.get(moon.STORAGE_KEY)).toBe(mBytes);
    commitEnvelopeSession(garden, g, garden.act(g.save, { type: 'undo' }), f.storage);
    expect(g.save).toEqual(garden.newSave()); expect(m.save).toEqual(mBefore);
  });
  it.each(['broken {', '{"version":99}'])('preserves unread bytes and temporary progress through switches: %s', raw => {
    const f = fixture(); f.bytes.set(garden.STORAGE_KEY, raw);
    const g = play(garden, openEnvelopeSession(garden, f.cache, f.storage), f.storage);
    const expected = structuredClone(g.save);
    play(moon, openEnvelopeSession(moon, f.cache, f.storage), f.storage);
    const resumed = openEnvelopeSession(garden, f.cache, f.storage);
    expect(resumed).toBe(g); expect(resumed.save).toEqual(expected); expect(resumed.sourceRaw).toBe(raw);
    expect(resumed.invalid).toBe(true); expect(f.bytes.get(garden.STORAGE_KEY)).toBe(raw);
    expect(moon.readSave(f.bytes.get(moon.STORAGE_KEY)).status).toBe('loaded');
  });
  it('keeps temporary progress after initial read denial even when storage later recovers', () => {
    const f = fixture(), original = garden.serializeSave(garden.newSave()); f.bytes.set(garden.STORAGE_KEY, original); f.failReads(true);
    const g = openEnvelopeSession(garden, f.cache, f.storage); f.failReads(false); play(garden, g, f.storage);
    const expected = structuredClone(g.save); openEnvelopeSession(moon, f.cache, f.storage);
    const resumed = openEnvelopeSession(garden, f.cache, f.storage);
    expect(resumed.save).toEqual(expected); expect(resumed.blocked).toBe(true); expect(resumed.conflict).toBe(true);
    play(garden, resumed, f.storage); expect(f.bytes.get(garden.STORAGE_KEY)).toBe(original);
  });
  it('retains a quota-failed board and does not retry writes after navigating away and back', () => {
    const f = fixture(); const g = play(garden, openEnvelopeSession(garden, f.cache, f.storage), f.storage); const original = f.bytes.get(garden.STORAGE_KEY);
    f.failWrites(true); play(garden, g, f.storage); f.failWrites(false); const expected = structuredClone(g.save);
    play(moon, openEnvelopeSession(moon, f.cache, f.storage), f.storage);
    expect(openEnvelopeSession(garden, f.cache, f.storage).save).toEqual(expected); play(garden, g, f.storage);
    expect(g.unavailable).toBe(true); expect(f.bytes.get(garden.STORAGE_KEY)).toBe(original);
  });
  it('rechecks inactive destination bytes and protects a newer tab before any resumed write', () => {
    const f = fixture(), g = play(garden, openEnvelopeSession(garden, f.cache, f.storage), f.storage);
    const expected = structuredClone(g.save); openEnvelopeSession(moon, f.cache, f.storage);
    const external = garden.serializeSave(garden.act(g.save, { type: 'supply', familyId: 'fern' })); f.bytes.set(garden.STORAGE_KEY, external);
    const resumed = openEnvelopeSession(garden, f.cache, f.storage); expect(resumed.save).toEqual(expected); expect(resumed.conflict).toBe(true);
    play(garden, resumed, f.storage); expect(f.bytes.get(garden.STORAGE_KEY)).toBe(external);
  });
  it('detects a stale write even without storage events or a remount', () => {
    const f = fixture(), g = openEnvelopeSession(garden, f.cache, f.storage);
    const other = garden.serializeSave(garden.act(garden.newSave(), { type: 'merge', from: 6, to: 7 })); f.bytes.set(garden.STORAGE_KEY, other);
    play(garden, g, f.storage); expect(g.conflict).toBe(true); expect(f.bytes.get(garden.STORAGE_KEY)).toBe(other);
  });
  it('handles localStorage.clear events and ignores unrelated keys', () => {
    const f = fixture(), g = play(garden, openEnvelopeSession(garden, f.cache, f.storage), f.storage);
    expect(observeEnvelopeStorage(garden, g, { key: moon.STORAGE_KEY, newValue: 'other' })).toBe(false);
    expect(observeEnvelopeStorage(garden, g, { key: null, newValue: null })).toBe(true); expect(g.blocked).toBe(true);
  });
  it('reset and discoveries stay within the selected envelope', () => {
    const f = fixture(), g = openEnvelopeSession(garden, f.cache, f.storage), m = openEnvelopeSession(moon, f.cache, f.storage);
    commitEnvelopeSession(garden, g, garden.act(g.save, { type: 'merge', from: 6, to: 7 }), f.storage);
    play(moon, m, f.storage); const moonBefore = moon.serializeSave(m.save);
    commitEnvelopeSession(garden, g, garden.act(g.save, { type: 'reset' }), f.storage);
    expect(g.save.discoveries).toContain('b2'); expect(g.save.history).toHaveLength(0);
    expect(moon.serializeSave(m.save)).toBe(moonBefore); expect(m.save.discoveries).not.toContain('b2');
  });
});
