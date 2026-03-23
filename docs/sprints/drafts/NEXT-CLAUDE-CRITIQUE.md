# Sprint Draft Critique — Trading Post & Victory

## Claude Draft

### Strengths

1. **Exceptional specificity.** The draft names exact interfaces (`ShopState`, `ShopSlot`), exact function signatures, exact file paths, and exact test cases. An executor could start coding Phase 1 without asking a single clarifying question.
2. **Architecture section is production-ready.** The phase router design (`GamePhase` union type, conditional render in `App.tsx`, no router library) is the right call for this scale. The explanation of where the shop plugs into the existing seam (`NightSummaryModal`) is clear and correct.
3. **Stock generation math is spelled out.** 13 eligible regulars (Goat excluded), Fisher-Yates shuffle, 3 copies per regular slot, unlimited blue-ribbon — all derived correctly from GAME_DESIGN.md. No ambiguity.
4. **Capacity upgrade formula is explicit.** The 2, 3, 4, 5... sequence is documented, isolated in one function, and flagged as a tuning knob. Good separation of concerns.
5. **Win condition placement is deliberate.** Checking after End-of-Night effects, only on call-it-a-night (not bust), is a design-aware decision that matches the game design doc's intent.
6. **Phase ordering is dependency-driven.** Domain model first (Phase 1), win logic second (Phase 2), wiring third (Phase 3), UI fourth (Phase 4–5). Each phase has testable exit criteria before the next begins.
7. **Files summary is complete.** Every new and modified file is listed with purpose. No surprises during execution.
8. **Risk analysis is honest.** Identifies phase transition bugs as the #1 risk (correct), and the mitigation (shop never touches NightState, fresh NightState built from GameState) is the right architectural guardrail.

### Weaknesses

1. **No mention of the bust → pin → shop flow.** GAME_DESIGN.md says on bust the player pins one animal and it's removed from the farm next night. The draft says "After bust, same transition (bust still leads to shop per game design)" but doesn't address whether the pinning mechanic is already implemented in Sprint 001 or needs work here. If pinning hasn't shipped, the shop transition on bust is incomplete.
2. **Barn capacity initial value not stated.** The draft discusses upgrades but never confirms the starting capacity (5, per GAME_DESIGN.md) or whether Sprint 001 already tracks `barnCapacity` on `GameState`. If it doesn't, that's a Phase 1 task, not an assumption.
3. **No touch input mentioned.** GAME_DESIGN.md specifies mouse, keyboard, and touch. The draft covers keyboard and mouse thoroughly but never addresses touch — tap targets, mobile viewport considerations, or touch-specific interactions.
4. **Shop card currency display is underspecified.** The draft says "Currency reward chips (Pop/Cash amounts the animal generates)" but doesn't define what this looks like for animals with 0 currency (Chimera: 0 Pop, 0 Cash) or animals with mixed currencies. Edge case for the UI.
5. **"Play Again" reset scope is vague.** The win screen says "resets GameState to starter deck" but doesn't specify whether this means the exact initial state (0 Pop, 0 Cash, 5 capacity, starter animals) or just resets the deck. Should be explicit.
6. **Playwright tests may be brittle.** Path 2 requires reaching the win condition, which means either mocking a lot of game state or playing through many nights. The draft mentions "seeded/mocked" but doesn't specify the approach. This could become a time sink.

### Gaps in Risk Analysis

- **No risk identified for blue-ribbon cost balance.** Blue-ribbon animals cost 40–60 Pop. A typical night might earn 10–20 Pop. The player needs 120–180 Pop across the game to buy 3. If this takes too many nights the game drags; if too few it's trivially easy. The draft's Risk #4 hand-waves this as "out of scope," but it directly affects whether the sprint delivers a satisfying game loop.
- **No risk for "stuck state" where player can't progress.** If a player spends all Pop on regular animals and never saves for blue-ribbons, they may loop indefinitely with no viable path to victory. There's no comeback mechanic discussed.
- **No risk for shop state being accidentally persisted.** The draft says shop state is "discarded when the player leaves," but if a bug causes it to survive, purchased animals could duplicate or stock could carry over.

### Missing Edge Cases

- Player enters shop with exactly enough Pop for a blue-ribbon animal but buys a regular animal first, then can't afford the blue-ribbon — no undo mechanism discussed.
- What happens if `ownedAnimals` exceeds `barnCapacity` after purchases? The player buys animals but the barn can't hold them all — are purchased animals always in the farm (draw pile) rather than the barn? This is probably correct but should be stated explicitly.
- Stock generation with fewer than 10 eligible regular types in future (if the catalog changes). Not urgent but the function should handle `min(10, availableRegulars.length)`.

### Definition of Done Completeness

Strong. Covers the full loop, stock generation, purchases, UI display, keyboard navigation, win condition, regression tests, and bundle size. **Missing:** touch input, "Play Again" resets to exact initial state, and no mention of verifying currency persistence across a multi-night run (not just single transitions).

---

## Gemini Draft

### Strengths

1. **Concise and scannable.** The draft is roughly 1/3 the length of Claude's. For a sprint that's well-understood (the backlog items are specific), brevity is a feature — less to misinterpret.
2. **Correctly identifies the state seam.** "Takes the GameState with updated Pop and Cash from the night's scoring" — this is the right mental model for where the shop plugs in.
3. **Transaction functions are cleanly named.** `buyAnimal(state, animalId)` and `buyCapacity(state)` — simpler signatures than Claude's slot-index approach. Using `animalId` instead of slot index is arguably more robust (doesn't depend on shop layout).
4. **Phase 4 (Polish and Input Unification) as a separate phase** is a good structural call. It acknowledges that keyboard/mouse/touch parity is real work, not an afterthought.
5. **Risks section correctly flags focus management** as a distinct concern. Grid-based keyboard navigation in a shop with 12+ interactive elements is genuinely tricky.
6. **Separate `CapacityUpgrade.tsx` component** is a good decomposition choice — keeps the upgrade UI cleanly isolated from the animal card grid.

### Weaknesses

1. **Severely underspecified.** The draft reads more like an outline than an executable sprint. Key details are missing:
   - No interface definitions for shop state.
   - No stock quantities for regular animals (how many copies per slot?).
   - No capacity upgrade pricing formula (just "increases per upgrade").
   - No win screen contents defined.
   - No phase transition mechanism described (how does `App.tsx` know which scene to render?).
   - No mention of what happens on bust (does the player still go to the shop?).
2. **Win condition timing is ambiguous.** "Evaluated during the Hootenanny phase's 'call it a night' scoring pipeline" — but at what point in the pipeline? Before or after End-of-Night effects? Before or after Upkeep? This matters: if a player can't pay Upkeep and loses 5 Pop, does the win still trigger? Claude's draft correctly places it after all scoring.
3. **Win condition fires instead of NightSummaryModal.** The draft says "the game transitions to a WinState rather than the NightSummaryModal." This means the player never sees their final scoring breakdown on the winning night. Claude's approach (check during scoring, set phase to win) is more flexible and could still show a summary before the win screen.
4. **No Playwright or integration tests mentioned.** Only unit tests for shop and win condition. No end-to-end verification that the full loop works.
5. **Files summary is incomplete.** No mention of changes to existing files (`types.ts`, `engine.ts`, `state.ts`, `selectors.ts`, `App.tsx`, `NightSummaryModal.tsx`). Only new files are listed. An executor would have to guess where to wire things in.
6. **No explicit Goat exclusion.** The draft says "select 10 regular animals from the catalog" but doesn't flag that Goat is marked `not in shop` in GAME_DESIGN.md. Easy to miss.
7. **No RNG strategy.** Doesn't mention how randomization works — Fisher-Yates, seeded PRNG, or just `Math.random()`. Testing stock generation without deterministic RNG is painful.
8. **Only 4 implementation phases vs. Claude's 6.** The compression means Phase 1 bundles engine logic AND state transitions together — two concerns that are better tested separately.

### Gaps in Risk Analysis

- **No risk for phase transition bugs.** This is arguably the highest-risk area of the sprint (shared mutable state across three phases), and the Gemini draft doesn't mention it.
- **No risk for win condition edge cases.** What about bust with 3 blue-ribbons? What about winning and shopping on the same transition?
- **No risk for stock generation determinism/testability.** Without injectable RNG, tests for "shop generates varied stock" are non-deterministic.
- **No risk for bundle size.** Adding a new scene with 12 interactive cards, animations, and a new CSS file could push the bundle past budget.
- **Capacity cost scaling risk is identified but the mitigation is circular.** "Implement a simple, documented step function that can be easily tuned later" — this is what every draft should do, not a mitigation. The risk is picking the wrong starting values, and the mitigation should be isolation + easy adjustment (which Claude's draft provides).

### Missing Edge Cases

- Everything listed under Claude's missing edge cases, plus:
- No handling for the "0 Pop, 0 Cash" shop visit.
- No discussion of what the shop looks like when stock is exhausted for a slot.
- No mention of blue-ribbon visual differentiation in the shop.
- No specification of the "walking in place" animation (what does it look like with placeholder art?).

### Definition of Done Completeness

**Incomplete.** Key gaps:
- No stock quantity per regular slot specified.
- No capacity pricing formula.
- No win screen contents.
- No regression test requirement.
- No bundle size check.
- No Playwright/integration test requirement.
- "Capacity upgrade cost increases with each purchase" — by how much? This is a DoD item that can't be verified without a formula.
- No "Play Again" or game reset mentioned.

---

## Recommendations for the Final Merged Sprint

### Use Claude's draft as the base

Claude's draft is substantially more complete and executable. It should serve as the skeleton for the final sprint. Gemini's draft doesn't add significant architectural ideas that Claude's lacks, but it does contribute a few good structural choices worth incorporating.

### Incorporate from Gemini

1. **Separate `CapacityUpgrade.tsx` component.** Claude bundles the upgrade UI into `TradingPost.tsx`. Gemini's decomposition into a dedicated component is cleaner and easier to test.
2. **Dedicated "Polish and Input Unification" phase.** Claude spreads input support across Phase 4. Gemini's approach of making it an explicit phase ensures touch input doesn't get lost. The final sprint should have a phase specifically for keyboard + mouse + touch verification.
3. **`buyAnimal(state, animalId)` signature.** Consider using `animalId` instead of `slotIndex` for the purchase function — it's more semantically meaningful and doesn't couple the logic to the UI's slot layout.

### Address gaps from both drafts

1. **Confirm bust → pin flow.** Verify whether Sprint 001 implemented the pinning mechanic on bust. If not, either add it to this sprint or explicitly defer it with a note.
2. **Add touch input to DoD.** Both drafts are weak on this. The final sprint DoD must include: "Shop is fully usable via touch on mobile viewports."
3. **Specify "Play Again" reset explicitly.** Final state after reset: 0 Pop, 0 Cash, 3 Goats, 2 Pigs, 2 Chickens, 5 barn capacity, Night 1. No ambiguity.
4. **Add a risk for "stuck state" / economic dead ends.** Even if the mitigation is "out of scope — address in playtesting," it should be named as a known risk.
5. **Require injectable RNG for stock generation.** Both for testing and for potential future replay/seed features. The function signature should accept an RNG parameter with a default of `Math.random`.
6. **Add edge case tests:**
   - Bust with 3 blue-ribbon animals → no win, proceed to shop.
   - Shop visit with 0 Pop and 0 Cash → player can browse and leave.
   - Purchasing when `ownedAnimals` would exceed some reasonable upper bound (is there one?).
   - "Play Again" from win screen fully resets all state including `capacityUpgradeCount`.
7. **Include existing file changes in the files summary.** Gemini's table only lists new files. The final sprint must list every file touched, as Claude's draft does.
8. **Keep Playwright smoke tests.** Gemini omitted them entirely. The final sprint should include at least the two paths Claude identified (shop round-trip and win condition).
