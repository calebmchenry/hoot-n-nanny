# Sprint Draft: Trading Post & Victory

## Overview

This sprint implements backlog items 7, 8, and 11:

1. Game Loop — Shop Phase (Trading Post)
2. Win Condition
3. Shop UI

The goal is to complete the actual game loop. After Sprint 001, the player can survive or bust a Hootenanny night, but their Pop and Cash do not lead anywhere. This sprint turns those currencies into progression by adding a real Trading Post, permanent farm growth, permanent barn growth, and a terminal win state.

This sprint assumes Sprint 001 already delivered:

- the animal catalog with all regular and blue-ribbon animals
- persistent owned-animal instances
- the night engine, scoring pipeline, and bust flow
- a UI seam between end-of-night resolution and the next night
- a shared intent layer for keyboard, mouse, and touch

This draft freezes the missing product decisions instead of leaving them ambiguous:

- Each shop visit shows exactly 10 distinct regular offers and 2 distinct blue-ribbon offers.
- Goat is excluded from the regular shop pool because it is explicitly "not in shop."
- Regular offers have stock `1`. Blue-ribbon offers have infinite stock.
- The shop is generated once when the player enters it and never rerolls mid-visit.
- Barn capacity upgrades cost `3, 5, 7, 9, ...` Cash using the formula `3 + (2 * upgradesPurchased)`.
- Barn capacity caps at `38` guest slots because the 40-slot board permanently reserves slot 1 for the window and slot 2 for the door.
- Purchased animals go into the farm for future nights. They never enter the current barn immediately.
- Winning requires `3+` blue-ribbon animals in the barn on a non-bust night end. The three animals do not need to be distinct species.

Out of scope:

- final sprite sourcing
- audio
- full responsive polish backlog work
- flavor writing and animation polish beyond the required shop hover/focus walk cycle

## Architecture

### Phase Model

The app stays a single-screen state machine. Do not introduce routing just because there is now a second scene.

- `GameState.phase` becomes `'night' | 'shop' | 'win'`.
- `NightState` remains the source of truth for the active Hootenanny.
- `ShopState` is new and is only populated while `phase === 'shop'`.
- `WinState` is new and stores the resolved victory snapshot shown by the final screen.

Night resolution must return an explicit outcome, not an implicit "go somewhere next" flag:

- `nightOutcome: 'bust-to-shop' | 'score-to-shop' | 'score-to-win'`

This matters because the win condition is a branch of night resolution, not a separate post-processing step bolted onto the UI.

### Shop State

`ShopState` should contain persisted offers, not a recipe for recomputing them on render.

- `visitNumber`
- `regularOffers: ShopOffer[]`
- `blueRibbonOffers: ShopOffer[]`
- `barnUpgradePrice`

`ShopOffer` should contain:

- stable `offerId`
- `animalId`
- `costPop`
- `stock`
- `infiniteStock`
- `soldOut`

Hover and keyboard selection are UI state, not game state. The shop inventory must not change because focus changes.

### Deterministic Stock Generation

Shop generation must be pure and testable. Do not call `Math.random()` from components.

- On shop entry, roll `10` regular offers without replacement from the `13` shop-eligible regular species.
- On the same entry, roll `2` blue-ribbon offers without replacement from the `5` blue-ribbon species.
- Persist the resulting offers inside `ShopState`.
- If the player buys an item, update that persisted offer in place.
- If the player leaves for the next night, discard the old `ShopState`.
- When the player returns after a later night, generate a fresh shop.

The shop is a stateful scene, not a selector over catalog data.

### Economy Rules

The economy needs hard rules now so the sprint can be implemented without a balancing rewrite later.

- Buying an animal spends Pop only.
- Buying barn capacity spends Cash only.
- Regular offers sell out after one purchase.
- Blue-ribbon offers never sell out and always remain purchasable while the player can afford them.
- Buying an animal creates a new `OwnedAnimal` instance with a fresh `instanceId`; it is appended to the farm pool for future nights.
- Buying barn capacity increases `barnCapacity` by `1` permanently.
- Barn upgrade cost is derived from current upgrade count, not stored ad hoc in UI logic.
- At `38` capacity, the barn upgrade action becomes disabled and visually marked as maxed.

### Win Evaluation

Win should be checked at the end of any non-bust night resolution, before a shop is generated.

- If `blueRibbonCountInBarn >= 3` and the player did not bust, the next phase is `win`.
- If the player busts, they never win, even if three blue-ribbon animals were present.
- If the barn auto-ends because it is full and no actions remain, that still counts as calling it a night and can trigger a win.
- The shop is skipped entirely on the winning night.

The win screen should be terminal for the run. No "keep playing after winning" branch. The only meaningful follow-up action is starting a new run.

### UI Composition

The Trading Post should be a dedicated scene, not a modal laid on top of the barn.

- `TradingPostScreen` owns the overall layout and phase-specific copy.
- `ShopCard` renders one animal offer with image placeholder, stock, cost, ability badge, and Pop/Cash output.
- `ShopInspector` shows default helper text when nothing is focused and detailed ability text when a card is focused or hovered.
- `BarnUpgradeCard` is a first-class purchase target, not hidden in a footer.
- A single `Hootenanny` button starts the next night.

The screen should be built around fast scanning:

- offers in a dense grid
- inspector panel for depth
- clear currency and night context in the header
- sold-out and unaffordable states readable at a glance

The required "walking in place" behavior should be implemented with CSS class toggles on hover and focus. Do not introduce JS timers for a tiny animation.

### Input Model

The shop must reuse the same intent-first control architecture from Sprint 001.

- Keyboard focus moves across shop cards, the barn upgrade card, and the `Hootenanny` button.
- `Enter` activates the focused target.
- Mouse hover updates the inspector immediately.
- Click and touch both dispatch the same purchase or transition intents used by keyboard.

The rule is simple: one intent path, multiple input adapters.

## Implementation Phases

### Phase 1 — Extend the State Machine for Shop and Win

Add `shop` and `win` as first-class phases. Introduce `ShopState`, `ShopOffer`, and `WinState`. Update the end-of-night handoff so resolution returns one of three concrete outcomes: bust to shop, score to shop, or score to win.

Exit criteria:

- the app can represent night, shop, and win without UI hacks
- winning and shopping are mutually exclusive outcomes of night resolution
- the shop is not yet rendered, but the reducer can enter and leave the phase cleanly

### Phase 2 — Implement Shop Generation and Purchase Rules

Build a dedicated shop module responsible for offer generation, purchase validation, stock updates, and barn upgrade pricing. This is the phase that locks the economy.

Specific work:

- roll 10 unique regular offers and 2 unique blue-ribbon offers
- enforce regular stock `1`
- enforce blue-ribbon infinite stock
- create new owned instances for purchased animals
- append purchases to the farm, not the barn
- implement barn upgrade price curve `3 + (2 * upgradesPurchased)`
- cap upgrades at 38 capacity

Exit criteria:

- shop generation is deterministic under tests
- purchases mutate state correctly and reject illegal actions
- shop offers persist across re-renders and focus changes

### Phase 3 — Build the Trading Post UI

Render the shop as a real screen, not a debug list. The player must be able to understand what every offer does without leaving the scene.

Specific work:

- build the shop header with night number, Pop, Cash, and a short scene label
- render a 12-card offer grid with 10 regular cards and 2 blue-ribbon cards
- render the barn upgrade card in the same visual system
- add an inspector panel whose idle text is exactly `Shop for upgrades.`
- display cost, stock, ability icon/type, and scoring currencies on every offer
- mark sold-out, unaffordable, and infinite-stock states clearly
- add hover/focus walking animation using CSS only
- add the `Hootenanny` action to start the next night

Exit criteria:

- a player can browse, inspect, and buy from the shop with mouse or keyboard
- the scene is readable with placeholder art and no audio
- leaving the shop correctly starts the next night

### Phase 4 — Add Win Flow and Final Screen

Implement the actual end of the run. This phase should feel like a complete game ending, not a boolean flag.

Specific work:

- branch from night resolution directly into the win phase
- skip shop generation on the winning night
- render a victory screen or modal with:
  - victory headline
  - final night number
  - final Pop and Cash
  - count and display of the winning blue-ribbon animals in the barn
  - restart action for a new run

Exit criteria:

- any non-bust night with three blue-ribbon animals goes straight to win
- busted nights never win
- restarting from win fully resets the run

### Phase 5 — Test the Full Loop and Remove Edge-Case Drift

This phase is for proof, not polish. The sprint is only done when the whole loop survives deterministic tests.

Specific work:

- unit tests for shop roll composition and persistence
- unit tests for purchase affordability, stock depletion, and infinite stock
- unit tests for barn upgrade pricing and cap behavior
- unit tests for win branching, including bust and auto-end cases
- one end-to-end path covering night -> shop -> buy -> next night
- one seeded end-to-end path covering a full win

Exit criteria:

- the selected-item loop is stable under tests
- the phase machine cannot accidentally skip shop or enter shop after a win

## Files Summary

These file targets assume the module seams defined in `docs/sprints/SPRINT-001.md`. If names differ in implementation, keep the responsibilities the same.

| File | Change | Purpose |
| --- | --- | --- |
| `src/game/types.ts` | Modify | Add `GamePhase`, `ShopOffer`, `ShopState`, and `WinState` types |
| `src/game/state.ts` | Modify | Initialize and transition phase-specific state for shop and win |
| `src/game/engine.ts` | Modify | Add intents for entering shop, buying animals, buying capacity, leaving shop, and restarting after win |
| `src/game/shop.ts` | Add | Pure shop generation, stock mutation, purchase validation, and barn-upgrade pricing |
| `src/game/selectors.ts` | Modify | Add selectors for affordability, sold-out state, upgrade availability, and blue-ribbon counts |
| `src/game/catalog.ts` | Modify | Expose shop eligibility metadata and inspector-friendly power text where needed |
| `src/ui/App.tsx` | Modify | Switch between barn, trading post, and win scenes |
| `src/ui/NightSummaryModal.tsx` | Modify | Send the player to shop or win based on resolved night outcome |
| `src/ui/TradingPostScreen.tsx` | Add | Full shop scene layout and composition |
| `src/ui/ShopCard.tsx` | Add | Individual offer card rendering for regular and blue-ribbon animals |
| `src/ui/BarnUpgradeCard.tsx` | Add | Permanent barn-capacity purchase target |
| `src/ui/ShopInspector.tsx` | Add | Idle helper text plus focused offer details |
| `src/ui/WinScreen.tsx` | Add | Final victory scene and restart action |
| `src/input/useControls.ts` | Modify | Extend shared navigation and activation logic into the shop scene |
| `src/styles/app.css` | Modify | Add trading-post layout, sold-out states, and win-phase styling |
| `src/game/__tests__/shop.test.ts` | Add | Unit tests for offer generation, purchases, and barn upgrades |
| `src/game/__tests__/win.test.ts` | Add | Unit tests for win detection and phase branching |
| `tests/trading-post.spec.ts` | Add | End-to-end loop smoke for shop flow and seeded victory |

## Definition of Done

- A resolved non-winning night transitions into a Trading Post instead of looping directly into the next night.
- Every shop visit contains exactly 10 distinct regular offers and 2 distinct blue-ribbon offers.
- Goat never appears in the shop.
- Regular shop offers have stock `1` and visibly sell out after purchase.
- Blue-ribbon offers visibly show infinite stock and remain purchasable while the player has enough Pop.
- Buying an animal subtracts the correct Pop, creates a fresh owned instance, and adds it to the farm for future nights.
- Buying an animal never places it directly into the current barn.
- Buying barn capacity subtracts Cash, increases capacity by `1`, and follows the exact cost curve `3, 5, 7, 9, ...`.
- Barn capacity cannot exceed `38`.
- The shop clearly shows image placeholder, stock, cost, ability, and scoring currencies for each offer.
- The inspector idle state reads `Shop for upgrades.` and updates correctly on hover or focus.
- Hovering or focusing an offer triggers a visible walking-in-place animation.
- Keyboard, mouse, and touch all go through the same purchase and navigation intents.
- The `Hootenanny` control cleanly starts the next night using the updated farm and barn capacity.
- A non-bust night with `3+` blue-ribbon animals in the barn skips the shop and enters the win phase directly.
- Busted nights never trigger a win.
- The win screen shows the run outcome clearly and supports starting a new run.
- Unit tests cover shop roll composition, purchase validation, sold-out behavior, infinite stock, upgrade pricing, upgrade cap, and win branching.
- End-to-end smoke tests cover both a shop visit and a full seeded win path.
- No selected-item behavior depends on final art, final audio, or backlog items outside 7, 8, and 11.

## Risks

### 1. Ambiguous economy decisions will create churn

The design specifies that barn upgrades get more expensive, but it does not define the curve. The sprint should not leave this open. Mitigation: freeze the curve now at `3, 5, 7, 9, ...` and treat later tuning as balance work, not architecture work.

### 2. Shop inventory can regenerate accidentally

If the shop is derived on render instead of stored in state, hover, focus, or unrelated re-renders can change what the player is buying. Mitigation: persist `ShopState` on entry and mutate offers in place.

### 3. Win logic can get duplicated across UI and engine

If the UI checks blue-ribbon count separately from the reducer, the game will drift into contradictory outcomes. Mitigation: night resolution returns an explicit outcome and the UI only renders it.

### 4. Touch and hover can diverge

The shop requires hover/focus inspection text, but touch devices do not hover. Mitigation: make focus the real source of inspector content and let desktop hover mirror that state.

### 5. Infinite stock is easy to model badly

Blue-ribbon offers need to remain purchasable without special-casing the UI in five places. Mitigation: represent infinite stock explicitly in `ShopOffer` instead of encoding it as a fake large integer.

## Dependencies

- Sprint 001 architecture exists with pure game-state transitions, persistent owned-animal instances, and a working end-of-night seam.
- All 19 animal definitions already exist, including blue-ribbon flags and costs.
- The existing input system can be extended without introducing a second control stack just for the shop.
- Placeholder art is acceptable for shop cards and the win screen.
- The following product decisions are accepted for this sprint:
  - 10 distinct regular offers per shop visit
  - 2 distinct blue-ribbon offers per shop visit
  - regular stock `1`
  - blue-ribbon infinite stock
  - barn upgrade cost curve `3, 5, 7, 9, ...`
  - win on any non-bust night end with `3+` blue-ribbon animals in the barn
