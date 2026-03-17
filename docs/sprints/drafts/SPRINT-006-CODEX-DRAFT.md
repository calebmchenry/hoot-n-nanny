# Sprint 006: Emoji Animal Textures

## Overview

Replace the partial `animals` atlas with boot-time emoji textures keyed by `AnimalId`. This is a small rendering-only sprint: no `src/game/*` changes, no new dependencies, and the old atlas assets are deleted entirely.

## Plan

### 1. Generate one texture per animal in `BootScene.ts`

Remove `this.load.atlas('animals', 'assets/animals.png', 'assets/animals.json')` from `preload()`.

Keep the emoji map in `BootScene.ts` since this sprint only needs it at boot:

```ts
const ANIMAL_EMOJIS: Record<AnimalId, string> = {
  BarnCat: '🐱',
  FeralGoat: '🐐',
  PotBelliedPig: '🐷',
  Bunny: '🐰',
  Hen: '🐔',
  WildBoar: '🐗',
  HermitCrab: '🦀',
  DraftPony: '🐴',
  StruttingPeacock: '🦚',
  MilkmaidGoat: '🐐',
  HoneyBee: '🐝',
  Sheepdog: '🐕',
  StableHand: '🤠',
  BorderCollie: '🦮',
  CheerfulLamb: '🐏',
  GoldenGoose: '🦆',
  GiantOx: '🐂',
  Jackalope: '🐇',
  Thunderbird: '🦅',
  SilverMare: '🦄',
  LuckyToad: '🐸',
  GreatStag: '🦌',
  BarnDragon: '🐉',
};
```

Add `generateAnimalEmojiTextures(scene)` and call it from `create()` alongside the other procedural texture generators. Use Phaser canvas textures, not a new asset pipeline:

```ts
const texture = scene.textures.createCanvas(animalId, 32, 32);
const ctx = texture.getContext();
ctx.clearRect(0, 0, 32, 32);
ctx.font =
  '28px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(emoji, 16, 17);
texture.refresh();
```

That keeps the runtime contract simple: each animal texture key is just its `animalId`.

### 2. Update every live render site to use direct texture keys

There are five atlas call sites to change:

1. `BarnScene.ts` card art in the barn grid
2. `BarnScene.ts` info-panel portrait
3. `BarnScene.ts` draw-preview overlay
4. `BarnScene.ts` night-summary legendary row
5. `TradingPostScene.ts` shop card art

Replace atlas-frame usage with direct keys:

```ts
this.add.sprite(x, y, 'animals', card.animalId);
```

becomes:

```ts
this.add.image(x, y, card.animalId);
```

Keep the existing positions and scale values first. Only retune the emoji Y offset if a browser/font baseline makes them look visibly low.

### 3. Delete the old atlas assets

Delete:

- `public/assets/animals.png`
- `public/assets/animals.json`

After this sprint there should be no remaining `'animals'` atlas reference anywhere in the app.

## Cross-Platform Notes

Emoji will vary by OS and browser, so the goal is recognizable, centered glyphs, not pixel-identical art. Keep the shipped map conservative: prefer single-glyph emoji, avoid ZWJ-heavy choices, and avoid relying on very new Unicode glyphs for core cards. That is why `StableHand` uses `🤠` and `GoldenGoose` uses `🦆` in this pass.

Verification should be visual in Chromium/headless Chrome at phone, tablet, and desktop sizes. If one emoji renders poorly on a target platform, swap that mapping; do not add a larger fallback system in this sprint.

## Acceptance

1. All 23 `AnimalId`s render in Barn and Trading Post.
2. `BootScene.ts` no longer preloads an animal atlas.
3. `public/assets/animals.png` and `public/assets/animals.json` are gone.
4. No scene still calls `this.add.sprite(..., 'animals', ...)` or `this.add.image(..., 'animals', ...)`.
