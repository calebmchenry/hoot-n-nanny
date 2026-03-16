export const LAYOUT = {
  CANVAS: {
    WIDTH: 390,
    HEIGHT: 844,
  },
  BARN: {
    X: 0,
    Y: 0,
    WIDTH: 390,
    HEIGHT: 844,
    COLOR: 0x8b3a3a,
  },
  SLOTS: {
    WIDTH: 88,
    HEIGHT: 88,
    GAP: 16,
    STROKE_WIDTH: 2,
    POSITIONS: [
      { x: 59, y: 160 },
      { x: 163, y: 160 },
      { x: 267, y: 160 },
      { x: 111, y: 272 },
      { x: 215, y: 272 },
    ],
    EMPTY: {
      FILL: 0xd4a574,
      STROKE: 0x6b4226,
    },
    OCCUPIED: {
      FILL: 0x6aad7e,
      STROKE: 0x3d7a54,
    },
  },
  FARMHOUSE: {
    X: 0,
    Y: 580,
    WIDTH: 390,
    HEIGHT: 180,
    COLOR: 0x4a3728,
  },
  BUTTON: {
    X: 20,
    Y: 720,
    WIDTH: 350,
    HEIGHT: 56,
    BASE_COLOR: 0x4a7c59,
    FLASH_COLOR: 0x6aad7e,
    FLASH_DURATION_MS: 120,
    LABEL: 'DRAW ANIMAL',
    LABEL_COLOR: '#ffffff',
  },
} as const;
