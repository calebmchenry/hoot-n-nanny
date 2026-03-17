# Sprint 003 Critique: Claude Draft vs. Gemini Draft

Reviewed against:
- `CLAUDE.md`
- `docs/sprints/drafts/SPRINT-003-INTENT.md`
- Current Sprint 002 code shape (`src/game/*`, `src/scenes/*`, `src/config/constants.ts`)

## Claude Draft

### 1) Strengths

- Very complete implementation blueprint. The phase breakdown, file list, and test checklist are detailed enough for direct execution.
- Strong alignment with current architecture constraints: pure game logic in `src/game/`, scene-driven rendering in `BarnScene`/`TradingPostScene`, no new dependencies.
- Good specificity on readability deliverables (badge dimensions, text sizes, visual hierarchy, NOISY treatment), which directly addresses the user pain point.
- Ability flow is concrete and testable (`startXxx` + `resolveXxx` pure functions), and it explicitly considers bust/win checks after ability outcomes.
- Verification discipline is strong: named seeds, CI/budget checks, and explicit regression expectations are all included.

### 2) Weaknesses (gaps, over-engineering, unclear specs)

- Scope is likely too wide for one sprint: 4 new ability animals, 6 Legendaries, full info panel system, ability UI flows, Trading Post scrolling/inertia, victory overlay, and extensive DOM instrumentation.
- The draft mixes UI concerns into core game events (`info_panel_opened`, `info_panel_closed` in `NightEvent`). This increases coupling between scene behavior and game-state reducers.
- Internal consistency issues:
  - Shop sizing/layout assumptions conflict. The draft adds 4 active-ability shop animals plus 6 Legendaries, but several sections still budget for “8 regular + 6 Legendary”.
  - Boot/Fetch cancel behavior is described in multiple places and still reads as partially unsettled.
- Ability trigger semantics are not fully locked. It alternates between “on enter” and “tap card to activate,” but doesn’t define exactly when abilities may be deferred, skipped, or auto-fired.
- Deterministic PRNG handling for `peek_reject` random reinsertion is underspecified relative to the current codebase (deck is pre-shuffled; there is no per-night RNG state currently passed through ability resolution).

### 3) Risk Analysis Gaps

- No explicit risk for determinism drift when adding random deck reinsertion during peek reject.
- No explicit risk for event-surface explosion (`NightEvent` growth) making scene event processing brittle.
- No explicit risk for long-press timer race conditions with tap-to-activate ability interactions during animation transitions.
- Penned Up stacking is identified as an open question, but not elevated as a top-level delivery risk despite being state-model impacting.
- No explicit risk for regression in current `TradingPostScene` tap handling once drag/inertia scroll is introduced.

### 4) Missing Edge Cases

- Ability interactions:
  - What happens if Peek accepts a card with its own active ability: immediate chain prompt, deferred prompt, or suppressed?
  - What happens when Cheerful Lamb refreshes a second Stable Hand and player performs multiple boots in one Night?
  - Can abilities be activated while warning is active but before bust resolution if multiple events happen quickly?
- Bust + win precedence:
  - If the same card entry would both produce 3 Legendaries and trigger bust (noise or over-capacity), which outcome wins?
  - Should `win_condition_met` ever emit in a state that later resolves to bust?
- Penned Up stacking:
  - Boot one card, then bust the same Night: one penned-up slot or two?
  - Multiple boots in one Night after refresh: does the system queue multiple penned-up cards or collapse to one?
  - If a boot target is already scheduled for Penned Up, does it duplicate or overwrite?

### 5) Definition of Done Completeness

- DoD is strong on breadth and test count, but key rule-resolution items are missing:
  - Explicit bust-vs-win precedence rule and required tests.
  - Explicit Penned Up stacking policy and required tests.
  - Explicit ability-chain policy for cards entering via Peek/Fetch.
  - Deterministic replay expectation for ability paths (especially reject/reshuffle paths).
- “Minimum 25 new tests” is measurable but not sufficient by itself; DoD should prioritize scenario coverage over raw count.

### 6) Implementability

- Implementable, but high-risk as written due to scope and cross-cutting changes.
- Most immediate implementation friction points against current code:
  - Session currently tracks only one pending penned-up card (`pendingPennedUpCardId`), while draft behavior can produce multiple.
  - Peek reject random insertion needs deterministic RNG plumbing not yet present.
  - Trading Post scroll + existing card tap interactions will need careful input arbitration.
- Constructive adjustment: ship a narrower MVP in Sprint 003 (core ability engine + win condition + readability + info panel), and defer inertial scrolling polish + expanded Legendary roster unless schedule margin remains.

---

## Gemini Draft

### 1) Strengths

- Clear architectural thesis and rationale, especially around data-driven abilities and using overlays (not extra scenes) for info/victory UI.
- Good forward-looking model: `abilityKind` + registry can scale better than accumulating boolean flags.
- More disciplined initial scope than Claude on Legendary count (4 vs 6), which reduces tuning and content overhead.
- Strong emphasis on resolving core engine changes before visual polish, which can reduce late integration surprises.
- Includes useful guardrails on combinatorial behavior (e.g., explicit stance on ability chaining).

### 2) Weaknesses (gaps, over-engineering, unclear specs)

- The boolean-to-registry migration is a large refactor touching scoring, noise mitigation, animals, and event handling at once. That is substantial risk beyond user-requested Sprint 003 outcomes.
- The draft claims “no new event types per ability” as a benefit, but then introduces many ability-specific events. This weakens the argument and can confuse implementation direction.
- Some specs are contradictory or unclear:
  - Info panel bounds are defined as `y: 506..844`, which overlaps the action bar area (`y: 720`); the doc simultaneously states no overlap.
  - Fetch candidates are represented as `CardInstance[]` in prompt/event structures, but the narrative says not to reveal deck order.
  - On-enter trigger model plus `abilityUsed` reset semantics (refresh) leaves ambiguous practical value in several flows.
- User-facing behavior can feel punitive/opaque without stronger rationale:
  - Boot self = forfeit.
  - Fetch excludes Legendaries by rule.
  - Fetched cards suppress their own on-enter abilities.

### 3) Risk Analysis Gaps

- No explicit risk for large migration regressions when removing existing boolean ability fields.
- No explicit risk for precedence ambiguity between win/bust during ability-driven card entry.
- No explicit risk for Penned Up model mismatch with current single-card session fields.
- No explicit risk for UX confusion from implicit rule suppressions (no chain triggers, no Legendary fetch, boot self forfeit).
- No explicit risk for cached `legendaryCount` drift when barn mutates through multiple ability paths.

### 4) Missing Edge Cases

- Ability interactions:
  - Peek accept into another on-enter ability prompt: nested prompt policy is not defined.
  - Refresh + multiple copies of active cards: can the same type be re-used multiple times in one Night and is that intended?
  - Cancel behavior consistency: does cancel consume ability for each prompt type?
- Bust + win precedence:
  - If Fetch or Peek-Accept adds the 3rd Legendary and simultaneously causes overflow/noise bust, which outcome resolves?
  - If win is flagged before subsequent ability consequences, is it reversible?
- Penned Up stacking:
  - Boot plus bust in same Night with current single `pendingPennedUpCardId`.
  - Multiple boots in one Night (after refresh) with only single-slot penned tracking.
  - Interaction with already-active penned card in current Night.

### 5) Definition of Done Completeness

- DoD covers many required features, but key policy completeness is missing:
  - No explicit precedence matrix for draw/peek/fetch outcomes (normal, warning, bust, win).
  - No explicit Penned Up stacking behavior.
  - No explicit deterministic verification requirement for ability branches.
  - No migration-safety criterion for refactor breadth (e.g., “all Sprint 002 behavior parity remains unchanged for non-Sprint-003 animals”).
- The info panel non-overlap acceptance criterion is currently inconsistent with the proposed panel coordinates and should be corrected.

### 6) Implementability

- Implementable, but risky due to simultaneous feature delivery + foundational model migration.
- Highest-friction implementation points against current code:
  - `executeBoot` needs to affect session-level penned-up state, but much of the proposed resolver flow is modeled at night-state scope.
  - Replacing boolean ability fields in one sprint will force broad test rewrites and increases regression blast radius.
  - Ability prompt phase transitions (`AbilityPeek/Boot/Fetch`) require careful integration with existing `drawAnimalInSession` auto-finalize behavior.
- Constructive adjustment: keep the registry approach, but add it alongside existing fields first (adapter period), then remove legacy booleans in Sprint 004 after parity tests pass.

---

## Bottom Line

- **Claude draft** is stronger on concrete execution detail and immediate sprint readiness, but needs scope tightening and clearer rule resolution for precedence and Penned Up stacking.
- **Gemini draft** is stronger on long-term architecture direction, but currently carries higher migration risk and more unresolved policy ambiguity than is ideal for this sprint.
- A merged direction should use Claude’s delivery specificity with Gemini’s data model, while explicitly locking: (1) ability-chain policy, (2) bust-vs-win precedence, and (3) single-vs-multi Penned Up behavior.
