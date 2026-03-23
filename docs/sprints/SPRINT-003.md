# Sprint 003: Personality & Polish

## Overview

Sprint 002 completed the game loop. This sprint makes it feel authored, responsive, and finished. The target: a stranger opening the GitHub Pages build should smile within 10 seconds, not mistake the game for a prototype.

Backlog items covered: **#24 (Humor & Personality Pass)**, **#25 (Animation Polish)**.

Out of scope: audio (#15–23), CI/CD (#26), balance retuning, sprite replacement, layout redesign.

### Product Rules

- Keep primary labels literal: `Pop`, `Cash`, `Noisy`, `Capacity`, `Call It a Night`, `Hootenanny`, `Play Again`. Personality belongs in supporting text, not in labels the player must parse quickly.
- Every animal gets two layers of writing: one short flavor line and one short mechanical rules line.
- No animation libraries. CSS + small local hooks only.
- No phase animation may add dead time. Any sequence longer than 400ms must be skippable by click, tap, or Enter.
- Respect `prefers-reduced-motion` from day one.
- Zero new runtime dependencies.

---

## Architecture

### 1. Separate mechanics from voice

`catalog.ts` currently mixes balance data and player-facing prose. After this sprint:

- `catalog.ts` owns mechanics only: cost, payout, power, power type, blue-ribbon flag.
- `src/content/copy.ts` owns all authored text, organized by domain:
  - **Animals**: per-animal flavor text and shop pitch (≤120 chars each)
  - **Powers**: canonical labels and rules text (≤80 chars each)
  - **UI**: scene copy, inspector idle text, summary headings, targeting prompts, quip arrays, button helper text

Remove or neutralize old `description` fields in `catalog.ts` once copy is centralized — one source of truth, not two.

Add an exhaustiveness test that fails if any `AnimalId`, `AnimalPowerId`, `NightOutcome`, or `TargetingKind` lacks a copy entry.

### 2. Structured summary data, not string logs

The current `resolutionLog: string[]` is too weak for animated tally presentation. Replace it with structured `ResolutionEvent[]`:

```typescript
interface ResolutionEvent {
  kind: 'pop-gain' | 'cash-gain' | 'cash-cost' | 'pop-penalty' | 'bonus';
  amount: number;
  source: string;       // animal name or mechanic that caused it
  description: string;  // human-readable line for the log
}

interface NightSummary {
  outcome: NightOutcome;
  popBefore: number;
  popAfter: number;
  cashBefore: number;
  cashAfter: number;
  events: ResolutionEvent[];
  pinnedForNextNight: string | null;
  winningBlueRibbonIds: string[];
}
```

The engine emits facts and order. The UI owns presentation. Do not try to animate by parsing strings.

### 3. Motion stays local and lightweight

Transient animation is presentation state, not game state. Do **not** add `transitionPhase` or animation flags to `GameState`.

**New files:**

- `src/styles/motion.css` — shared keyframes, duration tokens, easing tokens, `prefers-reduced-motion` overrides
- `src/ui/PhaseTransitionCurtain.tsx` — short interstitial for scene changes, mounted from `App.tsx`
- `src/ui/useAnimatedCounter.ts` — count-up hook with reduced-motion and fast-forward support

**Rules:**

- Continuous motion: CSS-only (`@keyframes`, `transition`).
- Event-driven motion: local `useEffect` timers or `animationend` listeners. Use timeout as fallback (max 1000ms), never as the primary trigger.
- Animate only `transform`, `opacity`, `filter` — never layout properties.
- Standard durations: 120ms press, 180–220ms hover/focus, 280–340ms scene transitions.
- `steps()` easing for retro pixel-snap feel where appropriate.

### 4. Barn-entry polish via DOM diff

`BarnGrid` compares previous and current `barnResidentIds` to derive what just entered. No `lastInvitedId` in `GameState`.

- New guests get a `bounce-in` / `pop-in` animation via CSS class.
- `Stacks` growth animates the stack badge, not a new slot.
- `Rowdy` causing multiple entries: animate all new entries.
- Animation is fire-and-forget. Never blocks input.

### 5. CSS infrastructure

`src/styles/motion.css` defines shared keyframes:

| Keyframe | Use |
|----------|-----|
| `bounce-in` | Animal entry into barn slots |
| `pop-in` | Scale 0.8→1.05→1.0, modal/card entrance |
| `slide-in-up` / `slide-out-down` | Element entrance/exit |
| `fade-in` / `fade-out` | Opacity transitions |
| `count-pulse` | Subtle scale pulse on number change |
| `wiggle` | Small rotation for purchase feedback |
| `hover-bob` | 1px up/down idle animation for barn animals |
| `flash-attention` | Opacity pulse for activate ability reminder |

Barn slots receive `--slot-index` as a CSS custom property for staggered `animation-delay`: `calc(var(--slot-index) * 60ms)`.

Phase transitions use `data-transition` attributes on root layout containers so CSS can target `[data-transition="exiting"]` etc. The UI state machine in `App.tsx` (not the game engine) manages these.

### 6. Voice strategy

Tone target: "goofy, warm, scrappy" — not wacky for the sake of it.

Writing rules:
- One sentence of flavor, one sentence of rules.
- No jokes that hide timing rules or costs.
- Blue-ribbon animals feel impressive but farm-party silly, not epic-fantasy serious.
- Critical CTAs stay literal; secondary text carries the charm.
- Kill placeholder copy like `"No power."` unless intentionally deadpan.
- Animal descriptions ≤120 characters. Power quips ≤80 characters. Prevents inspector overflow and keeps tone punchy.

---

## Implementation Phases

### Phase 1 — Copy scaffolding and exhaustiveness

Create `src/content/copy.ts` with all authored text organized by domain (animals, powers, UI). Remove old inline `description` from `AnimalDefinition`.

Write an exhaustiveness test (`src/content/__tests__/copy.test.ts`) that fails if any ID lacks copy.

**Exit criteria:**
- No component imports authored prose from `catalog.ts`.
- All animals and powers have copy entries.
- Missing-copy regressions fail in CI.

### Phase 2 — Summary event model

Refactor `NightSummary` in `types.ts` and `engine.ts` to emit `ResolutionEvent[]` with `popBefore`, `cashBefore`, `popAfter`, `cashAfter`. Keep scoring behavior unchanged — this is data plumbing, not balance work.

**Exit criteria:**
- Engine tests prove event order matches the design-doc scoring order.
- Win and bust flows produce correct outcomes.
- UI can render summary without string parsing.

### Phase 3 — Night and summary surface pass

Apply voice pass to `InspectorPanel`, `TargetingOverlay`, `NightSummaryModal`.

Add animated tally in `NightSummaryModal`:
- Counters start at `popBefore`/`cashBefore`, events reveal sequentially.
- Player can fast-forward with click, tap, or Enter.
- Bust and win variants get distinct headings and support text.
- Use `useAnimatedCounter` hook with `requestAnimationFrame` lerp; cap duration at 2s regardless of value.

**Exit criteria:**
- Night play reads clearly without placeholder copy.
- Summary feels like a payoff, not a debug dump.
- Keyboard, mouse, and touch can all skip the tally cleanly.

### Phase 4 — Scene transitions and shared motion

Add `motion.css`, wire in `main.tsx`, mount `PhaseTransitionCurtain` from `App.tsx`.

Transitions to implement:
- `night-summary → shop`: summary exits, shop enters
- `night-summary → win`: summary exits, win enters
- `shop → night`: shop exits, barn enters

No curtain between `night → night-summary` — the summary reveal itself is the transition.

Total transition time ≤ 700ms (≤350ms each direction). If playtesting feels sluggish, cut to 200ms each.

**Exit criteria:**
- Scene changes feel deliberate but fast.
- Focus lands on the correct interactive root after each transition.
- `prefers-reduced-motion` removes the curtain and jumps directly.

### Phase 5 — Barn, shop, and win micro-interactions

**Barn (`BarnGrid`):**
- New-guest `bounce-in` entry animation with `steps()` retro easing
- Subtle `hover-bob` idle animation (1px, 2s loop, staggered by `--slot-index`)
- Bust: screen shake (4-frame, 400ms) → red overlay flash → animal fade-out
- At-capacity activate abilities: `flash-attention` pulse on relevant slots
- Ability activation: brief flash/glow on slot, power badge fades out

**Shop (`ShopCard`, `ShopInspector`, `BarnUpgradeCard`):**
- Cards stagger in with `slide-in-up` + `fade-in`, 50ms apart; blue-ribbon cards enter with `pop-in`
- Purchase: card `wiggle` + counter `count-pulse` + stock fade-swap
- Sold-out: grayscale filter fades in over 300ms, opacity dims
- Stronger hover/focus/press affordance on all interactive elements
- `ShopInspector`: personality description above mechanical description; fade/slide content swap on focus change

**Win (`WinScreen`):**
- Blue-ribbon animals enter one at a time with `pop-in` stagger (500ms apart)
- Victory text types in (CSS `steps()` on `clip-path` or `max-width`)
- "Play Again" button bounces in after reveal
- Confetti effect: **stretch goal** — CSS-only pseudo-elements if time permits

**Global:**
- All buttons: `:active` → `transform: scale(0.96); transition: transform 80ms`
- All interactive elements: cursor pointer, subtle lift/glow on hover, color shift on disabled
- Door and window: `pop-in` on click, subtle glow on selected state

This phase also applies the final voice pass to shop and win screens.

**Exit criteria:**
- Every major interactive surface has visible hover, focus, and press feedback.
- Barn communicates "you still have abilities" when full.
- Win screen feels like a finish, not a static receipt.

### Phase 6 — QA, regression tests, and performance

Add `tests/personality-and-motion.spec.ts` (Playwright):
- Summary tally can be skipped (click, Enter)
- Reduced-motion mode reaches final UI immediately
- Phase transitions don't trap focus
- At-capacity activate abilities are visibly advertised

Ensure test environment handles animations: set `prefers-reduced-motion: reduce` in Playwright's browser context so animations resolve instantly and don't cause flakiness.

Run all verification:
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run check:bundle`

**Exit criteria:**
- All existing gameplay tests still pass.
- New polish flows are covered.
- Gzipped JS stays under the existing 150 KB budget.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/content/copy.ts` | All authored text: animal flavor, power labels/rules, UI copy, quip arrays |
| `src/content/__tests__/copy.test.ts` | Exhaustiveness test for animal, power, and UI copy |
| `src/styles/motion.css` | Shared keyframes, duration/easing tokens, reduced-motion overrides |
| `src/ui/PhaseTransitionCurtain.tsx` | Short, skippable interstitial for phase changes |
| `src/ui/useAnimatedCounter.ts` | Count-up hook with reduced-motion and fast-forward support |
| `tests/personality-and-motion.spec.ts` | Browser-level validation of skip, reduced-motion, transitions |

### Modified Files
| File | Changes |
|------|---------|
| `src/game/types.ts` | Add `ResolutionEvent`, restructure `NightSummary` with before/after totals and events |
| `src/game/catalog.ts` | Remove authored prose; keep mechanics only |
| `src/game/engine.ts` | Emit structured summary events in scoring order (no rule changes) |
| `src/game/__tests__/engine.test.ts` | Assert summary event order and before/after totals |
| `src/game/__tests__/win.test.ts` | Assert win summaries carry correct structured data |
| `src/app/App.tsx` | Mount transition curtain, manage UI-local transition state via `data-transition` |
| `src/main.tsx` | Import `motion.css` |
| `src/ui/BarnGrid.tsx` | `--slot-index` CSS var, detect new entries, entry/attention/bust animation classes, idle bob |
| `src/ui/InspectorPanel.tsx` | Render flavor + rules from `copy.ts`, contextual quips |
| `src/ui/NightSummaryModal.tsx` | Animated tally via `useAnimatedCounter`, staged event rendering, skip support, outcome copy |
| `src/ui/TargetingOverlay.tsx` | Flavor-appropriate headers per ability type from `copy.ts` |
| `src/ui/TradingPostScreen.tsx` | Scene entry animation, focus recovery |
| `src/ui/ShopCard.tsx` | Purchase wiggle, sold-out transition, enhanced hover/focus/press |
| `src/ui/ShopInspector.tsx` | Personality-first descriptions, fade/slide content swap |
| `src/ui/BarnUpgradeCard.tsx` | Match polish level of shop cards |
| `src/ui/WinScreen.tsx` | Staged ribbon reveal, victory copy, celebratory entrance |
| `src/styles/app.css` | Barn animations, bust shake, entry bounce, idle bob, button press |
| `src/styles/shop.css` | Card entrance stagger, purchase feedback, sold-out transition |
| `src/styles/win.css` | Win-screen reveal, typewriter title |

### Untouched Files
| File | Reason |
|------|--------|
| `src/game/shop.ts` | Shop generation logic unchanged |
| `src/game/selectors.ts` | Read-only queries unchanged |
| `src/game/rng.ts` | Untouched |
| `src/input/useControls.ts` | Keyboard navigation unchanged |
| `src/ui/AnimalSprite.tsx` | Animation happens at slot level, not sprite level |

---

## Definition of Done

### Personality
- [ ] Every animal has authored flavor text (≤120 chars) and clear rules text sourced from `src/content/copy.ts`
- [ ] Every power has a label and rules text sourced from `copy.ts`
- [ ] No component imports authored prose from `catalog.ts` — single source of truth
- [ ] Night start, scoring, bust, shop, and win phases each display a contextual quip
- [ ] Targeting overlay headers are flavor-appropriate per ability type
- [ ] Inspector panel shows personality description above mechanical description
- [ ] Exhaustiveness test fails if any ID lacks copy

### Animation
- [ ] Animals bounce into barn slots on invite (retro `steps()` easing)
- [ ] Barn animals have subtle idle bob animation (staggered by slot index)
- [ ] Bust triggers screen shake + red flash + animal fade-out
- [ ] Unused activate abilities pulse when barn is at capacity
- [ ] Ability activation produces a visual flash/glow on the slot
- [ ] Night summary tally counts up (Pop then Cash) and can be skipped by click, tap, or Enter
- [ ] Summary event log lines stagger in alongside the tally
- [ ] Phase transitions have choreographed exit/enter animations (≤350ms each direction)
- [ ] Shop cards stagger in on entry; blue-ribbon cards enter with emphasis
- [ ] Purchase produces wiggle + counter pulse
- [ ] Sold-out cards transition smoothly to dimmed/grayscale
- [ ] Win screen: blue-ribbon animals reveal one at a time, title types in
- [ ] All buttons have `:active` press feedback
- [ ] All interactive elements have hover/focus states

### Accessibility & Quality
- [ ] `prefers-reduced-motion` disables decorative motion; functional transitions become instant
- [ ] Focus is restored to the correct element after every phase transition
- [ ] No hover-only information — touch and keyboard have full parity
- [ ] Animated counters announce final values (not intermediate states) for screen readers via `aria-live`
- [ ] Animations disabled in Playwright test environment (reduced-motion context)
- [ ] All existing unit and E2E tests pass
- [ ] New Playwright spec covers: tally skip, reduced-motion, phase transitions, activate ability visibility
- [ ] Bundle size increase < 5KB gzipped — no new runtime dependencies
- [ ] No layout shift from animations (animated elements use `transform`/`opacity` only)
- [ ] Text-bearing components verified at 320px viewport width — no overflow

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Humor muddies rules** — witty copy obscures timing-sensitive mechanics | High | Always pair flavor with a literal rules line; keep CTA labels literal; ≤120 char cap on descriptions |
| **Motion adds dead time** — transitions slow the loop | High | Total transition ≤700ms; anything >400ms is skippable; honor reduced-motion |
| **Presentation state leaks into engine** — animation flags rot in `GameState` | Medium | All transient motion stays local to components; only structured summary data touches the engine |
| **Summary model refactor breaks scoring** — structured events diverge from current behavior | Medium | Refactor is data plumbing only; engine tests assert identical scoring outcomes before and after |
| **Animation timing races with user input** — rapid clicks during transitions cause double-continues or dropped actions | Medium | Listen for `animationend` + timeout fallback; skip queues the final state immediately |
| **Test flakiness from animation timing** — Playwright clicks before entrance animations complete | Medium | Set `prefers-reduced-motion: reduce` in test browser context; animations resolve instantly |
| **Copy overflow on narrow viewports** — long descriptions break inspector layout | Low | Enforce character caps; test at 320px width; CSS truncation as fallback |
| **Scope creep on polish** — juice tweaking is an endless rabbit hole | Medium | Timebox: if animation tweaking exceeds 2 hours on any single element, ship what works and move on |
| **Win screen confetti eats time** — CSS-only pseudo-element confetti is fiddly | Low | Confetti is a stretch goal; core win screen is ribbon reveal + typewriter title |

---

## Dependencies

### Internal
- Sprint 002 complete and stable: phase model, shop flow, win condition, scoring pipeline.
- All existing unit and E2E tests passing as baseline.

### External
- None. No new packages, sourced assets, or API calls.

### Ordering
- Phase 1 (copy scaffolding) and Phase 2 (summary events) can proceed in parallel.
- Phase 3 (night/summary surface pass) depends on Phases 1 and 2.
- Phase 4 (transitions + motion.css) is independent of Phase 3; can proceed in parallel.
- Phase 5 (micro-interactions) depends on Phase 4 for shared motion infrastructure.
- Phase 6 (QA) comes last.
