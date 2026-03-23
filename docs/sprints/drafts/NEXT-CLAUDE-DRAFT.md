# Sprint 002: Trading Post & Victory

## Overview

This sprint closes the game loop. After Sprint 001, the player can play Hootenanny nights indefinitely but their Pop and Cash have no outlet, the deck never changes, and there's no win state. This sprint adds the Trading Post (shop phase), the night-to-shop-to-night transition, and the blue-ribbon win condition. When it ships, every subsequent sprint is polish.

Three backlog items are covered:

- **#7 — Shop Phase (Trading Post)**: stock generation, purchasing animals with Pop, buying barn capacity upgrades with Cash, and the transition flow between phases.
- **#8 — Win Condition**: 3 blue-ribbon animals in the barn when calling it a night triggers a win state and ends the game.
- **#11 — Shop UI**: animal cards with image, stock, cost, ability icon, currencies, hover/focus ability text, walking-in-place animation on hover, and a "hootenanny" button to leave.

The sprint does **not** touch: art direction, responsive layout polish, audio, humor pass, CI/CD, or final QA. Placeholder visuals from Sprint 001 carry forward.

## Architecture

### Where the Shop Plugs In

Sprint 001's `NightSummaryModal` is the seam. Currently it offers "start next night." This sprint replaces that with a phase router:

```
Night → NightSummary → TradingPost → Night → ... → Win
```

A new top-level `phase` field on `GameState` drives which scene renders:

```typescript
type GamePhase = 'night' | 'night-summary' | 'shop' | 'win';
```

`App.tsx` switches on `phase` to render the appropriate scene. No router library — a single conditional render.

### Shop State

Add `ShopState` alongside `NightState`:

```typescript
interface ShopState {
  regularStock: ShopSlot[];   // 10 slots
  blueRibbonStock: ShopSlot[]; // 2 slots
}

interface ShopSlot {
  animalId: string;
  quantity: number;  // decremented on purchase; blue-ribbon slots are unlimited
  cost: number;
}
```

`ShopState` is generated once per shop visit when transitioning from night summary. It is discarded when the player leaves the shop.

### Stock Generation

Each shop visit draws 10 distinct regular animal types from the 14-animal pool (excluding Goat, which is `not in shop`). So the eligible regular pool is: Bull, Goose, Chicken, Pig, Cow, Mouse, Owl, Barn Cat, Sheep, Swan, Bunny, Border Collie, Donkey — 13 animals. Shuffle and take 10. Each regular slot stocks **3 copies**.

Blue-ribbon slots: draw 2 distinct types from the 5 blue-ribbon animals. Unlimited stock (display "∞").

This gives variety between shop visits without requiring persistent shop state across nights.

### Barn Capacity Upgrades

Cash buys barn capacity. Pricing formula: **base cost 2 Cash, +1 Cash per upgrade already purchased this game.** So the sequence is 2, 3, 4, 5, ... This keeps early upgrades accessible while making late-game capacity expensive. Each purchase adds 1 barn slot. The upgrade is displayed as a dedicated UI element in the shop, not as an animal card.

### Purchase Flow

Purchasing an animal:
1. Check player has enough Pop.
2. Deduct Pop from `GameState`.
3. Create a new `OwnedAnimal` instance (new `instanceId`).
4. Add to the player's farm collection.
5. Decrement stock quantity (skip for blue-ribbon — unlimited).

Purchasing barn capacity:
1. Check player has enough Cash.
2. Deduct Cash.
3. Increment `barnCapacity` on `GameState`.
4. Track `capacityUpgradeCount` for pricing.

All purchase logic lives in `src/game/shop.ts` as pure functions, same pattern as the night engine.

### Win Condition

The win check runs at the end of the scoring pipeline in `engine.ts`, after all End-of-Night effects resolve:

1. Count blue-ribbon animals currently in the barn.
2. If count ≥ 3, set `phase` to `'win'`.

The check only runs when the player calls it a night (not on bust). This is intentional — the player must successfully score with 3 blue-ribbon animals in the barn, not just have them there when busting.

### What Changes in Existing Files

| Existing File | Change |
| --- | --- |
| `src/game/types.ts` | Add `GamePhase`, `ShopState`, `ShopSlot`, `capacityUpgradeCount` to `GameState` |
| `src/game/state.ts` | Add `initShopState()`, `applyShopTransition()`, phase transition helpers |
| `src/game/engine.ts` | Add win-condition check at end of scoring pipeline |
| `src/game/selectors.ts` | Add `canAfford()`, `shopSlotDetails()`, `upgradePrice()`, `blueRibbonBarnCount()` selectors |
| `src/app/App.tsx` | Phase-based scene switching |
| `src/ui/NightSummaryModal.tsx` | "Continue to Trading Post" replaces "Start Next Night" |

## Implementation Phases

### Phase 1 — Shop Domain Model & Stock Generation

Extend `types.ts` with `GamePhase`, `ShopState`, `ShopSlot`, and `capacityUpgradeCount`. Write `src/game/shop.ts` with:

- `generateShopStock(rng): ShopState` — draws 10 regular + 2 blue-ribbon types, assigns quantities.
- `purchaseAnimal(gameState, shopState, slotIndex): { gameState, shopState }` — validates affordability, deducts Pop, creates `OwnedAnimal`, decrements stock.
- `purchaseCapacity(gameState): gameState` — validates Cash, deducts, increments capacity and upgrade count.
- `upgradePrice(gameState): number` — returns current capacity upgrade cost.

Write tests for:
- Stock generation produces exactly 10 regular + 2 blue-ribbon, no duplicates within category, Goat excluded from regulars.
- Purchase deducts correct Pop, creates correct `OwnedAnimal`, decrements stock.
- Blue-ribbon purchase does not decrement stock.
- Insufficient funds purchase is rejected (returns unchanged state).
- Capacity upgrade pricing sequence is correct (2, 3, 4, 5, ...).
- Capacity upgrade with insufficient Cash is rejected.

**Exit criteria**: `shop.ts` and its tests pass. No UI yet.

### Phase 2 — Win Condition Logic

Add `blueRibbonBarnCount` selector to `selectors.ts`. Modify the scoring pipeline in `engine.ts` to check for win after End-of-Night effects. The check: if `blueRibbonBarnCount >= 3` and the player called it a night (not bust), set `phase` to `'win'`.

Write tests for:
- 3 blue-ribbon animals in barn on call-it-a-night → win.
- 2 blue-ribbon animals in barn → no win, proceed to shop.
- 3 blue-ribbon animals in barn but player busted → no win, proceed to shop (bust skips scoring).
- Mix of blue-ribbon and regular animals, 3+ blue-ribbon → win.

**Exit criteria**: win condition is testable purely through the engine with no UI.

### Phase 3 — Phase Transitions & App Router

Add `phase` to `GameState` (default: `'night'`). Update `App.tsx` to render based on phase:

- `'night'` → existing barn scene
- `'night-summary'` → existing `NightSummaryModal` (modified)
- `'shop'` → new `TradingPost` component (placeholder for now)
- `'win'` → new `WinScreen` component (placeholder for now)

Modify `NightSummaryModal`:
- After scoring, transition button says "Visit the Trading Post" and sets phase to `'shop'`.
- After bust, same transition (bust still leads to shop per game design).

Add `startNextNight()` that generates a new `NightState` from the current `GameState` and sets phase back to `'night'`.

Wire up the full cycle: night → summary → shop → night.

**Exit criteria**: clicking through the full loop works with placeholder shop and win screens. The game never gets stuck.

### Phase 4 — Trading Post UI

Build `src/ui/TradingPost.tsx` as the shop scene. Layout:

**Top bar**: current Pop, current Cash, night counter (carried from game state).

**Shop grid**: 12 animal cards (10 regular + 2 blue-ribbon). Each card shows:
- Animal name
- Placeholder image (colored rectangle with animal initial, same as Sprint 001 barn placeholders)
- Stock quantity (number for regular, "∞" for blue-ribbon)
- Cost in Pop
- Ability icon badge (reuse Sprint 001's power badge component)
- Currency reward chips (Pop/Cash amounts the animal generates)
- Blue-ribbon cards get a distinct border or ribbon badge

**Interaction**:
- Hover/focus on a card → ability explanation text appears in an info panel. When nothing is focused, the info panel shows "Shop for upgrades."
- Hover/focus triggers a CSS walking-in-place animation on the placeholder sprite (simple 2-frame vertical bob).
- Click/tap/Enter on an affordable card → purchase confirmation is immediate (no modal). The card updates: stock decrements, Pop updates, new animal appears in farm. If stock hits 0, card greys out.
- Click/tap on an unaffordable card → no-op, card is visually dimmed.

**Barn capacity upgrade**: a separate panel below or beside the grid showing current capacity, upgrade cost in Cash, and a buy button. Displays the formula implicitly: "Expand barn: 3 Cash" (where 3 is the current price).

**"Hootenanny" button**: prominent button at the bottom. Clicking it calls `startNextNight()` and transitions to the night phase.

**Keyboard support**: arrow keys navigate the shop grid and upgrade button. Enter purchases. Tab cycles between the grid, upgrade, and hootenanny button. Escape does nothing (no cancel state in shop).

**Exit criteria**: a player can browse, read abilities, purchase animals, upgrade capacity, and leave the shop. All interactions work with mouse and keyboard.

### Phase 5 — Win Screen

Build `src/ui/WinScreen.tsx`. Simple and celebratory:

- "You did it!" or similar heading
- Night count: "Won on Night X"
- Final Pop and Cash totals
- List of the 3+ blue-ribbon animals that triggered the win
- "Play Again" button that resets `GameState` to starter deck and goes to night phase

No animation or audio in this sprint — just a clean, satisfying screen.

**Exit criteria**: winning triggers the screen, all stats are correct, "Play Again" resets cleanly.

### Phase 6 — Integration, Polish & Smoke Tests

- Playtest the full loop manually: night → shop → night → ... → win. Verify:
  - Pop and Cash persist correctly across phases
  - Purchased animals appear in the farm on the next night
  - Barn capacity upgrades take effect immediately on the next night
  - Blue-ribbon animals function correctly in the barn (their powers work, they count toward win)
  - Stock generation varies between shop visits
  - Edge case: entering shop with 0 Pop and 0 Cash (player can still browse and leave)
  - Edge case: winning on the same night you would have wanted to shop
- Add Playwright smoke test: `tests/shop-and-win.spec.ts`
  - Path 1: play a night, visit shop, buy an animal, return to night, verify animal is in farm
  - Path 2: (seeded/mocked) reach win condition, verify win screen appears and "Play Again" resets
- Verify all existing Sprint 001 tests still pass — no regressions in night engine
- Verify bundle size stays under 150 KB gzipped

**Exit criteria**: full game loop works end-to-end, all tests pass, no regressions.

## Files Summary

| File | Purpose |
| --- | --- |
| `src/game/types.ts` | Extended with `GamePhase`, `ShopState`, `ShopSlot`, `capacityUpgradeCount` |
| `src/game/shop.ts` | **New.** Stock generation, purchase logic, capacity upgrade — all pure functions |
| `src/game/state.ts` | Extended with `initShopState()`, phase transition helpers, `startNextNight()` |
| `src/game/engine.ts` | Extended with win-condition check in scoring pipeline |
| `src/game/selectors.ts` | Extended with `canAfford()`, `upgradePrice()`, `blueRibbonBarnCount()`, `shopSlotDetails()` |
| `src/app/App.tsx` | Phase-based conditional rendering of scenes |
| `src/ui/TradingPost.tsx` | **New.** Shop scene: grid of animal cards, capacity upgrade, hootenanny button |
| `src/ui/ShopCard.tsx` | **New.** Individual animal card: image, stats, hover animation, purchase action |
| `src/ui/WinScreen.tsx` | **New.** Victory screen with stats and play-again |
| `src/ui/NightSummaryModal.tsx` | Modified: "Visit the Trading Post" transition instead of "Start Next Night" |
| `src/styles/shop.css` | **New.** Shop grid layout, card styling, hover animation, dimmed/sold-out states |
| `src/styles/win.css` | **New.** Win screen styling |
| `src/game/__tests__/shop.test.ts` | **New.** Unit tests for stock generation, purchases, capacity upgrades |
| `src/game/__tests__/win.test.ts` | **New.** Unit tests for win condition logic |
| `tests/shop-and-win.spec.ts` | **New.** Playwright smoke test for shop flow and win condition |

## Definition of Done

- The full game loop works: night → summary → shop → night → ... → win → play again
- Shop stocks exactly 10 regular animals (from the eligible 13, Goat excluded) and 2 blue-ribbon animals per visit, drawn randomly
- Regular animals stock 3 copies each; blue-ribbon animals have unlimited stock
- Shop stock varies between visits (different random draw each time)
- The player can purchase animals with Pop; the animal appears in their farm on the next night
- The player can purchase barn capacity upgrades with Cash; price follows the sequence 2, 3, 4, 5, ...
- Each shop card displays: animal name, placeholder image, stock quantity (or ∞), cost, ability icon, and currency rewards
- Hovering/focusing a card shows ability explanation text; idle state shows "Shop for upgrades"
- Hovering/focusing a card triggers a walking-in-place placeholder animation
- Cards for unaffordable or sold-out animals are visually dimmed
- The "hootenanny" button transitions from shop to the next night
- Keyboard navigation works in the shop: arrow keys, Enter to purchase, Tab between sections
- Win condition triggers when the player calls it a night with 3+ blue-ribbon animals in the barn
- Win condition does NOT trigger on bust
- Win screen shows night count, final currencies, the winning blue-ribbon animals, and a "Play Again" button
- "Play Again" resets to a fresh starter deck and Night 1
- All Sprint 001 tests continue to pass — no regressions
- New unit tests cover: stock generation, purchase logic, capacity upgrades, and win condition
- Playwright smoke test covers a shop purchase round-trip and a win-condition path
- Production bundle stays under 150 KB gzipped

## Risks

### 1. Phase transition state bugs

Moving between three phases (night, shop, night) with shared mutable state (`GameState`) is the most likely source of bugs. An animal purchased in the shop must appear in the farm's draw pile next night — not this night's leftover state. **Mitigation**: `startNextNight()` always builds a fresh `NightState` from the current `GameState.ownedAnimals`. Shop never touches `NightState`.

### 2. Stock generation fairness

Drawing 10 from 13 eligible regular animals means 3 types are excluded per visit. If the RNG is poorly seeded, the same animals could appear repeatedly across visits, making runs feel samey. **Mitigation**: use a proper shuffle (Fisher-Yates) seeded per shop visit. Accept that with 13-choose-10, variety is moderate — this is a design constraint, not a bug.

### 3. Capacity upgrade economy balance

The 2, 3, 4, 5, ... Cash pricing is an opinionated choice. If it's too cheap, the player expands the barn trivially and the push-your-luck tension disappears. If too expensive, the upgrade feels useless. **Mitigation**: this is a tuning knob. The formula is isolated in one function (`upgradePrice`) and easy to adjust after playtesting. Ship it and tune later.

### 4. Win condition feels abrupt

Buying 3 blue-ribbon animals at 40–60 Pop each requires significant saving. The game could feel like a long grind with a sudden ending. **Mitigation**: out of scope for this sprint — pacing is a game design concern addressed in playtesting. The win mechanic itself is simple and correct; the experience around it is polish.

### 5. Shop UI complexity creep

The shop has more interactive elements than the barn: 12 cards with hover states, an upgrade panel, an info panel, and a navigation button. It's tempting to over-build. **Mitigation**: use placeholder sprites (colored rectangles), keep the layout as a simple CSS grid, and resist adding transitions or animations beyond the specified 2-frame hover bob.

## Dependencies

- **Sprint 001 complete**: all night engine, barn UI, scoring, and existing test infrastructure must be working. This sprint builds directly on `types.ts`, `engine.ts`, `state.ts`, `selectors.ts`, and `App.tsx`.
- **`OwnedAnimal` identity model**: Sprint 001's `instanceId` system is essential. Purchased animals must get new unique IDs.
- **Scoring pipeline hook point**: the win check inserts after End-of-Night effects in `engine.ts`. The pipeline must be structured to allow this insertion cleanly.
- **`NightSummaryModal` seam**: Sprint 001 must have a clear transition point where the shop phase plugs in. If the modal directly calls `startNextNight()`, that call needs to be replaceable with a phase transition.
- **RNG**: stock generation needs a shuffle function. Use a simple Fisher-Yates on `Math.random()` — no need for a seedable PRNG unless replay/testing demands it (in which case, inject the RNG as a parameter).
- **No new dependencies**: no new npm packages. Preact, Vite, Vitest, and Playwright from Sprint 001 are sufficient.
