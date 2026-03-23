# Sprint 002 Critique: Trading Post & Victory

This document provides a comparative critique of the `NEXT-CLAUDE-DRAFT.md` and `NEXT-CODEX-DRAFT.md` sprint plans for closing the core game loop (Shop Phase and Win Condition).

## Claude Draft Evaluation

### Strengths
- **State Modeling:** Extremely clear and concise state modeling (`GamePhase`, `ShopState`, `ShopSlot`). The transition flow is easy to follow.
- **Testing Strategy:** Explicit inclusion of Playwright smoke tests and specific test cases for pure functions.
- **UI Layout:** The proposed Trading Post UI layout is practical and breaks down the components well.

### Weaknesses
- **Stock Quantity:** Stocking 3 copies of regular animals might reduce the "unique find" feel of the shop and could clutter the UI experience compared to a simpler single-stock model.
- **Pricing Curve:** The capacity upgrade pricing sequence (`2, 3, 4, 5...`) scales very slowly and might not act as a sufficient Cash sink in the late game.

### Gaps in Risk Analysis
- **Touch Interactions:** The risk analysis does not address how the hover-driven info panel will function on touch devices, a critical UX consideration for a web app.

### Missing Edge Cases
- **Maximum Capacity:** Fails to define a maximum barn capacity. Without a cap, players could theoretically purchase infinite capacity, eventually breaking the fixed 40-slot grid layout.

### Definition of Done Completeness
- Broadly complete for happy paths but lacks constraints on edge cases like the maximum barn size or explicit mobile touch interaction definitions.

---

## Codex Draft Evaluation

### Strengths
- **Edge Case Handling:** Explicitly addresses the physical limits of the board by capping barn capacity at 38.
- **Economy Scaling:** Proposes a steeper and more balanced upgrade cost curve (`3, 5, 7, 9...`).
- **Touch Support:** Directly identifies the divergence between touch and hover, proposing a focus-driven model to solve it.
- **Stock Clarity:** Setting regular stock to `1` simplifies the economy and makes shop choices feel more deliberate.

### Weaknesses
- **Overly Prescriptive:** Can be slightly too rigid in dictating exact implementation details (e.g., CSS class toggles vs. other animation strategies), which might constrain the implementer unnecessarily.

### Gaps in Risk Analysis
- **Accidental Purchases:** With infinite stock for blue-ribbon animals and no confirmation step, there is a risk of users double-clicking and accidentally buying duplicates they didn't intend to.

### Missing Edge Cases
- **Bust State Edge Cases:** While it correctly notes busted nights never win, it could be clearer on whether the player is forced into the shop or goes straight to a "game over" state (though the game design implies they always go to the shop to recover).

### Definition of Done Completeness
- Very comprehensive. The inclusion of the capacity cap and explicit touch intent requirements makes the DoD highly robust.

---

## Recommendations for the Final Merged Sprint

The final sprint plan should blend the clear state modeling of the Claude draft with the rigorous edge-case handling and economy rules of the Codex draft.

1. **Adopt Codex's Economy Rules:** 
   - Use a regular animal stock of `1` (creates scarcity and meaningful choices).
   - Use the steeper barn capacity upgrade curve: `3 + (2 * upgradesPurchased)` (i.e., `3, 5, 7, 9...`).
2. **Implement the Capacity Cap:** Barn capacity must be hard-capped at 38, as identified in the Codex draft, to respect the physical board constraints.
3. **Use Focus-Driven Inspection:** Adopt Codex's recommendation to use focus state as the primary driver for the inspector panel, ensuring touch device compatibility. Hover on desktop should simply mirror the focus state.
4. **State Machine Architecture:** Use Claude's clean `GamePhase` union type (`'night' | 'shop' | 'win'`) but enforce Codex's rule that `ShopState` must be persisted on entry to prevent accidental re-rolls during UI updates.
5. **Win Condition Clarification:** Explicitly state that the `3+` blue-ribbon animals required for a win do *not* need to be distinct species, and the win check must only occur on a successful (non-bust) night resolution.
6. **UI Simplicity:** Stick to immediate purchases without confirmation modals (as agreed in both drafts), but ensure the visual feedback for a successful purchase is instant and clear to prevent accidental double-buys of infinite-stock blue-ribbon animals.