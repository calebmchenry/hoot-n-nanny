# Sprint 002: Playable and Beautiful Core Loop

## Overview

Sprint 001 proved the shell: Phaser boots, the canvas scales correctly, CI works, and the barn wireframe responds to touch. Sprint 002 has to turn that shell into an actual game. The current `src/` code is still a rectangle prototype with no herd, no shuffle, no scoring, no shop, and no presentation layer beyond flat fills. This sprint should replace that prototype with a complete single-player Night -> Trading Post -> Night loop that is fun to play and visually polished enough to stand on its own.

This draft makes three explicit scope decisions to keep the sprint coherent:

- **Single-player only.** No pass-and-play turn flow, shared market drafting, or scoreboard work yet.
- **Polished subset over broad roster.** Implement the full starting herd plus a deliberately chosen purchasable subset that creates meaningful builds without forcing a generic active-ability framework too early.
- **Beauty is a deliverable.** "Playable" is not enough. The final scene should have stylized card views, layered barn art, readable game-state feedback, and motion design that makes the loop feel intentional rather than merely functional.

The target outcome is a vertical-slice game build: start a night, draw animals, see warning and bust states clearly, score resources, buy new animals or barn space, and repeat. The final proof is not just unit tests. It is a set of deterministic `agent-browser` screenshots showing the game in attractive, believable states on the actual mobile-sized canvas.

## Use Cases

1. A player opens the game on a phone-sized viewport, sees a richly styled barn scene with a deck stack, barn slots, resource banner, farmhouse warning light, and clear primary actions, then starts drawing immediately.
2. The player draws into the barn and can visually parse each animal card at a glance: portrait, Mischief, Hay, NOISY! status, and any passive effect badge.
3. The player reaches two unmitigated NOISY! animals and gets a strong warning state before busting: lantern glow, UI accent shift, and a readable "farmer is stirring" cue.
4. The player busts either because the farmer wakes up or the barn overflows, sees a distinct animation and result overlay, and understands why they scored nothing and which animal was Penned Up.
5. The player ends a successful night, watches Mischief and Hay count up, enters a beautiful Trading Post, buys at least one new animal and one capacity upgrade, then starts another night with the updated herd.
6. A maintainer can reproduce specific showcase states via fixed seeds and verify them with `agent-browser` without relying on lucky random draws or internal debug hacks in production.

## Architecture

### Product Slice for Sprint 002

Sprint 002 should deliver the following playable card set:

- **Starting herd:** 4 Barn Cat, 4 Feral Goat, 2 Pot-Bellied Pig
- **Purchasable quiet animals:** Barn Cat, Pot-Bellied Pig, Bunny, Hermit Crab, Hen, Draft Pony
- **Purchasable risky/synergy animals:** Wild Boar, Strutting Peacock, Bard Frog, Bull Moose

This is intentionally not the full product roster. It is enough to support:

- flat-income builds
- Hay-focused capacity growth
- NOISY! mitigation
- NOISY! reward synergies
- BRINGER overcrowd risk

The following features should stay out of Sprint 002 unless all polish gates are already green:

- full active-ability framework
- Legendary Animals and win-condition logic
- scenarios beyond one default single-player pool
- local persistence beyond the current tab/session
- audio pass
- Release to the Wild

### Runtime and Scene Flow

The scene graph should remain simple and explicit:

```text
BootScene -> BarnScene -> TradingPostScene -> BarnScene -> ...
```

- `BootScene` remains the startup entrypoint, but it now does real preparation work: palette setup, generated texture registration, optional bitmap font preload, and scene-state marker initialization.
- `BarnScene` becomes the full Night scene. It owns presentation, animation orchestration, and player input for drawing, calling it a night, and acknowledging overlays.
- `TradingPostScene` is a separate scene, not an overlay. That keeps the shop layout simpler, lets the Night scene stay focused, and gives the sprint a clean place to add future market complexity.

Night-end feedback should be an overlay inside `BarnScene`, not a third summary scene. That keeps the moment-to-moment loop fast: draw -> warning/bust or score -> summary overlay -> transition to Trading Post.

### Game Logic Boundary

All game rules should live in a new `src/game/` module set so scenes stay thin and testable.

```text
src/game/
  animals.ts        # roster definitions, costs, static metadata
  types.ts          # GameSession, NightState, BarnCard, MarketOffer, NightEvent
  shuffle.ts        # seedable shuffle + fairness constraints
  night.ts          # start night, draw, bust checks, penned-up handling
  scoring.ts        # Mischief/Hay math and passive score effects
  shop.ts           # market generation, purchases, capacity upgrades
  session.ts        # top-level state transitions across nights
```

Recommended modeling approach:

- Store the long-lived game in a `GameSession`.
- Store the active round in a `NightState`.
- Return pure `NightEvent[]` arrays from rule functions so scenes can animate consequences without embedding rule logic in Phaser callbacks.

Example event shapes:

- `card_draw_started`
- `card_revealed`
- `warning_state_changed`
- `bust_triggered`
- `night_scored`
- `animal_penned_up`
- `purchase_completed`
- `capacity_upgraded`

This event-stream approach matters for beauty. The scene should not reverse-engineer state diffs to guess which animation to play; the rule engine should tell it what happened.

### Core Rule Decisions

To remove ambiguity in implementation, this sprint should lock in these rule details:

- **Penned Up animal on bust:** the bust-causing animal is Penned Up for the next night. This is deterministic, visible, and easy to explain in UI.
- **Barn Overwhelmed check:** if the number of animals in the barn exceeds `capacity` after all forced admissions resolve, the player busts immediately.
- **NOISY! warning threshold:** exactly 2 unmitigated NOISY! animals arms the warning state; 3 or more unmitigated NOISY! triggers Farmer Wakes Up.
- **Capacity cost curve:** start at 5 slots; each extra slot costs `2, 3, 4, 5...` Hay.
- **Session persistence:** state resets on refresh for Sprint 002. Keep serialization out of the critical path.

The shuffle should also be seedable and slightly fairness-aware. A pure Fisher-Yates shuffle is fine as the base, but Sprint 002 should allow limited rerolls when the starting herd would place too many permanent NOISY! animals at the very front even though a less punishing order is available. This supports the intent's fairness goal and makes showcase seeds more believable.

### Visual Rendering Approach

The current rectangle-only scene must be replaced by a lightweight pixel-art presentation layer that still respects the existing bundle budget. The cleanest approach is a hybrid:

- **Generated environment art:** use Phaser `Graphics` and `RenderTexture` in `BootScene` to generate the barn boards, straw floor, deck stack, panel backplates, button faces, and farmhouse/light textures at startup.
- **Generated animal portraits:** define compact sprite data for each Sprint 002 animal as low-resolution pixel masks and convert them to textures once at boot. This avoids a sprite-pack dependency while still producing actual pixel art.
- **One small pixel font asset is acceptable** if the generated/UI text does not look good enough. Keep it tiny and local; do not pull a full webfont stack from the network.

Render configuration should change accordingly:

- `pixelArt: true`
- `antialias: false`
- `roundPixels: true`

Recommended visual composition:

- A deep blue night-sky gradient at the top behind barn rafters
- Warm red-brown plank walls with darker beam silhouettes
- A straw/gold floor band anchoring the barn slots
- A visible farmhouse silhouette with a lantern window that can glow and flicker
- Wooden hanging signs for Mischief, Hay, and herd count
- A stacked deck object on one side so draws have a visible source
- Card slots with shadows and framed card art rather than raw boxes

Recommended palette:

- Night sky: `#10243F`, `#173A5E`, `#295C7A`
- Barn wood: `#6B3027`, `#8B3A3A`, `#A5563D`
- Straw/gold accents: `#D9A441`, `#F1C86A`
- UI parchment: `#F0E1BE`
- Warning amber: `#FFBE4D`
- Bust red: `#D94B3D`
- Success green: `#5C9B5D`

The final result should read as a real game screen, not "placeholders with better colors."

### Card Presentation

Each animal in the barn should appear as a stylized card, not just as a filled slot.

Each card should include:

- portrait panel
- animal name
- Mischief icon/value
- Hay icon/value
- NOISY! badge if applicable
- passive-effect keyword chip if applicable, such as `CALM`, `BONUS`, or `BRINGER`

Card size should stay within the current slot footprint for starting capacity but be flexible enough to shrink slightly as barn capacity expands. A dynamic layout helper should compute card bounds from capacity so 5, 6, 7, and 8-slot barns still look intentional on the fixed `390 x 844` canvas.

### Animation Implementation

Sprint 002 should use animation to clarify state, not as generic decoration.

Recommended animation plan:

- **Animal idle motion:** every portrait gets a simple 2-frame idle or a 1-2 pixel bob loop. Implement with Phaser animations or a timed texture swap, not a per-frame custom draw.
- **Draw sequence:** deck stack compresses slightly, the new card arcs from deck to slot over `180-220ms`, then lands with a short bounce and shadow settle.
- **Warning state:** farmhouse lantern alpha and scale tween in a looping yoyo, plus a subtle ambient tint shift on the resource banner while the warning is active.
- **Bust states:** camera shake for `120-160ms`, a single full-screen color flash, then a banner or overlay card drops in from above.
- **Successful score:** Mischief and Hay values count up with coin/hay icon pops; scored cards pulse once in sequence.
- **Trading Post purchases:** purchased card lifts, shrinks toward the herd stack badge, and the relevant resource counter decrements in sync.
- **Capacity upgrade:** the slot grid expands with a short plank-build animation so the player feels the barn growing.

Implementation guidance:

- Use `this.tweens.chain` or `this.tweens.timeline` for multi-step UI motions.
- Drive animations from `NightEvent[]` and shop events so visual sequencing mirrors rule sequencing.
- Avoid heavy `update()` loops. Most motion should be tween-driven or timer-driven.
- Generate textures once in `BootScene`; do not redraw assets every frame.

### Layout and Interaction

The existing layout helper is too narrow for Sprint 002. It should evolve from "five fixed slot rectangles and one button" into a reusable layout contract for:

- barn slot grid
- draw/call controls
- resource banner
- deck stack and herd-count badge
- warning light area
- end-of-night overlay
- trading-post offer cards
- shop action buttons

Interaction rules should remain consistent with `CLAUDE.md`:

- `pointerdown` only
- minimum 44 x 44 tap targets
- portrait-first layout using the existing logical canvas

The player-facing Night states should be explicit:

- `ready_to_draw`
- `animating_draw`
- `player_decision`
- `warning`
- `bust`
- `night_summary`

The scene should expose those coarse phases via DOM data attributes on `#game-container` so both Playwright and `agent-browser` can wait for stable moments without private inspector hooks.

### Verification Hooks

Sprint 001 already exposes `window.__GAME_READY__`. Sprint 002 should keep that and add stable, coarse-grained verification surfaces:

- `#game-container[data-scene="Barn" | "TradingPost"]`
- `#game-container[data-phase="ready_to_draw" | "player_decision" | "warning" | "bust" | "night_summary" | "shop"]`
- `#game-container[data-noisy-count="0-3"]`
- `#game-container[data-capacity="5-8"]`

Deterministic seeds should be supported through a query parameter such as `?seed=sprint2-warning`. Seeded shuffles should work in both dev and preview builds. Any direct state-mutation helpers used to accelerate local debugging should be development-only and must not ship as a writable production API.

## Implementation

The implementation should be phased so rule correctness arrives before polish, but polish is not treated as optional cleanup at the end.

### Phase 1: Rules Engine and Deterministic State (~25%)

Primary goal: replace the fake slot-state model with a real session/night model that can be tested without Phaser.

Tasks:

- Create `src/game/` with typed models for animals, herd contents, market offers, barn cards, and event output.
- Implement the Sprint 002 roster definitions, including starter herd and at least 8 purchasable animals.
- Implement seedable shuffle behavior and encode a small set of named verification seeds.
- Implement the Night reducer flow:
  - start night
  - draw one animal
  - resolve passive on-entry effects needed for Sprint 002
  - check warning state
  - check bust state
  - call it a night
  - score Mischief/Hay
  - mark Penned Up animal after bust
- Implement shop rules:
  - generate Trading Post offers from the Sprint 002 pool
  - spend Mischief on animals
  - spend Hay on capacity
  - start next night with updated herd/capacity

Tests to add first:

- starter herd composition
- shuffle determinism for a known seed
- NOISY! warning at 2 and bust at 3
- overcrowd bust after BRINGER resolution
- Bunny mitigation affecting warning/bust/scoring
- scoring math for Hermit Crab, Draft Pony, Bard Frog
- capacity cost progression
- purchase failure on insufficient Mischief/Hay

### Phase 2: Night Scene Rewrite and Dynamic Layout (~25%)

Primary goal: turn `BarnScene.ts` from a rectangle demo into a real Night interface driven by the game module.

Tasks:

- Rewrite `BarnScene.ts` around a `GameSession` + `NightState` rather than `SlotState[]`.
- Expand `barnLayout.ts` to compute dynamic card positions for 5-8 slots and all primary Night HUD regions.
- Replace the single `DRAW ANIMAL` button with a proper action bar:
  - `Draw Animal`
  - `Call It a Night`
  - disabled/loading states during animation
- Add a deck-stack view, resource banner, herd counter, Penned Up reminder, and warning-light anchor.
- Add a night-summary overlay that shows:
  - result label: success, Farmer Wakes Up, or Barn Overwhelmed
  - Mischief/Hay earned or lost
  - Penned Up animal if bust occurred
  - primary action to continue to Trading Post
- Update coarse scene markers and keep `window.__GAME_READY__` accurate after scene creation.

Acceptance bar for the phase:

- A player can complete a Night without touching the shop yet.
- No rule logic lives in Phaser callback methods beyond delegating to pure helpers and consuming returned events.
- Layout still fits within the existing logical canvas at 375px mobile width.

### Phase 3: Trading Post Scene and Loop Closure (~20%)

Primary goal: finish the playable loop so a successful or failed night always leads somewhere meaningful.

Tasks:

- Add `TradingPostScene.ts` and `tradingPostLayout.ts`.
- Show current Mischief, current Hay, herd size, current capacity, and next capacity cost.
- Render 6-8 market offers in a readable mobile layout. Two columns of cards or a horizontal carousel are both acceptable; the key is legibility and touch comfort.
- Implement purchase interactions for animals and capacity.
- Animate successful purchases into the herd/capacity display.
- Add a `Start Next Night` action that returns to `BarnScene` with updated state.

Scope guardrail:

- Keep the shop roster small and curated.
- Do not build a generalized market-stocking system for future scenarios yet.
- Do not add passive income or multi-step confirmation flows unless the UI truly needs them.

### Phase 4: Art Pass and Animation Pass (~20%)

Primary goal: meet the "beautiful" requirement explicitly.

Tasks:

- Add generated textures for barn boards, straw, warning lantern, wooden UI plates, and card frames.
- Add generated animal portrait textures for every Sprint 002 animal, each with a tiny idle loop.
- Tune card art, text hierarchy, iconography, shadows, and spacing until the screen feels composed rather than crowded.
- Implement the draw, warning, bust, scoring, purchase, and capacity-upgrade animations described in Architecture.
- Add subtle atmosphere:
  - low-alpha floating dust motes or straw specks
  - lantern glow
  - moonlit edge highlights on UI frames
- Ensure every final player-facing element is textured or stylized. Raw debug rectangles should be removed or hidden in production builds.

Beauty gate for this phase:

- If the screen still reads as flat UI blocks with labels, the sprint is not done.
- If the scene becomes visually dense but unreadable on a phone, the sprint is also not done.

### Phase 5: Verification, Browser Proof, and Hardening (~10%)

Primary goal: prove the loop works and looks good under deterministic conditions.

Automation tasks:

- Extend unit coverage for `src/game/`.
- Update the existing Playwright smoke test to assert scene markers instead of only canvas visibility.
- Add one seeded browser-flow test that reaches the Trading Post and verifies a purchase changes state.
- Run `npm run ci` and `npm run test:e2e`.
- Run bundle budget validation after the art pass.

`agent-browser` proof steps:

1. Run `npm run dev`.
2. Open the game at `390 x 844` viewport and wait for:
   - `window.__GAME_READY__ === true`
   - `#game-container[data-scene="Barn"]`
3. Visit `/hoot-n-nanny/?seed=sprint2-opening` and capture `01-opening-barn.png`.
   - Expected: textured barn, starter herd counters, deck stack, empty/starting slots, polished action bar.
4. Visit `/hoot-n-nanny/?seed=sprint2-warning`, draw until `data-noisy-count="2"` and `data-phase="warning"`, then capture `02-warning-state.png`.
   - Expected: visible lantern glow, warning accent color, two NOISY! cards clearly visible.
5. Visit `/hoot-n-nanny/?seed=sprint2-farmer-bust`, draw until `data-phase="bust"` and capture `03-farmer-bust.png`.
   - Expected: bust overlay, farmer wake-up visual treatment, zero-score summary.
6. Visit `/hoot-n-nanny/?seed=sprint2-score-shop`, play to a successful summary and capture `04-success-summary.png`.
   - Expected: counted-up Mischief/Hay totals and readable scoring breakdown.
7. Continue into Trading Post from the same seed and capture `05-trading-post.png`.
   - Expected: attractive offer layout, current resources, capacity upgrade affordance.
8. Buy one animal and one capacity upgrade, start the next night, wait for `data-capacity="6"`, and capture `06-second-night-after-purchase.png`.
   - Expected: updated herd/capacity reflected in the Night UI.
9. Repeat at least one seeded flow against `npm run preview` to ensure the proof does not depend on dev-only state.

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/config/constants.ts` | Extend | Shared palette, timings, capacity costs, layout constants, UI tokens |
| `src/config/game.ts` | Extend | Add `pixelArt`, render flags, and scene registration for Trading Post |
| `src/scenes/BootScene.ts` | Rewrite | Register generated textures, optional font preload, then start Barn |
| `src/scenes/BarnScene.ts` | Rewrite | Full Night scene, overlays, event-driven animations, DOM scene markers |
| `src/scenes/TradingPostScene.ts` | Create | Shop scene for purchases and next-night transition |
| `src/scenes/barnLayout.ts` | Rewrite | Dynamic Night layout for cards, HUD, buttons, and overlays |
| `src/scenes/tradingPostLayout.ts` | Create | Mobile-safe shop layout helper |
| `src/types/index.ts` | Extend | Add `SceneKey.TradingPost` and any shared scene payload types |
| `src/game/types.ts` | Create | Core state and event types |
| `src/game/animals.ts` | Create | Sprint 002 animal metadata and market pool |
| `src/game/shuffle.ts` | Create | Seedable, testable shuffle logic |
| `src/game/night.ts` | Create | Night flow reducer and bust checks |
| `src/game/scoring.ts` | Create | Mischief/Hay computation and passive bonuses |
| `src/game/shop.ts` | Create | Offer generation, purchases, and capacity upgrades |
| `src/game/session.ts` | Create | Cross-scene state transitions and next-night setup |
| `src/rendering/animalSpriteData.ts` | Create | Compact pixel-mask definitions for Sprint 002 animals |
| `src/rendering/textureFactory.ts` | Create | Generated textures for environment, cards, icons, and lantern |
| `src/rendering/animationTokens.ts` | Create | Centralized animation timings and easing choices |
| `src/game/night.test.ts` | Create | Unit tests for draw flow, bust logic, and Penned Up behavior |
| `src/game/scoring.test.ts` | Create | Unit tests for scoring and passive effects |
| `src/game/shop.test.ts` | Create | Unit tests for purchases and capacity growth |
| `src/scenes/barnLayout.test.ts` | Extend | Validate dynamic layouts for expanded capacity |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Assert scene markers and stable boot on mobile viewport |
| `tests/e2e/seeded-night-flow.spec.ts` | Create | Seeded end-to-end path into Trading Post and back |

## Definition of Done

- The wireframe slot-cycling behavior is gone; the game runs on real herd/deck state.
- A player can complete at least two full single-player loops in one session: Night -> Trading Post -> Night.
- Starting herd is exactly 4 Barn Cat, 4 Feral Goat, and 2 Pot-Bellied Pig.
- The game supports at least 8 purchasable animals in the Trading Post.
- Both bust conditions work and are visually distinct.
- Two unmitigated NOISY! animals visibly arm the warning state before the third busts the player.
- Successful nights score Mischief and Hay correctly, including Sprint 002 passive effects.
- Trading Post purchases update herd contents and capacity correctly for the next night.
- The Night and Trading Post screens look intentionally art-directed on a `390 x 844` canvas; player-facing elements are no longer bare flat rectangles.
- Draws, warnings, busts, score reveals, and purchases all have motion feedback implemented with Phaser tweens/animations.
- `window.__GAME_READY__` and scene data attributes expose stable verification markers.
- `agent-browser` screenshots exist for opening Night, warning state, bust state, success summary, Trading Post, and second night after purchase.
- Unit tests cover core rule paths, Playwright passes, and `npm run ci` succeeds.
- Bundle budget still passes after the visual pass.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope drift into full roster and active abilities | Playable/beautiful core loop slips | Freeze the Sprint 002 animal set early and treat broader abilities as explicit out-of-scope work |
| Visual ambition turns into asset sprawl | Build becomes large and art integration slows the sprint | Prefer generated textures and compact sprite data; if one font asset is added, keep it tiny and local |
| Animation code becomes tangled with rule logic | Bugs become hard to reason about and polish regresses correctness | Return typed events from pure game functions and let scenes consume them as animation cues |
| Dynamic slot layout breaks as capacity grows | Expanded barns look cramped or overlap on mobile | Add layout tests for 5-8 slots and design card scaling rules before art is finalized |
| Browser proof becomes flaky because of randomness | Verification becomes slow and untrustworthy | Add seedable shuffles, stable scene markers, and named showcase seeds from the start |
| The game remains technically correct but aesthetically flat | Sprint misses the user's explicit quality bar | Define beauty gates in Phase 4 and do not close the sprint while placeholder-looking UI remains |

## Security Considerations

- The app remains a static client-only site. No backend, auth, or secret handling should be introduced in Sprint 002.
- Do not fetch art, fonts, or data from third-party CDNs at runtime. All assets should be local or generated at boot.
- Any debug-only controls used to speed up local verification must be gated behind development checks and must not expose arbitrary state mutation in production.
- Query-param seed handling should accept only bounded string/number input and should never be used to evaluate code.
- If session state is later persisted, use a versioned schema and defensive parsing to avoid crashes on malformed local data.

## Dependencies

- Existing stack: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, current CI/test harness
- Existing canvas contract: `390 x 844` logical resolution with `Scale.FIT`
- Existing bundle discipline: Phaser chunk under `400KB` gzipped and app chunk under `100KB` gzipped
- New module dependency inside the repo: a multi-file `src/game/` package for pure rules
- Verification dependency: `agent-browser` must be available in the development environment for screenshot proof
- Optional art dependency: one tiny permissive bitmap font asset is acceptable if generated text styling is insufficient

No new gameplay framework dependency should be added for Sprint 002. Phaser already covers rendering, scene transitions, tweens, and input.

## Open Questions

1. Should Sprint 002 include exactly one active ability card, such as `Wise Owl`, to prove the interaction model early, or should all active abilities stay deferred until the passive/triggered core loop is fully polished?
2. Is session-only state acceptable for this sprint, or does the user want the solo loop to survive refresh via `localStorage` immediately?
3. Should the visual system use a tiny bitmap font asset, or should Sprint 002 stay fully generated/procedural even if that slightly limits typography quality?
