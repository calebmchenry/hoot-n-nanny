# Sprint 005: Make the Game Beautiful

## Overview

Sprint 004 delivered responsive layout --- the game fills any viewport. But every visual is a flat rectangle: barn planks are horizontal stripes, cards are plain rounded rects, overlays are black boxes with monospace text, and there are zero particle effects or meaningful animations. The game looks like a developer prototype, not a product.

This sprint transforms the visual identity through **procedural bitmap typography**, **tileable texture materials**, **particle systems**, **animation juice**, **depth layering**, and **overlay theming** --- all within the existing constraints: no new npm dependencies, no external art assets, app chunk < 100KB gzipped, `pixelArt: true`, `src/game/*` untouched. The scope is purely cosmetic.

Typography ships first because every screenshot shows text. A pixel bitmap font with a proper size hierarchy unifies the visual identity instantly. Then the texture pipeline replaces every flat fill with richly detailed procedural materials rendered as TileSprites that hold up at any viewport size. Finally, particles, animation, depth, and overlay polish bring the scenes to life.

---

## Use Cases

1. **First impression** --- A player opens the game on their phone. Instead of flat colored rectangles, they see a barn with visible wood grain, knot holes, and plank edge highlights. Straw on the floor has scattered diagonal strokes with depth shadows. Text is crisp pixel art with a proper size hierarchy. The scene feels warm, atmospheric, and intentionally art-directed.

2. **Drawing a card** --- The player taps "Draw Animal." A card-back flips from the deck (scaleX 1 to 0 to 1), slides to its slot with a bounce landing (Back.easeOut), a small puff of straw-colored particles erupts on landing, and the slot briefly flashes white. The experience feels tactile and satisfying.

3. **Legendary card in barn** --- A legendary card sits in a slot with a perpetual shimmer of gold sparkle particles drifting upward from the card edges. The gold border glow pulse is enhanced with particle accompaniment. Even in a static screenshot, a legendary card announces itself.

4. **Warning escalation** --- When the third noise dot fills, orange-red sparks spit from the dot area. The warning state carries visual tension through particle feedback without obscuring game state.

5. **Bust event** --- On bust, a radial burst of 28 sparks and 10 dust particles erupts from screen center before the camera shake. The moment reads as dramatic, not just punishing.

6. **Night summary** --- The summary overlay uses a semi-transparent dark wood texture background instead of plain black. Score rows appear against the textured surface with proper typographic hierarchy via the bitmap font. If the score is positive, gold celebration particles drift upward.

7. **Trading Post identity** --- The Trading Post has its own warm wood-panel texture treatment, not a flat brown rectangle. Shop cards use the same paper material system as barn cards. The scene feels like a related but distinct space --- a tack room or market stall.

8. **Scene transition** --- The player taps "Trading Post." The camera fades to black (200ms), switches scenes, and fades in (200ms). The transition feels smooth and intentional.

9. **Desktop and tablet** --- At 1920x1080, tileable textures repeat naturally instead of stretching a phone-sized image. Wood grain stays crisp. Particles fill the larger barn area. The game looks intentional at every viewport.

10. **Idle barn** --- While the player thinks, subtle dust motes drift through the barn interior. The farmhouse window glows with a sine-wave pulse. The deck stack bobs gently. The scene has life, not a frozen screenshot.

---

## Architecture

### 1. Procedural Bitmap Font System

A 5x7 pixel bitmap font is generated procedurally at boot time and registered with Phaser's RetroFont system.

**Glyph data format** (`src/config/pixelFont.ts`):

Each glyph is stored as 5 column bytes. Each byte encodes 7 vertical pixels (bit 0 = top row, bit 6 = bottom row). Coverage: uppercase A-Z, lowercase a-z, digits 0-9, punctuation (`:!?+-/,.'()#%&*<>=[]{}@^_~;"\|` and space). Total: 95 printable ASCII characters (codes 32-126).

Example --- the letter "A":
```
Column bytes: [0x3E, 0x09, 0x09, 0x09, 0x3E]
  col0: 0x3E = 0111110 -> pixels at rows 1-5
  col1: 0x09 = 0001001 -> pixels at rows 0,3
  ...etc
```

**Atlas generation** (in BootScene):

1. Compute atlas dimensions: `(5 + 1) * 95 = 570px` wide, `8px` tall (7px glyph + 1px padding).
2. Create a Phaser Graphics object at that size.
3. Iterate over each glyph. For each set bit in the column data, call `graphics.fillRect(x, y, 1, 1)` in white (`0xffffff`). White base allows BitmapText tinting.
4. Call `graphics.generateTexture('pixel-font', 570, 8)`.
5. Register via `Phaser.GameObjects.RetroFont.Parse(scene, { image: 'pixel-font', width: 5, height: 7, chars: '<full ASCII string>', charsPerRow: 95, spacing: { x: 1, y: 1 } })`.

**Usage rules**:

- BitmapText for: labels, counters, headers, button text, card names, badge values, score line values.
- Keep Phaser.Text for: multi-line overlay paragraphs that need word wrap (info panel body, summary descriptions). Style these with the same visual feel (matching color palette) even though they use the system font.
- Size hierarchy (multiples of base 7px height):
  - Title / win text: `scale 3` (21px logical)
  - Overlay headers: `scale 2.5` (17-18px logical, round to integer)
  - Button labels / resource counts: `scale 2` (14px logical)
  - Card labels / chips / small text: `scale 1.5` (10-11px logical)

### 2. Deterministic Procedural Texture Pipeline

All procedural textures use a seeded PRNG to guarantee identical output across boots for screenshot stability.

**PRNG contract** (defined in `src/rendering/proceduralTextures.ts`):

```typescript
const fnv1a32 = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
```

Rules:
1. Every texture generator receives a stable string key (e.g., `env-barn-plank`, `ui-card-parchment`). The key is hashed via `fnv1a32` and used to seed a `mulberry32` instance.
2. No `Math.random()` anywhere in texture generation or particle preset setup.
3. Texture generation happens once in `BootScene.create()`.
4. The same texture key always produces the same pixels.

**TileSprite architecture**:

Large surface textures (barn wall, straw floor, Trading Post wall) are generated at 128x128 (power-of-two for WebGL compatibility) and rendered as `TileSprite` in scenes. TileSprites tile naturally under `Scale.RESIZE` --- when the viewport grows, the texture repeats instead of stretching. This is the correct approach for responsive viewports.

Scenes create TileSprites like:
```typescript
this.wallTile = this.add.tileSprite(0, 0, cw, wallHeight, TEXTURES.BARN_PLANK_TILE)
  .setOrigin(0, 0);
```

On resize, update the TileSprite size: `this.wallTile.setSize(cw, newWallHeight)`.

### 3. Texture Material Recipes

#### Barn Wall Wood (`TEXTURES.BARN_PLANK_TILE`, 128x128)

1. Fill the tile with dark reddish-brown base (`BARN_BASE`).
2. Split into 5 horizontal planks, each ~24px tall with a 1px seam between them.
3. For each plank:
   - Jitter the plank base color by `-8..+8` lightness (via seeded RNG) so boards are visibly different.
   - Draw a 1px top highlight line at `alpha 0.28` and a 2px bottom shadow band at `alpha 0.22`.
   - Draw grain lines every 3px on the Y axis. Each grain line is a 1px stroke whose Y offset follows:
     ```
     offset = Math.sin((x + phaseA) * 0.09) * 1.6
            + Math.sin((x + phaseB) * 0.23) * 0.8
            + walk;
     ```
     `walk` is a clamped random walk updated every 6px with delta `-0.4..0.4`.
   - Use darker grain strokes at `alpha 0.18`. Every third line add a lighter companion stroke at `alpha 0.1`.
4. Add 0-2 knots per plank:
   - Ellipse radius `rx 4-9`, `ry 2-5`.
   - Fill with a darker oval.
   - Stroke 2-3 concentric rings around the knot.
   - For grain lines within 12px of a knot center, push the line away using a deflection field: `bend = 5 * exp(-(d*d) / 72)`.
5. Add 18-24 pores/specks (1px dots) and 1-2 hairline cracks per plank.
6. Edge-darkening pass: darken the left/right 3px of the tile at `alpha 0.1` so tile repeats are less obvious.

Used for: barn wall fill, Trading Post wall fill (palette variant), dark overlay panel wood (darker variant).

#### Straw Floor (`TEXTURES.FLOOR_STRAW_TILE`, 128x64)

1. Base fill with warm straw midtone (`STRAW`).
2. Top-to-bottom value ramp via 6 translucent horizontal bands: top bands slightly cooler/darker, center warm gold, bottom richer orange-brown.
3. Draw 180 stems: length 6-18px, width 1px, angle -32deg..+24deg, color bucket 50% midtone / 30% highlight / 20% shadow, alpha 0.35..0.65.
4. Draw 30 short broken chaff dashes: length 2-4px, random rotation, alpha 0.22..0.40.
5. Add 10 soft shadow patches using low-alpha ellipses to prevent even-noise appearance.
6. Bottom shadow strip 6px tall at alpha 0.12.
7. Top dust haze strip 4px tall at alpha 0.08 so the wall/floor seam is softened.

Note: 128x64 is not power-of-two height. If WebGL issues arise, pad to 128x128 with the bottom half repeated or darkened.

#### Paper / Parchment (card-sized, 96x104)

1. Fill rounded rect with parchment base.
2. Mottling: 4 passes of translucent blots (counts 12, 18, 10, 8; radius 3-12px; 2 darker browns + 1 lighter cream; alpha 0.03..0.08).
3. 40 paper fibers: 1px lines, length 3-10px, random angle, alpha 0.08..0.14.
4. 80 speckles at 1px, alpha 0.03..0.06.
5. Edge treatment: 2px outer stroke, 1px top-left highlight at alpha 0.22, 2px bottom-right shadow at alpha 0.18.
6. Faint center-light pass so the card face feels slightly lifted.

Variants:
- `CARD_NOISY`: desaturated terracotta wash at alpha 0.18, darkened bottom quarter with red-brown gradient.
- `CARD_LEGENDARY`: warmer paper base, 48 gold flecks, 2-layer border (outer dark brass, inner bright gold), four corner ornaments from 1px line motifs.

The same paper generator also powers: summary score strips, info panel inserts, Trading Post header plaques.

#### Painted Buttons (350x56)

1. Dark wood base using the wood recipe at button size.
2. Solid paint fill overlay at alpha 0.82..0.9 so some wood variation reads underneath.
3. 2px inset bevel: top-left highlight, bottom-right shadow.
4. 12-20 paint chips/specks near edges at low alpha.
5. Text contrast stays strong --- beauty must not cost button legibility.

#### Deck Back (64x82)

1. Deep indigo base.
2. Inner panel inset 5px from edge with lighter indigo.
3. 1px cream border, then a second brass border 2px inward.
4. Central diamond medallion: outer diamond stroke, inner diamond fill, four cardinal dots.
5. Corner ornaments: mirrored L-shaped line motifs, each 6x6px.
6. 24 tiny star flecks at alpha 0.35..0.80.

#### Farmhouse (142x116)

1. Roof: 5 rows of shingles, each shingle 10x4px, alternate row offset by 5px, 1px dark cap line per row.
2. Walls: horizontal clapboards every 8px, top highlight + bottom shadow per board.
3. Door: inset panel with 1px trim, handle dot on right.
4. Windows: visible frame and muntins (cross dividers). Glass uses cool base; warm glow from separate texture.
5. Chimney: bricks in 6x3px units, staggered each row by 3px.

#### Window Glow (48x36)

Three nested rounded rectangles/ellipses:
- Inner bright amber at alpha 0.75.
- Mid orange haze at alpha 0.32.
- Outer warm bloom at alpha 0.12, slightly offset upward.

#### Rafter (160x42)

Reuse wood generator with 1 plank, horizontal orientation. Increase grain contrast +25%. Add 6-8 vertical saw marks (1px dark lines at alpha 0.14). Add 3-4 nail heads as 2x2 dark squares with 1px highlight offset.

### 4. Particle System

**Particle textures** are generated in BootScene. Because `pixelArt: true` forces nearest-neighbor on all textures, particle textures use manually anti-aliased soft circles to simulate softness:

- `FX_DUST` (8x8): Manually drawn soft circle --- center 4x4 block at full alpha, surrounding ring of pixels at 0.5 alpha, outer ring at 0.2 alpha. Creates a 3-step radial falloff that reads as soft despite nearest-neighbor.
- `FX_SPARK` (8x8): Diamond/star shape. Bright center cross with corner pixels at reduced alpha.
- `FX_CHAFF` (10x4): Straw fragment rectangle.
- `FX_PUFF` (12x12): Larger soft circle using same 3-step anti-aliased technique as FX_DUST.

**Emitter presets** (6 types):

| Effect | Texture | Trigger | Frequency / Burst | Lifespan | Motion | Alpha / Scale | Tint | Cap |
|--------|---------|---------|-------------------|----------|--------|---------------|------|----:|
| Barn ambient dust | `FX_DUST` | Always on in Barn | `frequency: 320ms`, `quantity: 1` | 5000-9000ms | `speedX -4..7`, `speedY -3..2` | `alpha 0.18->0`, `scale 0.55->0.12` | cream / straw / amber | 18 |
| Card landing puff | `FX_PUFF` + `FX_CHAFF` | Card lands in slot | burst `8 puff + 14 chaff` | 280-420ms | `angle 200..340`, `speed 20..95`, `gravityY 90` | `alpha 0.7->0`, `scale 0.7->0` | straw highlight / brown dust | 22 |
| Legendary shimmer | `FX_SPARK` | Active on Legendary cards | `frequency: 160ms`, `quantity: 1` | 600-1000ms | `speed 4..14`, emit from card edge zone | `alpha 0.95->0`, `scale 0.45->0` | pale gold / bright gold / cream | 10/card |
| Warning sparks | `FX_SPARK` | While warning state active | `frequency: 90ms`, `quantity: 2` | 260-520ms | `angle 230..310`, `speed 30..110`, `gravityY 160` | `alpha 0.8->0`, `scale 0.5->0` | amber / orange / bust red | 16 |
| Bust burst | `FX_SPARK` + `FX_PUFF` | On bust overlay reveal | burst `28 sparks + 10 dust` | 300-650ms | outward radial, `speed 70..170`, `gravityY 220` | `alpha 0.9->0`, `scale 0.8->0` | orange / red / pale ash | 38 |
| Summary celebration | `FX_SPARK` | Summary overlay open | burst `36` then `frequency: 240ms` for 1.2s | 900-1300ms | `speedX -60..60`, `speedY -180..-80`, `gravityY 120` | `alpha 0.9->0`, `scale 0.6->0.1` | gold / parchment / dusty rose | 36 |

All emitter preset numbers are starting points for visual tuning --- adjust after runtime review via agent-browser screenshots.

**Resize handling**: Persistent emitters (dust motes, legendary shimmer, warning sparks) must update their emit zone bounds in the scene's `applyLayout` / resize handler. One-shot burst emitters (puff, bust, celebration) use current viewport coordinates at fire time, so they handle resize naturally.

### 5. Depth Layering

Explicit depth constants in `src/config/constants.ts`, spaced by 10s for future insertion:

| Layer | Depth |
|-------|------:|
| Sky / far background | 0 |
| Wall tile / Trading Post wall | 10 |
| Rafters / trim / stall props | 20 |
| Floor straw / ground shadows | 30 |
| Farmhouse / deck stack / static props | 40 |
| Slot backgrounds | 50 |
| Card shadows | 55 |
| Card containers | 60 |
| Legendary glow + shimmer particles | 65 |
| Ambient dust | 70 |
| HUD (resource banner, noise meter) | 80 |
| Buttons (action bar) | 90 |
| Vignette | 95 |
| Info panels / modal overlays | 200 |
| Overlay celebration particles | 210 |

Every game object calls `.setDepth(DEPTH.XXX)` after creation. This replaces implicit z-ordering.

### 6. Resize Integration

- TileSprites update their size via `setSize(cw, newHeight)` on resize --- no texture regeneration needed.
- Vignette image scales via `setDisplaySize(cw, ch)`.
- Persistent particle emitters update emit zone bounds on resize.
- One-shot emitters fire at current coordinates and self-destruct.
- Card shadows reposition alongside their card containers in `applyLayout`.
- All existing `isAnimating` gates and deferred resize patterns from Sprint 004 remain in effect. New tweens must check scene active state and respect the animation pipeline.

---

## Implementation

### Phase 1: Typography (Bitmap Font Generation + Replace All Text)

**Goal**: Ship the pixel bitmap font and replace all monospace text. This is Phase 1 because typography is the skeleton of the UI and appears in every screenshot.

**New file**: `src/config/pixelFont.ts`

**Tasks**:

1. Create `src/config/pixelFont.ts` containing:
   - `GLYPH_WIDTH = 5`, `GLYPH_HEIGHT = 7`, `GLYPH_SPACING = 1` constants.
   - `GLYPH_DATA`: a `Record<number, number[]>` mapping ASCII character codes (32-126) to arrays of 5 column bytes each. Each column byte encodes 7 vertical pixels. Hand-author uppercase A-Z, digits 0-9, and common punctuation. For rarely-used symbols, use simple box or line shapes.
   - Estimated file size: ~3KB TypeScript source, <1KB gzipped.

2. In `BootScene.create()`, add `generateBitmapFont()` call before all other texture generation:
   - Create a Graphics object sized 570x8 (95 glyphs x 6px pitch, 8px tall).
   - For each glyph in `GLYPH_DATA`, iterate 5 columns x 7 rows. For each set bit, `graphics.fillRect(glyphX + col, row, 1, 1)` in white.
   - `graphics.generateTexture('pixel-font', 570, 8)`.
   - Register font via `Phaser.GameObjects.RetroFont.Parse(this, { image: 'pixel-font', width: 5, height: 7, chars: '<ASCII 32-126 string>', charsPerRow: 95, spacing: { x: 1, y: 1 } })`.
   - Destroy the Graphics object.

3. Search BarnScene.ts for all `fontFamily: 'monospace'` instances (~15-20). Replace each `this.add.text(x, y, str, style)` with `this.add.bitmapText(x, y, 'pixel-font', str, size)`:
   - Night header / win text: size 21 (scale 3x).
   - Overlay section headers: size 14 (scale 2x).
   - Button labels, resource counts, deck count: size 14 (scale 2x).
   - Card names, chips, small labels: size 10 (scale ~1.5x).
   - Use `.setTint(color)` for coloring (replaces `color` style property).
   - Use `.setOrigin(0.5)` for centered text (replaces `align: 'center'`).

4. Repeat for TradingPostScene.ts (~7-10 instances).

5. Keep Phaser.Text for multi-line paragraphs that need word wrap: info panel body text, summary descriptions. Style with matching colors.

6. Update `scaledFont()` helper in `barnLayout.ts` if it returns a CSS-style object --- refactor to return numeric size for BitmapText.

**Acceptance**: All visible text in Barn and Trading Post uses the pixel font. No `fontFamily: 'monospace'` remains in scene rendering code. `npm run typecheck` passes.

### Phase 2: Texture Pipeline & Materials

**Goal**: Create the procedural texture module, generate all rich material textures, and convert surfaces to TileSprite.

**New file**: `src/rendering/proceduralTextures.ts`

This file contains: `fnv1a32`, `mulberry32`, and all material generator functions (wood tile, straw tile, paper, deck back, farmhouse, window glow, rafter, painted buttons, overlay wood, vignette, card shadow, Trading Post wall variant). Each generator is a pure function that takes a `Phaser.Scene` reference and calls `scene.textures.createCanvas()` to produce a `CanvasTexture`, draws into its 2D context, and calls `texture.refresh()`.

**Note on directory rules**: `src/rendering/` is a new subdirectory. CLAUDE.md says "do not create until a second file would go in it." This directory will contain `proceduralTextures.ts` and eventually particle preset code. Two files justify the directory. If the implementer prefers, `proceduralTextures.ts` may be placed in `src/scenes/` instead.

**Tasks**:

1. Create `src/rendering/proceduralTextures.ts` with:
   - `fnv1a32` and `mulberry32` PRNG functions.
   - `generateBarnPlankTile(scene)` --- 128x128 wood tile using the algorithm from Architecture section 3 (sine-wave grain, knot deflection, edge darkening).
   - `generateStrawFloorTile(scene)` --- 128x64 straw tile.
   - `generatePaperTexture(scene, key, baseColor, w, h, variant)` --- parameterized paper/parchment generator for cards, overlays, and score strips.
   - `generateDeckBack(scene)` --- 64x82 decorative card back.
   - `generateFarmhouse(scene)` --- 142x116 detailed farmhouse.
   - `generateWindowGlow(scene)` --- 48x36 layered glow.
   - `generateRafter(scene)` --- 160x42 beam.
   - `generatePaintedButton(scene, key, baseColor, w, h)` --- parameterized button generator.
   - `generateVignette(scene, w, h)` --- noise-dithered vignette with 20+ gradient steps. The vignette uses randomized 1px dot scatter across each gradient band to prevent visible banding under `pixelArt: true` nearest-neighbor rendering.
   - `generateCardShadow(scene)` --- multi-layer soft shadow.
   - `generateOverlayWood(scene, w, h)` --- dark wood variant for overlay backgrounds.
   - `generateTradingPostWall(scene)` --- warm wood variant.
   - All particle texture generators (FX_DUST, FX_SPARK, FX_CHAFF, FX_PUFF) with manually anti-aliased soft circles.

2. Add new texture key constants to `src/config/constants.ts`:
   - `BARN_PLANK_TILE: 'env-barn-plank-tile'`
   - `FLOOR_STRAW_TILE: 'env-floor-straw-tile'`
   - `OVERLAY_BG: 'ui-overlay-bg'`
   - `CARD_SHADOW: 'ui-card-shadow'`
   - `VIGNETTE: 'env-vignette'`
   - `TRADING_POST_BG: 'env-trading-post-bg'`
   - `FX_DUST: 'fx-dust'`
   - `FX_SPARK: 'fx-spark'`
   - `FX_CHAFF: 'fx-chaff'`
   - `FX_PUFF: 'fx-puff'`

3. Add new palette entries to `src/config/constants.ts`:
   ```
   SUNSET_GLOW: 0xc4724a
   DUSTY_ROSE: 0xb07070
   WARM_SHADOW: 0x3d1f1a
   NIGHT_PLUM: 0x1a0e2e
   STRAW_DARK: 0x9e7a2e
   STRAW_SHADOW: 0x8a6420
   BARN_HIGHLIGHT: 0xb8654e
   BARN_KNOT: 0x4a1e14
   PAPER_GRAIN: 0xd8cba6
   DUST_MOTE: 0xd4a574
   SPARK_RED: 0xff4433
   SPARK_ORANGE: 0xff8844
   GOLD_SPARKLE: 0xffd700
   OVERLAY_WOOD: 0x2a1810
   ```

4. Add `DEPTH` constant object to `src/config/constants.ts`:
   ```
   DEPTH = {
     BG: 0, WALL: 10, RAFTER: 20, FLOOR: 30, FARMHOUSE: 40,
     SLOTS: 50, CARD_SHADOWS: 55, CARDS: 60, LEGENDARY_FX: 65,
     DUST: 70, HUD: 80, BUTTONS: 90, VIGNETTE: 95,
     OVERLAYS: 200, OVERLAY_PARTICLES: 210,
   }
   ```

5. Refactor `BootScene.ts`:
   - Import all generators from `proceduralTextures.ts`.
   - Call each generator in `create()` after `preload` completes.
   - Keep the existing `maybeGenerateTexture` pattern for simple shapes (badges, noise dots, star icon, lock icon, slot outlines) that don't need the canvas texture pipeline.
   - Remove the old flat-fill implementations of barn plank, straw, rafter, farmhouse, window glow, deck back, card backgrounds, and buttons --- replace with calls to the new generators.

6. In `BarnScene.ts`, replace the barn wall `this.add.image(...)` with:
   ```typescript
   this.wallTile = this.add.tileSprite(0, wallY, cw, wallHeight, TEXTURES.BARN_PLANK_TILE)
     .setOrigin(0, 0).setDepth(DEPTH.WALL);
   ```
   Similarly replace the straw floor with a TileSprite.

7. In `TradingPostScene.ts`, replace the flat background rectangle with the Trading Post wall TileSprite.

**Acceptance**: Barn wall shows visible sine-wave wood grain with knot holes. Straw floor shows scattered diagonal strands. Textures tile without visible seams at 1920x1080 desktop viewport. `npm run typecheck` passes.

### Phase 3: Card & Button Visual Upgrade

**Goal**: Cards get paper texture, drop shadows, and improved variants. Buttons get painted wood treatment. Deck back becomes decorative.

**Tasks**:

1. Wire up the new card paper textures (parchment, noisy, legendary) generated in Phase 2 by replacing the old `CARD_PARCHMENT`, `CARD_NOISY`, `CARD_LEGENDARY` texture keys. The new textures are already registered under the same keys by the generators.

2. Add card drop shadows in `BarnScene.renderCardInSlot`:
   - Before creating the card container, add a shadow image offset `(+3, +4)` from the card position using `TEXTURES.CARD_SHADOW`.
   - Set shadow depth to `DEPTH.CARD_SHADOWS`.
   - Store shadow references for cleanup and repositioning in `applyLayout`.

3. Wire up new painted button textures for primary, secondary, disabled, and danger buttons.

4. Wire up the new deck back texture.

5. Wire up the new farmhouse and window glow textures.

6. Assign `.setDepth(DEPTH.XXX)` to all game objects in BarnScene and TradingPostScene per the depth table. Replace implicit creation-order z-ordering with explicit depth.

**Acceptance**: Cards have visible paper texture with mottling and edge treatment. Legendary cards have gold flecks and ornamental border. Cards float above slots with visible drop shadows. Buttons show painted-wood texture. Farmhouse has shingle roof, window panes, door, chimney. `npm run typecheck` passes.

### Phase 4: Animation Juice

**Goal**: Card flip, button press, resource pop, noise dot fill, slot flash, idle animations.

**Tasks**:

1. **Card draw flip + bounce**: In `animateCardReveal`, replace the current slide/scale animation:
   - Show a temporary deck-back image at deck position.
   - Tween deck-back sliding to slot over `DRAW_SLIDE_MS` (220ms, Cubic.Out).
   - At arrival, flip: shrink deck-back `scaleX` to 0 over 70ms (Quad.In), destroy it, set real card container `scaleX = 0`, expand to 1 over 70ms (Quad.Out).
   - After flip, bounce: tween scale to 1.08 then back to 1.0 over 120ms (Back.Out).
   - On bounce completion, fire the card puff particle and slot flash (Phase 5).
   - All tweens must check `this.scene.isActive()` before starting. Interrupt safety: if the scene shuts down mid-chain, orphaned objects are cleaned up in the scene's `shutdown()`.

2. **Button press feedback**: Extract `addButtonPressFeedback(button, text)` helper:
   - `pointerdown`: tween scale to 0.97, y += 2, duration 70ms (Quad.Out). Store `baseY` via `button.setData('baseY', button.y)` before first press.
   - `pointerup`: tween scale to 1.0, y to baseY, duration 110ms (Back.Out).
   - `pointerout`: reset to baseY and scale 1.0.
   - Apply to all buttons in BarnScene and TradingPostScene.

3. **Resource number pop**: In `updateHud`, track previous values. When mischief/hay/capacity/deck count changes:
   - Tween text scale from 1.28 to 1.0 over `STAT_POP_MS` (120ms, Back.Out).
   - Brief tint flash to white, restore original tint.

4. **Noise dot fill animation**: When a dot transitions from empty to filled:
   - Set scale to 0, tween to 1.0 over 160ms (Back.Out with overshoot 2.0).

5. **Slot landing flash**: On card landing, create a white rectangle matching slot dimensions at alpha 0.45:
   - Tween alpha to 0 over 140ms, destroy on complete.
   - Depth: `DEPTH.CARDS + 1`.

6. **Idle animations**:
   - Deck stack float: tween y +/- 2px, 3000ms, yoyo, Sine.easeInOut, repeat forever.
   - Window glow pulse: ensure existing tween uses Sine.easeInOut, alpha range 0.3 to 0.8, duration 1800ms, yoyo.
   - Legendary border glow: strengthen existing pulse --- alpha range 0.4 to 0.9, duration 900ms.

**Acceptance**: Card draw shows visible flip animation. Buttons depress on tap. Resource numbers pop on change. Noise dots bounce into existence. Deck bobs gently. `npm run typecheck` passes.

### Phase 5: Particles

**Goal**: All 6 particle types active.

**Tasks**:

1. **Ambient dust motes**: In `BarnScene.create()`, after environment setup:
   ```typescript
   this.dustEmitter = this.add.particles(0, 0, TEXTURES.FX_DUST, {
     x: { min: 0, max: cw },
     y: { min: wallY, max: floorBottom },
     speedX: { min: -4, max: 7 },
     speedY: { min: -3, max: 2 },
     scale: { start: 0.55, end: 0.12 },
     alpha: { start: 0.18, end: 0 },
     lifespan: { min: 5000, max: 9000 },
     frequency: 320,
     quantity: 1,
     tint: [PALETTE.PARCHMENT, PALETTE.STRAW, PALETTE.STRAW_HIGHLIGHT],
   }).setDepth(DEPTH.DUST);
   ```
   Update emit zone bounds in `applyLayout`.
   Destroy emitter in `shutdown()`.

2. **Card landing puff**: In `animateCardReveal`, on landing complete:
   - Create a one-shot emitter at slot center using `FX_PUFF` + `FX_CHAFF`.
   - `frequency: -1`, burst 8 puff + 14 chaff.
   - `angle: 200..340`, `speed: 20..95`, `gravityY: 90`, lifespan 280-420ms.
   - One-shot emitters auto-destroy.

3. **Legendary shimmer**: In `renderCardInSlot`, when tier is legendary:
   - Create a persistent emitter at card center using `FX_SPARK`.
   - `frequency: 160ms`, `quantity: 1`, emit from card-edge zone.
   - `speed: 4..14`, upward drift, lifespan 600-1000ms.
   - Tint: pale gold / bright gold / cream.
   - Cap: 10 per card. Store reference on the card container for cleanup.
   - Update emitter position in `applyLayout`.

4. **Warning sparks**: When warning state activates:
   - Create a persistent emitter near noise meter or farmhouse.
   - `frequency: 90ms`, `quantity: 2`, `angle: 230..310`, `speed: 30..110`, `gravityY: 160`.
   - Tint: amber / orange / bust red. Cap: 16.
   - Destroy when warning state ends or scene transitions.

5. **Bust burst**: In `animateBust`, before camera shake:
   - One-shot burst: 28 sparks + 10 dust, outward radial, `speed: 70..170`, `gravityY: 220`.
   - Tint: orange / red / pale ash.

6. **Summary celebration**: In `showNightSummaryOverlay`, if score is positive:
   - Initial burst of 36, then `frequency: 240ms` for 1.2s.
   - `speedY: -180..-80`, `gravityY: 120`.
   - Tint: gold / parchment / dusty rose. Cap: 36.
   - Stop after 1.2s via `this.time.delayedCall`.

**Acceptance**: Dust motes drift in idle barn. Cards land with a puff. Legendary cards shimmer. Warning state has sparks. Bust produces a dramatic burst. Summary has celebration particles. All particle counts stay within caps. `npm run typecheck` passes.

### Phase 6: Visual Depth & Atmosphere

**Goal**: Vignette overlay, palette warmth, final depth tuning.

**Tasks**:

1. **Vignette**: Add the noise-dithered vignette image to BarnScene:
   ```typescript
   this.vignette = this.add.image(cw / 2, ch / 2, TEXTURES.VIGNETTE)
     .setOrigin(0.5).setDisplaySize(cw, ch)
     .setDepth(DEPTH.VIGNETTE).setAlpha(0.35);
   ```
   Update size in `applyLayout`. The vignette is generated at 390x844 with 20+ gradient steps and noise dithering to avoid banding.

2. **Sky gradient warmth**: Update the barn plank background sky bands to use the new palette:
   - y=0..40: `NIGHT_PLUM`
   - y=40..70: `SKY_TOP`
   - y=70..88: blend toward `SUNSET_GLOW`
   This is encoded in the barn plank tile or as a separate sky strip above the TileSprite.

3. **Depth audit**: Walk through every game object in BarnScene and TradingPostScene. Verify depth assignments match the table. Fix any objects still using implicit z-order.

4. **Ground shadows**: Add soft ellipse shadows under the deck stack and farmhouse using low-alpha dark ellipses at `DEPTH.FLOOR`.

**Acceptance**: Barn has visible vignette darkening at edges. Sky gradient uses warmer palette. No z-fighting between layers. `npm run typecheck` passes.

### Phase 7: Overlay & Trading Post Polish

**Goal**: Themed overlay backgrounds and full Trading Post texture treatment.

**Tasks**:

1. **Overlay backgrounds**: In `showBustOverlay`, `showNightSummaryOverlay`, and `showWinOverlay`:
   - Replace `this.add.rectangle(0, 0, w, h, 0x000000, 0.75)` with the dark wood overlay texture at alpha 0.92.
   - Add alternating subtle strips (alpha 0.04) behind score lines in the summary overlay.
   - Add thin horizontal divider lines between score sections (alpha 0.08).
   - Add paper-insert panels for key information areas.

2. **Trading Post texture**: Verify TileSprite wall texture is wired up from Phase 2. Add:
   - Counter/floor composition: darker wood strip along the bottom third.
   - Shelf shadow accents behind shop card rows.
   - Consistent paper card textures for shop cards (same material system as barn).

3. **Scene transitions**: Add camera fade between Barn and Trading Post:
   - In transition-to-Trading-Post handler: `this.cameras.main.fadeOut(200, 0, 0, 0)`, then `scene.start` in `camerafadeoutcomplete` callback.
   - In `TradingPostScene.create()`: `this.cameras.main.fadeIn(200, 0, 0, 0)`.
   - In transition-to-Barn handler: same fade pattern.

4. **Trading Post buttons and tabs**: Verify they use the new painted button textures and bitmap font from Phase 1.

**Acceptance**: Overlays use dark wood texture, not plain black. Trading Post has a distinct textured identity. Scene transitions fade smoothly. `npm run typecheck` passes.

### Phase 8: Agent-Browser Verification

**Goal**: Prove visual quality at multiple viewports. Pass all CI checks.

**Tasks**:

1. Run full CI:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm run test
   npm run build
   npm run budget
   ```
   All must pass. App chunk must remain < 100KB gzipped.

2. Capture before screenshots (if not already in `artifacts/visual/sprint-004-before/`):
   ```bash
   npm run build && npx vite preview &
   agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
   agent-browser set viewport 393 852
   agent-browser wait --fn "window.__GAME_READY__ === true"
   agent-browser screenshot artifacts/visual/sprint-005-before/phone-portrait.png
   agent-browser set viewport 768 1024
   agent-browser screenshot artifacts/visual/sprint-005-before/tablet.png
   agent-browser set viewport 1920 1080
   agent-browser screenshot artifacts/visual/sprint-005-before/desktop.png
   agent-browser close
   ```

3. Capture after screenshots at the same 3 viewports:
   ```bash
   npm run build && npx vite preview &
   agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
   agent-browser set viewport 393 852
   agent-browser wait --fn "window.__GAME_READY__ === true"
   agent-browser screenshot artifacts/visual/sprint-005-after/phone-portrait.png
   agent-browser set viewport 768 1024
   agent-browser screenshot artifacts/visual/sprint-005-after/tablet.png
   agent-browser set viewport 1920 1080
   agent-browser screenshot artifacts/visual/sprint-005-after/desktop.png
   agent-browser close
   ```

4. Capture game-state screenshots for visual proof at phone viewport (393x852):
   - Barn idle (empty, Night 1) --- default state on load.
   - Barn with 3+ cards including 1 Legendary --- requires gameplay interaction.
   - Warning state (3 noise dots filled) --- requires gameplay interaction.
   - Night summary overlay --- requires completing a night.
   - Trading Post --- navigate to Trading Post.

5. Side-by-side comparison. The before/after difference must be dramatic and obvious at a glance. Specifically verify:
   - Visible wood grain with knot holes (not flat stripes).
   - Pixel font text (not monospace system font).
   - Particle motion (dust motes visible in barn idle).
   - Textured overlays (not plain black backgrounds).
   - Tiled textures hold up at 1920x1080 (no stretching).

**Acceptance**: Screenshots captured. Before/after comparison confirms dramatic visual improvement. CI green.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/config/pixelFont.ts` | CREATE | 5x7 column-byte glyph data for ASCII 32-126 |
| `src/config/constants.ts` | MODIFY | New PALETTE colors, DEPTH constants, TEXTURES keys, ANIMATION timings |
| `src/rendering/proceduralTextures.ts` | CREATE | Seeded PRNG, all material generators (wood, straw, paper, farmhouse, buttons, vignette, particles) |
| `src/scenes/BootScene.ts` | MAJOR REWRITE | Import generators, produce all textures including bitmap font atlas |
| `src/scenes/BarnScene.ts` | MAJOR MODIFY | TileSprite conversion, depth layering, particles (6 types), animation juice, vignette, themed overlays, camera fades, BitmapText replacement |
| `src/scenes/TradingPostScene.ts` | MAJOR MODIFY | TileSprite background, depth layering, camera fades, BitmapText replacement, button feedback |
| `src/scenes/barnLayout.ts` | MINOR MODIFY | Update `scaledFont` to return numeric BitmapText sizes |
| `src/scenes/tradingPostLayout.ts` | MINOR MODIFY | Update font helpers if applicable |
| `tests/e2e/mobile-smoke.spec.ts` | POSSIBLE MODIFY | Timing adjustments if scene transitions affect waits |
| `artifacts/visual/sprint-005-after/` | CREATE | Before/after screenshots for visual verification |
| `src/game/*` | **UNTOUCHED** | No game logic changes |

---

## Definition of Done

1. All `fontFamily: 'monospace'` removed from scene rendering code. All single-line text renders via BitmapText with the procedural pixel font.
2. Barn wall texture shows visible sine-wave wood grain, knot holes with deflected grain lines, and plank edge highlights --- not flat stripes.
3. Barn wall and straw floor use TileSprite. Textures tile without visible seams at 1920x1080.
4. Straw floor shows scattered diagonal strands with depth shadow --- not a grid pattern.
5. Card textures show paper mottling, fiber detail, and inner shadows.
6. Legendary card texture has gold flecks and ornamental border treatment distinct from regular cards.
7. Farmhouse shows shingle roof rows, window pane dividers (muntins), door with handle, clapboard siding, chimney with brick pattern.
8. Deck back has decorative diamond medallion and corner ornaments --- not a plain X-cross.
9. All procedural textures are deterministic from seeded PRNG --- identical output across repeated boots.
10. Card draw animates: deck-back flip (scaleX 1 to 0 to 1), bounce landing, straw puff, slot flash.
11. Buttons depress on press (scale 0.97, y+2) and spring back on release across both scenes.
12. Resource numbers pop on value change (scale 1.28 to 1.0).
13. Six particle effects active: dust motes, card puff, legendary shimmer, warning sparks, bust burst, celebration.
14. Particle textures use manually anti-aliased soft circles that read as soft despite `pixelArt: true`.
15. Vignette uses noise-dithered gradient with 20+ steps --- no visible banding.
16. Cards have drop shadows. Explicit depth layering prevents z-fighting.
17. Overlays use semi-transparent dark wood texture backgrounds --- not plain black.
18. Trading Post has textured wood-panel wall, consistent card materials, and painted buttons.
19. Camera fade transitions (200ms each direction) between Barn and Trading Post.
20. Idle animations active: deck float, window glow pulse.
21. All tests pass: `npm run ci` green. App chunk < 100KB gzipped.
22. `src/game/*` has zero diff.
23. Agent-browser screenshots at phone (393x852), tablet (768x1024), and desktop (1920x1080) show dramatic visual improvement over Sprint 004 baseline.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Procedural textures look noisy/muddy instead of beautiful | Medium | High | Use layered low-frequency variation first, then fine detail. Review actual screenshots after each material via agent-browser, not just runtime feel. Keep alpha values subtle (0.03-0.18 range for detail passes). |
| `pixelArt: true` makes particles look like hard-edged blocks | Medium | High | Particle textures use manually anti-aliased multi-pixel soft circles (3-step radial falloff). This is the locked decision from merge notes. Test at multiple scales immediately. |
| Tile seam visibility at large viewports | Medium | Medium | Use asymmetric edge-darkening on tile borders. Use 128px tiles (large enough that repeats are not immediately obvious). Overlay trim/shadow/rafter layers break repetition. Verify at 1920x1080 via agent-browser. |
| Bitmap font looks too crude / doesn't match warm rustic aesthetic | Medium | Medium | Hand-author the most common glyphs (A-Z, 0-9, punctuation) for personality. Test at all scale factors. BitmapText tinting with warm palette colors. If specific sizes look bad, adjust scale factor. |
| Particle counts hurt mobile performance | Medium | Medium | Caps are conservative (18 dust, 10 shimmer/card, one-shot bursts self-destruct). Profile with Chrome DevTools mobile throttling. If needed, reduce dust frequency or shimmer cap. |
| BitmapText word-wrap limitation causes overlay regression | Medium | Medium | Keep Phaser.Text for multi-line paragraphs (info panel body, summary descriptions). Split mixed-color text into separate BitmapText objects. |
| BootScene generation time increases noticeably | Low | Medium | Canvas texture generation is fast (pixel-level ops on small canvases). Most textures are 128x128 or smaller. Target total generation under 300ms. Profile if boot feels slow. |
| TileSprite + non-power-of-two texture WebGL artifacts | Low | Medium | Barn plank tile is 128x128 (power-of-two). Straw tile is 128x64 --- pad to 128x128 if artifacts appear. Test across Chrome, Safari, Firefox. |
| Animation tween chains orphan objects on scene shutdown | Medium | Medium | All multi-step tween chains check `this.scene.isActive()` before starting next step. `shutdown()` cleans up all persistent emitters, idle tweens, and temporary objects. Respect existing `isAnimating` gate. |
| Scope is ambitious (10 visual categories) | High | Medium | Phase order is deliberate: typography and textures ship first (Phases 1-2) for maximum visual impact. If time runs out, Phases 7-8 items like overlay polish and Trading Post enhancements are the first candidates to descope. |
| Resize invalidates particle emitter positions | Medium | Medium | Persistent emitters update emit zone bounds in `applyLayout`. One-shot emitters fire at current coordinates. Tested at 3 viewports via agent-browser. |
| Large diff across 3 major files | Medium | Medium | Phase-by-phase implementation with `npm run typecheck` verification at each boundary. No game logic touched. Each phase produces independently verifiable visual output. |

---

## Security

1. This sprint is client-side only. No new network paths, secrets, auth flows, or storage surfaces.
2. Deterministic procedural generation uses local constants only. No external content is executed or fetched.
3. `agent-browser` is a local verification tool, not a runtime dependency.
4. No user-controlled text is promoted into any new HTML surface. Changes remain inside Phaser rendering.
5. No new npm dependencies.

---

## Dependencies

1. **Phaser 3.80.x** (existing) --- BitmapText, RetroFont.Parse, CanvasTexture, TileSprite, particle emitters, tweens, camera effects are all built-in.
2. **No new npm packages.**
3. **Existing `animals` atlas** remains the only non-procedural art asset.
4. **agent-browser v0.20.14** for manual screenshot capture during review. Not a project dependency.
5. **Sprint 004 responsive layout** --- `Scale.RESIZE`, `applyLayout` pattern, and scene reflow support.

---

## Open Questions (Resolved)

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should we use a bitmap font generated at runtime or embed a pre-built atlas? | Runtime-generated. 5x7 column-byte glyph data in `pixelFont.ts`, atlas generated in BootScene via Graphics + RetroFont.Parse. No external font files. |
| 2 | BitmapText for everything, or keep Phaser.Text for some cases? | BitmapText for single-line labels, counters, headers, buttons. Keep Phaser.Text for multi-line paragraphs that need word wrap (info panel, summary descriptions). |
| 3 | Should textures stretch or tile at larger viewports? | Tile. 128x128 repeatable textures via TileSprite. Stretching a phone-sized texture to desktop produces chunky artifacts under `pixelArt: true`. |
| 4 | How to handle `pixelArt: true` conflict with soft particles? | Manually anti-aliased particle textures: multi-pixel soft circles with 3-step radial alpha falloff. Sprites and surface textures stay pixelArt nearest-neighbor. |
| 5 | How aggressive should the vignette be? | Noise-dithered with 20+ gradient steps at alpha 0.35. Dithering prevents banding under nearest-neighbor. Edges darken ~40-60px inward. HUD and cards are in the safe center. |
| 6 | Should particles have a Canvas fallback? | No. Phaser 3.80.x particle system works in both WebGL and Canvas renderers. The game already uses WebGL. |
| 7 | What is the priority order if scope must be cut? | Phase order IS priority order. Phases 1-2 (typography + textures) are the highest impact. Phases 7-8 (overlay polish, Trading Post detail, verification) can be descoped first without losing the core visual upgrade. |
| 8 | Should the Trading Post get the same level of polish as the Barn? | Yes. A polished barn that transitions to a flat brown rectangle makes the contrast worse. Trading Post gets full texture treatment with a distinct "tack room" identity. |
| 9 | Vignette depth: above or below overlays? | Below overlays. DEPTH.VIGNETTE = 95, DEPTH.OVERLAYS = 200. Vignette darkens the barn scene. Overlays render crisp above it. |
| 10 | Should procedural texture code go in BootScene or a separate file? | Separate file: `src/rendering/proceduralTextures.ts`. Three files justify the new directory per CLAUDE.md convention. |
| 11 | Depth spacing: sequential integers or wider? | Spaced by ~10s. Leaves room for insertion without renumbering. |
| 12 | Should the bitmap font support lowercase? | Yes. Full ASCII 32-126 coverage. UI uses mixed case already. |
