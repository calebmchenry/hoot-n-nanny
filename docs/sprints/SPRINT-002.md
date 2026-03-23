# Sprint 002: Trading Post & Victory

## Overview

This sprint closes the game loop. After Sprint 001, the player can play Hootenanny nights indefinitely but Pop and Cash have no outlet, the deck never changes, and there's no win state. This sprint adds the Trading Post (shop phase), the night-to-shop-to-night transition, and the blue-ribbon win condition. When it ships, every subsequent sprint is polish.

Backlog items covered: **#7 (Shop Phase)**, **#8 (Win Condition)**, **#11 (Shop UI)**.

Out of scope: final sprites, audio, responsive layout polish, humor pass, CI/CD.

## Resolved Product Decisions

These are frozen for the sprint. Balance tuning happens later.

| Decision | Value |
| --- | --- |
| Regular offers per shop visit | 10 distinct types from 13 eligible (Goat excluded) |
| Blue-ribbon offers per shop visit | 2 distinct types from the 5 blue-ribbon animals |
| Regular stock per offer | 1 (sells out after one purchase) |
| Blue-ribbon stock | Unlimited (display "∞") |
| Shop rerolls mid-visit? | No — generated once on entry, discarded on exit |
| Barn capacity upgrade cost | `3 + (2 * upgradesPurchased)` → sequence: 3, 5, 7, 9, ... |
| Barn capacity cap | 38 (40-slot grid reserves slot 1 for window, slot 2 for door) |
| Purchased animals go where? | Farm (draw pile for future nights), never the current barn |
| Win requires distinct species? | No — any 3+ blue-ribbon animals in the barn count |
| Win triggers on bust? | Never |
| Bust leads to shop? | Yes — player pins one animal, then visits the shop |
| Win night visits shop? | No — winning skips the shop entirely |
| "Play Again" resets to | 0 Pop, 0 Cash, 3 Goats, 2 Pigs, 2 Chickens, 5 barn capacity, Night 1 |

## Architecture

### Phase Model

The app stays a single-screen state machine. No router library.

```typescript
type GamePhase = 'night' | 'night-summary' | 'shop' | 'win';
```

`App.tsx` switches on `phase` to render the appropriate scene. Night resolution returns an explicit outcome:

```typescript
type NightOutcome = 'bust-to-shop' | 'score-to-shop' | 'score-to-win';
```

This makes the win-vs-shop branch a first-class result of the engine, not a UI-level post-check.

### Phase Transitions

| From | Condition | To |
| --- | --- | --- |
| night | player calls it a night | night-summary |
| night | bust | night-summary (bust variant) |
| night-summary | score + 3+ blue-ribbon in barn | win |
| night-summary | score + <3 blue-ribbon | shop |
| night-summary | bust | shop |
| shop | player clicks "Hootenanny" | night |
| win | player clicks "Play Again" | night (full reset) |

### Shop State

`ShopState` is persisted in `GameState` while `phase === 'shop'` and discarded on exit. It must not be regenerated on re-render.

```typescript
interface ShopState {
  regularOffers: ShopOffer[];    // 10 slots
  blueRibbonOffers: ShopOffer[]; // 2 slots
}

interface ShopOffer {
  offerId: string;
  animalId: string;
  costPop: number;
  stock: number;        // 1 for regular, ignored for blue-ribbon
  infiniteStock: boolean;
  soldOut: boolean;
}
```

Hover/focus selection is UI state only — never stored in `ShopState`.

### Stock Generation

Pure function, injectable RNG for testability:

- Shuffle the 13 shop-eligible regular species (Fisher-Yates), take 10.
- Shuffle the 5 blue-ribbon species, take 2.
- Each regular offer: stock = 1. Each blue-ribbon offer: `infiniteStock = true`.

### Economy Rules

- Buying an animal costs Pop only. Creates a new `OwnedAnimal` with a fresh `instanceId`, appended to the farm.
- Buying barn capacity costs Cash only. Increments `barnCapacity` by 1.
- Barn upgrade cost: `3 + (2 * upgradesPurchased)`. At capacity 38, the upgrade action is disabled and visually marked as maxed.
- Regular offers sell out after one purchase. Blue-ribbon offers never sell out.

### Win Evaluation

Checked at the end of the scoring pipeline in `engine.ts`, after all End-of-Night effects resolve:

1. Count blue-ribbon animals in the barn.
2. If count >= 3 and the player called it a night (not bust), outcome is `score-to-win`.
3. If the barn auto-ends because it's full with no remaining actions, that counts as calling it a night and can trigger a win.

The shop is skipped entirely on the winning night.

### UI Composition

The Trading Post is a dedicated scene, not a modal.

- **`TradingPostScreen`** — layout: header (night number, Pop, Cash), offer grid, inspector panel, barn upgrade, "Hootenanny" button.
- **`ShopCard`** — one animal offer: placeholder image, stock, cost, ability badge, currency output. Sold-out and unaffordable states visually dimmed.
- **`ShopInspector`** — idle text: "Shop for upgrades." On focus/hover: ability explanation and currency details.
- **`BarnUpgradeCard`** — first-class purchase target showing current capacity, upgrade cost, and maxed state.

The inspector is driven by focus state (not hover). Desktop hover mirrors focus. This ensures touch devices work without hover.

Walking-in-place animation: CSS-only class toggle on hover/focus. Two-frame vertical bob on the placeholder sprite. No JS timers.

### Input Model

Reuse Sprint 001's intent-first control architecture:

- Arrow keys navigate shop cards, barn upgrade, and "Hootenanny" button.
- Enter activates the focused target.
- Mouse hover updates the inspector; click dispatches the same purchase intent as Enter.
- Touch tap dispatches the same intent as click/Enter.

One intent path, multiple input adapters.

## Implementation Phases

### Phase 1 — Shop Engine & State Types

Extend `types.ts` with `GamePhase`, `ShopState`, `ShopOffer`, `NightOutcome`, and `capacityUpgradeCount`. Write `src/game/shop.ts`:

- `generateShopStock(rng?): ShopState` — rolls 10 regular + 2 blue-ribbon offers.
- `purchaseAnimal(gameState, shopState, offerId): { gameState, shopState }` — validates Pop, deducts, creates `OwnedAnimal`, marks offer sold out.
- `purchaseCapacity(gameState): gameState` — validates Cash, deducts, increments capacity and upgrade count.
- `upgradePrice(gameState): number` — returns `3 + (2 * capacityUpgradeCount)`.

Tests:
- Stock generation: exactly 10 regular + 2 blue-ribbon, no duplicates within category, Goat excluded.
- Purchase deducts correct Pop, creates correct `OwnedAnimal`, marks sold out.
- Blue-ribbon purchase does not mark sold out.
- Insufficient funds → unchanged state.
- Capacity upgrade pricing sequence: 3, 5, 7, 9, ...
- Capacity upgrade rejected at cap (38).
- Capacity upgrade with insufficient Cash → unchanged state.

**Exit criteria**: `shop.ts` and tests pass. No UI yet.

### Phase 2 — Win Condition Logic

Add `blueRibbonBarnCount` selector. Modify the scoring pipeline in `engine.ts` to return `NightOutcome`. The check: if blue-ribbon count >= 3 and non-bust, outcome is `score-to-win`.

Tests:
- 3 blue-ribbon in barn on call-it-a-night → `score-to-win`.
- 2 blue-ribbon → `score-to-shop`.
- 3 blue-ribbon but bust → `bust-to-shop`.
- Auto-end (barn full, no actions) with 3 blue-ribbon → `score-to-win`.

**Exit criteria**: win condition testable through the engine with no UI.

### Phase 3 — Phase Transitions & App Router

Add `phase` to `GameState` (default: `'night'`). Update `App.tsx`:

- `'night'` → barn scene
- `'night-summary'` → `NightSummaryModal` (modified)
- `'shop'` → `TradingPostScreen` (placeholder)
- `'win'` → `WinScreen` (placeholder)

Modify `NightSummaryModal`: transition button routes to shop or win based on `NightOutcome`.

Add `startNextNight()` that builds a fresh `NightState` from current `GameState` and sets phase to `'night'`.

Wire the full cycle: night → summary → shop → night, and night → summary → win.

**Exit criteria**: clicking through the full loop works with placeholder screens. The game never gets stuck.

### Phase 4 — Trading Post UI

Build `TradingPostScreen` with:

- Header: night number, Pop, Cash.
- 12-card offer grid (10 regular + 2 blue-ribbon). Each card shows: animal name, placeholder image (colored rectangle with initial), stock (number or "∞"), cost in Pop, ability icon badge, currency rewards. Blue-ribbon cards get a distinct border.
- Inspector panel: focus-driven ability text, idle state "Shop for upgrades."
- `BarnUpgradeCard`: current capacity, upgrade cost, buy button. Shows "Maxed" at 38.
- "Hootenanny" button at the bottom.
- Hover/focus triggers CSS walking-in-place animation (2-frame vertical bob).
- Affordable cards are clickable; unaffordable and sold-out cards are visually dimmed and non-interactive.
- Immediate purchase on click/Enter (no confirmation modal).

**Exit criteria**: player can browse, inspect, purchase animals, upgrade capacity, and leave the shop. Mouse, keyboard, and touch all work.

### Phase 5 — Win Screen

Build `WinScreen`:

- Victory headline
- "Won on Night X"
- Final Pop and Cash totals
- The blue-ribbon animals that triggered the win
- "Play Again" button → full reset to initial state (0 Pop, 0 Cash, starter deck, 5 capacity, Night 1)

**Exit criteria**: winning triggers the screen, stats are correct, "Play Again" resets cleanly.

### Phase 6 — Integration & Smoke Tests

Playtest the full loop. Verify:
- Pop and Cash persist correctly across phases.
- Purchased animals appear in the farm on the next night.
- Barn capacity upgrades take effect on the next night.
- Blue-ribbon animals function correctly (powers work, count toward win).
- Stock varies between shop visits.
- Edge: shop with 0 Pop and 0 Cash (player can browse and leave).
- Edge: winning on the night the player would have shopped.
- Edge: sold-out offers reject repeat purchases.
- Edge: capacity upgrade disabled at 38.

Playwright smoke tests (`tests/shop-and-win.spec.ts`):
- Path 1: play a night, visit shop, buy an animal, return to night, verify animal is in farm.
- Path 2: (seeded) reach win condition, verify win screen appears and "Play Again" resets.

Verify all Sprint 001 tests still pass. Verify bundle stays under 150 KB gzipped.

**Exit criteria**: full game loop works end-to-end, all tests pass, no regressions.

## Files Summary

| File | Change | Purpose |
| --- | --- | --- |
| `src/game/types.ts` | Modify | Add `GamePhase`, `NightOutcome`, `ShopState`, `ShopOffer`, `capacityUpgradeCount` |
| `src/game/shop.ts` | Add | Stock generation, purchase logic, capacity upgrade — pure functions |
| `src/game/state.ts` | Modify | Phase transition helpers, `initShopState()`, `startNextNight()` |
| `src/game/engine.ts` | Modify | Win-condition check in scoring pipeline, return `NightOutcome` |
| `src/game/selectors.ts` | Modify | `canAfford()`, `upgradePrice()`, `blueRibbonBarnCount()`, `isMaxCapacity()` |
| `src/app/App.tsx` | Modify | Phase-based conditional rendering |
| `src/ui/NightSummaryModal.tsx` | Modify | Route to shop or win based on `NightOutcome` |
| `src/ui/TradingPostScreen.tsx` | Add | Shop scene layout and composition |
| `src/ui/ShopCard.tsx` | Add | Individual offer card with states and animation |
| `src/ui/BarnUpgradeCard.tsx` | Add | Barn capacity purchase target |
| `src/ui/ShopInspector.tsx` | Add | Focus-driven ability text panel |
| `src/ui/WinScreen.tsx` | Add | Victory screen with stats and restart |
| `src/styles/shop.css` | Add | Shop grid, card styling, hover animation, dimmed states |
| `src/styles/win.css` | Add | Win screen styling |
| `src/game/__tests__/shop.test.ts` | Add | Unit tests for stock generation, purchases, capacity upgrades |
| `src/game/__tests__/win.test.ts` | Add | Unit tests for win condition and outcome branching |
| `tests/shop-and-win.spec.ts` | Add | Playwright smoke tests for shop flow and win path |

## Definition of Done

### Core Loop
- The full game loop works: night → summary → shop → night → ... → win → play again.
- Non-winning scored nights transition to the Trading Post.
- Winning nights (3+ blue-ribbon, non-bust) skip the shop and go directly to win.
- Busted nights transition to the Trading Post (after pinning).
- "Play Again" resets to: 0 Pop, 0 Cash, 3 Goats, 2 Pigs, 2 Chickens, 5 barn capacity, Night 1.

### Shop Behavior
- Each shop visit stocks exactly 10 regular offers (from 13 eligible; Goat excluded) and 2 blue-ribbon offers, drawn randomly.
- Regular offers have stock 1 and visibly sell out after purchase.
- Blue-ribbon offers show "∞" stock and remain purchasable while affordable.
- Shop stock varies between visits and does not reroll mid-visit.
- Purchasing an animal deducts Pop, creates a new `OwnedAnimal`, and adds it to the farm for future nights. Never the current barn.
- Illegal purchases (insufficient funds, sold out) are rejected — state unchanged.

### Barn Capacity
- Barn capacity upgrades cost Cash following the sequence 3, 5, 7, 9, ...
- Each upgrade adds 1 barn slot.
- Capacity caps at 38. Upgrade action is disabled and visually marked as maxed.

### Shop UI
- Each card displays: animal name, placeholder image, stock, cost, ability icon, and currency rewards.
- Blue-ribbon cards have a distinct visual treatment.
- Focus/hover on a card shows ability text in the inspector panel. Idle state: "Shop for upgrades."
- Focus/hover triggers a CSS walking-in-place animation.
- Sold-out and unaffordable cards are visually dimmed.
- The "Hootenanny" button transitions to the next night.

### Win Condition
- Win triggers when the player calls it a night with 3+ blue-ribbon animals in the barn.
- Win does NOT trigger on bust.
- Auto-end (barn full, no actions) with 3+ blue-ribbon DOES trigger win.
- Win screen shows night count, final Pop/Cash, the winning blue-ribbon animals, and "Play Again."

### Input
- Keyboard: arrow keys navigate, Enter purchases, Tab cycles sections.
- Mouse: hover updates inspector, click purchases.
- Touch: tap purchases and updates inspector (focus-driven, no hover dependency).

### Tests & Quality
- All Sprint 001 tests pass — no regressions.
- Unit tests cover: stock generation, purchase validation, sold-out behavior, infinite stock, upgrade pricing, upgrade cap, win branching (including bust and auto-end cases).
- Playwright smoke tests cover a shop purchase round-trip and a seeded win path.
- Bundle stays under 150 KB gzipped.

## Risks

### 1. Phase transition state bugs
Shared `GameState` across three phases is the most likely bug source. A purchased animal must appear in the farm's draw pile next night, not the current night's state. **Mitigation**: `startNextNight()` always builds a fresh `NightState` from `GameState.ownedAnimals`. Shop never touches `NightState`.

### 2. Shop state regeneration on re-render
If the shop is derived on render instead of stored in state, re-renders could change what the player is buying. **Mitigation**: persist `ShopState` on entry; mutate offers in place on purchase; discard on exit.

### 3. Win logic duplication
If the UI checks blue-ribbon count separately from the engine, outcomes can diverge. **Mitigation**: night resolution returns an explicit `NightOutcome`; the UI only renders it.

### 4. Touch/hover divergence
The shop requires hover-driven inspection text, but touch devices don't hover. **Mitigation**: focus is the real source of inspector content. Desktop hover mirrors focus state.

### 5. Capacity upgrade economy balance
The 3, 5, 7, 9... pricing is an opinionated choice. **Mitigation**: the formula is isolated in `upgradePrice()` — one function to tune after playtesting.

### 6. Economic dead ends
If a player spends all Pop on regular animals and never saves for blue-ribbons, they may loop indefinitely with no viable path to victory. **Mitigation**: out of scope for this sprint. Naming it here so playtesting can address pacing. The engine mechanics are correct; the experience tuning is future work.

## Dependencies

- Sprint 001 complete: night engine, scoring pipeline, barn UI, OwnedAnimal identity model, end-of-night seam, input system.
- All 19 animal definitions exist in the catalog with blue-ribbon flags and costs.
- Placeholder art is acceptable for shop cards and win screen.
- No new npm packages required.
