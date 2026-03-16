import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../config/constants';
import {
  getActionBarPosition,
  getDynamicSlotRects,
  getFarmhouseWindowRect,
  getOverlayBounds,
} from './barnLayout';

const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean => {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

const capacities = [5, 6, 7, 8] as const;

describe('barnLayout', () => {
  it('returns the expected slot count for capacities 5-8', () => {
    for (const capacity of capacities) {
      expect(getDynamicSlotRects(capacity)).toHaveLength(capacity);
    }
  });

  it('keeps slot rects in-bounds and non-overlapping for capacities 5-8', () => {
    for (const capacity of capacities) {
      const slotRects = getDynamicSlotRects(capacity);

      for (const slotRect of slotRects) {
        expect(slotRect.x).toBeGreaterThanOrEqual(0);
        expect(slotRect.y).toBeGreaterThanOrEqual(0);
        expect(slotRect.x + slotRect.w).toBeLessThanOrEqual(LAYOUT.CANVAS.WIDTH);
        expect(slotRect.y + slotRect.h).toBeLessThanOrEqual(LAYOUT.CANVAS.HEIGHT);
      }

      for (let i = 0; i < slotRects.length; i += 1) {
        for (let j = i + 1; j < slotRects.length; j += 1) {
          expect(overlaps(slotRects[i], slotRects[j])).toBe(false);
        }
      }
    }
  });

  it('enforces minimum 44x44 tap targets for slots and action buttons', () => {
    for (const capacity of capacities) {
      const slotRects = getDynamicSlotRects(capacity);
      for (const slotRect of slotRects) {
        expect(slotRect.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect(slotRect.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
      }

      const single = getActionBarPosition(capacity, false);
      expect(single.primary.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
      expect(single.primary.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);

      const dual = getActionBarPosition(capacity, true);
      expect(dual.primary.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
      expect(dual.primary.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
      expect(dual.secondary?.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
      expect(dual.secondary?.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
    }
  });

  it('keeps overlay and farmhouse window inside the canvas', () => {
    for (const capacity of capacities) {
      const overlay = getOverlayBounds(capacity);
      const windowRect = getFarmhouseWindowRect(capacity);

      expect(overlay.x + overlay.w).toBeLessThanOrEqual(LAYOUT.CANVAS.WIDTH);
      expect(overlay.y + overlay.h).toBeLessThanOrEqual(LAYOUT.CANVAS.HEIGHT);

      expect(windowRect.x).toBeGreaterThanOrEqual(0);
      expect(windowRect.y).toBeGreaterThanOrEqual(0);
      expect(windowRect.x + windowRect.w).toBeLessThanOrEqual(LAYOUT.CANVAS.WIDTH);
      expect(windowRect.y + windowRect.h).toBeLessThanOrEqual(LAYOUT.CANVAS.HEIGHT);
    }
  });
});
