# Sprint 003: Active Abilities, Legendary Animals & Card Readability

## Overview

Sprint 002 delivered a complete playable loop (Night -> Trading Post -> Night) with deterministic seeds, shop purchases, scoring, bust states, and pixel art visuals. Sprint 003 builds directly on that architecture to close the biggest usability and progression gaps:

- Card values are hard to read at play speed on the 88x88 slot footprint.
- Animal abilities beyond passive/triggered are unimplemented.
- There is no explicit end goal.

This sprint delivers five player-facing outcomes:

1. **Card readability overhaul** with larger 96x104 cards, 32px resource badges, and trait chips.
2. **Info panel** on long-press (300ms touch) / hover (desktop) as a bottom-sheet overlay.
3. **Active ability engine** for Sheepdog (peek), Stable Hand (boot), Border Collie (fetch), and Cheerful Lamb (refresh) — data-driven via an ability registry.
4. **All 8 Legendary Animals** in the Trading Post at high costs, with distinct gold glow/animation treatment.
5. **Win condition**: 3 Legendary Animals in the barn simultaneously triggers victory.

Scope guardrails:

- Keep single-player loop and existing scene flow (`Boot -> Barn -> TradingPost -> Barn`).
- Do not introduce new npm dependencies.
- Keep game rules in `src/game/*`; scenes stay render/input orchestration only.
- Keep deterministic behavior for seeded test runs.
- **Adapter approach for ability fields**: add `abilityKind` and `tier` to `AnimalDef` alongside existing boolean fields (`noisyMitigation`, `givesHermitCrabBonus`, `givesDraftPonyBonus`). Keep both working this sprint. Remove booleans in Sprint 004.

---

## Use Cases

1. **Card readability at a glance** — Player draws an animal. The 96x104 card displays Mischief (gold 32px badge, top-left), Hay (green 32px badge, top-right), NOISY! indicator (red stripe across card top), ability keyword chip (e.g., "PEEK", "BOOT"), tier border (gold shimmer for Legendary), and name strip at the bottom. A non-gamer can identify what a card does at arm's length on a phone screen.

2. **Info on demand** — Player long-presses (300ms) a card on mobile or hovers on desktop. A bottom-sheet info panel slides up (y=556, h=180), showing the animal's full portrait, name, stats, trait tags, and complete ability description from the ability registry. The action bar is hidden while the panel is showing. Tapping anywhere outside dismisses the panel and restores the action bar.

3. **Sheepdog peek flow** — Player draws a Sheepdog. It auto-triggers on entry: the next deck card is revealed face-up in a peek zone. The player taps "Accept" (card enters barn, full entry pipeline runs) or "Reject" (card goes to bottom of deck deterministically). If the deck is empty, peek is skipped silently.

4. **Stable Hand boot flow** — Player draws a Stable Hand. Unlike peek, boot is tap-to-activate: the player taps the Stable Hand card in the barn when they choose to use it. All non-Legendary barn animals highlight with a tappable boot outline. Player taps one to remove it (it is Penned Up next Night). Tapping the Stable Hand itself forfeits the ability. Cannot target Legendary animals.

5. **Border Collie fetch flow** — Player draws a Border Collie. It auto-triggers on entry: a list of unique animal types remaining in the deck appears (alphabetical, excluding Legendaries). Player taps one to pull a matching card directly into the barn. The fetched card does NOT trigger on_enter abilities (chain-breaking rule). If the fetched card causes bust, bust triggers normally.

6. **Cheerful Lamb refresh flow** — Player draws a Cheerful Lamb. It auto-triggers on entry: all other barn animals that have used their active ability this Night get `abilityUsed` reset to false. Visual pulse feedback on refreshed cards. Does not refresh itself.

7. **Legendary progression** — Player sees a "Legendary" tab in the Trading Post with all 8 Legendary Animals at premium prices (30-55 Mischief). Each has stock of 1. Legendary cards have gold borders, star icons, and shimmer animation. Some Legendaries have abilities (Silver Mare cancels 1 NOISY!, Great Stag can boot, Barn Dragon can fetch). Others provide modest Mischief/Hay income.

8. **Victory trigger** — During a Night, when the 3rd Legendary animal is simultaneously present in the barn (after draw/fetch resolves and bust check passes), a `win_triggered` event fires. The scene shows a victory overlay with the 3 Legendary sprites, final score, and a "Play Again" button that resets the session. Win Night scores normally (player gets Mischief/Hay).

9. **Bust > win precedence** — If the same card entry would cause both bust (noise/overcrowding) and reach 3 Legendaries, bust takes precedence. The player does not win.

10. **Penned Up stacking** — If a player boots an animal and then busts in the same Night, both the booted animal and the bust-causing animal are Penned Up. Penned Up tracking is array-based. All penned animals are restored after 1 Night.

---

## Architecture

### Data-Driven Ability Registry

Rather than encoding abilities as per-animal boolean flags or switch-case branches, Sprint 003 introduces a standalone ability registry. Each ability is a named record with a `kind` discriminator, trigger type, display labels, and typed parameters. The ability resolver dispatches on `kind`. Adding a new ability means: (1) add a `kind` to `AbilityKind`, (2) add an entry to `ABILITY_REGISTRY`, (3) add a handler case to the resolver.

```typescript
// src/game/abilities.ts

export type AbilityTrigger = 'on_enter' | 'on_score' | 'passive' | 'manual';

export type AbilityKind =
  | 'none'
  | 'noisy_mitigation'
  | 'bonus_per_empty_slot'
  | 'bonus_per_barn_cat'
  | 'peek'
  | 'boot'
  | 'fetch'
  | 'refresh';

export interface AbilityDef {
  kind: AbilityKind;
  trigger: AbilityTrigger;
  label: string;          // Short label for card chip, e.g. "Peek"
  description: string;    // Full text for info panel
  params: Record<string, number>;  // Ability-specific numeric parameters
}

export const ABILITY_REGISTRY: Record<AbilityKind, AbilityDef> = {
  none: {
    kind: 'none',
    trigger: 'passive',
    label: '',
    description: 'No special ability.',
    params: {},
  },
  noisy_mitigation: {
    kind: 'noisy_mitigation',
    trigger: 'passive',
    label: 'Quiet',
    description: 'Cancels NOISY! from one other animal in the barn.',
    params: { count: 1 },
  },
  bonus_per_empty_slot: {
    kind: 'bonus_per_empty_slot',
    trigger: 'on_score',
    label: 'Hermit',
    description: '+1 Mischief per empty barn slot at scoring.',
    params: { perSlot: 1 },
  },
  bonus_per_barn_cat: {
    kind: 'bonus_per_barn_cat',
    trigger: 'on_score',
    label: 'Herder',
    description: '+1 Mischief per Barn Cat in the barn at scoring.',
    params: { perCat: 1 },
  },
  peek: {
    kind: 'peek',
    trigger: 'on_enter',
    label: 'Peek',
    description: 'Reveal the next card. Accept it into the barn or reject it to the bottom of the deck.',
    params: {},
  },
  boot: {
    kind: 'boot',
    trigger: 'manual',
    label: 'Boot',
    description: 'Remove one non-Legendary animal from the barn. It is Penned Up next Night.',
    params: { count: 1 },
  },
  fetch: {
    kind: 'fetch',
    trigger: 'on_enter',
    label: 'Fetch',
    description: 'Pull a specific animal type from the remaining deck directly into the barn.',
    params: {},
  },
  refresh: {
    kind: 'refresh',
    trigger: 'on_enter',
    label: 'Refresh',
    description: 'Reset all used active abilities of other animals currently in the barn.',
    params: {},
  },
};
```

### Type System Changes (`src/game/types.ts`)

Additions alongside existing types. Existing boolean fields are preserved for backward compatibility (adapter approach).

```typescript
// --- New type aliases ---

export type AnimalTier = 'common' | 'legendary';

// --- Extended AnimalId (add to existing union) ---

export type AnimalId =
  // existing
  | 'BarnCat' | 'FeralGoat' | 'PotBelliedPig'
  | 'Bunny' | 'Hen' | 'WildBoar' | 'HermitCrab' | 'DraftPony'
  | 'StruttingPeacock' | 'MilkmaidGoat' | 'HoneyBee'
  // Sprint 003: active-ability animals
  | 'Sheepdog' | 'StableHand' | 'BorderCollie' | 'CheerfulLamb'
  // Sprint 003: all 8 Legendaries
  | 'GoldenGoose' | 'GiantOx' | 'Jackalope' | 'Thunderbird'
  | 'SilverMare' | 'LuckyToad' | 'GreatStag' | 'BarnDragon';

export type ShopAnimalId =
  // existing
  | 'Bunny' | 'Hen' | 'WildBoar' | 'HermitCrab' | 'DraftPony'
  | 'StruttingPeacock' | 'MilkmaidGoat' | 'HoneyBee'
  // Sprint 003
  | 'Sheepdog' | 'StableHand' | 'BorderCollie' | 'CheerfulLamb'
  | 'GoldenGoose' | 'GiantOx' | 'Jackalope' | 'Thunderbird'
  | 'SilverMare' | 'LuckyToad' | 'GreatStag' | 'BarnDragon';

// --- Extended AnimalDef (adapter approach: new fields alongside booleans) ---

export interface AnimalDef {
  id: AnimalId;
  name: string;
  costMischief: number | null;
  mischief: number;
  hay: number;
  noisy: boolean;
  // Existing boolean fields — preserved this sprint, removed in Sprint 004
  noisyMitigation: number;
  givesHermitCrabBonus: boolean;
  givesDraftPonyBonus: boolean;
  inShop: boolean;
  // Sprint 003 additions
  abilityKind: AbilityKind;   // References ABILITY_REGISTRY key
  tier: AnimalTier;           // 'common' | 'legendary'
}

// --- Extended CardInstance ---

export interface CardInstance {
  id: string;
  animalId: AnimalId;
  abilityUsed: boolean;  // Tracks whether active ability has been used this Night
}

// --- Pending Decision (discriminated union for ability prompts) ---

export type PendingDecision =
  | { kind: 'peek'; sourceCardId: string; previewCard: CardInstance }
  | { kind: 'boot'; sourceCardId: string; validTargetCardIds: string[] }
  | { kind: 'fetch'; sourceCardId: string; validAnimalIds: AnimalId[] };

// --- Win State ---

export interface WinState {
  achieved: boolean;
  legendaryCount: number;
  requiredLegendaryCount: 3;
  achievedAtNight: number | null;
}

// --- Extended GamePhase ---

export enum GamePhase {
  ReadyToDraw = 'ready_to_draw',
  AnimatingDraw = 'animating_draw',
  PlayerDecision = 'player_decision',
  Warning = 'warning',
  AbilityDecision = 'ability_decision',  // New: awaiting ability resolution
  Bust = 'bust',
  NightSummary = 'night_summary',
  Win = 'win',                           // New: win overlay active
  Shop = 'shop',
}

// --- Extended NightState ---

export interface NightState {
  // existing fields
  phase: GamePhase;
  nightNumber: number;
  deck: CardInstance[];
  barn: CardInstance[];
  capacity: number;
  noisyCount: number;
  hasDrawn: boolean;
  warning: boolean;
  autoScored: boolean;
  complete: boolean;
  bust: NightBustState | null;
  summary: NightScoreSummary | null;
  pennedUpCard: CardInstance | null;
  // Sprint 003 additions
  pendingDecision: PendingDecision | null;
  legendaryCount: number;
  wonThisNight: boolean;
}

// --- Extended GameSession ---

export interface GameSession {
  // existing fields
  seed: string;
  herd: CardInstance[];
  nextCardSerial: number;
  capacity: number;
  mischief: number;
  hay: number;
  nightNumber: number;
  shopStock: ShopStock;
  currentNight: NightState | null;
  lastSummary: NightScoreSummary | null;
  // Sprint 003: replace singular penned-up tracking with array
  activePennedUpCardIds: string[];
  pendingPennedUpCardIds: string[];
  // Sprint 003: win state
  winState: WinState;
}

// --- Extended NightEvent union ---

export type NightEvent =
  // existing events
  | { type: 'card_draw_started' }
  | { type: 'card_revealed'; card: CardInstance; slotIndex: number }
  | { type: 'warning_state_changed'; noisyCount: number; warning: boolean }
  | { type: 'bust_triggered'; bustType: BustType; card: CardInstance }
  | { type: 'night_scored'; summary: NightScoreSummary }
  | { type: 'animal_penned_up'; card: CardInstance }
  | { type: 'purchase_completed'; animalId: ShopAnimalId; card: CardInstance }
  | { type: 'capacity_upgraded'; capacity: number }
  // Sprint 003 additions
  | { type: 'ability_triggered'; cardId: string; abilityKind: AbilityKind }
  | { type: 'peek_offered'; sourceCardId: string; previewCard: CardInstance }
  | { type: 'peek_accepted'; card: CardInstance; slotIndex: number }
  | { type: 'peek_rejected'; card: CardInstance }
  | { type: 'boot_requested'; sourceCardId: string; validTargetCardIds: string[] }
  | { type: 'boot_executed'; sourceCardId: string; bootedCard: CardInstance }
  | { type: 'fetch_requested'; sourceCardId: string; validAnimalIds: AnimalId[] }
  | { type: 'fetch_executed'; sourceCardId: string; fetchedCard: CardInstance; slotIndex: number }
  | { type: 'abilities_refreshed'; sourceCardId: string; refreshedCardIds: string[] }
  | { type: 'legendary_count_changed'; count: number; required: 3 }
  | { type: 'win_triggered'; legendaryCardIds: string[]; nightNumber: number };
```

### Ability Resolver (`src/game/abilityResolver.ts`)

A single dispatch function replaces per-animal if/else chains in `night.ts`. Handles both auto-trigger (on_enter) and manual activation.

```typescript
// src/game/abilityResolver.ts

import { ABILITY_REGISTRY } from './abilities';
import { getAnimalDef } from './animals';
import type { AbilityKind, CardInstance, NightState, NightEvent } from './types';

/**
 * Called after a card enters the barn via normal draw.
 * Checks if it has an on_enter ability and either auto-resolves it
 * (refresh) or sets up a pending decision (peek, fetch).
 * Boot is manual (trigger='manual'), so it does NOT auto-fire on entry.
 *
 * CHAIN-BREAKING RULE: This function is ONLY called for cards drawn
 * by the player's "DRAW ANIMAL" action. Cards entering via fetch or
 * peek-accept do NOT trigger on_enter abilities.
 */
export function resolveOnEnter(
  state: NightState,
  enteredCard: CardInstance,
): { state: NightState; events: NightEvent[] } {
  const def = getAnimalDef(enteredCard.animalId);
  const ability = ABILITY_REGISTRY[def.abilityKind];

  if (ability.trigger !== 'on_enter') {
    return { state, events: [] };
  }

  switch (ability.kind) {
    case 'peek':
      return resolvePeek(state, enteredCard);
    case 'fetch':
      return resolveFetch(state, enteredCard);
    case 'refresh':
      return resolveRefresh(state, enteredCard);
    default:
      return { state, events: [] };
  }
}

/**
 * Called when a player taps a card with a manual ability (e.g., Stable Hand boot).
 */
export function resolveManualAbility(
  state: NightState,
  sourceCard: CardInstance,
): { state: NightState; events: NightEvent[] } {
  const def = getAnimalDef(sourceCard.animalId);
  const ability = ABILITY_REGISTRY[def.abilityKind];

  if (ability.trigger !== 'manual' || sourceCard.abilityUsed) {
    return { state, events: [] };
  }

  switch (ability.kind) {
    case 'boot':
      return resolveBoot(state, sourceCard);
    default:
      return { state, events: [] };
  }
}
```

Individual resolve functions (`resolvePeek`, `resolveBoot`, `resolveFetch`, `resolveRefresh`) are private helpers within `abilityResolver.ts`. Each sets the appropriate `pendingDecision` on `NightState` or auto-resolves.

### Entry Resolution Pipeline (7 Steps)

Every card entry (draw, fetch-accept, peek-accept) runs through this deterministic pipeline:

1. **Card enters barn** — add `CardInstance` to `barn` array, emit `card_revealed`.
2. **Update noise state** — recompute unmitigated NOISY! count, emit `warning_state_changed` if changed.
3. **Check bust** — if 3+ unmitigated NOISY! or barn > capacity, emit `bust_triggered`, mark night complete.
4. **If bust, stop** — bust takes absolute precedence. No ability resolution, no win check.
5. **Recompute legendary count** — count `tier === 'legendary'` in barn, emit `legendary_count_changed` if changed.
6. **Check win** — if `legendaryCount >= 3`, emit `win_triggered`, complete night with scoring.
7. **Resolve on_enter ability** — ONLY if the card was drawn by the player (not fetched/peeked). Call `resolveOnEnter()`. If a pending decision is created, set `phase = AbilityDecision` and wait for player input.

**Bust > win precedence**: Step 3 runs before step 6. If the same card entry causes both bust and 3 Legendaries, bust triggers and the player does not win.

**Chain-breaking rule**: Step 7 only runs for cards drawn via "DRAW ANIMAL". Cards entering via peek-accept or fetch do NOT trigger on_enter abilities. This prevents infinite loops (e.g., fetch -> Border Collie -> fetch -> ...).

### Mixed Ability Activation Model

| Animal | Ability | Trigger | Activation |
|--------|---------|---------|------------|
| Sheepdog | Peek | `on_enter` | Auto-triggers peek prompt on entry |
| Stable Hand | Boot | `manual` | Player taps card when they want to boot |
| Border Collie | Fetch | `on_enter` | Auto-triggers fetch prompt on entry |
| Cheerful Lamb | Refresh | `on_enter` | Auto-resolves on entry (no player choice) |

### Ability Semantics

**Sheepdog (Peek)**:
- Auto-triggers on entry. Draws top deck card into `PendingDecision` without placing in barn.
- Sets `phase = AbilityDecision`.
- `Accept`: preview card enters barn via full pipeline (steps 1-6, but NOT step 7 — chain-breaking). Can trigger bust or win.
- `Reject`: preview card placed at bottom of deck (deterministic position). Prompt cleared.
- Empty deck: peek skipped silently, no prompt.

**Stable Hand (Boot)**:
- Manual activation: player taps the Stable Hand card when they choose to use it.
- Sets `phase = AbilityDecision`. Valid targets: all barn animals except Legendaries and the Stable Hand itself.
- Player taps a target: target removed from barn, added to `pendingPennedUpCardIds`. Prompt cleared.
- Boot self: ability forfeited (clears without effect, marks `abilityUsed = true`).
- Cannot target Legendary animals.

**Border Collie (Fetch)**:
- Auto-triggers on entry. Builds candidate list: unique `AnimalId` values in remaining deck, excluding Legendaries, sorted alphabetically.
- Sets `phase = AbilityDecision`.
- Player selects a type: first matching card removed from deck, enters barn via pipeline (steps 1-6, NOT step 7). Can trigger bust or win.
- Empty deck or no valid candidates: fetch skipped silently.

**Cheerful Lamb (Refresh)**:
- Auto-resolves on entry (no player choice). Resets `abilityUsed = false` on all other active-ability cards currently in barn.
- Does not refresh itself.
- Emits `abilities_refreshed` with list of refreshed card IDs.

**Usage limits**:
- Every active ability starts with `abilityUsed = false` per card instance per Night.
- After use, `abilityUsed = true`. Cannot use again unless refreshed by Cheerful Lamb.
- Refreshed card can be used one additional time (because `abilityUsed` resets).

### Penned Up Stacking

Sprint 002 tracked a single penned-up card. Sprint 003 generalizes to array-based tracking:

- `pendingPennedUpCardIds: string[]` — accumulated during a Night (boot + bust can both add entries).
- `activePennedUpCardIds: string[]` — cards excluded from the current Night's deck.
- At night end: `pendingPennedUpCardIds` becomes `activePennedUpCardIds` for next Night.
- After that Night: `activePennedUpCardIds` is cleared. All penned animals restored after 1 Night.

### Win Condition

```typescript
export function checkWinCondition(barn: CardInstance[]): boolean {
  const legendaryCount = barn.filter(
    card => getAnimalDef(card.animalId).tier === 'legendary'
  ).length;
  return legendaryCount >= 3;
}
```

- Requires any 3 of the 8 Legendary Animals simultaneously in barn.
- Checked after every successful card entry (draw, peek-accept, fetch) that passes bust check.
- Win Night scores normally: player gets Mischief/Hay (unlike bust).
- Post-win: victory overlay with "Play Again" button. Resets session via `gameStore.reset()`.

### Info Panel (Overlay Container within BarnScene)

The info panel is a `Phaser.GameObjects.Container` rendered within BarnScene, positioned at the bottom of the screen. Same overlay pattern as bust/night summary overlays.

**Input behavior**:
- Touch: show panel on long-press (300ms `delayedCall` timer). Cancel if pointer moves > 10px.
- Desktop: show panel on `pointerover` after hover threshold.
- Tap anywhere outside panel to dismiss.
- Action bar is hidden while panel is showing. Draw/action buttons disabled.

### Paginated Trading Post

Trading Post uses tabs instead of scroll physics (Phaser scroll is fragile):

- **Tab 1**: "Animals" — Common and active-ability animals (up to 12 items, 2-column grid).
- **Tab 2**: "Legendary" — All 8 Legendary Animals (2-column grid).
- Tab buttons at top of scene. Active tab highlighted.
- No scroll physics needed.

### Scene Flow (Unchanged)

```
BootScene -> BarnScene -> TradingPostScene -> BarnScene -> ...
                |
                v (on win)
           Victory Overlay (within BarnScene)
```

No new scenes. Victory is an overlay container within BarnScene.

---

## Animal Roster

### Active-Ability Animals (New Purchasable, Stock: 3 each)

| Animal | Cost | Mischief | Hay | AbilityKind | Trigger | Label | Strategic Role |
|--------|------|----------|-----|-------------|---------|-------|----------------|
| Sheepdog | 4 | +2 | -- | `peek` | `on_enter` | Peek | Information |
| Stable Hand | 4 | -- | -- | `boot` | `manual` | Boot | Barn management |
| Border Collie | 5 | +2 | -1 | `fetch` | `on_enter` | Fetch | Deck manipulation |
| Cheerful Lamb | 5 | +1 | -- | `refresh` | `on_enter` | Refresh | Ability economy |

### Legendary Animals (Stock: 1 each, Win Condition)

| Animal | Cost | Mischief | Hay | AbilityKind | Tier | Notes |
|--------|------|----------|-----|-------------|------|-------|
| Golden Goose | 30 | +3 | +1 | `none` | `legendary` | Economy |
| Giant Ox | 35 | +2 | +1 | `none` | `legendary` | Sturdy |
| Jackalope | 40 | +4 | -- | `none` | `legendary` | Rare |
| Thunderbird | 45 | +5 | -- | `none` | `legendary` | Premium |
| Silver Mare | 45 | +2 | -- | `noisy_mitigation` | `legendary` | Cancels 1 NOISY! |
| Lucky Toad | 50 | +1 | +3 | `none` | `legendary` | Hay generator |
| Great Stag | 50 | +3 | -- | `boot` | `legendary` | Active: boot |
| Barn Dragon | 55 | +4 | -- | `fetch` | `legendary` | Active: fetch |

Win target: **any 3 of the 8 Legendaries simultaneously in barn**.

**Legendary ability notes**: Great Stag's boot and Barn Dragon's fetch follow the same rules as Stable Hand and Border Collie respectively. Great Stag's boot is `manual` trigger (tap-to-activate). Barn Dragon's fetch is `on_enter` trigger (auto-prompts). Boot cannot target other Legendaries.

### Existing Animals (Modified Fields Only)

All existing animals gain `abilityKind` and `tier: 'common'`. Existing boolean fields are preserved alongside the new fields:

| Animal | abilityKind | tier |
|--------|-------------|------|
| Barn Cat | `none` | `common` |
| Feral Goat | `none` | `common` |
| Pot-Bellied Pig | `none` | `common` |
| Bunny | `noisy_mitigation` | `common` |
| Hen | `none` | `common` |
| Wild Boar | `none` | `common` |
| Hermit Crab | `bonus_per_empty_slot` | `common` |
| Draft Pony | `bonus_per_barn_cat` | `common` |
| Strutting Peacock | `none` | `common` |
| Milkmaid Goat | `none` | `common` |
| Honey Bee | `noisy_mitigation` | `common` |

---

## UI Layout Contract and Coordinates

All coordinates are in 390x844 logical space.

### BarnScene Layout

| Region | Coordinates / Size | Notes |
|--------|-------------------|-------|
| Header banner | `x=16, y=16, w=358, h=64` | Night #, Mischief, Hay, Legendary tracker |
| Noise meter | `x=16, y=86, w=170, h=28` | 3-dot meter; stronger fill state |
| Deck stack | `x=306, y=106, w=64, h=82` | Unchanged footprint |
| Slot row 1 (3 cards) | `y=156`, `x=[39, 147, 255]`, card `96x104` | Larger card footprint |
| Slot row 2 | `y=274` | cap 5: centered two `x=[93, 201]`; cap 6+: three `x=[39, 147, 255]` |
| Slot row 3 | `y=392` | cap 7: single center `x=[147]`; cap 8: two `x=[93, 201]` |
| Info panel | `x=12, y=556, w=366, h=180` | Long-press/hover detail panel |
| Action bar | `x=20, y=758, w=350, h=56` | Single or split buttons |

**Card readability spec** (96x104 cards):

- Card body: `96x104`.
- Resource badges: `32px` diameter circles. Gold fill for Mischief, green fill for Hay.
- Badge font: `14px` bold, dark text (`#241611`) on high-contrast fills.
- Name strip: `h=20` bottom band, `11px` bold text, centered.
- Trait chips: `h=14`, min `w=42`, rendered at top edge of card. Background color-coded:
  - NOISY!: red stripe across full card top.
  - Active ability (`on_enter`/`manual`): blue chip, white text.
  - Passive: green chip, white text.
  - Triggered (`on_score`): yellow chip, dark text.
  - Legendary: gold shimmer border (2px, animated alpha).

### Info Panel Layout

| Element | Position (relative to panel container) |
|---------|---------------------------------------|
| Panel container | `x=12, y=556, w=366, h=180` |
| Portrait frame | `x=24, y=18, w=72, h=72` (within panel) |
| Name text | `x=110, y=20` (within panel) |
| Resource badges | Mischief `x=110, y=54`; Hay `x=176, y=54` (within panel) |
| Trait row | `x=110, y=88` (within panel) |
| Ability text block | `x=24, y=112, w=330, h=54` (within panel) |

The action bar (`y=758`) is hidden while the info panel is showing. This prevents overlap and accidental draws.

### Dynamic Slot Layout (Capacity 5-8)

The layout function `getDynamicSlotRects(capacity)` returns slot positions for the 96x104 card size:

- **5 slots**: Row 1 = 3 cards at `x=[39, 147, 255]`, Row 2 = 2 centered at `x=[93, 201]`
- **6 slots**: Row 1 = 3, Row 2 = 3 at same x positions
- **7 slots**: Row 1 = 3, Row 2 = 3, Row 3 = 1 centered at `x=[147]`
- **8 slots**: Row 1 = 3, Row 2 = 3, Row 3 = 2 centered at `x=[93, 201]`

All rows use `y` offsets: Row 1 = `156`, Row 2 = `274`, Row 3 = `392`.

---

## Animation Specs

| Animation | Trigger | Duration | Easing | Spec |
|-----------|---------|----------|--------|------|
| Card draw slide | `card_revealed` | 220ms | `Back.easeOut` | Deck -> slot, scale `0.92 -> 1.0` |
| Card stat pop | Card land | 120ms | `Quad.easeOut` | Badges pulse `1.0 -> 1.12 -> 1.0` |
| Info panel reveal | Long-press/hover start | 160ms | `Cubic.easeOut` | Slide from `y=844` to `y=556`, alpha `0 -> 1` |
| Info panel dismiss | Tap outside | 120ms | `Cubic.easeIn` | Slide to `y=844`, alpha `1 -> 0` |
| Ability prompt pulse | `ability_prompt_opened` | 700ms loop | `Sine.easeInOut` | Source card outline pulse (amber glow) |
| Boot target highlight | `boot_requested` | 500ms loop | `Sine.easeInOut` | Valid targets pulse red outline |
| Fetch list appear | `fetch_requested` | 180ms | `Cubic.easeOut` | Overlay slides up from bottom |
| Refresh pulse | `abilities_refreshed` | 200ms | `Quad.easeOut` | Refreshed cards scale `1.0 -> 1.05 -> 1.0` |
| Legendary glow pulse | Legendary in barn | 900ms loop | `Sine.easeInOut` | Outer glow alpha `0.35 <-> 0.8` |
| Legendary shine sweep | Legendary in barn | 1400ms loop | linear | Gold highlight mask sweeps left -> right |
| Win burst | `win_triggered` | 450ms | `Expo.easeOut` | Camera zoom `1.0 -> 1.04 -> 1.0` + star particles |
| Win overlay rise | After burst | 260ms | `Back.easeOut` | Overlay rises from `y=900` to center |
| Boot removal | `boot_executed` | 200ms | `Quad.easeIn` | Target card shrinks + fades to alpha 0 |

All animations use Phaser's built-in tween system. Drive animations from `NightEvent[]` so visual sequencing mirrors rule sequencing. Disable draw button during all animations and ability prompts.

---

## Implementation

### Phase 1: Ability Registry & Type System (~15%)

**Goal:** Establish the data-driven ability model, add `abilityKind` and `tier` fields alongside existing booleans, and update types. All existing tests must pass unchanged.

**Files:**
- `src/game/abilities.ts` — Create
- `src/game/types.ts` — Modify
- `src/game/animals.ts` — Modify
- `src/game/deck.ts` — Modify

**Tasks:**
- [ ] Create `src/game/abilities.ts` with `AbilityKind`, `AbilityTrigger`, `AbilityDef`, and `ABILITY_REGISTRY` as defined in Architecture section
- [ ] Add `AnimalTier` type alias to `types.ts`
- [ ] Add `abilityKind: AbilityKind` and `tier: AnimalTier` to `AnimalDef` interface (keep existing boolean fields)
- [ ] Add `abilityUsed: boolean` to `CardInstance` interface
- [ ] Add `PendingDecision` discriminated union to `types.ts`
- [ ] Add `WinState` interface to `types.ts`
- [ ] Add `AbilityDecision` and `Win` to `GamePhase` enum
- [ ] Add `pendingDecision: PendingDecision | null`, `legendaryCount: number`, `wonThisNight: boolean` to `NightState`
- [ ] Replace singular penned-up fields with `activePennedUpCardIds: string[]` and `pendingPennedUpCardIds: string[]` on `GameSession`
- [ ] Add `winState: WinState` to `GameSession`
- [ ] Add all new `NightEvent` variants to the union type
- [ ] Update all existing animal definitions in `animals.ts` to include `abilityKind` and `tier` fields:
  - Bunny: `abilityKind: 'noisy_mitigation'`, `tier: 'common'`
  - Honey Bee: `abilityKind: 'noisy_mitigation'`, `tier: 'common'`
  - Hermit Crab: `abilityKind: 'bonus_per_empty_slot'`, `tier: 'common'`
  - Draft Pony: `abilityKind: 'bonus_per_barn_cat'`, `tier: 'common'`
  - All others without abilities: `abilityKind: 'none'`, `tier: 'common'`
- [ ] Add 4 active-ability animals to `animals.ts` with full `AnimalDef` entries
- [ ] Add all 8 Legendary animals to `animals.ts` with stats from Legendary Roster table
- [ ] Update `createCardInstance()` in `deck.ts` to initialize `abilityUsed: false`
- [ ] Update `ShopAnimalId` and `ShopStock` type to include new animals
- [ ] Update `createDefaultShopStock()`: active-ability animals stock 3, Legendaries stock 1

**Tests:**
- [ ] Existing NOISY! mitigation tests pass unchanged (boolean fields still used in Phase 1)
- [ ] Existing scoring tests pass unchanged (boolean fields still used in Phase 1)
- [ ] `ABILITY_REGISTRY` entries: every `AbilityKind` has a registry entry with non-empty `description`
- [ ] `getAnimalDef()` returns correct `abilityKind` and `tier` for all animals
- [ ] `CardInstance` initializes with `abilityUsed: false`
- [ ] All 8 Legendaries have `tier: 'legendary'` and correct `costMischief` values
- [ ] Shop stock: active-ability animals = 3, Legendaries = 1

### Phase 2: Active Ability Engine & Win Condition (~25%)

**Goal:** Implement the four active abilities, win condition, and ability resolver. All ability interactions are unit-testable without Phaser.

**Files:**
- `src/game/abilityResolver.ts` — Create
- `src/game/night.ts` — Modify
- `src/game/session.ts` — Modify
- `src/game/scoring.ts` — Modify

**Tasks:**
- [ ] Create `src/game/abilityResolver.ts` with `resolveOnEnter()` and `resolveManualAbility()` dispatch functions
- [ ] Implement `resolvePeek()`:
  - Draw top card from deck into `PendingDecision` without placing in barn
  - Set `pendingDecision: { kind: 'peek', sourceCardId, previewCard }`
  - Set `phase = AbilityDecision`
  - Emit `peek_offered` event
  - If deck is empty: skip silently (return no events, no decision)
- [ ] Implement `acceptPeek(state)`:
  - Place preview card in barn, clear `pendingDecision`
  - Run entry pipeline steps 1-6 (noise, bust, legendary, win) but NOT step 7 (chain-breaking)
  - Emit `peek_accepted`
- [ ] Implement `rejectPeek(state)`:
  - Move preview card to bottom of deck array (deterministic)
  - Clear `pendingDecision`
  - Emit `peek_rejected`
- [ ] Implement `resolveBoot()` (called from `resolveManualAbility` when player taps Stable Hand):
  - Build `validTargetCardIds`: all barn cards except Legendaries and the source card
  - Set `pendingDecision: { kind: 'boot', sourceCardId, validTargetCardIds }`
  - Set `phase = AbilityDecision`
  - Emit `boot_requested`
- [ ] Implement `executeBoot(state, targetCardId)`:
  - Remove target from barn
  - Add target card ID to session's `pendingPennedUpCardIds`
  - Mark source card `abilityUsed = true`
  - Clear `pendingDecision`
  - Emit `boot_executed`
- [ ] Implement boot self = forfeit: if `targetCardId === sourceCardId`, clear decision, mark `abilityUsed = true`, emit nothing
- [ ] Implement `resolveFetch()`:
  - Build candidate list: unique `AnimalId` values in remaining deck, excluding Legendaries, sorted alphabetically by animal name
  - Set `pendingDecision: { kind: 'fetch', sourceCardId, validAnimalIds }`
  - Set `phase = AbilityDecision`
  - Emit `fetch_requested`
  - If deck empty or no valid candidates: skip silently
- [ ] Implement `executeFetch(state, selectedAnimalId)`:
  - Find first matching `CardInstance` in deck
  - Remove from deck, place in barn
  - Run entry pipeline steps 1-6 (NOT step 7 — chain-breaking)
  - Mark source card `abilityUsed = true`
  - Clear `pendingDecision`
  - Emit `fetch_executed`
- [ ] Implement `resolveRefresh()` (auto-resolve, no decision needed):
  - Reset `abilityUsed = false` on all other active-ability cards in barn
  - Mark Cheerful Lamb itself `abilityUsed = true`
  - Emit `abilities_refreshed` with list of refreshed card IDs
- [ ] Integrate `resolveOnEnter()` into `drawAnimal()` in `night.ts`:
  - After card enters barn and bust check passes, call `resolveOnEnter()` for drawn card only
  - If pending decision is set, return events and wait (scene handles UI)
  - If auto-resolved (refresh) or no ability, continue to player decision phase
- [ ] Implement `checkWinCondition(barn)` pure function
- [ ] Integrate win check into entry pipeline (step 6):
  - If `legendaryCount >= 3` and no bust, emit `win_triggered`, set `wonThisNight = true`
  - Complete night with normal scoring (player gets Mischief/Hay)
- [ ] Update scoring in `scoring.ts` to also dispatch on `abilityKind` (in addition to existing boolean checks, so both paths work):
  - `bonus_per_empty_slot`: `ABILITY_REGISTRY[abilityKind].params.perSlot * emptySlots`
  - `bonus_per_barn_cat`: `ABILITY_REGISTRY[abilityKind].params.perCat * barnCatCount`
- [ ] Update session-level penned-up handling to use arrays:
  - `endNight()`: move `pendingPennedUpCardIds` to `activePennedUpCardIds`
  - `startNextNight()`: exclude `activePennedUpCardIds` from deck, then clear them
- [ ] Add session-level ability response functions:
  - `acceptPeekInSession(session)` -> `SessionMutation`
  - `rejectPeekInSession(session)` -> `SessionMutation`
  - `executeBootInSession(session, targetCardId)` -> `SessionMutation`
  - `executeFetchInSession(session, selectedAnimalId)` -> `SessionMutation`
  - `activateManualAbilityInSession(session, sourceCardId)` -> `SessionMutation`

**Tests:**
- [ ] Peek: Sheepdog enters -> `peek_offered` event -> `acceptPeek` places card in barn -> `peek_accepted`
- [ ] Peek: `rejectPeek` sends card to deck bottom (last element of deck array)
- [ ] Peek with empty deck: Sheepdog enters but deck is empty -> no peek offered, ability skipped
- [ ] Peek determinism: same seed -> same peek card -> reject -> card is at deck bottom
- [ ] Boot: Stable Hand enters barn -> player taps to activate -> `boot_requested` with valid targets
- [ ] Boot: `executeBoot` removes target -> target card ID in `pendingPennedUpCardIds`
- [ ] Boot: cannot boot a Legendary animal (not in `validTargetCardIds`)
- [ ] Boot: boot self = forfeit (`abilityUsed = true`, no card removed)
- [ ] Fetch: Border Collie enters -> `fetch_requested` with alphabetical candidate list
- [ ] Fetch: `executeFetch` pulls matching card from deck, deck length decreases by 1
- [ ] Fetch: fetched card does NOT trigger its own on_enter ability (chain-breaking)
- [ ] Fetch: fetched card causes barn overflow -> bust triggers after fetch
- [ ] Fetch: Legendaries excluded from candidate list
- [ ] Fetch with empty deck: fetch skipped silently
- [ ] Refresh: Cheerful Lamb enters -> all other barn cards get `abilityUsed = false` -> `abilities_refreshed`
- [ ] Refresh: Cheerful Lamb does NOT refresh itself
- [ ] Win: 3 Legendaries in barn -> `win_triggered` event, `wonThisNight = true`
- [ ] Win: 2 Legendaries in barn -> no win event
- [ ] Win + scoring: win night still scores full Mischief/Hay
- [ ] Bust > win: same entry causes both -> bust triggers, no win
- [ ] Penned Up stacking: boot + bust same Night -> 2 entries in `pendingPennedUpCardIds`
- [ ] Penned Up restoration: all `activePennedUpCardIds` restored after 1 Night
- [ ] Deterministic test: seeded game with Sheepdog produces predictable peek sequence

### Phase 3: Card Readability & Layout Changes (~20%)

**Goal:** Increase card size to 96x104, redesign card rendering for readability, update layout for all capacities.

**Files:**
- `src/config/constants.ts` — Modify
- `src/scenes/barnLayout.ts` — Modify
- `src/scenes/barnLayout.test.ts` — Modify
- `src/scenes/BootScene.ts` — Modify

**Tasks:**
- [ ] Update `LAYOUT` in `constants.ts`:
  - Slot dimensions: `96x104` (was `88x88`)
  - Slot row 1 y=156, x=[39, 147, 255]
  - Slot row 2 y=274 (cap 5: x=[93, 201]; cap 6+: x=[39, 147, 255])
  - Slot row 3 y=392 (cap 7: x=[147]; cap 8: x=[93, 201])
  - Resource badge diameter: 32px (was 24px)
  - Info panel bounds: x=12, y=556, w=366, h=180
  - Action bar: x=20, y=758, w=350, h=56
- [ ] Add new palette entries to `constants.ts`:
  - `LEGENDARY_GOLD: 0xd4a017`
  - `LEGENDARY_BORDER: 0xffd700`
  - `ABILITY_ACTIVE: 0x2d6a9f`
  - `ABILITY_PASSIVE: 0x4a7c59`
  - `ABILITY_TRIGGERED: 0xc4982a`
- [ ] Add new texture keys to `constants.ts`:
  - `CARD_LEGENDARY`, `BADGE_NOISY_STRIPE`, `ABILITY_STRIP_ACTIVE`, `ABILITY_STRIP_PASSIVE`, `ABILITY_STRIP_TRIGGERED`, `BADGE_STAR`, `INFO_PANEL_BG`
- [ ] Add animation timing constants to `constants.ts` matching Animation Specs table
- [ ] Rewrite `getDynamicSlotRects(capacity)` in `barnLayout.ts` for 96x104 card size and updated coordinates
- [ ] Add `getInfoPanelBounds()` to `barnLayout.ts`: returns `{ x: 12, y: 556, w: 366, h: 180 }`
- [ ] Generate all new textures in `BootScene`:
  - Legendary card background (gold-tinted parchment, 96x104)
  - NOISY! stripe (red diagonal across card top, 96x~20)
  - Ability strip backgrounds (96x14, color-coded: blue/green/yellow)
  - Star icon (16x16 generated star shape)
  - Info panel background (366x180 dark rectangle with rounded top corners)
  - Larger resource badges (32px diameter circles)

**Tests:**
- [ ] `barnLayout.test.ts`: 96x104 slot rects remain in-bounds for capacities 5-8
- [ ] `barnLayout.test.ts`: no slot overlaps for any capacity
- [ ] `barnLayout.test.ts`: all slots fit within 390x844 canvas
- [ ] `barnLayout.test.ts`: info panel bounds within canvas
- [ ] `barnLayout.test.ts`: info panel does not overlap with action bar (panel ends at y=736, action bar at y=758)
- [ ] `barnLayout.test.ts`: 44px minimum tap target maintained for cards and buttons

### Phase 4: Info Panel & Ability UI in BarnScene (~20%)

**Goal:** Wire the info panel, ability prompts, and win overlay to interactive UI elements in BarnScene.

**Files:**
- `src/scenes/BarnScene.ts` — Major rewrite
- `src/scenes/barnLayout.ts` — Extend (peek zone, boot highlight positions)

**Tasks:**
- [ ] Redesign `renderCardInSlot()` in BarnScene:
  - Select card background based on `tier` (legendary = gold) and `noisy` (red tint)
  - Render NOISY! stripe overlay at top of card if applicable
  - Render Mischief badge as gold 32px circle (top-left), 14px bold number
  - Render Hay badge as green 32px circle (top-right), 14px bold number
  - Render ability keyword chip at bottom of card (below name), color-coded by trigger type
  - Render legendary shimmer border (animated alpha tween, 0.35-0.8, 900ms period)
- [ ] Implement long-press detection on card containers:
  - On `pointerdown`: start 300ms `delayedCall` timer, store pointer position
  - On `pointermove`: if moved > 10px, cancel timer
  - On `pointerup` before 300ms: cancel timer (this was a tap)
  - On timer fire: call `showInfoPanel(cardInstance)`
- [ ] Implement `showInfoPanel(card: CardInstance)`:
  - Create overlay Container at info panel bounds (x=12, y=556, w=366, h=180)
  - Animate slide from y=844 to y=556 (160ms, Cubic.easeOut)
  - Render dark background, portrait frame, name, stat badges, trait row, ability text from `ABILITY_REGISTRY`
  - Hide action bar while panel is showing
  - Add full-screen invisible hit area for dismiss
  - On dismiss: animate slide to y=844 (120ms, Cubic.easeIn), restore action bar
- [ ] Handle `peek_offered` event — show peek UI:
  - Display preview card face-up centered above action bar
  - Show "Accept" (green) and "Reject" (red) buttons
  - On Accept: call `acceptPeekInSession()`, animate card to barn slot
  - On Reject: call `rejectPeekInSession()`, animate card fading away
- [ ] Handle `boot_requested` event — show boot UI:
  - Highlight valid target cards with pulsing red outline (500ms loop)
  - Show instructional text: "Tap an animal to remove"
  - Show "Cancel" button to forfeit
  - On card tap: call `executeBootInSession()`, animate target shrink + fade (200ms)
  - On cancel: forfeit ability, clear prompt
- [ ] Handle `fetch_requested` event — show fetch UI:
  - Show overlay list of candidate animal types (name + mini sprite), sorted alphabetically
  - On candidate tap: call `executeFetchInSession()`, animate card entering barn
  - Show "Cancel" button to skip fetch
- [ ] Handle `abilities_refreshed` event:
  - Brief scale pulse on refreshed cards (1.0 -> 1.05 -> 1.0, 200ms)
- [ ] Handle manual ability activation (Stable Hand):
  - Barn cards with `abilityKind` trigger `manual` and `abilityUsed === false` show a tap indicator
  - On tap: call `activateManualAbilityInSession()`, which triggers boot UI
- [ ] Handle `win_triggered` event — show victory overlay:
  - Camera zoom burst (1.0 -> 1.04 -> 1.0, 450ms, Expo.easeOut)
  - Full-screen overlay rises from y=900 to center (260ms, Back.easeOut)
  - "YOU WIN!" text (32px bold, gold `#ffd700`)
  - Display 3 Legendary sprites enlarged
  - Show final score: total Mischief, total Hay, Nights played
  - "Play Again" button -> `gameStore.reset()`, `this.scene.start(SceneKey.Barn)`
- [ ] Update DOM phase attributes:
  - `data-phase="ability_decision"` when `pendingDecision` is set
  - `data-phase="win"` when win overlay is active

**Tests:**
- [ ] DOM attribute `data-phase="ability_decision"` set when peek/boot/fetch prompt opens
- [ ] DOM attribute `data-phase="win"` set on win
- [ ] Info panel does not overlap action bar (action bar hidden during panel)
- [ ] All interactive elements maintain 44px minimum tap target

### Phase 5: Trading Post Updates (~10%)

**Goal:** Add paginated tabs with Legendary section and new ability animals to the Trading Post.

**Files:**
- `src/scenes/TradingPostScene.ts` — Modify
- `src/scenes/tradingPostLayout.ts` — Modify

**Tasks:**
- [ ] Implement tab navigation in Trading Post:
  - Tab 1: "Animals" — Common + active-ability animals (2-column grid)
  - Tab 2: "Legendary" — All 8 Legendary animals (2-column grid)
  - Tab buttons at top of scene, active tab highlighted
- [ ] Update `tradingPostLayout.ts`:
  - `getTabButtonPositions()` — positions for tab buttons
  - `getShopGridPositions(itemCount)` — 2-column grid for active tab's items
- [ ] Render Legendary cards with gold background (`CARD_LEGENDARY` texture), star icon, shimmer animation
- [ ] Show ability keyword on shop cards (same chip style as barn cards)
- [ ] Enforce Legendary stock = 1 and affordability updates after purchases
- [ ] Long-press on shop cards triggers info panel (reuse info panel pattern from BarnScene)
- [ ] Show ability summary text below cost on shop cards for active-ability animals

**Tests:**
- [ ] `shop.test.ts`: Legendary items in market with correct costs (30, 35, 40, 45, 45, 50, 50, 55)
- [ ] `shop.test.ts`: Legendary stock = 1 per animal
- [ ] `shop.test.ts`: Purchasing a Legendary reduces stock to 0, item no longer available
- [ ] `shop.test.ts`: Active-ability animals appear with stock = 3
- [ ] Tab navigation: switching tabs renders correct item set

### Phase 6: Verification & Hardening (~10%)

**Goal:** All tests green, deterministic seeds, screenshots proving all features.

**Tasks:**
- [ ] Add verification seeds for Sprint 003:
  - `sprint3-peek` — Sheepdog drawn early, produces peek prompt
  - `sprint3-boot` — Stable Hand drawn with full barn, produces boot prompt
  - `sprint3-fetch` — Border Collie drawn, fetch candidate list available
  - `sprint3-legendary-win` — multi-night seed: buy Legendaries across nights, draw 3 in one Night
  - `sprint3-abilities` — multiple ability animals in same Night for combo testing
- [ ] Run all existing unit tests: `npm run test` — all green
- [ ] Run new ability, win condition, and roster tests — all green
- [ ] Run `npm run ci` — all checks green
- [ ] Run `npm run budget` — app chunk < 100KB gzipped
- [ ] Extend Playwright smoke test to assert `data-scene="Barn"` and new phase values
- [ ] Add seeded Playwright test for ability flow
- [ ] `agent-browser` screenshot verification:
  1. Card readability: draw 3 animals -> screenshot showing 96x104 cards with clear 32px badges, ability chips, NOISY! stripe
  2. Info panel: long-press a card -> screenshot showing bottom panel with full details
  3. Peek ability: `?seed=sprint3-peek`, draw Sheepdog -> screenshot of peek UI with Accept/Reject
  4. Boot ability: `?seed=sprint3-boot`, draw Stable Hand -> screenshot of boot target selection
  5. Fetch ability: `?seed=sprint3-fetch`, draw Border Collie -> screenshot of fetch candidate list
  6. Trading Post Legendaries: continue to shop -> screenshot showing gold Legendary cards in tab 2
  7. Win screen: `?seed=sprint3-legendary-win`, play to win -> screenshot of victory overlay with 3 Legendaries
  8. Repeat against `npm run preview` to ensure production build works

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/game/abilities.ts` | Create | Ability registry: `AbilityKind`, `AbilityTrigger`, `AbilityDef`, `ABILITY_REGISTRY` |
| `src/game/abilityResolver.ts` | Create | On-enter and manual ability dispatch: peek, boot, fetch, refresh resolution |
| `src/game/types.ts` | Modify | Add `AnimalTier`, `PendingDecision`, `WinState`, `abilityUsed` on `CardInstance`, new `NightEvent` variants, new `GamePhase` values, `pendingDecision`/`legendaryCount`/`wonThisNight` on `NightState`, array-based penned-up + `winState` on `GameSession` |
| `src/game/animals.ts` | Modify | Add `abilityKind`/`tier` to all existing animals, add Sheepdog, StableHand, BorderCollie, CheerfulLamb, all 8 Legendaries |
| `src/game/night.ts` | Modify | Integrate ability resolution after draw, 7-step entry pipeline, win condition check |
| `src/game/scoring.ts` | Modify | Add `abilityKind`-based dispatch for score bonuses (alongside existing boolean checks) |
| `src/game/session.ts` | Modify | Array-based penned-up handling, ability response functions, win state tracking |
| `src/game/shop.ts` | Modify | Legendary stock (1 each), new animals in market, `ShopStock` type expansion |
| `src/game/deck.ts` | Modify | Initialize `abilityUsed` on `CardInstance`, Sprint 003 verification seeds |
| `src/game/gameStore.ts` | Modify | Reset function clears win state and array-based penned-up |
| `src/scenes/BootScene.ts` | Modify | Generate new textures: legendary card bg, NOISY! stripe, ability strips, star icon, info panel bg, larger badges |
| `src/scenes/BarnScene.ts` | Major rewrite | Card readability redesign (96x104, 32px badges), info panel overlay, ability prompt UIs (peek/boot/fetch), manual ability tap, win overlay |
| `src/scenes/barnLayout.ts` | Modify | Updated slot geometry for 96x104, `getInfoPanelBounds()`, dynamic slots for cap 5-8 |
| `src/scenes/TradingPostScene.ts` | Modify | Paginated tabs (Animals/Legendary), ability keywords on shop cards, info panel on long-press |
| `src/scenes/tradingPostLayout.ts` | Modify | Tab layout, two-section grid positions |
| `src/config/constants.ts` | Modify | New palette entries, texture keys, layout constants, animation timings |
| `src/types/index.ts` | Modify | No new scene keys needed (same scene flow) |
| `src/game/abilities.test.ts` | Create | Registry completeness, ability parameter validation |
| `src/game/abilityResolver.test.ts` | Create | Peek/boot/fetch/refresh unit tests, edge cases, chain-breaking |
| `src/game/night.test.ts` | Extend | Win condition tests, ability integration tests, bust > win precedence |
| `src/game/scoring.test.ts` | Extend | Verify `abilityKind`-based dispatch produces same results as boolean dispatch |
| `src/game/session.test.ts` | Extend | Array-based penned-up lifecycle, ability session wrappers |
| `src/game/shop.test.ts` | Extend | Legendary market stock/cost tests, new animal availability |
| `src/scenes/barnLayout.test.ts` | Extend | 96x104 slot bounds for cap 5-8, info panel bounds, no overlaps |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Info panel and ability phase DOM checks |
| `tests/e2e/seeded-flow.spec.ts` | Extend | Seeded ability + legendary win verification |

---

## Definition of Done

1. **Ability registry**: `ABILITY_REGISTRY` defines all 8 ability kinds. Every animal references an `abilityKind` that resolves to a registry entry. Both `abilityKind` and legacy boolean fields are present on `AnimalDef`.

2. **Card readability**: Cards are 96x104 with 32px resource badges (gold for Mischief, green for Hay), 14px bold numbers, NOISY! red stripe, ability keyword chips, and legendary gold shimmer border. Readable on a 390px-wide phone screen without zooming.

3. **Info panel**: Long-pressing (300ms) any barn card opens a bottom-sheet overlay (x=12, y=556, w=366, h=180) with full stats and ability description from the registry. Action bar hidden while showing. Tap outside to dismiss.

4. **Sheepdog (Peek)**: Drawing a Sheepdog auto-triggers peek. Next card revealed face-up. Accept places in barn (full pipeline, chain-breaking). Reject sends to deck bottom. Empty deck = skip.

5. **Stable Hand (Boot)**: Tap-to-activate. Player taps Stable Hand card, then taps a target. Cannot boot Legendaries. Boot self = forfeit. Booted animal added to `pendingPennedUpCardIds`.

6. **Border Collie (Fetch)**: Auto-triggers on entry. Shows unique deck animal types alphabetically, excluding Legendaries. Selected card enters barn. Fetched card does NOT trigger on_enter abilities. Can cause bust.

7. **Cheerful Lamb (Refresh)**: Auto-resolves on entry. Resets `abilityUsed = false` on all other barn animals. Does not refresh itself. Visual pulse on refreshed cards.

8. **All 8 Legendary Animals**: Available in Trading Post at costs 30-55 Mischief, stock 1 each. Gold card backgrounds, star icons, shimmer animation. Silver Mare cancels 1 NOISY!, Great Stag has boot, Barn Dragon has fetch. Others provide modest Mischief/Hay.

9. **Win condition**: 3 Legendary Animals simultaneously in barn triggers `win_triggered` event. Win overlay shows with final score and "Play Again" button. Win Night scores normally.

10. **Bust > win**: If same card entry causes both bust and 3 Legendaries, bust takes precedence. No win.

11. **Penned Up stacking**: Array-based. Boot + bust in same Night = 2 penned animals. All restored after 1 Night.

12. **Chain-breaking**: Fetched and peek-accepted cards do NOT trigger on_enter abilities. Only player-drawn cards trigger abilities.

13. **Paginated Trading Post**: Tab 1 = Common/Ability animals, Tab 2 = Legendary. No scroll physics.

14. **Existing Sprint 002 behavior**: Warning, bust, score, shop loop all work. All Sprint 002 tests pass unchanged.

15. **New unit tests**: Ability resolver tests (peek, boot, fetch, refresh), win condition tests, edge cases (empty deck peek, boot-self forfeit, fetch-triggers-bust, bust > win, penned stacking).

16. **CI green**: `npm run ci` passes. App chunk under 100KB gzipped. No new npm dependencies.

17. **DOM markers**: `data-phase` updated for `ability_decision` and `win`. Existing markers preserved.

18. **Verification screenshots**: 7+ agent-browser screenshots proving card readability, info panel, each ability UI, Trading Post Legendaries, and win screen.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Ability interactions create hidden state bugs** | Medium | High | All ability state in `NightState` + explicit resolver actions + event emissions. Pure functions enable exhaustive unit testing. |
| **Ability chains cause infinite loops** | Medium | High | Hard rule: fetched/peeked cards do NOT trigger on_enter abilities. Only player-drawn cards trigger. Enforced in resolver and tested. |
| **Long-press conflicts with tap interactions** | Medium | Medium | 300ms threshold + 10px movement cancellation. Cards are in a fixed grid (not scrollable) in BarnScene. |
| **Readability gains break at capacity 8** | Medium | Medium | 96x104 cards + updated row positions tested for all capacities 5-8. Layout unit tests assert no overlaps and in-bounds. |
| **Bust vs win precedence confusion** | Medium | Medium | Defined in entry pipeline (step 3 before step 6). Locked with explicit unit test. |
| **Adapter approach adds complexity** | Low | Low | Both boolean and `abilityKind` fields work simultaneously. Scoring checks both paths. Booleans removed in Sprint 004. |
| **Legendary visuals hurt performance** | Low | Medium | Lightweight tweens and cached generated textures. No per-frame shader work. |
| **Paginated Trading Post UX** | Low | Medium | Two tabs is simpler and more reliable than Phaser scroll physics. Clear tab labels. |
| **Scope: 5 major features in one sprint** | High | High | Phasing is independently shippable. If scope must be cut: (1) card readability + info panel essential, (2) win condition essential, (3) abilities can ship peek + boot only (defer fetch + refresh). |
| **Bundle size with new textures** | Low | Medium | All textures generated via Graphics API (no new sprite assets). Monitor with `npm run budget` after Phase 3. |
| **State corruption across scene transitions** | Medium | High | `pendingDecision` lives on `NightState` in module-level store. Scene transitions preserve it. No ability prompts survive browser refresh (acceptable for Sprint 003). |

---

## Security Considerations

- Static client-only site. No backend, auth, or network dependencies.
- Ability registry is compile-time data. No dynamic code evaluation.
- Fetch ability reveals deck contents (animal types) but not deck order. Candidates displayed alphabetically, not in deck order. This preserves push-your-luck tension.
- No new query parameters or user input surfaces beyond the existing `?seed=` parameter.
- Seed query parameter accepts only bounded string input. Never evaluated as code.
- All new textures are generated via Phaser Graphics API, not loaded from external sources.
- New DOM attributes (`data-phase="ability_decision"`, `data-phase="win"`) are read-only markers for tests.

---

## Dependencies

- **Existing stack**: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Existing canvas contract**: 390x844 logical resolution with Scale.FIT
- **Existing bundle budget**: Phaser chunk < 400KB gzipped, app chunk < 100KB gzipped
- **Sprint 002 deliverables**: game store, session management, night flow, scoring, shop, BarnScene, TradingPostScene must all be working and green
- **Existing art pipeline**: BootScene generated textures + local animals atlas
- **No new npm dependencies**

---

## Open Questions

1. **Should Great Stag and Barn Dragon abilities trigger on entry or be manual?** This document specifies Great Stag boot as `manual` (consistent with Stable Hand) and Barn Dragon fetch as `on_enter` (consistent with Border Collie). Playtesting may suggest switching both to manual for Legendaries.

2. **Silver Mare NOISY! mitigation stacking**: Silver Mare uses the same `noisy_mitigation` ability kind as Bunny and Honey Bee. The `params.count: 1` means it cancels exactly 1 NOISY! animal. This stacks with other mitigators. Confirm this is the intended behavior.

3. **Release to the Wild**: INTENT.md describes a deck-thinning mechanic (spend 3 Mischief before a Night to permanently remove an animal). Not included in Sprint 003. Defer to Sprint 004.

4. **Post-win freeplay**: Current design ends the session on win ("Play Again" resets). An alternative is allowing continued play after winning. Propose: hard stop for Sprint 003, revisit if playtesting demands freeplay.

5. **Legendary count display in header**: Should the barn header show "Legendary: 1/3" progress during a Night? Cheap to implement, helps players track win progress. Propose: yes, add to header banner alongside Mischief/Hay.
