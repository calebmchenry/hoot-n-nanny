# Sprint 003: Personality & Polish

## Overview

This sprint implements backlog items **#24 Humor & Personality Pass** and **#25 Animation Polish**. Sprint 002 made the game complete. This sprint makes it feel authored, responsive, and finished.

The target outcome is not "more text" and "more animation." The target outcome is a game that reads clearly, sounds like itself, and moves with enough energy that a stranger opening the GitHub Pages build does not mistake it for a prototype.

Backlog items covered: **#24**, **#25**.

Out of scope: audio (#15-23), CI/CD (#26), balance retuning, sprite replacement, and layout redesign.

Product rules for the sprint:

- Keep primary resource and action labels literal: `Pop`, `Cash`, `Noisy`, `Capacity`, `Call It a Night`, `Hootenanny`, `Play Again`. Personality belongs in supporting text, not in the only label the player has to parse quickly.
- Every animal gets two layers of writing: one short flavor line and one short mechanical rules line.
- Do not add an animation library. Use CSS plus small local hooks.
- No phase animation may add dead time. Any non-trivial sequence must be skippable by click, tap, or Enter.
- Respect `prefers-reduced-motion` from day one.

## Architecture

### 1. Separate mechanics from voice

`src/game/catalog.ts` should stop being a dumping ground for both balance data and authored copy. After this sprint:

- `catalog.ts` owns mechanics only: cost, payout, power, power type, and blue-ribbon flag.
- `src/content/animalCopy.ts` owns exhaustive per-animal flavor text.
- `src/content/powerCopy.ts` owns canonical power labels and rules text.
- `src/content/uiCopy.ts` owns scene copy, inspector idle text, summary headings, targeting prompts, and button helper text.

This keeps future balance edits from requiring copy surgery in the engine layer, and it prevents the humor pass from scattering hard-coded strings across ten components.

A concrete target shape:

```ts
interface AnimalCopy {
  flavor: string;
  shopPitch?: string;
}

interface PowerCopy {
  label: string;
  rules: string;
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

### 2. Structured summary data, not string logs

The current `resolutionLog: string[]` is good enough for correctness but weak for polish. It forces the engine to author final UI sentences and gives the summary modal no reliable way to animate the tally.

Replace it with `ResolutionEvent[]` in scoring order. Each event should say what changed and why. Example event kinds:

- `pop-gain`
- `cash-gain`
- `cash-cost`
- `pop-penalty`
- `bonus`

`NightSummaryModal` should format those events into copy and reveal them one by one. The engine remains responsible for facts and order; the UI remains responsible for presentation.

This is the only engine-facing data-model change in the sprint, and it is worth it. Do not try to fake a tally animation by parsing finished strings.

### 3. Motion architecture stays local and lightweight

Use a presentation layer, not engine state, for transient animation. The game rules do not care that a card bounced or a curtain slid across the screen.

Add:

- `src/ui/PhaseTransitionCurtain.tsx` for short interstitial scene changes (`night-summary -> shop`, `night-summary -> win`, `shop -> night`)
- `src/ui/useAnimatedCounter.ts` for Pop and Cash tallying
- `src/styles/motion.css` for shared durations, easing, keyframes, and reduced-motion overrides

Rules:

- Continuous motion stays CSS-only.
- Event-driven motion may use local `useEffect` timers.
- Animate `transform`, `opacity`, and `filter`; do not animate layout properties.
- Standard durations: 120ms press, 180-220ms hover/focus, 280-340ms scene transitions.
- Anything longer than 400ms must either be meaningful (summary tally) or skippable.

### 4. Use DOM diffs for barn-entry polish

Do not push `lastInvitedId` into `GameState`. `BarnGrid` can compare previous and current `barnResidentIds` and derive what just entered.

- New visible guest groups get a short pop-in / slide-in animation.
- If a `Stacks` animal joins an existing stack, animate the stack badge instead of pretending a whole new slot appeared.
- If `Rowdy` causes two entries in one state change, animate both.
- The animation window is short and fire-and-forget. It should never block input.

### 5. Voice strategy: warm, goofy, still legible

The tone target is "goofy, warm, scrappy," not "wacky for the sake of it."

Concrete writing rules:

- One sentence of flavor, one sentence of rules.
- No jokes that hide timing rules or costs.
- Blue-ribbon animals should feel impressive, but still farm-party silly rather than epic-fantasy serious.
- Critical CTAs stay literal; secondary text carries the charm.
- Kill placeholder copy like `No power.` and `Shop for upgrades.` unless the line is intentionally deadpan and still sounds authored.

## Implementation Phases

### Phase 1 - Copy scaffolding and exhaustiveness

Create `src/content/animalCopy.ts`, `src/content/powerCopy.ts`, and `src/content/uiCopy.ts`. Rename or remove the existing inline `description` field from `AnimalDefinition` so components stop pulling authored copy from the mechanics catalog.

Add an exhaustiveness test that fails if any `AnimalId`, `AnimalPowerId`, `NightOutcome`, or `TargetingKind` lacks copy.

Exit criteria:

- No component imports authored prose from `catalog.ts`.
- All animals and powers have copy entries.
- Missing-copy regressions fail in CI.

### Phase 2 - Summary event model

Refactor `NightSummary` in `src/game/types.ts` and `src/game/engine.ts` to emit `popBefore`, `cashBefore`, `popAfter`, `cashAfter`, and `events` in the same order the score resolves today.

Keep scoring behavior unchanged. This phase is data plumbing, not balance work.

Exit criteria:

- Engine tests prove event order still matches the design-doc scoring order.
- Win and bust flows still produce correct outcomes.
- The UI can render the summary without any string parsing.

### Phase 3 - Night and summary surface pass

Apply the voice pass to:

- `InspectorPanel`
- `TargetingOverlay`
- `NightSummaryModal`

Add the animated tally in `NightSummaryModal`:

- Counters start at `popBefore` / `cashBefore`
- Events reveal sequentially
- The player can fast-forward the sequence with click, tap, or Enter
- Bust and win variants get distinct headings and support text

Exit criteria:

- Night play reads clearly without placeholder copy.
- Summary feels like a payoff, not a debug dump.
- Keyboard and touch can both skip the tally cleanly.

### Phase 4 - Scene transitions and shared motion tokens

Add `motion.css`, wire it in `src/main.tsx`, and mount `PhaseTransitionCurtain` from `App.tsx`.

Transitions to implement:

- `night-summary -> shop`
- `night-summary -> win`
- `shop -> night`

Do not add a curtain between `night -> night-summary`; the summary reveal itself is that transition.

Exit criteria:

- Scene changes feel deliberate but still fast.
- Focus lands on the correct interactive root after each transition.
- `prefers-reduced-motion` removes the curtain and jumps directly to the final state.

### Phase 5 - Barn, shop, and win micro-interactions

Apply the motion pass to the components that actually carry the game:

- `BarnGrid`: new-guest entry, selected-slot lift, tasteful pulse for unused activate abilities when the barn is full and actions remain
- `ShopCard`: stronger hover/focus/press affordance, clearer sold-out / unaffordable states, keep the walking bob but make it feel intentional rather than default
- `ShopInspector`: fade / slide content swaps when focus changes
- `BarnUpgradeCard`: same affordance quality as the animal cards
- `WinScreen`: staged ribbon reveal and a stronger celebratory entrance

This phase is also where the shop and win screens get their final tone pass.

Exit criteria:

- Every major interactive surface has visible feedback on hover, focus, and press.
- The barn communicates "you still have abilities" when full.
- The win screen feels like a finish, not a static receipt.

### Phase 6 - QA, regression tests, and performance guardrails

Extend browser coverage with a new polish-oriented Playwright spec. Cover:

- summary tally can be skipped
- reduced-motion mode reaches final UI immediately
- shop -> hootenanny and summary -> shop/win transitions do not trap focus or require hover
- at-capacity activate abilities visibly advertise themselves

Run:

- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run check:bundle`

Exit criteria:

- All existing gameplay tests still pass.
- New polish flows are covered.
- Gzipped JS stays under the existing 150 KB budget.

## Files Summary

| File | Change | Purpose |
| --- | --- | --- |
| `src/game/types.ts` | Modify | Remove presentation-only summary strings, add structured `ResolutionEvent` data and before/after totals |
| `src/game/catalog.ts` | Modify | Keep animal definitions mechanical; stop storing authored prose here |
| `src/game/engine.ts` | Modify | Emit summary events in scoring order without changing rules |
| `src/content/animalCopy.ts` | Add | Exhaustive per-animal flavor text and shop-facing one-liners |
| `src/content/powerCopy.ts` | Add | Canonical power labels and clear mechanical rules text |
| `src/content/uiCopy.ts` | Add | Scene copy, inspector idle copy, targeting prompts, summary headings, and button helper text |
| `src/app/App.tsx` | Modify | Mount transition curtain and coordinate scene-level presentation state |
| `src/ui/PhaseTransitionCurtain.tsx` | Add | Short, skippable interstitial for phase changes |
| `src/ui/useAnimatedCounter.ts` | Add | Count-up animation with reduced-motion and fast-forward support |
| `src/ui/BarnGrid.tsx` | Modify | Detect newly entered guests and apply slot / stack animation states |
| `src/ui/InspectorPanel.tsx` | Modify | Render flavor plus rules text for the night phase |
| `src/ui/NightSummaryModal.tsx` | Modify | Replace raw log dump with staged tally, structured event rendering, and outcome-specific copy |
| `src/ui/TargetingOverlay.tsx` | Modify | Give targeting prompts the same voice and clarity as the rest of the UI |
| `src/ui/TradingPostScreen.tsx` | Modify | Scene entry animation, focus recovery, and inspector reset behavior |
| `src/ui/ShopCard.tsx` | Modify | Copy layout, richer affordance states, and refined animation hooks |
| `src/ui/ShopInspector.tsx` | Modify | Show flavor and rules separately; improve idle and focused states |
| `src/ui/BarnUpgradeCard.tsx` | Modify | Match the polish level of the shop cards and give the upgrade its own pitch |
| `src/ui/WinScreen.tsx` | Modify | Outcome copy, ribbon reveal, and stronger end-of-run presentation |
| `src/styles/motion.css` | Add | Shared motion tokens, keyframes, and reduced-motion overrides |
| `src/styles/app.css` | Modify | Barn, inspector, overlay, and summary motion / affordance styling |
| `src/styles/shop.css` | Modify | Shop card, inspector, and button polish |
| `src/styles/win.css` | Modify | Win-screen reveal styling |
| `src/main.tsx` | Modify | Import shared motion styles |
| `src/content/__tests__/copy.test.ts` | Add | Exhaustiveness test for animal, power, and UI copy coverage |
| `src/game/__tests__/engine.test.ts` | Modify | Assert summary event order and before/after totals |
| `src/game/__tests__/win.test.ts` | Modify | Assert win summaries still carry correct structured data |
| `tests/personality-and-motion.spec.ts` | Add | Browser-level validation of skip, reduced-motion, and phase-transition behavior |

## Definition of Done

- Every animal has authored flavor text and clear rules text sourced from centralized copy files.
- No player-facing component relies on placeholder prose or inline magic strings scattered through JSX.
- Night summary uses structured scoring data, animates Pop and Cash tallies, and can be skipped immediately.
- Night-to-shop, night-to-win, and shop-to-night transitions feel intentional and complete in under roughly 350ms when not skipped.
- Barn entry animation exists for newly visible guests, and `Stacks` growth animates correctly on the existing slot.
- When the barn is full but activate abilities remain, the relevant guests visibly advertise that fact.
- Shop, summary, and win screens all support mouse, keyboard, and touch without hover-only information.
- `prefers-reduced-motion` produces a usable, immediate version of the same UI.
- `npm run test`, `npm run test:e2e`, `npm run build`, and `npm run check:bundle` all pass.

## Risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Humor muddies rules | This game already has several timing-sensitive powers; unclear copy will create false bugs | Always pair flavor with a literal rules line; keep CTA labels literal |
| Motion adds dead time | The intent doc explicitly says the loop should feel snappy | Keep transitions short, make long sequences skippable, and honor reduced-motion |
| Presentation state leaks into engine | One-off animation flags in `GameState` will rot fast | Keep transient motion local to components; only add structured summary facts to the engine |
| CSS polish breaks responsiveness | The game already targets phone, tablet, and desktop | Limit motion to transform/opacity, test at existing breakpoints, and keep touch parity with focus states |
| Copy coverage regresses later | New animals or outcomes could ship with blank text | Add exhaustiveness tests over enums and union types |

## Dependencies

- Depends on Sprint 002's phase model, shop flow, and win condition remaining stable. This sprint is a polish pass on top of that foundation, not a rework of the loop.
- Internally, the work should land in this order: copy scaffolding first, structured summary events second, shared motion primitives third, component passes last.
- No new runtime dependencies should be introduced. Preact, CSS, and existing test tooling are enough.
- No external assets are required. This sprint must use the current sprite system and current build pipeline.
- Bundle budget remains the existing 150 KB gzipped JS cap enforced by `scripts/check-bundle-budget.mjs`.
