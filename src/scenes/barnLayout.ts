import { LAYOUT } from '../config/constants';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const getSlotRects = (): Rect[] => {
  return LAYOUT.SLOTS.POSITIONS.map(({ x, y }) => ({
    x,
    y,
    w: LAYOUT.SLOTS.WIDTH,
    h: LAYOUT.SLOTS.HEIGHT,
  }));
};

export const getButtonRect = (): Rect => {
  return {
    x: LAYOUT.BUTTON.X,
    y: LAYOUT.BUTTON.Y,
    w: LAYOUT.BUTTON.WIDTH,
    h: LAYOUT.BUTTON.HEIGHT,
  };
};
