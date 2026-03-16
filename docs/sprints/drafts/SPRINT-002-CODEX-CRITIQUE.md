# Sprint 002 Critique: Claude Draft vs. Gemini Draft

Reviewed against `docs/INTENT.md`, `docs/sprints/drafts/SPRINT-002-INTENT.md`, `CLAUDE.md`, and the current Sprint 001 codebase shape.

## Claude Draft

### Strengths

- Strong architectural framing. It resolves most of Sprint 002's open questions up front: single-player scope, procedural rendering, summary-as-overlay, pure game logic in `src/game/`, and a separate `TradingPostScene`.
- Good alignment with `CLAUDE.md`. It keeps scenes thin, pushes rules into pure modules, extends layout helpers instead of hardcoding scene math, avoids new dependencies, and stays aware of the app-chunk budget.
- The implementation plan is concrete enough to build from. The phase breakdown, file manifest, and unit-test plan are all actionable.
- Visual feedback is specified at the right level. Warning state, bust states, scoring animation, and shop purchase feedback are all described clearly enough to guide implementation without hand-waving.
- The draft treats verification as a first-class deliverable instead of an afterthought. The screenshot checklist, CI expectations, and bundle-budget callouts all map well to the sprint intent.

### Weaknesses

- The draft carries too much roster surface for one sprint. Including active-ability animals in the Trading Post as "Coming Soon" vanilla stat sticks adds content, UI copy, and balance burden without improving the playable loop. A smaller fully functional roster would be cleaner.
- The Penned Up model is inconsistent and likely wrong. `GameState.pennedUp: AnimalId | null` and `prepareDeck(herd, pennedUp: AnimalId | null)` imply banning an animal type, but the intent says one animal is Penned Up. With multiple Barn Cats or Feral Goats, that distinction matters. The draft also introduces `selectPenUp(state, animalInstanceId)` later, which points in the opposite direction.
- A core rules decision is still left open even though the rest of the design depends on it: should the last-drawn animal be Penned Up automatically, or should the player choose? That needs to be locked before implementation, not left to the end.
- The verification plan is still nondeterministic. The screenshot flow assumes the game will naturally produce specific warning and bust states, but the draft never requires seeded shuffles or a controlled verification harness. That will make `agent-browser` proof flaky.
- "Herd visibility at any time" appears as a use case, but it does not really survive into architecture, implementation, or Definition of Done. That makes it feel like an aspiration rather than part of the sprint.
- The visual approach leans heavily on emoji and system text. That is pragmatic, but it undershoots the intent's "classic pixel art" bar and will vary noticeably across browsers and operating systems.

### Gaps in Risk Analysis

- No explicit risk that Penned Up is modeled at the animal-type level instead of the card-instance level.
- No explicit risk that screenshot verification becomes flaky because the game is random and the draft does not require deterministic seeds.
- No explicit risk around rapid repeated taps during draw/scoring animations causing duplicate draws or invalid state transitions.
- No explicit risk around safe-area crowding on phones once the header HUD, two action buttons, overlays, and Trading Post UI all exist at once.
- No explicit risk that selling non-functional active-ability animals damages player trust or makes the shop feel misleading.

### Missing Edge Cases

- Busting on a duplicated animal type and confirming that only one instance is Penned Up for the next night.
- Warning state clearing correctly after a canceller enters the barn, and staying cleared through scoring/summary transitions.
- Barn Overwhelmed caused by forced admissions or BRINGER chains, not just by manual overdraw.
- Reaching the Trading Post with 0 Mischief and 0 Hay after a bust and still being able to continue cleanly into the next night.
- Capacity growth after several upgrades. The draft discusses dynamic layout, but it never defines a hard cap or a fallback once rows begin colliding with the farmhouse area.
- Reproducing showcase states on demand for screenshots and regression checks.

### Definition of Done Completeness

- Strong on the core loop, visuals, CI, and unit-test coverage.
- Missing an explicit DoD item for Penned Up behavior: which animal is banned, how it is represented, and how exactly one instance is excluded next night.
- Missing reproducible verification criteria. "Screenshots captured" is weaker than "screenshots can be reproduced from a seed or controlled setup."
- Missing the herd-visibility acceptance the draft itself introduces earlier.
- Negative-Hay penalty is present in implementation and tests, but not in DoD. That is an important economy rule that could otherwise disappear without failing the sprint.
- If active-ability animals remain in the shop, DoD should explicitly require unmistakable UI labeling that those abilities are non-functional in Sprint 002.

## Gemini Draft

### Strengths

- Best scope discipline of the two drafts. It picks a concrete eight-animal shop roster and avoids inventing a generic active-ability framework too early.
- Strong state-machine focus. The draft correctly treats push-your-luck bugs as state-transition bugs and organizes implementation around pure game logic first.
- The separation between `PlayerState` and `NightState` is good. It makes the nightly loop easier to reason about than a single overloaded state object.
- Good edge-case awareness. Empty-deck auto-score, stacked NOISY! cancellation, capacity cost progression, and rapid-tap animation races are all called out explicitly.
- The phase breakdown is practical. Rules engine first, then BarnScene, then summary, then shop, then polish, then verification. That sequencing is defensible.
- The Definition of Done is concrete and testable for most of the core loop.

### Weaknesses

- Deferring Penned Up to Sprint 003 is the biggest miss in either draft. `docs/INTENT.md` includes Penned Up as part of the bust consequence in the core night loop. Omitting it changes the game rules, not just the polish level.
- The draft is internally inconsistent on BRINGER content. UC-5 explicitly mentions Bringer-summoned overcrowd busts, but the later open question recommends excluding Bringers from Sprint 002. That leaves an important overcrowding edge case half-in and half-out.
- The proposed `gameStore.ts` module-level singleton is a weak fit for the current repo conventions. It introduces hidden global state, makes HMR/reset behavior harder to reason about, and is less test-friendly than explicit state passing or a pure session object.
- The Google Font recommendation adds a runtime dependency for a cosmetic win. That weakens screenshot determinism, adds network variance on mobile, and then contradicts the later security section that says there are no external API calls.
- Verification is still too dependent on luck. The draft asks for screenshots of specific states but does not require seeded shuffles, named test seeds, or a controlled debug-only harness.
- The draft under-specifies how the player sees herd composition or bust consequences between nights. That becomes more noticeable once purchases and Penned Up matter.

### Gaps in Risk Analysis

- No explicit risk that deferring Penned Up now will force a state-model rewrite in Sprint 003.
- No explicit risk around module-level singleton state surviving HMR, scene restarts, or tests in ways that leak stale data.
- No explicit risk around screenshot flakiness from random draw order.
- No explicit risk around Google Font loading failure, CSP/network issues, or different font metrics changing layout on mobile.
- No explicit risk around stock limits adding design and test surface that the sprint does not clearly need.

### Missing Edge Cases

- Busting and then constructing the next night's deck with exactly one Penned Up card excluded.
- Entering the Trading Post with no affordable options and still being able to start the next night without confusion.
- Buying repeated copies of the same animal and handling stock exhaustion or duplicate rendering cleanly.
- Repeated capacity upgrades, not just the first `5 -> 6` purchase.
- Reproducing warning, bust, and success showcase states deterministically for screenshots.
- BRINGER-driven overcrowd resolution if Bringers remain in scope.

### Definition of Done Completeness

- Strong on the playable loop, bust conditions, NOISY! mitigation, currencies, tests, and CI.
- Incomplete against the product intent because Penned Up is absent from DoD even though it is part of the bust consequence in `docs/INTENT.md`.
- The DoD should either include BRINGER-driven overcrowd behavior or the rest of the draft should stop referencing it.
- Negative-Hay penalty appears in implementation tasks and tests, but not in DoD.
- "Screenshots prove this" is still too soft without a reproducibility requirement.
- "No regressions" is narrower than it should be. It names `barnLayout` explicitly, but the sprint also needs to preserve the existing Playwright readiness hook and scene boot behavior if those remain part of the repo contract.

## Overall Recommendation

- Claude is stronger on architecture, visual/completeness thinking, and explicit verification expectations.
- Gemini is stronger on scope control, state-machine discipline, and practical edge-case handling.
- The merged sprint should take Claude's structure and verification seriousness, Gemini's tighter functional roster and race-condition awareness, and add one thing both drafts still need: a resolved Penned Up rule plus deterministic verification support.
