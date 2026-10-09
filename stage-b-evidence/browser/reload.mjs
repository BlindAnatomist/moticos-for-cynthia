import {expect} from '@playwright/test';
import * as h from '../../tests/campaign-browser/helpers.mjs';
export async function waitSaved(page,expected){await expect(page.locator('.career-shell')).toHaveAttribute('data-save-status','saved');await expect.poll(async()=>{const s=await h.read(page);return[s.careerId,s.revision,s.schemaVersion];}).toEqual([expected.careerId,expected.revision,expected.schemaVersion]);await expect(page.locator('.career-cell').first()).toBeEnabled();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
export async function reloadStable(page){const before=await h.read(page),bytes=await h.bytes(page);await page.reload();await waitSaved(page,before);expect(await h.bytes(page)).toBe(bytes);return before;}
