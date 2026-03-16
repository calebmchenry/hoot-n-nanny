# Sprint 002 Cross-Critique (Gemini Perspective)

## Claude Draft Critique

### Strengths

1. **Explicit scope boundary on active abilities.** The decision to include active-ability animals in the Trading Post as stat sticks labeled "Coming Soon" is pragmatic. It avoids the Sprint 003 UI complexity (mid-draw player choice) while keeping the roster visible and the data model forward-compatible. This is the single best scoping decision across both drafts.

2. **Concrete card rendering spec.** The procedural card layout is specified down to pixel positions, font sizes, and shadow offsets. This removes ambiguity for the implementer and makes code review straightforward. The ASCII card diagram is genuinely useful.

3. **Detailed unit test cases.** The bust detection test matrix (0 NOISY, 2 NOISY, 3 NOISY, Bunny mitigation combinations) is thorough and directly maps to the rule edge cases that matter most. The scoring tests also cover the negative-Hay penalty, which both INTENT.md and the Codex draft mention but which is easy to forget during implementation.

4. **Honest about emoji cross-platform risk.** Calling out that emoji rendering differs across OS/browser and having a fallback plan (monospace glyphs with colored backgrounds) shows awareness of a real deployment hazard. The Codex draft avoids this problem entirely by specifying generated pixel-art textures, but also takes on significantly more rendering complexity as a result.

5. **Phase allocation percentages.** Assigning 25/35/20/20 with clear goals per phase makes it possible to track progress mid-sprint. The Codex draft also phases work but does not attach effort estimates.

### Weaknesses

1. **Emoji-as-art is a risky aesthetic choice.** The draft leans on 28px system emoji for animal portraits. On a 390x844 mobile canvas, these will render at platform-native fidelity, meaning they will look completely different on iOS, Android, and desktop. Worse, they will look nothing like pixel art. The INTENT.md art direction calls for "classic pixel art, 16-bit era aesthetic." Emoji fundamentally cannot deliver that. The Codex draft's generated pixel-mask textures are a much better fit for the stated art direction, even though they cost more implementation effort.

2. **BootScene marked "unchanged" -- misses texture generation.** If procedural card rendering and barn textures are generated at runtime, they should be created once in BootScene (or a preload pass) and cached as textures, not redrawn per frame or per card instance. The draft says BootScene is "unchanged" and puts card rendering as private methods in BarnScene. This means every card draw rebuilds Graphics objects on the fly. For 5-8 cards plus empty slots plus HUD elements, this is manageable but architecturally sloppy. The Codex draft correctly identifies BootScene as the place for texture registration.

3. **No seedable shuffle in the main spec.** The deck.ts section mentions "deterministic when given a seed (optional parameter for testing)" but does not specify how seeds are provided in-browser (query param? dev console?). The verification script at the bottom depends on drawing specific animals in specific order, but the shuffle is random. Without a seed mechanism exposed to the browser, the agent-browser verification steps are non-reproducible. The Codex draft specifies `?seed=sprint2-warning` query params and named showcase seeds, which is a much more robust verification approach.

4. **No BRINGER ability implementation.** The Claude draft lists Bull Moose in the purchasable roster but never specifies the BRINGER mechanic (auto-admit extra animals on entry). BRINGER is the primary trigger for Barn Overwhelmed busts. Without it, the only way to bust on capacity is drawing past 5 cards manually, which is trivial and uninteresting. The Codex draft explicitly scopes Bull Moose with BRINGER behavior and discusses overcrowd resolution after forced admissions.

5. **GameState mutation model is unclear.** The state.ts functions return `GameState` but the architecture section says state is passed by reference via Phaser scene data. Are the pure functions returning new objects (immutable style) or mutating in place? The draft does not commit. This matters for debugging, undo potential, and test isolation. The Codex draft is more deliberate here, specifying pure event-returning functions with `NightEvent[]` arrays.

6. **Night summary overlay as Phaser Container inside BarnScene.** While avoiding a scene transition is a valid performance choice, rendering a 340x500 overlay panel with scrollable scoring breakdown, multiple text objects, and a button inside the same scene that also contains animated barn slots, card containers, farmhouse graphics, and HUD elements will make BarnScene extremely large. The draft acknowledges this could happen ("or a co-located helper if it grows large") but does not plan for it. The scene file will likely exceed 500 lines.

7. **No Penned Up visual in the barn.** The state model tracks `pennedUp` but the BarnScene spec never describes how the player knows an animal is penned up for this night. There is no visual indicator on the barn UI showing which animal was penned from the previous bust. The Codex draft includes a "Penned Up reminder" in the Night HUD.

### Risk Analysis Gaps

- **No risk entry for "game is not fun."** Both drafts focus on correctness and beauty but neither identifies the risk that the core loop might feel tedious or pointless without a win condition. Sprint 002 has no win condition -- the loop is infinite. Players may have no motivation to continue after 2-3 nights. At minimum, a "you played N nights" counter or some form of progression feedback should be considered.
- **No risk entry for scene data loss on HMR.** CLAUDE.md documents that HMR causes duplicate canvases. If the developer is iterating on BarnScene and HMR fires, the GameState passed via scene data will be lost. The dev will have to start from scratch every hot reload. This will slow iteration significantly during Phase 2 and 3. A simple mitigation: stash state in a module-level variable that survives HMR.
- **No risk for Trading Post becoming a dead screen.** If the player busts on Night 1 (which is likely with 4 Feral Goats in a 10-card starting herd), they arrive at the Trading Post with 0 Mischief and 0 Hay. Every card is dimmed. There is nothing to do except tap "Start Night." This is a bad first-time experience. Neither draft addresses this.

### Missing Edge Cases

- **Bunny drawn before any NOISY! animals.** The Bunny passive "cancels NOISY! from one animal" -- does it pre-commit to cancelling, or does it reactively cancel the next NOISY! drawn? If reactive, what happens if Bunny is drawn first and then no NOISY! appears? The INTENT.md does not clarify. The draft's `countUnmitigatedNoisy` function counts NOISY! minus cancellers at check time, which is the right approach, but this should be explicitly tested: Bunny alone in barn, then one NOISY! drawn, warning count should be 0.
- **Multiple Bunnies and multiple NOISY! animals.** With 2 Bunnies and 3 NOISY! animals, unmitigated count is 1. This is tested in bust.test.ts (3 NOISY + 2 Bunny = 1 unmitigated). Good. But the scoring interaction with Bard Frog is not tested: Bard Frog + 3 NOISY + 2 Bunny should yield +2 Mischief (1 unmitigated * 2).
- **Empty draw pile.** The draft mentions "auto-end Night successfully" when the draw pile is empty but does not test what happens if the player taps DRAW on an empty pile. The button should be disabled, but what if state gets out of sync?
- **Capacity upgrade past the layout limit.** The slot layout algorithm handles rows of 3, but at capacity 9+ the slots push into the farmhouse zone. The draft acknowledges this at capacity 9 but does not address what happens at 10, 11, or 12 (theoretical max after many Hay purchases). A hard cap or slot-size reduction is needed.

### Definition of Done Completeness

The DoD is thorough and mostly measurable. Issues:

- **"At least 8 purchasable animals"** -- the roster section lists more than 8 but some have active abilities marked "Coming Soon." Does an animal with a non-functional ability count toward the 8? It should be "at least 8 purchasable animals with fully functional stats and abilities."
- **"Agent-browser screenshots captured"** -- this is not automatable in CI. It is a manual verification step disguised as a DoD item. Either make it a Playwright assertion or explicitly label it as a manual gate.
- **No DoD item for Penned Up behavior.** The state model tracks it, tests cover it, but the DoD does not require "penned up animal is excluded from next Night's draw pile" as a checkable criterion.
- **No DoD item for the BRINGER mechanic**, which is absent from the implementation entirely.

---

## Codex Draft Critique

### Strengths

1. **Event-driven architecture (`NightEvent[]`).** This is the strongest architectural decision in either draft. Having rule functions return typed event arrays that scenes consume as animation cues cleanly separates game logic from presentation. It makes the system testable, debuggable, and extensible. The Claude draft's approach of calling state mutation functions and then manually checking what changed is more fragile.

2. **Named verification seeds with query params.** The `?seed=sprint2-warning` approach with specific named seeds (`sprint2-opening`, `sprint2-farmer-bust`, `sprint2-score-shop`) makes the agent-browser verification steps deterministic and reproducible. This is a major advantage over the Claude draft's non-seeded verification plan.

3. **Richer visual specification.** The palette choices (night sky gradients, barn wood tones, straw accents, parchment UI) and the scene composition description (barn rafters, straw floor band, farmhouse silhouette with lantern, wooden hanging signs, stacked deck object) paint a much more specific picture of the target aesthetic. The Claude draft's visual spec is comparatively generic -- "barn-red background with wood-plank lines."

4. **DOM data attributes for verification.** Exposing `data-scene`, `data-phase`, `data-noisy-count`, and `data-capacity` on `#game-container` gives Playwright and agent-browser stable, semantic hooks to wait on. This is more robust than waiting for specific pixel content or animation completion. The Claude draft mentions `__GAME_READY__` but does not add granular phase markers.

5. **Explicit rule decisions section.** Locking in Penned Up semantics, NOISY! thresholds, capacity cost curve, and shuffle fairness constraints in a dedicated section removes ambiguity that would otherwise surface during implementation. The Claude draft spreads these decisions across multiple sections.

6. **Phased beauty gate.** "If the screen still reads as flat UI blocks with labels, the sprint is not done" is a clear, subjective-but-useful acceptance criterion. Combined with "if the scene becomes visually dense but unreadable on a phone, the sprint is also not done," this creates a quality corridor rather than a single pass/fail bar.

7. **Broader animal roster with deliberate subset reasoning.** The Codex draft explains why it chose specific purchasable animals (flat-income builds, Hay-focused capacity growth, NOISY! mitigation, NOISY! reward synergies, BRINGER overcrowd risk) rather than just listing them. This makes the subset feel designed rather than arbitrary.

### Weaknesses

1. **Scope is significantly larger than the Claude draft.** The Codex draft asks for: generated pixel-art environment textures (barn boards, straw floor, rafters, farmhouse, deck stack, panel backplates, button faces, moonlit edge highlights), generated pixel-art animal portraits with 2-frame idle animations for every animal, a dynamic layout system for 5-8 slot barns with card shrinking, a fairness-aware shuffle with reroll logic, floating dust motes and straw specks, capacity-upgrade plank-build animation, and deterministic seed infrastructure. This is a very large amount of work. The Claude draft is more realistic about what can be accomplished in a single sprint by using emoji for animal icons and simple tweens for animation.

2. **"Fairness-aware shuffle with rerolls" is underspecified and dangerous.** The draft says the shuffle should "allow limited rerolls when the starting herd would place too many permanent NOISY! animals at the very front." This is a vague heuristic. What is "too many"? What is "the very front"? How many rerolls? This kind of fuzzy logic is hard to test, hard to debug, and can introduce subtle balance issues. A simple Fisher-Yates shuffle is correct and sufficient for Sprint 002. Fairness adjustments can be a future refinement based on playtesting data.

3. **No concrete card rendering specification.** The draft says "define compact sprite data for each Sprint 002 animal as low-resolution pixel masks and convert them to textures once at boot" but never specifies the pixel-mask format, resolution, data structure, or how many distinct animals need unique pixel art. Creating 10+ pixel-art animal portraits procedurally is a substantial art task even if the resolution is low. The Claude draft, by contrast, specifies exact card layout with precise font sizes and positions. The Codex draft's rendering approach is higher quality but much more ambiguous in implementation.

4. **`src/rendering/` directory may violate CLAUDE.md directory rules.** CLAUDE.md says "Do not create a new src/ subdirectory until a second file would go in it." The Codex draft proposes `src/rendering/` with three files (`animalSpriteData.ts`, `textureFactory.ts`, `animationTokens.ts`), which satisfies the rule. However, `animationTokens.ts` (centralized animation timings) is arguably config, not rendering. If it moves to `src/config/`, the rendering directory drops to two files, which still satisfies the rule -- but barely. This is a minor point.

5. **Phase allocations do not add up to 100%.** The phases are 25 + 25 + 20 + 20 + 10 = 100%. That checks out. But the Phase 4 "Art Pass" at 20% is doing the heaviest lift: all environment textures, all animal portraits, all idle animations, all game animations (draw, warning, bust, scoring, purchase, capacity-upgrade), plus atmosphere effects. This is easily 40% of the total work. Either the art pass needs more time or its scope needs to shrink.

6. **No concrete TypeScript interfaces.** The Claude draft provides actual TypeScript interface definitions (`GameState`, `AnimalDef`, `AnimalCard`, etc.) that an implementer can copy-paste as a starting point. The Codex draft describes the modeling approach in prose ("Store the long-lived game in a `GameSession`," "Return pure `NightEvent[]` arrays") but does not define the actual types. This makes the Codex draft harder to implement directly from.

7. **The "agent-browser proof steps" are extremely detailed but fragile.** Steps like "draw until `data-noisy-count='2'` and `data-phase='warning'`" depend on specific seed behavior producing exactly the right sequence. If any rule implementation detail changes, the seed might not produce the expected state. The verification plan should specify what each named seed guarantees (e.g., "seed `sprint2-warning` places two Feral Goats in draw positions 1 and 2") rather than assuming the seed will work.

8. **Open question about Wise Owl active ability.** The draft asks whether Sprint 002 should include one active ability card to "prove the interaction model early." This contradicts the explicit scope decision at the top ("single-player only, polished subset, beauty is a deliverable") and would add mid-draw UI complexity. The Claude draft makes the stronger call: no active abilities in Sprint 002, period. The Codex draft should not have left this as an open question.

### Risk Analysis Gaps

- **No risk for "procedural pixel art looks bad."** The draft commits heavily to generated pixel-art textures but does not identify the risk that low-resolution programmatic pixel art might look amateurish or muddy, especially on high-DPI mobile screens. The `pixelArt: true` + `roundPixels: true` configuration helps, but the quality depends entirely on the sprite data quality, which is unspecified.
- **No risk for BootScene becoming slow.** If BootScene generates all environment textures, all animal portraits (10+ unique animals), and optionally loads a font, boot time could become noticeable. On a low-end phone, generating dozens of RenderTextures at startup might cause a visible delay before the first scene appears. A loading indicator or progressive texture generation should be considered.
- **Same "dead Trading Post" gap as the Claude draft.** A bust on Night 1 with zero resources makes the Trading Post pointless. Neither draft addresses this.
- **No risk for the event-driven architecture becoming over-engineered.** `NightEvent[]` is elegant but adds indirection. If the scene needs to handle 8+ event types with sequenced animations, the event consumer code in BarnScene could become as complex as the direct-mutation approach it replaces. The risk is that the abstraction costs more than it saves in a sprint-scoped implementation.

### Missing Edge Cases

- **BRINGER animal drawing another BRINGER.** If Bull Moose enters and auto-admits a random animal, what if that random animal is another Bull Moose (in a herd with two)? Does the second Bull Moose trigger its own BRINGER, creating a chain? INTENT.md does not specify. This could cause an infinite loop in degenerate cases (theoretical but possible with Parade Llama admitting two animals, each of which could be Bringers). The draft should specify a chain limit or resolution order.
- **Penned Up animal is a Feral Goat.** Feral Goats "cannot be removed or acquired" per INTENT.md, but Penned Up is a 1-night exclusion, not removal. Is penning a Feral Goat allowed? If so, the player effectively gets a "free" NOISY! reduction for one night. This interacts with the fairness-aware shuffle in unintuitive ways.
- **Buying the same animal type multiple times.** Can the player buy 3 Bunnies? 5 Wild Boars? The Trading Post stock management is described as "generate offers from the Sprint 002 pool" but does not specify whether stock is limited per type per visit, unlimited, or one-of-each. INTENT.md's multiplayer section mentions "limited stock" but that is in the shared-market context. For single-player Sprint 002, this needs a decision.
- **Capacity cost at very high values.** The cost curve is 2, 3, 4, 5... Hay. At capacity 10 (5 upgrades), the next upgrade costs 7 Hay. Is there a cap? Can a player upgrade to capacity 20? The layout system only handles 5-8, so either the upgrade should be capped at 8 for Sprint 002 or the layout needs to handle more.

### Definition of Done Completeness

The DoD is comprehensive and well-structured. Issues:

- **"The Night and Trading Post screens look intentionally art-directed"** is subjective and unmeasurable. Who decides? The beauty gates in Phase 4 help, but the DoD should reference specific criteria: "no raw rectangles visible to the player," "all interactive elements have textured backgrounds," etc.
- **"agent-browser screenshots exist for [6 states]"** -- same issue as the Claude draft. This is a manual verification step. Should it be a Playwright test, a manual gate, or both? The draft has a seeded browser-flow Playwright test listed separately, which is good, but the relationship between the Playwright test and the agent-browser proof is unclear.
- **No DoD item for seed determinism.** The verification plan depends on seeds, but the DoD does not require "named seeds produce identical game states across runs." This should be a testable assertion.
- **No DoD item for the fairness-aware shuffle.** If it ships, it needs a DoD criterion. If it does not ship, the draft should say so.
- **Missing: "Capacity upgrade cost is correct at each level."** The cost curve is specified but not explicitly in the DoD as a checkable item.

---

## Comparative Assessment

| Dimension | Claude Draft | Codex Draft | Verdict |
|---|---|---|---|
| Scope realism | More realistic; emoji icons avoid art pipeline | Ambitious; generated pixel art is a large task | Claude is safer to ship |
| Architecture | Direct state mutation, workable but less elegant | Event-driven with `NightEvent[]`, cleaner separation | Codex is better designed |
| Visual ambition | Functional but may look like a prototype | Genuinely aims for beauty | Codex matches the intent better |
| Verification plan | Non-deterministic; relies on random shuffles | Seeded, reproducible, with DOM data attributes | Codex is significantly better |
| Implementation spec detail | Very high; copy-pasteable interfaces and test cases | High-level; more prose, less code | Claude is more implementable |
| BRINGER mechanic | Missing entirely | Included and scoped | Codex is more complete |
| Risk coverage | Good on technical risks, weak on UX risks | Good on technical and aesthetic risks, weak on UX | Both miss "game is boring" risk |
| Art direction fit | Emoji does not match INTENT.md pixel-art goal | Generated textures match the goal but may be hard to execute | Codex fits the vision, Claude fits the timeline |

### Recommendation

The final sprint plan should combine the Codex draft's architecture (event-driven game logic, seeded shuffles, DOM data attributes, BRINGER implementation) with the Claude draft's implementation pragmatism (concrete TypeScript interfaces, phased effort estimates, explicit active-ability deferral). On the visual front, the Codex approach of generated textures is correct for the project's art direction, but the scope should be tightly controlled: start with simple geometric animal silhouettes (not full pixel portraits with idle animations), and treat the atmosphere effects (dust motes, moonlit highlights) as stretch goals rather than requirements. Both drafts should add a "dead Trading Post" mitigation (e.g., a small guaranteed Mischief/Hay stipend even on bust, or a free starting animal in the Trading Post) and explicitly cap barn capacity upgrades at 8 for Sprint 002 to avoid layout edge cases.
