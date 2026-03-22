import { LAYOUT } from '../config/constants';
import type { Rect } from './barnLayout';

const REF_W = LAYOUT.CANVAS.REF_WIDTH;
const REF_H = LAYOUT.CANVAS.REF_HEIGHT;

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

const round = (value: number): number => Math.round(value);

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const getHorizontalMargin = (cw: number): number => {
  return Math.max(16, round((20 / REF_W) * cw));
};

export const scaledShopFont = (basePx: number, ch: number): number => {
  const scaled = round(basePx * (ch / REF_H));
  return clamp(scaled, 10, basePx * 2);
};

export const getCurrencyHeaderPosition = (cw: number, ch: number): Rect => {
  const x = getHorizontalMargin(cw);
  const y = round((74 / REF_H) * ch);
  const w = cw - x * 2;
  const h = clamp(round((66 / REF_H) * ch), 48, 88);
  return rect(x, y, w, h);
};

export const getTabButtonPositions = (
  cw: number,
  ch: number,
): { animals: Rect; legendary: Rect } => {
  const x = getHorizontalMargin(cw);
  const y = round((124 / REF_H) * ch);
  const h = Math.max(36, round((36 / REF_H) * ch));
  const gap = Math.max(10, round((10 / REF_W) * cw));
  const buttonW = Math.floor((cw - x * 2 - gap) / 2);

  return {
    animals: rect(x, y, buttonW, h),
    legendary: rect(x + buttonW + gap, y, buttonW, h),
  };
};

export const getShopGridPositions = (itemCount: number, cw: number, ch: number): Rect[] => {
  if (itemCount <= 0) {
    return [];
  }

  const columns = itemCount > 6 ? 3 : 2;
  const rows = Math.ceil(itemCount / columns);

  const marginX = getHorizontalMargin(cw);
  const gapX = clamp(round((10 / REF_W) * cw), 8, 26);
  const gapY = clamp(round((8 / REF_H) * ch), 6, 14);

  const tabRect = getTabButtonPositions(cw, ch).animals;
  const capacityRect = getCapacityUpgradePosition(cw, ch);

  const gridTop = tabRect.y + tabRect.h + Math.max(4, round((4 / REF_H) * ch));
  const gridBottom = capacityRect.y - Math.max(2, round((2 / REF_H) * ch));

  const availableW = cw - marginX * 2;
  const rawCardW = Math.floor((availableW - gapX * (columns - 1)) / columns);
  const cardW = clamp(rawCardW, 44, LAYOUT.SHOP.CARD_WIDTH);

  const minNeededH = rows * 80 + (rows - 1) * gapY;
  const boundedBottom = Math.max(gridBottom, gridTop + minNeededH);
  const availableH = boundedBottom - gridTop;
  const fitCardH = Math.floor((availableH - gapY * (rows - 1)) / rows);
  const ratioCardH = round(cardW * (LAYOUT.SHOP.CARD_HEIGHT / LAYOUT.SHOP.CARD_WIDTH));
  const cardH = clamp(Math.min(ratioCardH, fitCardH), LAYOUT.TAP_TARGET_MIN, 240);

  const usedHeight = rows * cardH + (rows - 1) * gapY;
  const startY = gridTop + Math.max(0, Math.floor((availableH - usedHeight) / 2));

  const totalGridW = columns * cardW + (columns - 1) * gapX;
  const startX = round((cw - totalGridW) / 2);

  const positions: Rect[] = [];

  for (let i = 0; i < itemCount; i += 1) {
    const column = i % columns;
    const row = Math.floor(i / columns);

    positions.push(
      rect(startX + column * (cardW + gapX), startY + row * (cardH + gapY), cardW, cardH),
    );
  }

  return positions;
};

export const getCapacityUpgradePosition = (cw: number, ch: number): Rect => {
  const startNight = getStartNightButtonPosition(cw, ch);
  const h = 56;
  const y = startNight.y - h - Math.max(6, round((8 / REF_H) * ch));
  return rect(startNight.x, y, startNight.w, h);
};

export const getStartNightButtonPosition = (cw: number, ch: number): Rect => {
  const x = 20;
  const y = round(ch - 86);
  const w = cw - 40;
  const h = 56;
  return rect(x, y, w, h);
};

export const getPennedUpPosition = (cw: number, ch: number): Rect => {
  const x = getHorizontalMargin(cw);
  const y = round((24 / REF_H) * ch);
  const w = cw - x * 2;
  const h = clamp(round((40 / REF_H) * ch), 28, 56);
  return rect(x, y, w, h);
};
