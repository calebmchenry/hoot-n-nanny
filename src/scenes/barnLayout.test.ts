import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../config/constants';
import { getSlotRects } from './barnLayout';

const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean => {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

describe('barnLayout', () => {
  it('returns exactly 5 slot rects', () => {
    const slotRects = getSlotRects();
    expect(slotRects).toHaveLength(5);
  });

  it('keeps every slot inside the canvas bounds', () => {
    const slotRects = getSlotRects();

    for (const slotRect of slotRects) {
      expect(slotRect.x).toBeGreaterThanOrEqual(0);
      expect(slotRect.y).toBeGreaterThanOrEqual(0);
      expect(slotRect.x + slotRect.w).toBeLessThanOrEqual(LAYOUT.CANVAS.WIDTH);
      expect(slotRect.y + slotRect.h).toBeLessThanOrEqual(LAYOUT.CANVAS.HEIGHT);
    }
  });

  it('enforces a minimum 44x44 tap target size for each slot', () => {
    const slotRects = getSlotRects();

    for (const slotRect of slotRects) {
      expect(slotRect.w).toBeGreaterThanOrEqual(44);
      expect(slotRect.h).toBeGreaterThanOrEqual(44);
    }
  });

  it("doesn't allow slot rects to overlap", () => {
    const slotRects = getSlotRects();

    for (let i = 0; i < slotRects.length; i += 1) {
      for (let j = i + 1; j < slotRects.length; j += 1) {
        expect(overlaps(slotRects[i], slotRects[j])).toBe(false);
      }
    }
  });
});
