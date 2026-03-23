# Sprint: Trading Post & Victory

## Overview

This sprint implements the Trading Post phase, Shop UI, and the Win Condition, completing the core gameplay loop of *Hoot N' Nanny*. The player will now transition from a completed night (Hootenanny phase) into the shop to spend their earned Pop and Cash, and then proceed to the next night. The ultimate goal is added: acquiring and successfully bringing 3 blue-ribbon animals into the barn to trigger the win state.

## Architecture

### State Seam
The Trading Post hooks into the night-to-night seam established in Sprint 001. It takes the `GameState` (with updated Pop and Cash from the night's scoring) and presents purchasing options before initializing the next `NightState`.

### Shop Pool & Generation
The shop requires a generator function to select 10 regular animals and 2 blue-ribbon animals from the catalog. Blue-ribbon animals have unlimited stock. Regular animals will have a defined limited stock per shop visit.

### Transactions
Pure functions handle purchases to mutate state predictably:
- `buyAnimal(state, animalId) -> state`: Deducts Pop, decrements stock, and adds a new `OwnedAnimal` to the player's collection.
- `buyCapacity(state) -> state`: Deducts Cash, increments `barnCapacity`, and increases the cost of the next capacity upgrade.

### Win Condition Evaluation
The win condition is evaluated during the Hootenanny phase's "call it a night" scoring pipeline. If 3 blue-ribbon animals are present in the barn upon ending the night, the game transitions to a `WinState` rather than the `NightSummaryModal`.

## Implementation phases

### Phase 1 — Shop Engine & State Transitions
Implement the shop generation logic (drawing 10 regular, 2 blue-ribbon animals). Implement the transaction functions for buying animals and capacity, ensuring cost scaling for capacity is handled. Wire the transition from the end-of-night summary into the shop phase, and from the shop phase into the next night.

**Exit criteria**: The game loop runs infinitely: Night -> Shop -> Night, with accurate state updates for purchases in memory. Test suites verify transaction logic.

### Phase 2 — Shop UI & Interactions
Build the visual layout for the Trading Post. Display available animals with their images, stock, cost, ability icons, and currencies. Implement the hover/focus state to display the "walking in place" animation and the ability explanation text. Add the idle "Shop for upgrades" text and the "Hootenanny" button to proceed. Add the capacity upgrade button showing current cost.

**Exit criteria**: The player can browse the shop, see details on hover/focus, and purchase items using UI controls with accurate cost deductions and stock updates.

### Phase 3 — The Win Condition
Implement the win condition check in the Hootenanny's scoring pipeline. Update the game state to handle a win state. Create a simple `WinScreen` to display when the condition is met.

**Exit criteria**: The game ends and displays the win screen when a player successfully calls it a night with 3 blue-ribbon animals in the barn.

### Phase 4 — Polish and Input Unification
Ensure keyboard navigation, mouse, and touch all work seamlessly in the Shop UI. Ensure focus management is solid so players can quickly tab/arrow through shop items. Add simple placeholders for the shop visual requirements (e.g. basic CSS animations for walking in place).

**Exit criteria**: The shop is fully playable and navigable across all target control schemes.

## Files Summary

| File | Purpose |
| --- | --- |
| `src/game/shop.ts` | Shop generator logic, stock tracking, and transaction pure functions |
| `src/ui/ShopScreen.tsx` | Main Trading Post UI component |
| `src/ui/ShopItem.tsx` | Individual animal listing in the shop with hover/focus states |
| `src/ui/CapacityUpgrade.tsx` | Button and logic for barn capacity upgrades |
| `src/ui/WinScreen.tsx` | The victory screen component |
| `src/game/__tests__/shop.test.ts` | Unit tests for shop generation, transactions, and capacity scaling |
| `src/game/__tests__/win.test.ts` | Unit tests for the 3 blue-ribbon win condition |

## Definition of Done

- The game successfully transitions from the night phase summary into the shop.
- The shop generates exactly 10 regular animals and 2 blue-ribbon animals per visit.
- Blue-ribbon animals have unlimited stock; regular animals have limited stock.
- The UI displays image, stock, cost, ability icon, and currencies for each animal.
- Hovering or focusing an animal displays its ability text and a "walking in place" animation.
- The idle state shows "Shop for upgrades".
- The player can purchase animals with Pop and capacity with Cash.
- Capacity upgrade cost increases with each purchase.
- The "Hootenanny" button transitions the player to the next night with their newly purchased animals in the farm.
- If the player calls it a night with 3 blue-ribbon animals in the barn, the game displays a win screen.
- All shop interactions work via keyboard, mouse, and touch.
- Unit tests cover shop generation, transactions, and win condition logic.

## Risks

### 1. Capacity Cost Scaling
The design doesn't explicitly state the math for the capacity cost increase.
**Mitigation**: Implement a simple, documented step function (e.g., +1 Cash per upgrade) that can be easily tuned later.

### 2. Shop Pool Generation
Ensuring a good variety of animals without repeating the same exact shop every time or creating unbalanced combinations.
**Mitigation**: Implement a robust random selection from the available catalog, potentially guaranteeing at least one cheap and one expensive regular animal.

### 3. Focus Management in Grid UI
The shop UI has many interactive elements; keyboard navigation might become clunky or trap the user's focus.
**Mitigation**: Explicitly manage a grid-based focus state for the shop items, utilizing the same unified input controller pattern from the Barn Grid.

## Dependencies

- Sprint 001 must be complete (the night phase, scoring, and data models are prerequisites).
- The base `AnimalDefinition` catalog must contain the blue-ribbon animals and their baseline costs/powers.