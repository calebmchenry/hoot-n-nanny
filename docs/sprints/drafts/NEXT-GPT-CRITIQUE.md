# Sprint 003 Draft Critique

This review compares `NEXT-CODEX-DRAFT.md` and `NEXT-GEMINI-DRAFT.md` against the current repo state and the selected Sprint 003 scope. Three current realities matter when judging both drafts: `src/game/catalog.ts` still mixes mechanics and player-facing prose, `src/game/types.ts` / `src/game/engine.ts` still expose summary data as `resolutionLog: string[]`, and Playwright coverage is still very thin. A good sprint draft needs to address those facts directly, not describe polish work at a distance.

## NEXT-CODEX-DRAFT

### Strengths

- This is the stronger draft by a wide margin because it identifies the actual structural bottlenecks in the current codebase: copy living in `catalog.ts`, summary UI depending on finished strings, and phase polish needing app-level coordination.
- The separation between mechanics data, authored copy, and presentation is well argued. Moving prose out of `catalog.ts` is the right long-term direction for maintainability and tone iteration.
- Replacing `resolutionLog: string[]` with structured summary events is the most important architectural insight in either draft. Without that change, a convincing tally animation and better summary presentation stay fragile.
- The product rules are useful guardrails. Keeping primary labels literal while moving personality into supporting copy protects readability and keeps the sprint from becoming “jokes over usability.”
- The implementation phases are specific, ordered, and grounded in real files that already exist in the repo.
- Exit criteria, Definition of Done, explicit test commands, bundle-budget enforcement, and reduced-motion requirements make the draft much more executable than the Gemini version.

### Weaknesses

- The scope is aggressive for a single polish sprint. It includes a copy architecture refactor, an engine summary-model refactor, new shared motion infrastructure, multiple component passes, and new browser coverage.
- Some choices are prescribed earlier than necessary. `PhaseTransitionCurtain.tsx`, exact duration bands, and a single large `uiCopy.ts` file may be good solutions, but the draft treats them as settled before implementation proves they are the lightest workable approach.
- `uiCopy.ts` risks becoming a new dumping ground unless the final sprint doc defines how it will be organized by surface or feature.
- The draft names `ResolutionEvent` kinds, but it does not fully define the payload contract. The final merged sprint should lock down the event schema so the engine and UI do not thrash on shape changes mid-sprint.
- The migration path is implied rather than explicit. The draft should say when `description`, `title`, and other current string fields are removed so the repo does not temporarily carry two competing sources of truth.

### Gaps In Risk Analysis

- It does not explicitly call out input-race risk during skippable sequences. The combination of click, tap, Enter, and transition timing can easily create double-continue or skipped-focus bugs.
- It mentions focus and reduced motion, but not screen reader behavior. Animated tally reveals and staged event output can become noisy or misleading if `aria-live` behavior is not defined.
- It covers responsiveness in general, but not copy-length risk in narrow layouts. This sprint adds more authored text to inspectors, overlays, and summary surfaces; overflow and truncation deserve direct mention.
- It does not explicitly call out regression risk for seeded flows and existing tests. Summary-model changes touch the engine, win flow, and shop handoff at once.

### Missing Edge Cases

- Bust flow with a pinned animal and no meaningful score events.
- Score-to-win flow where the player skips the tally immediately and lands on the win screen without broken focus or dead clicks.
- `Rowdy` causing multiple barn entries in one update.
- `Stacks` increasing badge count on an existing slot instead of creating a new visible resident.
- Empty target lists in `TargetingOverlay` after a power is triggered.
- Rapid repeated click / tap / Enter during tally skip and during scene transitions.
- Long flavor text or rules text on mobile-width inspector and shop layouts.

### Definition Of Done Completeness

- The DoD is mostly strong and substantially more testable than the Gemini draft.
- It should explicitly require exhaustive coverage for powers, targeting prompts, outcome headings, and other UI copy, not only “every animal.”
- It should explicitly require a single source of truth for authored prose. Otherwise the sprint could technically pass while stale copy remains in `catalog.ts`.
- It should explicitly require responsive verification for the newly text-heavy surfaces.
- It should explicitly require that skip behavior works the same from mouse, keyboard, and touch without duplicate intent dispatches.

## NEXT-GEMINI-DRAFT

### Strengths

- The draft is concise and easy to read.
- It keeps the sprint framed as a lightweight content-and-polish pass rather than a wholesale systems rewrite.
- Its scope-creep, layout-breakage, and animation-performance risks are real and worth keeping in the merged draft.
- The CSS-first stance is correct and aligns with the repo constraints.

### Weaknesses

- It is too generic and underspecified to steer implementation in this repo. The current codebase problems are not just “add flavor text” and “add animations”; they are specifically about where data lives and how summary data is modeled.
- The proposed data-model change does not match the current code. There is no existing `Animal` / `Power` type split to extend the way the draft describes; the repo currently uses `AnimalDefinition.description` inside `src/game/catalog.ts`.
- By adding more prose directly into `catalog.ts`, the draft reinforces the current coupling instead of fixing it.
- It asks for tally animation but never addresses the current `resolutionLog: string[]` limitation. That leaves the UI either parsing strings or inventing animation behavior without structured facts.
- The phase plan is too shallow. There are no exit criteria, no sequencing for engine versus UI changes, and no concrete testing requirements.
- The file summary misses several real surfaces that need work, including `src/app/App.tsx`, `src/ui/TargetingOverlay.tsx`, `src/ui/TradingPostScreen.tsx`, `src/ui/BarnGrid.tsx`, and test files.
- Animating `src/ui/StatusBar.tsx` is not clearly justified. Those counters are the authoritative live values across phases, and the draft does not explain why they should animate or how to avoid confusion.
- The draft covers some copy surfaces, but it does not address idle inspector text, targeting prompts, summary headings, shop helper text, or win-screen tone.

### Gaps In Risk Analysis

- There is no accessibility risk analysis for reduced motion, focus management, or hover-only affordances.
- There is no risk analysis for dead time or skip behavior in longer sequences like tally reveals or phase transitions.
- There is no risk analysis for mechanics clarity. “Witty” copy can obscure rules if the sprint does not force a literal rules layer.
- There is no regression-risk discussion for engine changes, seeded paths, or browser-level interactions.
- There is no risk analysis for keyboard-heavy shop navigation, which is already present in `TradingPostScreen.tsx`.

### Missing Edge Cases

- Reduced-motion users who should see the same information immediately.
- Mouse, keyboard, and touch parity for skipping summary or using phase transitions.
- Sold-out and unaffordable states while hover, focus, and press affordances are added.
- Full-barn cases where unused activate abilities should still be advertised.
- Bust-to-shop versus score-to-shop versus score-to-win variants.
- `Rowdy`, `Stacks`, and empty-target cases.
- Play-again reset after new animation layers are added.
- Copy overflow on smaller screens.

### Definition Of Done Completeness

- The DoD is too high-level to reliably close the sprint.
- It does not require tests, explicit verification commands, or browser coverage.
- It does not require reduced-motion support, skip behavior, focus recovery, or touch parity.
- It does not require centralized or exhaustive copy coverage, so placeholder or duplicated text could survive.
- It does not define completion for the current summary-data limitation, which is the main blocker for good tally presentation.

## Recommendations For The Final Merged Sprint

- Use the Codex draft as the base document. It is materially closer to the repo’s real constraints and already contains the right implementation spine.
- Keep Gemini’s timeboxing instinct. The final sprint should explicitly say that polish tuning stops once the defined interactions feel intentional, readable, and test-covered.
- Make these items non-negotiable in the merged version: copy separated from `catalog.ts`, structured night-summary data instead of UI-authored string parsing, reduced-motion support, and explicit browser-level verification.
- Tighten the data contract for `ResolutionEvent` before implementation starts. The final doc should define the payload shape, ordering rules, and which layer owns final wording.
- Expand the acceptance criteria to cover the real edge-case matrix: bust plus pinned guest, score-to-win skip path, `Rowdy` multi-entry, `Stacks` badge growth, empty targeting lists, sold-out and unaffordable shop cards, long copy on mobile, and play-again reset after animated flows.
- Add an explicit accessibility clause: no hover-only information, focus restored after every phase change, skip actions available from click, tap, and Enter, and animated summary output that does not create confusing screen-reader chatter.
- Add a migration rule: once centralized copy files are in place, remove or neutralize old prose fields so the sprint ends with one source of truth instead of duplicated text.
- Keep the final scope disciplined. Do not add audio, new libraries, sprite replacement, balance work, or broad layout redesign under the label of “polish.”

Bottom line: the final merged sprint should be “Codex architecture and QA rigor, with Gemini’s reminder to keep the sprint timeboxed and lightweight.” The Gemini draft is useful as a simplicity check, but it is not strong enough to use as the main implementation spec.
