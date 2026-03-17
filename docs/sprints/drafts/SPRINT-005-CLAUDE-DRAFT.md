# Sprint 005: Make the Game Beautiful

## Overview

Sprint 004 delivered responsive layout — the game fills any viewport. But every visual is a flat rectangle: barn planks are horizontal stripes, cards are plain rounded rects, overlays are black boxes with monospace text, and there are zero particle effects or meaningful animations. The game looks like a developer prototype, not a product.

This sprint transforms the visual identity through **procedural texture enrichment**, **particle systems**, **animation juice**, **scene transitions**, **depth layering**, and **overlay theming** — all within the existing constraints: no new npm dependencies, no external art assets, app chunk < 100KB gzipped, `pixelArt: true`, `src/game/*` untouched.

The scope is purely cosmetic. Every change is in BootScene texture generation, BarnScene/TradingPostScene rendering, and constants. Game logic is not touched.

---

## Use Cases

1. **First impression** — A player opens the game on their phone. Instead of flat colored rectangles, they see a barn with visible wood grain, knot holes, and plank edge highlights. Straw on the floor has scattered diagonal strokes with depth shadows. The scene feels warm and atmospheric.

2. **Drawing a card** — The player taps "Draw Animal." A card-back flips (scaleX 1→0→1) from the deck position, slides to its slot with a bounce landing (Back.easeOut), and a small puff of straw-colored particles erupts on landing. The slot briefly flashes white. The experience feels tactile and satisfying.

3. **Legendary card in barn** — A legendary card sits in a slot with a perpetual shimmer of gold sparkle particles drifting upward from the card edges. The gold border glow pulse (already exists) is enhanced with particle accompaniment.

4. **Noise warning escalation** — When the third noise dot fills, red/orange spark particles burst from the noise meter. The farmhouse window glow intensifies. The player feels the danger.

5. **Bust event** — The barn busts. Red/orange sparks burst outward from the center. The camera shakes (already exists) and the bust overlay fades in with a dark barn-wood textured background instead of plain black.

6. **Night summary** — The player calls it a night. The overlay rises with a themed dark-wood background, visual dividers between score lines, and subtle background strips alternating on each line. Gold particles drift upward during the score tally.

7. **Scene transition** — The player finishes shopping at the Trading Post and taps "Start Next Night." The camera fades to black over 200ms, then fades back in on the Barn scene. Smooth and professional.

8. **Idle state** — The player pauses to think. Ambient dust motes float lazily through the barn. The farmhouse window glows with a slow sine pulse. The deck stack bobs gently. The game feels alive even when nothing is happening.

9. **Button interaction** — The player presses "Draw Animal." The button scales to 0.95 and shifts down 2px on press, then springs back on release. Every tap feels responsive.

10. **Trading Post atmosphere** — The shop has a warm wood-panel background texture instead of a flat brown rectangle. Cards have paper grain texture. The scene feels like a cozy general store.

---

## Architecture

### Texture Generation Strategy (BootScene)

All procedural textures are generated once in BootScene at reference sizes and scaled by scenes via `setDisplaySize()`. This sprint rewrites the draw callbacks for existing textures and adds new ones. The `maybeGenerateTexture` pattern is unchanged.

**Key constraint**: `pixelArt: true` + `roundPixels: true` means nearest-neighbor scaling. Textures must look good at 1x and at 2-3x upscale. This favors bold, high-contrast detail over subtle gradients.

### Seeded Pseudo-Random for Textures

Texture generation needs deterministic randomness (so textures look the same across sessions and don't change on HMR reload). Use a simple mulberry32 PRNG seeded with a fixed constant:

```typescript
const mulberry32 = (seed: number) => {
  return (): number => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
```

This is ~8 lines, zero dependencies, and gives us repeatable noise for wood grain, paper texture, straw scatter, etc.

### Particle System Architecture

Phaser 3.80.x has a built-in particle system via `this.add.particles()`. Key API:

```typescript
const emitter = this.add.particles(x, y, textureKey, {
  speed: { min, max },
  scale: { start, end },
  alpha: { start, end },
  lifespan: ms,
  frequency: ms,       // -1 = one-shot burst
  quantity: n,
  gravityY: px/s²,
  // ...
});
```

Particle textures are tiny (4x4, 6x6, 8x8) generated in BootScene. Each effect type gets a dedicated emitter configuration. Emitters are created in scenes and managed as instance properties for cleanup.

### Depth Layering

BarnScene currently renders objects in creation order. This sprint adds explicit depth layers:

```typescript
const DEPTH = {
  BG: 0,           // barn plank background
  ENVIRONMENT: 10, // floor straw, rafter
  FARMHOUSE: 20,   // farmhouse, window glow
  SLOTS: 30,       // empty slot outlines
  CARDS: 40,       // card containers
  CARD_SHADOWS: 35, // drop shadows behind cards
  PARTICLES_BG: 45, // dust motes, ambient
  HUD: 50,         // resource banner, noise meter, deck
  BUTTONS: 60,     // action bar
  PARTICLES_FG: 65, // card draw puff, bust sparks
  OVERLAYS: 70,    // bust, summary, info panel, win
  VIGNETTE: 80,    // vignette (on top of everything except overlays? — see Open Questions)
} as const;
```

All game objects call `.setDepth(DEPTH.XXX)` after creation. This replaces implicit z-ordering.

### Scene Transition Pattern

```typescript
// In TradingPostScene.onStartNight:
this.cameras.main.fadeOut(200, 0, 0, 0);
this.cameras.main.once('camerafadeoutcomplete', () => {
  const session = gameStore.getState();
  const nextSession = startNextNight(session);
  gameStore.setState(nextSession);
  this.scene.start(SceneKey.Barn);
});

// In BarnScene.create (after environment setup):
this.cameras.main.fadeIn(200, 0, 0, 0);
```

### Animation Juice Patterns

Button press feedback uses pointer events directly on the button image:

```typescript
button.on('pointerdown', () => {
  this.tweens.add({
    targets: [button, buttonText],
    scaleX: 0.95, scaleY: 0.95, y: '+=2',
    duration: 60, ease: 'Quad.easeOut',
  });
});
button.on('pointerup', () => {
  this.tweens.add({
    targets: [button, buttonText],
    scaleX: 1, scaleY: 1, y: '-=2',
    duration: 100, ease: 'Back.easeOut',
  });
});
```

Resource number changes use a pop tween on the text object:

```typescript
this.tweens.add({
  targets: textObj,
  scale: { from: 1.3, to: 1 },
  duration: ANIMATION.STAT_POP_MS,
  ease: 'Back.easeOut',
});
```

---

## Implementation

### Phase 1: Constants & Infrastructure (~10%)

**Goal**: New palette colors, animation timings, depth constants, particle texture keys, and the seeded PRNG utility.

**Files:**
- `src/config/constants.ts` — Modify

**Tasks:**
- [ ] Add `DEPTH` constant object (as defined in Architecture section) to constants.ts
- [ ] Add new `PALETTE` entries:
  - `BARN_HIGHLIGHT: 0xb8654e` — plank edge highlight
  - `BARN_KNOT: 0x4a1e14` — wood knot dark center
  - `STRAW_SHADOW: 0x8a6420` — straw depth shadow
  - `STRAW_DARK: 0x9e7a2e` — darker straw strands
  - `PAPER_GRAIN: 0xd8cba6` — card paper texture dark speckle
  - `DUST_MOTE: 0xd4a574` — ambient dust particle color
  - `SPARK_RED: 0xff4433` — bust/warning spark
  - `SPARK_ORANGE: 0xff8844` — bust/warning spark secondary
  - `GOLD_SPARKLE: 0xffd700` — legendary card sparkle
  - `OVERLAY_WOOD: 0x2a1810` — overlay background tint
  - `SUNSET_GLOW: 0xc4724a` — warm accent between sky and barn
  - `NIGHT_PLUM: 0x1a0e2e` — deep sky accent
  - `DUSTY_ROSE: 0xb07070` — warm highlight accent
  - `WARM_SHADOW: 0x3d1f1a` — depth shadow tone
- [ ] Add new `TEXTURES` entries:
  - `PARTICLE_DUST: 'particle-dust'` — 4x4 soft circle
  - `PARTICLE_SPARK: 'particle-spark'` — 6x6 bright diamond
  - `PARTICLE_GOLD: 'particle-gold'` — 4x4 gold circle
  - `PARTICLE_STRAW: 'particle-straw'` — 6x4 straw-colored rectangle
  - `OVERLAY_BG: 'ui-overlay-bg'` — dark wood textured overlay background
  - `CARD_SHADOW: 'ui-card-shadow'` — dark rounded rect for drop shadow
  - `VIGNETTE: 'env-vignette'` — radial gradient dark-edge overlay
  - `TRADING_POST_BG: 'env-trading-post-bg'` — wood panel background
- [ ] Add new `ANIMATION` entries:
  - `SCENE_FADE_MS: 200`
  - `BUTTON_PRESS_MS: 60`
  - `BUTTON_RELEASE_MS: 100`
  - `DUST_LIFESPAN_MS: 4000`
  - `CARD_FLIP_MS: 140`
  - `SLOT_FLASH_MS: 150`
  - `CELEBRATION_DURATION_MS: 2000`
  - `IDLE_FLOAT_MS: 3000`
  - `VIGNETTE_ALPHA: 0.35`

**Test:** `npm run typecheck` passes.

### Phase 2: Procedural Texture Overhaul (BootScene) (~30%)

**Goal**: Replace flat rectangle textures with richly detailed procedural textures. This is the heart of the sprint.

**Files:**
- `src/scenes/BootScene.ts` — Major rewrite of draw callbacks

**Tasks:**

#### 2a. Seeded PRNG + Helpers

- [ ] Add `mulberry32` PRNG function at top of BootScene.ts (module-level, not exported)
- [ ] Add helper: `drawNoise(graphics, x, y, w, h, color, alpha, density, rng)` — scatters `density` small rects (1-2px) across the region using `rng()` for positions. Used for paper grain, wood texture variation.

#### 2b. Barn Plank Background (390x844)

Current: Sky gradient top + flat barn-red fill + thin horizontal/vertical stripes.

New algorithm:
```
1. Fill sky gradient (3 bands: NIGHT_PLUM → SKY_TOP → SKY_MID → SUNSET_GLOW)
   - y=0→40: NIGHT_PLUM
   - y=40→80: SKY_TOP
   - y=80→120: SKY_MID blending toward SUNSET_GLOW at bottom edge

2. Fill barn base (y=88→680): BARN_BASE solid fill

3. Draw horizontal planks (y=104 to 680, step 28):
   For each plank row:
   a. Draw 4px dark separator line (BARN_DARK, alpha 0.8)
   b. Draw 1px highlight line below separator (BARN_HIGHLIGHT, alpha 0.3) — simulates light catching plank top edge
   c. Within each plank, draw wood grain:
      - 3-5 thin horizontal lines (1px, BARN_DARK, alpha 0.08-0.15) at rng() offsets within the 28px plank height
      - These lines vary in length (60-100% of width) and start position (0-15% from left) using rng()
   d. Scatter 1-2 knot holes per ~3 planks (rng() < 0.33):
      - Position: rng() * 390 for x, centered in plank for y
      - Draw: fillCircle(x, y, 3-5px) with BARN_KNOT color
      - Draw: strokeCircle same position with BARN_DARK at alpha 0.3 (ring shadow)
      - Draw: 1px highlight arc on top-left (BARN_HIGHLIGHT, alpha 0.2) — light reflection

4. Draw vertical plank joins (x from 10 to 390, step random 60-100):
   For each join:
   a. 2px line in BARN_DARK at alpha 0.25
   b. 1px offset highlight line (BARN_HIGHLIGHT, alpha 0.12)
   c. Joins are offset by rng()*8 from perfect grid — not ruler-straight

5. Scatter noise: drawNoise(graphics, 0, 88, 390, 592, BARN_DARK, 0.04, 200, rng)
   — Adds subtle grit/aging to the barn wall
```

#### 2c. Floor Straw (390x130)

Current: Flat yellow fill + horizontal/vertical stripe grid.

New algorithm:
```
1. Base fill: STRAW color

2. Draw depth gradient at top (shadow under barn wall):
   - 3 horizontal strips (y=0→4, 4→10, 10→18) at STRAW_SHADOW alpha 0.3, 0.2, 0.1
   — Creates illusion of barn wall casting shadow onto floor

3. Draw scattered straw strands (80-120 strands):
   For each strand:
   a. Start position: rng() * 390, rng() * 130
   b. Angle: mostly diagonal (rng() * 40 - 20 degrees from horizontal), occasional vertical
   c. Length: 8-24px (rng())
   d. Color: alternate between STRAW, STRAW_HIGHLIGHT, STRAW_DARK (rng() picks)
   e. Width: 1-2px
   f. Draw as a line from (x, y) to (x + len*cos(angle), y + len*sin(angle))
   g. For ~30% of strands: draw a 1px shadow line 1px below/right in STRAW_SHADOW at alpha 0.2

4. Scatter small dots of contrast:
   - drawNoise(graphics, 0, 0, 390, 130, STRAW_SHADOW, 0.06, 60, rng)
   - drawNoise(graphics, 0, 0, 390, 130, STRAW_HIGHLIGHT, 0.08, 40, rng)
```

#### 2d. Rafter (390x42)

Current: Dark solid fill + evenly spaced vertical bars.

New algorithm:
```
1. Base fill: BARN_DARK

2. Draw wood grain (horizontal):
   - 5-8 lines at rng() y-positions, 1px, BARN_KNOT alpha 0.2-0.35
   — Suggests the rafter is a thick beam

3. Draw bolt/nail heads every ~80px:
   - fillCircle at (80*i + rng()*10, 21), radius 2-3, color 0x2a1a10
   - 1px highlight dot at (x-1, y-1), BARN_HIGHLIGHT alpha 0.3

4. Draw 1px bottom edge highlight: BARN_HIGHLIGHT alpha 0.15 at y=41
   — Light catching bottom edge of rafter beam

5. Subtle noise: drawNoise(graphics, 0, 0, 390, 42, 0x000000, 0.03, 30, rng)
```

#### 2e. Card Backgrounds (Parchment, Noisy, Legendary) — 96x104 each

Current: Flat colored rounded rects with a 2px border.

New parchment algorithm:
```
1. Fill base: PARCHMENT rounded rect (radius 10)

2. Paper grain texture:
   - drawNoise(graphics, 4, 4, 88, 96, PAPER_GRAIN, 0.08, 80, rng)
   — Tiny dark speckles simulating paper fiber

3. Inner shadow (top):
   - Horizontal strip y=2→8, gradient from PAPER_GRAIN alpha 0.12 → 0.0
   - Creates impression of card curling slightly

4. Inner shadow (left):
   - Vertical strip x=2→6, PAPER_GRAIN alpha 0.08

5. Bottom edge darkening:
   - Strip y=96→102, PAPER_GRAIN alpha 0.06

6. Border: strokeRoundedRect with PARCHMENT_STROKE (existing)

7. Faint horizontal ruling lines (like lined paper):
   - Every 12px from y=20 to y=80, 1px line at PAPER_GRAIN alpha 0.04
   — Very subtle, barely visible, adds texture without visual noise
```

Noisy card: Same paper grain base but with NOISY_CARD color. Red warning strip at bottom gets 2px darker inner line for depth.

Legendary card: Gold-tinted parchment base. Paper grain uses 0xc4a060 (warm gold speckle). Add a subtle 1px inner border at 3px inset using LEGENDARY_GOLD alpha 0.15 — creates a "gilded edge" feel.

#### 2f. Farmhouse (142x116)

Current: Two dark rectangles + triangle roof + two black window rects.

New algorithm:
```
1. Base wall: fillRoundedRect(0, 28, 142, 88, 8) with 0x2b2f3f (existing)

2. Siding detail: horizontal lines every 8px from y=32 to y=112
   - 1px lines at 0x1f2330 alpha 0.3 — suggests clapboard siding

3. Roof (triangle): fill with 0x1f2330 (existing darker color)
   - Add 6-8 horizontal lines within triangle for shingle rows:
     For y from 4 to 28, step 4:
     - Draw line from triangle-left-edge(y) to triangle-right-edge(y)
     - 1px, color 0x15192a, alpha 0.5
   - Add alternating vertical tick marks on each shingle row (stagger by half):
     For each shingle row, every 10px: 1px vertical line, 3px tall, 0x15192a alpha 0.3

4. Windows: fillRect same positions (10,56,18,40) and (114,56,18,40)
   - Color: 0x171b26 (existing)
   - Add window pane dividers: 1px cross (+) centered in each window
     - Horizontal: y=76, spanning window width, color 0x2b2f3f
     - Vertical: x=19 and x=123, spanning window height, color 0x2b2f3f
   - Add 1px windowsill: lighter rect at bottom of each window (0x3a3f52, 18x3)

5. Door: fillRect centered at bottom (61, 90, 20, 26) with 0x171b26
   - 1px border: 0x2b2f3f
   - Door handle: fillCircle at (76, 103) radius 1.5, color 0x8b8b6b (brass-ish)

6. Chimney: fillRect at (108, 8, 14, 24) with 0x1f2330
   - 2px cap at top: slightly wider rect (106, 6, 18, 4) same color
```

#### 2g. Deck Card-Back (64x82)

Current: Purple rounded rect with inner rect, X-cross lines.

New algorithm:
```
1. Base: fillRoundedRect(0, 0, 64, 82, 8) with 0x3e2d5c (existing)

2. Decorative border: strokeRoundedRect at 4px inset (4, 4, 56, 74, 6)
   - 1px, 0xe8d7ff alpha 0.5

3. Inner panel: fillRoundedRect(8, 8, 48, 66, 5) with 0x6d56a1 alpha 0.6

4. Diamond pattern (instead of X cross):
   - Center diamond: 4 lines forming a diamond shape centered at (32, 41)
     - Points: top(32,16), right(52,41), bottom(32,66), left(12,41)
     - strokeLineShape for each edge, 1px, 0xe8d7ff alpha 0.6
   - Inner smaller diamond at half size:
     - Points: top(32,28), right(42,41), bottom(32,54), left(22,41)
     - 1px, 0xe8d7ff alpha 0.35
   - Center dot: fillCircle(32, 41, 2) with 0xe8d7ff alpha 0.5

5. Corner ornaments (4 corners, inside the border):
   - Top-left: two small lines forming an L, 3px each arm, at (8, 8)
   - Repeat mirrored for other 3 corners
   - Color: 0xe8d7ff alpha 0.3

6. Scatter faint noise for aged-card feel:
   - drawNoise(graphics, 8, 8, 48, 66, 0x2a1a3a, 0.06, 20, rng)
```

#### 2h. Particle Textures (new, tiny)

- [ ] `PARTICLE_DUST` (4x4): fillCircle(2, 2, 1.5) with DUST_MOTE. Soft single pixel with slight alpha edge.
- [ ] `PARTICLE_SPARK` (6x6): fillRect(1, 3, 4, 1) + fillRect(3, 1, 1, 4) — tiny diamond/cross shape. Color: 0xffffff (tinted by emitter).
- [ ] `PARTICLE_GOLD` (4x4): fillCircle(2, 2, 1.5) with GOLD_SPARKLE.
- [ ] `PARTICLE_STRAW` (6x4): fillRect(1, 1, 4, 2) with STRAW. Tiny rectangle representing a straw bit.

#### 2i. Overlay Background Texture (366x580)

- [ ] `OVERLAY_BG`: Dark barn wood texture for themed overlays.
```
1. Fill: OVERLAY_WOOD color, alpha 0.92
2. Horizontal plank lines every 20px: 1px, 0x000000 alpha 0.15
3. Faint vertical joins every 60-80px: 1px, 0x000000 alpha 0.08
4. drawNoise for grit: 0x000000, alpha 0.04, density 100
5. Rounded rect clip (radius 12)
```

#### 2j. Card Shadow Texture (96x104)

- [ ] `CARD_SHADOW`: Dark rounded rect offset for drop shadow.
```
1. fillRoundedRect(0, 0, 96, 104, 10) with WARM_SHADOW, alpha 0.4
— Blurred edges are simulated by drawing 3 nested rects at decreasing alpha:
  - Outer: fillRoundedRect(0, 0, 96, 104, 12) at alpha 0.12
  - Middle: fillRoundedRect(1, 1, 94, 102, 11) at alpha 0.2
  - Inner: fillRoundedRect(2, 2, 92, 100, 10) at alpha 0.35
```

#### 2k. Vignette Texture (390x844)

- [ ] `VIGNETTE`: Radial dark-edge overlay for atmospheric depth.
```
1. Transparent base (no fill)
2. Draw 4 edge gradients using fillRect strips with decreasing alpha:
   - Top: 6 strips from y=0, each 20-40px tall, alpha from 0.25 → 0.0
   - Bottom: 6 strips from y=844 upward, alpha from 0.3 → 0.0
   - Left: 4 strips from x=0, each 15-30px wide, alpha from 0.15 → 0.0
   - Right: 4 strips from x=390 leftward, alpha from 0.15 → 0.0
   - All strips use color 0x000000
3. Corner darkening: 4 rects at corners, ~60x80px, alpha 0.08
   — Subtle extra darkness in corners where two edges meet
```

#### 2l. Trading Post Background (390x844)

- [ ] `TRADING_POST_BG`: Warm wood panel texture.
```
1. Fill: SHOP_BG (0x5c4033)
2. Vertical plank pattern (panel boards):
   - Planks every 50-70px (rng for variation)
   - 2px dark line (0x3a2a1e) at each join
   - 1px highlight line offset (0x7a5a40, alpha 0.2)
3. Horizontal wood grain within each plank:
   - 3-4 thin lines per plank, 1px, 0x4a3020 alpha 0.12
4. drawNoise: 0x000000 alpha 0.03, density 120
5. Top/bottom decorative molding:
   - 4px strip at y=0 and y=840, color 0x3a2a1e
   - 1px highlight below/above at 0x7a5a40 alpha 0.25
```

**Test:** `npm run typecheck` passes. Visual verification via dev server.

### Phase 3: Depth, Shadows & Vignette (BarnScene) (~10%)

**Goal**: Add depth layering, card drop shadows, and vignette overlay to BarnScene.

**Files:**
- `src/scenes/BarnScene.ts` — Modify

**Tasks:**
- [ ] Import `DEPTH` from constants
- [ ] In `create()`, after all environment setup, add `.setDepth(DEPTH.XXX)` to every game object:
  - `barnBackground` → `DEPTH.BG`
  - `floorStraw` → `DEPTH.ENVIRONMENT`
  - `rafter` → `DEPTH.ENVIRONMENT`
  - `farmhouseImage` → `DEPTH.FARMHOUSE`
  - `windowGlow` → `DEPTH.FARMHOUSE`
  - `deckStack` → `DEPTH.HUD`
  - `deckCountText` → `DEPTH.HUD`
  - Each `slotImage` → `DEPTH.SLOTS`
  - `nightText`, `mischiefText`, `hayText`, etc. → `DEPTH.HUD`
  - `noiseLabel`, `noiseDots` → `DEPTH.HUD`
  - `primaryButton`, `primaryButtonText` → `DEPTH.BUTTONS`
  - Overlays → `DEPTH.OVERLAYS`
- [ ] Add vignette image on top:
  ```typescript
  this.vignette = this.add.image(0, 0, TEXTURES.VIGNETTE)
    .setOrigin(0).setDisplaySize(cw, ch)
    .setDepth(DEPTH.VIGNETTE).setAlpha(ANIMATION.VIGNETTE_ALPHA);
  ```
  Update in `applyLayout` to fill canvas: `.setDisplaySize(cw, ch)`
- [ ] In `renderCardInSlot`, before creating the card container, add a shadow image:
  ```typescript
  const shadow = this.add.image(slot.x + 3, slot.y + 4, TEXTURES.CARD_SHADOW)
    .setOrigin(0).setDisplaySize(slot.w, slot.h)
    .setDepth(DEPTH.CARD_SHADOWS).setAlpha(0.5);
  ```
  Store shadow references for cleanup and repositioning in `applyLayout`.
- [ ] Card containers → `DEPTH.CARDS`

**Test:** Visual verification — cards appear to float above slots. Vignette is visible but not distracting. `npm run typecheck` passes.

### Phase 4: Particle Effects (~15%)

**Goal**: Add ambient dust, card draw puff, legendary shimmer, bust sparks, and celebration particles.

**Files:**
- `src/scenes/BarnScene.ts` — Modify

**Tasks:**

#### 4a. Ambient Dust Motes

- [ ] In `create()`, after environment setup:
  ```typescript
  this.dustEmitter = this.add.particles(0, 0, TEXTURES.PARTICLE_DUST, {
    x: { min: 0, max: cw },
    y: { min: 80, max: ch - 140 },  // barn interior only
    speed: { min: 2, max: 8 },
    angle: { min: 250, max: 290 },   // gentle downward drift
    scale: { start: 0.8, end: 0.2 },
    alpha: { start: 0.4, end: 0 },
    lifespan: ANIMATION.DUST_LIFESPAN_MS,
    frequency: 600,                   // one mote every 600ms
    quantity: 1,
  }).setDepth(DEPTH.PARTICLES_BG);
  ```
- [ ] Update emitter bounds in `applyLayout` to match current viewport.
- [ ] Destroy emitter in `shutdown()`.

#### 4b. Card Draw Puff

- [ ] In `animateCardReveal`, on the `onComplete` of the slide tween (when card lands in slot):
  ```typescript
  this.add.particles(slot.x + slot.w / 2, slot.y + slot.h, TEXTURES.PARTICLE_STRAW, {
    speed: { min: 20, max: 60 },
    angle: { min: 220, max: 320 },   // upward fan
    scale: { start: 1.2, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: 400,
    frequency: -1,                    // one-shot burst
    quantity: 8,
    gravityY: 40,
  }).setDepth(DEPTH.PARTICLES_FG);
  ```
  The emitter auto-destroys when all particles expire (Phaser default for one-shot).

#### 4c. Slot Landing Flash

- [ ] In `animateCardReveal`, on card landing:
  ```typescript
  const flash = this.add.rectangle(
    slot.x + slot.w / 2, slot.y + slot.h / 2, slot.w, slot.h, 0xffffff, 0.5
  ).setDepth(DEPTH.CARDS + 1);
  this.tweens.add({
    targets: flash,
    alpha: 0,
    duration: ANIMATION.SLOT_FLASH_MS,
    onComplete: () => flash.destroy(),
  });
  ```

#### 4d. Legendary Card Shimmer

- [ ] In `renderCardInSlot`, when `animalDef.tier === 'legendary'`, after existing glow border:
  ```typescript
  const shimmer = this.add.particles(
    slot.x + slot.w / 2, slot.y + slot.h / 2, TEXTURES.PARTICLE_GOLD, {
    x: { min: -slot.w / 2, max: slot.w / 2 },
    y: { min: slot.h / 4, max: slot.h / 2 },
    speed: { min: 5, max: 15 },
    angle: { min: 260, max: 280 },   // upward
    scale: { start: 1, end: 0 },
    alpha: { start: 0.6, end: 0 },
    lifespan: 1200,
    frequency: 300,
    quantity: 1,
    gravityY: -10,                    // float upward
  }).setDepth(DEPTH.PARTICLES_BG);
  container.setData('shimmerEmitter', shimmer);
  ```
  Clean up in `rebuildBarnDisplay`.

#### 4e. Bust/Warning Sparks

- [ ] In `animateBust`, before camera shake:
  ```typescript
  this.add.particles(cw / 2, ch / 2, TEXTURES.PARTICLE_SPARK, {
    speed: { min: 80, max: 200 },
    angle: { min: 0, max: 360 },      // radial burst
    scale: { start: 1.5, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [PALETTE.SPARK_RED, PALETTE.SPARK_ORANGE],
    lifespan: 600,
    frequency: -1,
    quantity: 20,
    gravityY: 60,
  }).setDepth(DEPTH.PARTICLES_FG);
  ```

- [ ] When third noise dot fills (in warning state change handler), smaller burst:
  ```typescript
  const dotPos = this.noiseDots[2]; // third dot
  this.add.particles(dotPos.x + 9, dotPos.y + 9, TEXTURES.PARTICLE_SPARK, {
    speed: { min: 30, max: 80 },
    angle: { min: 0, max: 360 },
    scale: { start: 1, end: 0 },
    tint: [PALETTE.SPARK_RED, PALETTE.SPARK_ORANGE],
    lifespan: 400,
    frequency: -1,
    quantity: 6,
  }).setDepth(DEPTH.PARTICLES_FG);
  ```

#### 4f. Night Summary Celebration

- [ ] In `showNightSummaryOverlay`, if score is positive:
  ```typescript
  this.celebrationEmitter = this.add.particles(cw / 2, ch, TEXTURES.PARTICLE_GOLD, {
    x: { min: -cw / 3, max: cw / 3 },
    speed: { min: 40, max: 120 },
    angle: { min: 250, max: 290 },
    scale: { start: 1.2, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 1500,
    frequency: 80,
    quantity: 2,
    gravityY: -30,
  }).setDepth(DEPTH.OVERLAYS + 1);
  // Stop after 2 seconds
  this.time.delayedCall(ANIMATION.CELEBRATION_DURATION_MS, () => {
    this.celebrationEmitter?.stop();
  });
  ```

**Test:** Visual verification of each particle effect. `npm run typecheck` passes.

### Phase 5: Animation Juice (~15%)

**Goal**: Card flip, button press, resource pop, noise dot fill, idle animations.

**Files:**
- `src/scenes/BarnScene.ts` — Modify
- `src/scenes/TradingPostScene.ts` — Modify

**Tasks:**

#### 5a. Card Draw Flip Animation

- [ ] Modify `animateCardReveal`: instead of scaling from 0.5 to 1, do a card-flip:
  ```typescript
  // Phase 1: Show card-back, slide from deck, flip
  container.setScale(0.5);
  container.setAlpha(0);

  // Show a temporary deck-back image at deck position
  const deckBack = this.add.image(deckPos.x, deckPos.y, TEXTURES.DECK_BACK)
    .setOrigin(0).setDisplaySize(slot.w * 0.5, slot.h * 0.5)
    .setDepth(DEPTH.CARDS);

  // Slide deck-back to slot
  this.tweens.add({
    targets: deckBack,
    x: slot.x, y: slot.y,
    displayWidth: slot.w, displayHeight: slot.h,
    duration: ANIMATION.DRAW_SLIDE_MS,
    ease: 'Quad.easeOut',
    onComplete: () => {
      // Flip: shrink deckBack X to 0
      this.tweens.add({
        targets: deckBack,
        scaleX: 0,
        duration: ANIMATION.CARD_FLIP_MS / 2,
        ease: 'Quad.easeIn',
        onComplete: () => {
          deckBack.destroy();
          // Show real card, expand from 0 X
          container.setPosition(slot.x, slot.y);
          container.setAlpha(1);
          container.setScale(1, 1);
          // Temporarily squish X to 0, then expand
          container.scaleX = 0;
          this.tweens.add({
            targets: container,
            scaleX: 1,
            duration: ANIMATION.CARD_FLIP_MS / 2,
            ease: 'Quad.easeOut',
            onComplete: () => {
              // Bounce pop
              this.tweens.add({
                targets: container,
                scale: 1.08,
                duration: ANIMATION.STAT_POP_MS / 2,
                yoyo: true,
                ease: 'Quad.easeInOut',
                onComplete: () => { /* puff particles + slot flash + resolve */ },
              });
            },
          });
        },
      });
    },
  });
  ```

#### 5b. Button Press Feedback

- [ ] Extract a reusable `addButtonPressFeedback(button, buttonText)` helper method:
  ```typescript
  private addButtonPressFeedback(
    button: Phaser.GameObjects.Image,
    text: Phaser.GameObjects.Text
  ): void {
    button.on('pointerdown', () => {
      this.tweens.add({
        targets: [button, text],
        scaleX: 0.95, scaleY: 0.95,
        y: `+=2`,
        duration: ANIMATION.BUTTON_PRESS_MS,
        ease: 'Quad.easeOut',
      });
    });
    button.on('pointerup', () => {
      this.tweens.add({
        targets: [button, text],
        scaleX: 1, scaleY: 1,
        y: `-=2`,
        duration: ANIMATION.BUTTON_RELEASE_MS,
        ease: 'Back.easeOut',
      });
    });
    button.on('pointerout', () => {
      // Reset if pointer leaves while pressed
      this.tweens.add({
        targets: [button, text],
        scaleX: 1, scaleY: 1,
        y: button.getData('baseY') ?? button.y,
        duration: ANIMATION.BUTTON_RELEASE_MS,
      });
    });
  }
  ```
- [ ] Apply to all buttons in BarnScene: primary, secondary, overlay buttons.
- [ ] Apply to all buttons in TradingPostScene: tabs, capacity, start night.

#### 5c. Resource Number Pop

- [ ] In `updateHud`, after setting text, check if value changed and add pop tween:
  ```typescript
  if (this.mischiefText.text !== newMischiefStr) {
    this.mischiefText.setText(newMischiefStr);
    this.tweens.add({
      targets: this.mischiefText,
      scale: { from: 1.3, to: 1 },
      duration: ANIMATION.STAT_POP_MS,
      ease: 'Back.easeOut',
    });
  }
  ```
  Same pattern for hay, capacity, deck count, legendary count.

#### 5d. Noise Dot Fill Animation

- [ ] In `updateNoiseMeter`, when a dot transitions from empty to filled, animate it:
  ```typescript
  dot.setTexture(TEXTURES.NOISE_DOT_FILLED);
  dot.setScale(0);
  this.tweens.add({
    targets: dot,
    scale: 1,
    duration: 200,
    ease: 'Back.easeOut',
  });
  ```

#### 5e. Idle Animations

- [ ] Farmhouse window glow: Already exists (`startWindowGlow`). No change needed — it already pulses with sine ease.
- [ ] Deck stack float:
  ```typescript
  this.tweens.add({
    targets: [this.deckStack, this.deckCountText],
    y: `+=2`,
    duration: ANIMATION.IDLE_FLOAT_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  ```
  Start this in `create()` unconditionally. Store reference for cleanup.

**Test:** Visual verification of all animations. Tap responsiveness confirmed. `npm run typecheck` passes.

### Phase 6: Scene Transitions & Overlay Theming (~10%)

**Goal**: Camera fade transitions between scenes. Themed overlay backgrounds.

**Files:**
- `src/scenes/BarnScene.ts` — Modify
- `src/scenes/TradingPostScene.ts` — Modify

**Tasks:**

#### 6a. Scene Transitions

- [ ] In `BarnScene.create()`, after all setup:
  ```typescript
  this.cameras.main.fadeIn(ANIMATION.SCENE_FADE_MS, 0, 0, 0);
  ```
- [ ] In `TradingPostScene.onStartNight()`, replace direct `this.scene.start`:
  ```typescript
  this.cameras.main.fadeOut(ANIMATION.SCENE_FADE_MS, 0, 0, 0);
  this.cameras.main.once('camerafadeoutcomplete', () => {
    const session = gameStore.getState();
    const nextSession = startNextNight(session);
    gameStore.setState(nextSession);
    this.scene.start(SceneKey.Barn);
  });
  ```
- [ ] When BarnScene transitions to TradingPost (in `showNightSummaryOverlay` "Continue" handler), same fade pattern.

#### 6b. Themed Overlay Backgrounds

- [ ] In `showBustOverlay`: replace `this.add.rectangle(0, 0, w, h, 0x000000, 0.75)` with:
  ```typescript
  const bg = this.add.image(0, 0, TEXTURES.OVERLAY_BG)
    .setOrigin(0).setDisplaySize(bounds.w, bounds.h).setAlpha(0.92);
  ```
- [ ] In `showNightSummaryOverlay`: same replacement. Add score line background strips:
  ```typescript
  // Alternating subtle strips behind each score line
  lines.forEach((line, i) => {
    if (i % 2 === 0) {
      const strip = this.add.rectangle(w/2, lineY, w - 20, lineH, 0xffffff, 0.04);
      overlay.add(strip);
    }
  });
  ```
  Add thin horizontal dividers (1px, 0xffffff alpha 0.08) between score sections.
- [ ] In `showWinOverlay`: Use themed background instead of plain black.

#### 6c. Trading Post Background

- [ ] In `TradingPostScene.create()`: replace `this.add.rectangle(...)` background with:
  ```typescript
  this.background = this.add.image(cw / 2, ch / 2, TEXTURES.TRADING_POST_BG)
    .setOrigin(0.5).setDisplaySize(cw, ch);
  ```

**Test:** Visual verification of transitions and overlays. `npm run typecheck` passes.

### Phase 7: Card Touch Feedback & Long-Press Radial (~5%)

**Goal**: Card press visual feedback and long-press progress indicator.

**Files:**
- `src/scenes/BarnScene.ts` — Modify

**Tasks:**

- [ ] In `renderCardInSlot`, on the hit area `pointerdown`:
  ```typescript
  this.tweens.add({
    targets: container,
    scale: 1.05,
    duration: 60,
    ease: 'Quad.easeOut',
  });
  ```
  On `pointerup` / `pointerout`: tween back to 1.0.

- [ ] Long-press radial fill indicator: In `pointerdown` handler, create an arc that grows during the 300ms hold:
  ```typescript
  const arc = this.add.graphics().setDepth(DEPTH.CARDS + 2);
  const cx = slot.w / 2, cy = slot.h / 2, r = Math.min(slot.w, slot.h) / 3;
  container.add(arc);

  // Animate arc growth using a timer
  let progress = 0;
  const progressTimer = this.time.addEvent({
    delay: 16, // ~60fps
    repeat: Math.ceil(ANIMATION.LONG_PRESS_MS / 16),
    callback: () => {
      progress = Math.min(1, progressTimer.getProgress());
      arc.clear();
      arc.lineStyle(3, 0xffffff, 0.5);
      arc.beginPath();
      arc.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2, false);
      arc.strokePath();
    },
  });
  ```
  Destroy arc on `pointerup` / `pointerout` / long-press completion.

**Test:** Visual verification. Touch responsiveness. `npm run typecheck` passes.

### Phase 8: Testing & Verification (~5%)

**Goal**: All tests pass, CI green, visual verification.

**Files:**
- `tests/e2e/*` — Possible timing adjustments
- `src/scenes/barnLayout.test.ts` — No changes expected

**Tasks:**
- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean (may need formatting fixes from new code)
- [ ] `npm run format:check` — clean
- [ ] `npm run test` — all unit tests pass (no layout helper changes expected)
- [ ] `npm run build` — production build succeeds
- [ ] `npm run budget` — app chunk < 100KB gzipped
- [ ] `npm run test:e2e` — may need timing adjustments:
  - If scene transitions add 200ms delays, Playwright waits via `__GAME_READY__` should still work (signal fires after BarnScene.create finishes, which is after fadeIn starts but doesn't block create)
  - If bust/summary overlays take longer to appear, e2e test timeouts may need +500ms
- [ ] agent-browser screenshots at 3 viewports (phone portrait, tablet, desktop):
  ```bash
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
- [ ] Side-by-side comparison with `artifacts/visual/sprint-004-before/` screenshots

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/config/constants.ts` | Modify | New palette colors, depth constants, particle texture keys, animation timings |
| `src/scenes/BootScene.ts` | Major rewrite | All texture draw callbacks rewritten with rich procedural detail; new particle + overlay textures |
| `src/scenes/BarnScene.ts` | Major modify | Depth layering, vignette, particles (5 types), card flip animation, button feedback, idle animations, scene fade transitions, themed overlays, card touch feedback, long-press radial |
| `src/scenes/TradingPostScene.ts` | Modify | Scene fade transitions, button press feedback, wood-panel background texture |
| `src/game/*` | **UNTOUCHED** | No game logic changes |
| `src/scenes/barnLayout.ts` | No changes | Layout math unchanged |
| `src/scenes/tradingPostLayout.ts` | No changes | Layout math unchanged |
| `src/scenes/barnLayout.test.ts` | No changes | Layout tests unchanged |
| `tests/e2e/*` | Possible minor | Timing adjustments if scene transitions affect e2e waits |
| `artifacts/visual/sprint-005-after/` | Create | Before/after screenshots for visual verification |

---

## Definition of Done

1. **Wood grain visible**: Barn plank background shows horizontal grain lines, knot holes, and plank-edge highlights at phone viewport. Not flat stripes.
2. **Straw has depth**: Floor straw shows scattered diagonal strands with shadow underneath, not a grid pattern.
3. **Cards have paper texture**: Parchment cards show subtle grain speckles and inner shadow edges. Legendary cards have gold speckle.
4. **Farmhouse has detail**: Visible shingle rows on roof, window pane dividers, door with handle, siding lines.
5. **Deck back is decorative**: Diamond pattern with corner ornaments, not a plain X-cross.
6. **Particle: dust motes**: Ambient particles drift lazily through barn interior in idle state.
7. **Particle: card draw puff**: Straw-colored burst on card landing in slot.
8. **Particle: legendary shimmer**: Gold sparkles drift upward from legendary cards.
9. **Particle: bust sparks**: Red/orange radial burst on bust event.
10. **Particle: celebration**: Gold particles during night summary (positive score).
11. **Card flip animation**: Card-back slides from deck, flips (scaleX 0→1), bounces on landing.
12. **Button press feedback**: All buttons scale to 0.95 + shift down on press, spring back on release.
13. **Resource pop**: Number text pops 1.3→1 on value change.
14. **Scene transitions**: Camera fade-out/fade-in (200ms each) between Barn and Trading Post.
15. **Depth layering**: Cards float above slots (visible drop shadows). Vignette darkens edges.
16. **Themed overlays**: Bust and summary overlays use dark wood texture background, not plain black.
17. **Trading Post textured**: Wood-panel background instead of flat brown rectangle.
18. **Idle animations**: Deck stack bobs gently. Window glow pulses (pre-existing, verified working).
19. **Noise dot animation**: New noise dots animate from scale 0→1 with bounce.
20. **All tests pass**: `npm run ci` green.
21. **Bundle budget met**: App chunk < 100KB gzipped.
22. **No game logic changes**: `src/game/*` files have zero diff.
23. **agent-browser screenshots**: Before/after comparison shows dramatic visual improvement at 3 viewports.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Procedural textures look bad at pixelArt nearest-neighbor scaling** | Medium | High | Test textures at 1x and 2-3x immediately in Phase 2. Pixel art favors bold contrast — avoid subtle gradients that smear on upscale. Use 1-2px detail strokes, not sub-pixel anti-aliasing. |
| **Particle system performance on low-end phones** | Medium | Medium | Keep particle counts conservative: dust (1 per 600ms), shimmer (1 per 300ms), bursts (6-20 one-shot). Total active particles at any time < 30. Profile on throttled Chrome DevTools. |
| **BootScene texture generation time increases** | Low | Medium | Current BootScene generates ~25 textures in <100ms. Adding procedural detail (grain, noise, strands) adds ~200 draw calls per texture. Total should stay under 300ms. If slow, defer non-critical textures to idle callback. |
| **Card flip animation feels janky** | Medium | Medium | Tune timing values: 140ms flip is fast enough to feel snappy. Test on real device — if it stutters, simplify to just the scaleX flip without the separate deck-back slide. |
| **Vignette too aggressive, obscures UI** | Medium | Low | Start at alpha 0.35. Tuneable via `ANIMATION.VIGNETTE_ALPHA` constant. Edge strips only affect outer 30-40px — HUD and cards are in the safe center zone. |
| **Scene transition fadeOut blocks input too early** | Low | Medium | fadeOut is a camera effect — it doesn't block scene logic. The scene.start() call is in the `camerafadeoutcomplete` callback, so the transition is clean. |
| **Bundle size increase from texture generation code** | Low | Low | Texture generation is just Graphics API draw calls — no heavy data. Estimated code increase: ~400-500 lines in BootScene, ~200 lines in BarnScene for particles/animation. TypeScript compiles this to < 8KB gzipped. Well within the 79KB headroom. |
| **Long-press radial arc uses per-frame Graphics.clear()** | Medium | Low | Phaser's Graphics redraw is cheap for a single arc. 18 redraws over 300ms at 60fps. If performance is a concern, use a pre-rendered arc sprite sheet instead. |
| **Depth layering breaks existing z-ordering** | Medium | Medium | Phase 3 is dedicated to depth layering. Test every visual state (empty barn, full barn, bust overlay, win overlay, info panel) immediately after applying depth values. |
| **Scope creep** | High | High | The 8-phase plan has clear cut points. If running long, Phase 7 (card touch feedback + radial) is the first candidate to defer. Core visual improvement (textures, particles, transitions) is Phases 1-6. |

---

## Security Considerations

- Static client-only site. No backend, auth, or secret handling.
- No new runtime dependencies.
- Procedural texture generation is pure canvas draw calls — no external data, no injection vectors.
- Particle system uses Phaser built-in — no custom WebGL shaders or external libraries.
- agent-browser runs locally on the developer's machine, never in production.

---

## Dependencies

- **Existing stack**: Phaser 3.80.x (particles, tweens, Graphics API, camera effects all built-in), TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Phaser particle system**: `this.add.particles()` — built into Phaser 3.60+, fully available in 3.80.x
- **Phaser camera effects**: `this.cameras.main.fadeIn()` / `fadeOut()` — built-in
- **No new npm dependencies**
- **agent-browser**: External manual tool for verification, not a project dependency

---

## Open Questions

| # | Question | Notes |
|---|----------|-------|
| 1 | **Should the vignette render above or below overlays?** | Proposed: above environment but below overlays (DEPTH.VIGNETTE = 80 vs DEPTH.OVERLAYS = 70). Wait — this means vignette is ABOVE overlays. Should it be 55 instead? Need to decide: does the vignette darken overlays too, or only the barn scene? Recommendation: vignette at depth 55 (above HUD, below overlays) so overlays are crisp. |
| 2 | **Should the Trading Post get particles?** | The intent doc says "same level of polish." Ambient dust would make sense. Bust/legendary particles don't apply. A simple ambient particle (floating dust or wood shavings) would add atmosphere. Recommend: yes, one ambient emitter, same as barn dust but with a warmer tint. |
| 3 | **Should the bitmap font upgrade be in this sprint?** | The intent doc lists it, but it's a significant sub-project (runtime glyph generation or embedded atlas). The sprint is already ambitious without it. Recommend: defer to Sprint 006. Monospace text with improved hierarchy (bold/size variation already exists) is acceptable for this sprint. |
| 4 | **What's the priority order if scope must be cut?** | Recommended triage: (1) Textures — biggest bang for visual impact, (2) Depth + shadows — cheap, high impact, (3) Particles — adds life, (4) Scene transitions — polished feel, (5) Button feedback — satisfying, (6) Card flip — delightful, (7) Overlay theming — nice but not essential, (8) Card touch feedback + radial — defer first. |
| 5 | **Should particle effects have a quality toggle?** | If performance is a concern on low-end devices, we could gate particles behind a `const PARTICLES_ENABLED = true` flag. Probably not needed given conservative particle counts, but easy to add. |
| 6 | **Should the seeded PRNG be in a shared utility file?** | It's only used in BootScene. Per directory rules ("do not create a new src/ subdirectory until a second file would go in it"), keep it module-local in BootScene.ts. Extract if a second consumer appears. |
