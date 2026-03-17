# Sprint 003: Card Readability, Active Abilities, and Legendary Win Condition

## Overview

Sprint 002 delivered a complete playable loop (Night -> Trading Post -> Night) with deterministic seeds, shop purchases, scoring, and bust states. Sprint 003 should build directly on that architecture and close the biggest usability and progression gaps:

- Card values are hard to read at play speed.
- Animal abilities are mostly invisible or unimplemented.
- There is no explicit end goal.

This sprint introduces five player-facing outcomes as hard requirements:

1. Card readability overhaul with larger, higher-contrast resource indicators.
2. Bottom info panel on long-press (touch) and hover (desktop).
3. New win condition: **3 Legendary Animals in the barn simultaneously**.
4. Active abilities for Sheepdog (peek), Stable Hand (boot), Border Collie (fetch), Cheerful Lamb (refresh).
5. Legendary cards in Trading Post at high costs with distinct glow/animation treatment.

Scope guardrails for Sprint 003:

- Keep single-player loop and existing scene flow (`Boot -> Barn -> TradingPost -> Barn`).
- Do not introduce new npm dependencies.
- Keep game rules in `src/game/*`; scenes stay render/input orchestration only.
- Keep deterministic behavior for seeded test runs.

## Use Cases

1. **Readable draw decisions**: Player draws a card and can immediately read Mischief/Hay values and trait tags (`NOISY`, `ACTIVE`, `LEGENDARY`) without opening extra UI.
2. **Info on demand**: Player long-presses a card on mobile (or hovers on desktop) and gets a bottom info panel with name, stats, traits, and full ability text.
3. **Sheepdog peek flow**: Player taps Sheepdog in barn, previews next card, then explicitly accepts or rejects it.
4. **Stable Hand boot flow**: Player taps Stable Hand, selects one barn animal, and that animal is removed and marked Penned Up for next Night.
5. **Border Collie fetch flow**: Player taps Border Collie, selects a target animal type from available deck options, and one matching card enters barn immediately.
6. **Cheerful Lamb refresh flow**: Player taps Cheerful Lamb and all other used active abilities become usable again this Night.
7. **Legendary progression**: Player sees Legendary offers in Trading Post with premium price and visual distinction, buys them, and builds toward a clear win path.
8. **Victory trigger**: As soon as the third Legendary is simultaneously present in barn, Night transitions to win overlay and session is marked won.

## Architecture

### Core Architectural Decisions

- Extend current event-driven rule pipeline (`NightEvent[]`) rather than adding scene-only ability logic.
- Represent active ability usage at card-instance granularity (`card.id`) so refresh mechanics are deterministic.
- Introduce explicit pending decision state in `NightState` for abilities requiring player choice (peek/boot/fetch targets).
- Keep Trading Post as a separate scene, but split market rendering into Regular vs Legendary sections.

### Type System Changes (`src/game/types.ts`)

Proposed additions (shape-level contract):

```ts
export type AnimalId =
  | 'BarnCat' | 'FeralGoat' | 'PotBelliedPig'
  | 'Bunny' | 'Hen' | 'WildBoar' | 'HermitCrab' | 'DraftPony' | 'StruttingPeacock' | 'MilkmaidGoat' | 'HoneyBee'
  | 'Sheepdog' | 'StableHand' | 'BorderCollie' | 'CheerfulLamb'
  | 'GoldenGoose' | 'GiantOx' | 'Jackalope' | 'Thunderbird';

export type AbilityId = 'peek' | 'boot' | 'fetch' | 'refresh';
export type TraitTag = 'NOISY' | 'PASSIVE' | 'ACTIVE' | 'TRIGGERED' | 'BRINGER' | 'LEGENDARY';

export interface ActiveAbilityDef {
  id: AbilityId;
  description: string;
  timing: 'manual';
}

export interface AnimalDef {
  id: AnimalId;
  name: string;
  costMischief: number | null;
  mischief: number;
  hay: number;
  noisy: boolean;
  noisyMitigation: number;
  givesHermitCrabBonus: boolean;
  givesDraftPonyBonus: boolean;
  inShop: boolean;
  legendary: boolean;
  traitTags: TraitTag[];
  activeAbility: ActiveAbilityDef | null;
}

export interface CardAbilityState {
  cardId: string;
  abilityId: AbilityId;
  used: boolean;
}

export type PendingDecision =
  | { kind: 'peek'; sourceCardId: string; previewCard: CardInstance }
  | { kind: 'boot'; sourceCardId: string; validTargetCardIds: string[] }
  | { kind: 'fetch'; sourceCardId: string; validAnimalIds: AnimalId[] };

export interface WinState {
  achieved: boolean;
  legendaryCount: number;
  requiredLegendaryCount: 3;
  achievedAtNight: number | null;
}

export enum GamePhase {
  ReadyToDraw = 'ready_to_draw',
  AnimatingDraw = 'animating_draw',
  PlayerDecision = 'player_decision',
  Warning = 'warning',
  AbilityDecision = 'ability_decision',
  Bust = 'bust',
  NightSummary = 'night_summary',
  Win = 'win',
  Shop = 'shop',
}

export interface NightState {
  // existing fields...
  abilityStates: Record<string, CardAbilityState>;
  pendingDecision: PendingDecision | null;
  legendaryCount: number;
  wonThisNight: boolean;
}

export interface GameSession {
  // existing fields...
  winState: WinState;
  activePennedUpCardIds: string[];
  pendingPennedUpCardIds: string[];
}
```

### Expanded Event Contract (`NightEvent`)

Keep existing event variants and add ability + win events:

```ts
export type NightEvent =
  // existing events...
  | { type: 'ability_became_ready'; cardId: string; abilityId: AbilityId }
  | { type: 'ability_prompt_opened'; decision: PendingDecision }
  | { type: 'ability_resolved'; sourceCardId: string; abilityId: AbilityId }
  | { type: 'peek_previewed'; sourceCardId: string; previewCard: CardInstance }
  | { type: 'peek_decision_resolved'; accepted: boolean; previewCardId: string }
  | { type: 'animal_booted'; sourceCardId: string; targetCardId: string }
  | { type: 'animal_fetched'; sourceCardId: string; fetchedCard: CardInstance; slotIndex: number }
  | { type: 'abilities_refreshed'; sourceCardId: string; refreshedCardIds: string[] }
  | { type: 'legendary_count_changed'; count: number; required: 3 }
  | { type: 'win_triggered'; legendaryCardIds: string[]; nightNumber: number };
```

### Rule Engine Flow (`src/game/night.ts`, `src/game/session.ts`)

New session actions:

- `activateAbilityInSession(session, sourceCardId)`
- `resolvePeekDecisionInSession(session, accept)`
- `resolveBootTargetInSession(session, targetCardId)`
- `resolveFetchSelectionInSession(session, animalId)`
- `dismissAbilityDecisionInSession(session)`

Entry resolution order (single deterministic pipeline):

1. Card enters barn (`draw`, `fetch`, or ability side-effect).
2. Update noise and warning state.
3. Register active ability readiness for entered card (if any).
4. Recompute legendary count.
5. Check bust condition.
6. If no bust, check win condition (`legendaryCount >= 3`).
7. If win, set `GamePhase.Win`, emit `win_triggered`, and lock draw/actions.

Ability semantics for Sprint 003:

- **Sheepdog (peek)**:
  - Open decision with top deck card previewed but not drawn.
  - `accept`: move preview card to barn immediately and continue pipeline.
  - `reject`: place preview card at deck bottom and close prompt.
- **Stable Hand (boot)**:
  - Select one barn card (excluding source card).
  - Remove target from barn.
  - Add target `cardId` to `pendingPennedUpCardIds` for next Night.
- **Border Collie (fetch)**:
  - Present unique `animalId` options from remaining deck.
  - Fetch first matching card from deck into barn.
  - Fetched card follows full entry pipeline (can trigger warning/bust/win).
- **Cheerful Lamb (refresh)**:
  - Set `used = false` for all other active-ability cards in barn.
  - Does not refresh itself.

Usage limit:

- Every active ability starts with one charge per card instance per Night.
- A refreshed card can be used one additional time (because `used` resets).

### Win Condition Design

- `requiredLegendaryCount` is set to `3` in session state.
- Legendary count is based on current `night.barn` contents only.
- Win triggers immediately when count reaches 3, before voluntary `Call It a Night`.
- Win does not trigger if the same state transition also results in bust (bust precedence remains first).

### Shop and Market Design (`src/game/shop.ts`, `src/scenes/TradingPostScene.ts`)

- Add Legendary entries to shop stock with `stock = 1` each per run.
- Split market into two sections:
  - `Regular Animals`
  - `Legendary Animals`
- Legendary cards are always rendered after regular cards with visual treatment and high costs.
- Proposed legendary cost band: 30-45 Mischief.

New market item fields:

```ts
export interface MarketItem {
  // existing fields...
  legendary: boolean;
  activeAbilityId: AbilityId | null;
  traitTags: TraitTag[];
}
```

### UI Layout Contract and Coordinates

All coordinates are in 390x844 logical space.

#### BarnScene Layout

| Region | Coordinates / Size | Notes |
|---|---|---|
| Header banner | `x=16, y=16, w=358, h=64` | Night, Mischief, Hay, Legendary tracker |
| Noise meter | `x=16, y=86, w=170, h=28` | Keep 3-dot meter; stronger fill state |
| Deck stack | `x=306, y=106, w=64, h=82` | Unchanged footprint |
| Slot row 1 (3 cards) | `y=156`, `x=[39,147,255]`, card `96x104` | Larger card footprint for readability |
| Slot row 2 (3 cards max) | `y=274`, `x=[39,147,255]` | For capacity 5 use centered two (`93,201`) |
| Slot row 3 (2 cards max) | `y=392`, `x=[93,201]` | For capacity 7 use single center (`147`) |
| Info panel | `x=12, y=556, w=366, h=180` | Long-press/hover detail panel |
| Action bar | `x=20, y=758, w=350, h=56` | Single or split buttons |

Card readability spec:

- Card body: `96x104`.
- Resource badges: increase from `24px` to `32px` diameter.
- Badge font: `14px`, bold, dark text (`#241611`) on high-contrast fills.
- Name strip: `h=20` bottom band with `11px` bold text.
- Trait chips: `h=14`, min `w=42`, rendered at top edge (`NOISY`, `ACTIVE`, `LEGENDARY`).

#### Info Panel Layout

| Element | Coordinates |
|---|---|
| Panel container | `x=12, y=556, w=366, h=180` |
| Portrait frame | `x=24, y=18, w=72, h=72` |
| Name text | `x=110, y=20` |
| Resource badges | Mischief `x=110,y=54`; Hay `x=176,y=54` |
| Trait row | `x=110, y=88` |
| Ability text block | `x=24, y=112, w=330, h=54` |

Input behavior:

- Desktop: show panel on `pointerover`, hide on `pointerout`.
- Touch: show panel on long-press threshold `320ms`.
- Cancel long-press if pointer moves more than `10px`.
- Tap outside panel closes it.

### Animation Specs

| Animation | Trigger | Duration | Easing | Spec |
|---|---|---|---|---|
| Card draw slide | `card_revealed` | 220ms | `Back.easeOut` | Deck -> slot, scale `0.92 -> 1.0` |
| Card stat pop | Card land | 120ms | `Quad.easeOut` | Badges pulse `1.0 -> 1.12 -> 1.0` |
| Info panel reveal | Long-press/hover start | 160ms | `Cubic.easeOut` | Slide from `y=844` to `y=556`, alpha `0->1` |
| Ability prompt pulse | `ability_prompt_opened` | 700ms loop | `Sine.easeInOut` | Source card outline pulse (amber) |
| Legendary glow pulse | Legendary visible | 900ms loop | `Sine.easeInOut` | Outer glow alpha `0.35 <-> 0.8` |
| Legendary shine sweep | Legendary visible | 1400ms loop | linear | Gold highlight mask sweeps left->right |
| Win burst | `win_triggered` | 450ms | `Expo.easeOut` | Camera zoom `1.0->1.04->1.0` + star particles |
| Win overlay rise | after burst | 260ms | `Back.easeOut` | Overlay rises from `y=900` to center |

### Scene Responsibilities

- `BarnScene`: render larger cards, info panel, ability prompts, legendary in-barn effects, win overlay.
- `TradingPostScene`: sectioned market, legendary card visuals, ability summaries.
- `BootScene`: generate new textures for larger badges, trait chips, legendary border/glow sprites.

## Implementation

### Phase 1: Data Model + Roster Extensions

Tasks:

- Extend `AnimalId`, `ShopAnimalId`, `AnimalDef` with active ability and legendary fields.
- Add `AbilityId`, `TraitTag`, `PendingDecision`, `WinState`, `CardAbilityState` types.
- Add new animals and legendaries in `animals.ts`.
- Extend `createDefaultShopStock` for new shop entries and legendary stock.

Tests:

- `animals` roster test for new IDs and metadata completeness.
- `shop` tests: legendary stock defaults, affordability gates at high costs.
- Type-level compile checks for event/phase unions.

### Phase 2: Active Ability Engine + Win Rule

Tasks:

- Add ability usage state to `NightState`.
- Add session reducers for ability activation and resolution.
- Implement Sheepdog peek accept/reject and deterministic deck reorder on reject.
- Implement Stable Hand boot and multi-card Penned Up queue.
- Implement Border Collie fetch by `animalId` from remaining deck.
- Implement Cheerful Lamb refresh behavior.
- Add legendary count recompute and immediate win transition (`GamePhase.Win`).

Tests:

- `night.test.ts`
  - Sheepdog accept inserts preview card into barn.
  - Sheepdog reject moves preview card to deck bottom.
  - Stable Hand boot removes selected card and marks penned-up.
  - Border Collie fetch pulls expected target card and updates deck length.
  - Cheerful Lamb refresh resets used abilities except itself.
  - Win triggers exactly at 3 legendaries.
  - Bust precedence over win when both could occur from same entry.
- `session.test.ts`
  - Multiple `pendingPennedUpCardIds` are excluded for next night and restored after one night.

### Phase 3: Card Readability + Info Panel UI

Tasks:

- Increase card footprint and resource badge sizes in constants/layout.
- Add trait chips and active ability indicator icon on cards.
- Implement bottom info panel container and data binding from selected card.
- Add long-press timer and hover handling with touch-safe cancellation.
- Add DOM phase `ability_decision` and `win` markers.

Tests:

- `barnLayout.test.ts`
  - New `96x104` slot rects remain in-bounds for capacities 5-8.
  - Info panel and action bar remain in-bounds.
- Playwright
  - Long-press (`pointerdown + 350ms`) opens info panel.
  - Hover on desktop mode opens panel.
  - `data-phase="ability_decision"` appears when peek/boot/fetch prompt opens.

### Phase 4: Trading Post Legendary Presentation

Tasks:

- Split Trading Post into regular and legendary sections.
- Add legendary visual treatment (gold border, glow, sparkle tween).
- Add ability summary lines on shop cards for active animals.
- Enforce legendary stock and affordability updates after purchases.

Tests:

- `shop.test.ts`
  - Legendary item appears with `legendary=true` and stock decrement behavior.
- Playwright
  - Screenshot assertions for legendary cards rendered with glow class/marker.

### Phase 5: Win Overlay + End-to-End Verification

Tasks:

- Add BarnScene win overlay and input lock when `GamePhase.Win`.
- Add deterministic seed(s):
  - `sprint3-abilities`
  - `sprint3-legendary-win`
- Capture screenshot set for review.

Tests:

- E2E seeded run reaches win overlay when third legendary enters.
- Existing Sprint 002 tests remain green.
- `npm run ci` and `npm run budget` pass.

## Animal Roster (new animals)

New non-legendary active-ability animals for Sprint 003:

| Animal | Cost | Mischief | Hay | Traits | Active Ability |
|---|---:|---:|---:|---|---|
| Sheepdog | 4 | +2 | 0 | `ACTIVE` | Peek next card; accept or reject |
| Stable Hand | 4 | 0 | 0 | `ACTIVE` | Boot one selected barn animal (Penned Up next Night) |
| Border Collie | 5 | +2 | -1 | `ACTIVE` | Fetch one selected animal type from remaining deck |
| Cheerful Lamb | 5 | +1 | 0 | `ACTIVE` | Refresh all other used active abilities |

Legendary animals (high-cost win path cards):

| Animal | Cost | Mischief | Hay | Traits | Notes |
|---|---:|---:|---:|---|---|
| Golden Goose | 30 | +6 | +2 | `LEGENDARY` | Pure economy spike |
| Giant Ox | 35 | +8 | +1 | `LEGENDARY` | High Mischief body |
| Jackalope | 40 | +7 | 0 | `LEGENDARY` | Premium win-progress card |
| Thunderbird | 45 | +9 | 0 | `LEGENDARY` | Highest-cost closer |

Win target in this sprint: **any 3 of the above 4 legendaries simultaneously in barn**.

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/game/types.ts` | Modify | Add ability/legendary/win types, new phases, pending decisions, event variants |
| `src/game/animals.ts` | Modify | Add active-ability animals + legendary definitions and tags |
| `src/game/night.ts` | Major rewrite | Ability activation/resolution pipeline, legendary count, win checks |
| `src/game/session.ts` | Major rewrite | New session actions for ability decisions, multi-card penned-up handling, win state mutation |
| `src/game/shop.ts` | Modify | Legendary inventory, richer market item metadata |
| `src/game/night.test.ts` | Extend | Ability behavior and win-condition rule tests |
| `src/game/session.test.ts` | Extend | Session wrappers and multi-penned-up lifecycle |
| `src/game/shop.test.ts` | Extend | Legendary market stock/cost tests |
| `src/scenes/BarnScene.ts` | Major rewrite | Larger cards, info panel, ability prompts, legendary FX, win overlay |
| `src/scenes/TradingPostScene.ts` | Modify | Sectioned market, legendary glow cards, ability summaries |
| `src/scenes/barnLayout.ts` | Modify | New slot geometry + info panel coordinates |
| `src/scenes/tradingPostLayout.ts` | Modify | Regular/legendary section layout blocks |
| `src/scenes/barnLayout.test.ts` | Extend | Bounds assertions for new geometry and panel regions |
| `src/scenes/BootScene.ts` | Modify | Generate larger badges/chips/legendary textures |
| `src/config/constants.ts` | Modify | New layout constants, colors, animation timings, DOM phases |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Info panel and ability prompt phase checks |
| `tests/e2e/seeded-flow.spec.ts` | Create/Extend | Seeded ability + legendary win verification |

## Definition of Done

1. Card resource indicators are visibly larger (`32px` badges) and readable on mobile without zooming.
2. Trait chips (`NOISY`, `ACTIVE`, `LEGENDARY`) appear on cards.
3. Long-press on touch and hover on desktop open a bottom info panel with animal details.
4. Info panel includes name, sprite, Mischief, Hay, trait tags, and full ability description.
5. Sheepdog peek ability works with accept/reject decision and deterministic deck outcomes.
6. Stable Hand boots one selected barn animal and marks it Penned Up next Night.
7. Border Collie fetches a selected animal type from remaining deck into barn.
8. Cheerful Lamb refreshes all other used active abilities this Night.
9. Active abilities can only be used once per card instance unless refreshed.
10. Legendary animals appear in Trading Post at high costs and limited stock.
11. Legendary cards have distinct glow/shine treatment in both Barn and Trading Post scenes.
12. Win condition triggers when 3 legendary animals are simultaneously in barn.
13. Win overlay appears and draw/actions are locked after win.
14. Existing Sprint 002 behavior still works (warning, bust, score, shop loop).
15. Unit tests cover ability and win edge cases; all tests pass.
16. `npm run ci` and `npm run budget` pass with no new dependency additions.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Ability interactions create hidden state bugs | Medium | High | Keep all ability state in `NightState` + explicit reducer actions + event emissions |
| Long-press conflicts with tap/drag interactions | Medium | Medium | Use strict timer + movement threshold + cancellation on pointerup |
| Readability gains fail at capacity 8 density | Medium | Medium | Increase card footprint but preserve row spacing; add layout tests for 5-8 |
| Win and bust precedence confusion | Medium | Medium | Define precedence in rules and lock with explicit tests |
| Legendary visuals hurt performance on low-end mobile | Low | Medium | Use lightweight tweens and cached textures; no per-frame shader work |
| Scope creep into full ability roster | High | Medium | Limit active ability implementation to 4 required animals for Sprint 003 |

## Security

- No backend changes; game remains local-state browser app.
- Seed parsing remains strict (`[a-zA-Z0-9_-]`, bounded length) and non-executable.
- No user-provided text is injected into HTML; all gameplay text is static definitions.
- New DOM attributes (`data-phase="ability_decision"`, `data-phase="win"`) are read-only markers for tests.
- No external runtime scripts/assets introduced.

## Dependencies

- Existing stack: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright.
- Existing architecture: scene thinness + game-rule purity in `src/game/*`.
- Existing art pipeline: BootScene generated textures plus local `animals` atlas.
- No new npm dependencies required.

## Open Questions

1. Should Stable Hand be allowed to boot Legendary animals, or only non-Legendary targets?
2. Should Border Collie fetch include cards already in barn as valid sources (duplicate handling), or only remaining deck cards?
3. Should win immediately end run (hard stop) or allow continuing in a post-win freeplay state?
4. Do we want legendary stock fixed at 1 copy each, or 2 copies for longer runs?
5. Should info panel persist after long-press until explicit close, or auto-hide on touch release?
