import { describe, expect, it } from 'vitest';
import { BOARD_ART_BOUNDS, COMPACT_BOARD_LABELS } from '../src/matching/boardArt.js';
import { ENVELOPES } from '../src/matching/registry.js';

const pieces = ENVELOPES.flatMap(envelope => envelope.catalog.PIECES);
describe('board-only artwork display metadata', () => {
  it('covers all thirty original artworks without changing their identity', () => {
    expect(Object.keys(BOARD_ART_BOUNDS).sort()).toEqual(pieces.map(piece => piece.id).sort());
    expect(pieces).toHaveLength(30);
  });
  it('contains painted ink within each source-preserving crop', () => {
    for (const piece of pieces) {
      const { source: [width, height], crop: [x, y, w, h], ink: [ix, iy, iw, ih] } = BOARD_ART_BOUNDS[piece.id];
      expect([width, height, w, h, iw, ih].every(value => value > 0)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(width); expect(y + h).toBeLessThanOrEqual(height);
      expect(ix).toBeGreaterThanOrEqual(x); expect(iy).toBeGreaterThanOrEqual(y);
      expect(ix + iw).toBeLessThanOrEqual(x + w); expect(iy + ih).toBeLessThanOrEqual(y + h);
    }
  });
  it('changes only six concise compact labels while retaining full catalog names', () => {
    expect(COMPACT_BOARD_LABELS).toEqual({ b2: 'Wing', b3: 'Finder', f3: 'Garden', f5: 'House', k2: 'Frond', k5: 'Portal' });
    for (const [id, label] of Object.entries(COMPACT_BOARD_LABELS)) {
      expect(label.length).toBeLessThanOrEqual(6);
      expect(pieces.find(piece => piece.id === id).name.length).toBeGreaterThan(label.length);
    }
  });
  it('keeps the geometric crop transform undistorted at the smallest recorded art slot', () => {
    for (const { source: [sourceWidth, sourceHeight], crop: [x, y, width, height], ink } of Object.values(BOARD_ART_BOUNDS)) {
      const scale = Math.min((47.515625 - 2) / width, (36.515625 - 2) / height);
      const frameWidth = width * scale, frameHeight = height * scale;
      const imageWidth = frameWidth * sourceWidth / width, imageHeight = frameHeight * sourceHeight / height;
      expect(imageWidth / sourceWidth).toBeCloseTo(imageHeight / sourceHeight, 10);
      expect(frameWidth).toBeLessThanOrEqual(47.515625);
      expect(frameHeight).toBeLessThanOrEqual(36.515625);
      expect((ink[0] - x) * scale).toBeGreaterThanOrEqual(0);
      expect((ink[1] - y) * scale).toBeGreaterThanOrEqual(0);
    }
  });
});
