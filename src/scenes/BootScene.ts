import Phaser from 'phaser';
import { LAYOUT, PALETTE, TEXTURES } from '../config/constants';
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

const CARD_W = LAYOUT.SLOT.WIDTH;
const CARD_H = LAYOUT.SLOT.HEIGHT;

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    this.load.atlas('animals', 'assets/animals.png', 'assets/animals.json');
  }

  create(): void {
    // --- Card backgrounds ---
    maybeGenerateTexture(this, TEXTURES.CARD_PARCHMENT, CARD_W, CARD_H, (graphics) => {
      graphics.fillStyle(PALETTE.PARCHMENT, 1);
      graphics.fillRoundedRect(0, 0, CARD_W, CARD_H, 10);
      graphics.lineStyle(2, PALETTE.PARCHMENT_STROKE, 1);
      graphics.strokeRoundedRect(1, 1, CARD_W - 2, CARD_H - 2, 10);
      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(8, 8, CARD_W - 16, 8);
    });

    maybeGenerateTexture(this, TEXTURES.CARD_NOISY, CARD_W, CARD_H, (graphics) => {
      graphics.fillStyle(PALETTE.NOISY_CARD, 1);
      graphics.fillRoundedRect(0, 0, CARD_W, CARD_H, 10);
      graphics.lineStyle(2, PALETTE.BUST, 1);
      graphics.strokeRoundedRect(1, 1, CARD_W - 2, CARD_H - 2, 10);
      graphics.fillStyle(PALETTE.BUST, 0.2);
      graphics.fillRect(0, CARD_H - 26, CARD_W, 24);
    });

    // Legendary card background (gold-tinted parchment)
    maybeGenerateTexture(this, TEXTURES.CARD_LEGENDARY, CARD_W, CARD_H, (graphics) => {
      graphics.fillStyle(0xf5e6b8, 1);
      graphics.fillRoundedRect(0, 0, CARD_W, CARD_H, 10);
      graphics.lineStyle(2, PALETTE.LEGENDARY_BORDER, 1);
      graphics.strokeRoundedRect(1, 1, CARD_W - 2, CARD_H - 2, 10);
      graphics.fillStyle(PALETTE.LEGENDARY_GOLD, 0.2);
      graphics.fillRect(4, 4, CARD_W - 8, CARD_H - 8);
      graphics.fillStyle(0xffffff, 0.15);
      graphics.fillRect(8, 8, CARD_W - 16, 8);
    });

    // --- Slot outlines ---
    maybeGenerateTexture(this, TEXTURES.SLOT_EMPTY, CARD_W, CARD_H, (graphics) => {
      graphics.fillStyle(0x4f291f, 0.35);
      graphics.fillRoundedRect(0, 0, CARD_W, CARD_H, 10);
      graphics.lineStyle(2, 0x3a1f1b, 1);
      graphics.strokeRoundedRect(1, 1, CARD_W - 2, CARD_H - 2, 10);
    });

    maybeGenerateTexture(this, TEXTURES.SLOT_OCCUPIED, CARD_W, CARD_H, (graphics) => {
      graphics.fillStyle(PALETTE.SUCCESS, 0.22);
      graphics.fillRoundedRect(0, 0, CARD_W, CARD_H, 10);
      graphics.lineStyle(2, PALETTE.SUCCESS, 1);
      graphics.strokeRoundedRect(1, 1, CARD_W - 2, CARD_H - 2, 10);
    });

    // --- Small resource badges (24px, for shop/old) ---
    maybeGenerateTexture(this, TEXTURES.BADGE_MISCHIEF, 24, 24, (graphics) => {
      graphics.fillStyle(0xd9a441, 1);
      graphics.fillCircle(12, 12, 11);
      graphics.lineStyle(2, 0x7a4a13, 1);
      graphics.strokeCircle(12, 12, 11);
    });

    maybeGenerateTexture(this, TEXTURES.BADGE_HAY, 24, 24, (graphics) => {
      graphics.fillStyle(0x7fb76c, 1);
      graphics.fillCircle(12, 12, 11);
      graphics.lineStyle(2, 0x356b35, 1);
      graphics.strokeCircle(12, 12, 11);
    });

    // --- Large resource badges (32px, for barn cards) ---
    const BD = LAYOUT.BADGE.DIAMETER;
    const BR = BD / 2;
    maybeGenerateTexture(this, TEXTURES.BADGE_MISCHIEF_LG, BD, BD, (graphics) => {
      graphics.fillStyle(0xd9a441, 1);
      graphics.fillCircle(BR, BR, BR - 1);
      graphics.lineStyle(2, 0x7a4a13, 1);
      graphics.strokeCircle(BR, BR, BR - 1);
    });

    maybeGenerateTexture(this, TEXTURES.BADGE_HAY_LG, BD, BD, (graphics) => {
      graphics.fillStyle(0x7fb76c, 1);
      graphics.fillCircle(BR, BR, BR - 1);
      graphics.lineStyle(2, 0x356b35, 1);
      graphics.strokeCircle(BR, BR, BR - 1);
    });

    // --- NOISY! stripe (red diagonal across card top) ---
    maybeGenerateTexture(this, TEXTURES.BADGE_NOISY_STRIPE, CARD_W, 20, (graphics) => {
      graphics.fillStyle(PALETTE.BUST, 0.85);
      graphics.fillRect(0, 0, CARD_W, 20);
    });

    // --- Ability strip backgrounds (96x14, color-coded) ---
    maybeGenerateTexture(this, TEXTURES.ABILITY_STRIP_ACTIVE, CARD_W, 14, (graphics) => {
      graphics.fillStyle(PALETTE.ABILITY_ACTIVE, 0.9);
      graphics.fillRoundedRect(0, 0, CARD_W, 14, 3);
    });

    maybeGenerateTexture(this, TEXTURES.ABILITY_STRIP_PASSIVE, CARD_W, 14, (graphics) => {
      graphics.fillStyle(PALETTE.ABILITY_PASSIVE, 0.9);
      graphics.fillRoundedRect(0, 0, CARD_W, 14, 3);
    });

    maybeGenerateTexture(this, TEXTURES.ABILITY_STRIP_TRIGGERED, CARD_W, 14, (graphics) => {
      graphics.fillStyle(PALETTE.ABILITY_TRIGGERED, 0.9);
      graphics.fillRoundedRect(0, 0, CARD_W, 14, 3);
    });

    // --- Star icon (16x16 generated star shape) ---
    maybeGenerateTexture(this, TEXTURES.BADGE_STAR, 16, 16, (graphics) => {
      graphics.fillStyle(PALETTE.LEGENDARY_BORDER, 1);
      // Simple 5-point star
      const cx = 8;
      const cy = 8;
      const outerR = 7;
      const innerR = 3;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 2) * -1 + (Math.PI / 5) * i;
        const r = i % 2 === 0 ? outerR : innerR;
        points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      graphics.fillPoints(points, true);
    });

    // --- Info panel background ---
    const ipW = LAYOUT.INFO_PANEL.WIDTH;
    const ipH = LAYOUT.INFO_PANEL.HEIGHT;
    maybeGenerateTexture(this, TEXTURES.INFO_PANEL_BG, ipW, ipH, (graphics) => {
      graphics.fillStyle(0x1a1a1a, 0.92);
      graphics.fillRoundedRect(0, 0, ipW, ipH, { tl: 12, tr: 12, bl: 0, br: 0 });
      graphics.lineStyle(2, 0x444444, 1);
      graphics.strokeRoundedRect(1, 1, ipW - 2, ipH - 2, {
        tl: 12,
        tr: 12,
        bl: 0,
        br: 0,
      });
    });

    // --- Noise meter dots ---
    maybeGenerateTexture(this, TEXTURES.NOISE_DOT_EMPTY, 18, 18, (graphics) => {
      graphics.lineStyle(2, 0xf3d7b8, 1);
      graphics.strokeCircle(9, 9, 7);
    });

    maybeGenerateTexture(this, TEXTURES.NOISE_DOT_FILLED, 18, 18, (graphics) => {
      graphics.fillStyle(PALETTE.BUST, 1);
      graphics.fillCircle(9, 9, 7);
      graphics.lineStyle(2, 0x6b1e1a, 1);
      graphics.strokeCircle(9, 9, 7);
    });

    // --- Buttons ---
    maybeGenerateTexture(this, TEXTURES.BUTTON_PRIMARY, 350, 56, (graphics) => {
      graphics.fillStyle(0x2e1f18, 0.5);
      graphics.fillRoundedRect(4, 6, 342, 48, 12);
      graphics.fillStyle(PALETTE.BUTTON_PRIMARY, 1);
      graphics.fillRoundedRect(0, 0, 350, 50, 12);
      graphics.lineStyle(2, 0x1f5130, 1);
      graphics.strokeRoundedRect(1, 1, 348, 48, 12);
    });

    maybeGenerateTexture(this, TEXTURES.BUTTON_SECONDARY, 350, 56, (graphics) => {
      graphics.fillStyle(0x1d1d1d, 0.45);
      graphics.fillRoundedRect(4, 6, 342, 48, 12);
      graphics.fillStyle(PALETTE.BUTTON_SECONDARY, 1);
      graphics.fillRoundedRect(0, 0, 350, 50, 12);
      graphics.lineStyle(2, 0x1f3038, 1);
      graphics.strokeRoundedRect(1, 1, 348, 48, 12);
    });

    maybeGenerateTexture(this, TEXTURES.BUTTON_DISABLED, 350, 56, (graphics) => {
      graphics.fillStyle(0x222222, 0.5);
      graphics.fillRoundedRect(4, 6, 342, 48, 12);
      graphics.fillStyle(PALETTE.BUTTON_DISABLED, 1);
      graphics.fillRoundedRect(0, 0, 350, 50, 12);
      graphics.lineStyle(2, 0x333333, 1);
      graphics.strokeRoundedRect(1, 1, 348, 48, 12);
    });

    maybeGenerateTexture(this, TEXTURES.BUTTON_DANGER, 350, 56, (graphics) => {
      graphics.fillStyle(0x2e1818, 0.5);
      graphics.fillRoundedRect(4, 6, 342, 48, 12);
      graphics.fillStyle(PALETTE.BUST, 1);
      graphics.fillRoundedRect(0, 0, 350, 50, 12);
      graphics.lineStyle(2, 0x6b1e1a, 1);
      graphics.strokeRoundedRect(1, 1, 348, 48, 12);
    });

    // --- Environment ---
    maybeGenerateTexture(this, TEXTURES.BARN_PLANK, 390, 844, (graphics) => {
      graphics.fillStyle(PALETTE.SKY_TOP, 1);
      graphics.fillRect(0, 0, 390, 844);
      graphics.fillStyle(PALETTE.SKY_MID, 1);
      graphics.fillRect(0, 120, 390, 220);
      graphics.fillStyle(PALETTE.BARN_BASE, 1);
      graphics.fillRect(0, 88, 390, 600);
      graphics.fillStyle(PALETTE.BARN_DARK, 0.8);
      for (let y = 104; y < 680; y += 28) {
        graphics.fillRect(0, y, 390, 4);
      }
      graphics.fillStyle(PALETTE.BARN_LIGHT, 0.35);
      for (let x = 10; x < 390; x += 26) {
        graphics.fillRect(x, 90, 2, 584);
      }
    });

    maybeGenerateTexture(this, TEXTURES.RAFTER, 390, 42, (graphics) => {
      graphics.fillStyle(PALETTE.BARN_DARK, 1);
      graphics.fillRect(0, 0, 390, 42);
      graphics.fillStyle(0x3f1d18, 0.9);
      for (let x = 0; x < 390; x += 24) {
        graphics.fillRect(x, 0, 8, 42);
      }
    });

    maybeGenerateTexture(this, TEXTURES.FLOOR_STRAW, 390, 130, (graphics) => {
      graphics.fillStyle(PALETTE.STRAW, 1);
      graphics.fillRect(0, 0, 390, 130);
      graphics.fillStyle(PALETTE.STRAW_HIGHLIGHT, 0.45);
      for (let y = 8; y < 130; y += 12) {
        graphics.fillRect(0, y, 390, 3);
      }
      graphics.fillStyle(0xb37a2e, 0.25);
      for (let x = 6; x < 390; x += 16) {
        graphics.fillRect(x, 0, 3, 130);
      }
    });

    maybeGenerateTexture(this, TEXTURES.FARMHOUSE, 142, 116, (graphics) => {
      graphics.fillStyle(0x2b2f3f, 1);
      graphics.fillRoundedRect(0, 28, 142, 88, 8);
      graphics.fillStyle(0x1f2330, 1);
      graphics.fillTriangle(8, 30, 134, 30, 71, 0);
      graphics.fillStyle(0x171b26, 1);
      graphics.fillRect(10, 56, 18, 40);
      graphics.fillRect(114, 56, 18, 40);
    });

    maybeGenerateTexture(this, TEXTURES.WINDOW_GLOW, 34, 24, (graphics) => {
      graphics.fillStyle(PALETTE.WARNING, 1);
      graphics.fillRoundedRect(0, 0, 34, 24, 4);
    });

    maybeGenerateTexture(this, TEXTURES.DECK_BACK, 64, 82, (graphics) => {
      graphics.fillStyle(0x3e2d5c, 1);
      graphics.fillRoundedRect(0, 0, 64, 82, 8);
      graphics.fillStyle(0x6d56a1, 0.75);
      graphics.fillRoundedRect(7, 8, 50, 66, 6);
      graphics.lineStyle(2, 0xe8d7ff, 1);
      graphics.strokeRoundedRect(13, 14, 38, 54, 6);
      graphics.lineStyle(2, 0xe8d7ff, 1);
      graphics.strokeLineShape(new Phaser.Geom.Line(13, 14, 51, 68));
      graphics.strokeLineShape(new Phaser.Geom.Line(51, 14, 13, 68));
    });

    maybeGenerateTexture(this, TEXTURES.LOCK_ICON, 20, 20, (graphics) => {
      graphics.fillStyle(0x3f3f3f, 1);
      graphics.fillRoundedRect(3, 9, 14, 9, 2);
      graphics.lineStyle(2, 0xf1e6c8, 1);
      graphics.strokePath();
      graphics.strokeRoundedRect(5, 2, 10, 10, 4);
    });

    this.scene.start(SceneKey.Barn);
  }
}
