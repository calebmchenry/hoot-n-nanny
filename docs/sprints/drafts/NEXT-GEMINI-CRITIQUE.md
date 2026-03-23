# NEXT-GEMINI-CRITIQUE

## Review: NEXT-CLAUDE-DRAFT (Sprint 003)

### Strengths
- **CSS-First Specificity:** Provides a highly detailed and concrete plan for CSS animations, including specific keyframes (`bounce-in`, `count-pulse`, `slide-in-up`), easings (`steps()`), and custom properties (`--slot-index` for staggering).
- **Clear Tone Targets:** Provides excellent concrete examples of the desired copy (e.g., the Goat, the Dragon, power flavor text), setting a very clear bar for the "goofy, warm, scrappy" tone.
- **Micro-interactions:** Identifies great opportunities for subtle juice, like the idle bob in the barn, button press feedback, and the screen shake on bust.

### Weaknesses
- **Engine Purity Violation:** Proposes adding `transitionPhase` and `setTimeout` orchestration directly into the `App.tsx` reducer / game engine. This tightly couples presentation timing to the core game logic, violating the principle of keeping the engine pure and synchronous.
- **Tally Animation Naivety:** Plans to animate the scoring tally but fails to recognize that the current engine outputs a `resolutionLog` of pre-formatted strings. Animating based on parsed strings is fragile and limits the quality of the tally sequence.

### Gaps in Risk Analysis
- **Unskippable Animations:** Fails to identify the risk of player fatigue from repetitive animations. There is no mention of allowing the user to click/tap to skip the tally or phase transitions.

### Missing Edge Cases
- How do animations behave if the player clicks rapidly (e.g., buying multiple animals fast)? The draft mentions a wiggle and counter pulse, but rapid clicks might restart or glitch CSS animations if not handled carefully.

### Definition of Done Completeness
- Strong on visual and tonal requirements.
- Missing usability requirements (skipping, keyboard navigation during transitions).
- Does not mandate copy exhaustiveness testing.

---

## Review: NEXT-CODEX-DRAFT (Sprint 003)

### Strengths
- **Structural Fixes:** Correctly identifies the flaw in the current `resolutionLog` and proposes a necessary data-model refactor to `ResolutionEvent[]`. This is critical for building a robust, skippable tally animation.
- **Strict Architectural Boundaries:** Explicitly forbids leaking presentation state into the engine. Mandates that motion stays local and lightweight.
- **Usability Focus:** Strictly requires that all non-trivial sequences (like the summary tally) be skippable by click, tap, or Enter, directly addressing player fatigue.
- **Robustness:** Recommends adding exhaustiveness tests for copy to ensure new animals or powers don't ship with missing flavor text.

### Weaknesses
- **Vague Motion Implementation:** The proposed `PhaseTransitionCurtain` and local `useEffect` timers are less concrete than Claude's CSS plan. Implementing exit animations in React without a library is notoriously tricky because components unmount instantly when state changes; Codex waves this away by suggesting a "curtain", which might look cheaper than true choreographed exit/enter animations.
- **Over-fragmentation:** Proposing three separate copy files (`animalCopy.ts`, `powerCopy.ts`, `uiCopy.ts`) for a game this small might be over-engineering compared to a single centralized file.

### Gaps in Risk Analysis
- **React Unmount Races:** Does not deeply address the technical challenge of animating a component *out* when the underlying Redux/useReducer state has already moved to the next phase.

### Missing Edge Cases
- If the summary tally is skipped, how does the UI ensure all state (animated counters, log visibility) instantly jumps to the final correct values without intermediate glitches?

### Definition of Done Completeness
- Excellent. Covers structural code quality, usability (skip/reduced-motion), and explicitly includes Playwright spec updates for the new UI flows.

---

## Recommendations for Final Merged Sprint

The final Sprint 003 plan should synthesize the architectural rigor of Codex with the visual specificity of Claude.

1. **Adopt Codex's Engine Refactor:** You **must** change `NightSummary` to output structured `ResolutionEvent[]` instead of string logs. Do not attempt to animate the tally by parsing strings.
2. **Keep the Engine Pure (Codex rule, Claude implementation):** Do not put `transitionPhase` in the game engine reducer. Instead, manage transitions in a local UI state machine in `App.tsx`. When the engine says the phase is `shop`, `App.tsx` should hold onto the `summary` UI, trigger the exit animation via CSS `data-transition`, wait for the CSS duration via a local timeout, and *then* render the `shop` UI.
3. **Mandate Skippable Animations:** All phase transitions and the night summary tally must be skippable by click, tap, or Enter. This is non-negotiable for a snappy game loop.
4. **Use Claude's CSS-First Techniques:** Utilize `data-transition` attributes, CSS custom properties (`--slot-index`) for staggering, and `steps()` easing for the retro feel.
5. **Implement Copy Exhaustiveness Tests:** Adopt Codex's idea for a test that fails if any enum value lacks corresponding flavor text. This guarantees the personality pass doesn't degrade over time.
6. **Centralize Copy Moderately:** A single `src/ui/copy.ts` (Claude's approach) is fine, but organize it strictly by domain (Animals, Powers, UI) to get the benefits of Codex's structure without the file sprawl.