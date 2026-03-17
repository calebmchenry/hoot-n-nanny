import { describe, expect, it } from 'vitest';
import {
  getCapacityUpgradePosition,
  getCurrencyHeaderPosition,
  getPennedUpPosition,
  getShopGridPositions,
  getStartNightButtonPosition,
  getTabButtonPositions,
} from './tradingPostLayout';

type Rect = { x: number; y: number; w: number; h: number };

const overlaps = (a: Rect, b: Rect): boolean => {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

describe('tradingPostLayout', () => {
  const itemCount = 12;
  const viewports = [
    { cw: 375, ch: 667 },
    { cw: 393, ch: 852 },
    { cw: 768, ch: 1024 },
    { cw: 1920, ch: 1080 },
  ];

  it('keeps headers, tabs, grid, and bottom actions inside the canvas', () => {
    viewports.forEach(({ cw, ch }) => {
      const header = getCurrencyHeaderPosition(cw, ch);
      const tabs = getTabButtonPositions(cw, ch);
      const grid = getShopGridPositions(itemCount, cw, ch);
      const capacity = getCapacityUpgradePosition(cw, ch);
      const startNight = getStartNightButtonPosition(cw, ch);
      const penned = getPennedUpPosition(cw, ch);

      [header, tabs.animals, tabs.legendary, capacity, startNight, penned, ...grid].forEach(
        (rect) => {
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.w).toBeLessThanOrEqual(cw);
          expect(rect.y + rect.h).toBeLessThanOrEqual(ch);
        },
      );

      expect(overlaps(tabs.animals, tabs.legendary)).toBe(false);
      expect(capacity.y + capacity.h).toBeLessThanOrEqual(startNight.y);
      expect(startNight.y + startNight.h).toBeLessThan(ch);

      for (let i = 0; i < grid.length; i += 1) {
        for (let j = i + 1; j < grid.length; j += 1) {
          expect(overlaps(grid[i], grid[j])).toBe(false);
        }
      }
    });
  });

  it('uses 2 columns at both narrow and wide widths', () => {
    const small = getShopGridPositions(itemCount, 499, 844);
    const wide = getShopGridPositions(itemCount, 500, 844);

    const uniqueXSmall = new Set(small.slice(0, 3).map((rect) => rect.x));
    const uniqueXWide = new Set(wide.slice(0, 3).map((rect) => rect.x));

    expect(uniqueXSmall.size).toBe(2);
    expect(uniqueXWide.size).toBe(2);
  });

  it('keeps Start Night button visible at all target viewports', () => {
    viewports.forEach(({ cw, ch }) => {
      const startNight = getStartNightButtonPosition(cw, ch);
      expect(startNight.y + startNight.h).toBeLessThan(ch);
      expect(startNight.w).toBeGreaterThan(0);
      expect(startNight.h).toBeGreaterThan(0);
    });
  });
});
