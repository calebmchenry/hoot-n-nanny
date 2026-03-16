# Sprint 002 Draft Critique

This critique evaluates the Codex and Gemini drafts against INTENT.md, CLAUDE.md conventions, the Sprint 002 intent document, and the existing Sprint 001 codebase.

---

## Codex Draft

### Strengths

1. **Event-stream architecture is the standout idea.** Returning `NightEvent[]` from pure rule functions and having scenes consume them as animation cues is an excellent separation of concerns. It makes animation sequencing deterministic, testable, and decoupled from game logic. Neither the Gemini draft nor many game implementations get this right.

2. **Explicit rule lockdowns.** The draft names specific rule decisions (Penned Up = bust-causing animal, NOISY! threshold = 2/3, capacity cost curve = 2,3,4,5...) and commits to them rather than leaving them as open questions. This removes ambiguity that would otherwise slow implementation.

3. **Curated animal roster with strategic rationale.** The animal selection (Barn Cat, Bunny, Hermit Crab, Hen, Draft Pony, Wild Boar, Strutting Peacock, Bard Frog, Bull Moose) is deliberately chosen to exercise flat-income builds, Hay-focused capacity growth, NOISY! mitigation, NOISY! synergies, and BRINGER overcrowd risk. This is a more diverse strategic palette than Gemini's roster.

4. **Beauty as a first-class deliverable.** Phase 4 is dedicated entirely to art and animation, with explicit "beauty gates" that define what done looks like ("if the screen still reads as flat UI blocks with labels, the sprint is not done"). This matches the intent document's emphasis that visual quality is a requirement, not a nice-to-have.

5. **Comprehensive verification plan.** The `agent-browser` proof steps are detailed and specific: named seeds for each showcase state, exact data attributes to wait on, six distinct screenshots covering the full loop. This is the most operationally complete verification plan of the two drafts.

6. **Fairness-aware shuffle.** Addressing the INTENT.md concern about NOISY! clustering with limited rerolls on pathological starting draws shows attention to the product's improvement goals over Party House.

7. **Seedable shuffles with named verification seeds.** Query-param seeds (`?seed=sprint2-warning`) and stable DOM markers (`data-scene`, `data-phase`, `data-noisy-count`, `data-capacity`) make automated verification reproducible. Well thought out.

8. **Scene phases exposed as DOM attributes.** Explicit player-facing states (`ready_to_draw`, `animating_draw`, `player_decision`, `warning`, `bust`, `night_summary`) exposed via `data-phase` on `#game-container` gives Playwright and agent-browser stable wait targets without coupling to Phaser internals.

### Weaknesses

1. **Includes Bull Moose (BRINGER) but underestimates implementation complexity.** BRINGER animals auto-summon random extra animals on entry. This creates recursive draw chains, potential cascade busts, and animation sequencing complexity. The draft acknowledges the risk in the roster rationale but doesn't allocate proportional implementation or testing effort. The BRINGER resolution path isn't specified: does the summoned animal trigger its own on-entry effects? Can a BRINGER summon another BRINGER? This is a significant gap for a sprint that already has ambitious visual goals.

2. **Scope is very large.** The draft proposes: full rules engine, 10 purchasable animals (including synergy and BRINGER types), complete Night scene rewrite, new Trading Post scene, procedural pixel-art generation for every animal, idle animations for every animal, 7 distinct animation types, dynamic layout for 5-8 slots, and comprehensive verification. Phase allocation percentages (25/25/20/20/10) are optimistic — generated pixel-art portraits alone is a multi-day task.

3. **`src/rendering/` directory creates premature structure.** CLAUDE.md says "do not create a new `src/` subdirectory until a second file would go in it." The draft proposes `src/rendering/animalSpriteData.ts`, `src/rendering/textureFactory.ts`, and `src/rendering/animationTokens.ts` — three files, which satisfies the "second file" rule. But `animationTokens.ts` (centralized timings/easings) is really a config concern and could live in `src/config/`. The rendering directory is borderline.

4. **Generated pixel-art animal portraits are high-risk.** Defining "compact pixel masks" for 14 animals and converting them to textures sounds clean on paper, but producing recognizable, charming pixel art procedurally is extremely difficult. The draft acknowledges the approach but doesn't address what happens if the generated portraits look bad — there's no fallback. This is the riskiest single item in the sprint.

5. **No explicit state-passing mechanism between scenes.** The draft describes `GameSession` and `NightState` but doesn't specify how state moves between BarnScene and TradingPostScene. Phaser's `scene.start()` data passing is limited. Gemini addresses this directly with a module-level singleton store.

6. **Night-summary overlay complexity.** The overlay inside BarnScene showing result label, Mischief/Hay earned, Penned Up animal, and action button adds significant UI complexity to an already large scene. The draft doesn't discuss how this overlay interacts with the scene's animation state or how to prevent draw button input while the overlay is visible.

7. **Bard Frog requires accurate NOISY! counting at scoring time.** The draft includes Bard Frog (+2 Mischief per unmitigated NOISY!) but doesn't discuss how "unmitigated" count is tracked through the scoring phase. If a Bunny mitigates one NOISY!, the Bard Frog bonus depends on the net unmitigated count — this interaction needs explicit specification.

8. **The Penned Up mechanic adds session-spanning state.** Tracking which animal is penned and excluding it from the next night's shuffle adds cross-night state that the draft mentions but doesn't detail in the implementation phases. This is additional complexity on top of an already large scope.

### Gaps in Risk Analysis

- **No risk for BRINGER cascade complexity.** Bull Moose is included in the roster but the risk of recursive summoning, cascade busts, and animation sequencing for auto-summoned animals isn't called out.
- **No risk for generated pixel-art quality.** The procedural animal portrait approach is novel and unproven. If the portraits look amateurish, there's no mitigation path described.
- **No risk for scene-transition state loss.** Phaser scene transitions can be fragile; state not passed correctly between BarnScene and TradingPostScene would break the loop.
- **No risk for overlay input conflicts.** The Night summary overlay within BarnScene needs careful input management — draw button shouldn't be tappable through the overlay.

### Missing Edge Cases

- **Empty deck draw.** What happens when the player draws every card in their herd without busting? The draft doesn't specify auto-scoring on deck exhaustion.
- **BRINGER summoning from empty deck.** If Bull Moose's BRINGER effect tries to admit a random animal but the deck is empty, what happens?
- **Negative Hay penalty.** INTENT.md specifies -7 Mischief per unpaid Hay animal. The draft's scoring section doesn't mention this penalty.
- **Multiple Bunnies.** If a player has two Bunnies, do they each mitigate one NOISY!? The INTENT.md implies yes (Bunny "cancels NOISY! from one animal"), but the draft doesn't confirm.
- **Capacity exactly reached.** The draft says "exceeds capacity" triggers bust, but doesn't explicitly confirm that exactly meeting capacity is safe.
- **Zero-animal night.** Can a player Call It a Night without drawing any animals? If so, they score 0 safely — is this intended?

### Definition of Done Completeness

The DoD is comprehensive and covers: real game state, two full loops, correct starting herd, 8+ purchasable animals, both bust conditions, warning state, passive effects, Trading Post purchases, visual quality, animations, verification markers, agent-browser screenshots, unit tests, Playwright, CI, and bundle budget.

**Gaps:**
- No criterion for Penned Up mechanic working correctly, despite being specified in the architecture.
- No criterion for BRINGER animals resolving correctly.
- No criterion for seedable shuffle determinism (it's in the architecture and verification but not the DoD).
- "At least 8 purchasable animals" is ambiguous — the roster section proposes 10. Which is the commitment?

---

## Gemini Draft

### Strengths

1. **State machine is correctly identified as the hard part.** The opening architectural insight — "the game state machine is the hard part, not the visuals" — is exactly right. This correctly prioritizes where implementation risk lives and focuses the architecture accordingly.

2. **Explicit state machine with named phases.** The `IDLE -> DRAWING -> (BUST | SCORING) -> NIGHT_SUMMARY -> SHOPPING -> IDLE` FSM is clearly defined. Each state has a concrete meaning and the transitions are enumerated. This is more explicit than the Codex draft's event-stream model (which is more flexible but less constrained).

3. **Module-level singleton store for cross-scene state.** The `gameStore.ts` proposal directly solves the scene-data-passing problem that the Codex draft ignores. A simple module-level singleton is the right complexity level — no EventEmitter, no reactivity, just read/write. The rationale for rejecting reactivity ("YAGNI") is sound.

4. **Emoji card rendering is pragmatic and honest.** Using emoji glyphs for animal portraits is a bold but defensible choice. The rationale is solid: zero asset weight, zero licensing, native rendering on mobile, and surprisingly readable at 32-40px on an 88px card. The draft also defines an upgrade path (`CardRenderer` interface with `EmojiCardRenderer` now, `SpriteCardRenderer` later).

5. **Shop animal roster with strategic analysis.** The 8-animal roster is curated with explicit strategic roles (defense, economy, risk, synergy). Each animal has a reason for inclusion and a parenthetical explaining the strategic niche it fills. This is well-reasoned.

6. **Handles edge cases that other drafts miss.** Deck exhaustion (auto-score), Bunny + Honey Bee stacking (4 NOISY! + 2 mitigators = 2 unmitigated = safe), and negative Hay penalty (-7 Mischief per unpaid) are all addressed. The "safety valve" for empty-deck-while-DRAWING is a good defensive measure.

7. **Tween/animation conflict risk is identified.** The risk table calls out "rapid tapping during animation" and proposes disabling the draw button during card animation (200ms). This is a real UX bug that many game implementations miss.

8. **Open questions are answered, not just asked.** Each open question includes a "Proposed answer" with reasoning. This is much more useful than leaving questions hanging — it gives the implementer a decision to validate rather than a decision to make from scratch.

### Weaknesses

1. **Emoji rendering is a gamble on visual quality.** The intent document says "classic pixel art, 16-bit era aesthetic (think Stardew Valley meets early Game Boy Color)." Emoji glyphs are inherently platform-dependent — a cat emoji on iOS looks nothing like one on Android or Chrome on Linux. The "beautiful" requirement in the sprint intent is hard to satisfy with emoji, which the user has no control over. The fallback ("single-letter abbreviations in colored circles") would be a significant visual downgrade.

2. **Google Font from CDN violates CLAUDE.md and the Codex draft's security stance.** CLAUDE.md says nothing about CDN fonts, but the Codex draft and the sprint intent both emphasize "no third-party CDN fetches at runtime." The Gemini draft proposes loading Press Start 2P from `fonts.googleapis.com`. This is a network dependency for a static game that should work offline. The fallback to Courier New is acceptable but visually mediocre.

3. **No seedable shuffle.** The `deck.ts` module uses Fisher-Yates but the draft never mentions seed support. The sprint intent document requires deterministic seeds for `agent-browser` verification. Without seedable shuffles, the verification plan ("Manual verification via `agent-browser`: take screenshots at each key game state") is non-reproducible and unreliable.

4. **No DOM verification markers.** The draft mentions keeping `__GAME_READY__` but adds no `data-scene`, `data-phase`, or `data-noisy-count` attributes. This means Playwright and agent-browser tests have to rely on visual inspection or fragile internal state queries rather than stable DOM hooks.

5. **Excludes Penned Up mechanic entirely.** The draft proposes deferring Penned Up to Sprint 003 ("a bust simply scores zero"). INTENT.md lists Penned Up as a core mechanic — "one animal is Penned Up (banned from next Night) if a bust occurred." Deferring it simplifies the sprint but creates a gap between the sprint deliverable and the product intent. This is a defensible scope cut, but should be acknowledged as a deliberate deviation from the rules spec.

6. **Excludes BRINGER animals entirely.** The draft proposes excluding Bull Moose and Parade Llama. This is actually a more conservative and arguably wiser scope decision than Codex's inclusion of Bull Moose, but it means the sprint doesn't exercise the overcrowd bust condition through its most interesting trigger. The only way to bust from overcrowding in Gemini's version is to have a barn capacity of 5 and draw 6 animals — which requires 10 animals in the starting herd. With the default 10-card starting herd and 5 capacity, this is only possible by drawing all 10. This makes the overcrowd bust nearly impossible to reach naturally without buying lots of animals first.

7. **Milkmaid Goat and Honey Bee deviate from INTENT.md stats.** The draft lists Milkmaid Goat at +4 Mischief, -1 Hay, cost 5 — this matches INTENT.md. But Honey Bee is listed at cost 7 with +2 Mischief — INTENT.md says cost 7, +2 Mischief. That actually matches. However, the draft invents "Milkmaid Goat" as a name when INTENT.md calls it "Milkmaid (Goat)" — minor but worth noting for data fidelity.

8. **Phase allocation is heavily back-loaded.** Testing and verification get only 5% of the sprint. Given the complexity of the state machine (which the draft correctly identifies as the hard part), 5% for testing is dangerously low. The Codex draft allocates 10% and front-loads test writing in Phase 1 alongside the rules engine, which is a better approach.

9. **Button label changes are confusing.** The draft proposes the button changing from "DRAW ANIMAL" to "KEEP GOING" with a separate "CALL IT A NIGHT" button appearing. But it also says "the draw button changes label after first draw" in UC-6. The Phase 2 implementation then describes a dual-button layout. The intended behavior is specified in three different places with slightly different descriptions.

10. **No animation for Trading Post purchases.** Phase 5 lists animations for the Barn scene but nothing for Trading Post interactions. Buying an animal should have some feedback beyond opacity changes.

### Gaps in Risk Analysis

- **No risk for emoji cross-platform inconsistency.** This is the draft's most distinctive visual choice but it's listed as medium-likelihood, medium-impact. On a game where beauty is a deliverable, platform-dependent rendering inconsistency is arguably high-impact.
- **No risk for missing seedable shuffle.** Without seeds, the entire verification strategy falls apart, but this gap isn't identified.
- **No risk for "Call It a Night" on first draw or zero draws.** If a player can stop immediately, the economy breaks (free Trading Post access with zero risk).
- **No risk for scope underestimation on state machine complexity.** The draft says the state machine is the hard part but allocates only 15% to it (Phase 1).

### Missing Edge Cases

- **Zero-draw night.** Can the player Call It a Night before drawing anything? The dual-button UI appears "after first draw," which implies no — but this isn't stated as a rule.
- **Multiple purchases of the same animal.** Stock limits are mentioned ("2-3 copies per game") but the tracking mechanism isn't specified. Are stocks per-night or per-game?
- **Herd growth and shuffle time.** As the player buys animals, the herd grows. With 20+ animals, shuffle becomes a larger array but this is trivially fast — not really an issue, just unmentioned.
- **Capacity 9+ slot layout.** The draft says "for 9+, compress slot size slightly (72x72)." But on a 390px-wide canvas with 3 columns of 72px cards, that's 216px of cards plus gaps. What about 4 columns? The layout algorithm for high capacities isn't thought through.
- **Bust animal identity.** On bust, the Gemini draft doesn't track which animal caused the bust. If Penned Up is added later, this information needs to be retroactively available.
- **Trading Post with zero resources.** What does the player see if they bust (0 Mischief, 0 Hay)? Can they still enter the Trading Post? The draft shows the transition but doesn't discuss the "nothing affordable" state.

### Definition of Done Completeness

The DoD has 11 items covering: playable loop, both bust conditions, warning state, NOISY! mitigation, starting herd, 8 purchasable animals, two currencies, visual quality, unit tests, CI, and no regressions.

**Gaps:**
- No criterion for deterministic/seedable verification (seeds aren't in the draft at all).
- No criterion for agent-browser screenshots (mentioned in Phase 6 as "manual verification" but not in DoD).
- No criterion for animation quality (DoD #8 says "draw animations are smooth" but doesn't mention bust, warning, or purchase animations).
- No criterion for scene data attributes or verification hooks.
- No criterion for the Trading Post being visually polished (DoD #8 only mentions barn-related visuals).
- "Screenshots prove this" in DoD #8 is vague — Codex's named seeds and specific screenshot scenarios are much more concrete.

---

## Head-to-Head Comparison

| Dimension | Codex | Gemini |
|-----------|-------|--------|
| **Architecture quality** | Event-stream model is more sophisticated and better for animation sequencing | State machine FSM is simpler and equally correct for core logic |
| **Scope ambition** | Higher — 10 animals, BRINGERs, pixel-art generation, Penned Up | Lower — 8 animals, no BRINGERs, emoji rendering, no Penned Up |
| **Scope risk** | Significantly higher — multiple unproven technical approaches | Lower — pragmatic choices reduce implementation risk |
| **Visual approach** | Generated pixel-art portraits (high quality ceiling, high risk) | Emoji glyphs (low effort, inconsistent quality, low risk) |
| **State passing** | Unspecified | Module-level singleton (correct, simple) |
| **Verification** | Comprehensive: named seeds, DOM markers, 6 specific screenshots | Minimal: manual verification, no seeds, no DOM markers |
| **Testing strategy** | Tests written alongside rules in Phase 1 | Tests deferred to Phase 6 (5% allocation) |
| **Edge case coverage** | Misses deck exhaustion, negative Hay penalty | Covers deck exhaustion, negative Hay, Bunny stacking |
| **CLAUDE.md compliance** | Strong — no CDN, no external assets | Weak — proposes Google Font CDN load |
| **Penned Up** | Included | Deferred |
| **BRINGER** | Included (underspecified) | Excluded (defensible) |

---

## Recommendations for the Final Sprint Document

1. **Use the Codex event-stream architecture with the Gemini state machine.** The FSM defines *what phase the game is in*; the event stream defines *what just happened and what to animate*. These are complementary, not competing.

2. **Use the Gemini module-level singleton for cross-scene state.** This is a solved problem — don't leave it unspecified.

3. **Exclude BRINGERs (Gemini's call).** Bull Moose adds disproportionate complexity for Sprint 002. Include it in the roster data as deferred.

4. **Include Penned Up (Codex's call).** It's a core INTENT.md mechanic and relatively simple: track one animal ID, exclude it from the next shuffle, show a reminder in the UI.

5. **Neither visual approach is right.** Emoji is too platform-dependent for a "beautiful" deliverable. Generated pixel masks are too risky for a single sprint. The best approach is procedural card rendering using Phaser Graphics shapes (borders, backgrounds, badges) with styled text for animal identity — NOT emoji, NOT pixel-mask portraits. Animal identity comes from name + color scheme + simple icon shapes (triangles, circles, squares as abstract silhouettes). A sprite art pass can come later.

6. **Require seedable shuffles (Codex's approach).** Without seeds, agent-browser verification is non-reproducible. This is non-negotiable.

7. **Require DOM verification markers (Codex's approach).** `data-scene`, `data-phase`, and `data-noisy-count` attributes are cheap to add and make all automated testing dramatically more reliable.

8. **Front-load tests (Codex's approach).** Write tests alongside the rules engine in Phase 1, not as a 5% afterthought.

9. **No Google Font CDN.** Use Phaser's built-in text rendering or a single small local bitmap font if needed. No runtime network dependencies.

10. **Specify all edge cases explicitly.** The final document should lock down: deck exhaustion (auto-score), zero-draw night (disallowed — Call It a Night appears only after first draw), negative Hay penalty (-7 Mischief per unpaid), multiple Bunnies (each mitigates one NOISY!), capacity exactly met (safe), and Trading Post after bust (allowed, 0 resources).
