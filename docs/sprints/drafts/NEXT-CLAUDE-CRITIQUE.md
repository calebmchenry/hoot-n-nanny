# Sprint 003 Draft Critique

## Claude Draft — "Personality & Polish"

### Strengths

1. **Exceptional specificity.** Every animation is described with exact keyframe names, durations, easing functions, and CSS implementation details. This leaves almost zero ambiguity for execution — an implementer could build directly from this doc without guessing intent.

2. **CSS-first architecture is the right call.** The principle of CSS-driven animation with JS only orchestrating *when* classes apply is perfectly matched to the project's "lightweight frontend" constraint from INTENT.md. The `--slot-index` custom property pattern for staggered delays is elegant and avoids JS timer sprawl.

3. **`transitionPhase` state design is well-thought-out.** Adding an intermediate state to `GameState` for phase transitions gives CSS clean hooks via `data-transition` attributes. The explicit enumeration of transition values (`exiting-night`, `entering-summary`, etc.) makes the state machine legible.

4. **Copy-as-data separation.** Moving all UI strings into `src/ui/copy.ts` is a strong architectural choice — it keeps personality editable without touching rendering logic and makes a future i18n pass trivial.

5. **Comprehensive file manifest.** The "Files Summary" section with new/modified/untouched tables is production-grade project management. Listing untouched files with reasons shows the author considered blast radius.

6. **Risk table is concrete and actionable.** Each risk has a specific mitigation, not hand-waving. The "disable input during transitions" mitigation for timing races is exactly right.

7. **Definition of Done is thorough** — 23 discrete checkboxes covering personality, animation, and quality. The `prefers-reduced-motion` and bundle size requirements show mature engineering thinking.

### Weaknesses

1. **setTimeout-based transition orchestration is fragile.** The reducer sets `transitionPhase`, then uses `setTimeout(350ms)` to advance state. This creates implicit timing coupling between JS and CSS. If CSS animation duration changes, the JS timeout must change in lockstep. A more robust approach: listen for `transitionend`/`animationend` events to advance state, with a timeout as a *fallback* rather than the primary mechanism.

2. **Phase 5 (Humor) is underspecified relative to Phases 1-4.** The animation phases describe exact keyframe names, durations, and CSS patterns. Phase 5 gives example copy but no process for writing/reviewing 19 animal descriptions + 12 power quips + all UI strings. That's a significant creative writing task that could easily bottleneck or produce inconsistent tone without a review pass.

3. **The `copy.ts` example mixes concerns.** It contains both static strings (`shopTitle: 'The Trading Post'`) and randomized arrays (`bustQuips: [...]`). The randomization logic (which quip to pick) isn't specified — does the component call `Math.random()`? Use the game's seeded RNG? This matters for test determinism and replay consistency.

4. **No mention of accessibility beyond `prefers-reduced-motion`.** Animated tally counters, staggered reveals, and typewriter effects can be problematic for screen readers. The DoD should include ensuring ARIA live regions announce final values, not intermediate animation states.

5. **Win screen confetti is over-scoped for CSS-only.** "Multiple animated pseudo-elements with random rotation and fall" using only CSS is achievable but fiddly. Pseudo-elements are limited to `::before`/`::after` (2 per element), so "3-4 ribbons" requires dedicated empty elements or stacking on different containers. This feels like it could eat disproportionate time for a decorative effect.

6. **No estimated time or sprint duration.** The phases have percentage breakdowns but no absolute time estimates. Without a timebox, this sprint could easily expand — especially given the creative writing component.

### Gaps in Risk Analysis

- **No risk for test flakiness from animation timing.** E2E tests (`shop-and-win.spec.ts`) interact with UI elements that will now animate in with delays. If Playwright clicks before an entrance animation completes, tests will fail intermittently. Mitigation: ensure test selectors wait for animation completion, or disable animations in test environment via a CSS class or `prefers-reduced-motion`.

- **No risk for the `transitionPhase` blocking user input.** The mitigation says "all intents are no-ops during transitions" — but this means rapid clicking during a 700ms transition window silently drops user actions. If a player clicks quickly, they'll perceive the UI as unresponsive. Consider queuing the last intent instead of dropping all.

- **No risk for catalog.ts description length variance.** Some animal descriptions may be 10 words, others 40. Long descriptions could overflow the inspector panel, especially on smaller viewports. Needs a max-length guideline or CSS truncation strategy.

### Missing Edge Cases

- **What happens to animations when the game is backgrounded?** `requestAnimationFrame` pauses when the tab is hidden. If a player switches tabs during the scoring tally, they'll return to a partially-animated state. The counter should snap to final values on visibility change.
- **Rapid phase transitions.** If a player completes a night quickly and clicks through summary fast, multiple `setTimeout` chains could overlap. Need to cancel pending timeouts when a new transition starts.
- **Initial game start.** The draft covers night→summary→shop→night transitions but doesn't mention the very first barn appearance when the game begins. Should Night 1 have an entrance animation?

### Definition of Done Completeness

Strong overall. Missing items:
- No checkbox for screen reader / ARIA compatibility of animated content
- No checkbox for "animations disabled in test environment" or "E2E tests remain non-flaky with animations enabled"
- No checkbox for verifying animation behavior on page visibility change
- The "non-developer reads copy as funny or charming" criterion (last personality checkbox) is subjective and untestable — consider replacing with "copy reviewed by at least one non-author"

---

## Gemini Draft — "Personality & Polish"

### Strengths

1. **Clear, concise structure.** The draft is readable and well-organized. Someone unfamiliar with the project could understand the scope in under 2 minutes.

2. **Correct architectural instinct.** Identifying the three layers (data, component, styling) and calling out the "no heavy animation libraries" constraint shows alignment with project values.

3. **Risks are realistic.** "Scope creep on polish" is the #1 actual risk for this kind of sprint. "Layout breakage from new text" is practical and often overlooked. "Hardware-accelerated CSS properties" as the perf mitigation is correct.

4. **Appropriate conservatism on scope.** The draft doesn't overreach — three phases, clear deliverables, no speculative features.

### Weaknesses

1. **Severely underspecified.** This reads as a high-level outline, not an implementation plan. Compare: Claude's draft specifies `animation: bounce-in 300ms steps(4, end)` with `--slot-index` custom properties. Gemini's draft says "a satisfying 'pop' or 'drop-in' keyframe animation." An implementer would need to make dozens of design decisions that should be made upfront.

2. **Incorrect file references.** The draft proposes animating animals via `AnimalSprite.tsx`, but `AnimalSprite.tsx` renders SVG sprite graphics. Animation should happen at the *slot* level (`BarnGrid.tsx`), not the sprite level — you animate the container, not the SVG. The Claude draft gets this right.

3. **Missing `transitionPhase` or equivalent mechanism.** Phase transitions are mentioned ("smooth out harsh cuts with CSS fade-ins and fade-outs") but there's no architectural plan for *how*. Where does the intermediate state live? How does the app know it's in a transition? Without this, implementation will be ad-hoc — likely scattered `setTimeout` calls in components instead of a centralized state machine.

4. **Type modifications are unnecessary.** Adding `flavorText` and `wittyDescription` fields to the `Animal` and `Power` types adds fields to the game state that flow through the engine. Flavor text is presentation, not game logic. The Claude draft's approach (enriching `description` in `catalog.ts` and creating a separate `copy.ts`) keeps the type system clean.

5. **No centralized copy strategy.** UI strings (phase titles, button labels, quips) aren't addressed. The draft only covers animal/power descriptions, missing the broader personality pass across all UI surfaces — night start quips, bust messages, shop banter, targeting overlay headers, win screen text.

6. **Definition of Done is too coarse.** 7 items vs. Claude's 23. Missing:
   - `prefers-reduced-motion` support
   - Bundle size constraint
   - Specific animation types (idle bob, bust shake, sold-out transition, etc.)
   - Win screen animations
   - Existing tests still passing
   - No layout shift from animations

7. **No file manifest of untouched files.** Without explicitly listing what *won't* change, there's a risk of scope creep into unrelated files.

### Gaps in Risk Analysis

- **No risk for animation/game-logic timing conflicts.** This is arguably the biggest technical risk of the sprint (user input during transitions, setTimeout races) and it's completely absent.
- **No risk for test breakage.** Animations change how elements appear and when they're interactive. Existing E2E tests will be affected.
- **No risk for tone inconsistency.** Writing 19+ unique personality descriptions is a creative task where quality can vary wildly. No mention of tone guidelines, review process, or examples to anchor the voice.
- **No risk for `prefers-reduced-motion` compliance.** Accessibility is unmentioned.

### Missing Edge Cases

- Everything listed for the Claude draft, plus:
- **Shop card overflow.** If flavor text is long, shop cards could grow taller than their container. No mention of text truncation or card height strategy.
- **Inspector panel with no selection.** What does the inspector show when nothing is selected? The Claude draft specifies empty-state copy; Gemini's doesn't.
- **Bust animation timing.** What if a bust occurs mid-animation (e.g., a rowdy animal triggers a chain that busts)? No mention of interrupting in-progress animations.

### Definition of Done Completeness

Insufficient for execution. The 7 items are all necessary but far from sufficient. A sprint executed against this DoD could pass all checks while missing: idle animations, bust effects, phase transition choreography, win screen polish, button press feedback, accessibility, test stability, and bundle size control.

---

## Recommendations for the Final Merged Sprint

1. **Use Claude's draft as the structural foundation.** Its phase breakdown, file manifest, transition architecture, and DoD are implementation-ready. Gemini's draft doesn't add architectural ideas that Claude's misses.

2. **Incorporate Gemini's risk awareness around scope creep.** Add an explicit timebox to the sprint (e.g., "if animation tweaking exceeds 2 hours on any single element, ship what works and move on"). Claude's draft is ambitious — 6 phases with detailed specs could balloon without discipline.

3. **Replace `setTimeout` orchestration with `animationend` events + timeout fallback.** This is the biggest technical gap in both drafts. The transition system should listen for CSS animation completion rather than guessing durations in JS. Keep a timeout as a safety net (e.g., 1000ms max) so a missed event doesn't freeze the game.

4. **Specify RNG strategy for randomized copy.** Should quip selection use the game's seeded RNG (deterministic for replays/testing) or `Math.random()` (true randomness for flavor)? Recommend seeded RNG for testability, with the seed advancing on each quip selection.

5. **Add a test environment animation strategy.** Either: (a) set `prefers-reduced-motion: reduce` in Playwright's browser context, making all animations instant, or (b) add a `data-test` attribute that CSS uses to skip animations. This must be in the DoD.

6. **Add accessibility checkboxes to DoD:**
   - Animated counters announce final values via `aria-live` regions
   - `prefers-reduced-motion` disables decorative motion (keep functional transitions, make them instant)
   - Focus management isn't broken by animation delays

7. **Cap description lengths.** Add a guideline: animal descriptions ≤ 120 characters, power quips ≤ 80 characters. This prevents inspector panel overflow and keeps the tone punchy.

8. **Scope the win screen confetti pragmatically.** CSS-only confetti with pseudo-elements is fragile and time-consuming. Consider: a simple "3 ribbons bounce in with stagger + victory text types in" as the core win animation, with confetti as a stretch goal. The win screen already works — don't let decoration block the sprint.

9. **Add a "first night" entrance note.** Both drafts cover ongoing transitions but not the initial game start. Night 1 should have a brief barn entrance animation to set the tone immediately.

10. **Keep Gemini's layout breakage risk** and add a concrete mitigation: test all text-bearing components at 320px viewport width, verify no overflow or layout shift.
