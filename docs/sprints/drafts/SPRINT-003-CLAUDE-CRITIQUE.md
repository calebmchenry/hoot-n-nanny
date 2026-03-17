# Sprint 003 Draft Critique

Reviewer: Claude
Date: 2026-03-16

---

## Codex Draft Critique

### Strengths

1. **Precise layout coordinates.** The "UI Layout Contract and Coordinates" section (BarnScene Layout table and Info Panel Layout table) provides exact pixel values for every element. This is directly implementable without guesswork and respects the 390x844 canvas constraint.

2. **Detailed animation specs.** The animation table (card draw slide, ability prompt pulse, legendary glow, win burst) gives durations, easing curves, and numeric parameters. An implementing agent could build these verbatim.

3. **Thorough event contract.** The expanded `NightEvent` union covers ability lifecycle granularly: `ability_became_ready`, `ability_prompt_opened`, `ability_resolved`, plus per-ability events (`peek_previewed`, `peek_decision_resolved`, `animal_booted`, `animal_fetched`, `abilities_refreshed`). This gives the scene layer fine-grained hooks for animation sequencing.

4. **Explicit resolution order.** The "Entry resolution order" section (steps 1-7) defines a single deterministic pipeline. Bust-before-win precedence is stated explicitly ("bust precedence remains first"). This removes ambiguity.

5. **Penned-up generalization.** The draft upgrades from single `pendingPennedUpCardId` to `pendingPennedUpCardIds: string[]` in anticipation of Stable Hand creating multiple penned-up animals. This is forward-thinking and avoids a data model change mid-sprint.

6. **Card footprint increase is well-calibrated.** Slot size goes from 88x88 to 96x104, badge size from 24px to 32px. The draft validates these against capacities 5-8 and includes layout test requirements.

### Weaknesses

1. **`TraitTag` array on `AnimalDef` is redundant.** The draft adds `traitTags: TraitTag[]` alongside `noisy: boolean`, `legendary: boolean`, and `activeAbility: ActiveAbilityDef | null`. These tags are derivable from the other fields. Maintaining consistency between `traitTags: ['NOISY', 'ACTIVE']` and `noisy: true, activeAbility: { id: 'peek', ... }` is a bug vector. Either compute tags from fields or drop the redundant fields -- do not store both.

2. **`requiredLegendaryCount: 3` as a literal type in `WinState`.** The interface declares `requiredLegendaryCount: 3` as a literal. This is fine for type safety but the same literal `3` appears as a property on `legendary_count_changed` events (`required: 3`). If the threshold ever changes, you must update multiple locations. A single constant (`WIN_LEGENDARY_THRESHOLD = 3`) would be cleaner.

3. **Legendary Mischief/Hay values are non-zero but purposeless.** The animal roster gives Golden Goose +6M/+2H, Giant Ox +8M/+1H, etc. Since Legendaries cost 30-45 Mischief to buy and the player needs 3, these cards' Mischief contributions during a Night are irrelevant to the win path -- the player already has enough Mischief to buy them. The draft does not explain the design intent for giving Legendaries high Mischief values. This could create a degenerate strategy: buy one Legendary and use it as a Mischief farm to afford the next. Whether this is intended or problematic is not discussed.

4. **No spec for what happens after the win screen.** The draft says "input lock when `GamePhase.Win`" and adds a `Win` phase, but never specifies a "Play Again" button, a return to menu, or any post-win flow. The win overlay is mentioned in Phase 5 tasks but with no detail.

5. **MarketItem expansion is underspecified.** The draft adds `legendary: boolean`, `activeAbilityId: AbilityId | null`, and `traitTags: TraitTag[]` to `MarketItem`, but does not show how these are populated from `AnimalDef`. The existing `getMarketItems()` function in `shop.ts` constructs `MarketItem` from `AnimalDef` fields -- the mapping logic needs updating but is not specified.

6. **Five implementation phases but no dependency graph.** Phases 1-5 are listed sequentially, but Phase 3 (Card Readability + Info Panel UI) depends on Phase 1 types but not on Phase 2 (Active Abilities). Phase 4 (Trading Post) depends on Phase 1 and partially on Phase 2. The draft does not make these dependencies explicit, so an implementer might serialize everything unnecessarily or parallelize incorrectly.

7. **Slot row layout for capacity 5 is inconsistent with CLAUDE.md.** The draft proposes row 2 using centered two slots at `x=[93, 201]` for capacity 5, but CLAUDE.md's current layout has row 2 at `x=[111, 215]`. The draft changes slot sizes from 88x88 to 96x104 but does not update the CLAUDE.md conventions document, which will cause confusion.

### Risk Analysis Gaps

1. **No risk assessment for the boolean-flag-to-ability migration.** The draft keeps `noisyMitigation`, `givesHermitCrabBonus`, `givesDraftPonyBonus` as separate fields on `AnimalDef` while also adding `activeAbility`. Existing code in `night.ts` (`countUnmitigatedNoisy`) and `scoring.ts` (`scoreMischief`) reads those boolean flags directly. The draft does not discuss whether these are migrated to the new ability system or kept in parallel. If kept in parallel, there are two ability systems coexisting, which is a maintenance risk.

2. **No risk for ability activation timing conflicts.** What happens if a Sheepdog is drawn, the peek prompt is showing, and the player has not decided yet -- can they "Call It a Night"? Can they long-press another card for info? The draft defines `GamePhase.AbilityDecision` but does not specify which other actions are blocked during it.

3. **No consideration of deck exhaustion during abilities.** If the deck empties mid-ability (e.g., Sheepdog peeks with 0 cards remaining, or Border Collie fetches the last card), the draft does not specify behavior. The Sheepdog peek section says "open decision with top deck card previewed" but does not handle the empty-deck case.

### Edge Cases

1. **Fetch + bust interaction.** The draft says fetched cards follow the "full entry pipeline (can trigger warning/bust/win)." If a Border Collie fetches an animal that causes a farmer bust (3 noisy), does the Collie itself count toward scoring? The Collie is already in the barn when the fetch happens. Bust on fetch means the barn has both the Collie and the fetched animal -- is this a bust on the fetched card specifically, or a general barn bust? The `bust_triggered` event expects a `card: CardInstance` -- which card is it?

2. **Stable Hand boots the card that caused the bust-avoidance.** If the barn is at capacity-1 and the Stable Hand enters (now at capacity), can the boot resolve before a barn bust is checked? The resolution order says bust check is step 5 and ability readiness is step 3, but ability resolution (the actual boot) requires player input and happens asynchronously. The draft does not clearly separate the "ability prompt shown" step from the "ability resolved" step in the pipeline.

3. **Multiple abilities from a single draw chain.** If a Border Collie fetches a card, and that card was a Sheepdog, does the Sheepdog's peek trigger? The draft says fetched cards follow the full entry pipeline, which includes step 3 ("Register active ability readiness for entered card"). This suggests yes, creating a chain. But the Gemini draft (and INTENT.md's Party House guidance) says no. The Codex draft is ambiguous.

4. **Refresh + peek/boot stacking.** If a Cheerful Lamb refreshes a Sheepdog that already peeked this Night, the Sheepdog's ability becomes available again. But the Sheepdog is already in the barn -- its `on_enter` trigger has passed. There is no mechanism in the draft to manually re-activate an `on_enter` ability. The `timing: 'manual'` field on `ActiveAbilityDef` suggests manual activation, but the resolution pipeline only calls abilities on entry. This is a contradiction.

5. **Penned-up stacking.** If multiple animals get booted by Stable Hand across draws within the same Night, `pendingPennedUpCardIds` accumulates. What happens on the next Night? Are all of them excluded from the deck? The draft says yes (the field is an array), but does not specify how they are restored -- are they all restored after one Night, or does each have an independent counter?

### Definition of Done Completeness

Generally strong. Items 1-16 are specific and verifiable. However:

- Item 1 ("visibly larger 32px badges") is a pixel measurement, which is verifiable. Good.
- Item 3 ("Long-press on touch and hover on desktop") specifies both input modes. Good.
- Item 9 ("once per card instance unless refreshed") -- but the refresh interaction is underspecified (see edge case 4 above). The DoD criterion is unverifiable without resolving the contradiction.
- Item 14 ("Existing Sprint 002 behavior still works") is vague. This should reference specific test files or test counts to be verifiable.
- Missing: no DoD criterion for post-win flow (play again, reset, etc.).
- Missing: no DoD criterion for ability activation during Warning phase. Can the player activate abilities while the NOISY! warning is showing?

### Implementability

**Score: 7/10.** An agent could implement most of this without questions. The type definitions are concrete, the layout coordinates are precise, and the test requirements are specific. However, the ability resolution timing (synchronous prompt setup vs. asynchronous player decision), the boolean-flag migration strategy, and the fetch-triggers-ability chain ambiguity would likely require clarification. The five open questions at the end are all meaningful and unanswered -- an implementer would need to make assumptions for all of them.

---

## Gemini Draft Critique

### Strengths

1. **Data-driven ability architecture.** The `ABILITY_REGISTRY` with `AbilityKind` discriminator and `resolveOnEnter()` single-dispatch function is the best architectural decision in either draft. It replaces the ad-hoc boolean flags (`noisyMitigation`, `givesHermitCrabBonus`, `givesDraftPonyBonus`) with a unified system that scales to 20+ abilities. The migration path is explicit: existing boolean flags become `abilityKind` entries. The registry also provides human-readable labels and descriptions, which the card readability and info panel features consume directly.

2. **Strong rationale sections.** The "Why Abilities-First Phasing?", "Why Data-Driven Abilities?", "Why Overlay Instead of Mini-Scene?", and "Why `tier` Instead of a Separate `LegendaryAnimal` Type?" sections justify each architectural decision with concrete tradeoff analysis. This is rare in sprint docs and helps an implementer understand intent, not just instructions.

3. **Explicit chain-breaking rule.** "Fetched/peeked animals do NOT trigger on_enter abilities. Only the card drawn by the player's 'DRAW ANIMAL' action triggers abilities." This is stated clearly in Phase 2, task list, and rationale. It prevents infinite loops (fetch -> peek -> fetch ...) and matches Party House behavior per INTENT.md.

4. **Clean `AnimalDef` simplification.** Replacing three boolean fields with `abilityKind: AbilityKind` and `tier: AnimalTier` reduces `AnimalDef` from 10 fields to 8 fields while adding more capability. The `tier` field is a discriminated union rather than a separate type hierarchy, which keeps the shop/deck/scoring systems unchanged.

5. **Thorough test specifications.** Phase 2 tests include specific edge cases: empty deck peek, boot-self forfeit, fetch-triggers-bust, ability-does-not-re-trigger-after-refresh, deterministic seeded peek sequence. These are the right tests to catch the hardest bugs.

6. **Scope cut guidance.** The risks table explicitly says: "If scope must be cut: (1) info panel and card readability are essential, (2) win condition is essential, (3) active abilities can ship with peek + boot only (defer fetch + refresh to Sprint 004)." This is practical and actionable.

7. **Separate `abilityResolver.ts` file.** Creating a dedicated module for ability dispatch follows the codebase convention ("do not create a new `src/` subdirectory until a second file would go in it") -- this is a second file in `src/game/`, not a new directory. It keeps `night.ts` from becoming a monolith.

### Weaknesses

1. **Legendary animals have 0 Mischief and 0 Hay.** All four Legendaries are defined as `0M, 0H, abilityKind: 'none'`. This makes them pure dead weight in the barn during a Night -- they take up a slot, contribute nothing to scoring, and cost 30-45 Mischief to buy. The Codex draft gives them high Mischief values (6-9), which at least creates a tension: Legendaries are expensive but generate returns. With 0/0 stats, the win condition becomes a pure sink with no intermediate payoff, which may feel punitive to players. The draft acknowledges this in Open Question 2 but does not justify the 0/0 choice beyond "simplicity."

2. **Card readability design lacks coordinates.** Unlike the Codex draft's precise pixel tables, the Gemini draft describes card readability in prose ("Gold banner across top-left corner, 14px bold white number") without exact x/y/w/h values. The info panel gets one line: `getInfoPanelBounds(): Rect -- returns { x: 0, y: 506, w: 390, h: 338 }`. An implementer building the card rendering would need to invent badge positions, stripe angles, and strip heights. Compare with Codex's table specifying card body 96x104, badge 32px diameter, name strip h=20, trait chips h=14, min w=42.

3. **Card size unchanged (88x88).** The Gemini draft never explicitly increases the card slot size. It mentions "14px bold" badges and various visual elements but keeps the original 88x88 slots. At 88x88, fitting a mischief banner, hay banner, NOISY! stripe, animal sprite, name text, AND an ability keyword strip will be extremely tight. The Codex draft's increase to 96x104 is more realistic. The Gemini draft mentions CLAUDE.md's 88x88 slots but does not propose changing them.

4. **`AbilityDef.params` is `Record<string, number>`.** This is weakly typed. The `noisy_mitigation` ability uses `params.count`, `bonus_per_empty_slot` uses `params.perSlot`, `bonus_per_barn_cat` uses `params.perCat`. A typo in parameter name (`param.perslot` vs `params.perSlot`) would silently return `undefined` without a type error. A discriminated union per ability kind with typed params would be safer in TypeScript strict mode.

5. **No animation specs.** The draft has zero animation details. No easing curves, durations, or tween specifications for: card draw, info panel slide-up, ability prompt appearance, legendary glow, win overlay. The Codex draft specifies all of these. An implementer would need to invent every animation.

6. **Ability trigger type confusion.** The `ABILITY_REGISTRY` defines peek/boot/fetch/refresh with `trigger: 'on_enter'`, but the Phase 2 task list says the Sheepdog's ability fires "After it enters the barn" and the Stable Hand's fires as "a 'Boot' prompt appears" after drawing. Meanwhile, the use cases describe them as happening automatically on draw. The timing is clear enough conceptually, but the registry's `trigger: 'on_enter'` does not distinguish between "auto-resolve on enter" (Cheerful Lamb's refresh) and "prompt player on enter" (Sheepdog's peek). The resolver handles this distinction internally, but the data model does not encode it.

7. **Paginated Trading Post is proposed but not designed.** Open Question 4 proposes pagination as an alternative to scrolling but provides no layout coordinates, button positions, or page transition mechanics. If the implementer chooses pagination, they have no spec. If they choose scrolling, the draft warns it is "finicky" but provides no fallback detail.

8. **Six phases for five features.** The phasing splits "Ability UI in BarnScene" (Phase 4) from "Card Readability & Info Panel" (Phase 3), which means BarnScene is modified in two separate phases. This increases the chance of merge conflicts if phases are developed in parallel branches, and means BarnScene is only fully functional after Phase 4 completes.

### Risk Analysis Gaps

1. **No risk for the `AnimalDef` migration breaking existing tests.** Removing `noisyMitigation`, `givesHermitCrabBonus`, and `givesDraftPonyBonus` from `AnimalDef` will cause compile errors in every file that reads those fields: `night.ts` (line 14: `getAnimalDef(card.animalId).noisyMitigation`), `scoring.ts` (lines 47-53: `animal.givesHermitCrabBonus` / `animal.givesDraftPonyBonus`), and potentially test files. The draft says "Existing NOISY! mitigation tests pass unchanged" -- but they cannot pass unchanged if the field they read is deleted. The migration requires updating those call sites simultaneously, which is a real risk that should be called out.

2. **No risk for the `abilityUsed` flag on cards that lack abilities.** Every `CardInstance` gets `abilityUsed: boolean`, even Barn Cats and Feral Goats that have `abilityKind: 'none'`. This is wasted state and a potential confusion vector. The draft even adds a belt-and-suspenders note ("Mark Legendary animals as `abilityUsed: true` by default") which suggests the author is aware this is awkward.

3. **No risk for the fetch UI's deck revelation.** The draft says "The fetch UI shows available animals but NOT their order. Candidates are displayed alphabetically." But showing the remaining deck contents (even unordered) is a significant information leak in a push-your-luck game. The player can count remaining noisy animals, assess bust probability, etc. This is flagged as a risk but underestimated -- it fundamentally changes the game's information asymmetry.

### Edge Cases

1. **Boot cannot target Legendaries.** The draft states this in Phase 2 and Open Question 1. But what if the barn is full of Legendaries and a Stable Hand? The boot prompt shows zero valid targets (Legendaries excluded, self excluded). The draft says "boot self = forfeit" but does not specify what the UI shows when there are no valid targets at all. Does the ability auto-forfeit silently?

2. **Fetch with duplicate animal types in deck.** If the deck has 3 Barn Cats remaining, does the fetch UI show "Barn Cat" once or three times? The draft says "candidates" are `CardInstance[]` which suggests individual cards, but the use case says "scrollable list of remaining deck animals" which sounds like types. If individual cards, the player can see exact deck composition (3 Barn Cats, not just "Barn Cats are available"). This needs specification.

3. **Win check after peek acceptance.** Open Question 5 asks whether win fires after peek resolution. The answer should be "yes" (any card-enters-barn event checks win), but the implementation implication is that `acceptPeek` must call the full entry pipeline including win check. The draft's `acceptPeek` task says "place peeked card in barn, clear prompt, run bust/win check" -- this is correct but listed as a task, not tested. No test case covers "peek-accept triggers win."

4. **Refresh is useless in Sprint 003.** The draft acknowledges this in Open Question 7: abilities trigger `on_enter`, and refresh resets `abilityUsed`, but there is no mechanism to re-trigger `on_enter` for cards already in the barn. So refreshing a Sheepdog that already peeked does nothing -- the Sheepdog cannot peek again because its trigger is `on_enter` and it already entered. The only scenario where refresh matters is if a second Sheepdog is drawn later (its `abilityUsed` starts false anyway since it is a new card). Refresh is effectively a no-op in Sprint 003 unless manual re-activation is added, which contradicts the `trigger: 'on_enter'` model.

5. **Multiple Stable Hands in one Night.** If two Stable Hands are drawn, two boot prompts fire. Two animals get penned up. The draft handles this (array-based penned-up tracking), but does not test this scenario explicitly. What if the second Stable Hand tries to boot the first Stable Hand?

### Definition of Done Completeness

Strong and specific. Fourteen items, each testable. Notable qualities:

- Item 1 ("No per-animal boolean flags remain on AnimalDef") is a structural requirement, not just a feature check. This is excellent.
- Item 6 ("Fetched animal does not trigger its own on_enter ability") encodes the chain-breaking rule as a DoD criterion. Good.
- Item 9 ("Having 3 Legendary Animals in the barn simultaneously during a Night triggers a win screen with final score display") is end-to-end verifiable.

Gaps:
- No DoD item for the ability resolver dispatching correctly on all 8 `AbilityKind` values (including the 4 existing passive/score abilities migrated from boolean flags).
- No DoD item for the Trading Post layout (Legendary section, ability keywords on shop cards). Phase 5 has tasks but no DoD criterion.
- Item 14 ("6+ agent-browser screenshots") is a verification step, not a done criterion. Screenshots are evidence, not requirements.

### Implementability

**Score: 8/10.** The data model is well-specified, the migration path is clear, the ability resolver pattern is directly codeable, and the test cases are thorough. The main friction points are: (1) missing layout coordinates for card rendering, (2) missing animation specs, (3) the weakly-typed `params` on `AbilityDef`, and (4) the seven open questions at the end (more than Codex's five). An agent would need to either invent layout/animation details or reference the Codex draft for them. The refresh ability's uselessness (edge case 4) would also likely surface as a "what is the point of this?" question during implementation.

---

## Comparative Assessment

### Where Codex Wins

- **Layout precision.** Codex provides implementable pixel coordinates for every UI element. Gemini relies on prose descriptions.
- **Animation specs.** Codex gives exact durations, easing curves, and scale values. Gemini provides none.
- **Legendary animal design.** Codex gives Legendaries meaningful Mischief/Hay stats, creating strategic tension. Gemini makes them 0/0 dead weight.
- **Slot size increase.** Codex increases cards to 96x104 for readability. Gemini leaves them at 88x88, which is too small for the proposed visual additions.

### Where Gemini Wins

- **Architecture.** The data-driven ability registry is cleaner, more extensible, and eliminates boolean-flag duplication. Codex keeps the old flags alongside the new ability system.
- **Migration strategy.** Gemini explicitly replaces `noisyMitigation`/`givesHermitCrabBonus`/`givesDraftPonyBonus` with `abilityKind`. Codex does not address migrating existing abilities.
- **Chain-breaking rule.** Gemini clearly states fetched/peeked cards do not trigger abilities. Codex is ambiguous (says fetch follows "full entry pipeline" which includes ability registration).
- **Scope cut guidance.** Gemini tells you what to drop first. Codex does not.
- **Rationale depth.** Gemini explains why each decision was made. Codex states what to build without explaining why.
- **Test coverage.** Gemini's test list catches more edge cases (empty deck peek, fetch+bust, refresh no-op, boot-self forfeit).

### Recommendation for Merge

A strong Sprint 003 spec would combine:

1. **Gemini's ability registry architecture** (`ABILITY_REGISTRY`, `AbilityKind`, `abilityResolver.ts`, `tier` field) -- but with typed params per ability kind instead of `Record<string, number>`.
2. **Codex's layout coordinates and animation specs** -- exact pixel values for card redesign, info panel, and all tweens.
3. **Codex's slot size increase** (96x104) -- necessary for the card readability overhaul to succeed.
4. **Codex's Legendary stats** (non-zero Mischief/Hay) -- or at minimum, a deliberate design justification for 0/0.
5. **Gemini's chain-breaking rule** -- fetched/peeked cards do not trigger abilities. Period.
6. **Gemini's scope cut plan** -- know what to drop if the sprint runs long.
7. **Both drafts' open questions resolved** -- particularly: boot targeting Legendaries (no), fetch candidates showing types vs. instances (types only), post-win flow (Play Again button), and whether refresh does anything useful (consider making abilities `trigger: 'manual'` so they can be tapped to activate, making refresh meaningful).
