# Sprint 006: Emoji Animal Glyphs

## Overview

Replace the 32x32 pixel art animal atlas (`animals.png` / `animals.json`) with emoji glyphs rendered to canvas textures at boot time. This fixes 12 animals that currently have no sprite at all and eliminates the only external image asset. The project becomes fully procedural.

Scope: ~5 files changed, ~2 files deleted, ~1 new file. No game logic changes. `src/game/*` untouched.

---

## Use Cases

1. **All 23 animals render.** The 12 ability + legendary animals from Sprint 003 that had no atlas frame now display emoji glyphs. No more invisible cards.
2. **Visual coherence.** Emoji pair naturally with the procedural textures, bitmap font, and particle systems from Sprint 005. The pixel art sprites clashed.
3. **Zero external art assets.** No image files to maintain, no atlas JSON to keep in sync.

---

## Architecture

### Emoji Map (`src/config/emojiMap.ts`)

```typescript
import type { AnimalId } from '../game/types';

export const EMOJI_MAP: Record<AnimalId, string> = {
  BarnCat: '\u{1F431}',           // 🐱
  FeralGoat: '\u{1F410}',         // 🐐
  PotBelliedPig: '\u{1F437}',     // 🐷
  Bunny: '\u{1F430}',             // 🐰
  Hen: '\u{1F414}',               // 🐔
  WildBoar: '\u{1F417}',          // 🐗
  HermitCrab: '\u{1F980}',        // 🦀
  DraftPony: '\u{1F434}',         // 🐴
  StruttingPeacock: '\u{1F99A}',  // 🦚
  MilkmaidGoat: '\u{1F410}',      // 🐐
  HoneyBee: '\u{1F41D}',          // 🐝
  Sheepdog: '\u{1F415}',          // 🐕
  StableHand: '\u{1F9D1}\u{200D}\u{1F33E}', // 🧑‍🌾
  BorderCollie: '\u{1F9AE}',      // 🦮
  CheerfulLamb: '\u{1F40F}',      // 🐏
  GoldenGoose: '\u{1FABF}',       // 🪿
  GiantOx: '\u{1F402}',           // 🐂
  Jackalope: '\u{1F407}',         // 🐇
  Thunderbird: '\u{1F985}',       // 🦅
  SilverMare: '\u{1F984}',        // 🦄
  LuckyToad: '\u{1F438}',         // 🐸
  GreatStag: '\u{1F98C}',         // 🦌
  BarnDragon: '\u{1F409}',        // 🐉
};
```

Unicode escapes for editor/encoding safety. MilkmaidGoat gets 🐐 (goat) — the name wins.

### Emoji-to-Texture Generation

In `BootScene.create()`, generate a 64x64 canvas texture for each animal:

```typescript
const generateEmojiTextures = (scene: Phaser.Scene): void => {
  const size = 64;
  const fontSize = 48;
  const fontStack = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  for (const [animalId, emoji] of Object.entries(EMOJI_MAP)) {
    if (scene.textures.exists(animalId)) continue;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px ${fontStack}`;
    ctx.fillText(emoji, size / 2, size / 2);

    // Fallback: if emoji didn't render, draw first letter on colored circle
    const sample = ctx.getImageData(size / 2 - 2, size / 2 - 2, 4, 4).data;
    const hasContent = sample.some((_, i) => i % 4 === 3 && sample[i] > 0);
    if (!hasContent) {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#8b6914'; // warm brown, or gold for legendaries
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8f3e5';
      ctx.font = `bold ${fontSize - 8}px sans-serif`;
      ctx.fillText(animalId[0], size / 2, size / 2);
    }

    scene.textures.addCanvas(animalId, canvas);
    scene.textures.get(animalId).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
};
```

Key decisions:
- **64x64 canvas** with 48px emoji — room for detail and padding
- **LINEAR filtering** override on emoji textures (bilinear, not nearest-neighbor). Same selective-smoothing pattern as Sprint 005 particle textures.
- **Platform-aware font stack** for best emoji rendering across Apple, Windows, Linux
- **Center-pixel-sample fallback** detects blank/tofu emoji and renders first letter on colored circle
- **`textures.addCanvas()`** registers each animal as an individual texture keyed by `AnimalId`

### Rendering Call Sites (5 total)

```typescript
// Before (atlas frame):
this.add.sprite(x, y, 'animals', card.animalId)

// After (individual texture):
this.add.image(x, y, card.animalId)
```

| File | Location | Context |
|------|----------|---------|
| `BarnScene.ts` | Card in slot | Barn grid card sprite |
| `BarnScene.ts` | Info panel | Portrait in info panel overlay |
| `BarnScene.ts` | Preview | Peek/draw preview card |
| `BarnScene.ts` | Win/summary | Legendary card display |
| `TradingPostScene.ts` | Shop card | Shop item card image |

Drop the `'animals'` atlas key argument. Switch `sprite` to `image` (no animation frames). Scale factors and positions remain unchanged — the 64x64 source scales cleanly via `setDisplaySize()`.

---

## Implementation

### Phase 1: Emoji Texture Generation

**Files:** `src/config/emojiMap.ts` (create), `src/scenes/BootScene.ts` (modify)

- [ ] Create `src/config/emojiMap.ts` with the 23-entry `EMOJI_MAP`
- [ ] Add `generateEmojiTextures(scene)` function in BootScene (or imported helper)
- [ ] Call it in `BootScene.create()` before scene transition
- [ ] Remove `this.load.atlas('animals', 'assets/animals.png', 'assets/animals.json')` from preload
- [ ] If `preload()` becomes empty, remove it
- [ ] Verify: `npm run typecheck` passes

### Phase 2: Update Rendering + Delete Assets

**Files:** `src/scenes/BarnScene.ts`, `src/scenes/TradingPostScene.ts` (modify), `public/assets/animals.png`, `public/assets/animals.json` (delete)

- [ ] Update 4 call sites in BarnScene: `this.add.sprite(x, y, 'animals', id)` → `this.add.image(x, y, id)`
- [ ] Update 1 call site in TradingPostScene: same pattern
- [ ] Grep for any remaining `'animals'` texture references — there should be zero
- [ ] Delete `public/assets/animals.png`
- [ ] Delete `public/assets/animals.json`
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build`

### Phase 3: Verification (manual)

- [ ] `npm run dev` — visually confirm all 23 animals render emoji at phone viewport
- [ ] Verify the 12 previously-spriteless animals work (Sheepdog, StableHand, BorderCollie, CheerfulLamb, GoldenGoose, GiantOx, Jackalope, Thunderbird, SilverMare, LuckyToad, GreatStag, BarnDragon)
- [ ] agent-browser screenshots at phone (393x852) and desktop (1920x1080)

---

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/config/emojiMap.ts` | **Create** | 23-entry `Record<AnimalId, string>` emoji map |
| `src/scenes/BootScene.ts` | Modify | Remove atlas preload, add `generateEmojiTextures()` |
| `src/scenes/BarnScene.ts` | Modify | 4 sprite calls: remove `'animals'` atlas key |
| `src/scenes/TradingPostScene.ts` | Modify | 1 image call: remove `'animals'` atlas key |
| `public/assets/animals.png` | **Delete** | 352x32 pixel art atlas |
| `public/assets/animals.json` | **Delete** | Atlas frame definitions |

`src/game/*` is **completely untouched**. No new npm dependencies.

---

## Definition of Done

1. All 23 animals render emoji glyphs in BarnScene and TradingPostScene
2. The 12 previously-spriteless animals now render correctly
3. `BootScene.preload()` no longer loads the animals atlas
4. `public/assets/animals.png` and `public/assets/animals.json` are deleted
5. No remaining `'animals'` atlas references anywhere in the codebase
6. Emoji textures are 64x64 with `LINEAR` filtering
7. Center-pixel-sample fallback renders letter on colored circle for unsupported emoji
8. `src/config/emojiMap.ts` exists with all 23 `AnimalId → emoji` mappings
9. `npm run typecheck` passes
10. `npm run test` passes
11. `npm run build` produces app chunk < 100KB gzipped
12. `src/game/*` is completely untouched
13. agent-browser screenshots show emoji animals at phone and desktop viewports

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `🪿` (Goose) not supported on older systems | Medium | Low | Letter fallback auto-triggers via center-pixel sample |
| `🧑‍🌾` ZWJ sequence renders as two separate emoji | Medium | Low | Falls back to "S" on circle if canvas center is blank |
| Emoji look different across platforms | Certain | Low | Accepted. Emoji are universally recognizable regardless of vendor style. |
| `LINEAR` filter on emoji conflicts with global `pixelArt: true` | Low | Low | Per-texture filter override. Same pattern as Sprint 005 particles. |
| Headless Chrome renders monochrome emoji in CI | Medium | Low | Functional tests unaffected. Visual verification is manual via agent-browser. |
| MilkmaidGoat and FeralGoat share same 🐐 emoji | Certain | Low | Accepted. Card name and stats distinguish them. |

---

## Security

No security implications. Emoji are hardcoded string literals. No network calls, no user input, no new dependencies.

---

## Dependencies

- No new npm dependencies
- Requires Unicode emoji support in the runtime browser (all modern browsers)
- `OffscreenCanvas` is optional (Canvas API fallback)

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|-----------|
| Emoji texture size? | **64x64** with 48px emoji. Room for detail. |
| Nearest-neighbor or bilinear for emoji? | **LINEAR** (bilinear). Emoji curves need smooth scaling. |
| StableHand emoji? | **🧑‍🌾** (Farmer ZWJ). With letter fallback if unsupported. |
| MilkmaidGoat: 🐐 or 🐑? | **🐐** (goat). The name says goat. |
| GoldenGoose: 🪿 or 🦆? | **🪿** (goose). With letter fallback for older systems. |
| Fallback for missing emoji? | **Yes**. Center-pixel detection + first letter on colored circle. |
| Platform-aware font stack? | **Yes**. Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif. |
