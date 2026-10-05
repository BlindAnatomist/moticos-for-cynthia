import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { EXPANSION_ENVELOPES } from '../src/matching/expansion/registry.js';
import { EXPANSION_BOUNDS, EXPANSION_LABELS } from '../src/matching/expansion/bounds.js';
const receipt=JSON.parse(fs.readFileSync(new URL('../evidence/expansion-assets/asset-receipt.json',import.meta.url)));
describe('exact reviewed expansion assets',()=>{
 it('includes only forty unique accepted canonical WebP hashes',()=>{
  const ids=EXPANSION_ENVELOPES.flatMap(e=>e.catalog.PIECES.map(p=>p.id));
  expect(new Set(receipt.records.map(r=>r.id))).toEqual(new Set(ids));
  expect(new Set(receipt.records.map(r=>r.canonicalWebpSha256)).size).toBe(40);
  for(const r of receipt.records){const data=fs.readFileSync(new URL('../'+r.file,import.meta.url));expect(data.length).toBe(r.bytes);expect(createHash('sha256').update(data).digest('hex')).toBe(r.canonicalWebpSha256);expect(data.subarray(0,4).toString()).toBe('RIFF');expect(data.subarray(8,12).toString()).toBe('WEBP');}
 });
 it('contains exactly one short noncolliding board label per picture in each envelope',()=>{
  expect(Object.keys(EXPANSION_BOUNDS).length).toBe(40);expect(Object.keys(EXPANSION_LABELS).length).toBe(40);
  for(const envelope of EXPANSION_ENVELOPES){const labels=envelope.catalog.PIECES.map(p=>EXPANSION_LABELS[p.id]);expect(new Set(labels).size).toBe(10);for(const label of labels)expect(label.length).toBeLessThanOrEqual(6);}
 });
 it('all meaningful artwork stays within guarded framing and clears compact long-edge size',()=>{
  for(const b of Object.values(EXPANSION_BOUNDS)){
   const [x,y,w,h]=b.crop,[ix,iy,iw,ih]=b.ink;expect(ix).toBeGreaterThanOrEqual(x);expect(iy).toBeGreaterThanOrEqual(y);expect(ix+iw).toBeLessThanOrEqual(x+w);expect(iy+ih).toBeLessThanOrEqual(y+h);
   const scale=Math.min(45.515625/w,34.515625/h);expect(Math.max(iw,ih)*scale).toBeGreaterThanOrEqual(33);
  }
 });
});
