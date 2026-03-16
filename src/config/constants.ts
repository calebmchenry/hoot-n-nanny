export const LAYOUT = {
  CANVAS: {
    WIDTH: 390,
    HEIGHT: 844,
  },
  SLOT: {
    WIDTH: 88,
    HEIGHT: 88,
    GAP: 16,
    COLUMNS: 3,
    START_Y: 160,
    ROW_GAP: 24,
    MAX_ROWS: 3,
  },
  BARN: {
    HEADER_HEIGHT: 126,
    FLOOR_Y: 544,
    FLOOR_HEIGHT: 120,
    DECK_SIZE: 72,
  },
  FARMHOUSE: {
    X: 24,
    Y: 560,
    WIDTH: 142,
    HEIGHT: 116,
    WINDOW: {
      WIDTH: 34,
      HEIGHT: 24,
      OFFSET_X: 54,
      OFFSET_Y: 28,
    },
  },
  ACTION_BAR: {
    Y: 720,
    WIDTH: 350,
    HEIGHT: 56,
    GAP: 14,
  },
  SUMMARY: {
    X: 20,
    Y: 120,
    WIDTH: 350,
    HEIGHT: 580,
  },
  SHOP: {
    GRID_X: 20,
    GRID_Y: 152,
    GRID_COLUMNS: 2,
    CARD_WIDTH: 170,
    CARD_HEIGHT: 108,
    GRID_GAP_X: 10,
    GRID_GAP_Y: 10,
  },
  TAP_TARGET_MIN: 44,
} as const;

export const PALETTE = {
  SKY_TOP: 0x10243f,
  SKY_MID: 0x173a5e,
  SKY_LOW: 0x295c7a,
  BARN_DARK: 0x6b3027,
  BARN_BASE: 0x8b3a3a,
  BARN_LIGHT: 0xa5563d,
  STRAW: 0xd9a441,
  STRAW_HIGHLIGHT: 0xf1c86a,
  PARCHMENT: 0xf0e1be,
  PARCHMENT_STROKE: 0x8f7651,
  NOISY_CARD: 0xd78f8a,
  WARNING: 0xffbe4d,
  BUST: 0xd94b3d,
  SUCCESS: 0x5c9b5d,
  BUTTON_PRIMARY: 0x4a7c59,
  BUTTON_SECONDARY: 0x3f5866,
  BUTTON_DISABLED: 0x5e5e5e,
  TEXT_DARK: '#241611',
  TEXT_LIGHT: '#f8f3e5',
  SHOP_BG: 0x5c4033,
} as const;

export const ANIMATION = {
  DRAW_SLIDE_MS: 200,
  DRAW_POP_MS: 150,
  NOISE_SHAKE_MS: 100,
  WARNING_GLOW_MS: 800,
  BUST_SHAKE_MS: 150,
  BUST_OVERLAY_MS: 300,
  SCORE_LINE_MS: 300,
  SCORE_STAGGER_MS: 100,
  PURCHASE_FEEDBACK_MS: 200,
  BUTTON_FLASH_MS: 120,
} as const;

export const GAME_LIMITS = {
  STARTING_CAPACITY: 5,
  MAX_CAPACITY: 8,
  CAPACITY_COSTS: {
    6: 2,
    7: 3,
    8: 4,
  },
  MAX_SHOP_STOCK_PER_ANIMAL: 3,
} as const;

export const TEXTURES = {
  CARD_PARCHMENT: 'ui-card-parchment',
  CARD_NOISY: 'ui-card-noisy',
  SLOT_EMPTY: 'ui-slot-empty',
  SLOT_OCCUPIED: 'ui-slot-occupied',
  BADGE_MISCHIEF: 'ui-badge-mischief',
  BADGE_HAY: 'ui-badge-hay',
  NOISE_DOT_EMPTY: 'ui-noise-dot-empty',
  NOISE_DOT_FILLED: 'ui-noise-dot-filled',
  BUTTON_PRIMARY: 'ui-button-primary',
  BUTTON_SECONDARY: 'ui-button-secondary',
  BUTTON_DISABLED: 'ui-button-disabled',
  BARN_PLANK: 'env-barn-plank',
  RAFTER: 'env-rafter',
  FLOOR_STRAW: 'env-floor-straw',
  FARMHOUSE: 'env-farmhouse',
  WINDOW_GLOW: 'env-window-glow',
  DECK_BACK: 'env-deck-back',
  LOCK_ICON: 'ui-lock-icon',
} as const;

export const DOM_PHASE = {
  READY_TO_DRAW: 'ready_to_draw',
  ANIMATING_DRAW: 'animating_draw',
  PLAYER_DECISION: 'player_decision',
  WARNING: 'warning',
  BUST: 'bust',
  NIGHT_SUMMARY: 'night_summary',
  SHOP: 'shop',
} as const;
