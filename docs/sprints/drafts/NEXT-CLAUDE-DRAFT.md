# Sprint 003 — "Personality & Polish"

## Overview

This sprint takes Hoot N' Nanny from functional to *charming*. The game loop is complete — every mechanic works, every phase exists — but the experience is flat. Transitions are instant. Animals appear without ceremony. Scoring is a static readout. The UI has no voice.

Sprint 003 adds two things: **animation juice** (items 25) and **written personality** (item 24). These are deeply coupled — a witty description that slides in with a bounce lands differently than one that simply appears. A scoring tally that counts up while a fun quip plays underneath it feels alive. Doing them together means every surface gets one cohesive pass instead of two disjoint ones.

**What "done" looks like:** The game feels like it was made by someone who loves it. Animals bounce into the barn. Scoring counts up dramatically. Phase transitions have visual rhythm. Every piece of UI copy has a voice — warm, goofy, a little bit country. A stranger landing on the GitHub Pages link should smile within the first 10 seconds.

---

## Architecture

### Design Principles

1. **CSS-first animation.** Every animation uses CSS transitions and `@keyframes`. No JavaScript animation libraries — the bundle stays small, animations are GPU-composited, and the retro aesthetic benefits from discrete `steps()` easing. JS only orchestrates *when* classes are applied, never *how* things move.

2. **Copy lives in data, not components.** All flavor text, quips, and UI copy moves into dedicated data files (`src/ui/copy.ts` for UI strings, extended `description` fields in `catalog.ts` for animals). Components render what they're given. This keeps the personality layer editable without touching rendering code.

3. **Animation states flow through game state.** Phase transitions get a brief intermediate state (e.g., `night-entering`, `shop-entering`) so CSS can hook into entry/exit animations via data attributes. The game engine controls timing; CSS controls visuals.

4. **No new dependencies.** Everything is achievable with CSS animations, Preact's existing rendering model, and a single new `copy.ts` file. The bundle budget stays untouched.

### Key Architectural Decisions

- **Staggered entry via CSS `animation-delay` computed from slot index**, not JS timeouts. Each barn slot gets `--slot-index` as a CSS custom property; the animation delay is `calc(var(--slot-index) * 60ms)`. Simple, declarative, no cleanup.

- **Scoring tally uses a lightweight JS counter** (requestAnimationFrame loop in NightSummaryModal) that increments displayed numbers toward their targets. This is the one place JS drives animation because CSS can't animate text content. The counter is ~20 lines, not a library.

- **Phase transition timing uses a `transitionPhase` field on game state** — a string like `'barn-to-summary'` | `'summary-to-shop'` | `'shop-to-barn'` | `null`. The App component sets this before changing `phase`, waits ~400ms via setTimeout, then updates `phase`. Components use `data-transition` attributes to trigger CSS exit/enter animations.

---

## Implementation Phases

### Phase 1: Animation Infrastructure (est. ~30% of work)

**Goal:** Build the plumbing that all animations hook into.

1. **Add `transitionPhase` to `GameState`** in `types.ts`. Values: `'exiting-night'` | `'entering-summary'` | `'exiting-summary'` | `'entering-shop'` | `'exiting-shop'` | `'entering-night'` | `null`.

2. **Update `App.tsx` reducer** to handle a new `SET_TRANSITION` intent. When the engine produces a phase change (e.g., `CONTINUE_FROM_SUMMARY` → shop), the reducer:
   - Sets `transitionPhase` to the exit value
   - After 350ms (setTimeout), sets `transitionPhase` to the enter value and updates `phase`
   - After another 350ms, clears `transitionPhase` to `null`

3. **Add `data-transition` attribute** to the root layout containers in `App.tsx` so CSS can target `[data-transition="exiting-night"]`, etc.

4. **Create `src/styles/animations.css`** with shared keyframes:
   - `@keyframes slide-in-up` — entrance from below (elements)
   - `@keyframes slide-out-down` — exit downward
   - `@keyframes fade-in` / `@keyframes fade-out`
   - `@keyframes pop-in` — scale from 0.8 to 1.0 with overshoot to 1.05
   - `@keyframes bounce-in` — for animals entering barn slots
   - `@keyframes count-pulse` — subtle scale pulse for number changes
   - `@keyframes wiggle` — small rotation wiggle for emphasis
   - `@keyframes flash-attention` — opacity pulse for activate ability reminder

5. **Add `--slot-index` CSS custom property** to barn slot rendering in `BarnGrid.tsx`.

### Phase 2: Barn Animations (est. ~25% of work)

**Goal:** The hootenanny phase feels alive.

1. **Animal entry animation.** When an animal is invited, its barn slot gets class `entering`. CSS: `animation: bounce-in 300ms steps(4, end) both; animation-delay: calc(var(--slot-index) * 0ms)` (no stagger for single entry — stagger is for initial barn load if we ever show it). The bounce uses `steps()` for the retro pixel-snap feel.

2. **Barn slot idle micro-animation.** Animals in the barn get a very subtle `hover-bob` (1px up/down, 2s loop, `steps(2, end)`). Staggered by slot index so they don't all bob in sync. This makes the barn feel alive even when the player isn't acting.

3. **Ability activation feedback.** When an activate ability is used:
   - The slot gets class `ability-fired` → brief flash/glow (box-shadow pulse, 200ms)
   - The power badge fades out with `fade-out 200ms`

4. **Activate ability reminder.** When the barn is at capacity and unused activate abilities exist, those slots get class `attention` → `flash-attention` animation (opacity 0.7↔1.0, 800ms loop). Per the game design doc: "flash tastefully."

5. **Bust animation.** On bust:
   - Barn container gets class `busted` → `screen-shake` keyframe (4-frame shake, 400ms)
   - All animal slots simultaneously get `fade-out` (200ms delay after shake)
   - Red overlay flash (pseudo-element, opacity 0→0.3→0, 500ms)

6. **Door and window interaction feedback.** Clicking the door or window gets a `pop-in` animation on the icon. Selected state gets a subtle glow (box-shadow transition).

### Phase 3: Scoring & Summary Animation (est. ~15% of work)

**Goal:** Scoring feels dramatic and rewarding.

1. **Tally counter animation.** In `NightSummaryModal.tsx`, replace static number display with an animated counter:
   - Pop counts up from 0 → final value over ~1.5s (ease-out curve)
   - Cash counts up similarly, starting 500ms after Pop finishes
   - Each number gets `count-pulse` animation on each increment
   - Use `requestAnimationFrame` with a simple lerp

2. **Resolution log stagger.** Each line item in the scoring log slides in from the left with 80ms stagger (CSS `animation-delay` computed from index). Items enter as the counter reaches their contribution.

3. **Summary modal entrance.** The modal backdrop fades in (200ms) while the content panel slides up with `pop-in` (300ms, 100ms delay).

4. **"Call It a Night" button feedback.** When clicked, the button gets a brief press animation (scale 0.95, 100ms) before the transition fires.

### Phase 4: Shop & Phase Transition Animation (est. ~15% of work)

**Goal:** Moving between phases feels smooth; the shop is tactile.

1. **Phase transition choreography.**
   - Night → Summary: barn dims (opacity 0.5, 300ms), summary modal slides up
   - Summary → Shop: summary slides down, barn fades out, shop fades in from below
   - Shop → Night: shop slides out right, barn fades in with a brief "curtain rising" feel (slide from bottom)

2. **Shop card entrance.** Cards stagger in with `slide-in-up` + `fade-in`, 50ms apart. Blue ribbon cards enter last with a slightly bigger `pop-in` to draw attention.

3. **Purchase feedback.** On buying an animal:
   - The card gets `wiggle` animation (200ms)
   - Pop/Cash counters in the header pulse with `count-pulse`
   - Stock number decrements with a brief fade-swap

4. **Sold-out transition.** When stock hits 0, the card gets class `sold-out-transition` → grayscale filter fades in over 300ms, opacity dims.

5. **Hootenanny button.** Pulsing subtle glow when the player has enough resources for something meaningful (or always, to draw them forward). Brief `pop-in` on hover.

### Phase 5: Humor & Personality Pass (est. ~15% of work)

**Goal:** Every piece of text has a voice.

1. **Create `src/ui/copy.ts`** — centralized UI copy:
   ```typescript
   export const COPY = {
     // Phase titles
     nightTitle: (n: number) => `Night ${n} — Let's Get Loud`,
     shopTitle: 'The Trading Post',

     // Actions
     inviteGuest: 'Invite a Guest',
     callItANight: 'Call It a Night',
     hootenanny: 'Back to the Barn!',

     // Inspector - empty states
     shopForUpgrades: 'Browse the goods, partner.',

     // Scoring
     bustMessage: 'The farmer woke up! Party\'s over.',
     winMessage: 'Three blue ribbons! You\'re a legend.',

     // Randomized flavor
     bustQuips: [
       'Somebody woke the farmer. Scatter!',
       'Too much noise! The rooster\'s crowing.',
       'Busted. The barn goes quiet.',
       'You pushed your luck and your luck pushed back.',
     ],
     nightStartQuips: [
       'The barn doors creak open...',
       'Another night, another hootenanny.',
       'The animals are restless. Let\'s party.',
       'Who\'s coming to the barn tonight?',
     ],
     scoringQuips: [
       'Not bad for a barn party.',
       'The crowd goes mild!',
       'Ka-ching! Well, ka-cluck.',
       'Tallying up the good times.',
     ],
     shopQuips: [
       'What\'ll it be, partner?',
       'Fresh critters, fair prices.',
       'Upgrade your farm, upgrade your life.',
       'Every animal deserves a party.',
     ],
   }
   ```

2. **Rewrite animal descriptions in `catalog.ts`.** Every animal gets a flavorful 1-2 sentence description. Examples:
   - Goat: `"Loud, proud, and not sorry about it. Has never once been invited to a party politely."`
   - Chicken: `"Doesn't do much, but shows up reliably. The friend who brings nothing to the potluck but good vibes."`
   - Owl: `"Knows who's coming next. Annoyingly smug about it."`
   - Border Collie: `"Can fetch literally anyone from anywhere. Has never not been a good boy."`
   - Dragon: `"Kicks out whoever it wants. Nobody argues with a dragon."`
   - Swan: `"Gets more popular every time it shows up. The swan knows what the swan is worth."`

3. **Add power flavor text** — each power ID gets a short personality description beyond the mechanical one:
   - Noisy: `"Can't help it. Born this way."`
   - Stacks: `"The more the merrier — and they only take up one spot."`
   - Calm: `"Shhhh. It's handling the noise situation."`
   - Fetch: `"Goes and gets exactly who you want. Good boy/girl/creature."`

4. **Season all UI touchpoints:**
   - Inspector panel: contextual quips when selecting animals, door, window
   - Shop inspector: personality in the hover descriptions
   - Night summary: randomized quip above the tally
   - Win screen: celebratory flavor text, not just "You win"
   - Bust screen: commiserating quip
   - Targeting overlay: flavor-appropriate headers ("Who's getting the boot?" for kick, "Who are you fetching?" for fetch)

5. **Tooltip-style flavor on shop cards.** When hovering/focusing a shop card, the inspector shows the animal's personality description *above* the mechanical description. Personality first, then rules.

### Phase 6: Win Screen & Final Polish (est. ~remaining)

**Goal:** The ending is memorable. Final consistency pass.

1. **Win screen overhaul.**
   - Blue ribbon animals enter one at a time with `pop-in` stagger (500ms apart)
   - Confetti-style effect: CSS-only, using multiple animated pseudo-elements with random rotation and fall (3-4 "ribbons" falling, looped)
   - Victory text types in character-by-character (CSS `steps()` animation on `max-width` or `clip-path`)
   - "Play Again" button bounces in after the reveal

2. **Button press feedback everywhere.** All interactive buttons get:
   - `:active` → `transform: scale(0.96); transition: transform 80ms`
   - Brief box-shadow reduction on press

3. **Hover states audit.** Every interactive element should have:
   - Cursor: pointer
   - Subtle lift or glow on hover
   - Color shift on disabled (not just opacity)

4. **Consistency pass** — ensure animation timings, easings, and retro `steps()` usage are consistent across all components.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/ui/copy.ts` | Centralized UI copy, quips, flavor text |
| `src/styles/animations.css` | Shared keyframes and animation utility classes |

### Modified Files
| File | Changes |
|------|---------|
| `src/game/types.ts` | Add `transitionPhase` to `GameState` |
| `src/game/catalog.ts` | Rewrite all animal `description` fields with personality |
| `src/game/engine.ts` | Minimal: ensure transition-related intents are handled cleanly |
| `src/app/App.tsx` | Transition orchestration logic, `data-transition` attributes, import `animations.css` |
| `src/ui/BarnGrid.tsx` | `--slot-index` CSS var, entry/attention/bust classes, idle bob |
| `src/ui/NightSummaryModal.tsx` | Animated tally counter, staggered log, quip display, modal entrance animation |
| `src/ui/InspectorPanel.tsx` | Import and use `copy.ts`, contextual quips, personality descriptions |
| `src/ui/TradingPostScreen.tsx` | Card entrance stagger, purchase animation triggers, quip header |
| `src/ui/ShopCard.tsx` | Purchase wiggle, sold-out transition, enhanced hover |
| `src/ui/ShopInspector.tsx` | Personality-first descriptions from `copy.ts` |
| `src/ui/TargetingOverlay.tsx` | Flavor-appropriate headers per ability type |
| `src/ui/WinScreen.tsx` | Staggered reveal, confetti, character-by-character title, celebratory copy |
| `src/styles/app.css` | Barn animations, bust shake, entry bounce, idle bob, button press, phase transitions |
| `src/styles/shop.css` | Card entrance stagger, purchase feedback, sold-out transition, enhanced hovers |
| `src/styles/win.css` | Confetti effect, staggered reveal, typewriter title |

### Untouched Files
| File | Reason |
|------|--------|
| `src/game/shop.ts` | No logic changes needed — shop generation stays the same |
| `src/game/selectors.ts` | Read-only queries unchanged |
| `src/game/rng.ts` | Untouched |
| `src/input/useControls.ts` | Keyboard navigation unchanged |
| `src/ui/BarnUpgradeCard.tsx` | Minor hover polish via shared CSS, no component changes |
| `src/ui/AnimalSprite.tsx` | Sprites unchanged — animation happens at the slot level, not the SVG level |

---

## Definition of Done

### Personality
- [ ] Every animal (all 19) has a unique, flavorful description (1-2 sentences, "goofy, warm, scrappy" tone)
- [ ] Every power has both a mechanical description and a personality-flavored quip
- [ ] All hardcoded UI strings are replaced with imports from `copy.ts`
- [ ] Night start, scoring, bust, shop, and win phases each display a randomized contextual quip
- [ ] Targeting overlay headers are flavor-appropriate per ability type
- [ ] Inspector panel shows personality description above mechanical description for animals
- [ ] A non-developer reading the UI copy would describe the tone as "funny" or "charming"

### Animation
- [ ] Animals bounce into barn slots on invite (retro `steps()` easing)
- [ ] Barn animals have subtle idle bob animation (staggered, not synchronized)
- [ ] Bust triggers screen shake + red flash + animal fadeout
- [ ] Unused activate abilities pulse when barn is at capacity
- [ ] Ability activation produces a visual flash/glow on the slot
- [ ] Night summary modal slides in; tally counts up (Pop then Cash); log lines stagger in
- [ ] Phase transitions have choreographed exit/enter animations (~350ms each direction)
- [ ] Shop cards stagger in on phase entry; blue ribbon cards enter with emphasis
- [ ] Purchasing an animal produces a wiggle + counter pulse
- [ ] Sold-out cards transition smoothly to dimmed/grayscale state
- [ ] Win screen: blue ribbon animals reveal one at a time, confetti effect, title types in
- [ ] All buttons have `:active` press feedback (scale 0.96)
- [ ] All interactive elements have hover states (lift, glow, or cursor change)

### Quality
- [ ] Zero new JS dependencies added
- [ ] All animations use CSS `@keyframes` except the scoring counter (rAF)
- [ ] Animations respect `prefers-reduced-motion: reduce` (disable non-essential motion)
- [ ] Existing E2E tests (`tests/shop-and-win.spec.ts`) still pass
- [ ] Existing unit tests still pass
- [ ] No layout shift from animations (all animated elements have explicit dimensions or `will-change`)
- [ ] Bundle size increase < 5KB gzipped (copy + CSS, no new deps)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Animation timing conflicts with game logic** — setTimeout-based transitions could race with rapid user input | Medium | Medium | Disable user input during transition phases. `transitionPhase !== null` → all intents are no-ops. |
| **`steps()` easing looks janky at non-integer pixel values** | Low | Low | Test at common viewport sizes. Use even pixel values for transform distances. |
| **Tally counter feels sluggish on long nights** — high Pop/Cash values make counting take too long | Medium | Low | Cap counter duration at 2s regardless of value. Use non-linear easing (fast at start, slows near end). |
| **Personality text reads as "trying too hard"** | Medium | Medium | Write first, then edit ruthlessly. Aim for *one* joke per description, not three. Let most descriptions be warm rather than funny. |
| **Phase transition delays make gameplay feel slow** | Medium | High | Keep total transition time ≤ 700ms (350ms out + 350ms in). If playtesting feels sluggish, cut to 200ms each. Fast > smooth. |
| **`prefers-reduced-motion` disabling too much** | Low | Low | Only disable decorative motion (bob, confetti, entrance stagger). Keep functional animations (tally counter, phase changes) but make them instant instead of animated. |
| **Staggered animations cause re-render storms in Preact** | Low | Medium | All stagger is CSS-only via `animation-delay`. No JS re-renders per stagger step. |

---

## Dependencies

### Internal
- **Sprint 002 complete and stable.** All game phases, scoring, shop, and win mechanics must be working. (Confirmed: Sprint 002 is merged.)
- **Existing E2E and unit tests passing** as a baseline before any changes.

### External
- **None.** No new packages, no sourced assets, no API calls. This is entirely creative work on top of the existing codebase.

### Ordering Constraints
- Phase 1 (animation infrastructure) must land before Phases 2-4 and 6.
- Phase 5 (personality) is independent of Phases 1-4 and can be done in parallel or in any order.
- Phase 6 (win screen + final polish) should come last as a consistency pass.
