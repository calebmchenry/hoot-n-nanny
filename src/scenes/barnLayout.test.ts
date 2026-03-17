import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../config/constants';
import {
  getActionBarPosition,
  getDeckStackPosition,
  getDynamicSlotRects,
  getFarmhouseRect,
  getFarmhouseWindowRect,
  getInfoPanelBounds,
  getNoiseMeterPosition,
  getOverlayBounds,
  getResourceBannerPosition,
} from './barnLayout';

type Rect = { x: number; y: number; w: number; h: number };

const overlaps = (a: Rect, b: Rect): boolean => {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

const approxRect = (actual: Rect, expected: Rect, tolerance = 2): void => {
  expect(actual.x).toBeGreaterThanOrEqual(expected.x - tolerance);
  expect(actual.x).toBeLessThanOrEqual(expected.x + tolerance);
  expect(actual.y).toBeGreaterThanOrEqual(expected.y - tolerance);
  expect(actual.y).toBeLessThanOrEqual(expected.y + tolerance);
  expect(actual.w).toBeGreaterThanOrEqual(expected.w - tolerance);
  expect(actual.w).toBeLessThanOrEqual(expected.w + tolerance);
  expect(actual.h).toBeGreaterThanOrEqual(expected.h - tolerance);
  expect(actual.h).toBeLessThanOrEqual(expected.h + tolerance);
};

const capacities = [5, 6, 7, 8] as const;
const viewports = [
  { cw: 375, ch: 667 },
  { cw: 393, ch: 852 },
  { cw: 768, ch: 1024 },
  { cw: 1920, ch: 1080 },
];

const LEGACY_SLOT_RECTS: Record<number, Rect[]> = {
  5: [
    { x: 39, y: 156, w: 96, h: 104 },
    { x: 147, y: 156, w: 96, h: 104 },
    { x: 255, y: 156, w: 96, h: 104 },
    { x: 93, y: 274, w: 96, h: 104 },
    { x: 201, y: 274, w: 96, h: 104 },
  ],
  6: [
    { x: 39, y: 156, w: 96, h: 104 },
    { x: 147, y: 156, w: 96, h: 104 },
    { x: 255, y: 156, w: 96, h: 104 },
    { x: 39, y: 274, w: 96, h: 104 },
    { x: 147, y: 274, w: 96, h: 104 },
    { x: 255, y: 274, w: 96, h: 104 },
  ],
  7: [
    { x: 39, y: 156, w: 96, h: 104 },
    { x: 147, y: 156, w: 96, h: 104 },
    { x: 255, y: 156, w: 96, h: 104 },
    { x: 39, y: 274, w: 96, h: 104 },
    { x: 147, y: 274, w: 96, h: 104 },
    { x: 255, y: 274, w: 96, h: 104 },
    { x: 147, y: 392, w: 96, h: 104 },
  ],
  8: [
    { x: 39, y: 156, w: 96, h: 104 },
    { x: 147, y: 156, w: 96, h: 104 },
    { x: 255, y: 156, w: 96, h: 104 },
    { x: 39, y: 274, w: 96, h: 104 },
    { x: 147, y: 274, w: 96, h: 104 },
    { x: 255, y: 274, w: 96, h: 104 },
    { x: 93, y: 392, w: 96, h: 104 },
    { x: 201, y: 392, w: 96, h: 104 },
  ],
};

describe('barnLayout', () => {
  it('keeps 390x844 outputs within 2px of legacy hardcoded values', () => {
    const cw = 390;
    const ch = 844;

    capacities.forEach((capacity) => {
      const slots = getDynamicSlotRects(capacity, cw, ch);
      const legacySlots = LEGACY_SLOT_RECTS[capacity];
      expect(slots).toHaveLength(legacySlots.length);
      slots.forEach((slot, index) => {
        approxRect(slot, legacySlots[index]);
      });

      approxRect(getResourceBannerPosition(capacity, cw, ch), { x: 16, y: 16, w: 358, h: 64 });
      approxRect(getNoiseMeterPosition(capacity, cw, ch), { x: 16, y: 86, w: 170, h: 28 });
      approxRect(getDeckStackPosition(capacity, cw, ch), { x: 306, y: 106, w: 64, h: 82 });
      approxRect(getFarmhouseRect(capacity, cw, ch), { x: 24, y: 560, w: 142, h: 116 });
      approxRect(getFarmhouseWindowRect(capacity, cw, ch), { x: 78, y: 588, w: 34, h: 24 });
      approxRect(getOverlayBounds(capacity, cw, ch), { x: 20, y: 120, w: 350, h: 580 });

      const actionSingle = getActionBarPosition(capacity, false, cw, ch);
      approxRect(actionSingle.primary, { x: 20, y: 758, w: 350, h: 56 });

      const actionDual = getActionBarPosition(capacity, true, cw, ch);
      approxRect(actionDual.primary, { x: 20, y: 758, w: 168, h: 56 });
      expect(actionDual.secondary).not.toBeNull();
      approxRect(actionDual.secondary as Rect, { x: 202, y: 758, w: 168, h: 56 });
    });

    approxRect(getInfoPanelBounds(cw, ch), { x: 12, y: 556, w: 366, h: 180 });
  });

  it('capacity 8 at 375x667 keeps slots in bounds and clear of farmhouse/action bar', () => {
    const cw = 375;
    const ch = 667;
    const slots = getDynamicSlotRects(8, cw, ch);
    const farmhouse = getFarmhouseRect(8, cw, ch);
    const action = getActionBarPosition(8, false, cw, ch).primary;

    slots.forEach((slot) => {
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.w).toBeLessThanOrEqual(cw);
      expect(slot.y + slot.h).toBeLessThanOrEqual(ch);
      expect(overlaps(slot, farmhouse)).toBe(false);
      expect(overlaps(slot, action)).toBe(false);
    });
  });

  it('capacity 8 at 1920x1080 keeps slots centered and scaled up', () => {
    const cw = 1920;
    const ch = 1080;
    const slots = getDynamicSlotRects(8, cw, ch);

    const first = slots[0];
    const last = slots[2];
    const midX = (first.x + last.x + last.w) / 2;

    expect(first.w).toBeGreaterThanOrEqual(112);
    expect(first.h).toBeGreaterThanOrEqual(122);
    expect(Math.abs(midX - cw / 2)).toBeLessThanOrEqual(cw * 0.2);
  });

  it('anchors action bar to bottom on small phone viewports', () => {
    const action = getActionBarPosition(5, false, 375, 667).primary;
    expect(action.y + action.h).toBeLessThan(667);
    expect(action.y).toBe(667 - 86);
  });

  it('keeps info panel above action bar across viewport matrix', () => {
    const viewportCases = [
      { cw: 375, ch: 667 },
      { cw: 393, ch: 852 },
      { cw: 768, ch: 1024 },
      { cw: 1920, ch: 1080 },
    ];

    viewportCases.forEach(({ cw, ch }) => {
      const panel = getInfoPanelBounds(cw, ch);
      const action = getActionBarPosition(8, false, cw, ch).primary;
      expect(panel.y + panel.h).toBeLessThanOrEqual(action.y);
    });
  });

  it('enforces >=44x44 interactive targets for slots and action buttons', () => {
    viewports.forEach(({ cw, ch }) => {
      capacities.forEach((capacity) => {
        const slots = getDynamicSlotRects(capacity, cw, ch);
        slots.forEach((slot) => {
          expect(slot.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
          expect(slot.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        });

        const single = getActionBarPosition(capacity, false, cw, ch);
        expect(single.primary.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect(single.primary.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);

        const dual = getActionBarPosition(capacity, true, cw, ch);
        expect(dual.primary.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect(dual.primary.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect((dual.secondary as Rect).w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect((dual.secondary as Rect).h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
      });
    });
  });

  it('avoids overlap of major regions across capacities and viewports', () => {
    viewports.forEach(({ cw, ch }) => {
      capacities.forEach((capacity) => {
        const slots = getDynamicSlotRects(capacity, cw, ch);
        const farmhouse = getFarmhouseRect(capacity, cw, ch);
        const action = getActionBarPosition(capacity, false, cw, ch).primary;
        const overlay = getOverlayBounds(capacity, cw, ch);
        const windowRect = getFarmhouseWindowRect(capacity, cw, ch);

        slots.forEach((slot, index) => {
          expect(slot.x).toBeGreaterThanOrEqual(0);
          expect(slot.y).toBeGreaterThanOrEqual(0);
          expect(slot.x + slot.w).toBeLessThanOrEqual(cw);
          expect(slot.y + slot.h).toBeLessThanOrEqual(ch);
          expect(overlaps(slot, farmhouse)).toBe(false);
          expect(overlaps(slot, action)).toBe(false);

          for (let j = index + 1; j < slots.length; j += 1) {
            expect(overlaps(slot, slots[j])).toBe(false);
          }
        });

        expect(farmhouse.x).toBeGreaterThanOrEqual(0);
        expect(farmhouse.y).toBeGreaterThanOrEqual(0);
        expect(farmhouse.x + farmhouse.w).toBeLessThanOrEqual(cw);
        expect(farmhouse.y + farmhouse.h).toBeLessThanOrEqual(ch);

        expect(action.x).toBeGreaterThanOrEqual(0);
        expect(action.y).toBeGreaterThanOrEqual(0);
        expect(action.x + action.w).toBeLessThanOrEqual(cw);
        expect(action.y + action.h).toBeLessThanOrEqual(ch);

        expect(overlay.x).toBeGreaterThanOrEqual(0);
        expect(overlay.y).toBeGreaterThanOrEqual(0);
        expect(overlay.x + overlay.w).toBeLessThanOrEqual(cw);
        expect(overlay.y + overlay.h).toBeLessThanOrEqual(ch);

        expect(windowRect.x).toBeGreaterThanOrEqual(0);
        expect(windowRect.y).toBeGreaterThanOrEqual(0);
        expect(windowRect.x + windowRect.w).toBeLessThanOrEqual(cw);
        expect(windowRect.y + windowRect.h).toBeLessThanOrEqual(ch);
      });
    });
  });

  it('uses reference dimensions in constants', () => {
    expect(LAYOUT.CANVAS.REF_WIDTH).toBe(390);
    expect(LAYOUT.CANVAS.REF_HEIGHT).toBe(844);
  });
});
