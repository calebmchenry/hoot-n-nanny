import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../config/constants';
import {
  getActionBarPosition,
  getDeckStackPosition,
  getDynamicSlotRects,
  getEndNightPosition,
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

const capacities = [5, 6, 7, 8] as const;
const viewports = [
  { cw: 375, ch: 667 },
  { cw: 390, ch: 844 },
  { cw: 393, ch: 852 },
  { cw: 768, ch: 1024 },
  { cw: 1920, ch: 1080 },
];

describe('barnLayout', () => {
  it('uses tarot-style slot dimensions at reference viewport', () => {
    const slots = getDynamicSlotRects(5, 390, 844);
    expect(slots).toHaveLength(5);
    slots.forEach((slot) => {
      expect(slot.w).toBe(106);
      expect(slot.h).toBe(190);
      expect(slot.h / slot.w).toBeGreaterThan(1.75);
      expect(slot.h / slot.w).toBeLessThan(1.85);
    });
  });

  it('keeps action bar as one full-width button regardless of dual flag', () => {
    const single = getActionBarPosition(5, false, 390, 844);
    const dual = getActionBarPosition(5, true, 390, 844);

    expect(single.primary).toEqual({ x: 20, y: 758, w: 350, h: 56 });
    expect(single.secondary).toBeNull();
    expect(dual.primary).toEqual(single.primary);
    expect(dual.secondary).toBeNull();
  });

  it('positions End Night near the top HUD lane and right aligned', () => {
    const cw = 390;
    const ch = 844;
    const endNight = getEndNightPosition(5, cw, ch);
    const noise = getNoiseMeterPosition(5, cw, ch);
    const action = getActionBarPosition(5, false, cw, ch).primary;

    expect(endNight.w).toBe(LAYOUT.END_NIGHT_BUTTON.WIDTH);
    expect(endNight.h).toBe(LAYOUT.END_NIGHT_BUTTON.HEIGHT);
    expect(endNight.x + endNight.w).toBeLessThanOrEqual(cw - 16);
    expect(endNight.y).toBeLessThan(noise.y + noise.h);
    expect(endNight.y + endNight.h).toBeLessThan(action.y);
  });

  it('shrinks farmhouse and hides it at capacity 7+', () => {
    const visibleHouse = getFarmhouseRect(5, 390, 844);
    expect(visibleHouse.w).toBe(85);
    expect(visibleHouse.h).toBe(70);

    const hiddenHouse7 = getFarmhouseRect(7, 390, 844);
    const hiddenHouse8 = getFarmhouseRect(8, 390, 844);
    expect(hiddenHouse7).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(hiddenHouse8).toEqual({ x: 0, y: 0, w: 0, h: 0 });

    const hiddenWindow = getFarmhouseWindowRect(8, 390, 844);
    expect(hiddenWindow).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it('extends overlay low enough to occlude action bar', () => {
    capacities.forEach((capacity) => {
      const overlay = getOverlayBounds(capacity, 390, 844);
      const action = getActionBarPosition(capacity, false, 390, 844).primary;
      expect(overlay.y + overlay.h).toBeGreaterThan(action.y);
    });
  });

  it('keeps deck stack clear of the card slots', () => {
    viewports.forEach(({ cw, ch }) => {
      capacities.forEach((capacity) => {
        const deck = getDeckStackPosition(capacity, cw, ch);
        const slots = getDynamicSlotRects(capacity, cw, ch);

        expect(deck.x).toBeGreaterThanOrEqual(0);
        expect(deck.y).toBeGreaterThanOrEqual(0);
        expect(deck.x + deck.w).toBeLessThanOrEqual(cw);
        expect(deck.y + deck.h).toBeLessThanOrEqual(ch);

        slots.forEach((slot) => {
          expect(overlaps(deck, slot)).toBe(false);
        });
      });
    });
  });

  it('keeps major regions in bounds and non-overlapping across viewport matrix', () => {
    viewports.forEach(({ cw, ch }) => {
      capacities.forEach((capacity) => {
        const slots = getDynamicSlotRects(capacity, cw, ch);
        const house = getFarmhouseRect(capacity, cw, ch);
        const action = getActionBarPosition(capacity, false, cw, ch).primary;
        const overlay = getOverlayBounds(capacity, cw, ch);
        const endNight = getEndNightPosition(capacity, cw, ch);
        const banner = getResourceBannerPosition(capacity, cw, ch);

        [action, overlay, endNight, banner, ...slots].forEach((rect) => {
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.w).toBeLessThanOrEqual(cw);
          expect(rect.y + rect.h).toBeLessThanOrEqual(ch);
        });

        slots.forEach((slot, index) => {
          expect(overlaps(slot, action)).toBe(false);
          if (house.w > 0 && house.h > 0) {
            expect(overlaps(slot, house)).toBe(false);
          }
          for (let j = index + 1; j < slots.length; j += 1) {
            expect(overlaps(slot, slots[j])).toBe(false);
          }
        });
      });
    });
  });

  it('keeps info panel above action bar', () => {
    viewports.forEach(({ cw, ch }) => {
      const panel = getInfoPanelBounds(cw, ch);
      const action = getActionBarPosition(8, false, cw, ch).primary;
      expect(panel.y + panel.h).toBeLessThanOrEqual(action.y);
    });
  });

  it('enforces minimum 44x44 touch targets for interactive controls', () => {
    viewports.forEach(({ cw, ch }) => {
      capacities.forEach((capacity) => {
        const slots = getDynamicSlotRects(capacity, cw, ch);
        const action = getActionBarPosition(capacity, false, cw, ch).primary;
        const endNight = getEndNightPosition(capacity, cw, ch);

        slots.forEach((slot) => {
          expect(slot.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
          expect(slot.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        });

        expect(action.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect(action.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect(endNight.w).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
        expect(endNight.h).toBeGreaterThanOrEqual(LAYOUT.TAP_TARGET_MIN);
      });
    });
  });
});
