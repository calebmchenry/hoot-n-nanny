# Sprint 001: Playable Night

## Overview

This sprint delivers a fully playable Hootenanny phase — the core gameplay loop of *Hoot N' Nanny*. A player starts from the starter deck, invites animals into the barn, uses their powers, risks busting, scores their barn, and advances into the next night. The Trading Post, win condition, art, and audio are out of scope.

The sprint optimizes for three things:

1. Rules correctness.
2. Deterministic, testable state transitions.
3. A usable barn UI on desktop and touch devices.

Blue-ribbon animals belong in the catalog now so the data model is complete before the shop sprint. Placeholder visuals are acceptable; final sprites and audio are explicitly not blockers.

## Architecture

### Stack

Vite + TypeScript + Preact with plain CSS. No router, state library, component kit, or heavy game engine. The project is a single-screen static app and should stay small.

Hard budgets:

- App JavaScript under 150 KB gzipped for this sprint
- No runtime network fetches
- No asset pipeline dependency for core gameplay; placeholders are enough

Testing: Vitest for rules and selectors, Playwright for one desktop smoke path and one mobile-emulated smoke path.

### Core Model

The game must separate immutable animal definitions from persistent owned-animal instances. This is non-negotiable — `Encore` alone means animal copies need identity across nights.

- `AnimalDefinition`: catalog data for each species — `id`, `name`, `cost`, `currencies`, `power`, `powerType`, and `blueRibbon`
- `OwnedAnimal`: per-copy runtime record with a stable `instanceId`, `animalId`, and persistent state such as `encorePop`
- `GameState`: long-lived game data — `nightNumber`, `pop`, `cash`, `barnCapacity`, and the owned collection
- `NightState`: ephemeral night data — `drawPile`, `barnResidentIds`, `usedAbilityIds`, `peekedNextId`, `bust`, `pinnedForNextNight`, and `resolutionLog`

### Rules Engine

All rules live in pure functions. Components never directly mutate night state or contain business logic.

Reducer-style engine:

- `applyIntent(state, intent) -> state`
- `resolveEffects(state) -> state` for automatic chains (Rowdy, bust checks, auto-end-at-capacity)
- Selectors for derived data: effective noisy count, unlocked slots, stack groups, farm window counts, available actions, and score previews

Key architecture decisions:

- Do not store barn slots as source of truth. Store ordered barn residents and derive the visible 40-slot layout from selectors. Treat `Stacks` and `Sneak` as layout rules; deriving layout avoids collapse bugs.
- Score through a fixed pipeline that emits a line-by-line `resolutionLog` for the UI:
  1. Pop income
  2. Cash income
  3. Upkeep payment or Pop penalty (5 Pop per missing Cash; Pop floors at 0)
  4. End-of-night effects (Flock — resolves left-to-right by barn order)

### Power Categories

Powers are classified into four timing categories:

- **Passive**: Noisy, Calm, Stacks, Sneak, Encore
- **Immediate**: Rowdy (handles recursive capacity checks)
- **Activate** (one use per night): Fetch, Kick, Peek
- **End of Night**: Flock, Upkeep

### UI Structure

The UI is a thin projection of state.

- `BarnGrid`: 4×10 CSS Grid with slot 1 as window, slot 2 as door, then guest slots, then locked slots
- `StatusBar`: night counter, Pop, Cash, noisy meter, and capacity meter
- `InspectorPanel`: selected slot details, farm window contents, ability text, and control hints
- `NightSummaryModal`: score breakdown or bust outcome and next-night handoff
- `TargetingOverlay`: prompt UI for Fetch, Kick, and bust pin selection

Keyboard, mouse, and touch must all dispatch the same intents. The selected grid cell is part of UI state, not the DOM focus model. Arrow keys move the cursor, Enter activates, Escape cancels targeting.

### Night-to-Night Seam

End of night goes to a summary/interstitial that can start the next night with the same owned collection. This seam is where the Trading Post phase plugs in next sprint.

## Edge Cases & Assumptions

These must be documented in code and baked into tests on day one:

- **Empty deck draw**: if the farm is empty and the player attempts an invite or Fetch, the action is skipped (no-op).
- **Pop floor**: Pop cannot drop below 0 during Upkeep penalty.
- **Bust with no valid pin targets**: if a bust occurs with only one animal, that animal is pinned automatically.
- **Calm resolution timing**: Calm is always applied before bust evaluation — effective noisy count = (noisy animals) − (calm animals); bust triggers at 3+ effective noisy.
- **Flock resolution order**: multiple Flock animals resolve left-to-right by barn position.
- **Shuffle**: each night starts by shuffling the current farm into a hidden draw pile.
- **Window**: shows remaining farm counts by animal type, never draw order.
- **Window and door**: do not consume barn capacity.
- **Pinning**: removes one owned animal from the next night's draw pile only, then returns it afterward.

## Implementation Phases

### Phase 1 — Scaffold the Real App

Set up Vite, TypeScript, Preact, Vitest, and Playwright. Add a production build config for GitHub Pages. Create the app shell, CSS variables, and a minimal empty barn screen with the 4×10 CSS Grid.

**Exit criteria**: `npm run build`, `npm run test`, and a rendered empty 40-slot barn all work.

### Phase 2 — Lock the Domain Model and Animal Catalog

Encode every regular and blue-ribbon animal in one catalog module. Implement starter setup, runtime instance creation, and night-start initialization. Write fixture helpers so tests can construct exact farm states without clicking through the UI.

**Exit criteria**: all 19 animals exist in data, starter game state matches the design exactly (0 Pop, 0 Cash, 3 Goats, 2 Pigs, 2 Chickens, 5 barn capacity), and Encore-capable instances can persist per-copy state.

### Phase 3 — Implement the Night Engine End-to-End

Build invite flow, call-it-a-night flow, scoring pipeline, bust rules, pinning, and next-night reset. Add all power behaviors in the engine, including chained effects and one-use-per-night activate abilities.

The engine must handle these cases explicitly:

- Rowdy inviting into a nearly full barn
- Forced invite while already at capacity causing bust
- Calm reducing effective noisy count before bust resolution
- Kick collapsing barn order correctly
- Fetch targeting a known farm animal instead of drawing randomly
- Peek revealing only the next draw
- Flock paying based on other Flock animals, resolved left-to-right
- Unpaid Upkeep converting to a 5 Pop penalty per missing Cash (floored at 0)
- Empty deck draws returning no-ops

**Exit criteria**: all rule tests pass and the engine can simulate several nights without UI involvement.

### Phase 4 — Project Game State into the Barn UI

Render the actual board. The board must show locked and unlocked slots, the window, the door, animals filling left-to-right and top-down, and collapsing after removal. Used activate icons disappear. At full capacity, unused activate abilities flash instead of auto-ending immediately when actions remain.

Use readable placeholders: tile frames, animal names or abbreviations, power badges, and currency chips.

**Exit criteria**: a player can understand the entire night state from the barn screen alone.

### Phase 5 — Unify Controls Across Keyboard, Mouse, and Touch

Implement cursor navigation, direct click and tap activation, and targeting flows for Fetch, Kick, and pinning. Keyboard and pointer interactions go through the same intent layer so they cannot drift.

Mobile is good enough when the player can complete a night on touch without zooming or precision tapping. This sprint does not need final responsive polish, but it cannot be desktop-only.

**Exit criteria**: one full night is playable by keyboard and by touch.

### Phase 6 — Stabilize, Instrument, and Prove It

Add the night summary, error guards, empty states, and resolution logging. Run end-to-end smoke tests. Playtest the starter deck manually for a few nights to catch sequencing issues tests missed.

**Exit criteria**: the slice feels internally consistent, not like a developer harness.

## Files Summary

| File | Purpose |
| --- | --- |
| `package.json` | Scripts and dependencies for build, test, and preview |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Static build config with GitHub Pages-safe base path |
| `index.html` | Single mount point for the app |
| `src/main.tsx` | App bootstrap |
| `src/app/App.tsx` | Top-level shell wiring reducer state into UI |
| `src/game/catalog.ts` | All 19 animal definitions, power metadata, and starter deck recipe |
| `src/game/types.ts` | Shared domain types, enums, and discriminated unions for powers |
| `src/game/state.ts` | `GameState`, `NightState`, initializers, and next-night setup |
| `src/game/engine.ts` | Intent dispatcher and effect resolution loop |
| `src/game/selectors.ts` | Derived layout, noisy totals, farm window counts, available actions, and score previews |
| `src/ui/BarnGrid.tsx` | 40-slot CSS Grid board rendering |
| `src/ui/StatusBar.tsx` | Night, currencies, noisy indicator, and capacity indicator |
| `src/ui/InspectorPanel.tsx` | Slot details, farm window contents, ability descriptions, and control hints |
| `src/ui/NightSummaryModal.tsx` | Scoring or bust summary and next-night handoff |
| `src/ui/TargetingOverlay.tsx` | Prompt UI for Fetch, Kick, and pin selection |
| `src/input/useControls.ts` | Unified keyboard, pointer, and touch intent translation |
| `src/styles/app.css` | Layout, tokens, slot styling, and flashing or locked states |
| `src/game/__tests__/engine.test.ts` | Unit tests for rules and edge cases |
| `tests/night-flow.spec.ts` | Playwright smoke covering a keyboard path and a touch path |

Additional files are fine, but these modules must exist — they define the seams that keep the shop sprint from becoming a refactor sprint.

## Definition of Done

- The app builds to a static site and loads directly into Night 1 in the browser
- Production app JavaScript stays under 150 KB gzipped
- The starter state is exact: 0 Pop, 0 Cash, 3 Goats, 2 Pigs, 2 Chickens, and 5 barn capacity
- All 19 animals are defined with exact cost, currency, and power metadata
- The player can invite animals from the door, inspect remaining farm animals through the window, call it a night early, and advance to another night from the summary screen
- Bust works exactly at 3 effective Noisy animals after applying Calm, including forced-invite busts at capacity
- Noisy, Stacks, Calm, Fetch, Kick, Peek, Flock, Sneak, Encore, Rowdy, and Upkeep all behave correctly
- Scoring order is exact (Pop → Cash → Upkeep → End-of-Night) and visible in the summary log
- Pop cannot go below 0 during Upkeep penalty
- The 40-slot barn grid behaves exactly as designed: fixed window and door, locked slots greyed out, guest fill order left-to-right and top-down, collapse on removal, used activate icons hidden, and unused activate abilities flashing at capacity
- One full night can be completed with keyboard only, and one full night can be completed with mouse or touch only
- Rule tests cover every power plus the main bust and scoring edge cases
- Playwright smoke tests pass for both desktop keyboard and mobile touch paths
- No selected-item behavior depends on the future shop implementation

## Risks

### 1. Ambiguous rules will cause late churn

The design leaves some implementation details implicit. Mitigation: document all assumptions (see Edge Cases section above) and bake them into tests on day one.

### 2. The barn UI can become the rules engine by accident

If components directly manage invite logic, bust checks, or target legality, the code will become brittle. Mitigation: every user action becomes an intent; only the pure engine decides what changes.

### 3. Chained effects are where the bugs live

Rowdy, Calm, capacity checks, bust resolution, and activation exhaustion interact in non-obvious ways. Mitigation: use an explicit effect-resolution loop and scenario tests, not scattered `if` statements.

### 4. Cross-input support can slip until the end

If keyboard and touch are implemented separately, one path will be broken by launch. Mitigation: unify input translation early in Phase 5 and keep one smoke test for each path.

### 5. Scope creep into visuals will slow the real sprint goal

The barn is visual and it will be tempting to chase sprites, animation, and polish. Mitigation: ship this sprint with strong placeholders and reserve art and audio work for later backlog items.

### 6. Selector-derived layout performance

Deriving 40-slot layout from selectors on every render might introduce bottlenecks. Mitigation: memoize selectors; Preact's small footprint helps but does not eliminate the need to profile.

## Dependencies

- Final stack: Vite + TypeScript + Preact (accepted before implementation starts)
- Test tooling: Vitest and Playwright included in scaffolding on day one
- GitHub Pages deployment: repo base path must be known so `vite.config.ts` is correct from the start
- Product assumptions treated as sprint-level decisions unless corrected:
  - Each night starts by shuffling the current farm into a hidden draw pile
  - The window shows remaining farm counts by animal type, never draw order
  - Window and door do not consume barn capacity
  - Pinning removes one owned animal from the next night's draw pile only, then returns it afterward
- Placeholder visual language is acceptable; final sprites and audio are explicitly not blockers
