# Sprint 002 -- Gemini Draft: Playable & Beautiful Core Loop

## Overview

Sprint 002 transforms Hoot 'n Nanny from a colored-rectangle wireframe into a playable, visually appealing push-your-luck card game. The deliverable is a complete single-player loop: shuffle herd, draw animals one at a time, evaluate bust conditions, score resources, spend them in a Trading Post, and repeat. The game must look good enough that screenshots prove visual quality -- not just functionality.

The central architectural insight driving this draft: **the game state machine is the hard part, not the visuals**. The visual approach should be chosen to minimize implementation risk while maximizing perceived quality. Procedurally generated card art using Phaser primitives (rounded rects, gradients, styled text, emoji glyphs) can look surprisingly polished at 88x88 card size and adds zero asset-loading complexity, zero licensing risk, and zero bundle weight. Sprite sheets can be layered on in Sprint 003+ without changing the rendering interface.

### Scope Boundaries

**In scope:** Core draw loop, both bust conditions, Mischief/Hay scoring, Trading Post with 8+ purchasable animals, barn capacity expansion, visual polish with procedural card art and animations, unit tests for all game logic.

**Out of scope:** Active abilities requiring player choice mid-draw (Sheepdog peek, Stable Hand boot, etc.), Legendary animals, scenarios, multiplayer, sound, localStorage persistence, Release to the Wild. Animals with active abilities are included in the Trading Post roster but their abilities are treated as passive/no-op for this sprint -- the card data is correct, the UI for mid-draw choices is deferred.

## Use Cases

### UC-1: Start a Night
Player sees the Barn scene with empty animal slots, a "Draw Animal" button, a currency display (Mischief: 0, Hay: 0), a noise meter (0/3), and a barn capacity indicator (e.g., "0/5"). The herd is shuffled and ready. The farmhouse background is visible with a dark window.

### UC-2: Draw an Animal
Player taps "Draw Animal." The top card of the shuffled herd is revealed with a slide-in animation into the next available barn slot. The card shows the animal's name, emoji glyph, and resource values. If the animal is NOISY!, a noise icon appears on the card and the noise meter increments.

### UC-3: NOISY! Warning (2 unmitigated)
When the second NOISY! animal enters the barn, the farmhouse window glows amber (tween pulsing), a "WARNING" text flashes briefly, and the noise meter shows 2/3 filled. The player can still draw or stop.

### UC-4: Farmer Wakes Up Bust (3 NOISY!)
When the third unmitigated NOISY! animal is drawn, the farmhouse window turns bright red, a "FARMER WOKE UP!" overlay appears with a shake animation on the barn. The player scores zero for this night. Transition to Night Summary overlay.

### UC-5: Barn Overwhelmed Bust
When drawn animals exceed barn capacity (including Bringer-summoned extras), a "BARN OVERWHELMED!" overlay appears. Zero scoring. Transition to Night Summary.

### UC-6: Call It a Night (Voluntary Stop)
Player taps "Call It a Night" (the draw button changes label after first draw). All Mischief and Hay from animals in the barn are totaled. A Night Summary overlay shows the breakdown and totals with a satisfying tally animation. Player taps "Continue" to proceed to Trading Post.

### UC-7: Trading Post Shopping
Player sees a grid of available animals with costs, a display of current Mischief and Hay, and a "Buy Hay (+1 Capacity)" option. Tapping an affordable animal adds it to the herd. Tapping an unaffordable animal does nothing (greyed out). A "Start Next Night" button returns to the Barn.

### UC-8: Capacity Expansion
In the Trading Post, player spends Hay to expand barn capacity. Cost is incremental: 2, 3, 4, 5... Hay for each additional slot. The capacity indicator updates. New empty slots appear in the Barn on the next night.

### UC-9: Continuous Loop
After the Trading Post, the next Night begins with the updated herd (including purchases) reshuffled. The loop repeats indefinitely.

## Architecture

### State Machine

The game operates as a finite state machine with clear transitions. This is the single most important architectural element -- every bug in a push-your-luck game traces back to state transition errors.

```
IDLE -> DRAWING -> (BUST | SCORING) -> NIGHT_SUMMARY -> SHOPPING -> IDLE
```

States:
- **IDLE**: Start of a new night. Herd is shuffled. Barn is empty. Waiting for first draw.
- **DRAWING**: An animal has been drawn. Bust conditions are checked. If no bust, player chooses: draw again or stop.
- **BUST_FARMER**: 3 unmitigated NOISY! detected. Score zeroed. Transition to summary.
- **BUST_BARN**: Capacity exceeded. Score zeroed. Transition to summary.
- **SCORING**: Player called it a night. Resources tallied.
- **NIGHT_SUMMARY**: Overlay showing results. Tap to continue.
- **SHOPPING**: Trading Post scene. Buy animals or capacity. Start next night.

The state machine lives in `src/game/gameState.ts` as a pure object -- no Phaser dependency. Scenes read from it and dispatch actions to it. This is critical for testability: every state transition can be unit tested without Phaser.

### Module Structure

```
src/
  game/
    animals.ts        -- Animal definitions (data, not logic)
    deck.ts           -- Shuffle, draw, herd management
    gameState.ts      -- State machine, action dispatch, bust/score logic
    scoring.ts        -- Mischief/Hay calculation, capacity cost curve
  scenes/
    BarnScene.ts      -- Overhauled: reads game state, renders barn, handles draw/stop
    barnLayout.ts     -- Extended with dynamic slot positions, UI element positions
    TradingPostScene.ts -- New: shop UI, buy actions
    tradingPostLayout.ts -- Layout math for shop grid
    NightSummaryOverlay.ts -- Could be a Phaser Container added to BarnScene, not a separate scene
  config/
    constants.ts      -- Extended with new colors, positions, shop layout
    game.ts           -- Add TradingPost to scene array
  types/
    index.ts          -- Expanded with Animal, Card, GamePhase, NightState, etc.
```

### Why Not Separate Scenes for Summary?

The Night Summary should be a Phaser Container overlay within BarnScene, not a separate scene. Reason: the player needs to see the barn state behind the overlay (which animals they had, the noise state, etc.) for the summary to feel connected. Scene transitions would clear that visual context. The Trading Post is a separate scene because it is a fundamentally different screen.

### Card Rendering Approach

**Decision: Procedural card rendering via a reusable `CardView` factory function.**

Each animal card is a Phaser Container holding:
1. A `RoundedRectangle` background (via Phaser Graphics object) -- warm parchment color for quiet animals, red-tinted for NOISY!
2. A large emoji glyph as a Text object (e.g., cat emoji for Barn Cat, goat emoji for Feral Goat). At 36-48px font size on an 88x88 card, emoji glyphs are surprisingly readable and visually distinct.
3. Animal name as small pixel-style text at the bottom.
4. Resource badges: small colored circles with "+1" text for Mischief (gold) and Hay (green).
5. A "NOISY!" badge -- a small red triangle with exclamation mark -- if applicable.

**Why emoji over sprites:** Zero asset weight, zero licensing, instant iteration, and on mobile devices emoji render as full-color glyphs that look native. The 88x88 card size is small enough that emoji at 32-40px fill the space well. This approach keeps the app chunk well under budget while looking intentional rather than placeholder.

**Why not Canvas-drawn pixel art:** Drawing pixel art programmatically (plotting individual rectangles) is technically possible but extremely tedious, hard to maintain, and the results at 32x32 would require careful anti-aliasing work. Emoji is higher quality for less effort.

**Upgrade path:** Define a `CardRenderer` interface. Sprint 002 ships `EmojiCardRenderer`. Sprint 003+ can ship `SpriteCardRenderer` that loads a texture atlas. Scenes never know the difference.

### Dynamic Slot Layout

The current 5-slot layout is static. Barn capacity can expand, so the slot grid must be dynamic. The layout function should accept a capacity number and return slot positions. For capacity 5-8, use a 3-column grid. For 9+, compress slot size slightly (72x72) to fit more.

### Animation Strategy

Animations that matter for "looks beautiful" at minimum cost:
1. **Card draw slide-in**: Tween from off-screen bottom to target slot position (200ms ease-out).
2. **NOISY! shake**: Brief horizontal shake on the noise meter when a NOISY! animal enters (100ms, 3px amplitude).
3. **Warning glow**: Farmhouse window tween from dark to amber, pulsing (sine wave alpha on an overlay rectangle).
4. **Bust screen shake**: Camera shake (150ms, 5px) on bust.
5. **Score tally**: Numbers count up from 0 to final value (satisfying incremental reveal).
6. **Button state change**: After first draw, "DRAW ANIMAL" becomes "KEEP GOING" with a color shift.

All animations use Phaser's built-in tween system -- zero additional dependencies.

## Implementation

### Phase 1: Type Foundation & Game State Machine (15%)

**Files:**
- `src/types/index.ts` -- Expand with core types
- `src/game/animals.ts` -- Animal definitions
- `src/game/deck.ts` -- Deck operations
- `src/game/gameState.ts` -- State machine
- `src/game/scoring.ts` -- Scoring logic

**Tasks:**

1. Define types in `src/types/index.ts`:
   - `AnimalId` string literal union for all animals in this sprint
   - `AnimalDefinition`: id, name, emoji, mischiefValue, hayValue, isNoisy, cost, tags (BRINGER, etc.)
   - `CardInstance`: an AnimalDefinition reference + unique instance ID (for tracking duplicates in herd)
   - `GamePhase` enum: IDLE, DRAWING, BUST_FARMER, BUST_BARN, SCORING, NIGHT_SUMMARY, SHOPPING
   - `NightState`: phase, barn contents (CardInstance[]), noiseCount, herdRemaining (CardInstance[]), mischiefEarned, hayEarned, barnCapacity, nightNumber
   - `PlayerState`: herd (CardInstance[]), mischief, hay, barnCapacity, nightNumber
   - `ShopItem`: animal definition + stock count + affordable flag

2. Define animal data in `src/game/animals.ts`:
   - Starting herd: 4 Barn Cat, 4 Feral Goat, 2 Pot-Bellied Pig
   - Shop animals (8 minimum): Bunny, Hen, Wild Boar, Draft Pony, Hermit Crab, Strutting Peacock, Milkmaid Goat, Honey Bee
   - Each animal is a frozen object with all fields from AnimalDefinition
   - Export `STARTING_HERD` and `SHOP_ANIMALS` constants

3. Implement deck operations in `src/game/deck.ts`:
   - `shuffleDeck(cards: CardInstance[]): CardInstance[]` -- Fisher-Yates shuffle, returns new array
   - `drawCard(deck: CardInstance[]): { card: CardInstance; remaining: CardInstance[] }` -- pure, returns drawn card and remaining deck
   - `buildStartingDeck(): CardInstance[]` -- creates CardInstances from STARTING_HERD definitions

4. Implement state machine in `src/game/gameState.ts`:
   - `createInitialState(): PlayerState`
   - `startNight(state: PlayerState): NightState` -- shuffle herd, reset barn, enter IDLE
   - `drawAnimal(night: NightState): NightState` -- draw top card, check bust, update phase
   - `callItANight(night: NightState): NightState` -- transition to SCORING, calculate totals
   - `checkBust(night: NightState): GamePhase` -- pure function: count NOISY!, check capacity
   - All functions are pure (input state -> output state). No mutation.

5. Implement scoring in `src/game/scoring.ts`:
   - `scoreMischief(barn: CardInstance[]): number`
   - `scoreHay(barn: CardInstance[]): number`
   - `capacityUpgradeCost(currentCapacity: number): number` -- returns 2, 3, 4, 5... for capacity 6, 7, 8, 9...
   - `canAfford(cost: number, currency: number): boolean`

**Tests:** Unit tests for every pure function. Key edge cases:
- Drawing from empty deck (should not crash -- night ends automatically)
- Exactly 3 NOISY! = bust, 2 = warning only
- Bunny cancels one NOISY! (noise count with Bunny: if 3 NOISY! drawn but 1 Bunny present, unmitigated = 2, no bust)
- Honey Bee also cancels one NOISY! (stacks with Bunny)
- Barn capacity exactly met = safe, capacity +1 = bust
- Scoring with negative Hay animals when player cannot pay (7 Mischief penalty per unpaid)

### Phase 2: BarnScene Overhaul & Card Rendering (25%)

**Files:**
- `src/scenes/BarnScene.ts` -- Major rewrite
- `src/scenes/barnLayout.ts` -- Dynamic slot layout, UI positions
- `src/config/constants.ts` -- New colors, positions, animation timings

**Tasks:**

1. Extend `barnLayout.ts`:
   - `getDynamicSlotRects(capacity: number): Rect[]` -- generates slot positions for variable capacity
   - `getNoiseIndicatorPosition(): { x: number, y: number }`
   - `getCurrencyDisplayPosition(): { x: number, y: number }`
   - `getFarmhouseWindowRect(): Rect` -- position of the "window" overlay for warning glow
   - `getCapacityDisplayPosition(): { x: number, y: number }`

2. Extend `constants.ts`:
   - Add `COLORS` section: card backgrounds (parchment #F5E6C8, noisy red #E8A0A0), badge colors (gold #DAA520, green #228B22), text colors
   - Add `ANIMATION` section: draw duration 200ms, shake amplitude 3px, glow pulse period 800ms
   - Add `FARMHOUSE_WINDOW` position and dimensions within the farmhouse rectangle

3. Create card rendering factory (within `BarnScene.ts` initially, extract if needed):
   - `createCardView(scene: Phaser.Scene, animal: AnimalDefinition, x: number, y: number): Phaser.GameObjects.Container`
   - Container children: background rect (Graphics), emoji text (large), name text (small), resource badges, NOISY! indicator
   - NOISY! cards get a red-tinted background and a small warning triangle

4. Rewrite `BarnScene.create()`:
   - Draw barn background (keep #8B3A3A but add subtle wood-grain texture via horizontal line Graphics)
   - Draw farmhouse at bottom with a visible window (rectangle within rectangle)
   - Draw empty slot outlines based on current capacity
   - Draw currency display (top of screen): "Mischief: 0 | Hay: 0"
   - Draw noise meter: three small circles that fill red as NOISY! animals accumulate
   - Draw capacity indicator: "Barn: 0/5"
   - Draw "DRAW ANIMAL" button
   - Initialize game state via `createInitialState()` + `startNight()`

5. Implement draw flow in `BarnScene`:
   - On "Draw Animal" tap: call `drawAnimal(nightState)`, get new state
   - If new card: animate card sliding from bottom of screen to its slot position (tween)
   - Update noise meter, currency projections
   - If phase is BUST_FARMER: play bust sequence (window red, camera shake, overlay)
   - If phase is BUST_BARN: play bust sequence (different visual)
   - If no bust: change button label to "KEEP GOING" (or "CALL IT A NIGHT" as secondary button)

6. Implement dual-button layout after first draw:
   - "KEEP GOING" (primary, green) and "CALL IT A NIGHT" (secondary, amber/yellow)
   - Both are 170x56 side by side, maintaining 44px minimum tap target
   - Before first draw: single "DRAW ANIMAL" button centered

7. Add the `__GAME_READY__` flag after create completes (preserve Playwright compatibility).

### Phase 3: Night Summary Overlay & Scoring Flow (15%)

**Files:**
- `src/scenes/BarnScene.ts` -- Add overlay Container
- `src/scenes/barnLayout.ts` -- Overlay positioning

**Tasks:**

1. Create Night Summary as a Phaser Container within BarnScene:
   - Semi-transparent dark overlay covering full canvas
   - "Night Complete!" or "BUSTED!" title
   - If scored: list each animal's contribution with a tally animation (numbers count up)
   - Final totals: "Mischief earned: X, Hay earned: Y"
   - If busted: "You scored nothing this night." with bust reason
   - "Continue to Trading Post" button

2. Tally animation:
   - Each line item appears sequentially (100ms stagger)
   - Mischief/Hay numbers tween from 0 to value (300ms)
   - Total line appears last with a slight bounce scale

3. State transition: tapping "Continue" calls `scene.start(SceneKey.TradingPost)` passing the updated PlayerState via scene data or a shared state reference.

4. Edge case: if herd is empty (all cards drawn without bust), automatically trigger scoring -- do not leave player stuck.

### Phase 4: Trading Post Scene (25%)

**Files:**
- `src/scenes/TradingPostScene.ts` -- New file
- `src/scenes/tradingPostLayout.ts` -- New file
- `src/types/index.ts` -- Add SceneKey.TradingPost
- `src/config/game.ts` -- Register TradingPostScene
- `src/config/constants.ts` -- Trading Post colors and layout

**Tasks:**

1. Add `SceneKey.TradingPost = 'TradingPost'` to types.

2. Register `TradingPostScene` in `game.ts` scene array.

3. Implement `tradingPostLayout.ts`:
   - `getShopGridPositions(itemCount: number): { x: number, y: number }[]` -- 2-column grid for shop items
   - `getCapacityUpgradePosition(): { x: number, y: number }`
   - `getStartNightButtonPosition(): Rect`
   - `getCurrencyHeaderPosition(): { x: number, y: number }`

4. Implement `TradingPostScene`:
   - Receive PlayerState from BarnScene (via `this.scene.settings.data` or a singleton state module)
   - Display header: "Trading Post" title, current Mischief and Hay
   - Display shop grid: each item is a card-like container showing animal name, emoji, cost, and resource values
   - Affordable items have full opacity and are interactive; unaffordable items are dimmed (alpha 0.4)
   - On purchase: deduct Mischief, add CardInstance to player's herd, update display, re-check affordability of all items
   - Display "Expand Barn (+1 capacity): X Hay" button. Show current and next capacity.
   - On capacity purchase: deduct Hay, increment capacity, update cost display
   - "Start Next Night" button at bottom: transitions back to BarnScene with updated PlayerState
   - Stock limits: each shop animal has stock of 2-3 copies per game. Track purchases.

5. State passing architecture:
   - Create a lightweight `src/game/gameStore.ts` -- a module-level singleton holding PlayerState.
   - Both scenes read/write through `gameStore.getState()` / `gameStore.setState()`.
   - This avoids Phaser's limited scene-data-passing mechanisms and keeps the state testable.
   - The store is NOT reactive (no event emitter). Scenes read it in `create()` and on user actions.

6. **Shop animal selection (8 animals for Sprint 002):**
   - Bunny (4 Mischief) -- Cancels one NOISY!, good entry-level defensive pick
   - Hen (4 Mischief) -- Trades Mischief for Hay, enables capacity expansion path
   - Wild Boar (3 Mischief) -- Cheap NOISY! with big payout, tests risk appetite
   - Hermit Crab (4 Mischief) -- Rewards conservative play (empty slots = bonus)
   - Draft Pony (5 Mischief) -- Synergy with Barn Cats, rewards starting herd
   - Strutting Peacock (5 Mischief) -- NOISY! but gives both currencies
   - Milkmaid Goat (5 Mischief) -- Flat high income, no ability complexity
   - Honey Bee (7 Mischief) -- Second NOISY! canceller, premium defensive pick

   This selection gives the player meaningful choices: defense (Bunny, Honey Bee), economy (Hen, Milkmaid Goat), risk (Wild Boar, Strutting Peacock), and synergy (Draft Pony, Hermit Crab). No active abilities need UI support.

### Phase 5: Visual Polish & Animations (15%)

**Files:**
- `src/scenes/BarnScene.ts` -- Animation tweens
- `src/config/constants.ts` -- Animation timing constants

**Tasks:**

1. Card draw animation:
   - Card Container starts at (targetX, CANVAS.HEIGHT + 50) with alpha 0
   - Tween to (targetX, targetY) with alpha 1 over 250ms, ease 'Back.easeOut' for a slight overshoot
   - On arrival: brief scale pop (1.0 -> 1.08 -> 1.0) over 150ms

2. Farmhouse warning system:
   - Add a yellow/amber rectangle over the farmhouse window position
   - At 0 NOISY!: window is dark (alpha 0)
   - At 1 NOISY!: window has faint warm glow (alpha 0.2, static)
   - At 2 NOISY!: window pulses amber (tween alpha 0.3 <-> 0.8, period 800ms, yoyo, repeat -1)
   - At 3 NOISY!: window goes solid red (alpha 1.0), camera shake triggers

3. Noise meter visualization:
   - Three small circles (16px diameter) near the top of screen
   - Empty = dark outline only; Filled = red with a brief scale-pop when activated
   - At 2 filled: both filled circles pulse slightly

4. Barn background enhancement:
   - Instead of flat #8B3A3A, draw subtle horizontal lines (Graphics, alpha 0.1) every 12px to suggest wood planking
   - Add a darker rectangle at the top suggesting barn rafters

5. Button polish:
   - Rounded corners via Graphics instead of Rectangle
   - Subtle shadow (a slightly offset darker rectangle behind)
   - Text uses a monospace/pixel-style font-family fallback: `'"Press Start 2P", "Courier New", monospace'`
   - Note: "Press Start 2P" is a free Google Font. Load via CSS @import in index.html for zero Phaser bundle impact. If unavailable, Courier New is an acceptable fallback.

6. Trading Post visual consistency:
   - Same card rendering approach as barn
   - Subtle background color change (earthy brown #5C4033 vs barn red)
   - Section headers with horizontal rule separators (thin Graphics lines)

### Phase 6: Testing, Integration & Verification (5%)

**Files:**
- `src/game/*.test.ts` -- Unit tests (collocated with modules)
- `src/scenes/barnLayout.test.ts` -- Extend existing tests
- Existing Playwright test -- verify still passes

**Tasks:**

1. Unit tests for `deck.ts`:
   - Fisher-Yates produces a permutation (same elements, different order)
   - drawCard returns first element and remaining deck
   - Empty deck draw returns null/undefined (handled gracefully)

2. Unit tests for `gameState.ts`:
   - startNight produces IDLE phase with shuffled herd and empty barn
   - drawAnimal transitions to DRAWING, adds card to barn
   - 3 NOISY! animals -> BUST_FARMER phase
   - Capacity exceeded -> BUST_BARN phase
   - callItANight -> SCORING phase with correct totals
   - Bunny in barn + 3 NOISY! = only 2 unmitigated, no bust
   - Honey Bee stacks with Bunny: 4 NOISY! + 1 Bunny + 1 Honey Bee = 2 unmitigated, no bust
   - Drawing last card from herd without bust -> auto-score (no stuck state)

3. Unit tests for `scoring.ts`:
   - Sum of Mischief across all barn animals
   - Sum of Hay across all barn animals
   - Hermit Crab bonus: +1 per empty slot
   - Draft Pony bonus: +1 per Barn Cat in barn
   - Capacity cost curve: cap 5->6 costs 2, 6->7 costs 3, etc.
   - Negative Hay penalty: -7 Mischief per unpaid Hay

4. Verify Playwright smoke test passes (BarnScene still sets `__GAME_READY__`).

5. Run `npm run ci` -- all checks green, bundle budget met.

6. Manual verification via `agent-browser`: take screenshots at each key game state.

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add Animal, Card, GamePhase, NightState, PlayerState types; add SceneKey.TradingPost |
| `src/game/animals.ts` | Create | Animal definitions data (starting herd + 8 shop animals) |
| `src/game/deck.ts` | Create | Shuffle, draw, deck-building pure functions |
| `src/game/gameState.ts` | Create | State machine: night flow, bust detection, phase transitions |
| `src/game/scoring.ts` | Create | Mischief/Hay calculation, capacity costs, penalty logic |
| `src/game/gameStore.ts` | Create | Module-level singleton for cross-scene state sharing |
| `src/game/animals.test.ts` | Create | Tests for animal data integrity |
| `src/game/deck.test.ts` | Create | Tests for shuffle/draw |
| `src/game/gameState.test.ts` | Create | Tests for state machine transitions and bust logic |
| `src/game/scoring.test.ts` | Create | Tests for scoring math and edge cases |
| `src/scenes/BarnScene.ts` | Modify | Complete rewrite: game state integration, card rendering, animations, overlays |
| `src/scenes/barnLayout.ts` | Modify | Dynamic slot positions, UI element positions, overlay positions |
| `src/scenes/barnLayout.test.ts` | Modify | Add tests for dynamic slot generation |
| `src/scenes/TradingPostScene.ts` | Create | Shop scene: buy animals, expand capacity |
| `src/scenes/tradingPostLayout.ts` | Create | Layout math for Trading Post grid |
| `src/config/constants.ts` | Modify | New colors, animation timings, Trading Post layout values, farmhouse window |
| `src/config/game.ts` | Modify | Register TradingPostScene |

## Definition of Done

1. **Playable loop**: Player can draw animals, see bust conditions trigger correctly, score resources, buy new animals, and start another night. The loop repeats without errors.
2. **Both bust conditions**: Farmer Wakes Up (3 unmitigated NOISY!) and Barn Overwhelmed (exceed capacity) both trigger correctly with distinct visual feedback.
3. **NOISY! warning**: At 2 unmitigated NOISY! animals, the farmhouse window glows amber and the noise meter reflects the danger state.
4. **NOISY! mitigation**: Bunny and Honey Bee each cancel one NOISY!, and this is reflected in bust calculations.
5. **Starting herd correct**: 4 Barn Cat, 4 Feral Goat, 2 Pot-Bellied Pig.
6. **8 purchasable animals**: Bunny, Hen, Wild Boar, Hermit Crab, Draft Pony, Strutting Peacock, Milkmaid Goat, Honey Bee -- all buyable in Trading Post.
7. **Two currencies functional**: Mischief buys animals, Hay expands barn capacity. Capacity cost curve is incremental (2, 3, 4, 5...).
8. **Visual quality**: Cards show animal identity (emoji + name + resources), the barn has wood-texture background, farmhouse has animated warning window, draw animations are smooth. Screenshots prove this.
9. **Unit tests pass**: All game logic (deck, state, scoring) has passing unit tests covering core paths and edge cases.
10. **CI green**: `npm run ci` passes. App chunk remains under 100KB gzipped. Playwright smoke test passes.
11. **No regressions**: Existing barnLayout tests still pass.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Scope creep from abilities** | High | High | Strictly limit to passive/triggered abilities only. No mid-draw player choices. Active abilities are data-complete but logic-deferred. |
| **Emoji rendering inconsistency across platforms** | Medium | Medium | Test on Chrome, Safari, Firefox. Emoji at 32-40px renders well on all modern browsers. Fallback: replace emoji with single-letter abbreviations in colored circles (still looks decent). |
| **State machine bugs causing stuck states** | Medium | High | Exhaustive unit tests for every transition. Add a "safety valve" -- if herd is empty and phase is DRAWING, auto-transition to SCORING. |
| **Bundle budget exceeded** | Low | High | Procedural rendering adds near-zero weight. No sprite assets. Monitor with `npm run budget` after each phase. Current baseline is 1.52KB -- we have ~98KB of headroom. |
| **Phaser scene data passing is fragile** | Medium | Medium | Use module-level singleton (gameStore) instead of Phaser's scene data API. Simple, testable, no Phaser dependency in the store itself. |
| **Dynamic slot layout breaks at edge capacities** | Medium | Low | Unit test slot generation for capacities 5-12. Ensure no overlaps and all slots fit within canvas. |
| **Tween/animation conflicts with rapid tapping** | Medium | Medium | Disable draw button during card animation (200ms). Re-enable on tween complete callback. Prevents double-draw race conditions. |
| **Google Font (Press Start 2P) fails to load** | Low | Low | CSS fallback chain: Courier New -> monospace. Game is fully playable with fallback font. |

## Security Considerations

- No backend, no user accounts, no sensitive data.
- All game state is local to the browser tab (module-level singleton). No localStorage in this sprint.
- No external API calls or third-party scripts.
- Google Font loaded via CSS from fonts.googleapis.com -- standard, trusted CDN. If blocked by CSP, fallback font is used.
- No user-generated content. All text is hardcoded animal names and numbers.

## Dependencies

- **No new npm dependencies.** Everything is built with Phaser 3.80.x primitives and TypeScript.
- **Optional: Google Font "Press Start 2P"** -- loaded via CSS @import in `index.html`. Zero bundle impact. Purely cosmetic; fallback is Courier New.
- All existing dependencies remain unchanged.

## Open Questions

1. **Negative Hay penalty timing**: INTENT.md says -7 Mischief per unpaid Hay animal. Should this apply at scoring time (reducing that night's Mischief) or should it be impossible to go negative (clamp to 0)? **Proposed answer**: Apply at scoring, allow Mischief to go to 0 but not below. The penalty reduces the night's earnings but does not create debt.

2. **Bringer animals in Sprint 002?**: Bull Moose and Parade Llama auto-summon extra animals on entry. This is mechanically interesting but adds complexity (recursive draw, potential cascade bust). **Proposed answer**: Exclude Bringers from Sprint 002 shop roster. Include them in Sprint 003 when ability UI is more mature.

3. **Herd deck exhaustion**: If the player draws every card in their herd without busting, what happens? **Proposed answer**: Automatically trigger scoring. The player successfully drew their entire herd -- that is the best possible outcome.

4. **Night number tracking**: Should there be a visible night counter? **Proposed answer**: Yes, display "Night X" in the barn scene header. It is cheap to implement and gives the player a sense of progression.

5. **Penned Up mechanic**: INTENT.md says one animal is Penned Up on bust. This requires tracking and UI for showing which animal is banned next night. **Proposed answer**: Defer Penned Up to Sprint 003. For Sprint 002, a bust simply scores zero. This reduces complexity without hurting the core loop feel.

6. **Should the store be an EventEmitter?**: A reactive store would let scenes subscribe to state changes. **Proposed answer**: No. YAGNI. Scenes are rebuilt on `create()` and update on user actions. Reactivity adds complexity with no benefit at this scale.

7. **Shared state vs scene restart**: When returning from Trading Post to Barn, should BarnScene restart fresh (re-calling `create()`) or should it persist? **Proposed answer**: Full scene restart via `this.scene.start(SceneKey.Barn)`. The store holds all persistent state. Scenes are stateless views. This is simpler and matches the "thin scenes" convention.
