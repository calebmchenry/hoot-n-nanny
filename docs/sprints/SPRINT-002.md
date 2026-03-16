# Sprint 002: Playable & Beautiful Core Loop

## Overview

Sprint 002 transforms Hoot 'n Nanny from a colored-rectangle wireframe into a playable, visually polished push-your-luck card game. The deliverable is a complete single-player core loop: shuffle your herd, draw animals one at a time into the barn, risk busting from noise or overcrowding, score Mischief and Hay, spend them at the Trading Post, and repeat.

Sprint 001 delivered infrastructure and a layout wireframe. Sprint 002 builds the game on top of it. The architectural foundation (thin scenes, LAYOUT constants, pure layout helpers, 390x844 logical canvas) remains intact. New code lives primarily in `src/game/` (pure game logic), modifications to `BarnScene` (draw phase), and a new `TradingPostScene` (shop phase). All game logic is unit-testable without Phaser.

**Visual approach:** Free pixel art sprite sheets sourced from itch.io, OpenGameArt, or Kenny.nl under CC0/permissive licenses. Each animal gets a small sprite (32x32 or 48x48). Sprites are loaded as a texture atlas in BootScene and rendered on stylized card backgrounds. This delivers the "classic pixel art, 16-bit era aesthetic" from INTENT.md while keeping the app chunk well under budget.

**Verification approach:** The sprint includes deterministic seed support and `agent-browser` screenshot verification. Named seeds produce reproducible game states. DOM data attributes expose stable phase markers for automated testing. The final proof is a set of screenshots showing the game in attractive, functional states on the actual mobile-sized canvas.

---

## Use Cases

1. **Start a Night** — Player opens the game and sees a richly styled barn scene with empty animal slots, a deck stack, resource banner (Mischief/Hay), noise meter (0/3), barn capacity indicator (0/5), and a "DRAW ANIMAL" button. The farmhouse background has a dark window.

2. **Draw animals** — Player taps "DRAW ANIMAL." The top card slides in from the deck to the next empty slot. The card shows the animal's sprite, name, and resource values. After the first draw, two buttons appear: "KEEP GOING" and "CALL IT A NIGHT."

3. **NOISY! warning** — When the second unmitigated NOISY! animal enters, the farmhouse window glows amber (pulsing tween), the noise meter shows 2/3 filled, and a brief "WARNING" flash appears. The player can still draw or stop.

4. **Farmer Wakes Up bust** — The third unmitigated NOISY! triggers a bust: farmhouse window turns red, camera shakes, a "FARMER WOKE UP!" overlay appears. Zero scoring. The bust-causing animal is Penned Up for next Night.

5. **Barn Overwhelmed bust** — Animals exceed barn capacity. "BARN OVERWHELMED!" overlay. Zero scoring. The last-drawn animal is Penned Up.

6. **Call It a Night** — Player voluntarily stops. All Mischief and Hay from animals in the barn are totaled. A Night Summary overlay shows the breakdown with a tally animation. Player taps "Continue" to proceed to Trading Post.

7. **Trading Post** — Player sees a grid of purchasable animals with costs, current Mischief/Hay, and a "Buy Hay (+1 Capacity)" option. Affordable items are interactive; unaffordable items are dimmed. Purchasing updates the herd. "Start Next Night" returns to BarnScene.

8. **Continuous loop** — After the Trading Post, the next Night begins with the updated herd (including purchases, minus Penned Up animal) reshuffled. The loop repeats indefinitely.

9. **Deterministic verification** — A developer visits `/?seed=sprint2-warning` and gets a reproducible game state for screenshot capture and automated testing.

---

## Architecture

### Scene Flow

```
BootScene -> BarnScene -> TradingPostScene -> BarnScene -> ...
```

- **BootScene** — Preloads sprite atlas, registers generated textures for UI elements (card backgrounds, barn textures, farmhouse, warning lantern), sets up palette. Transitions to BarnScene.
- **BarnScene** — Full Night scene. Owns card rendering, animation orchestration, and player input. Night Summary is an overlay Container within this scene (player sees barn state behind the overlay for context).
- **TradingPostScene** — Separate scene for the shop phase. Clean separation from Night logic.

### Game Logic Boundary

All game rules live in `src/game/`. Scenes are thin views that read state and dispatch actions.

```
src/game/
  types.ts          # GameSession, NightState, NightEvent, AnimalDef, CardInstance
  animals.ts        # Roster definitions, costs, static metadata
  deck.ts           # Seedable shuffle, draw, herd management
  night.ts          # Start night, draw, bust checks, penned-up handling -> NightEvent[]
  scoring.ts        # Mischief/Hay math, passive score effects, capacity costs
  shop.ts           # Market generation, purchases, capacity upgrades
  session.ts        # Cross-night state transitions, next-night setup
  gameStore.ts      # Module-level singleton for cross-scene state sharing
```

### Event-Driven Animation

Rule functions return typed `NightEvent[]` arrays. Scenes consume events as animation cues. This separates game logic from presentation and makes animation sequencing deterministic.

Event types:
- `card_draw_started` — deck compress animation
- `card_revealed` — card data, target slot position
- `warning_state_changed` — new noise level
- `bust_triggered` — bust type (farmer/barn), bust-causing animal
- `night_scored` — Mischief/Hay breakdown per animal
- `animal_penned_up` — which card instance is penned
- `purchase_completed` — which animal was bought
- `capacity_upgraded` — new capacity value

### Cross-Scene State

A module-level singleton (`gameStore.ts`) holds the `GameSession` across scene transitions. Both scenes read/write through `gameStore.getState()` / `gameStore.setState()`. The store is NOT reactive — scenes read it in `create()` and on user actions. This avoids Phaser's fragile scene-data passing and keeps state testable.

### Core Rule Decisions

These are locked for Sprint 002:

- **Penned Up animal on bust:** the bust-causing animal (last drawn) is Penned Up for the next Night. Tracked by card instance ID, not animal type. One Feral Goat can be penned while other Feral Goats still appear.
- **NOISY! thresholds:** exactly 2 unmitigated NOISY! = warning state; 3+ unmitigated NOISY! = Farmer Wakes Up bust.
- **NOISY! mitigation:** Bunny and Honey Bee each cancel one NOISY! animal. Multiple cancellers stack. Mitigation is evaluated at check time (not on-entry).
- **Barn Overwhelmed:** if animals in barn exceed `capacity` after a draw resolves, instant bust. Exactly meeting capacity is safe.
- **Capacity cost curve:** start at 5 slots; upgrades cost 2, 3, 4 Hay. Cap at 8 for Sprint 002.
- **Deck exhaustion:** if the player draws every card without busting, auto-score. No stuck state.
- **Zero-draw night:** "Call It a Night" button only appears after the first draw. Cannot score 0 intentionally.
- **Negative Hay penalty:** -7 Mischief per unpaid Hay animal (per INTENT.md). Mischief cannot go below 0.
- **Session persistence:** state resets on refresh. No localStorage in Sprint 002.
- **No active abilities:** Animals with active abilities in INTENT.md appear in the shop with correct stats but their abilities do not trigger. No mid-draw player choice UI.
- **No BRINGERs:** Bull Moose and Parade Llama excluded from Sprint 002 shop. Barn Overwhelmed can still trigger via herd growth + capacity limit.

### Seedable Shuffle

The shuffle uses a seeded PRNG (simple mulberry32 or similar). Seeds are provided via:
- `?seed=<string>` query parameter for browser-based verification
- Direct parameter for unit tests

Named verification seeds:
- `sprint2-opening` — clean starting state
- `sprint2-warning` — two Feral Goats drawn in positions 1-2
- `sprint2-farmer-bust` — three Feral Goats drawn early
- `sprint2-barn-bust` — arrangement that triggers capacity bust after purchases
- `sprint2-score-shop` — favorable draw order for a successful Night

### Verification Hooks

Sprint 002 exposes stable, coarse-grained markers:

- `window.__GAME_READY__` — preserved from Sprint 001
- `#game-container[data-scene="Barn" | "TradingPost"]`
- `#game-container[data-phase="ready_to_draw" | "animating_draw" | "player_decision" | "warning" | "bust" | "night_summary" | "shop"]`
- `#game-container[data-noisy-count="0" | "1" | "2" | "3"]`
- `#game-container[data-capacity="5" | "6" | "7" | "8"]`

### Card Presentation

Each animal in the barn appears as a stylized card on the 88x88 slot footprint:

- **Sprite portrait** — 32x32 or 48x48 pixel art from the loaded atlas, centered
- **Card background** — warm parchment for quiet animals, red-tinted for NOISY!
- **Animal name** — small text at bottom
- **Resource badges** — gold circle for Mischief value, green circle for Hay value
- **NOISY! badge** — red triangle with exclamation if applicable
- **Penned Up indicator** — if an animal was penned last Night, show a small lock icon in the barn UI header

### Dynamic Slot Layout

The layout function accepts a capacity number (5-8) and returns slot positions. Grid is always 3 columns. Rows expand downward as capacity increases:
- 5 slots: 3 top + 2 centered
- 6 slots: 3 top + 3 bottom
- 7 slots: 3 top + 3 middle + 1 centered
- 8 slots: 3 top + 3 middle + 2 centered

Slot size remains 88x88. The farmhouse and button areas adjust downward slightly for 7-8 capacity.

### Visual Composition

Target aesthetic: "classic pixel art, 16-bit era aesthetic (think Stardew Valley meets early Game Boy Color)"

- Deep blue night-sky gradient at the top behind barn rafters
- Warm red-brown plank walls with darker beam silhouettes
- Straw/gold floor band anchoring the barn slots
- Farmhouse silhouette with a lantern window that can glow and flicker
- Wooden hanging signs for Mischief, Hay, and herd count
- Stacked deck object on one side so draws have a visible source
- Card slots with shadows and framed card art

Palette:
- Night sky: `#10243F`, `#173A5E`, `#295C7A`
- Barn wood: `#6B3027`, `#8B3A3A`, `#A5563D`
- Straw/gold accents: `#D9A441`, `#F1C86A`
- UI parchment: `#F0E1BE`
- Warning amber: `#FFBE4D`
- Bust red: `#D94B3D`
- Success green: `#5C9B5D`

Render configuration:
- `pixelArt: true`
- `antialias: false`
- `roundPixels: true`

### Animation Plan

Animations clarify state, not decoration:

| Animation | Timing | Implementation |
|-----------|--------|----------------|
| Card draw slide-in | 200ms, Back.easeOut overshoot | Tween from deck position to target slot |
| Card arrival pop | 150ms scale 1.0 -> 1.08 -> 1.0 | Chained tween on arrival |
| NOISY! shake | 100ms, 3px amplitude | Horizontal shake on noise meter |
| Warning glow | 800ms period, sine wave alpha | Yoyo tween on farmhouse window overlay |
| Bust camera shake | 150ms, 5px | Phaser camera shake |
| Bust overlay drop | 300ms from above | Tween overlay container from y=-200 |
| Score tally count-up | 300ms per line, 100ms stagger | Sequential text tweens |
| Purchase shrink-to-herd | 200ms | Card tween from shop position to herd badge |
| Button flash | 120ms tint change | Preserved from Sprint 001 |

All animations use Phaser's built-in tween system. Drive animations from `NightEvent[]` so visual sequencing mirrors rule sequencing. Disable draw button during card animation to prevent double-draw race conditions.

---

## Animal Roster (Sprint 002)

### Starting Herd

| Animal | Qty | Mischief | Hay | Trait |
|--------|-----|----------|-----|-------|
| Barn Cat | 4 | +1 | -- | Quiet |
| Feral Goat | 4 | +2 | -- | NOISY! (permanent) |
| Pot-Bellied Pig | 2 | -- | +1 | Quiet |

### Purchasable Animals (8)

| Animal | Cost | Mischief | Hay | Ability | Strategic Role |
|--------|------|----------|-----|---------|----------------|
| Bunny | 4 | +1 | -- | Cancels 1 NOISY! | Defense |
| Hen | 4 | -1 | +2 | -- | Economy (Hay) |
| Wild Boar | 3 | +4 | -- | NOISY! | High risk/reward |
| Hermit Crab | 4 | +1 | -- | +1 Mischief per empty slot at scoring | Conservative play |
| Draft Pony | 5 | +1 | -- | +1 Mischief per Barn Cat at scoring | Synergy |
| Strutting Peacock | 5 | +3 | +2 | NOISY! | Dual currency risk |
| Milkmaid Goat | 5 | +4 | -1 | -- | Flat high income |
| Honey Bee | 7 | +2 | -- | Cancels 1 NOISY! | Premium defense |

This selection enables: flat-income builds, Hay-focused capacity growth, NOISY! mitigation strategies, conservative play (Hermit Crab), and synergy builds (Draft Pony + Barn Cats). No active abilities require mid-draw UI.

---

## Implementation

### Phase 1: Rules Engine & Tests (~25%)

**Goal:** Replace fake slot-state model with a real session/night model. All game logic testable without Phaser.

**Files:**
- `src/game/types.ts` — Create
- `src/game/animals.ts` — Create
- `src/game/deck.ts` — Create
- `src/game/night.ts` — Create
- `src/game/scoring.ts` — Create
- `src/game/shop.ts` — Create
- `src/game/session.ts` — Create
- `src/game/gameStore.ts` — Create

**Tasks:**
- [ ] Define core types: `AnimalDef`, `CardInstance` (def ref + unique ID), `NightState`, `GameSession`, `NightEvent` union, `GamePhase` enum
- [ ] Define Sprint 002 roster in `animals.ts`: `STARTING_HERD`, `SHOP_ANIMALS` with all fields from the roster table
- [ ] Implement seedable shuffle in `deck.ts`: mulberry32 PRNG, `shuffleDeck(cards, seed?)`, `drawCard(deck)`, `buildStartingDeck()`
- [ ] Implement Night flow in `night.ts`: `startNight()`, `drawAnimal()` -> `NightEvent[]`, `callItANight()` -> `NightEvent[]`, `countUnmitigatedNoisy()`, `checkBust()`
- [ ] Implement scoring in `scoring.ts`: `scoreMischief(barn)`, `scoreHay(barn)`, Hermit Crab bonus (empty slots), Draft Pony bonus (Barn Cat count), negative Hay penalty (-7 Mischief per unpaid)
- [ ] Implement shop in `shop.ts`: `generateMarket()`, `purchaseAnimal()`, `upgradeCapacity()`, capacity cost curve (2,3,4 Hay), cap at 8
- [ ] Implement session in `session.ts`: `createSession()`, `endNight()` -> apply scoring + Penned Up, `startNextNight()` -> filter penned animal, reshuffle
- [ ] Implement `gameStore.ts`: module-level singleton with `getState()` / `setState()` / `reset()`
- [ ] Encode named verification seeds that produce known draw orders
- [ ] Parse `?seed=` query parameter and pass to shuffle

**Tests (written alongside, not deferred):**
- [ ] Starter herd composition (4+4+2 = 10 cards, correct types)
- [ ] Shuffle determinism: same seed produces same order
- [ ] NOISY! warning at 2 unmitigated, bust at 3
- [ ] Bunny mitigates: 3 NOISY! + 1 Bunny = 2 unmitigated = no bust
- [ ] Honey Bee stacks: 4 NOISY! + 1 Bunny + 1 Honey Bee = 2 unmitigated = no bust
- [ ] Barn Overwhelmed: capacity 5, 6 animals = bust; 5 animals = safe
- [ ] Deck exhaustion: all cards drawn without bust -> auto-score
- [ ] Scoring math: sum Mischief, sum Hay, Hermit Crab bonus, Draft Pony bonus
- [ ] Negative Hay: Milkmaid Goat -1 Hay, player can't pay -> -7 Mischief penalty
- [ ] Capacity cost: 5->6 = 2 Hay, 6->7 = 3 Hay, 7->8 = 4 Hay
- [ ] Purchase: deduct Mischief, add to herd, insufficient funds rejected
- [ ] Penned Up: bust-causing card excluded from next Night's deck, cleared after one Night

### Phase 2: Asset Pipeline & BootScene (~10%)

**Goal:** Source pixel art sprites, load them via Phaser, generate UI textures.

**Files:**
- `public/assets/` — sprite sheets (Create)
- `src/scenes/BootScene.ts` — Rewrite
- `src/config/constants.ts` — Extend
- `src/config/game.ts` — Extend

**Tasks:**
- [ ] Source free pixel art animal sprites (CC0/permissive) for all 11 animal types. Target: 32x32 or 48x48 per animal. Document sources and licenses in `docs/CREDITS.md`.
- [ ] Create or source sprite atlas (single spritesheet PNG + JSON atlas file)
- [ ] Rewrite `BootScene.ts`: preload sprite atlas, generate textures for card backgrounds (parchment, noisy-red), barn environment (wood planks, rafters, straw), farmhouse + lantern window, UI elements (resource badges, noise meter). Use `Phaser.GameObjects.Graphics` -> `generateTexture()`.
- [ ] Update `game.ts`: add `pixelArt: true`, `antialias: false`, `roundPixels: true` to render config. Register `TradingPostScene` in scene array.
- [ ] Extend `constants.ts`: add full palette, animation timing constants, UI token sizes

**Acceptance:** BootScene loads all assets and generated textures without errors. Transition to BarnScene works. Assets are small enough that bundle budget passes.

### Phase 3: BarnScene Overhaul & Night Flow (~30%)

**Goal:** Turn BarnScene from a rectangle demo into the full Night interface driven by the game module.

**Files:**
- `src/scenes/BarnScene.ts` — Major rewrite
- `src/scenes/barnLayout.ts` — Major rewrite
- `src/types/index.ts` — Extend (add `SceneKey.TradingPost`)

**Tasks:**
- [ ] Rewrite `barnLayout.ts`:
  - `getDynamicSlotRects(capacity: number): Rect[]` for 5-8 capacity
  - `getResourceBannerPosition()`, `getNoiseMeterPosition()`, `getDeckStackPosition()`
  - `getActionBarPosition()` (single button or dual-button layout)
  - `getOverlayBounds()` for Night Summary
  - `getFarmhouseWindowRect()` for warning glow overlay
- [ ] Add layout tests: dynamic slots for capacities 5-8, no overlaps, all fit in 390x844, 44px min tap targets
- [ ] Rewrite `BarnScene.create()`:
  - Render layered barn environment (night sky, wood walls, straw floor, rafters, farmhouse, deck stack)
  - Render empty slot outlines from dynamic layout
  - Render resource banner: Night #, Mischief, Hay, herd remaining count
  - Render noise meter: 3 circles (empty/filled/pulsing)
  - Render capacity indicator: "Barn: 0/5"
  - Render "DRAW ANIMAL" button
  - Initialize game state via `gameStore`, call `startNight()`
  - Set DOM data attributes: `data-scene="Barn"`, `data-phase="ready_to_draw"`, etc.
  - Set `window.__GAME_READY__ = true`
- [ ] Implement draw flow:
  - On "DRAW ANIMAL" / "KEEP GOING" tap: disable button, call `drawAnimal()`, consume `NightEvent[]`
  - Animate card slide-in from deck to slot (200ms)
  - Update noise meter, resource projections
  - If warning: start farmhouse window glow tween
  - If bust: play bust sequence (camera shake, overlay drop-in)
  - If safe: show dual buttons ("KEEP GOING" + "CALL IT A NIGHT"), re-enable input
- [ ] Implement "Call It a Night":
  - Call `callItANight()`, consume events
  - Show Night Summary overlay (Container with semi-transparent background)
  - Tally animation: each animal's contribution appears sequentially, totals count up
  - Penned Up display if bust occurred
  - "Continue to Trading Post" button -> `this.scene.start(SceneKey.TradingPost)`
- [ ] Handle deck exhaustion: if last card drawn without bust, auto-trigger scoring
- [ ] Update all DOM data attributes on state changes

### Phase 4: Trading Post Scene & Loop Closure (~20%)

**Goal:** Finish the playable loop. Night always leads to shop, shop always leads to next Night.

**Files:**
- `src/scenes/TradingPostScene.ts` — Create
- `src/scenes/tradingPostLayout.ts` — Create

**Tasks:**
- [ ] Implement `tradingPostLayout.ts`:
  - `getShopGridPositions(itemCount): Rect[]` — 2-column grid for shop cards
  - `getCapacityUpgradePosition()`, `getStartNightButtonPosition()`, `getCurrencyHeaderPosition()`
- [ ] Implement `TradingPostScene.create()`:
  - Read state from `gameStore`
  - Render header: "Trading Post" + Night number, current Mischief / Hay
  - Render shop grid: card-like containers with animal sprite, name, cost, resource values
  - Affordable items: full opacity, interactive. Unaffordable: dimmed (alpha 0.4).
  - On purchase: deduct Mischief, add CardInstance to herd, update display, re-check affordability
  - Render "Expand Barn (+1 Capacity): X Hay" button. Show current/next capacity. Disable at cap 8.
  - Render "Start Next Night" button -> `gameStore` `startNextNight()`, `this.scene.start(SceneKey.Barn)`
  - Background color: earthy brown `#5C4033` (distinct from barn red)
  - Set DOM data attributes: `data-scene="TradingPost"`, `data-phase="shop"`
- [ ] Shop stock: each animal type has 3 copies available per game. Track purchases in session state.
- [ ] Penned Up animal display: show which animal is penned for the upcoming Night

### Phase 5: Visual Polish & Animation Pass (~10%)

**Goal:** Meet the "beautiful" requirement. If the screen reads as flat UI blocks with labels, the sprint is not done. If the scene is visually dense but unreadable on a phone, the sprint is also not done.

**Tasks:**
- [ ] Tune card art: sprite positioning, text hierarchy, badge sizes, shadow offsets
- [ ] Implement all animations from the Animation Plan table
- [ ] Farmhouse warning system:
  - 0 NOISY!: window dark (alpha 0)
  - 1 NOISY!: faint warm glow (alpha 0.2, static)
  - 2 NOISY!: pulsing amber (tween alpha 0.3 <-> 0.8, 800ms period, yoyo)
  - 3 NOISY!: solid red (alpha 1.0), camera shake
- [ ] Noise meter: 3 circles, empty = outline, filled = red with scale-pop on activation
- [ ] Button polish: rounded corners via Graphics, subtle shadow, distinct primary/secondary colors
- [ ] Trading Post visual consistency: same card rendering, section headers, readable layout
- [ ] Remove all raw debug rectangles. Every player-facing element must be textured or stylized.

### Phase 6: Verification & Hardening (~5%)

**Goal:** Prove the loop works and looks good under deterministic conditions.

**Tasks:**
- [ ] Run all unit tests: `npm run test`
- [ ] Extend Playwright smoke test to assert `data-scene="Barn"` and `__GAME_READY__`
- [ ] Add one seeded Playwright test: start with known seed, draw 2 cards, verify state
- [ ] Run `npm run ci` — all checks green
- [ ] Run `npm run budget` — app chunk < 100KB gzipped (sprite atlas adds bytes, monitor)
- [ ] `agent-browser` verification:
  1. `npm run dev`
  2. `agent-browser open http://localhost:5173/hoot-n-nanny/?seed=sprint2-opening`
  3. `agent-browser set viewport 390 844`
  4. `agent-browser wait --load networkidle`
  5. Screenshot `01-opening-barn.png` — textured barn, starter herd counters, deck stack, empty slots, polished action bar
  6. Open `?seed=sprint2-warning`, draw until `data-noisy-count="2"` -> screenshot `02-warning-state.png` — visible lantern glow, two NOISY! cards, warning accent
  7. Open `?seed=sprint2-farmer-bust`, draw until bust -> screenshot `03-farmer-bust.png` — bust overlay, camera shake aftermath, zero-score summary
  8. Open `?seed=sprint2-score-shop`, play to successful summary -> screenshot `04-success-summary.png` — tally breakdown, Mischief/Hay totals
  9. Continue into Trading Post -> screenshot `05-trading-post.png` — attractive offer layout, current resources, capacity upgrade
  10. Buy one animal + one capacity upgrade, start next Night -> screenshot `06-second-night.png` — updated herd/capacity in Night UI, Penned Up indicator if applicable
  11. Repeat against `npm run preview` to ensure proof works in production build

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/game/types.ts` | Create | Core state and event types: AnimalDef, CardInstance, NightState, GameSession, NightEvent, GamePhase |
| `src/game/animals.ts` | Create | Sprint 002 animal metadata: STARTING_HERD, SHOP_ANIMALS |
| `src/game/deck.ts` | Create | Seedable shuffle (mulberry32), draw, deck-building pure functions |
| `src/game/night.ts` | Create | Night flow: draw, bust checks, penned-up -> NightEvent[] |
| `src/game/scoring.ts` | Create | Mischief/Hay calculation, passive bonuses, capacity costs |
| `src/game/shop.ts` | Create | Market generation, purchases, capacity upgrades |
| `src/game/session.ts` | Create | Cross-night state transitions, next-night setup |
| `src/game/gameStore.ts` | Create | Module-level singleton for cross-scene state |
| `src/game/night.test.ts` | Create | Unit tests: draw flow, bust logic, Penned Up |
| `src/game/scoring.test.ts` | Create | Unit tests: scoring math, passive effects, penalties |
| `src/game/deck.test.ts` | Create | Unit tests: shuffle determinism, draw |
| `src/game/shop.test.ts` | Create | Unit tests: purchases, capacity growth, stock limits |
| `public/assets/animals.png` | Create | Sprite atlas PNG (sourced, CC0/permissive) |
| `public/assets/animals.json` | Create | Sprite atlas JSON (frame data) |
| `docs/CREDITS.md` | Create | Asset licenses and sources |
| `src/scenes/BootScene.ts` | Rewrite | Asset preloading, texture generation, palette setup |
| `src/scenes/BarnScene.ts` | Rewrite | Full Night scene: event-driven animations, overlays, DOM markers |
| `src/scenes/barnLayout.ts` | Rewrite | Dynamic layout for 5-8 slots, HUD, buttons, overlays |
| `src/scenes/barnLayout.test.ts` | Extend | Dynamic slot tests for capacities 5-8 |
| `src/scenes/TradingPostScene.ts` | Create | Shop scene: buy animals, expand capacity |
| `src/scenes/tradingPostLayout.ts` | Create | Layout math for Trading Post grid |
| `src/config/constants.ts` | Extend | Palette, animation timings, UI tokens, capacity costs |
| `src/config/game.ts` | Extend | pixelArt render flags, register TradingPostScene |
| `src/types/index.ts` | Extend | Add SceneKey.TradingPost |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Assert data-scene attribute and stable boot |
| `tests/e2e/seeded-flow.spec.ts` | Create | Seeded e2e test through Night into Trading Post |

---

## Definition of Done

1. **Playable loop**: Player can draw animals, see bust conditions trigger, score resources, buy new animals, expand capacity, and start another Night. The loop repeats for at least 2 full cycles without errors.
2. **Both bust conditions**: Farmer Wakes Up (3 unmitigated NOISY!) and Barn Overwhelmed (exceed capacity) both trigger correctly with distinct visual feedback.
3. **NOISY! warning**: At 2 unmitigated NOISY! animals, the farmhouse window glows amber and the noise meter reflects the danger state.
4. **NOISY! mitigation**: Bunny and Honey Bee each cancel one NOISY!, correctly reflected in bust calculations and noise meter.
5. **Starting herd**: Exactly 4 Barn Cat, 4 Feral Goat, 2 Pot-Bellied Pig.
6. **8 purchasable animals**: Bunny, Hen, Wild Boar, Hermit Crab, Draft Pony, Strutting Peacock, Milkmaid Goat, Honey Bee — all buyable with correct costs and functional passive/triggered abilities.
7. **Two currencies**: Mischief buys animals, Hay expands barn capacity. Capacity cost curve is 2, 3, 4 Hay for slots 6, 7, 8. Cap at 8.
8. **Scoring correct**: Hermit Crab empty-slot bonus, Draft Pony Barn-Cat bonus, and negative Hay penalty (-7 Mischief per unpaid) all calculate correctly.
9. **Penned Up**: Bust-causing animal is excluded from the next Night's draw pile. Penned Up clears after one Night. UI shows which animal is penned.
10. **Pixel art visuals**: Animal sprites from sourced sprite sheets. Textured barn environment, styled cards, no raw rectangles visible to the player.
11. **Animations**: Card draw, warning glow, bust shake, score tally, and purchase feedback all have tween-based motion.
12. **Deterministic seeds**: Named seeds produce identical game states across runs. `?seed=` query parameter works in dev and preview builds.
13. **DOM verification markers**: `data-scene`, `data-phase`, `data-noisy-count`, `data-capacity` attributes on `#game-container` are updated on every state change.
14. **agent-browser screenshots**: 6 screenshots captured (opening barn, warning state, bust, success summary, Trading Post, second Night after purchase) proving both functionality and visual quality.
15. **Unit tests**: All game logic (deck, night, scoring, shop, session) has passing tests covering core paths and edge cases.
16. **CI green**: `npm run ci` passes. App chunk under 100KB gzipped. Playwright smoke test passes.
17. **No regressions**: Existing barnLayout tests pass. `__GAME_READY__` signal preserved.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Sprite sourcing takes too long or quality is poor** | Medium | High | Start asset search in Phase 2 before committing. Fallback: Phaser Graphics geometric silhouettes with styled text (no emoji). Budget 2-3 hours for sourcing. |
| **Sprite atlas exceeds bundle budget** | Low | High | At 32x32px, 11 sprites fit in a tiny atlas (<50KB). Monitor with `npm run budget` after Phase 2. |
| **Animation code tangles with rule logic** | Medium | Medium | Strict event-driven architecture: rule functions return `NightEvent[]`, scenes consume. No game logic in Phaser callbacks. |
| **Dynamic slot layout breaks at capacity 7-8** | Medium | Low | Unit test slot generation for all capacities 5-8 before visual implementation. |
| **Rapid tapping causes double-draw** | Medium | Medium | Disable draw button during card animation (200ms). Re-enable on tween complete. |
| **Scene transition state loss** | Low | High | Module-level singleton survives scene transitions. Test: start Night, transition to Trading Post, verify state intact. |
| **Scope creep into active abilities** | Medium | High | Strict scope freeze: passive/triggered only. Active ability animals show in shop with correct stats, abilities simply don't fire. |
| **Named seeds break when rules change** | Low | Medium | Seeds encode shuffle order, not game states. Rules changes produce different outcomes from the same seed, but the seed infrastructure still works. Document expected outcomes per seed. |
| **Beauty bar not met** | Medium | High | Explicit beauty gate in Phase 5: no raw rectangles, all elements textured. If it reads as "placeholders with better colors," the sprint is not done. |

---

## Security Considerations

- Static client-only site. No backend, auth, or secret handling.
- No runtime network dependencies. All assets loaded locally. No CDN fonts or scripts.
- Seed query parameter accepts only bounded string input. Never evaluated as code.
- Debug-only state access (if any) gated behind `import.meta.env.DEV` checks. Not available in production builds.
- Asset licensing documented in `docs/CREDITS.md`. All sprites CC0 or permissive.

---

## Dependencies

- **Existing stack**: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Existing canvas contract**: 390x844 logical resolution with Scale.FIT
- **Existing bundle budget**: Phaser chunk < 400KB gzipped, app chunk < 100KB gzipped
- **New: sprite atlas** — sourced from free pixel art libraries (itch.io, OpenGameArt, Kenny.nl)
- **New: `agent-browser`** — must be available in dev environment for screenshot verification
- **No new npm dependencies**. Everything is built with Phaser primitives and TypeScript.

---

## Open Questions

1. **Sprite atlas format**: Should we use Phaser's built-in spritesheet loader (uniform grid) or a JSON atlas (TexturePacker format)? JSON atlas is more flexible for varied sprite sizes. Proposed: JSON atlas.

2. **Night number display**: Should there be a visible "Night X" counter in the barn scene? Cheap to implement, gives sense of progression. Proposed: Yes.

3. **Maximum stock per animal type**: INTENT.md mentions "limited stock" in multiplayer context. For single-player Sprint 002, should shop animals have limited stock (3 copies per game) or unlimited? Proposed: 3 copies, tracks across the full session.
