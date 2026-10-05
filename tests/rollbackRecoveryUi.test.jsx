import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecoveryContents } from '../src/matching/recovery/RecoveryPage.jsx';
import { captureRecovery } from '../src/matching/recovery/snapshot.js';
import { RECOVERY_ENVELOPES, PRESERVED_ENVELOPES, getRecoveryEngine } from '../src/matching/recovery/recoveryRegistry.js';
import { memoryStorage, denseSave } from './capacity/fixtures.js';
describe('human-readable recovery page', () => {
 it('names all four newer envelopes/eight families and history/download limitations', () => {
  const storage = memoryStorage(); for (const e of RECOVERY_ENVELOPES) { const engine = getRecoveryEngine(e.id); storage.bytes.set(e.storageKey, engine.serializeStoredSave(denseSave(engine))); }
  const html = renderToStaticMarkup(<RecoveryContents snapshot={captureRecovery(storage)} />);
  for (const e of PRESERVED_ENVELOPES) { expect(html).toContain(e.title); for (const family of e.catalog.FAMILIES) expect(html).toContain(family.name); }
  expect(html).toContain('100 Undo snapshots retained'); expect(html).toContain('Read current board and all 100 Undo snapshots'); expect(html).toContain('postcard PNG exports are unavailable');
  expect(html).toContain('no import button'); expect(html).toContain('Do not clear this website'); expect(html).toContain('Row 1, column'); expect(html).not.toContain('<img'); expect(storage.writes).toBe(0);
 });
 it('does not credit starter discoveries to missing saves and explains unreadable data', () => {
  const storage = memoryStorage(); storage.bytes.set(PRESERVED_ENVELOPES[0].storageKey, '{"version":9}'); const html = renderToStaticMarkup(<RecoveryContents snapshot={captureRecovery(storage)} />);
  expect(html).toContain('Some saves are unreadable'); expect(html).toContain('No starter discoveries are credited'); expect(html).toContain('No save has been replaced'); expect(html).not.toContain('2 / 10 pictures discovered');
 });
});
