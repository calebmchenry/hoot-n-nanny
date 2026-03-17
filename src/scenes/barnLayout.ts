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
    return { w: 112, h: 122 };
  }

  // Keep near-reference portrait phones visually aligned with the 390x844 baseline.
  if (cw >= 420 || ch >= 820) {
    return { w: 96, h: 104 };
  }

  return { w: 80, h: 87 };
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

  const compressRows = capacity >= 7 && !(cw === REF_W && ch === REF_H);
  const rowGapBase = compressRows ? 8 : 14;
  const rowGap = Math.max(compressRows ? 6 : 8, round((rowGapBase / REF_H) * ch));

  const noise = getNoiseMeterPosition(capacity, cw, ch);
  const topY = Math.max(
    round((156 / REF_H) * ch),
    noise.y + noise.h + Math.max(24, round((42 / REF_H) * ch)),
  );

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
  const { slotW, slotH } = getSlotLayout(capacity, cw, ch);
  const noise = getNoiseMeterPosition(capacity, cw, ch);

  const w = clamp(round((64 / 96) * slotW), 52, 90);
  const h = clamp(round((82 / 104) * slotH), 66, 112);
  const margin = round((20 / REF_W) * cw);

  const x = cw - margin - w;
  const y = Math.max(round((106 / REF_H) * ch), noise.y + Math.max(12, round((20 / REF_H) * ch)));

  return toRect(x, y, w, h);
};

export const getFarmhouseRect = (capacity: number, cw: number, ch: number): Rect => {
  const slots = getDynamicSlotRects(capacity, cw, ch);
  const slotsBottom = Math.max(...slots.map((slot) => slot.y + slot.h));

  if (cw >= 900) {
    const margin = Math.max(20, round((20 / REF_W) * cw));
    const w = clamp(round(cw * 0.18), 180, 320);
    const h = round((w * 116) / 142);
    const x = cw - margin - w;
    const y = clamp(round(ch * 0.36), round(ch * 0.22), round(ch * 0.7) - h);
    return toRect(x, y, w, h);
  }

  const w = round((142 / REF_W) * cw);
  const h = round((116 / REF_H) * ch);
  const x = round((24 / REF_W) * cw);
  const y = Math.max(
    round((560 / REF_H) * ch),
    slotsBottom + Math.max(10, round((22 / REF_H) * ch)),
  );

  return toRect(x, y, w, h);
};

export const getActionBarPosition = (
  _capacity: number,
  dualButtons: boolean,
  cw: number,
  ch: number,
): ActionBarLayout => {
  const y = round(ch - 86);
  const h = 56;
  const x = 20;

  if (!dualButtons) {
    const w = Math.max(LAYOUT.TAP_TARGET_MIN, cw - 40);
    return {
      primary: toRect(x, y, w, h),
      secondary: null,
    };
  }

  const gap = 14;
  const buttonWidth = Math.max(LAYOUT.TAP_TARGET_MIN, round((cw - 54) / 2));

  return {
    primary: toRect(x, y, buttonWidth, h),
    secondary: toRect(x + buttonWidth + gap, y, buttonWidth, h),
  };
};

export const getOverlayBounds = (_capacity: number, cw: number, ch: number): Rect => {
  const margin = round((20 / REF_W) * cw);
  const top = round((120 / REF_H) * ch);
  const bottom = round((144 / REF_H) * ch);

  const w = Math.min(600, cw - margin * 2);
  const h = Math.max(220, ch - top - bottom);
  const x = round((cw - w) / 2);

  return toRect(x, top, w, h);
};

export const getFarmhouseWindowRect = (capacity: number, cw: number, ch: number): Rect => {
  const houseRect = getFarmhouseRect(capacity, cw, ch);
  return toRect(
    houseRect.x + round((54 / 142) * houseRect.w),
    houseRect.y + round((28 / 116) * houseRect.h),
    round((34 / 142) * houseRect.w),
    round((24 / 116) * houseRect.h),
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
