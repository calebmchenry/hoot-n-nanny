# Critique: NEXT-CODEX-DRAFT vs NEXT-GEMINI-DRAFT

This critique evaluates the two drafts as sprint-planning documents, not as code changes. One repo-context note matters up front: the current workspace is still docs-only, so any exact `src/...` or `tests/...` file map in either draft is provisional rather than grounded in an existing implementation tree.

## NEXT-CODEX-DRAFT

### Strengths

- It freezes the major product decisions that would otherwise cause implementation churn: exact offer counts, Goat exclusion, stock rules, upgrade curve, barn cap, purchase destination, and win semantics.
- It defines a cleaner architecture seam than the Gemini draft. The explicit `nightOutcome` and separate `shop` / `win` phases reduce the chance that business logic leaks into the UI.
- It treats shop generation and transactions as deterministic state transitions, which is the right foundation for tests and reproducible bugs.
- Its implementation phases are actionable. Each phase has concrete exit criteria instead of generic "build UI" milestones.
- Its Definition of Done is substantially stronger than the Gemini draft. It covers both happy-path behavior and several important negative assertions.
- Its risk section focuses on real failure modes: rerender-driven shop regeneration, duplicated win logic, touch/hover divergence, and bad infinite-stock modeling.

### Weaknesses

- It over-specifies implementation shape in a few places. The draft is strongest when it defines behavior, but weaker when it dictates exact component decomposition and a detailed file map before the codebase exists.
- Several hard decisions are asserted without citing their source in the product spec. Examples: Goat exclusion, `13` shop-eligible regular species, `5` blue-ribbon species, the `38` capacity cap, and allowing duplicate species for the win condition.
- There is an internal model inconsistency around barn upgrade pricing. `ShopState` includes `barnUpgradePrice`, but the economy rules also say the price should be derived from upgrade count rather than stored ad hoc.
- The win presentation is slightly inconsistent. Earlier sections frame win as a dedicated phase and `WinScreen`, while Phase 4 says "victory screen or modal."
- It spends more specificity on UI composition than on a few delivery-critical flows, especially "cannot afford anything," restart reset semantics, and illegal repeated inputs.

### Gaps In Risk Analysis

- It does not call out the planning risk that the file map is speculative in a docs-only repo.
- It misses accessibility risks: focus visibility, keyboard traversal rules, reduced-motion behavior for the walk animation, and screen-reader labeling of offer state.
- It does not discuss progression ambiguity around busts. The draft clearly models `bust-to-shop`, but it does not explain the intended currency/reward behavior after a bust or why that pacing choice is correct.
- It does not mention race-condition style UI bugs such as double-clicking or double-tapping sold-out or unaffordable offers.
- It does not cover catalog drift risk if animal eligibility changes and the hard-coded `10 + 2` draw can no longer be satisfied safely.

### Missing Edge Cases

- Entering the shop with insufficient Pop and Cash to buy anything.
- Repeated activation of a sold-out regular offer or a maxed barn-upgrade action.
- Mixed-affordability cases where the player can afford capacity but no animals, or animals but no capacity.
- Restart behavior resetting currencies, farm contents, upgrade count, phase, and visit counters cleanly.
- Touch-only inspection behavior when hover does not exist.
- Reduced-motion handling for the required hover/focus walk animation.
- Failure behavior if the catalog cannot satisfy `10` distinct regular offers in a future balance pass.

### Definition Of Done Completeness

- This is close to sprint-ready. It covers core transitions, stock behavior, buy semantics, win branching, and test expectations.
- It still needs a few explicit acceptance checks: no mid-visit rerolls, illegal purchases are rejected, maxed capacity is visibly disabled, restart fully resets the run, and zero-affordability shop states remain playable.
- The DoD should also make touch/accessibility behavior testable instead of relying on the broader "same intents" statement.
- The line about "selected-item behavior" looks inherited from the previous sprint and should be rewritten in shop-specific language.

## NEXT-GEMINI-DRAFT

### Strengths

- It is concise and easy to scan. A team could read it quickly and understand the intended player-facing loop.
- It identifies the right top-level seam: the shop sits between nights, and win should be evaluated in the night-resolution pipeline.
- It keeps purchases as pure functions, which is the correct implementation direction.
- It includes a DoD and a Risks section instead of leaving quality gates implicit.
- It leaves more implementation flexibility than the Codex draft, which can be useful if the code structure is still fluid.

### Weaknesses

- It leaves too many product decisions unresolved for an execution sprint. "Limited stock," "capacity cost increases," and a "simple `WinScreen`" are not concrete enough to implement against without follow-up clarification.
- It does not define persisted `ShopState`, so it leaves open the highest-risk functional bug: rerolling or regenerating the shop during render or focus changes.
- The phase model is underspecified. It never clearly resolves whether busted nights go to the shop, whether winning nights skip the shop entirely, or what exact state handoff occurs from the night summary.
- Its file summary is too thin to be useful as an implementation guide. It omits likely engine, selector, input, and state-shape changes, and the exact paths are speculative in the current repo anyway.
- Some mitigations weaken the sprint instead of hardening it. Suggesting a tunable pricing function and curated shop composition reopens balance decisions that the sprint should freeze.

### Gaps In Risk Analysis

- It misses the risk of shop regeneration on rerender.
- It misses the risk of duplicated win logic across reducer/engine code and UI code.
- It misses the risk that touch, hover, and keyboard inspector behavior drift apart.
- It misses the risk of inconsistent infinite-stock handling between engine state and presentation state.
- It misses the risk that unresolved economy rules will create churn during implementation.
- It misses the planning risk that the repository does not yet contain the proposed implementation tree.

### Missing Edge Cases

- A bust night with `3` blue-ribbon animals should not win.
- A full barn that auto-ends with no remaining actions should still evaluate the win condition.
- Purchased animals should go to the future farm, not the current barn.
- Regular offers should visibly sell out and reject repeat purchases.
- Barn capacity needs a hard cap and a maxed/disabled state.
- The shop needs defined behavior when the player cannot afford anything.
- The draft does not say whether offers are distinct within a visit.
- The draft does not say whether Goat is excluded from the shop.
- The draft does not say whether the shop rerolls mid-visit.
- Restart/reset behavior after victory is missing.

### Definition Of Done Completeness

- The DoD covers the main happy path, but it is not complete enough for implementation or QA sign-off.
- It omits critical negative assertions: busted nights never win, winning nights skip the shop, purchases do not enter the current barn, repeat purchases fail correctly, capacity caps out, and shop inventory persists for the visit.
- It asks for unit tests but does not specify which behaviors must be deterministic or which end-to-end paths must exist.
- "All shop interactions work via keyboard, mouse, and touch" is too broad without defining focus order, shared intents, and touch inspection rules.
- It should add explicit out-of-scope boundaries to prevent polish and balancing work from spilling into the sprint.

## Recommendations For The Final Merged Sprint

- Use the Codex draft as the base document. It is much closer to an executable sprint because it freezes the product and architecture decisions that the Gemini draft leaves open.
- Borrow Gemini's brevity. The merged draft should keep Codex's hard rules and stronger test bar, but trim speculative component/file decomposition that is not necessary for acceptance.
- Add a single "Resolved Product Decisions" section near the top. That section should explicitly freeze: bust-to-shop or not, `10 + 2` offer counts, Goat exclusion, regular stock `1`, blue-ribbon infinite stock, barn-upgrade formula, barn-capacity cap, purchases going to farm not barn, and exact win semantics.
- Replace the exact file map with a responsibility map, or label file paths as illustrative. In the current repo, implementation paths are still hypothetical.
- Add a small transition table covering: non-winning score -> shop, bust -> shop or not, win -> skip shop, shop exit with zero purchases, and restart from win.
- Expand the risk section to include accessibility/focus management, race-condition inputs, catalog drift against fixed offer counts, and progression behavior after busts.
- Expand the DoD with explicit negative assertions: no mid-visit rerolls, illegal purchases rejected, maxed capacity disabled, busted nights never win, winning nights skip the shop, and restart fully resets the run.
- Keep Codex's deterministic testing requirement: unit tests for generation and transitions, plus one shop-flow end-to-end path and one seeded win-path end-to-end test.
- Preserve a short out-of-scope section so responsive polish, final art/audio, and broad balance tuning do not expand the sprint.
