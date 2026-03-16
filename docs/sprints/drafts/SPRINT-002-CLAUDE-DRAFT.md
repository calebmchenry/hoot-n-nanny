# Sprint 002: Playable & Beautiful Core Loop

## Overview

Sprint 002 transforms Hoot 'n Nanny from a colored-rectangle wireframe into a playable, visually polished push-your-luck card game. The deliverable is a complete single-player core loop: shuffle your herd, draw animals one at a time into the barn, risk busting from noise or overcrowding, score Mischief and Hay, spend them at the Trading Post, and repeat. The game must look beautiful — not just functional — with procedurally rendered pixel-art-style animal cards, smooth draw animations, visual bust/warning feedback, and a cohesive farm-night aesthetic.

Sprint 001 delivered infrastructure and a layout wireframe. Sprint 002 builds the game on top of it. The architectural foundation (thin scenes, LAYOUT constants, pure layout helpers, 390×844 logical canvas) remains intact. New code lives primarily in `src/game/` (pure game logic) and modifications to `BarnScene` (draw phase) plus a new `TradingPostScene` (shop phase). All game logic is unit-testable without Phaser. All visual rendering uses Phaser primitives — no external sprite assets, no asset pipeline changes, no bundle budget risk.

**Why procedural rendering?** The app chunk budget is <100KB gzipped. Procedural animal cards (Phaser.Graphics shapes + bitmap text + color palettes) cost zero asset bytes, are infinitely tweakable, and deliver a distinctive chunky pixel-art aesthetic when drawn on an 88×88 grid. Sourcing and loading sprite sheets would risk the budget, add licensing overhead, and slow iteration. The procedural approach is the right call for this sprint; a sprite art pass can layer on top later if desired.

**Scope boundary:** This sprint implements passive and triggered abilities only. Active abilities (Sheepdog peek, Stable Hand boot, Border Collie fetch, etc.) require mid-draw player choice UI — that's Sprint 003. Animals with active abilities are present in the Trading Post but their abilities are labeled "Coming Soon" and they function as vanilla stat sticks until then. This keeps Sprint 002 shippable without cutting the animal roster.

---

## Use Cases

1. **Play a Night**: Player taps "Draw Animal" repeatedly, watching animals appear in barn slots with a card-flip animation. After each draw, they choose "Keep Going" or "Call It a Night." The Night resolves with scoring or bust feedback.
2. **Bust — Farmer Wakes Up**: Player draws a third unmitigated NOISY! animal. The farmhouse window flashes red, the screen shakes, and a "Farmer Woke Up!" overlay appears. Zero scoring. One animal is Penned Up.
3. **Bust — Barn Overwhelmed**: Player draws past barn capacity (5 default). A "Barn Overwhelmed!" overlay appears with a crashing visual effect. Zero scoring. One animal is Penned Up.
4. **NOISY! Warning**: At 2 unmitigated NOISY! animals, the farmhouse window glows amber and pulses. The warning is persistent and impossible to miss.
5. **Successful Night scoring**: Player calls it a night. Mischief and Hay tallies animate upward. Animals with triggered abilities fire visibly (e.g., Hermit Crab bonus text floats up).
6. **Trading Post shopping**: After a Night, the Trading Post scene shows purchasable animals as cards with costs, stats, and ability text. Player taps to buy, sees their Mischief/Hay decrease, and the animal joins their herd.
7. **Barn capacity upgrade**: In the Trading Post, player spends Hay to add a barn slot. The cost increases incrementally (2, 3, 4, 5...).
8. **Game loop continuity**: After the Trading Post, a new Night begins with the updated herd. The loop repeats indefinitely.
9. **Herd visibility**: Player can see their full herd composition at any time via a herd panel/drawer.
10. **Visual delight**: Every interaction has feedback — button flashes, card draw animations, slot fill transitions, warning pulses, bust screen shakes, scoring number floats. The game feels alive.

---

## Architecture

### Scene Flow

```
BootScene → BarnScene ←→ NightSummaryOverlay
                ↓
         TradingPostScene
                ↓
            BarnScene (next Night)
```

- **BarnScene** is overhauled: it now manages the draw phase with real game state, animated card draws, NOISY! warnings, and bust detection.
- **NightSummaryOverlay** is not a separate scene — it's a UI layer rendered within BarnScene (Phaser container with a semi-transparent backdrop). This avoids scene transition overhead for a momentary results display.
- **TradingPostScene** is a new scene for the shop phase. Player buys animals and capacity upgrades, then transitions back to BarnScene for the next Night.
- **BootScene** unchanged — still just hands off to BarnScene.

### Module Structure (after Sprint 002)

```
src/
├── main.ts
├── config/
│   ├── game.ts              — Add TradingPostScene to scene array
│   └── constants.ts         — Extend LAYOUT with new UI element positions
├── game/
│   ├── animals.ts           — Animal definitions (stats, abilities, art config)
│   ├── deck.ts              — Herd/deck engine (shuffle, draw, reset)
│   ├── state.ts             — GameState management (currencies, herd, capacity, night count)
│   ├── scoring.ts           — Night scoring logic (Mischief, Hay, triggered abilities)
│   ├── bust.ts              — Bust condition detection (noise count, capacity check)
│   ├── tradingPost.ts       — Shop logic (buy animal, expand capacity, stock management)
│   ├── animals.test.ts      — Unit tests for animal definitions
│   ├── deck.test.ts         — Unit tests for deck engine
│   ├── scoring.test.ts      — Unit tests for scoring
│   └── bust.test.ts         — Unit tests for bust detection
├── scenes/
│   ├── BootScene.ts         — Unchanged
│   ├── BarnScene.ts         — Major overhaul: draw phase gameplay
│   ├── barnLayout.ts        — Extend with card positions, warning zones, overlay layout
│   ├── barnLayout.test.ts   — Extend with new layout tests
│   ├── TradingPostScene.ts  — NEW: shop phase
│   └── tradingPostLayout.ts — NEW: pure layout helpers for Trading Post
└── types/
    └── index.ts             — Expand: Animal, AnimalCard, GameState, BustType, etc.
```

### Game State Model

All game state lives in a single `GameState` object managed by pure functions in `src/game/state.ts`. Scenes read from it and dispatch actions to it. No state lives on scene instances beyond Phaser display objects.

```typescript
interface GameState {
  herd: AnimalCard[];           // Full herd (all owned animals)
  drawPile: AnimalCard[];       // Shuffled remaining deck for this Night
  barn: AnimalCard[];           // Animals currently drawn into the barn
  barnCapacity: number;         // Current max (starts 5, upgradeable)
  mischief: number;             // Currency
  hay: number;                  // Currency
  nightCount: number;           // For display / Harvest Mouse scaling
  pennedUp: AnimalId | null;    // Animal banned from next Night
  phase: 'draw' | 'summary' | 'trading';
}
```

The state object is created at game start and passed between scenes via Phaser's scene `data` mechanism (`this.scene.start(SceneKey.TradingPost, { state })`).

### Animal Definition Model

Each animal type is defined as a static record in `src/game/animals.ts`:

```typescript
interface AnimalDef {
  id: AnimalId;                  // e.g. 'barn_cat', 'feral_goat'
  name: string;                  // Display name
  cost: number;                  // Mischief cost in Trading Post (0 = not purchasable)
  mischief: number;              // Mischief scored per Night
  hay: number;                   // Hay scored per Night (can be negative)
  noisy: boolean;                // Is this animal NOISY!?
  abilityType: 'none' | 'passive' | 'triggered' | 'active';
  abilityText: string;           // Human-readable ability description
  tags: string[];                // e.g. ['bringer', 'scaling', 'legendary']
  // Visual config for procedural rendering:
  palette: { body: number; accent: number; eye: number };
  icon: string;                  // 1-2 character emoji/symbol for card center
}
```

### Procedural Card Rendering

Each animal is rendered as an 88×88 pixel card using Phaser.Graphics:

```
┌──────────────────┐
│ ▪ Name      +2M  │  ← 10px header: name left, Mischief right
│                   │
│                   │
│      🐱          │  ← Center: large emoji/symbol (32px) on colored body
│                   │
│                   │
│  NOISY!     +0H  │  ← 10px footer: ability tag left, Hay right
└──────────────────┘
```

**Card rendering pipeline:**
1. Draw rounded rectangle background using animal's `palette.body` color
2. Draw 2px border in darker shade of body color
3. Render animal icon (emoji or custom glyph) centered, 28-32px
4. Render name text top-left in pixel font (Phaser bitmap text or system monospace)
5. Render Mischief value top-right in gold (#FFD700)
6. Render Hay value bottom-right in green (#7CFC00) if nonzero
7. If NOISY!, render "NOISY!" badge bottom-left in red (#FF4444) with a small speaker icon
8. If the card has a triggered/passive ability, render a small star/sparkle indicator

**Color palettes per animal (examples):**
- Barn Cat: warm orange body (#E8913A), dark brown accent (#6B3A1F)
- Feral Goat: dusty gray (#9B8B7A), dark horn (#4A3B2E), red NOISY! badge
- Pot-Bellied Pig: pink (#E8A0BF), dark snout (#8B4B6B)
- Bunny: soft white (#F0E6D6), pink inner ear (#E8A0BF)
- Wild Boar: dark brown (#5C3A1E), tusks ivory (#F5F0DC), red NOISY! badge

Cards in barn slots animate in with a scale-up tween (0→1 over 200ms, ease 'Back.easeOut') and a subtle bounce.

### Animation System

All animations use Phaser's built-in tween system. No external animation libraries.

| Animation | Trigger | Implementation |
|---|---|---|
| Card draw | Animal drawn into barn | Scale tween 0→1, 200ms, Back.easeOut + slot background color tween |
| Button flash | Any button tap | Fill color tween to lighter shade, 120ms, auto-reverse |
| NOISY! warning | 2nd unmitigated NOISY! drawn | Farmhouse window: amber glow pulsing (alpha tween 0.3↔1.0, 800ms loop). Slot border of NOISY! cards pulses red. |
| Farmer Wakes Up bust | 3rd NOISY! drawn | Camera shake (intensity 0.01, 300ms) + farmhouse window flash red + full-screen semi-transparent red overlay fade in 200ms |
| Barn Overwhelmed bust | Exceed capacity | Camera shake + barn background flash white 100ms + overlay |
| Scoring tally | Night ends successfully | Mischief/Hay numbers float upward from each scored card with additive tween, accumulate into header totals |
| Triggered ability fire | Scoring phase | Ability text floats up from card in ability color, 600ms fade-out |
| Scene transition | BarnScene → TradingPost | Fade out 300ms → fade in 300ms (Phaser camera fade) |
| Card purchase | Buy animal in Trading Post | Card slides from shop grid into "Your Herd" area, cost numbers decrement |

### Layout Extensions (LAYOUT additions)

```typescript
// New LAYOUT properties for Sprint 002
LAYOUT.HEADER = {
  Y: 20,
  MISCHIEF_X: 20,        // Mischief icon + count, top-left
  HAY_X: 200,             // Hay icon + count, top-center
  NIGHT_X: 340,           // "Night 3" top-right
  HEIGHT: 40,
};

LAYOUT.BARN_SLOTS = {
  // Expand from 5 fixed to dynamic (capacity upgrades add slots)
  // Row 3 appears at y=384 when capacity > 5
  ROW3_Y: 384,
  // Row 3 slot positions (up to 3 slots): same x as Row 1
};

LAYOUT.ACTION_BUTTONS = {
  DRAW_Y: 720,            // "Draw Animal" / "Keep Going" button
  STOP_Y: 660,            // "Call It a Night" button (appears after first draw)
  WIDTH: 350,
  HEIGHT: 56,
};

LAYOUT.OVERLAY = {
  BACKDROP_ALPHA: 0.7,
  PANEL_WIDTH: 340,
  PANEL_HEIGHT: 500,
  PANEL_Y: 172,            // Centered vertically in canvas
};

LAYOUT.TRADING_POST = {
  HEADER_Y: 20,
  GRID_Y: 80,              // Animal card grid starts here
  GRID_COLS: 3,
  GRID_GAP: 12,
  CARD_WIDTH: 110,
  CARD_HEIGHT: 140,
  HERD_PANEL_Y: 620,       // "Your Herd" summary at bottom
  CAPACITY_BUTTON_Y: 560,  // "Expand Barn" button
  DONE_BUTTON_Y: 770,      // "Start Night" button
};

LAYOUT.COLORS = {
  // Extend existing colors
  MISCHIEF_GOLD: 0xFFD700,
  HAY_GREEN: 0x7CFC00,
  NOISY_RED: 0xFF4444,
  WARNING_AMBER: 0xFFA500,
  BUST_RED: 0xCC0000,
  OVERLAY_BG: 0x000000,
  TRADING_POST_BG: 0x2D1B0E,
  CARD_BORDER: 0x3A2510,
  SUCCESS_GREEN: 0x4CAF50,
};
```

### Slot System Overhaul

Sprint 001's slots are static rectangles. Sprint 002 replaces them with dynamic card holders:

- Empty slots render as dashed-border rounded rectangles (#D4A574 fill, dashed #6B4226 stroke) with a faint "?" in the center
- Occupied slots render the procedural animal card (see Card Rendering above)
- Slot count is dynamic: base 5, expandable via Hay purchases. New slots appear in Row 3 (and eventually Row 4)
- Slot positions are calculated by `barnLayout.ts` based on current `barnCapacity`

### Dynamic Slot Layout Algorithm

```typescript
// barnLayout.ts
export const getSlotPositions = (capacity: number): { x: number; y: number }[] => {
  const positions: { x: number; y: number }[] = [];
  const slotW = LAYOUT.SLOTS.WIDTH;   // 88
  const gap = LAYOUT.SLOTS.GAP;        // 16
  const canvasW = LAYOUT.CANVAS.WIDTH; // 390

  // Distribute slots into rows of 3, centered
  let remaining = capacity;
  let rowY = LAYOUT.SLOTS.ROW1_Y;      // 160

  while (remaining > 0) {
    const rowCount = Math.min(remaining, 3);
    const totalRowW = rowCount * slotW + (rowCount - 1) * gap;
    const startX = (canvasW - totalRowW) / 2;

    for (let i = 0; i < rowCount; i++) {
      positions.push({ x: startX + i * (slotW + gap), y: rowY });
    }

    remaining -= rowCount;
    rowY += slotW + gap; // 104px row spacing
  }

  return positions;
};
```

This replaces the hardcoded 3+2 layout with an algorithm that gracefully handles 5, 6, 7, 8+ slots in centered rows of 3.

---

## Implementation

### Phase 1: Type Foundations + Game Logic Engine (~25% of effort)

**Goal:** All game logic is implemented and unit-tested as pure TypeScript functions. No Phaser code in this phase. By the end, `npm run test` validates the entire game rules engine.

**Files:**
- `src/types/index.ts` — Expand with game types
- `src/game/animals.ts` — Animal definitions registry
- `src/game/deck.ts` — Herd/deck shuffle and draw engine
- `src/game/bust.ts` — Bust condition detection
- `src/game/scoring.ts` — Night scoring with triggered abilities
- `src/game/state.ts` — GameState creation and mutation helpers
- `src/game/tradingPost.ts` — Shop purchase logic, capacity upgrade logic
- `src/game/animals.test.ts` — Animal definition tests
- `src/game/deck.test.ts` — Deck engine tests
- `src/game/bust.test.ts` — Bust detection tests
- `src/game/scoring.test.ts` — Scoring tests

**Tasks:**

**Types (`src/types/index.ts`):**
- [ ] Define `AnimalId` string literal union for all Sprint 002 animals
- [ ] Define `AnimalDef` interface (id, name, cost, mischief, hay, noisy, abilityType, abilityText, tags, palette, icon)
- [ ] Define `AnimalCard` interface (extends AnimalDef reference with instance state: `defId: AnimalId`, `instanceId: string`, `isPennedUp: boolean`)
- [ ] Define `GameState` interface (herd, drawPile, barn, barnCapacity, mischief, hay, nightCount, pennedUp, phase)
- [ ] Define `BustType = 'farmer_wakes_up' | 'barn_overwhelmed' | null`
- [ ] Define `NightResult` interface (bust: BustType, mischiefEarned, hayEarned, abilityBonuses: {animalId, bonus, text}[])
- [ ] Define `ScoreBreakdown` interface for detailed scoring display
- [ ] Extend `SceneKey` enum with `TradingPost`
- [ ] Define `Phase = 'draw' | 'summary' | 'trading'`

**Animal Definitions (`src/game/animals.ts`):**
- [ ] Export `ANIMAL_DEFS: Record<AnimalId, AnimalDef>` with all animals
- [ ] Starting herd animals: Barn Cat (icon 🐱, orange palette), Feral Goat (icon 🐐, gray palette, noisy:true), Pot-Bellied Pig (icon 🐷, pink palette)
- [ ] Sprint 002 purchasable animals (at least 8): Bunny (🐰, passive: cancel 1 NOISY!), Hen (🐔), Wild Boar (🐗, NOISY!), Strutting Peacock (🦚, NOISY!), Hermit Crab (🦀, triggered: +1M per empty slot), Draft Pony (🐴, triggered: +1M per Barn Cat), Bard Frog (🐸, triggered: +2M per NOISY!), Milkmaid Goat (🐐✨, flat income)
- [ ] Additional animals defined but with active abilities marked `abilityType: 'active'` (Sheepdog, Stable Hand, Border Collie, etc.) — present in data but abilities not yet wired
- [ ] Each animal has a unique `palette` with body, accent, and eye colors
- [ ] Export `getStartingHerd(): AnimalCard[]` — returns 4 Barn Cat + 4 Feral Goat + 2 Pot-Bellied Pig as card instances
- [ ] Export `TRADING_POST_STOCK: AnimalId[]` — the purchasable animal pool for "Old MacDonald" scenario (default)

**Deck Engine (`src/game/deck.ts`):**
- [ ] `shuffleDeck(cards: AnimalCard[]): AnimalCard[]` — Fisher-Yates shuffle, returns new array
- [ ] `drawCard(drawPile: AnimalCard[]): { card: AnimalCard; remaining: AnimalCard[] }` — draws top card
- [ ] `prepareDeck(herd: AnimalCard[], pennedUp: AnimalId | null): AnimalCard[]` — filters out penned-up animal, shuffles remainder
- [ ] Shuffle is deterministic when given a seed (optional parameter for testing)

**Bust Detection (`src/game/bust.ts`):**
- [ ] `countUnmitigatedNoisy(barn: AnimalCard[]): number` — counts NOISY! animals minus passive cancellers (Bunny, Honey Bee, Silver Mare). Each canceller neutralizes exactly one NOISY! animal.
- [ ] `checkNoiseBust(barn: AnimalCard[]): boolean` — true if unmitigated noisy count >= 3
- [ ] `checkCapacityBust(barn: AnimalCard[], capacity: number): boolean` — true if barn.length > capacity
- [ ] `checkBust(barn: AnimalCard[], capacity: number): BustType` — returns first applicable bust or null
- [ ] `getNoisyWarning(barn: AnimalCard[]): boolean` — true if unmitigated noisy count === 2

**Scoring (`src/game/scoring.ts`):**
- [ ] `scoreNight(barn: AnimalCard[], state: GameState): NightResult` — calculates total Mischief and Hay from all barn animals, fires triggered abilities, returns detailed breakdown
- [ ] Triggered ability implementations:
  - Hermit Crab: +1 Mischief per empty barn slot (capacity - barn.length)
  - Draft Pony: +1 Mischief per Barn Cat in barn
  - Bard Frog: +2 Mischief per unmitigated NOISY! in barn
  - Jester Crow: +5 Mischief if barn is completely full
  - Barkeep Badger: +2 Hay per unmitigated NOISY! in barn
- [ ] Negative Hay penalty: if animal has negative Hay and player can't pay, deduct 7 Mischief per unpaid
- [ ] Return `NightResult` with bust:null, total Mischief, total Hay, and per-animal ability bonus details

**Game State (`src/game/state.ts`):**
- [ ] `createInitialState(): GameState` — starting herd, barnCapacity=5, mischief=0, hay=0, nightCount=0
- [ ] `startNight(state: GameState): GameState` — increments nightCount, shuffles deck (excluding penned-up), clears barn, sets phase='draw', clears pennedUp
- [ ] `drawAnimal(state: GameState): { state: GameState; card: AnimalCard; bust: BustType }` — draws top card into barn, checks bust
- [ ] `endNight(state: GameState, voluntarily: boolean): { state: GameState; result: NightResult }` — if voluntary, score; if bust, zero score + pen up last-drawn animal
- [ ] `selectPenUp(state: GameState, animalInstanceId: string): GameState` — marks an animal as penned up (player choice after bust)

**Trading Post Logic (`src/game/tradingPost.ts`):**
- [ ] `getAvailableAnimals(stock: AnimalId[]): AnimalDef[]` — returns purchasable animal definitions
- [ ] `canAfford(state: GameState, animalId: AnimalId): boolean`
- [ ] `buyAnimal(state: GameState, animalId: AnimalId): GameState` — deducts cost, adds to herd
- [ ] `getCapacityUpgradeCost(currentCapacity: number): number` — returns incremental cost (capacity - 4, so 5→6 costs 2, 6→7 costs 3, etc.)
- [ ] `buyCapacityUpgrade(state: GameState): GameState` — deducts Hay, increments barnCapacity
- [ ] `canAffordCapacity(state: GameState): boolean`

**Unit Tests:**

`src/game/animals.test.ts`:
- [ ] All starting herd animals exist in ANIMAL_DEFS
- [ ] getStartingHerd() returns exactly 10 cards (4+4+2)
- [ ] Every AnimalDef has non-empty name, valid palette, valid icon
- [ ] All Feral Goats are noisy:true
- [ ] No starting herd animal has cost > 0 (they're not purchasable)

`src/game/deck.test.ts`:
- [ ] shuffleDeck returns same length array with same elements
- [ ] shuffleDeck produces different orderings (run 10x, at least 2 distinct)
- [ ] drawCard returns the first element and a shorter remaining pile
- [ ] drawCard on empty pile throws or returns null gracefully
- [ ] prepareDeck excludes penned-up animal

`src/game/bust.test.ts`:
- [ ] 0 NOISY! → no bust
- [ ] 2 NOISY! → no bust, warning=true
- [ ] 3 NOISY! → farmer_wakes_up bust
- [ ] 2 NOISY! + 1 Bunny → 1 unmitigated, no bust, warning=false
- [ ] 3 NOISY! + 1 Bunny → 2 unmitigated, no bust, warning=true
- [ ] 3 NOISY! + 2 Bunny → 1 unmitigated, no bust
- [ ] Barn at capacity → no bust; barn at capacity+1 → barn_overwhelmed
- [ ] farmer_wakes_up takes priority over barn_overwhelmed if both apply

`src/game/scoring.test.ts`:
- [ ] 3 Barn Cats score +3 Mischief, 0 Hay
- [ ] Hermit Crab in barn with 2 empty slots scores +1 base + 2 bonus = +3 Mischief
- [ ] Draft Pony with 2 Barn Cats scores +1 base + 2 bonus = +3 Mischief
- [ ] Bard Frog with 2 unmitigated NOISY! scores +1 base + 4 bonus = +5 Mischief
- [ ] Negative Hay penalty: Hen (-1 Hay) when Hay would go to -1 costs 7 Mischief instead
- [ ] Bust Night scores zero everything

### Phase 2: BarnScene Overhaul — Visual Rendering + Draw Phase (~35% of effort)

**Goal:** BarnScene becomes the playable draw phase. Animals render as beautiful procedural cards. Animations bring the game to life. NOISY! warning and bust feedback are visceral and unmissable.

**Files:**
- `src/config/constants.ts` — Extend LAYOUT
- `src/scenes/BarnScene.ts` — Major overhaul
- `src/scenes/barnLayout.ts` — Extend with dynamic slot positions, overlay layout

**Tasks:**

**LAYOUT Extensions (`src/config/constants.ts`):**
- [ ] Add `LAYOUT.HEADER` with positions for Mischief, Hay, and Night counter displays
- [ ] Add `LAYOUT.ACTION_BUTTONS` with DRAW and STOP button positions
- [ ] Add `LAYOUT.OVERLAY` with backdrop, panel dimensions for Night summary
- [ ] Add `LAYOUT.COLORS` with all new colors (MISCHIEF_GOLD, HAY_GREEN, NOISY_RED, WARNING_AMBER, BUST_RED, SUCCESS_GREEN, OVERLAY_BG, TRADING_POST_BG)
- [ ] Adjust farmhouse Y position if needed to accommodate expanded slot rows

**Dynamic Slot Layout (`src/scenes/barnLayout.ts`):**
- [ ] Replace fixed 5-slot `getSlotRects()` with `getSlotPositions(capacity: number)` that arranges slots in centered rows of 3
- [ ] Export `getOverlayLayout()` returning panel/backdrop dimensions for Night summary
- [ ] Update existing tests in `barnLayout.test.ts` for the new dynamic layout function
- [ ] Add tests: `getSlotPositions(5)` returns familiar 3+2 pattern; `getSlotPositions(7)` returns 3+3+1; all within canvas bounds

**Procedural Card Renderer (in `BarnScene.ts` as private methods, or a co-located helper if it grows large):**
- [ ] `renderAnimalCard(scene, x, y, animalDef, options?)` — draws a complete animal card at the given slot position:
  1. Create a `Phaser.GameObjects.Container` at (x, y)
  2. Draw rounded-rect background (88×88) using `Phaser.GameObjects.Graphics` with `fillRoundedRect` in `palette.body` color
  3. Draw 2px rounded-rect border in darker shade (darken body by 30%)
  4. Render animal icon as `Phaser.GameObjects.Text` centered, font size 28px
  5. Render animal name as `Phaser.GameObjects.Text` at top-left (8, 4), font 9px monospace, white with black shadow
  6. Render Mischief value at top-right in gold if > 0 ("+2M")
  7. Render Hay value at bottom-right in green if != 0 ("+1H" or "-1H" in red)
  8. If NOISY!, render red "NOISY!" badge at bottom-left with subtle glow effect (shadow)
  9. Return the container for tween targeting
- [ ] All text uses system monospace font with Phaser text shadow for pixel-art feel: `fontFamily: '"Courier New", monospace'`, `fontSize: '9px'`, `shadow: { offsetX: 1, offsetY: 1, color: '#000', fill: true }`

**BarnScene Overhaul (`src/scenes/BarnScene.ts`):**
- [ ] Accept `GameState` via scene init data; if none, create initial state
- [ ] **Header HUD**: Render Mischief counter (gold coin icon + number), Hay counter (green bundle icon + number), Night counter ("Night 1") at top of screen
- [ ] **Barn background**: Keep barn-red (#8B3A3A) fill. Add subtle darker horizontal wood-plank lines at 40px intervals using thin rectangles (#7A3232) for visual texture
- [ ] **Empty slots**: Render as rounded-rect outlines (dashed appearance via alternating small rectangles) with "?" text centered, in dusty brown (#D4A574, 50% alpha)
- [ ] **Farmhouse**: Keep silhouette. Add window sub-rectangle (40×30 at center of farmhouse, dark fill #2A1A0E). This window is the NOISY! warning indicator.
- [ ] **Draw Animal button**: Rename to "DRAW" for brevity. Keep existing flash behavior. Only enabled when `phase === 'draw'` and drawPile is not empty.
- [ ] **"Call It a Night" button**: New button above DRAW, appears after first animal is drawn. Muted green (#3D6B4A), text "STOP - SCORE". Tapping ends the Night voluntarily.
- [ ] **Draw flow**:
  1. Player taps DRAW
  2. `drawAnimal(state)` called — gets next card and bust check
  3. Card animates into next empty slot: container starts at scale 0, tweens to scale 1 over 200ms with `Phaser.Math.Easing.Back.Out`
  4. Slot background transitions from empty to `palette.body` color
  5. If card is NOISY!, play a brief red flash on the card border (tween border color)
  6. Check bust — if bust, immediately trigger bust sequence (Phase 2 below)
  7. Check warning — if 2 unmitigated NOISY!, start farmhouse window warning animation
  8. If drawPile is now empty and no bust, auto-end Night successfully
  9. Update HUD (remaining deck count optional)
- [ ] **NOISY! Warning Animation**: When `getNoisyWarning()` returns true:
  1. Farmhouse window fill changes to amber (#FFA500)
  2. Window alpha tweens 0.4↔1.0 on 800ms loop (sine ease)
  3. All NOISY! animal card borders pulse red (tween strokeColor)
  4. Warning persists until Night ends or a Bunny/canceller is drawn
  5. If warning was active and a canceller resolves it (drops to <2), stop the warning animation and return window to dark
- [ ] **Bust Sequence — Farmer Wakes Up**:
  1. Stop all warning animations
  2. Farmhouse window flashes bright red (#FF0000)
  3. Camera shake: `this.cameras.main.shake(300, 0.01)`
  4. Semi-transparent red overlay fades in (200ms)
  5. Large text "FARMER WOKE UP!" in white, shaking/bouncing tween
  6. Subtext: "Too much noise! No score this night."
  7. After 1500ms, show "Continue" button → triggers Night summary overlay
- [ ] **Bust Sequence — Barn Overwhelmed**:
  1. Camera shake: `this.cameras.main.shake(300, 0.015)`
  2. Barn background flashes white briefly (100ms)
  3. Semi-transparent dark overlay fades in
  4. Large text "BARN OVERWHELMED!" with crack/break visual styling
  5. Subtext: "Too many animals! The barn couldn't hold."
  6. After 1500ms, show "Continue" button → Night summary overlay
- [ ] **Successful Night — Scoring Animation**:
  1. "Call It a Night" tapped (or draw pile exhausted)
  2. Each card in the barn briefly highlights in sequence (100ms each, gold border flash)
  3. Mischief/Hay numbers float up from each card ("+1M", "+2H") with upward tween + fade, in gold/green
  4. Triggered abilities fire: ability bonus text floats up in ability color (e.g., Hermit Crab "+2M bonus!" in teal)
  5. Header HUD Mischief/Hay counters animate to new totals (count-up tween)
  6. After all animations (800ms total), show Night summary overlay
- [ ] **Night Summary Overlay** (rendered within BarnScene, not a separate scene):
  1. Semi-transparent black backdrop (alpha 0.7) over entire canvas
  2. Centered panel (340×500, rounded rect, dark brown #2D1B0E with gold border)
  3. Title: "Night [N] Complete!" or "Night [N] — Busted!" in large text
  4. If successful: list each scored animal with its contribution (scrollable if many)
  5. Total Mischief earned, total Hay earned in large gold/green text
  6. If bust: "0 Mischief, 0 Hay" with red text, show which bust condition triggered
  7. "To Trading Post →" button at bottom → `this.scene.start(SceneKey.TradingPost, { state })`
- [ ] **`window.__GAME_READY__`**: Still set at end of `create()` for Playwright compatibility

### Phase 3: Trading Post Scene (~20% of effort)

**Goal:** A functional, visually appealing shop where players spend Mischief on animals and Hay on capacity. The scene communicates costs, affordability, and herd composition clearly.

**Files:**
- `src/scenes/TradingPostScene.ts` — NEW
- `src/scenes/tradingPostLayout.ts` — NEW
- `src/config/game.ts` — Add TradingPostScene to scene array

**Tasks:**

**TradingPostScene (`src/scenes/TradingPostScene.ts`):**
- [ ] Accept `GameState` via scene init data
- [ ] **Background**: Dark barn-wood brown (#2D1B0E), full canvas
- [ ] **Header**: "TRADING POST" title centered, Mischief and Hay counters below (same style as BarnScene HUD)
- [ ] **Animal card grid**: 3-column grid of purchasable animal cards. Each card is a smaller version (110×140) showing:
  - Animal icon (24px)
  - Animal name
  - Cost in Mischief (gold text)
  - Mischief/Hay yield
  - Ability text (truncated, 2 lines max)
  - NOISY! badge if applicable
  - If `abilityType === 'active'`, show "ABILITY: Coming Soon" in gray
  - If player can't afford, card is dimmed (alpha 0.4) and not interactive
  - If player can afford, card has gold border and is tappable
- [ ] **Purchase flow**: Tap affordable card → card border flashes gold → Mischief decrements → card briefly shows "Added to Herd!" → card updates affordability state
- [ ] **"Expand Barn" button**: Shows current capacity and upgrade cost. "Barn: 5/X → 6 (Cost: 2 Hay)". Disabled if can't afford. Tapping increments capacity, deducts Hay, updates display.
- [ ] **Herd summary panel**: Bottom of screen, horizontal scrollable row showing all owned animal icons with counts. E.g., "🐱×4 🐐×4 🐷×2 🐰×1"
- [ ] **"Start Night →" button**: Large green button at very bottom. Transitions to BarnScene with updated state for next Night.
- [ ] Scrolling: If more animals than fit on screen, the card grid scrolls vertically (Phaser camera bounds or a mask+drag approach). For Sprint 002 with ~12 purchasable animals (4 rows of 3), this fits without scrolling at 140px card height.

**Layout Helper (`src/scenes/tradingPostLayout.ts`):**
- [ ] `getShopGridPositions(count: number): {x, y}[]` — positions for a 3-column card grid
- [ ] `getCapacityButtonRect(): Rect`
- [ ] `getDoneButtonRect(): Rect`

**Game Config (`src/config/game.ts`):**
- [ ] Import `TradingPostScene`
- [ ] Add to scene array: `[BootScene, BarnScene, TradingPostScene]`

### Phase 4: Integration, Polish, and Verification (~20% of effort)

**Goal:** The full game loop works end-to-end. Visual polish is applied. All tests pass. Bundle budget met. Agent-browser verification captures proof of every game state.

**Files:**
- `src/scenes/barnLayout.test.ts` — Extended tests
- `tests/e2e/mobile-smoke.spec.ts` — Verify still passes
- `CLAUDE.md` — Update with Sprint 002 conventions

**Tasks:**

**Integration Testing:**
- [ ] Play through a complete game loop manually in dev: start → draw animals → bust → Trading Post → draw again → succeed → Trading Post → repeat
- [ ] Verify NOISY! warning appears at exactly 2 unmitigated NOISY! animals
- [ ] Verify Bunny cancels one NOISY! (warning clears at 2 NOISY! + 1 Bunny)
- [ ] Verify farmer bust at 3 unmitigated NOISY!
- [ ] Verify barn overwhelmed at capacity+1
- [ ] Verify scoring correctly tallies Mischief and Hay including triggered abilities
- [ ] Verify Trading Post correctly shows affordable/unaffordable animals
- [ ] Verify capacity upgrade works and new slots appear in barn
- [ ] Verify penned-up animal doesn't appear in next Night's deck

**Visual Polish:**
- [ ] Ensure all card text is readable at 390×844 (no truncation, no overlap)
- [ ] Ensure button taps have immediate visual feedback (no perceived lag)
- [ ] Ensure warning animation is smooth and doesn't cause frame drops
- [ ] Ensure camera shake is subtle (0.01 intensity, not nauseating)
- [ ] Verify empty slots look distinct from occupied (dashed vs solid, transparency difference)
- [ ] Verify the farmhouse window is clearly visible and its state changes are obvious
- [ ] Add wood-plank texture lines to barn background for visual depth
- [ ] Trading Post background should feel distinct from barn (darker, different color)
- [ ] Ensure all numbers (Mischief, Hay, costs) use consistent formatting with +/- signs

**Existing Test Maintenance:**
- [ ] `npm run test` — all existing layout tests pass (update for new `getSlotPositions` signature)
- [ ] `npm run test:e2e` — Playwright smoke test still passes (canvas loads, `__GAME_READY__` fires)
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build && npm run budget` — app chunk < 100KB gzipped

**CLAUDE.md Updates:**
- [ ] Document new scene: TradingPostScene (key=SceneKey.TradingPost)
- [ ] Document `src/game/` directory and its purpose
- [ ] Document game state passing between scenes
- [ ] Document procedural card rendering approach
- [ ] Update bundle budget baselines with Sprint 002 measurements

**Agent-Browser Verification:**

The following screenshots must be captured using `agent-browser` (or Playwright if agent-browser unavailable) at 390×844 viewport to prove the game is both functional and beautiful:

1. **Fresh game start**: BarnScene showing empty barn with 5 slots, header HUD (0 Mischief, 0 Hay, Night 1), DRAW button. Expected: barn-red background with wood-plank texture, dashed empty slots, dark farmhouse with unlit window.

2. **Mid-draw — safe state**: 2 non-NOISY! animals drawn (e.g., Barn Cat + Pot-Bellied Pig). Expected: 2 procedural animal cards in slots, remaining 3 slots empty, "STOP - SCORE" button visible, no warning.

3. **NOISY! warning state**: 2 unmitigated NOISY! animals in barn (e.g., 2 Feral Goats). Expected: farmhouse window glowing amber/pulsing, NOISY! card borders pulsing red, clear visual danger signal.

4. **Farmer Wakes Up bust**: 3rd NOISY! animal drawn. Expected: red overlay, camera shake visible in offset, "FARMER WOKE UP!" text, farmhouse window bright red.

5. **Barn Overwhelmed bust**: 6 animals drawn into 5-capacity barn (requires Bringer or specific draw). Expected: dark overlay, "BARN OVERWHELMED!" text.

6. **Successful Night scoring**: Player calls it a night with 3-4 animals. Expected: scoring numbers floating up from cards, header HUD showing earned totals, Night summary overlay with breakdown.

7. **Night summary panel**: The overlay panel after a successful Night. Expected: dark panel with gold border, per-animal scoring breakdown, total Mischief/Hay in large text, "To Trading Post →" button.

8. **Trading Post — can afford**: Shop scene with Mischief balance allowing purchases. Expected: card grid with affordable cards (gold borders) and unaffordable cards (dimmed), costs visible, herd summary at bottom.

9. **Trading Post — after purchase**: Player has bought an animal. Expected: updated Mischief balance, purchased animal visible in herd summary, card affordability states updated.

10. **Second Night — expanded herd**: BarnScene on Night 2 after purchasing animals. Expected: "Night 2" in header, potentially different draw order, purchased animal appearing in barn.

**Verification script outline:**
```bash
# 1. Start dev server
npm run dev &
DEV_PID=$!

# 2. Wait for server ready
sleep 3

# 3. Run agent-browser (or Playwright script) at 390x844
# Navigate to localhost:5173/hoot-n-nanny/
# Wait for __GAME_READY__
# Screenshot: fresh-start.png

# 4. Click DRAW 2 times (on non-NOISY cards if possible — depends on shuffle)
# Screenshot: mid-draw.png

# 5. Continue drawing until 2 NOISY! animals appear
# Screenshot: noisy-warning.png

# 6. Draw one more NOISY! (if bust occurs)
# Screenshot: farmer-bust.png

# 7. Click Continue → Night summary
# Screenshot: night-summary.png

# 8. Click "To Trading Post"
# Screenshot: trading-post.png

# 9. Buy an animal
# Screenshot: after-purchase.png

# 10. Click "Start Night"
# Screenshot: second-night.png

kill $DEV_PID
```

---

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/types/index.ts` | Modify | Add AnimalId, AnimalDef, AnimalCard, GameState, BustType, NightResult, ScoreBreakdown, Phase |
| `src/game/animals.ts` | Create | Animal definitions registry, starting herd factory, Trading Post stock |
| `src/game/deck.ts` | Create | Herd/deck shuffle, draw, prepare logic |
| `src/game/bust.ts` | Create | Bust detection (noise count, capacity check, warning) |
| `src/game/scoring.ts` | Create | Night scoring with triggered ability resolution |
| `src/game/state.ts` | Create | GameState creation, startNight, drawAnimal, endNight helpers |
| `src/game/tradingPost.ts` | Create | Buy animal, buy capacity, affordability checks |
| `src/game/animals.test.ts` | Create | Unit tests for animal definitions |
| `src/game/deck.test.ts` | Create | Unit tests for deck engine |
| `src/game/bust.test.ts` | Create | Unit tests for bust detection |
| `src/game/scoring.test.ts` | Create | Unit tests for scoring logic |
| `src/config/constants.ts` | Modify | Extend LAYOUT with header, action buttons, overlay, Trading Post, new colors |
| `src/config/game.ts` | Modify | Add TradingPostScene to scene array |
| `src/scenes/BarnScene.ts` | Modify | Major overhaul: draw phase gameplay, card rendering, animations, overlays |
| `src/scenes/barnLayout.ts` | Modify | Dynamic slot positions, overlay layout helpers |
| `src/scenes/barnLayout.test.ts` | Modify | Update for new layout functions, add dynamic capacity tests |
| `src/scenes/TradingPostScene.ts` | Create | Shop phase scene |
| `src/scenes/tradingPostLayout.ts` | Create | Trading Post layout helpers |
| `CLAUDE.md` | Modify | Document new scenes, game module, card rendering, updated budgets |

---

## Definition of Done

- [ ] **Complete Night loop**: Shuffle herd → draw animals one at a time → each draw shows animated card in slot → bust or voluntary stop → score → works correctly end-to-end
- [ ] **Farmer Wakes Up bust**: 3 unmitigated NOISY! animals triggers bust with red overlay, camera shake, "FARMER WOKE UP!" text, zero scoring
- [ ] **Barn Overwhelmed bust**: Exceeding capacity triggers bust with overlay, "BARN OVERWHELMED!" text, zero scoring
- [ ] **NOISY! warning at 2**: Farmhouse window glows amber and pulses when exactly 2 unmitigated NOISY! animals are in barn; warning clears if a canceller is drawn
- [ ] **Bunny passive ability**: Bunny in barn cancels one NOISY! animal (reduces unmitigated count by 1)
- [ ] **Triggered abilities work**: Hermit Crab, Draft Pony, Bard Frog, and other triggered abilities correctly calculate bonuses at scoring time, with visible bonus text
- [ ] **Trading Post functional**: Player can buy animals (Mischief cost) and capacity upgrades (Hay cost), purchases persist into next Night
- [ ] **At least 8 purchasable animals** in the Trading Post with correct costs, stats, and descriptions
- [ ] **Starting herd correct**: 4 Barn Cat, 4 Feral Goat, 2 Pot-Bellied Pig
- [ ] **Game loop repeats**: Night → Trading Post → Night → Trading Post works indefinitely
- [ ] **Procedural animal cards**: Each animal renders as a distinct, visually appealing 88×88 card with icon, name, stats, NOISY! badge, and color-coded palette
- [ ] **Draw animation**: Cards animate into slots with scale-up tween (not instant pop)
- [ ] **Scoring animation**: Mischief/Hay numbers float up from scored cards; header HUD animates to new totals
- [ ] **UI is readable**: All text legible at 390×844 on mobile; no overlapping elements; consistent number formatting
- [ ] **Touch input correct**: All buttons use pointerdown, minimum 44px tap targets, immediate visual feedback on tap
- [ ] **Existing tests pass**: All Sprint 001 Vitest and Playwright tests still pass (updated if signatures changed)
- [ ] **New unit tests pass**: Game logic (deck, bust, scoring, animals) has comprehensive Vitest coverage
- [ ] **CI green**: `npm run ci` exits 0 (typecheck, lint, format, build, test, budget)
- [ ] **Bundle budget met**: App chunk < 100KB gzipped (procedural rendering adds only code, no assets)
- [ ] **Agent-browser screenshots captured**: At least 8 screenshots proving: fresh start, mid-draw, NOISY! warning, bust states, scoring, Trading Post, and second Night

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Procedural card rendering looks bad or illegible at 88×88 | Medium | High | Design cards with minimal text, large icons, high contrast. Use 28px emoji for center icon. Test readability at target viewport early in Phase 2 before building animations. Fallback: increase card size to 100×100 and reduce gap. |
| Emoji rendering differs across OS/browser (iOS vs Android vs desktop) | Medium | Medium | Use common emoji in Unicode 13.0+ (supported since 2020). Test on Safari and Chrome. Fallback: replace emoji with single-character text glyphs in monospace font with colored backgrounds. |
| Animation performance issues on low-end mobile | Low | Medium | All tweens are simple (scale, alpha, position). No particle systems. No shader effects. Phaser handles this well. If frame drops observed, reduce tween durations and remove camera shake. |
| Scope creep from active ability implementation | Medium | High | Hard scope boundary: active abilities are Sprint 003. Animals with active abilities exist in data and Trading Post but abilities show "Coming Soon." No mid-draw player choice UI in this sprint. |
| GameState passing between scenes loses data | Low | Medium | Phaser's `this.scene.start(key, { state })` passes the state object by reference. Verify in integration testing that state survives BarnScene→TradingPost→BarnScene round trip. |
| Dynamic slot layout breaks with >8 capacity | Low | Low | Layout algorithm is row-based and tested. At 9+ slots, rows stack and may push into farmhouse zone. Mitigate by adjusting farmhouse Y dynamically or capping visible expansion at 9 slots for Sprint 002. |
| Trading Post card grid doesn't fit on screen | Low | Low | With 12 animals in a 3-column grid at 140px height, total height is ~560px which fits in the 844px canvas with header and footer. If more animals added, implement vertical scroll. |
| Bundle budget exceeded despite procedural approach | Very Low | Medium | Procedural rendering adds only TypeScript code. Sprint 001 app chunk was 1.52KB. Even 50x growth (76KB) is well under 100KB budget. |

---

## Security Considerations

- Static client-only game. No backend, no auth, no network calls.
- No `localStorage` in Sprint 002 — all state is session-only. Persistence is a future sprint concern.
- No external asset loading (CDN, remote URLs). All rendering is procedural.
- Phaser's `__GAME_READY__` hook exposes only a boolean — no state leakage.
- `npm ci` with committed lockfile ensures deterministic installs.
- No new dependencies added. All new code uses Phaser 3.80.x built-in features.
- Animal data is hardcoded in TypeScript, not loaded from JSON or user input — no injection vector.
- Trading Post purchase logic validates affordability server-side (well, client-side, but the logic in `src/game/` is the authority, not the UI layer).

---

## Dependencies

- **Sprint 001 complete**: All infrastructure (CI, GitHub Pages, Phaser setup, test harness) must be working. ✅ Confirmed as of commit `f9c9524`.
- **No new npm dependencies**: Sprint 002 uses only Phaser 3.80.x built-ins for rendering and animation.
- **No external assets**: Procedural rendering eliminates asset sourcing/licensing dependencies.
- **Node 20 LTS**: Same as Sprint 001.
- **agent-browser CLI** (or Playwright alternative): Needed for screenshot verification. If agent-browser is not available, a Playwright script at 390×844 viewport with `page.screenshot()` captures can substitute.

---

## Open Questions

1. **Penned Up selection**: After a bust, should the last-drawn animal automatically be Penned Up (simpler), or should the player choose which animal to pen (more strategic, matches Party House)? **Recommendation**: Auto-pen the last-drawn animal for Sprint 002 simplicity. Player choice is a Sprint 003 enhancement.

2. **Release to the Wild**: The INTENT.md specifies a "Release to the Wild" action (spend 3 Mischief to permanently remove an animal before drawing). Should this be in Sprint 002 or deferred? **Recommendation**: Defer to Sprint 003. The core loop is already ambitious. Release-to-the-Wild adds pre-draw UI that complicates the draw phase.

3. **Night count and difficulty scaling**: Should anything change as nights progress (Trading Post stock rotation, costs, etc.), or is each night identical except for herd composition? **Recommendation**: Each night is identical for Sprint 002. Scenario-based variation is a future sprint.

4. **Herd viewer**: Should there be a way to view the full herd (with counts) during the draw phase, or only in the Trading Post? **Recommendation**: Show a compact herd summary in both scenes — a small row of icons+counts at the bottom of BarnScene and in the Trading Post. Full herd detail view is Sprint 003.

5. **Multiple purchases per Trading Post visit**: Can the player buy as many animals as they can afford in a single Trading Post visit, or is there a per-visit limit? **Recommendation**: Unlimited purchases per visit (consistent with Party House). The constraint is currency, not purchase count.

6. **Agent-browser vs Playwright for verification**: If `agent-browser` is not installed or available, should we write a Playwright script with `page.screenshot()` at each game state instead? **Recommendation**: Implement both — a Playwright verification script serves as a repeatable regression test, while agent-browser screenshots are for human review. The Playwright script can run in CI; agent-browser is manual.

7. **Deck exhaustion**: If the player draws every animal in their herd without busting, the Night should auto-end with full scoring. Is this correct? **Recommendation**: Yes — exhausting the draw pile without busting is a successful Night. This is rare but possible with small herds and high capacity.
