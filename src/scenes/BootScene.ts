import Phaser from 'phaser';
import { LAYOUT, PALETTE, TEXTURES } from '../config/constants';
import { EMOJI_MAP } from '../config/emojiMap';
import {
  ASCII_PRINTABLE,
  GLYPH_DATA,
  GLYPH_HEIGHT,
  GLYPH_SPACING,
  GLYPH_WIDTH,
} from '../config/pixelFont';
import { generateProceduralTextures } from '../rendering/proceduralTextures';
import type { AnimalId } from '../game/types';
import { SceneKey } from '../types';

const maybeGenerateTexture = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
): void => {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = new Phaser.GameObjects.Graphics(scene);
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
};

const FONT_KEY = 'pixel-font';
const FONT_ATLAS_WIDTH = (GLYPH_WIDTH + GLYPH_SPACING) * 95;
const FONT_ATLAS_HEIGHT = GLYPH_HEIGHT + 1;

const generateBitmapFont = (scene: Phaser.Scene): void => {
  if (scene.cache.bitmapFont.exists(FONT_KEY)) {
    return;
  }

  if (!scene.textures.exists(FONT_KEY)) {
    const graphics = new Phaser.GameObjects.Graphics(scene);
    graphics.fillStyle(0xffffff, 1);

    for (let index = 0; index < ASCII_PRINTABLE.length; index += 1) {
      const code = ASCII_PRINTABLE.charCodeAt(index);
      const glyphColumns = GLYPH_DATA[code];
      const glyphX = index * (GLYPH_WIDTH + GLYPH_SPACING);

      for (let column = 0; column < GLYPH_WIDTH; column += 1) {
        const bits = glyphColumns?.[column] ?? 0;
        for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
          if ((bits & (1 << row)) !== 0) {
            graphics.fillRect(glyphX + column, row, 1, 1);
          }
        }
      }
    }

    graphics.generateTexture(FONT_KEY, FONT_ATLAS_WIDTH, FONT_ATLAS_HEIGHT);
    graphics.destroy();
  }

  const fontData = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: FONT_KEY,
    'offset.x': 0,
    'offset.y': 0,
    width: GLYPH_WIDTH,
    height: GLYPH_HEIGHT,
    chars: ASCII_PRINTABLE,
    charsPerRow: 95,
    'spacing.x': GLYPH_SPACING,
    'spacing.y': 1,
    lineSpacing: 0,
  });

  scene.cache.bitmapFont.add(FONT_KEY, fontData);
};

const generateShapeTextures = (scene: Phaser.Scene): void => {
  const cardW = LAYOUT.SLOT.WIDTH;
  const cardH = LAYOUT.SLOT.HEIGHT;

  maybeGenerateTexture(scene, TEXTURES.SLOT_EMPTY, cardW, cardH, (graphics) => {
    graphics.fillStyle(0x4f291f, 0.35);
    graphics.fillRoundedRect(0, 0, cardW, cardH, 10);
    graphics.lineStyle(2, 0x3a1f1b, 1);
    graphics.strokeRoundedRect(1, 1, cardW - 2, cardH - 2, 10);
  });

  maybeGenerateTexture(scene, TEXTURES.SLOT_OCCUPIED, cardW, cardH, (graphics) => {
    graphics.fillStyle(PALETTE.SUCCESS, 0.22);
    graphics.fillRoundedRect(0, 0, cardW, cardH, 10);
    graphics.lineStyle(2, PALETTE.SUCCESS, 1);
    graphics.strokeRoundedRect(1, 1, cardW - 2, cardH - 2, 10);
  });

  maybeGenerateTexture(scene, TEXTURES.BADGE_MISCHIEF, 24, 24, (graphics) => {
    graphics.fillStyle(0xd9a441, 1);
    graphics.fillCircle(12, 12, 11);
    graphics.lineStyle(2, 0x7a4a13, 1);
    graphics.strokeCircle(12, 12, 11);
  });

  maybeGenerateTexture(scene, TEXTURES.BADGE_HAY, 24, 24, (graphics) => {
    graphics.fillStyle(0x7fb76c, 1);
    graphics.fillCircle(12, 12, 11);
    graphics.lineStyle(2, 0x356b35, 1);
    graphics.strokeCircle(12, 12, 11);
  });

  const badgeDiameter = LAYOUT.BADGE.DIAMETER;
  const badgeRadius = badgeDiameter / 2;
  maybeGenerateTexture(
    scene,
    TEXTURES.BADGE_MISCHIEF_LG,
    badgeDiameter,
    badgeDiameter,
    (graphics) => {
      graphics.fillStyle(0xd9a441, 1);
      graphics.fillCircle(badgeRadius, badgeRadius, badgeRadius - 1);
      graphics.lineStyle(2, 0x7a4a13, 1);
      graphics.strokeCircle(badgeRadius, badgeRadius, badgeRadius - 1);
    },
  );

  maybeGenerateTexture(scene, TEXTURES.BADGE_HAY_LG, badgeDiameter, badgeDiameter, (graphics) => {
    graphics.fillStyle(0x7fb76c, 1);
    graphics.fillCircle(badgeRadius, badgeRadius, badgeRadius - 1);
    graphics.lineStyle(2, 0x356b35, 1);
    graphics.strokeCircle(badgeRadius, badgeRadius, badgeRadius - 1);
  });

  maybeGenerateTexture(scene, TEXTURES.BADGE_NOISY_STRIPE, cardW, 20, (graphics) => {
    graphics.fillStyle(PALETTE.BUST, 0.85);
    graphics.fillRect(0, 0, cardW, 20);
  });

  maybeGenerateTexture(scene, TEXTURES.ABILITY_STRIP_ACTIVE, cardW, 14, (graphics) => {
    graphics.fillStyle(PALETTE.ABILITY_ACTIVE, 0.9);
    graphics.fillRoundedRect(0, 0, cardW, 14, 3);
  });

  maybeGenerateTexture(scene, TEXTURES.ABILITY_STRIP_PASSIVE, cardW, 14, (graphics) => {
    graphics.fillStyle(PALETTE.ABILITY_PASSIVE, 0.9);
    graphics.fillRoundedRect(0, 0, cardW, 14, 3);
  });

  maybeGenerateTexture(scene, TEXTURES.ABILITY_STRIP_TRIGGERED, cardW, 14, (graphics) => {
    graphics.fillStyle(PALETTE.ABILITY_TRIGGERED, 0.9);
    graphics.fillRoundedRect(0, 0, cardW, 14, 3);
  });

  maybeGenerateTexture(scene, TEXTURES.BADGE_STAR, 16, 16, (graphics) => {
    graphics.fillStyle(PALETTE.LEGENDARY_BORDER, 1);
    const cx = 8;
    const cy = 8;
    const outerR = 7;
    const innerR = 3;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI / 2) * -1 + (Math.PI / 5) * i;
      const r = i % 2 === 0 ? outerR : innerR;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    graphics.fillPoints(points, true);
  });

  const infoW = LAYOUT.INFO_PANEL.WIDTH;
  const infoH = LAYOUT.INFO_PANEL.HEIGHT;
  maybeGenerateTexture(scene, TEXTURES.INFO_PANEL_BG, infoW, infoH, (graphics) => {
    graphics.fillStyle(PALETTE.OVERLAY_WOOD, 0.95);
    graphics.fillRoundedRect(0, 0, infoW, infoH, { tl: 12, tr: 12, bl: 0, br: 0 });
    graphics.lineStyle(2, 0x5c4030, 1);
    graphics.strokeRoundedRect(1, 1, infoW - 2, infoH - 2, {
      tl: 12,
      tr: 12,
      bl: 0,
      br: 0,
    });
  });

  maybeGenerateTexture(scene, TEXTURES.NOISE_DOT_EMPTY, 18, 18, (graphics) => {
    graphics.lineStyle(2, 0xf3d7b8, 1);
    graphics.strokeCircle(9, 9, 7);
  });

  maybeGenerateTexture(scene, TEXTURES.NOISE_DOT_FILLED, 18, 18, (graphics) => {
    graphics.fillStyle(PALETTE.BUST, 1);
    graphics.fillCircle(9, 9, 7);
    graphics.lineStyle(2, 0x6b1e1a, 1);
    graphics.strokeCircle(9, 9, 7);
  });

  maybeGenerateTexture(scene, TEXTURES.LOCK_ICON, 20, 20, (graphics) => {
    graphics.fillStyle(0x3f3f3f, 1);
    graphics.fillRoundedRect(3, 9, 14, 9, 2);
    graphics.lineStyle(2, 0xf1e6c8, 1);
    graphics.strokeRoundedRect(5, 2, 10, 10, 4);
  });
};

const EMOJI_TEXTURE_SIZE = 128;
const EMOJI_FONT_SIZE = 96;
const EMOJI_FONT_STACK = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
const EMOJI_FALLBACK_BG = '#8b6914';
const EMOJI_FALLBACK_TEXT = '#f8f3e5';

const hasCenterPixelContent = (ctx: CanvasRenderingContext2D): boolean => {
  const sampleStart = EMOJI_TEXTURE_SIZE / 2 - 2;
  const imageData = ctx.getImageData(sampleStart, sampleStart, 4, 4).data;
  for (let i = 3; i < imageData.length; i += 4) {
    if (imageData[i] > 0) {
      return true;
    }
  }
  return false;
};

const drawEmojiFallback = (ctx: CanvasRenderingContext2D, animalId: AnimalId): void => {
  const center = EMOJI_TEXTURE_SIZE / 2;
  ctx.clearRect(0, 0, EMOJI_TEXTURE_SIZE, EMOJI_TEXTURE_SIZE);
  ctx.fillStyle = EMOJI_FALLBACK_BG;
  ctx.beginPath();
  ctx.arc(center, center, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = EMOJI_FALLBACK_TEXT;
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(animalId[0], center, center);
};

const generateEmojiTextures = (scene: Phaser.Scene): void => {
  const animalIds = Object.keys(EMOJI_MAP) as AnimalId[];
  for (const animalId of animalIds) {
    let texture: Phaser.Textures.Texture | Phaser.Textures.CanvasTexture | null = null;

    if (scene.textures.exists(animalId)) {
      texture = scene.textures.get(animalId);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = EMOJI_TEXTURE_SIZE;
      canvas.height = EMOJI_TEXTURE_SIZE;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        continue;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${EMOJI_FONT_SIZE}px ${EMOJI_FONT_STACK}`;
      ctx.fillText(EMOJI_MAP[animalId], EMOJI_TEXTURE_SIZE / 2, EMOJI_TEXTURE_SIZE / 2);

      if (!hasCenterPixelContent(ctx)) {
        drawEmojiFallback(ctx, animalId);
      }

      texture = scene.textures.addCanvas(animalId, canvas);
    }

    texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  create(): void {
    generateBitmapFont(this);
    generateProceduralTextures(this);
    generateShapeTextures(this);
    generateEmojiTextures(this);

    this.scene.start(SceneKey.Barn);
  }
}
