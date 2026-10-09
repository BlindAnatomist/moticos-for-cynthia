import assert from 'node:assert/strict';
import {upgradeCareer} from '../../src/career/engine.js';
import {read as readCareer} from '../../tests/campaign-browser/helpers.mjs';
import {waitSaved} from '../../stage-b-evidence/browser/reload.mjs';

// The first load intentionally changes legacy save bytes. Stable-reload checks
// belong only after this exact, reducer-derived migration has been persisted.
export async function reloadForMigration(page, legacyState, {upgrade=upgradeCareer, wait=waitSaved, read=readCareer}={}) {
  const expected=upgrade(legacyState);
  await page.reload();
  await wait(page,expected);
  const actual=await read(page);
  assert.deepEqual(actual,expected,'First migrated load must persist the exact current reducer result');
  return actual;
}
