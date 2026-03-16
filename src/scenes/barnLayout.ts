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

const getCapacityOffset = (capacity: number): number => {
  if (capacity <= 6) {
    return 0;
  }

  return (capacity - 6) * 12;
};

const centeredRowX = (count: number): number[] => {
  const totalWidth = count * LAYOUT.SLOT.WIDTH + (count - 1) * LAYOUT.SLOT.GAP;
  const startX = Math.round((LAYOUT.CANVAS.WIDTH - totalWidth) / 2);

  return Array.from({ length: count }).map((_, index) => {
    return startX + index * (LAYOUT.SLOT.WIDTH + LAYOUT.SLOT.GAP);
  });
};

const toRect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const getDynamicSlotRects = (capacity: number): Rect[] => {
  const rows = ROW_MAP[capacity];
  if (!rows) {
    throw new Error(`Unsupported barn capacity: ${capacity}.`);
  }

  const slotRects: Rect[] = [];

  rows.forEach((count, rowIndex) => {
    const y =
      LAYOUT.SLOT.START_Y +
      rowIndex * (LAYOUT.SLOT.HEIGHT + LAYOUT.SLOT.ROW_GAP) +
      getCapacityOffset(capacity);

    centeredRowX(count).forEach((x) => {
      slotRects.push(toRect(x, y, LAYOUT.SLOT.WIDTH, LAYOUT.SLOT.HEIGHT));
    });
  });

  return slotRects.slice(0, capacity);
};

export const getResourceBannerPosition = (capacity: number): Rect => {
  return toRect(20, 20 + Math.floor(getCapacityOffset(capacity) / 2), 240, 42);
};

export const getNoiseMeterPosition = (capacity: number): Rect => {
  return toRect(20, 74 + Math.floor(getCapacityOffset(capacity) / 2), 148, 24);
};

export const getDeckStackPosition = (capacity: number): Rect => {
  return toRect(304, 108 + Math.floor(getCapacityOffset(capacity) / 2), 64, 82);
};

export const getFarmhouseRect = (capacity: number): Rect => {
  const offset = getCapacityOffset(capacity);
  return toRect(
    LAYOUT.FARMHOUSE.X,
    LAYOUT.FARMHOUSE.Y + offset,
    LAYOUT.FARMHOUSE.WIDTH,
    LAYOUT.FARMHOUSE.HEIGHT,
  );
};

export const getActionBarPosition = (capacity: number, dualButtons: boolean): ActionBarLayout => {
  const offset = getCapacityOffset(capacity);
  const y = LAYOUT.ACTION_BAR.Y + offset;

  if (!dualButtons) {
    return {
      primary: toRect(
        Math.round((LAYOUT.CANVAS.WIDTH - LAYOUT.ACTION_BAR.WIDTH) / 2),
        y,
        LAYOUT.ACTION_BAR.WIDTH,
        LAYOUT.ACTION_BAR.HEIGHT,
      ),
      secondary: null,
    };
  }

  const buttonWidth = Math.round((LAYOUT.ACTION_BAR.WIDTH - LAYOUT.ACTION_BAR.GAP) / 2);
  const leftX = Math.round((LAYOUT.CANVAS.WIDTH - LAYOUT.ACTION_BAR.WIDTH) / 2);

  return {
    primary: toRect(leftX, y, buttonWidth, LAYOUT.ACTION_BAR.HEIGHT),
    secondary: toRect(
      leftX + buttonWidth + LAYOUT.ACTION_BAR.GAP,
      y,
      buttonWidth,
      LAYOUT.ACTION_BAR.HEIGHT,
    ),
  };
};

export const getOverlayBounds = (capacity: number): Rect => {
  const offset = getCapacityOffset(capacity);
  return toRect(
    LAYOUT.SUMMARY.X,
    LAYOUT.SUMMARY.Y + Math.floor(offset / 2),
    LAYOUT.SUMMARY.WIDTH,
    LAYOUT.SUMMARY.HEIGHT,
  );
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
