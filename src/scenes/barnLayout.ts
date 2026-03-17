import { LAYOUT } from '../config/constants';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ActionBarLayout {
  primary: Rect;
  secondary: Rect | null;
}

const ROW_MAP: Record<number, number[]> = {
  5: [3, 2],
  6: [3, 3],
  7: [3, 3, 1],
  8: [3, 3, 2],
};

// Fixed x positions per row count (from sprint spec)
const ROW_X_3 = [39, 147, 255];
const ROW_X_2 = [93, 201];
const ROW_X_1 = [147];

const ROW_Y = [156, 274, 392];

const toRect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

const getXPositions = (count: number): number[] => {
  switch (count) {
    case 3:
      return ROW_X_3;
    case 2:
      return ROW_X_2;
    case 1:
      return ROW_X_1;
    default:
      return [];
  }
};

export const getDynamicSlotRects = (capacity: number): Rect[] => {
  const rows = ROW_MAP[capacity];
  if (!rows) {
    throw new Error(`Unsupported barn capacity: ${capacity}.`);
  }

  const slotRects: Rect[] = [];

  rows.forEach((count, rowIndex) => {
    const y = ROW_Y[rowIndex];
    const xPositions = getXPositions(count);

    xPositions.forEach((x) => {
      slotRects.push(toRect(x, y, LAYOUT.SLOT.WIDTH, LAYOUT.SLOT.HEIGHT));
    });
  });

  return slotRects.slice(0, capacity);
};

export const getResourceBannerPosition = (_capacity: number): Rect => {
  return toRect(16, 16, 358, 64);
};

export const getNoiseMeterPosition = (_capacity: number): Rect => {
  return toRect(16, 86, 170, 28);
};

export const getDeckStackPosition = (_capacity: number): Rect => {
  return toRect(306, 106, 64, 82);
};

export const getFarmhouseRect = (_capacity: number): Rect => {
  return toRect(
    LAYOUT.FARMHOUSE.X,
    LAYOUT.FARMHOUSE.Y,
    LAYOUT.FARMHOUSE.WIDTH,
    LAYOUT.FARMHOUSE.HEIGHT,
  );
};

export const getActionBarPosition = (capacity: number, dualButtons: boolean): ActionBarLayout => {
  const y = LAYOUT.ACTION_BAR.Y;

  if (!dualButtons) {
    return {
      primary: toRect(LAYOUT.ACTION_BAR.X, y, LAYOUT.ACTION_BAR.WIDTH, LAYOUT.ACTION_BAR.HEIGHT),
      secondary: null,
    };
  }

  const buttonWidth = Math.round((LAYOUT.ACTION_BAR.WIDTH - LAYOUT.ACTION_BAR.GAP) / 2);

  return {
    primary: toRect(LAYOUT.ACTION_BAR.X, y, buttonWidth, LAYOUT.ACTION_BAR.HEIGHT),
    secondary: toRect(
      LAYOUT.ACTION_BAR.X + buttonWidth + LAYOUT.ACTION_BAR.GAP,
      y,
      buttonWidth,
      LAYOUT.ACTION_BAR.HEIGHT,
    ),
  };
};

export const getOverlayBounds = (_capacity: number): Rect => {
  return toRect(LAYOUT.SUMMARY.X, LAYOUT.SUMMARY.Y, LAYOUT.SUMMARY.WIDTH, LAYOUT.SUMMARY.HEIGHT);
};

export const getFarmhouseWindowRect = (capacity: number): Rect => {
  const houseRect = getFarmhouseRect(capacity);
  return toRect(
    houseRect.x + LAYOUT.FARMHOUSE.WINDOW.OFFSET_X,
    houseRect.y + LAYOUT.FARMHOUSE.WINDOW.OFFSET_Y,
    LAYOUT.FARMHOUSE.WINDOW.WIDTH,
    LAYOUT.FARMHOUSE.WINDOW.HEIGHT,
  );
};

export const getInfoPanelBounds = (): Rect => {
  return toRect(
    LAYOUT.INFO_PANEL.X,
    LAYOUT.INFO_PANEL.Y,
    LAYOUT.INFO_PANEL.WIDTH,
    LAYOUT.INFO_PANEL.HEIGHT,
  );
};
