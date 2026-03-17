# Sprint 006: Emoji Animal Glyphs

## Overview

The 11 pixel art animal sprites in `animals.png` clash with Sprint 005's procedural aesthetic, and 12 animals have no sprite at all. This sprint replaces the atlas with emoji rendered to Phaser textures at boot time — every animal gets a glyph, the atlas files are deleted, and rendering call sites switch from atlas frames to individual texture keys.

---

## Architecture

### 1. Emoji Map (`src/config/emojiMap.ts`)

A single `Record<AnimalId, string>` mapping each of the 23 animals to an emoji character:

```typescript
import type { AnimalId } from '../game/types';

export const EMOJI_MAP: Record<AnimalId, string> = {
  BarnCat: '\u{1F431}',       // 🐱
  FeralGoat: '\u{1F410}',     // 🐐
  PotBelliedPig: '\u{1F437}', // 🐷
  Bunny: '\u{1F430}',         // 🐰
  Hen: '\u{1F414}',           // 🐔
  WildBoar: '\u{1F417}',      // 🐗
  HermitCrab: '\u{1F980}',    // 🦀
  DraftPony: '\u{1F434}',     // 🐴
  StruttingPeacock: '\u{1F99A}', // 🦚
  MilkmaidGoat: '\u{1F410}',  // 🐐 (goat, matching the name)
  HoneyBee: '\u{1F41D}',      // 🐝
  Sheepdog: '\u{1F415}',      // 🐕
  StableHand: '\u{1F9D1}\u{200D}\u{1F33E}', // 🧑‍🌾
  BorderCollie: '\u{1F9AE}',  // 🦮
  CheerfulLamb: '\u{1F40F}',  // 🐏
  GoldenGoose: '\u{1FABF}',   // 🪿
  GiantOx: '\u{1F402}',       // 🐂
  Jackalope: '\u{1F407}',     // 🐇
  Thunderbird: '\u{1F985}',   // 🦅
  SilverMare: '\u{1F984}',    // 🦄
  LuckyToad: '\u{1F438}',     // 🐸
  GreatStag: '\u{1F98C}',     // 🦌
  BarnDragon: '\u{1F409}',    // 🐉
};
```

Use Unicode escapes in source so the file is safe regardless of editor encoding. MilkmaidGoat gets 🐐 (goat) — the name wins over the milking association.

### 2. Emoji-to-Texture Generation (in BootScene)

Replace the atlas preload with a canvas-based texture generator in `create()`:

```typescript
import { EMOJI_MAP } from '../config/emojiMap';

const generateEmojiTextures = (scene: Phaser.Scene): void => {
  const size = 32;
  for (const [animalId, emoji] of Object.entries(EMOJI_MAP)) {
    if (scene.textures.exists(animalId)) continue;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '28px serif';
    ctx.fillText(emoji, size / 2, size / 2);

    scene.textures.addCanvas(animalId, canvas);
  }
};
```

Key decisions:
- **32x32 canvas** matches the old atlas frame size. Existing `setScale(2)` / `setScale(3)` calls in BarnScene continue to work unchanged.
- **28px on 32px canvas** leaves 2px margin for emoji that render slightly oversized.
- **`serif` font family** — emoji rendering ignores the font family on all modern platforms; `serif` is a safe no-op fallback.
- **`textures.addCanvas()`** rather than `generateTexture()` — avoids the Graphics→texture round-trip and works directly with the canvas the emoji was drawn on.
- Runs in `create()`, not `preload()`, since there's nothing to load.

**`pixelArt: true` interaction**: The game config sets `pixelArt: true` which enables `NEAREST` filtering globally. Emoji textures will render with nearest-neighbor scaling when `setScale(2+)` is applied, producing crisp edges rather than blurry interpolation. This actually looks good — emoji at 2x with pixel-snapped edges fits the procedural pixel aesthetic from Sprint 005.

### 3. Rendering Site Changes

Four sprite-creation patterns in BarnScene and one in TradingPostScene currently pass an atlas frame:

```typescript
// Before (atlas frame)
this.add.sprite(x, y, 'animals', card.animalId)

// After (individual texture)
this.add.image(x, y, card.animalId)
```

Switch from `sprite` to `image` since there are no animation frames. The five call sites:

| File | ~Line | Context |
|------|-------|---------|
| `BarnScene.ts` | 1186 | Card in slot |
| `BarnScene.ts` | 1428 | Info panel portrait |
| `BarnScene.ts` | 1599 | Night preview card |
| `BarnScene.ts` | 2469 | Legendary card in night summary |
| `TradingPostScene.ts` | 397 | Shop card |

Each is a simple signature change — drop the fourth argument. Scale factors remain unchanged.

### 4. Asset Deletion

Delete:
- `public/assets/animals.png` (352x32 atlas image)
- `public/assets/animals.json` (atlas frame data)

Remove from BootScene:
```typescript
// Delete this line
this.load.atlas('animals', 'assets/animals.png', 'assets/animals.json');
```

The `preload()` method becomes empty and can be removed entirely.

---

## Cross-Platform Emoji Concerns

| Concern | Mitigation |
|---------|-----------|
| **🪿 (goose) is Unicode 15.0 (2022)** | Supported on iOS 16.4+, Android 13+, Chrome 113+. Older platforms show a tofu box. Acceptable — the game already requires modern browsers for Phaser 3.80. |
| **🧑‍🌾 (farmer) is a ZWJ sequence** | Three code points joined by ZWJ. `fillText` handles this correctly on all major browsers. Canvas `measureText` may report wider than single emoji — the 32px canvas is forgiving enough. |
| **🦮 (guide dog) is Unicode 12.0 (2019)** | Broadly supported. No concern. |
| **Emoji appearance varies by OS** | iOS shows Apple emoji, Android shows Noto, Windows shows Segoe. This is cosmetic variation, not a bug — players see their platform's native style. |
| **Headless Chrome (CI/Playwright)** | Headless Chrome renders emoji as monochrome outlines or Noto fallbacks. Textures will still be generated and sized correctly. Screenshots will look different from device screenshots — this is expected and acceptable for CI. |
| **`pixelArt: true` nearest-neighbor** | Emoji textures scale with hard pixel edges. At 2x this looks intentionally chunky. At 3x+ (info panel portrait) it may look blocky — acceptable given the pixel art aesthetic. |

**No fallback system.** If an emoji doesn't render on a given platform, the player sees the platform's default missing-glyph indicator (usually a box with the code point). This is the same behavior as any web page with unsupported emoji and doesn't warrant a custom fallback for a 23-animal roster.

---

## Definition of Done

1. `src/config/emojiMap.ts` exists with all 23 `AnimalId → emoji` mappings
2. `BootScene.create()` calls `generateEmojiTextures()` — each animal has its own texture key
3. `BootScene.preload()` no longer loads the animals atlas (method removed if empty)
4. `public/assets/animals.png` and `public/assets/animals.json` deleted
5. All 5 sprite call sites in BarnScene/TradingPostScene use `this.add.image(x, y, card.animalId)` (no atlas frame argument)
6. `npm run typecheck` passes
7. `npm run test` passes
8. `npm run build` produces app chunk < 100KB gzipped
9. Dev server shows emoji for all 23 animals (including the 12 that previously had no sprite)
10. `src/game/*` is completely untouched

---

## Out of Scope

- Custom emoji fallback rendering (letter-in-circle, etc.)
- Emoji size tuning per-animal (all use 28px on 32px canvas)
- Animated emoji or sprite sheet generation
- Changes to `src/game/types.ts`, `src/game/animals.ts`, or any game logic
