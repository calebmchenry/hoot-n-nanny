import { LAYOUT } from '../config/constants';

const REF_W = LAYOUT.CANVAS.REF_WIDTH;
const REF_H = LAYOUT.CANVAS.REF_HEIGHT;

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

const toRect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

const round = (value: number): number => Math.round(value);

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const getSlotSize = (cw: number, ch: number): { w: number; h: number } => {
  if (cw >= 700) {
    return { w: 130, h: 234 };
  }

  if (cw >= 420 || ch >= 820) {
    return { w: 106, h: 190 };
  }

  if (ch < 740) {
    return { w: 78, h: 140 };
  }

  return { w: 88, h: 158 };
};

export const scaledFont = (basePx: number, ch: number): number => {
  const scaled = round(basePx * (ch / REF_H));
  return clamp(scaled, 10, basePx * 2);
};

const getSlotLayout = (
  capacity: number,
  cw: number,
  ch: number,
): {
  rows: number[];
  slotW: number;
  slotH: number;
  rowGap: number;
  colGap: number;
  startX: number;
  topY: number;
} => {
  const rows = ROW_MAP[capacity];
  if (!rows) {
    throw new Error(`Unsupported barn capacity: ${capacity}.`);
  }

  const slotSize = getSlotSize(cw, ch);
  const baseColGap = Math.max(8, round((12 / REF_W) * cw));

  let colGap = baseColGap;
  let startX: number;

  if (cw >= 900) {
    const left = round(cw * 0.08);
    const right = round(cw * 0.52);
    const available = Math.max(slotSize.w * 3 + baseColGap * 2, right - left);
    const maxGap = Math.max(baseColGap, Math.floor((available - slotSize.w * 3) / 2));
    colGap = clamp(round(cw * 0.06), baseColGap, maxGap);
    const gridW = slotSize.w * 3 + colGap * 2;
    startX = left + round((available - gridW) / 2);
  } else {
    const gridW = slotSize.w * 3 + colGap * 2;
    startX = round((cw - gridW) / 2);
  }

  const compactRows = capacity >= 7;
  const rowGapBase = compactRows ? 10 : LAYOUT.SLOT.ROW_GAP;
  const rowGap = Math.max(compactRows ? 8 : 10, round((rowGapBase / REF_H) * ch));

  const noise = getNoiseMeterPosition(capacity, cw, ch);
  const minTop = noise.y + noise.h + Math.max(12, round(((compactRows ? 20 : 42) / REF_H) * ch));
  const baseTop = round(((compactRows ? 150 : LAYOUT.SLOT.START_Y) / REF_H) * ch);
  const actionBarTop = getActionBarPosition(capacity, false, cw, ch).primary.y;
  const gridHeight = rows.length * slotSize.h + (rows.length - 1) * rowGap;
  const maxTop = actionBarTop - gridHeight - Math.max(6, round((8 / REF_H) * ch));
  const topY = clamp(Math.max(baseTop, minTop), minTop, Math.max(minTop, maxTop));

  return {
    rows,
    slotW: slotSize.w,
    slotH: slotSize.h,
    rowGap,
    colGap,
    startX,
    topY,
  };
};

export const getDynamicSlotRects = (capacity: number, cw: number, ch: number): Rect[] => {
  const layout = getSlotLayout(capacity, cw, ch);
  const threeColWidth = layout.slotW * 3 + layout.colGap * 2;
  const slotRects: Rect[] = [];

  layout.rows.forEach((count, rowIndex) => {
    const rowWidth = layout.slotW * count + layout.colGap * (count - 1);
    const rowX = layout.startX + round((threeColWidth - rowWidth) / 2);
    const y = layout.topY + rowIndex * (layout.slotH + layout.rowGap);

    for (let i = 0; i < count; i += 1) {
      const x = rowX + i * (layout.slotW + layout.colGap);
      slotRects.push(toRect(x, y, layout.slotW, layout.slotH));
    }
  });

  return slotRects.slice(0, capacity);
};

export const getResourceBannerPosition = (_capacity: number, cw: number, ch: number): Rect => {
  const x = round((16 / REF_W) * cw);
  const y = round((16 / REF_H) * ch);
  const w = cw - x * 2;
  const h = clamp(round((64 / REF_H) * ch), 44, 96);
  return toRect(x, y, w, h);
};

export const getNoiseMeterPosition = (capacity: number, cw: number, ch: number): Rect => {
  const banner = getResourceBannerPosition(capacity, cw, ch);
  const x = banner.x;
  const y = banner.y + banner.h + Math.max(6, round((6 / REF_H) * ch));
  const w = clamp(round((170 / REF_W) * cw), 120, round(cw * 0.6));
  const h = clamp(round((28 / REF_H) * ch), 20, 40);
  return toRect(x, y, w, h);
};

export const getDeckStackPosition = (capacity: number, cw: number, ch: number): Rect => {
  const slotLayout = getSlotLayout(capacity, cw, ch);
  const noise = getNoiseMeterPosition(capacity, cw, ch);

  const margin = Math.max(10, round((12 / REF_W) * cw));
  const w = clamp(round((48 / REF_W) * cw), 44, 64);
  const h = clamp(round((82 / 64) * w), 58, 82);

  const x = cw - margin - w;
  const baselineY = noise.y + round((noise.h - h) / 2);
  const maxY = slotLayout.topY - h - Math.max(4, round((6 / REF_H) * ch));
  const y = clamp(baselineY, round((18 / REF_H) * ch), maxY);

  return toRect(x, y, w, h);
};

export const getFarmhouseRect = (capacity: number, cw: number, ch: number): Rect => {
  if (capacity >= 7) {
    return toRect(0, 0, 0, 0);
  }

  const slots = getDynamicSlotRects(capacity, cw, ch);
  const slotsBottom = Math.max(...slots.map((slot) => slot.y + slot.h));

  if (cw >= 900) {
    const margin = Math.max(20, round((24 / REF_W) * cw));
    const w = clamp(round((LAYOUT.FARMHOUSE.WIDTH / REF_W) * cw), 130, 220);
    const h = round((w * LAYOUT.FARMHOUSE.HEIGHT) / LAYOUT.FARMHOUSE.WIDTH);
    const x = cw - margin - w;
    const y = clamp(round(ch * 0.42), round(ch * 0.24), round(ch * 0.74) - h);
    return toRect(x, y, w, h);
  }

  const w = round((LAYOUT.FARMHOUSE.WIDTH / REF_W) * cw);
  const h = round((LAYOUT.FARMHOUSE.HEIGHT / REF_H) * ch);
  const x = round((LAYOUT.FARMHOUSE.X / REF_W) * cw);
  const y = Math.max(
    round((LAYOUT.FARMHOUSE.Y / REF_H) * ch),
    slotsBottom + Math.max(8, round((16 / REF_H) * ch)),
  );

  return toRect(x, y, w, h);
};

export const getActionBarPosition = (
  _capacity: number,
  _dualButtons: boolean,
  cw: number,
  ch: number,
): ActionBarLayout => {
  const y = round(ch - 86);
  const h = 56;
  const x = 20;
  const w = Math.max(LAYOUT.TAP_TARGET_MIN, cw - 40);

  return {
    primary: toRect(x, y, w, h),
    secondary: null,
  };
};

export const getEndNightPosition = (capacity: number, cw: number, ch: number): Rect => {
  const noise = getNoiseMeterPosition(capacity, cw, ch);
  const w = LAYOUT.END_NIGHT_BUTTON.WIDTH;
  const h = LAYOUT.END_NIGHT_BUTTON.HEIGHT;
  const margin = round((20 / REF_W) * cw);
  const x = cw - margin - w;
  const y = noise.y + round((noise.h - h) / 2);

  return toRect(x, y, w, h);
};

export const getOverlayBounds = (_capacity: number, cw: number, ch: number): Rect => {
  const margin = round((20 / REF_W) * cw);
  const top = round((120 / REF_H) * ch);
  const bottom = round((60 / REF_H) * ch);

  const w = Math.min(600, cw - margin * 2);
  const h = Math.max(220, ch - top - bottom);
  const x = round((cw - w) / 2);

  return toRect(x, top, w, h);
};

export const getFarmhouseWindowRect = (capacity: number, cw: number, ch: number): Rect => {
  const houseRect = getFarmhouseRect(capacity, cw, ch);
  if (houseRect.w === 0 || houseRect.h === 0) {
    return toRect(0, 0, 0, 0);
  }

  return toRect(
    houseRect.x + round((LAYOUT.FARMHOUSE.WINDOW.OFFSET_X / LAYOUT.FARMHOUSE.WIDTH) * houseRect.w),
    houseRect.y + round((LAYOUT.FARMHOUSE.WINDOW.OFFSET_Y / LAYOUT.FARMHOUSE.HEIGHT) * houseRect.h),
    round((LAYOUT.FARMHOUSE.WINDOW.WIDTH / LAYOUT.FARMHOUSE.WIDTH) * houseRect.w),
    round((LAYOUT.FARMHOUSE.WINDOW.HEIGHT / LAYOUT.FARMHOUSE.HEIGHT) * houseRect.h),
  );
};

export const getInfoPanelBounds = (cw: number, ch: number): Rect => {
  const actionBar = getActionBarPosition(0, false, cw, ch).primary;
  const gap = Math.max(8, round((22 / REF_H) * ch));
  const minTop = round((96 / REF_H) * ch);

  let h = clamp(round((180 / REF_H) * ch), 120, 360);
  const maxAllowedH = Math.max(100, actionBar.y - gap - minTop);
  h = Math.min(h, maxAllowedH);

  const y = Math.max(minTop, actionBar.y - h - gap);
  const w = Math.min(600, cw - 24);
  const x = round((cw - w) / 2);

  return toRect(x, y, w, h);
};
