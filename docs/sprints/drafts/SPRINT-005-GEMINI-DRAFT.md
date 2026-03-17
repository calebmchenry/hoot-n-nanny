# Sprint 005: Make the Game Beautiful

## Overview

Sprint 005 transforms Hoot 'n Nanny from a functional prototype with flat rectangles into a visually polished pixel-art card game. Every surface gains texture, every interaction gains feedback, and every idle moment gains life. The scope is purely visual: `src/game/*` is untouched, no new dependencies, no external assets, and the app chunk stays under 100KB gzipped.

**The controversial stance of this draft:** The single most impactful change in this entire sprint is replacing the monospace system font with a procedurally-generated pixel bitmap font. Typography is the skeleton of every UI. Right now, every piece of text in the game --- card names, resource counts, button labels, overlay headers --- renders in `monospace`, which is a proportional-width system font with no personality and inconsistent rendering across platforms. It clashes violently with pixel art. You can add the most beautiful wood grain, the most atmospheric dust particles, the most satisfying card flip animations, and the game will still look amateur if every label says "Courier New" in a barn. A cohesive pixel bitmap font with a proper size hierarchy (8px labels, 10px body, 14px headers, 18px titles) unifies the entire visual identity instantly. This draft therefore places typography in Phase 1, before textures, before particles, before anything else.

The intent document lists 10 categories of visual improvement. This draft argues that shipping all 10 at full depth is unrealistic for a single sprint. The proposed priority order, with cut recommendations:

| Priority | Category | Verdict |
|----------|----------|---------|
| 1 | Typography Upgrade | MUST SHIP --- highest visual impact per line of code |
| 2 | Rich Procedural Textures | MUST SHIP --- the barn, straw, cards, and farmhouse are the backdrop of every screenshot |
| 3 | Animation Juice | MUST SHIP --- card draw flip, button press, resource pop make interactions feel alive |
| 4 | Visual Depth | MUST SHIP --- drop shadows and depth layering are cheap and high-impact |
| 5 | Particle Effects | SHIP REDUCED --- dust motes + card draw puff only. Defer legendary shimmer, bust sparks, and celebration to Sprint 006 |
| 6 | Scene Transitions | MUST SHIP --- camera fadeOut/fadeIn is ~10 lines of code |
| 7 | Color Palette Enhancement | MUST SHIP --- palette constants are trivial to add |
| 8 | Idle Animations | SHIP REDUCED --- window glow pulse + deck float only. Defer enhanced legendary border |
| 9 | Improved Overlays | DEFER --- overlays work fine as dark panels. Themed wood-texture overlays with dividers and icons is a full sub-sprint |
| 10 | Micro-Interactions | DEFER --- long-press radial fill and card touch brighten are nice-to-have polish for Sprint 006 |

This cuts roughly 30% of the scope while keeping the items that produce 90% of the visual improvement in screenshots.

---

## Use Cases

1. **First impression** --- A new player opens the game on their phone. The barn has visible wood grain with knot holes and highlight edges. The straw floor has scattered diagonal strokes. Cards have paper texture. Text is crisp pixel art. The overall impression is "charming indie game," not "developer prototype."

2. **Drawing a card** --- The player taps "Draw Animal." A card flips into view (scaleX 0 to 1 with Back.easeOut), bounces to its slot, and a small puff of straw-colored particles bursts at the landing position. The button depresses on press (scale 0.95, +2px Y) and springs back on release.

3. **Resource change** --- Hay or Mischief changes value. The number pops (scale 1 to 1.3 to 1 over 120ms) with a brief color flash, drawing the player's eye to the change.

4. **Idle barn** --- While the player thinks, subtle dust motes drift across the barn scene. The farmhouse window glows with a sine-wave pulse. The deck stack bobs gently. The scene feels alive, not frozen.

5. **Scene transition** --- The player taps "Trading Post." The camera fades to black (200ms), switches scenes, and fades in (200ms). The transition feels intentional and smooth.

6. **Desktop and tablet** --- All new textures, particles, and animations render correctly at any viewport size. Procedural textures are generated at reference size and scaled via `setDisplaySize()`, matching the Sprint 004 responsive pattern.

---

## Architecture

### Procedural Bitmap Font Generation

A new helper function in BootScene generates a bitmap font atlas at runtime. The approach:

1. Create a Phaser Graphics object sized to fit all printable ASCII glyphs (characters 32-126, 95 glyphs) in a grid.
2. For each glyph, use `graphics.fillStyle()` and `graphics.fillRect()` to draw each pixel of the character manually, referencing a hardcoded pixel map (a compact array of 1s and 0s per glyph, 5 wide x 7 tall --- the standard minimal pixel font grid).
3. Call `graphics.generateTexture('pixel-font', sheetWidth, sheetHeight)` to bake the spritesheet.
4. Register it with Phaser's BitmapFont system via `Phaser.GameObjects.RetroFont.Parse()` using the generated texture key and character layout metadata.
5. Replace all `this.add.text(...)` calls with `this.add.bitmapText(...)` using the registered font.

The pixel map for 95 ASCII glyphs at 5x7 pixels each requires roughly 95 * 5 = 475 bytes of column data (each glyph stored as 5 bytes, one per column, 7 bits per byte). This is negligible for bundle size. The generated texture atlas will be 95 * 6px wide (with 1px spacing) x 8px tall = 570x8 pixels, well under any memory concern.

### Seeded Pseudo-Random for Textures

Procedural textures need randomness (knot positions, straw angles, paper dots) but must be deterministic so they look the same on every load. A simple seeded PRNG (multiply-with-carry or xorshift32) is implemented as a pure function:

```typescript
const seededRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};
```

Each texture generator receives its own seeded PRNG instance so textures are independent and reproducible.

### Texture Generation Strategy

All textures remain procedurally generated in BootScene via the existing `maybeGenerateTexture` pattern. The key change is that drawing functions become richer, using the seeded PRNG and pixel-level detail. Textures are generated at reference size and scaled by scenes via `setDisplaySize()`, preserving the Sprint 004 responsive architecture.

### Particle System

Phaser 3.80.x includes the built-in particle emitter (`scene.add.particles()`). We use it for dust motes and card-draw puffs. Particles use tiny generated textures (4x4 and 6x6 pixel circles/squares) created in BootScene alongside the other textures. No external particle sprite assets.

### Depth Layering

BarnScene establishes explicit depth layers:

| Depth | Layer |
|-------|-------|
| 0 | Background (barn plank texture) |
| 1 | Environment (rafter, floor straw, farmhouse) |
| 2 | Slot outlines |
| 3 | Card containers |
| 4 | Card shadows (rendered as dark offset rects behind cards) |
| 5 | UI (resource banner, noise meter, action bar) |
| 6 | Particles |
| 7 | Overlays |

---

## Implementation

### Phase 1: Typography (the foundation)

**Task 1.1: Pixel font glyph data**

Create `src/config/pixelFont.ts` containing the glyph pixel maps. Each glyph is a 5x7 grid stored as an array of 5 column bytes. Cover ASCII 32-126 (space through tilde). The file exports a `GLYPH_DATA` record mapping character codes to column arrays, plus metadata constants (`GLYPH_WIDTH: 5`, `GLYPH_HEIGHT: 7`, `GLYPH_SPACING: 1`).

Estimated size: ~3KB of TypeScript source, compresses to under 1KB gzipped.

**Task 1.2: Font atlas generation in BootScene**

Add a `generateBitmapFont()` function to BootScene.create(), called before any other texture generation. Steps:
- Compute atlas dimensions: `(5 + 1) * 95` = 570px wide, 8px tall.
- Create a Graphics object, iterate over each glyph, and for each set pixel in the column data, call `graphics.fillRect(x, y, 1, 1)` with the font color (use white so BitmapText tinting works).
- Call `generateTexture('pixel-font', 570, 8)`.
- Register the font via `Phaser.GameObjects.RetroFont.Parse(this, { image: 'pixel-font', width: 5, height: 7, chars: Phaser.GameObjects.RetroFont.TEXT_SET6, ... })` or equivalent manual config object with offsets and character widths.

**Task 1.3: Replace all monospace text**

Search for all `fontFamily: 'monospace'` occurrences in BarnScene.ts (~15 instances) and TradingPostScene.ts (~7 instances). Replace each `this.add.text(x, y, str, style)` with `this.add.bitmapText(x, y, 'pixel-font', str, size)`. Establish the size hierarchy:
- Titles (Night header, Win text): 18px (scale 2.5x base)
- Headers (overlay section titles): 14px (scale 2x base)
- Body (card names, resource labels): 10px (scale ~1.4x base)
- Labels (small chips, ability text): 8px (scale ~1.1x base)

BitmapText objects support `.setTint()` for color, replacing the `color` style property. Use `setOrigin()` for alignment.

**Task 1.4: Scaled font helper update**

Update `scaledFont()` in `barnLayout.ts` to return bitmap font sizes instead of CSS pixel strings. If `scaledFont` currently returns a Phaser text style object, refactor it to return a numeric size for BitmapText.

### Phase 2: Rich Procedural Textures

**Task 2.1: Wood grain barn planks**

Replace the flat `BARN_PLANK` texture generator. The new algorithm, operating on a 390x844 canvas:

1. Fill the sky gradient (keep existing SKY_TOP, SKY_MID bands).
2. Fill the barn area (y=88 to y=680) with `BARN_BASE`.
3. **Horizontal plank lines** (every 28px, as now) --- but instead of a single 4px dark line, draw: a 1px dark line (`BARN_DARK`, alpha 0.9), a 2px mid-tone line (`BARN_BASE` darkened 10%, alpha 0.6), and a 1px highlight line (`BARN_LIGHT`, alpha 0.3) below it. This creates a beveled plank edge.
4. **Wood grain**: For each plank row (28px tall), draw 8-12 horizontal lines at varied Y positions within the row. Each line: random X start (0 to 40px in), random length (60% to 100% of width), color is `BARN_BASE` shifted +/- 5% brightness, alpha between 0.05 and 0.15. Use the seeded PRNG for positions.
5. **Knot holes**: Using the seeded PRNG, place 5-8 knots across the entire barn area. Each knot is a filled circle (radius 3-5px) at `BARN_DARK` alpha 0.6, with a 1px `BARN_LIGHT` highlight arc on the top-left quadrant (drawn as a short arc or 3-4 individual pixels).
6. **Vertical plank separators** (every 26px, as now) --- change from 2px solid lines to 1px lines at alpha 0.2, with occasional 1px highlight to the right at alpha 0.08.

**Task 2.2: Straw floor texture**

Replace the flat `FLOOR_STRAW` generator. New algorithm on 390x130 canvas:

1. Fill base with `STRAW` color.
2. **Diagonal scattered strokes**: Using seeded PRNG, generate 80-120 short line segments. Each stroke: random start X (0 to 390), random start Y (0 to 130), random angle between -30 and +30 degrees from horizontal, random length 8-20px, color alternating between `STRAW_HIGHLIGHT` (alpha 0.3-0.5) and a darker straw tone `0xb37a2e` (alpha 0.15-0.3). Draw each stroke as a 1-2px wide filled rectangle rotated to the stroke angle (or approximate with `graphics.lineBetween` at 1px lineStyle).
3. **Shadow depth**: Add a 6px gradient band at the top of the straw texture: fill a rectangle at `BARN_DARK` alpha 0.25, then a 3px rect at alpha 0.12. This simulates the barn wall casting a shadow onto the floor.
4. **Scattered dots**: 30-50 random 1x1 or 2x2 pixels at `0x8a5a1e` alpha 0.2, representing straw debris and dirt.

**Task 2.3: Card paper texture**

Enhance `CARD_PARCHMENT`, `CARD_NOISY`, and `CARD_LEGENDARY` generators:

1. After filling the base rounded rect, add **paper grain**: 40-60 random dots (1x1px) scattered across the card face at `0x000000` alpha 0.03-0.06. Use seeded PRNG. This gives a subtle organic texture that prevents the card from looking like a flat digital rectangle.
2. Add **inner shadow**: a 2px border inside the card at the base color darkened 8%, alpha 0.3. Draw as four thin rectangles along the inside edges, clipped to the rounded rect area.
3. For `CARD_LEGENDARY`, add a subtle **cross-hatch pattern**: every 8px, draw 1px diagonal lines at `LEGENDARY_GOLD` alpha 0.06.

**Task 2.4: Farmhouse architectural detail**

Replace the flat `FARMHOUSE` generator (currently dark boxes + triangle):

1. **Body**: Keep the rounded rect base (`0x2b2f3f`), but add horizontal clapboard lines every 8px (`0x1f2330`, alpha 0.5, 1px).
2. **Roof shingles**: Replace the flat triangle with rows of overlapping shingle shapes. Draw the triangle in the base color, then overlay 4-5 horizontal rows of small rectangles (6x4px each) offset per row, colored `0x1a1e28` with alternate shingles at `0x232738`. Each row overlaps the one below by 2px.
3. **Door**: Draw a 12x24 rectangle centered at the bottom, colored `0x3a2820` (warm wood), with a 1px lighter frame and a 2x2 doorknob dot at `0xd9a441`.
4. **Window panes**: The existing window rects get a 1px cross divider (vertical and horizontal center lines) in `0x1f2330`, making them look like 4-pane windows.
5. **Chimney**: A small 8x16 rectangle on the right side of the roof at `0x4a3a3a` with a 1px darker outline.

**Task 2.5: Deck card-back pattern**

Enhance the `DECK_BACK` texture:

1. Keep the purple base and inner rect.
2. Add a **diamond pattern**: inside the inner rect, draw diagonal lines every 6px in both directions at `0xe8d7ff` alpha 0.12, creating a diamond lattice instead of the current X cross.
3. Add a **center emblem**: a small 8x8 pixel art owl silhouette (hardcoded pixel data, similar to the glyph approach) drawn at the center in `0xe8d7ff` alpha 0.6.

**Task 2.6: Rafter texture**

Enhance the `RAFTER` texture: keep the dark base and vertical plank segments, but add 1px highlight lines on the left edge of each segment at `BARN_LIGHT` alpha 0.15, and 1-2 horizontal grain lines per segment at random Y positions at `0x3f1d18` alpha 0.3.

### Phase 3: Animation Juice

**Task 3.1: Card draw flip + bounce**

In BarnScene, when a card is drawn and placed into a slot, animate:
- Set the card container's `scaleX = 0` initially.
- Tween `scaleX` from 0 to 1 over 200ms with `Phaser.Math.Easing.Back.Out`.
- Simultaneously tween `scaleY` from 0.9 to 1.05 to 1.0 (bounce squash) over 250ms with `Phaser.Math.Easing.Bounce.Out`.
- The card slides from the deck position to the slot position over 220ms (existing `DRAW_SLIDE_MS`) with `Phaser.Math.Easing.Cubic.Out`.

**Task 3.2: Button press feedback**

For all interactive buttons (primary, secondary, danger):
- On `pointerdown`: tween scale to 0.95 and Y += 3 over 60ms (Quad.Out).
- On `pointerup`/`pointerout`: tween scale back to 1.0 and Y -= 3 over 100ms (Back.Out with overshoot 1.5).

This uses the existing button Image objects. Add event handlers in the button creation helper.

**Task 3.3: Resource number pop**

When `mischiefText` or `hayText` value changes, trigger:
- Tween scale from 1.0 to 1.3 over 60ms (Quad.Out), then back to 1.0 over 60ms (Quad.In).
- Tween tint to `0xffffff` on the first half, restore original tint on the second half.

Track previous values to detect changes.

**Task 3.4: Noise dot fill animation**

When a noise dot transitions from empty to filled, tween its scale from 0 to 1 over 150ms with `Phaser.Math.Easing.Back.Out` (overshoot 2.0). This gives a satisfying "pop" as danger accumulates.

### Phase 4: Visual Depth

**Task 4.1: Card drop shadows**

For each card container in a slot, add a shadow image behind it: a dark (`0x000000`, alpha 0.25) rounded rect texture, offset 2px right and 3px down. Generate a `CARD_SHADOW` texture in BootScene (same dimensions as card, filled with black at alpha 0.3, rounded corners 10). Set the shadow's depth to one below the card container.

**Task 4.2: Vignette overlay**

In BarnScene.create(), after all environment objects, add a full-screen vignette. Generate a `VIGNETTE` texture (390x844) that is transparent in the center and darkens toward the edges:
- Draw 4 gradient rectangles along each edge (top, bottom, left, right), each 60px deep, filled with `0x000000` at alpha 0.0 at the inner edge to alpha 0.2 at the outer edge.
- Approximate the gradient with 6 horizontal/vertical 10px strips at increasing alpha (0.0, 0.03, 0.06, 0.1, 0.14, 0.2).
- Set the vignette at depth 5.5 (above UI, below particles).

**Task 4.3: Explicit depth assignment**

Add `.setDepth(n)` calls to all game objects in BarnScene and TradingPostScene matching the depth table from the Architecture section. Currently depth is implicit (creation order); making it explicit prevents layering bugs when adding particles and shadows.

### Phase 5: Particles and Ambient Effects

**Task 5.1: Particle textures**

Generate in BootScene:
- `PARTICLE_DUST`: 4x4 filled circle, `0xf1c86a` (straw-colored), alpha 0.6.
- `PARTICLE_PUFF`: 6x6 filled circle, `0xd9a441`, alpha 0.8.

**Task 5.2: Ambient dust motes**

In BarnScene.create(), add a particle emitter:

```typescript
const dustEmitter = this.add.particles(0, 0, 'particle-dust', {
  x: { min: 0, max: 390 },
  y: { min: 100, max: 650 },
  speedX: { min: -8, max: 8 },
  speedY: { min: -4, max: 4 },
  lifespan: 6000,
  alpha: { start: 0, end: 0, ease: 'Sine.easeInOut' },
  // Alpha curve: 0 -> 0.3 -> 0 over lifespan
  scale: { min: 0.5, max: 1.5 },
  gravityY: -2,
  frequency: 800,
  quantity: 1,
});
dustEmitter.setDepth(6);
```

Actual alpha fade uses `emitCallback` or `alphaParams` with a custom ease that rises to 0.3 at midpoint and falls back to 0. Alternative: set `alpha: { start: 0.3, end: 0 }` and `delay: { min: 0, max: 2000 }` for a simpler approximation.

**Task 5.3: Card draw puff**

When a card lands in a slot, emit a one-shot burst:

```typescript
this.add.particles(slotX, slotY, 'particle-puff', {
  speed: { min: 20, max: 60 },
  angle: { min: 200, max: 340 },
  lifespan: 400,
  alpha: { start: 0.7, end: 0 },
  scale: { start: 0.8, end: 0.2 },
  gravityY: 30,
  quantity: 8,
  emitting: false,
});
// Then call emitter.explode(8) at the moment of landing.
```

### Phase 6: Scene Transitions and Polish

**Task 6.1: Camera fade transitions**

When navigating from BarnScene to TradingPostScene (and back):

```typescript
this.cameras.main.fadeOut(200, 0, 0, 0);
this.cameras.main.once('camerafadeoutcomplete', () => {
  this.scene.start(SceneKey.TradingPost);
});
```

In TradingPostScene.create():
```typescript
this.cameras.main.fadeIn(200, 0, 0, 0);
```

Wrap the existing scene transition calls with this pattern.

**Task 6.2: Color palette additions**

Add to `PALETTE` in constants.ts:

```typescript
SUNSET_GLOW: 0xd4764e,
DUSTY_ROSE: 0xc4867a,
WARM_SHADOW: 0x3a2118,
NIGHT_PLUM: 0x1a0e2e,
STRAW_DARK: 0x8a5a1e,
```

Use these in texture generation for the warmer, more atmospheric tones called out in the intent.

**Task 6.3: Window glow pulse**

The existing `windowGlowTween` in BarnScene already pulses. Enhance it:
- Change from linear alpha to `Sine.easeInOut`.
- Alpha range: 0.3 to 0.8 (currently may be 0 to 1 which is too harsh).
- Duration: 2000ms, yoyo: true, repeat: -1.

**Task 6.4: Deck stack float**

Add a subtle Y-axis bob to the deck stack:

```typescript
this.tweens.add({
  targets: this.deckStack,
  y: deckY - 2,
  duration: 3000,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
});
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/config/pixelFont.ts` | CREATE | 5x7 pixel glyph data for ASCII 32-126, seeded PRNG utility |
| `src/config/constants.ts` | MODIFY | Add new PALETTE colors, new TEXTURE keys, new ANIMATION timings |
| `src/scenes/BootScene.ts` | MAJOR REWRITE | Bitmap font generation, all texture generators rewritten with detail, particle textures, shadow textures, vignette texture |
| `src/scenes/BarnScene.ts` | MODIFY | Replace Text with BitmapText, add particles, add tweens for card draw/button press/resource pop, add depth assignments, add vignette, add camera fades |
| `src/scenes/TradingPostScene.ts` | MODIFY | Replace Text with BitmapText, add camera fade-in, add depth assignments |
| `src/scenes/barnLayout.ts` | MODIFY | Update `scaledFont` to return numeric sizes for BitmapText |
| `src/scenes/tradingPostLayout.ts` | MINOR MODIFY | Update font helpers if applicable |

No changes to: `src/game/*`, `src/types.ts`, `src/main.ts`, layout test files, Playwright tests (unless timing adjustments needed).

---

## Definition of Done

1. All `fontFamily: 'monospace'` instances removed from scene files. All text renders via BitmapText with the procedurally-generated pixel font.
2. Barn plank texture shows visible wood grain, knot holes, and beveled plank edges.
3. Straw floor texture shows diagonal scattered strokes and shadow depth band.
4. Card textures show paper grain dots and inner shadows.
5. Farmhouse shows shingle roof, door with knob, 4-pane windows, chimney.
6. Card draw animates with flip (scaleX 0 to 1) and bounce landing.
7. Buttons depress on press and spring back on release.
8. Resource numbers pop on value change.
9. Ambient dust motes float in the barn scene.
10. Card draw produces a straw-colored particle puff.
11. Cards have drop shadows.
12. Barn scene has a subtle edge vignette.
13. Scene transitions use camera fade (200ms each direction).
14. Window glow pulses with sine easing, deck stack bobs.
15. `npm run ci` passes: typecheck, lint, format, unit tests, bundle budget.
16. App chunk < 100KB gzipped (estimate: ~30-35KB after changes, well within budget).
17. agent-browser screenshots at phone (393x852) and desktop (1920x1080) viewports show dramatic visual improvement over Sprint 004 baseline.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bitmap font rendering is blurry at scaled sizes | Medium | High | `pixelArt: true` and `roundPixels: true` already in game config, which forces nearest-neighbor sampling. Test at multiple viewport sizes early. BitmapText respects these settings. |
| Procedural textures look noisy/busy instead of beautiful | Medium | Medium | Use low alpha values (0.03-0.15) for texture detail. The grain should be felt, not seen. Test each texture in isolation before compositing. |
| Particle emitters cause frame drops on low-end phones | Low | Medium | Keep particle counts very low: dust emits 1 particle per 800ms (max ~7 alive at once), draw puff is 8 particles total. Profile with Chrome DevTools mobile throttling. |
| BootScene generation time increases noticeably | Low | Low | Current BootScene generates 32 textures in <50ms. Adding detail to each increases per-texture time, but the PRNG-based pixel operations are O(n) where n is small (50-120 iterations per texture). Bitmap font generation adds ~95 glyph draws. Total should stay under 150ms. |
| BitmapText does not support word-wrap as easily as Text | Medium | Medium | For overlay bodies with long text, keep Phaser.Text for multi-line paragraphs (with the pixel font name set via CSS `@font-face` if needed). Use BitmapText for all single-line labels, numbers, and headers where word-wrap is not needed. |
| Seeded PRNG creates visible patterns | Low | Low | Use different seed values per texture. Visually verify each texture via agent-browser screenshots. |

---

## Security

No security implications. This sprint is purely visual. No network calls, no user input parsing changes, no new dependencies. All texture data is hardcoded TypeScript literals compiled into the app chunk.

---

## Dependencies

- Phaser 3.80.x (existing) --- BitmapText, RetroFont, particle emitters, tweens, camera effects are all built-in.
- No new npm dependencies.
- No external font files or image assets.
- agent-browser v0.20.14 (existing, developer tool only, not a project dependency).

---

## Agent-Browser Verification Workflow

Before starting work, capture baseline screenshots:

```bash
# Terminal 1: Start the preview server
npm run build && npm run preview

# Terminal 2: Capture before screenshots
agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
agent-browser set viewport 393 852
agent-browser wait --fn "window.__GAME_READY__ === true"
agent-browser screenshot artifacts/visual/sprint-005-before/phone-portrait.png
agent-browser set viewport 1024 768
agent-browser screenshot artifacts/visual/sprint-005-before/tablet.png
agent-browser set viewport 1920 1080
agent-browser screenshot artifacts/visual/sprint-005-before/desktop.png
agent-browser close
```

After each phase, rebuild and capture progress screenshots:

```bash
npm run build && npm run preview &
agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
agent-browser set viewport 393 852
agent-browser wait --fn "window.__GAME_READY__ === true"
agent-browser screenshot artifacts/visual/sprint-005-phase-N/phone-portrait.png
agent-browser set viewport 1920 1080
agent-browser screenshot artifacts/visual/sprint-005-phase-N/desktop.png
agent-browser close
```

Final verification after all phases:

```bash
npm run ci
npm run build && npm run preview &
agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
agent-browser set viewport 393 852
agent-browser wait --fn "window.__GAME_READY__ === true"
agent-browser screenshot artifacts/visual/sprint-005-after/phone-portrait.png
agent-browser set viewport 1024 768
agent-browser screenshot artifacts/visual/sprint-005-after/tablet.png
agent-browser set viewport 1920 1080
agent-browser screenshot artifacts/visual/sprint-005-after/desktop.png
agent-browser close
```

Compare `sprint-005-before/` and `sprint-005-after/` side-by-side. The difference should be dramatic and obvious at a glance.

---

## Open Questions

1. **Glyph data source**: Should the 5x7 pixel font be hand-authored (full control over aesthetics but tedious for 95 glyphs) or algorithmically derived from a known open-source pixel font layout (faster but less customizable)? This draft recommends hand-authoring the uppercase letters, digits, and common punctuation (~50 glyphs) and using simple box shapes for the remaining rarely-used symbols.

2. **Texture detail calibration**: The alpha values for wood grain, paper dots, and straw strokes specified in this draft are educated guesses. They will need visual tuning via agent-browser screenshots. The implementer should treat the first pass as a starting point and adjust based on what looks good at phone viewport size.

3. **BitmapText color tinting**: Phaser BitmapText supports `.setTint()` but not per-character styling. Overlays that currently use different colors within a single text block (e.g., score values in green vs. labels in white) will need to be split into separate BitmapText objects. Is this acceptable, or should those specific cases remain as Phaser.Text?

4. **Particle emitter API version**: Phaser 3.60+ changed the particle API significantly (particles are now created via `scene.add.particles(x, y, texture, config)` rather than the old `ParticleEmitterManager`). Confirm the exact API shape against Phaser 3.80.x docs before implementation.

5. **Trading Post parity**: This draft applies typography and scene transitions to TradingPostScene but does not add particles or texture detail there. Should the Trading Post get dust motes and enhanced backgrounds in this sprint, or defer to Sprint 006?
