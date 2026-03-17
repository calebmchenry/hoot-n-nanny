import { LAYOUT } from '../config/constants';
import type { Rect } from './barnLayout';

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const getCurrencyHeaderPosition = (): Rect => {
  return rect(20, 74, 350, 66);
};

export const getTabButtonPositions = (): { animals: Rect; legendary: Rect } => {
  return {
    animals: rect(20, 124, 170, 36),
    legendary: rect(200, 124, 170, 36),
  };
};

export const getShopGridPositions = (itemCount: number): Rect[] => {
  const positions: Rect[] = [];
  const gridY = 170; // Below tabs

  for (let i = 0; i < itemCount; i += 1) {
    const column = i % LAYOUT.SHOP.GRID_COLUMNS;
    const row = Math.floor(i / LAYOUT.SHOP.GRID_COLUMNS);

    positions.push(
      rect(
        LAYOUT.SHOP.GRID_X + column * (LAYOUT.SHOP.CARD_WIDTH + LAYOUT.SHOP.GRID_GAP_X),
        gridY + row * (LAYOUT.SHOP.CARD_HEIGHT + LAYOUT.SHOP.GRID_GAP_Y),
        LAYOUT.SHOP.CARD_WIDTH,
        LAYOUT.SHOP.CARD_HEIGHT,
      ),
    );
  }

  return positions;
};

export const getCapacityUpgradePosition = (): Rect => {
  return rect(20, 640, 350, 56);
};

export const getStartNightButtonPosition = (): Rect => {
  return rect(20, 716, 350, 56);
};

export const getPennedUpPosition = (): Rect => {
  return rect(20, 24, 350, 40);
};
