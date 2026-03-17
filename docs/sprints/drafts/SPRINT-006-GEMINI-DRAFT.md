# Sprint 006 — Emoji Animal Glyphs

## Overview

Replace the 32x32 pixel art animal atlas (`animals.png` / `animals.json`) with
emoji glyphs rendered to canvas textures at boot time. This fixes the 12 animals
that currently have no sprite (ability + legendary animals from Sprint 003) and
eliminates the only external image asset in the project. Every animal gets a
crisp, colorful emoji glyph instead of a low-res pixel art frame.

**Scope**: ~5 files changed, ~2 files deleted, ~1 new file. No game logic
changes. `src/game/*` is completely untouched.

## Use Cases

1. **All 23 animals render visibly.** The 12 animals added in Sprint 003 that
   had no atlas frame now display their emoji glyph. No more invisible cards.
2. **Visual coherence.** The pixel art sprites clashed with the procedural
   textures, bitmap font, and particle systems shipped in Sprint 005. Emoji
   glyphs are universally recognizable and pair naturally with the procedural
   aesthetic.
3. **Zero external art assets.** The project becomes fully procedural — no
   image files to maintain, no atlas JSON to keep in sync with code.

## Architecture

### Emoji-to-Texture Technique

Each animal's emoji is rendered onto an **OffscreenCanvas** (with a regular
`<canvas>` fallback for environments that lack `OffscreenCanvas`) at **64x64
pixels**, then registered with Phaser's texture manager via
`textures.addCanvas(key, canvas)`.

**Why 64x64, not 32x32:** Emoji are complex multi-color glyphs with curves and
fine detail. At 32x32, platform renderers produce muddy, indistinct results —
especially on Windows where emoji are already lower-fidelity than Apple or
Android. 64x64 gives the OS text renderer enough room to produce a legible glyph
that still looks crisp when Phaser scales it down to card size (~40-50px display
on phone). The extra memory is negligible: 23 textures at 64x64x4 bytes = ~376KB
uncompressed, well within budget.

**Why NOT pixelArt nearest-neighbor for emoji:** The game config has
`pixelArt: true`, which sets `NEAREST` filtering globally. Emoji glyphs are
anti-aliased curves and gradients — nearest-neighbor scaling produces jagged,
ugly results with visible stairstepping on the rounded shapes. After adding each
emoji texture, we explicitly set its filtering to `LINEAR` (bilinear) via
`texture.setFilter(Phaser.Textures.FilterMode.LINEAR)`. This is the same
selective-smoothing pattern established in Sprint 005 for particle textures.
Sprites, cards, and all other procedural textures remain nearest-neighbor.

### Emoji Map

A new file `src/config/emojiMap.ts` exports a `Record<AnimalId, string>`:

| AnimalId | Emoji | Notes |
|----------|-------|-------|
| BarnCat | `🐱` | Cat face |
| FeralGoat | `🐐` | Goat |
| PotBelliedPig | `🐷` | Pig face |
| Bunny | `🐰` | Rabbit face |
| Hen | `🐔` | Chicken |
| WildBoar | `🐗` | Boar |
| HermitCrab | `🦀` | Crab |
| DraftPony | `🐴` | Horse face |
| StruttingPeacock | `🦚` | Peacock |
| MilkmaidGoat | `🐐` | Goat (not sheep — the name says goat) |
| HoneyBee | `🐝` | Honeybee |
| Sheepdog | `🐕` | Dog |
| StableHand | `🧑‍🌾` | Farmer (ZWJ sequence) |
| BorderCollie | `🦮` | Guide dog |
| CheerfulLamb | `🐑` | Ewe |
| GoldenGoose | `🪿` | Goose (Unicode 15.0, 2022) |
| GiantOx | `🐂` | Ox |
| Jackalope | `🐇` | Rabbit (no jackalope emoji exists) |
| Thunderbird | `🦅` | Eagle |
| SilverMare | `🦄` | Unicorn |
| LuckyToad | `🐸` | Frog face |
| GreatStag | `🦌` | Deer |
| BarnDragon | `🐉` | Dragon |

**MilkmaidGoat** gets `🐐` (goat), not `🐑` (sheep). The animal is a goat; the
milkmaid is the keeper, not the animal.

### Cross-Platform Rendering

Emoji appearance varies by platform:
- **Apple** (macOS/iOS): High-detail, full-color. Best quality.
- **Windows**: Segoe UI Emoji — flatter, less detail, but legible at 64x64.
- **Linux**: Noto Color Emoji if installed, otherwise monochrome fallback.
- **Headless Chrome** (CI/Playwright): Uses Noto Color Emoji on most CI images;
  may render monochrome on minimal Docker images.

At 64x64, all platforms produce acceptable results. The only problematic emoji is
`🪿` (Goose, Unicode 15.0) which may render as a missing-glyph box on older
systems. See fallback strategy below.

### Fallback Strategy

If an emoji fails to render (produces a blank or tofu box), the texture
generator falls back to drawing the **first letter of the animal's name** in
bold white text on a colored circle background. Detection: after drawing the
emoji to the canvas, sample the center 4x4 pixels. If all are transparent
(alpha = 0), the emoji did not render — apply the letter fallback.

This handles:
- `🪿` on systems without Unicode 15.0 support
- `🧑‍🌾` ZWJ sequence on systems that don't support it (renders as two separate
  emoji, which overflows the canvas — the center-sample check catches this too)

### Rendering Call Sites (5 total)

All currently use: `this.add.sprite(x, y, 'animals', card.animalId)` or
`this.add.image(x, y, 'animals', card.animalId)`.

After this sprint: `this.add.image(x, y, card.animalId)` — each animal has its
own texture key matching its `AnimalId`.

**BarnScene.ts** (4 sites):
1. Line ~1186: Barn slot card sprite
2. Line ~1428: Night summary card sprite
3. Line ~1599: Peek preview card sprite
4. Line ~2469: Drawn card animation sprite

**TradingPostScene.ts** (1 site):
1. Line ~397: Shop item card sprite

All five are simple find-and-replace: remove the `'animals'` atlas key argument,
keep `card.animalId` (or `item.animalId`) as the texture key. Switch from
`.sprite()` to `.image()` since there are no longer multiple frames.

## Implementation

### Phase 1: Emoji Texture Generation (BootScene + emojiMap)

1. Create `src/config/emojiMap.ts` with the 23-entry `Record<AnimalId, string>`.
2. Write `generateEmojiTextures(scene: Phaser.Scene)` in BootScene (or a
   co-located helper). For each entry in the emoji map:
   - Create a 64x64 canvas (`OffscreenCanvas` with `document.createElement('canvas')` fallback).
   - Get 2D context, set `font` to `'48px serif'` (48px emoji on 64px canvas
     gives 8px padding for descenders/accents).
   - Set `textBaseline = 'middle'`, `textAlign = 'center'`.
   - Call `ctx.fillText(emoji, 32, 32)`.
   - Sample center pixels for fallback detection; if blank, draw letter fallback.
   - Call `scene.textures.addCanvas(animalId, canvas)`.
   - Set `scene.textures.get(animalId).setFilter(Phaser.Textures.FilterMode.LINEAR)`.
3. Remove the `this.load.atlas('animals', ...)` line from `BootScene.preload()`.
   If `preload()` becomes empty, remove the method entirely.
4. Call `generateEmojiTextures(this)` in `BootScene.create()` before scene
   transition.

### Phase 2: Update Rendering Call Sites + Delete Assets

1. Update the 5 call sites in BarnScene and TradingPostScene:
   - `this.add.sprite(x, y, 'animals', card.animalId)` becomes
     `this.add.image(x, y, card.animalId)`.
   - Verify `setDisplaySize()` calls remain correct (emoji textures are 64x64
     source, displayed at whatever size the card layout dictates).
2. Delete `public/assets/animals.png` and `public/assets/animals.json`.
3. Remove the `getAnimalDef` import from BarnScene/TradingPostScene if it was
   only used for sprite-related logic (check first — it is likely used for
   other purposes and should stay).

### Phase 3: Verification

1. Run `npm run typecheck && npm run lint && npm run test`.
2. Run `npm run build` and verify bundle size stays under budget.
3. Visual verification at phone (393x852), tablet (768x1024), and desktop
   (1920x1080) viewports. All 23 animals should display emoji glyphs.
4. Verify the 12 previously-spriteless animals (Sheepdog, StableHand,
   BorderCollie, CheerfulLamb, GoldenGoose, GiantOx, Jackalope, Thunderbird,
   SilverMare, LuckyToad, GreatStag, BarnDragon) all render.
5. Test fallback: temporarily replace one emoji with a private-use-area
   codepoint to confirm letter fallback triggers.

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/config/emojiMap.ts` | **Create** | `EMOJI_MAP: Record<AnimalId, string>` (23 entries) |
| `src/scenes/BootScene.ts` | Modify | Remove atlas preload, add `generateEmojiTextures()` call |
| `src/scenes/BarnScene.ts` | Modify | 4 sprite calls: remove `'animals'` atlas key |
| `src/scenes/TradingPostScene.ts` | Modify | 1 image call: remove `'animals'` atlas key |
| `public/assets/animals.png` | **Delete** | Pixel art atlas image |
| `public/assets/animals.json` | **Delete** | Atlas frame definitions |

`src/game/*` is **completely untouched**. No new npm dependencies.

## Definition of Done

1. All 23 animals render emoji glyphs in BarnScene and TradingPostScene.
2. No atlas preload in BootScene. `animals.png` and `animals.json` deleted.
3. Emoji textures use `LINEAR` filtering (not nearest-neighbor).
4. Fallback renders a letter on a colored circle for any unsupported emoji.
5. `npm run ci` passes (typecheck, lint, tests, bundle budget).
6. Visual screenshots confirm emoji at phone, tablet, and desktop viewports.
7. The 12 animals that previously had no sprite now render correctly.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `🪿` (Goose) not supported on older OS/browser | Medium | Low | Letter fallback triggers automatically. Goose emoji is Unicode 15.0 (2022); coverage is growing but not universal. |
| `🧑‍🌾` ZWJ sequence renders as two glyphs | Medium | Low | Center-pixel-sample fallback detects overflow. Falls back to "S" on circle. |
| Emoji look different across platforms | Certain | Low | Accepted trade-off. Emoji are universally recognizable regardless of vendor style. 64x64 ensures legibility everywhere. |
| `LINEAR` filter on emoji textures conflicts with global `pixelArt: true` | Low | Medium | Phaser supports per-texture filter override. This is the same pattern used for particle textures in Sprint 005. |
| Headless Chrome in CI renders monochrome emoji | Medium | Low | Functional correctness is unaffected. Playwright tests check game readiness, not visual fidelity. |
| `OffscreenCanvas` not available in test environment | Low | Low | Fallback to `document.createElement('canvas')`. Both produce identical results. |

## Security

No security implications. This sprint adds no network calls, no user input
handling, no new dependencies, and no dynamic code evaluation. Emoji are
hardcoded string literals.

## Dependencies

- **No new npm dependencies.**
- Requires Unicode emoji support in the runtime browser (all modern browsers).
- `OffscreenCanvas` is optional (Canvas API fallback).

## Open Questions

1. **Font string for emoji rendering.** `'48px serif'` is a safe default, but
   some platforms render emoji better with `'48px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'`. Should we use a platform-aware font
   stack? (Recommendation: yes, use the full stack for best cross-platform
   results.)
2. **Should MilkmaidGoat and FeralGoat share the same `🐐` emoji?** They are
   different animals with different stats. Consider using `🥛` (milk) for
   MilkmaidGoat to visually distinguish them. (Recommendation: keep both as
   `🐐` — the card name and stats already distinguish them, and `🥛` is not an
   animal.)
3. **Should the letter fallback use the animal's tier color?** E.g., legendary
   fallbacks get a gold circle, common get brown. (Recommendation: yes, this is
   a nice touch and trivial to implement.)
