import Phaser from 'phaser';
import { LAYOUT, PALETTE, TEXTURES } from '../config/constants';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

type Rng = () => number;

type PaperVariant = 'parchment' | 'noisy' | 'legendary' | 'insert';

interface KnotSpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

interface WoodOptions {
  baseColor: number;
  highlightColor: number;
  grainColor: number;
  lightGrainColor: number;
  knotColor: number;
  plankCount: number;
  seam: number;
  variation: number;
}

export const fnv1a32 = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const mulberry32 = (seed: number): (() => number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const randRange = (rng: Rng, min: number, max: number): number => {
  return min + (max - min) * rng();
};

const chance = (rng: Rng, threshold: number): boolean => {
  return rng() < threshold;
};

const hexToRgb = (hex: number): Rgb => {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
};

const adjustRgb = (hex: number, delta: number): Rgb => {
  const rgb = hexToRgb(hex);
  return {
    r: clamp(Math.round(rgb.r + delta), 0, 255),
    g: clamp(Math.round(rgb.g + delta), 0, 255),
    b: clamp(Math.round(rgb.b + delta), 0, 255),
  };
};

const mixRgb = (a: number, b: number, t: number): Rgb => {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  return {
    r: Math.round(ar.r + (br.r - ar.r) * t),
    g: Math.round(ar.g + (br.g - ar.g) * t),
    b: Math.round(ar.b + (br.b - ar.b) * t),
  };
};

const rgbToStyle = (rgb: Rgb, alpha = 1): string => {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

const colorToStyle = (hex: number, alpha = 1): string => {
  return rgbToStyle(hexToRgb(hex), alpha);
};

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const createCanvasTexture = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, rng: Rng) => void,
): void => {
  if (scene.textures.exists(key)) {
    return;
  }

  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) {
    return;
  }
  const ctx = texture.getContext();
  const rng = mulberry32(fnv1a32(key));

  ctx.clearRect(0, 0, width, height);
  draw(ctx, rng);
  texture.refresh();
};

const drawWoodTile = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: Rng,
  options: WoodOptions,
): void => {
  const plankCount = options.plankCount;
  const seam = options.seam;
  const plankHeight = Math.floor((height - seam * (plankCount - 1)) / plankCount);

  ctx.fillStyle = colorToStyle(options.baseColor, 1);
  ctx.fillRect(0, 0, width, height);

  for (let plankIndex = 0; plankIndex < plankCount; plankIndex += 1) {
    const top = plankIndex * (plankHeight + seam);
    const isLast = plankIndex === plankCount - 1;
    const heightForPlank = isLast ? height - top : plankHeight;
    const jitter = randRange(rng, -options.variation, options.variation);
    const plankColor = adjustRgb(options.baseColor, jitter);

    ctx.fillStyle = rgbToStyle(plankColor, 1);
    ctx.fillRect(0, top, width, heightForPlank);

    ctx.fillStyle = colorToStyle(options.highlightColor, 0.28);
    ctx.fillRect(0, top, width, 1);

    ctx.fillStyle = colorToStyle(options.grainColor, 0.22);
    ctx.fillRect(0, top + heightForPlank - 2, width, 2);

    const knotCount = Math.floor(randRange(rng, 0, 3));
    const knots: KnotSpec[] = [];
    for (let i = 0; i < knotCount; i += 1) {
      knots.push({
        x: randRange(rng, 12, width - 12),
        y: randRange(rng, top + 7, top + heightForPlank - 7),
        rx: randRange(rng, 4, 9),
        ry: randRange(rng, 2, 5),
      });
    }

    const grainStart = top + 3;
    const grainEnd = top + heightForPlank - 4;
    let grainLineIndex = 0;
    for (let baseY = grainStart; baseY <= grainEnd; baseY += 3) {
      const phaseA = randRange(rng, 0, width * 3);
      const phaseB = randRange(rng, 0, width * 4);
      let walk = 0;

      for (let x = 0; x < width; x += 1) {
        if (x % 6 === 0) {
          walk = clamp(walk + randRange(rng, -0.4, 0.4), -1.8, 1.8);
        }

        const sinOffset =
          Math.sin((x + phaseA) * 0.09) * 1.6 + Math.sin((x + phaseB) * 0.23) * 0.8 + walk;

        let knotDeflect = 0;
        for (const knot of knots) {
          const dx = x - knot.x;
          const dy = baseY + sinOffset - knot.y;
          const d2 = dx * dx + dy * dy;
          const bend = 5 * Math.exp(-(d2 * d2) / (72 * 72));
          if (Math.sqrt(d2) < 12) {
            knotDeflect += dy >= 0 ? bend : -bend;
          }
        }

        const y = Math.round(baseY + sinOffset + knotDeflect);
        if (y >= top && y < top + heightForPlank) {
          ctx.fillStyle = colorToStyle(options.grainColor, 0.18);
          ctx.fillRect(x, y, 1, 1);

          if (grainLineIndex % 3 === 0) {
            ctx.fillStyle = colorToStyle(options.lightGrainColor, 0.1);
            ctx.fillRect(x, Math.min(y + 1, top + heightForPlank - 1), 1, 1);
          }
        }
      }

      grainLineIndex += 1;
    }

    for (const knot of knots) {
      ctx.fillStyle = colorToStyle(options.knotColor, 0.65);
      ctx.beginPath();
      ctx.ellipse(knot.x, knot.y, knot.rx, knot.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      const rings = Math.floor(randRange(rng, 2, 4));
      for (let ring = 1; ring <= rings; ring += 1) {
        ctx.strokeStyle = colorToStyle(options.grainColor, 0.28 - ring * 0.05);
        ctx.beginPath();
        ctx.ellipse(knot.x, knot.y, knot.rx + ring * 1.2, knot.ry + ring * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const speckCount = Math.floor(randRange(rng, 18, 25));
    for (let i = 0; i < speckCount; i += 1) {
      ctx.fillStyle = colorToStyle(options.grainColor, 0.22);
      ctx.fillRect(
        randRange(rng, 0, width),
        randRange(rng, top + 1, top + heightForPlank - 1),
        1,
        1,
      );
    }

    const crackCount = Math.floor(randRange(rng, 1, 3));
    for (let i = 0; i < crackCount; i += 1) {
      const startX = randRange(rng, 6, width - 12);
      const startY = randRange(rng, top + 4, top + heightForPlank - 4);
      const length = randRange(rng, 10, 24);
      ctx.strokeStyle = colorToStyle(options.grainColor, 0.2);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + length, startY + randRange(rng, -2, 2));
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(0, 0, 3, height);
  ctx.fillRect(width - 3, 0, 3, height);
};

const drawSimpleWoodPanel = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: Rng,
  baseColor: number,
): void => {
  ctx.fillStyle = colorToStyle(baseColor, 1);
  ctx.fillRect(0, 0, width, height);

  const lines = Math.max(6, Math.floor(height / 5));
  for (let i = 0; i < lines; i += 1) {
    const y = Math.floor((i / lines) * height) + randRange(rng, -1, 1);
    const jitter = randRange(rng, -18, 12);
    ctx.strokeStyle = rgbToStyle(adjustRgb(baseColor, jitter), 0.24);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + randRange(rng, -1, 1));
    ctx.stroke();
  }
};

const drawSkyGradientStrip = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void => {
  const topBand = Math.round(height * 0.45);
  const midBand = Math.round(height * 0.35);
  const lowBand = height - topBand - midBand;

  ctx.fillStyle = colorToStyle(PALETTE.NIGHT_PLUM, 1);
  ctx.fillRect(0, 0, width, topBand);
  ctx.fillStyle = colorToStyle(PALETTE.SKY_TOP, 1);
  ctx.fillRect(0, topBand, width, midBand);

  const gradient = ctx.createLinearGradient(0, topBand + midBand, 0, height);
  gradient.addColorStop(0, colorToStyle(PALETTE.SKY_MID, 1));
  gradient.addColorStop(1, colorToStyle(PALETTE.SUNSET_GLOW, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, topBand + midBand, width, lowBand);
};

export const generateBarnPlankTile = (scene: Phaser.Scene): void => {
  createCanvasTexture(scene, TEXTURES.BARN_PLANK_TILE, 128, 128, (ctx, rng) => {
    drawWoodTile(ctx, 128, 128, rng, {
      baseColor: PALETTE.BARN_BASE,
      highlightColor: PALETTE.BARN_HIGHLIGHT,
      grainColor: PALETTE.WARM_SHADOW,
      lightGrainColor: PALETTE.BARN_LIGHT,
      knotColor: PALETTE.BARN_KNOT,
      plankCount: 5,
      seam: 1,
      variation: 8,
    });
  });
};

export const generateTradingPostWall = (scene: Phaser.Scene): void => {
  createCanvasTexture(scene, TEXTURES.TRADING_POST_BG, 128, 128, (ctx, rng) => {
    drawWoodTile(ctx, 128, 128, rng, {
      baseColor: 0x704b34,
      highlightColor: 0xa86b4a,
      grainColor: 0x3c2618,
      lightGrainColor: 0x9f7250,
      knotColor: 0x3b2419,
      plankCount: 5,
      seam: 1,
      variation: 10,
    });
  });
};

export const generateOverlayWood = (scene: Phaser.Scene, width = 256, height = 256): void => {
  createCanvasTexture(scene, TEXTURES.OVERLAY_BG, width, height, (ctx, rng) => {
    drawWoodTile(ctx, width, height, rng, {
      baseColor: PALETTE.OVERLAY_WOOD,
      highlightColor: 0x5a3020,
      grainColor: 0x180f0b,
      lightGrainColor: 0x6a3b26,
      knotColor: 0x120a07,
      plankCount: 6,
      seam: 1,
      variation: 7,
    });
  });
};

export const generateStrawFloorTile = (scene: Phaser.Scene): void => {
  createCanvasTexture(scene, TEXTURES.FLOOR_STRAW_TILE, 128, 128, (ctx, rng) => {
    ctx.fillStyle = colorToStyle(PALETTE.STRAW, 1);
    ctx.fillRect(0, 0, 128, 128);

    const bandH = Math.ceil(128 / 6);
    for (let i = 0; i < 6; i += 1) {
      const y = i * bandH;
      const t = i / 5;
      const top = mixRgb(PALETTE.STRAW_DARK, PALETTE.STRAW, Math.min(t * 1.2, 1));
      const bottom = mixRgb(PALETTE.STRAW, PALETTE.STRAW_SHADOW, Math.max((t - 0.5) * 2, 0));
      const mixed = {
        r: Math.round((top.r + bottom.r) / 2),
        g: Math.round((top.g + bottom.g) / 2),
        b: Math.round((top.b + bottom.b) / 2),
      };
      ctx.fillStyle = rgbToStyle(mixed, 0.18);
      ctx.fillRect(0, y, 128, bandH + 1);
    }

    for (let i = 0; i < 180; i += 1) {
      const x = randRange(rng, -8, 136);
      const y = randRange(rng, 0, 128);
      const length = randRange(rng, 6, 18);
      const angle = (randRange(rng, -32, 24) * Math.PI) / 180;
      const bucketRoll = rng();
      const color =
        bucketRoll < 0.5
          ? PALETTE.STRAW
          : bucketRoll < 0.8
            ? PALETTE.STRAW_HIGHLIGHT
            : PALETTE.STRAW_SHADOW;
      const alpha = randRange(rng, 0.35, 0.65);
      ctx.strokeStyle = colorToStyle(color, alpha);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    for (let i = 0; i < 30; i += 1) {
      const x = randRange(rng, 0, 128);
      const y = randRange(rng, 0, 128);
      const length = randRange(rng, 2, 4);
      const angle = randRange(rng, -Math.PI, Math.PI);
      ctx.strokeStyle = colorToStyle(PALETTE.STRAW_SHADOW, randRange(rng, 0.22, 0.4));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    for (let i = 0; i < 10; i += 1) {
      const x = randRange(rng, 8, 120);
      const y = randRange(rng, 10, 118);
      const rx = randRange(rng, 8, 20);
      const ry = randRange(rng, 3, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, randRange(rng, -0.6, 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 122, 128, 6);

    ctx.fillStyle = colorToStyle(PALETTE.PARCHMENT, 0.08);
    ctx.fillRect(0, 0, 128, 4);
  });
};

export const generatePaperTexture = (
  scene: Phaser.Scene,
  key: string,
  baseColor: number,
  width: number,
  height: number,
  variant: PaperVariant,
): void => {
  createCanvasTexture(scene, key, width, height, (ctx, rng) => {
    const radius = 10;

    drawRoundedRectPath(ctx, 0, 0, width, height, radius);
    ctx.fillStyle = colorToStyle(baseColor, 1);
    ctx.fill();

    ctx.save();
    drawRoundedRectPath(ctx, 0, 0, width, height, radius);
    ctx.clip();

    const mottleCounts = [12, 18, 10, 8];
    const mottleColors = [0xd9c8a0, 0xc9b084, 0xf5e9c9];
    mottleCounts.forEach((count, pass) => {
      for (let i = 0; i < count; i += 1) {
        const x = randRange(rng, -8, width + 8);
        const y = randRange(rng, -8, height + 8);
        const r = randRange(rng, 3, 12);
        const color = mottleColors[Math.floor(randRange(rng, 0, mottleColors.length))];
        const alpha = randRange(rng, 0.03, 0.08) * (pass % 2 === 0 ? 1 : 0.9);
        ctx.fillStyle = colorToStyle(color, alpha);
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          r,
          r * randRange(rng, 0.6, 1.4),
          randRange(rng, -0.7, 0.7),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    });

    for (let i = 0; i < 40; i += 1) {
      const x = randRange(rng, 0, width);
      const y = randRange(rng, 0, height);
      const length = randRange(rng, 3, 10);
      const angle = randRange(rng, 0, Math.PI * 2);
      ctx.strokeStyle = colorToStyle(PALETTE.PAPER_GRAIN, randRange(rng, 0.08, 0.14));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = colorToStyle(PALETTE.WARM_SHADOW, randRange(rng, 0.03, 0.06));
      ctx.fillRect(randRange(rng, 0, width), randRange(rng, 0, height), 1, 1);
    }

    const centerGradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      6,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.6,
    );
    centerGradient.addColorStop(0, 'rgba(255,255,255,0.1)');
    centerGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = centerGradient;
    ctx.fillRect(0, 0, width, height);

    if (variant === 'noisy') {
      ctx.fillStyle = colorToStyle(PALETTE.NOISY_CARD, 0.18);
      ctx.fillRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, Math.floor(height * 0.75), 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, colorToStyle(PALETTE.WARM_SHADOW, 0.22));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, Math.floor(height * 0.7), width, Math.ceil(height * 0.3));
    }

    if (variant === 'legendary') {
      for (let i = 0; i < 48; i += 1) {
        ctx.fillStyle = colorToStyle(PALETTE.GOLD_SPARKLE, randRange(rng, 0.35, 0.8));
        ctx.fillRect(randRange(rng, 3, width - 3), randRange(rng, 3, height - 3), 1, 1);
      }

      ctx.strokeStyle = colorToStyle(0x6d5312, 1);
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, 1.5, 1.5, width - 3, height - 3, radius);
      ctx.stroke();

      ctx.strokeStyle = colorToStyle(PALETTE.GOLD_SPARKLE, 1);
      ctx.lineWidth = 1;
      drawRoundedRectPath(ctx, 4.5, 4.5, width - 9, height - 9, Math.max(radius - 2, 2));
      ctx.stroke();

      const corner = (x: number, y: number, sx: number, sy: number): void => {
        ctx.strokeStyle = colorToStyle(PALETTE.GOLD_SPARKLE, 0.92);
        ctx.beginPath();
        ctx.moveTo(x, y + sy * 6);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * 6, y);
        ctx.stroke();
      };

      corner(6, 6, 1, 1);
      corner(width - 6, 6, -1, 1);
      corner(6, height - 6, 1, -1);
      corner(width - 6, height - 6, -1, -1);
    }

    if (variant === 'insert') {
      ctx.fillStyle = colorToStyle(PALETTE.PARCHMENT, 0.16);
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();

    ctx.strokeStyle = colorToStyle(PALETTE.PARCHMENT_STROKE, 0.9);
    ctx.lineWidth = 2;
    drawRoundedRectPath(ctx, 1, 1, width - 2, height - 2, radius);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(3, 3);
    ctx.lineTo(width - 3, 3);
    ctx.lineTo(width - 3, 6);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(3, height - 3);
    ctx.lineTo(width - 3, height - 3);
    ctx.lineTo(width - 3, height - 6);
    ctx.stroke();
  });
};

export const generateDeckBack = (scene: Phaser.Scene): void => {
  createCanvasTexture(scene, TEXTURES.DECK_BACK, 64, 82, (ctx, rng) => {
    drawRoundedRectPath(ctx, 0, 0, 64, 82, 8);
    ctx.fillStyle = '#2b2148';
    ctx.fill();

    drawRoundedRectPath(ctx, 5, 5, 54, 72, 6);
    ctx.fillStyle = '#43326d';
    ctx.fill();

    ctx.strokeStyle = '#f4e7c3';
    ctx.lineWidth = 1;
    drawRoundedRectPath(ctx, 4.5, 4.5, 55, 73, 6);
    ctx.stroke();

    ctx.strokeStyle = '#b78f46';
    drawRoundedRectPath(ctx, 7.5, 7.5, 49, 67, 5);
    ctx.stroke();

    ctx.strokeStyle = '#f4e7c3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, 26);
    ctx.lineTo(44, 41);
    ctx.lineTo(32, 56);
    ctx.lineTo(20, 41);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#b78f46';
    ctx.beginPath();
    ctx.moveTo(32, 30);
    ctx.lineTo(40, 41);
    ctx.lineTo(32, 52);
    ctx.lineTo(24, 41);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f4e7c3';
    ctx.fillRect(31, 21, 2, 2);
    ctx.fillRect(31, 59, 2, 2);
    ctx.fillRect(16, 40, 2, 2);
    ctx.fillRect(46, 40, 2, 2);

    const ornament = (x: number, y: number, sx: number, sy: number): void => {
      ctx.strokeStyle = '#d2b779';
      ctx.beginPath();
      ctx.moveTo(x, y + sy * 6);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * 6, y);
      ctx.stroke();
    };

    ornament(9, 9, 1, 1);
    ornament(55, 9, -1, 1);
    ornament(9, 73, 1, -1);
    ornament(55, 73, -1, -1);

    for (let i = 0; i < 24; i += 1) {
      ctx.fillStyle = colorToStyle(0xf4e7c3, randRange(rng, 0.35, 0.8));
      ctx.fillRect(randRange(rng, 6, 58), randRange(rng, 6, 76), 1, 1);
    }
  });
};

export const generateFarmhouse = (scene: Phaser.Scene): void => {
  const width = LAYOUT.FARMHOUSE.WIDTH;
  const height = LAYOUT.FARMHOUSE.HEIGHT;

  createCanvasTexture(scene, TEXTURES.FARMHOUSE, width, height, (ctx) => {
    const bodyX = Math.round(width * 0.12);
    const bodyY = Math.round(height * 0.34);
    const bodyW = width - bodyX * 2;
    const bodyH = height - bodyY - 3;

    ctx.fillStyle = '#37435c';
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

    for (let y = bodyY + 3; y < bodyY + bodyH - 2; y += 5) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(bodyX, y, bodyW, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(bodyX, y + 4, bodyW, 1);
    }

    const roofPeakX = Math.round(width * 0.5);
    const roofPeakY = 2;
    const roofLeftX = Math.round(width * 0.06);
    const roofRightX = width - roofLeftX;
    const roofY = bodyY + 1;
    ctx.fillStyle = '#5b2f24';
    ctx.beginPath();
    ctx.moveTo(roofLeftX, roofY);
    ctx.lineTo(roofPeakX, roofPeakY);
    ctx.lineTo(roofRightX, roofY);
    ctx.closePath();
    ctx.fill();

    const shingleH = 3;
    for (let row = 0; row < 4; row += 1) {
      const y = 6 + row * shingleH;
      const tileW = 7;
      const offset = row % 2 === 0 ? 0 : Math.round(tileW / 2);
      for (let x = roofLeftX + 3 + offset; x <= roofRightX - 7; x += tileW) {
        ctx.fillStyle = '#6d3c2d';
        ctx.fillRect(x, y, tileW, shingleH);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, y + shingleH - 1, tileW, 1);
      }
    }

    const doorW = Math.round(width * 0.2);
    const doorH = Math.round(height * 0.33);
    const doorX = Math.round(width * 0.5 - doorW / 2);
    const doorY = height - doorH - 3;
    ctx.fillStyle = '#6d4731';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.strokeStyle = '#9f7455';
    ctx.strokeRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = '#e4bf7d';
    ctx.fillRect(doorX + doorW - 4, doorY + Math.round(doorH * 0.55), 2, 2);

    const windowX = LAYOUT.FARMHOUSE.WINDOW.OFFSET_X;
    const windowY = LAYOUT.FARMHOUSE.WINDOW.OFFSET_Y;
    const windowW = LAYOUT.FARMHOUSE.WINDOW.WIDTH;
    const windowH = LAYOUT.FARMHOUSE.WINDOW.HEIGHT;
    ctx.fillStyle = '#28456a';
    ctx.fillRect(windowX, windowY, windowW, windowH);
    ctx.strokeStyle = '#d8c79f';
    ctx.strokeRect(windowX, windowY, windowW, windowH);
    ctx.fillStyle = 'rgba(255, 194, 112, 0.35)';
    ctx.fillRect(windowX + 1, windowY + 1, windowW - 2, windowH - 2);
    ctx.strokeStyle = '#d8c79f';
    ctx.beginPath();
    ctx.moveTo(windowX + Math.round(windowW / 2), windowY);
    ctx.lineTo(windowX + Math.round(windowW / 2), windowY + windowH);
    ctx.moveTo(windowX, windowY + Math.round(windowH / 2));
    ctx.lineTo(windowX + windowW, windowY + Math.round(windowH / 2));
    ctx.stroke();

    const chimneyW = Math.max(8, Math.round(width * 0.12));
    const chimneyH = Math.max(12, Math.round(height * 0.2));
    const chimneyX = width - chimneyW - 10;
    const chimneyY = 8;
    ctx.fillStyle = '#4f4c50';
    ctx.fillRect(chimneyX, chimneyY, chimneyW, chimneyH);
  });
};

export const generateWindowGlow = (scene: Phaser.Scene): void => {
  createCanvasTexture(scene, TEXTURES.WINDOW_GLOW, 48, 36, (ctx) => {
    ctx.fillStyle = 'rgba(255, 199, 88, 0.75)';
    drawRoundedRectPath(ctx, 11, 8, 26, 18, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(247, 142, 63, 0.32)';
    drawRoundedRectPath(ctx, 7, 5, 34, 24, 7);
    ctx.fill();

    ctx.fillStyle = 'rgba(242, 133, 67, 0.12)';
    drawRoundedRectPath(ctx, 2, 1, 44, 31, 10);
    ctx.fill();
  });
};

export const generateRafter = (scene: Phaser.Scene): void => {
  createCanvasTexture(scene, TEXTURES.RAFTER, 160, 42, (ctx, rng) => {
    drawWoodTile(ctx, 160, 42, rng, {
      baseColor: PALETTE.BARN_DARK,
      highlightColor: PALETTE.BARN_HIGHLIGHT,
      grainColor: PALETTE.WARM_SHADOW,
      lightGrainColor: PALETTE.BARN_LIGHT,
      knotColor: PALETTE.BARN_KNOT,
      plankCount: 1,
      seam: 0,
      variation: 12,
    });

    for (let i = 0; i < 8; i += 1) {
      const x = randRange(rng, 8, 152);
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x + randRange(rng, -1, 1), 38);
      ctx.stroke();
    }

    for (let i = 0; i < 4; i += 1) {
      const x = randRange(rng, 12, 148);
      const y = randRange(rng, 10, 32);
      ctx.fillStyle = 'rgba(34,18,12,0.9)';
      ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, y, 1, 1);
    }
  });
};

export const generatePaintedButton = (
  scene: Phaser.Scene,
  key: string,
  baseColor: number,
  width: number,
  height: number,
): void => {
  createCanvasTexture(scene, key, width, height, (ctx, rng) => {
    drawRoundedRectPath(ctx, 0, 6, width - 8, height - 8, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    ctx.save();
    drawRoundedRectPath(ctx, 0, 0, width, height - 6, 12);
    ctx.clip();

    drawSimpleWoodPanel(ctx, width, height - 6, rng, PALETTE.BARN_DARK);
    ctx.fillStyle = colorToStyle(baseColor, randRange(rng, 0.82, 0.9));
    ctx.fillRect(0, 0, width, height - 6);

    const chipCount = Math.floor(randRange(rng, 12, 21));
    for (let i = 0; i < chipCount; i += 1) {
      const x = chance(rng, 0.5) ? randRange(rng, 1, width - 3) : chance(rng, 0.5) ? 1 : width - 3;
      const y = randRange(rng, 1, height - 10);
      ctx.fillStyle = colorToStyle(0xffffff, randRange(rng, 0.06, 0.18));
      ctx.fillRect(x, y, chance(rng, 0.4) ? 2 : 1, 1);
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(width - 10, 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.moveTo(10, height - 8);
    ctx.lineTo(width - 10, height - 8);
    ctx.stroke();

    ctx.strokeStyle = colorToStyle(PALETTE.WARM_SHADOW, 0.7);
    ctx.lineWidth = 2;
    drawRoundedRectPath(ctx, 1, 1, width - 2, height - 8, 11);
    ctx.stroke();
  });
};

export const generateVignette = (
  scene: Phaser.Scene,
  width = LAYOUT.CANVAS.REF_WIDTH,
  height = LAYOUT.CANVAS.REF_HEIGHT,
): void => {
  createCanvasTexture(scene, TEXTURES.VIGNETTE, width, height, (ctx, rng) => {
    const image = ctx.createImageData(width, height);
    const steps = 24;
    const cx = width / 2;
    const cy = height / 2;
    const maxD = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const normalized = Math.sqrt(dx * dx + dy * dy) / maxD;
        const edge = clamp((normalized - 0.46) / 0.54, 0, 1);
        const quantized = Math.floor(edge * steps) / steps;
        const dither = (rng() - 0.5) * (1 / steps) * 1.1;
        const alpha = clamp((quantized + dither) * 0.85, 0, 1);
        const offset = (y * width + x) * 4;
        image.data[offset] = 0;
        image.data[offset + 1] = 0;
        image.data[offset + 2] = 0;
        image.data[offset + 3] = Math.round(alpha * 255);
      }
    }

    ctx.putImageData(image, 0, 0);
  });
};

export const generateCardShadow = (
  scene: Phaser.Scene,
  width = LAYOUT.SLOT.WIDTH,
  height = LAYOUT.SLOT.HEIGHT,
): void => {
  createCanvasTexture(scene, TEXTURES.CARD_SHADOW, width, height, (ctx) => {
    ctx.clearRect(0, 0, width, height);

    const centerX = width * 0.5;
    const baseY = height * 0.64;
    for (let i = 0; i < 6; i += 1) {
      const t = i / 5;
      ctx.fillStyle = `rgba(0,0,0,${0.12 - t * 0.018})`;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        baseY + i * 0.8,
        width * (0.46 + t * 0.1),
        height * (0.23 + t * 0.09),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  });
};

const drawSoftCircle = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  coreRadius: number,
  midRadius: number,
  outerRadius: number,
): void => {
  createCanvasTexture(scene, key, width, height, (ctx) => {
    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        let alpha = 0;
        if (d <= coreRadius) {
          alpha = 1;
        } else if (d <= midRadius) {
          alpha = 0.5;
        } else if (d <= outerRadius) {
          alpha = 0.2;
        }

        if (alpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  });
};

export const generateParticleTextures = (scene: Phaser.Scene): void => {
  drawSoftCircle(scene, TEXTURES.FX_DUST, 8, 8, 1.8, 2.8, 3.4);
  drawSoftCircle(scene, TEXTURES.FX_PUFF, 12, 12, 2.6, 4.1, 5.1);

  createCanvasTexture(scene, TEXTURES.FX_SPARK, 8, 8, (ctx) => {
    const set = (x: number, y: number, alpha: number): void => {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    };

    set(3, 3, 1);
    set(4, 3, 1);
    set(3, 4, 1);
    set(4, 4, 1);
    set(3, 1, 0.5);
    set(3, 2, 0.7);
    set(3, 5, 0.7);
    set(3, 6, 0.5);
    set(4, 1, 0.5);
    set(4, 2, 0.7);
    set(4, 5, 0.7);
    set(4, 6, 0.5);
    set(1, 3, 0.5);
    set(2, 3, 0.7);
    set(5, 3, 0.7);
    set(6, 3, 0.5);
    set(1, 4, 0.5);
    set(2, 4, 0.7);
    set(5, 4, 0.7);
    set(6, 4, 0.5);
    set(2, 2, 0.2);
    set(5, 2, 0.2);
    set(2, 5, 0.2);
    set(5, 5, 0.2);
  });

  createCanvasTexture(scene, TEXTURES.FX_CHAFF, 10, 4, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 1, 10, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(1, 1, 8, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(2, 1, 6, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(1, 0, 1, 1);
    ctx.fillRect(8, 3, 1, 1);
  });
};

const generateSkyBand = (scene: Phaser.Scene): void => {
  createCanvasTexture(scene, TEXTURES.BARN_PLANK, 390, 88, (ctx) => {
    drawSkyGradientStrip(ctx, 390, 88);
  });
};

export const generateProceduralTextures = (scene: Phaser.Scene): void => {
  generateSkyBand(scene);
  generateBarnPlankTile(scene);
  generateStrawFloorTile(scene);
  generateTradingPostWall(scene);
  generateOverlayWood(scene);
  generatePaperTexture(
    scene,
    TEXTURES.CARD_PARCHMENT,
    PALETTE.PARCHMENT,
    LAYOUT.SLOT.WIDTH,
    LAYOUT.SLOT.HEIGHT,
    'parchment',
  );
  generatePaperTexture(
    scene,
    TEXTURES.CARD_NOISY,
    PALETTE.PARCHMENT,
    LAYOUT.SLOT.WIDTH,
    LAYOUT.SLOT.HEIGHT,
    'noisy',
  );
  generatePaperTexture(
    scene,
    TEXTURES.CARD_LEGENDARY,
    0xf5e6b8,
    LAYOUT.SLOT.WIDTH,
    LAYOUT.SLOT.HEIGHT,
    'legendary',
  );
  generatePaperTexture(
    scene,
    TEXTURES.SHOP_CARD_PARCHMENT,
    PALETTE.PARCHMENT,
    LAYOUT.SHOP_CARD.TEX_WIDTH,
    LAYOUT.SHOP_CARD.TEX_HEIGHT,
    'parchment',
  );
  generatePaperTexture(
    scene,
    TEXTURES.SHOP_CARD_NOISY,
    PALETTE.PARCHMENT,
    LAYOUT.SHOP_CARD.TEX_WIDTH,
    LAYOUT.SHOP_CARD.TEX_HEIGHT,
    'noisy',
  );
  generatePaperTexture(
    scene,
    TEXTURES.SHOP_CARD_LEGENDARY,
    0xf5e6b8,
    LAYOUT.SHOP_CARD.TEX_WIDTH,
    LAYOUT.SHOP_CARD.TEX_HEIGHT,
    'legendary',
  );
  generatePaintedButton(scene, TEXTURES.BUTTON_PRIMARY, PALETTE.BUTTON_PRIMARY, 350, 56);
  generatePaintedButton(scene, TEXTURES.BUTTON_SECONDARY, PALETTE.BUTTON_SECONDARY, 350, 56);
  generatePaintedButton(scene, TEXTURES.BUTTON_DANGER, PALETTE.BUST, 350, 56);
  generatePaintedButton(scene, TEXTURES.BUTTON_DISABLED, PALETTE.BUTTON_DISABLED, 350, 56);
  generateDeckBack(scene);
  generateFarmhouse(scene);
  generateWindowGlow(scene);
  generateRafter(scene);
  generateVignette(scene, LAYOUT.CANVAS.REF_WIDTH, LAYOUT.CANVAS.REF_HEIGHT);
  generateCardShadow(scene, LAYOUT.SLOT.WIDTH, LAYOUT.SLOT.HEIGHT);
  generateParticleTextures(scene);
};
