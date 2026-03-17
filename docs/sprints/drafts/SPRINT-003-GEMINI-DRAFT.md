# Sprint 003: Win Condition, Abilities, & Card Readability

## Overview

Sprint 003 layers three interlocking systems onto the playable core loop from Sprint 002: (1) a card readability overhaul so players can parse animal stats at a glance, (2) an info panel on long-press for full details, (3) a data-driven ability engine, (4) Legendary Animals as the win condition, and (5) four active-ability animals. The guiding architectural thesis of this draft is that **abilities should be entirely data-driven** rather than hardcoded per-animal, that the **info panel should be an overlay within BarnScene** (not a separate mini-scene), that **Legendary Animals should be regular `AnimalDef` entries distinguished by a `tier` field** (not a separate type), and that **phasing should be abilities-engine-first** so that card readability work can leverage the ability metadata it needs to display.

### Why Abilities-First Phasing?

The card readability overhaul needs to display ability keywords, icons, and tier indicators. If we build cards first without the ability data model, we build them twice: once with placeholder slots, once with real data. By building the ability registry and animal definitions first, the card rendering phase has real data to work with from the start. This front-loads the riskiest work (the ability engine) and back-loads the most visible work (UI polish), which means problems surface early when there is still time to adjust scope.

### Why Data-Driven Abilities?

The current `AnimalDef` encodes abilities as ad-hoc boolean flags (`noisyMitigation`, `givesHermitCrabBonus`, `givesDraftPonyBonus`). This was fine for Sprint 002's small roster, but Sprint 003 adds 4 active abilities plus Legendary Animals, and INTENT.md describes 20+ unique ability types across the full roster. Hardcoding each as a new boolean or switch-case branch creates a combinatorial maintenance burden. Instead, this draft proposes an `AbilityDef` registry: each ability is a named record with a `kind` discriminator, a `trigger` type, human-readable description text, and typed parameters. The ability resolver is a single function that dispatches on `kind`. New abilities are added by writing one registry entry and one handler case — no new fields on `AnimalDef`, no new boolean flags, no new event types per ability.

### Why Overlay Instead of Mini-Scene?

Phaser scene transitions destroy the current scene's display list. An info panel as a separate scene would require either running scenes in parallel (fragile in Phaser 3) or re-creating the barn visuals as a background image (wasteful). An overlay `Container` within BarnScene is simpler: it renders on top of the existing barn, can reference the tapped card's screen position, and dismisses with a single `container.destroy()`. The same approach already works for the bust overlay and night summary overlay in the current codebase. Consistency wins.

### Why `tier` Instead of a Separate `LegendaryAnimal` Type?

INTENT.md's Legendary Animals have the same fields as regular animals: cost, mischief, hay, abilities. The only differences are visual treatment, higher cost, and inclusion in the win condition check. A `tier: 'common' | 'legendary'` field on the existing `AnimalDef` is sufficient. This avoids a parallel type hierarchy, avoids duplicating roster lookup functions, and lets the shop, deck, and scoring systems work unchanged. The win condition check is a simple filter: `barn.filter(card => getAnimalDef(card.animalId).tier === 'legendary').length >= 3`.

---

## Use Cases

1. **Card readability at a glance** — Player draws an animal. The card displays the animal name, sprite, mischief/hay values in large high-contrast badges, a tier indicator (common vs. legendary border), a NOISY! badge if applicable, and an ability keyword strip (e.g., "ACTIVE: Peek" or "PASSIVE: -1 Noise"). Without tapping, the player knows what the card does.

2. **Long-press info panel** — Player long-presses (300ms hold) on any animal card in the barn. A bottom-sheet overlay slides up from below, showing the full animal name, enlarged sprite, all stats, ability description text, NOISY! status, and tier. Tapping anywhere outside the panel or tapping a dismiss button closes it. On desktop, hovering for 500ms triggers the same panel.

3. **Legendary Animals in the Trading Post** — The Trading Post now shows a "Legendary" section with 4 Legendary Animals at high Mischief costs (30-55). Legendary cards have a distinct gold border and a star icon. Stock is 1 copy each.

4. **Win condition: 3 Legendaries** — During a Night, if the barn contains 3 or more Legendary Animals simultaneously (after any draw resolves), a `win_achieved` event fires. The scene shows a victory overlay with a celebratory animation. The game session is marked as won.

5. **Sheepdog ability (Peek)** — Player draws a Sheepdog. After it enters the barn, the next card is revealed face-up in a "peek zone." The player chooses "Accept" (card enters barn normally) or "Reject" (card goes to bottom of deck). The peek state is tracked on `NightState`.

6. **Stable Hand ability (Boot)** — Player draws a Stable Hand. A "Boot" prompt appears. The player taps one animal in the barn to remove it (it is Penned Up next Night). If the player taps the Stable Hand itself, the ability is forfeited.

7. **Border Collie ability (Fetch)** — Player draws a Border Collie. A scrollable list of remaining deck animals appears. The player taps one to pull it directly into the barn (skipping the draw). If the player dismisses without choosing, no fetch occurs.

8. **Cheerful Lamb ability (Refresh)** — Player draws a Cheerful Lamb. All animals in the barn that have already used their active ability this Night have their `abilityUsed` flag reset. This is automatic, no player choice required.

---

## Architecture

### Ability Registry (Data-Driven)

Rather than encoding abilities as boolean flags on `AnimalDef`, we define a standalone ability registry.

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
  label: string;          // Short label for card display, e.g. "Peek"
  description: string;    // Full text for info panel
  params: Record<string, number>;  // Ability-specific parameters
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
    trigger: 'on_enter',
    label: 'Boot',
    description: 'Remove one animal from the barn. It is Penned Up next Night.',
    params: { count: 1 },
  },
  fetch: {
    kind: 'fetch',
    trigger: 'on_enter',
    label: 'Fetch',
    description: 'Pull a specific animal from the remaining deck directly into the barn.',
    params: {},
  },
  refresh: {
    kind: 'refresh',
    trigger: 'on_enter',
    label: 'Refresh',
    description: 'Reset all used active abilities of animals currently in the barn.',
    params: {},
  },
};
```

Each `AnimalDef` gains an `abilityKind: AbilityKind` field. The lookup is `ABILITY_REGISTRY[animalDef.abilityKind]`. This replaces `noisyMitigation`, `givesHermitCrabBonus`, and `givesDraftPonyBonus` — those become `abilityKind: 'noisy_mitigation'`, `abilityKind: 'bonus_per_empty_slot'`, and `abilityKind: 'bonus_per_barn_cat'` respectively.

### Revised Type Definitions

```typescript
// Additions to src/game/types.ts

export type AnimalTier = 'common' | 'legendary';

export type AnimalId =
  | 'BarnCat'
  | 'FeralGoat'
  | 'PotBelliedPig'
  // ... existing ...
  | 'Sheepdog'
  | 'StableHand'
  | 'BorderCollie'
  | 'CheerfulLamb'
  // Legendaries
  | 'GoldenGoose'
  | 'GiantOx'
  | 'Jackalope'
  | 'Thunderbird';

export type ShopAnimalId =
  | 'Bunny'
  | 'Hen'
  | 'WildBoar'
  | 'HermitCrab'
  | 'DraftPony'
  | 'StruttingPeacock'
  | 'MilkmaidGoat'
  | 'HoneyBee'
  // New Sprint 003
  | 'Sheepdog'
  | 'StableHand'
  | 'BorderCollie'
  | 'CheerfulLamb'
  // Legendaries
  | 'GoldenGoose'
  | 'GiantOx'
  | 'Jackalope'
  | 'Thunderbird';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  costMischief: number | null;
  mischief: number;
  hay: number;
  noisy: boolean;
  tier: AnimalTier;
  abilityKind: AbilityKind;
  inShop: boolean;
}

export interface CardInstance {
  id: string;
  animalId: AnimalId;
  abilityUsed: boolean;  // Tracks whether on_enter ability has fired this Night
}

// New NightState fields
export interface PeekState {
  peekedCard: CardInstance;
  sourceCardId: string;  // The Sheepdog/Wise Owl that triggered peek
}

export interface BootState {
  sourceCardId: string;
  count: number;
}

export interface FetchState {
  sourceCardId: string;
  candidates: CardInstance[];
}

export type AbilityPrompt =
  | { type: 'peek'; state: PeekState }
  | { type: 'boot'; state: BootState }
  | { type: 'fetch'; state: FetchState };

export interface NightState {
  // ... existing fields ...
  abilityPrompt: AbilityPrompt | null;
  legendaryCount: number;  // Cached count of legendary animals in barn
  won: boolean;
}

// New NightEvent variants
export type NightEvent =
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
  | { type: 'peek_offered'; peekedCard: CardInstance }
  | { type: 'peek_accepted'; card: CardInstance }
  | { type: 'peek_rejected'; card: CardInstance }
  | { type: 'boot_requested'; sourceCardId: string }
  | { type: 'boot_executed'; bootedCard: CardInstance }
  | { type: 'fetch_requested'; sourceCardId: string; candidates: CardInstance[] }
  | { type: 'fetch_executed'; fetchedCard: CardInstance }
  | { type: 'abilities_refreshed'; refreshedCardIds: string[] }
  | { type: 'win_achieved'; legendaryCards: CardInstance[] };

// Session additions
export interface GameSession {
  // ... existing fields ...
  won: boolean;
}
```

### Ability Resolver

```typescript
// src/game/abilityResolver.ts

import { ABILITY_REGISTRY } from './abilities';
import type { AbilityKind, CardInstance, NightState, NightEvent } from './types';

/**
 * Called after a card enters the barn. Checks if it has an on_enter ability
 * and either auto-resolves it (refresh) or sets up a prompt (peek, boot, fetch).
 */
export const resolveOnEnter = (
  state: NightState,
  enteredCard: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  const ability = ABILITY_REGISTRY[getAnimalDef(enteredCard.animalId).abilityKind];
  if (ability.trigger !== 'on_enter') {
    return { state, events: [] };
  }

  switch (ability.kind) {
    case 'peek':
      return resolvePeek(state, enteredCard);
    case 'boot':
      return resolveBoot(state, enteredCard);
    case 'fetch':
      return resolveFetch(state, enteredCard);
    case 'refresh':
      return resolveRefresh(state, enteredCard);
    default:
      return { state, events: [] };
  }
};
```

This single dispatch function replaces what would otherwise be per-animal if/else chains scattered through `night.ts`. Adding a new ability means: (1) add a `kind` to `AbilityKind`, (2) add an entry to `ABILITY_REGISTRY`, (3) add a case to `resolveOnEnter`.

### Win Condition Check

The win check is a pure function called after every successful card entry:

```typescript
export const checkWinCondition = (barn: CardInstance[]): boolean => {
  const legendaryCount = barn.filter(
    card => getAnimalDef(card.animalId).tier === 'legendary'
  ).length;
  return legendaryCount >= 3;
};
```

This integrates into `drawAnimal()` after bust-check passes. If win is detected, a `win_achieved` event is emitted and the night completes with scoring (the player still gets their Mischief/Hay, unlike a bust).

### Info Panel (Overlay Container)

The info panel is a `Phaser.GameObjects.Container` rendered within BarnScene, positioned at the bottom of the screen. It is created on long-press and destroyed on dismissal.

Implementation:
- Each card container in BarnScene gets a `pointerdown` + `pointerup` timer.
- If `pointerdown` lasts 300ms without `pointerup`, create the info panel.
- The panel covers the bottom ~40% of the screen (y: 506 to 844, width: 390).
- Semi-transparent dark background, animal sprite (large, 4x scale), name, tier badge, all stats, full ability description from `ABILITY_REGISTRY`.
- Tap anywhere on the panel or outside it to dismiss.
- While the info panel is showing, the draw button is disabled to prevent accidental draws.

### Card Readability Redesign

The current 88x88 cards use 10px text and tiny 24x24 badge circles. The redesign:

- **Mischief**: Gold banner across top-left corner, 14px bold white number. High contrast.
- **Hay**: Green banner across top-right corner, 14px bold white number.
- **NOISY! badge**: Red diagonal stripe across top of card (not a tiny triangle). Unmistakable.
- **Ability keyword**: Bottom strip below animal name. Background color coded by trigger type:
  - Active (on_enter): blue strip, white text "PEEK" / "BOOT" / "FETCH" / "REFRESH"
  - Passive: green strip, white text "QUIET" / etc.
  - Triggered (on_score): yellow strip, dark text "HERMIT" / "HERDER"
  - None: no strip
- **Legendary border**: Gold animated shimmer border (2px thick, tween alpha oscillation).
- **Animal name**: 10px bold, centered below sprite. Unchanged.

All badge textures are generated in `BootScene` via `Phaser.GameObjects.Graphics.generateTexture()`.

### Legendary Visuals in Trading Post

Legendary cards in the Trading Post get:
- Gold card background (new texture `TEXTURES.CARD_LEGENDARY`).
- Star icon next to the animal name.
- A section header "LEGENDARY" separating them from common animals.
- Stock of 1 each (vs. 3 for common animals).

### Scene Flow (Unchanged)

```
BootScene -> BarnScene -> TradingPostScene -> BarnScene -> ...
                |
                v (on win)
           Victory Overlay (within BarnScene)
```

No new scenes. The victory screen is an overlay container within BarnScene, same pattern as bust/summary overlays.

---

## Implementation

### Phase 1: Ability Registry & Type System (~20%)

**Goal:** Establish the data-driven ability model and update all type definitions. Migrate existing boolean-flag abilities to the registry. All existing tests must still pass after migration.

**Files:**
- `src/game/abilities.ts` — Create
- `src/game/types.ts` — Modify
- `src/game/animals.ts` — Modify
- `src/game/scoring.ts` — Modify
- `src/game/night.ts` — Modify
- `src/game/deck.ts` — Modify

**Tasks:**
- [ ] Create `src/game/abilities.ts` with `AbilityKind`, `AbilityTrigger`, `AbilityDef`, and `ABILITY_REGISTRY` as defined in Architecture
- [ ] Add `AnimalTier` type alias (`'common' | 'legendary'`) to `types.ts`
- [ ] Add `AbilityPrompt` union type, `PeekState`, `BootState`, `FetchState` to `types.ts`
- [ ] Add `abilityPrompt: AbilityPrompt | null`, `legendaryCount: number`, `won: boolean` to `NightState`
- [ ] Add `won: boolean` to `GameSession`
- [ ] Replace `noisyMitigation: number`, `givesHermitCrabBonus: boolean`, `givesDraftPonyBonus: boolean` with `abilityKind: AbilityKind` and `tier: AnimalTier` on `AnimalDef`
- [ ] Add `abilityUsed: boolean` to `CardInstance` interface
- [ ] Update `createCardInstance()` in `deck.ts` to initialize `abilityUsed: false`
- [ ] Update all animal definitions in `animals.ts`:
  - Bunny: `abilityKind: 'noisy_mitigation'`, `tier: 'common'`
  - Honey Bee: `abilityKind: 'noisy_mitigation'`, `tier: 'common'`
  - Hermit Crab: `abilityKind: 'bonus_per_empty_slot'`, `tier: 'common'`
  - Draft Pony: `abilityKind: 'bonus_per_barn_cat'`, `tier: 'common'`
  - All others without abilities: `abilityKind: 'none'`, `tier: 'common'`
- [ ] Update `countUnmitigatedNoisy()` in `night.ts` to use `ABILITY_REGISTRY[def.abilityKind].kind === 'noisy_mitigation'` and `ABILITY_REGISTRY[def.abilityKind].params.count` instead of `def.noisyMitigation`
- [ ] Update `scoreMischief()` in `scoring.ts` to dispatch on `abilityKind` instead of boolean flags:
  - `bonus_per_empty_slot`: use `ABILITY_REGISTRY[def.abilityKind].params.perSlot * emptySlots`
  - `bonus_per_barn_cat`: use `ABILITY_REGISTRY[def.abilityKind].params.perCat * barnCatCount`
- [ ] Add new `NightEvent` variants to the union type: `ability_triggered`, `peek_offered`, `peek_accepted`, `peek_rejected`, `boot_requested`, `boot_executed`, `fetch_requested`, `fetch_executed`, `abilities_refreshed`, `win_achieved`
- [ ] Add new `GamePhase` values: `AbilityPeek`, `AbilityBoot`, `AbilityFetch`

**Tests:**
- [ ] Existing NOISY! mitigation tests pass unchanged (Bunny cancels 1 NOISY!, Honey Bee stacks)
- [ ] Existing scoring tests pass unchanged (Hermit Crab bonus, Draft Pony bonus)
- [ ] `ABILITY_REGISTRY` entries: every `AbilityKind` has a registry entry with non-empty `description`
- [ ] `getAnimalDef()` returns correct `abilityKind` and `tier` for all migrated animals
- [ ] `CardInstance` initializes with `abilityUsed: false`

### Phase 2: Active Abilities & Win Condition (~30%)

**Goal:** Implement the four active abilities (peek, boot, fetch, refresh) and the win condition. All ability interactions are unit-testable.

**Files:**
- `src/game/abilityResolver.ts` — Create
- `src/game/night.ts` — Modify
- `src/game/session.ts` — Modify
- `src/game/animals.ts` — Modify (add new animals)

**Tasks:**
- [ ] Create `src/game/abilityResolver.ts` with `resolveOnEnter()` dispatch function
- [ ] Implement peek resolution:
  - Draw top card from deck into `PeekState` without placing in barn
  - Set `abilityPrompt: { type: 'peek', state: { peekedCard, sourceCardId } }`
  - Set `phase: GamePhase.AbilityPeek`
  - Emit `peek_offered` event
- [ ] Implement `acceptPeek(state)`: place peeked card in barn, clear prompt, run bust/win check, emit `peek_accepted`
- [ ] Implement `rejectPeek(state)`: move peeked card to bottom of deck, clear prompt, emit `peek_rejected`
- [ ] Implement boot resolution:
  - Set `abilityPrompt: { type: 'boot', state: { sourceCardId, count: 1 } }`
  - Set `phase: GamePhase.AbilityBoot`
  - Emit `boot_requested` event
- [ ] Implement `executeBoot(state, targetCardId)`: remove target from barn, add to session's pending penned-up list, clear prompt, emit `boot_executed`
  - Edge case: cannot boot a Legendary animal
  - Edge case: cannot boot the Stable Hand itself (forfeits ability)
- [ ] Implement fetch resolution:
  - Build candidate list from remaining deck (excluding Legendary animals from deck — they can only be drawn naturally or bought)
  - Set `abilityPrompt: { type: 'fetch', state: { sourceCardId, candidates } }`
  - Set `phase: GamePhase.AbilityFetch`
  - Emit `fetch_requested` event
- [ ] Implement `executeFetch(state, targetCardId)`: remove target from deck, place in barn, run bust/win check, clear prompt, emit `fetch_executed`
  - **Design decision**: fetched animal's on_enter ability does NOT trigger (prevents infinite chains). Only the initial draw triggers abilities. This matches Party House behavior.
- [ ] Implement refresh resolution (auto-resolve, no prompt):
  - Reset `abilityUsed = false` on all barn cards except the Cheerful Lamb itself
  - Emit `abilities_refreshed` event with list of refreshed card IDs
- [ ] Integrate `resolveOnEnter()` into `drawAnimal()` in `night.ts`:
  - After card enters barn and bust check passes, call `resolveOnEnter()`
  - If an ability prompt is set, return early (scene will wait for player input)
  - If no prompt (auto-resolve or no ability), continue to player decision phase
- [ ] Implement `checkWinCondition()` as a pure function
- [ ] Integrate win check into `drawAnimal()` after bust check passes:
  - If `checkWinCondition(barn)` returns true, emit `win_achieved`, set `won: true` on NightState, complete the night with scoring
- [ ] Add session-level `respondToAbilityPrompt()` functions:
  - `acceptPeekInSession(session)` -> `SessionMutation`
  - `rejectPeekInSession(session)` -> `SessionMutation`
  - `executeBootInSession(session, targetCardId)` -> `SessionMutation`
  - `executeFetchInSession(session, targetCardId)` -> `SessionMutation`
- [ ] Add 4 new animals to `animals.ts`:
  - `Sheepdog`: cost 4, +2M, 0H, `abilityKind: 'peek'`, `tier: 'common'`
  - `StableHand`: cost 4, 0M, 0H, `abilityKind: 'boot'`, `tier: 'common'`
  - `BorderCollie`: cost 5, +2M, -1H, `abilityKind: 'fetch'`, `tier: 'common'`
  - `CheerfulLamb`: cost 5, +1M, 0H, `abilityKind: 'refresh'`, `tier: 'common'`
- [ ] Add 4 Legendary animals to `animals.ts`:
  - `GoldenGoose`: cost 30, 0M, 0H, `abilityKind: 'none'`, `tier: 'legendary'`
  - `GiantOx`: cost 35, 0M, 0H, `abilityKind: 'none'`, `tier: 'legendary'`
  - `Jackalope`: cost 40, 0M, 0H, `abilityKind: 'none'`, `tier: 'legendary'`
  - `Thunderbird`: cost 45, 0M, 0H, `abilityKind: 'none'`, `tier: 'legendary'`
- [ ] Update `ShopStock` type and `createDefaultShopStock()` to include new animals (active-ability animals: stock 3, Legendaries: stock 1)
- [ ] Mark Legendary animals as `abilityUsed: true` by default so they never trigger ability prompts (they have `abilityKind: 'none'` anyway, but belt-and-suspenders)

**Tests:**
- [ ] Peek: Sheepdog enters -> peek_offered event -> acceptPeek places card in barn -> rejectPeek sends to deck bottom
- [ ] Peek with empty deck: Sheepdog enters but deck is empty -> no peek offered, ability skipped
- [ ] Boot: Stable Hand enters -> boot_requested -> executeBoot removes target, target is penned up next night
- [ ] Boot: cannot boot a Legendary animal (returns error/no-op)
- [ ] Boot: boot self = forfeit (ability clears without effect)
- [ ] Fetch: Border Collie enters -> fetch_requested with candidate list -> executeFetch pulls from deck
- [ ] Fetch: fetched animal does NOT trigger its own on_enter ability
- [ ] Fetch + bust: fetched animal causes barn overflow -> bust triggers after fetch
- [ ] Refresh: Cheerful Lamb enters -> all other barn cards get abilityUsed reset -> abilities_refreshed event
- [ ] Win condition: 3 Legendaries in barn -> win_achieved event, night complete with scoring
- [ ] Win condition: 2 Legendaries in barn -> no win event
- [ ] Win + scoring: win night still scores full Mischief/Hay (unlike bust)
- [ ] Ability does not re-trigger after refresh when card was already in barn (only on_enter abilities fire on draw, not on refresh)
- [ ] Deterministic test: seeded game with Sheepdog in herd produces predictable peek sequence

### Phase 3: Card Readability & Info Panel (~25%)

**Goal:** Redesign card rendering for readability. Implement the long-press info panel.

**Files:**
- `src/scenes/BootScene.ts` — Modify (new textures)
- `src/scenes/BarnScene.ts` — Modify (card rendering, info panel, ability UI)
- `src/scenes/barnLayout.ts` — Modify (info panel layout)
- `src/config/constants.ts` — Modify (new palette entries, textures, layout constants)

**Tasks:**
- [ ] Add new texture keys to `TEXTURES` in `constants.ts`:
  - `CARD_LEGENDARY` (gold background)
  - `BADGE_NOISY_STRIPE` (red diagonal stripe)
  - `ABILITY_STRIP_ACTIVE` (blue strip)
  - `ABILITY_STRIP_PASSIVE` (green strip)
  - `ABILITY_STRIP_TRIGGERED` (yellow strip)
  - `BADGE_STAR` (star icon for Legendaries)
  - `INFO_PANEL_BG` (dark panel background)
- [ ] Add new palette entries: `LEGENDARY_GOLD: 0xd4a017`, `LEGENDARY_BORDER: 0xffd700`, `ABILITY_ACTIVE: 0x2d6a9f`, `ABILITY_PASSIVE: 0x4a7c59`, `ABILITY_TRIGGERED: 0xc4982a`
- [ ] Generate all new textures in `BootScene`:
  - Legendary card background: gold-tinted parchment
  - NOISY! stripe: 88x88 with red diagonal from top-left to mid-right
  - Ability strip backgrounds: 88x16 colored rectangles
  - Star icon: 16x16 generated star shape
  - Info panel background: 390x338 dark rectangle with rounded top corners
- [ ] Redesign `renderCardInSlot()` in BarnScene:
  - Select card background based on `tier` (legendary = gold) and `noisy` (red tint)
  - Render NOISY! stripe overlay at top of card if applicable
  - Render mischief badge as gold banner (top-left), 14px bold number
  - Render hay badge as green banner (top-right), 14px bold number
  - Render ability keyword strip at bottom of card (below name), color-coded by trigger type
  - Render legendary shimmer border (animated alpha tween, 0.6-1.0, 1200ms period)
- [ ] Add info panel layout to `barnLayout.ts`:
  - `getInfoPanelBounds(): Rect` — returns `{ x: 0, y: 506, w: 390, h: 338 }`
- [ ] Implement long-press detection on card containers:
  - On `pointerdown`: start a 300ms `delayedCall` timer, store reference
  - On `pointerup` before 300ms: cancel timer (this was a tap, not a long-press)
  - On timer fire: call `showInfoPanel(cardInstance)`
- [ ] Implement `showInfoPanel(card: CardInstance)`:
  - Create overlay Container at info panel bounds
  - Render dark background with rounded top corners
  - Render enlarged animal sprite (4x scale, centered)
  - Render animal name (18px bold), tier badge (star icon for legendary)
  - Render stats: "Mischief: +X" / "Hay: +X" in large text
  - Render NOISY! indicator if applicable
  - Render ability description from `ABILITY_REGISTRY[def.abilityKind].description`
  - Render "Tap to dismiss" hint at bottom
  - Add pointerdown listener on a full-screen invisible hit area to dismiss
  - Disable draw/action buttons while panel is showing
- [ ] Re-enable buttons on panel dismiss

**Tests:**
- [ ] Info panel layout: bounds are within 390x844 canvas
- [ ] Info panel does not overlap with action bar (action bar y=720, panel ends at y=844)
- [ ] `getInfoPanelBounds()` returns expected rect
- [ ] Card rendering: legendary cards use `CARD_LEGENDARY` texture
- [ ] Card rendering: noisy cards show stripe overlay
- [ ] Card rendering: ability strip appears for animals with `abilityKind !== 'none'`

### Phase 4: Ability UI in BarnScene (~15%)

**Goal:** Wire the ability prompts to interactive UI elements.

**Files:**
- `src/scenes/BarnScene.ts` — Modify

**Tasks:**
- [ ] Handle `peek_offered` event: show peek UI
  - Display the peeked card face-up in a "peek zone" (centered, above the action bar, slightly larger than normal card, 100x100)
  - Show two buttons: "Accept" (green) and "Reject" (red)
  - On "Accept": call `acceptPeekInSession()`, animate card from peek zone to next barn slot, resume normal flow
  - On "Reject": call `rejectPeekInSession()`, animate card fading/sliding away, resume normal flow
- [ ] Handle `boot_requested` event: show boot UI
  - Highlight all barn cards (except Legendaries) with a tappable "boot" outline (pulsing red border)
  - Show instructional text: "Tap an animal to remove it"
  - Show "Cancel" button to forfeit the boot
  - On card tap: call `executeBootInSession()`, animate card removal (shrink + fade), resume normal flow
  - On cancel: clear prompt, resume normal flow
- [ ] Handle `fetch_requested` event: show fetch UI
  - Show a scrollable list overlay of candidate cards from the deck
  - Each candidate rendered as a mini-card (name + sprite + stats)
  - On candidate tap: call `executeFetchInSession()`, animate card entering barn, resume normal flow
  - Show "Cancel" button to skip fetch
- [ ] Handle `abilities_refreshed` event: visual feedback
  - Brief glow/pulse on all refreshed cards (200ms scale tween 1.0 -> 1.05 -> 1.0)
- [ ] Handle `win_achieved` event: show victory overlay
  - Full-screen overlay with dark background
  - "YOU WIN!" text (32px bold, gold color)
  - Display the 3 Legendary Animals with enlarged sprites
  - Animated gold particle effect (Phaser particles or sprite-based shimmer)
  - Show final score: total Mischief, total Hay, number of Nights
  - "Play Again" button -> `gameStore.reset()`, `this.scene.start(SceneKey.Barn)`
- [ ] Update DOM phase attributes for ability phases:
  - `data-phase="ability_peek"` / `"ability_boot"` / `"ability_fetch"`

**Tests:**
- [ ] (Visual tests via agent-browser screenshots, not unit tests)
- [ ] DOM attributes update correctly during ability phases

### Phase 5: Trading Post Updates (~5%)

**Goal:** Add Legendary Animals and new ability animals to the Trading Post.

**Files:**
- `src/scenes/TradingPostScene.ts` — Modify
- `src/scenes/tradingPostLayout.ts` — Modify

**Tasks:**
- [ ] Add "LEGENDARY" section header in shop grid, separating common and legendary animals
- [ ] Render Legendary cards with gold background (`CARD_LEGENDARY` texture)
- [ ] Show star icon next to Legendary animal names
- [ ] Show ability keyword on shop cards (same strip as barn cards)
- [ ] Adjust grid layout: common animals (2-column grid, 12 items), then a divider, then Legendary animals (2-column, 4 items)
- [ ] Update `tradingPostLayout.ts` with expanded grid positions:
  - `getShopGridPositions(commonCount, legendaryCount)` — two-section layout
  - `getLegendarySectionHeaderPosition()` — y position for "LEGENDARY" text
- [ ] Make shop scrollable if content exceeds screen height (Phaser mask + drag)
- [ ] Long-press on shop cards also triggers info panel (reuse info panel logic)

**Tests:**
- [ ] Shop generates market with Legendaries at correct costs (30, 35, 40, 45 Mischief)
- [ ] Legendary stock is 1 per animal (not 3)
- [ ] Purchasing a Legendary reduces stock to 0

### Phase 6: Verification & Polish (~5%)

**Goal:** All tests green, screenshots proving all features.

**Tasks:**
- [ ] Add verification seeds for Sprint 003:
  - `sprint3-peek`: Sheepdog drawn early, produces peek prompt
  - `sprint3-boot`: Stable Hand drawn with full barn, produces boot prompt
  - `sprint3-fetch`: Border Collie drawn, fetch candidate list available
  - `sprint3-win`: arrange 3 Legendaries to be drawn in sequence (requires buying them first; use a multi-night seed)
- [ ] Run all existing unit tests: `npm run test`
- [ ] Run new ability and win condition tests
- [ ] Run `npm run ci` — all checks green
- [ ] Run `npm run budget` — app chunk < 100KB gzipped
- [ ] `agent-browser` screenshot verification:
  1. Card readability: draw 3 animals, screenshot showing clear badges, ability strips, NOISY! stripe
  2. Info panel: long-press a card, screenshot showing bottom panel with full details
  3. Peek ability: Sheepdog drawn, screenshot of peek UI with Accept/Reject buttons
  4. Boot ability: Stable Hand drawn, screenshot of boot selection UI
  5. Legendary in shop: Trading Post with gold Legendary cards visible
  6. Win screen: 3 Legendaries in barn, victory overlay screenshot

---

## Animal Roster (Sprint 003 Additions)

### Active-Ability Animals (New Purchasable)

| Animal | Cost | Mischief | Hay | Ability Kind | Trigger | Label |
|--------|------|----------|-----|-------------|---------|-------|
| Sheepdog | 4 | +2 | -- | peek | on_enter | Peek |
| Stable Hand | 4 | -- | -- | boot | on_enter | Boot |
| Border Collie | 5 | +2 | -1 | fetch | on_enter | Fetch |
| Cheerful Lamb | 5 | +1 | -- | refresh | on_enter | Refresh |

### Legendary Animals (Win Condition)

| Animal | Cost | Mischief | Hay | Ability Kind | Tier |
|--------|------|----------|-----|-------------|------|
| Golden Goose | 30 | -- | -- | none | legendary |
| Giant Ox | 35 | -- | -- | none | legendary |
| Jackalope | 40 | -- | -- | none | legendary |
| Thunderbird | 45 | -- | -- | none | legendary |

### Existing Animals (Modified Fields Only)

All existing animals gain `abilityKind` and `tier: 'common'`. No stat changes. The boolean flags `noisyMitigation`, `givesHermitCrabBonus`, `givesDraftPonyBonus` are removed and replaced by the `abilityKind` field.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/game/abilities.ts` | Create | Ability registry: AbilityKind, AbilityDef, ABILITY_REGISTRY |
| `src/game/abilityResolver.ts` | Create | On-enter ability dispatch: peek, boot, fetch, refresh resolution |
| `src/game/types.ts` | Modify | Add AnimalTier, AbilityPrompt, PeekState, BootState, FetchState, abilityUsed on CardInstance, new NightEvent variants, new GamePhase values, legendaryCount/won on NightState, won on GameSession |
| `src/game/animals.ts` | Modify | Replace boolean flags with abilityKind/tier, add Sheepdog, StableHand, BorderCollie, CheerfulLamb, 4 Legendaries |
| `src/game/night.ts` | Modify | Integrate ability resolution after draw, win condition check, ability prompt phases |
| `src/game/scoring.ts` | Modify | Dispatch on abilityKind for score bonuses instead of boolean flags |
| `src/game/session.ts` | Modify | Add ability response functions (acceptPeek, rejectPeek, executeBoot, executeFetch), win state tracking |
| `src/game/shop.ts` | Modify | Add Legendary stock (1 each), new animals in market |
| `src/game/deck.ts` | Modify | Initialize abilityUsed on CardInstance, Sprint 003 verification seeds |
| `src/scenes/BootScene.ts` | Modify | Generate new textures: legendary card bg, NOISY! stripe, ability strips, star icon, info panel bg |
| `src/scenes/BarnScene.ts` | Modify | Card readability redesign, info panel overlay, ability prompt UIs (peek/boot/fetch), win overlay |
| `src/scenes/barnLayout.ts` | Modify | Add getInfoPanelBounds(), peek zone position |
| `src/scenes/TradingPostScene.ts` | Modify | Legendary section, ability keywords on shop cards, scrollable grid, info panel on long-press |
| `src/scenes/tradingPostLayout.ts` | Modify | Two-section grid layout (common + legendary) |
| `src/config/constants.ts` | Modify | New palette entries, texture keys, layout constants for info panel and ability UI |
| `src/game/abilities.test.ts` | Create | Registry completeness, ability parameter validation |
| `src/game/abilityResolver.test.ts` | Create | Peek/boot/fetch/refresh unit tests, edge cases |
| `src/game/night.test.ts` | Modify | Add win condition tests, ability integration tests |
| `src/game/scoring.test.ts` | Modify | Update tests to verify abilityKind-based dispatch (same expected results) |

---

## Definition of Done

1. **Ability registry**: Every animal's ability is defined via `abilityKind` lookup into `ABILITY_REGISTRY`. No per-animal boolean flags remain on `AnimalDef`.

2. **Card readability**: Mischief/Hay values are visible in 14px bold badges. NOISY! animals have an unmistakable red stripe. Ability keywords are displayed in color-coded strips. A non-gamer can identify what a card does at arm's length on a phone screen.

3. **Info panel**: Long-pressing (300ms) any barn card shows a bottom-sheet overlay with full stats and ability description. Panel dismisses on tap. Draw buttons are disabled while panel is showing.

4. **Sheepdog (Peek)**: Drawing a Sheepdog reveals the next card. Player can accept or reject. Reject sends to deck bottom. Accept places in barn with bust/win checks.

5. **Stable Hand (Boot)**: Drawing a Stable Hand prompts player to remove one non-Legendary animal from the barn. Removed animal is Penned Up next Night.

6. **Border Collie (Fetch)**: Drawing a Border Collie shows deck candidates. Player picks one to enter the barn directly. Fetched animal does not trigger its own on_enter ability.

7. **Cheerful Lamb (Refresh)**: Drawing a Cheerful Lamb automatically resets all other barn animals' `abilityUsed` flags with visual feedback.

8. **Legendary Animals in shop**: 4 Legendary Animals available in Trading Post at costs 30/35/40/45 Mischief, stock 1 each, with gold card backgrounds and star icons.

9. **Win condition**: Having 3 Legendary Animals in the barn simultaneously during a Night triggers a win screen with final score display.

10. **Existing tests pass**: All Sprint 002 tests pass after the boolean-flag-to-abilityKind migration.

11. **New tests**: Ability resolver tests (peek, boot, fetch, refresh), win condition tests, edge case tests (empty deck peek, boot-self forfeit, fetch-triggers-bust).

12. **CI green**: `npm run ci` passes. App chunk stays under 100KB gzipped.

13. **DOM markers**: `data-phase` updated for ability phases (`ability_peek`, `ability_boot`, `ability_fetch`). Existing markers preserved.

14. **Verification screenshots**: 6+ agent-browser screenshots proving card readability, info panel, each ability UI, Legendaries in shop, and win screen.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Ability-first phasing delays visible progress** | Medium | Medium | Phase 1 is pure types/data — fast to implement, easy to verify. Phase 3 (card readability) produces the most visible change and comes mid-sprint, not last. |
| **Data-driven registry adds indirection** | Low | Low | The registry is a flat Record lookup, not a class hierarchy. TypeScript's type system ensures exhaustive handling. Less code than the boolean-flag alternative for 8+ abilities. |
| **Fetch ability reveals deck order** | Medium | Medium | The fetch UI shows available animals but NOT their order. Candidates are displayed alphabetically, not in deck order. This preserves push-your-luck tension. |
| **Ability chains (fetch triggers peek, etc.)** | Medium | High | Hard rule: fetched/peeked animals do NOT trigger on_enter abilities. Only the card drawn by the player's "DRAW ANIMAL" action triggers abilities. This prevents infinite loops and combinatorial explosion. |
| **Long-press conflicts with scroll on mobile** | Medium | Medium | 300ms threshold is standard for long-press (iOS uses 500ms). Cards are not in a scrollable list in BarnScene (fixed grid), so scroll conflict is unlikely. Trading Post scrollable grid may need pointer-event cancellation if drag starts. |
| **Trading Post scroll complexity** | Medium | Medium | Phaser 3's built-in drag + mask approach for scrollable content is finicky. Fallback: paginated view (page 1: common animals, page 2: Legendaries) with next/prev buttons. Simpler and more reliable. |
| **Scope: 5 major features in one sprint** | High | High | The phasing is designed so each phase is independently shippable. If scope must be cut: (1) info panel and card readability are essential, (2) win condition is essential, (3) active abilities can ship with peek + boot only (defer fetch + refresh to Sprint 004). |
| **Bundle size with 8 new animals and textures** | Low | Medium | Generated textures are tiny (Graphics API). No new sprite assets needed if existing atlas has placeholder frames. Monitor with `npm run budget` after Phase 3. |
| **Ability state corruption across scene transitions** | Medium | High | `abilityPrompt` lives on `NightState` which lives on `GameSession` in the module-level store. Scene transitions preserve it. However, if player is in an ability prompt and the browser refreshes, state is lost (no localStorage). Acceptable for Sprint 003; persistence is a future concern. |

---

## Security Considerations

- Static client-only site. No new backend, auth, or network dependencies.
- Ability registry is compile-time data. No dynamic code evaluation.
- Fetch ability reveals deck contents (animal types) but not deck order. This is by design — the player is spending an ability to gain information.
- No new query parameters or user input surfaces beyond the existing `?seed=` parameter.
- All new textures are generated via Phaser Graphics API, not loaded from external sources.

---

## Dependencies

- **Existing stack**: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Existing canvas contract**: 390x844 logical resolution with Scale.FIT
- **Existing bundle budget**: Phaser chunk < 400KB gzipped, app chunk < 100KB gzipped
- **Sprint 002 deliverables**: game store, session management, night flow, scoring, shop, BarnScene, TradingPostScene must all be working and green
- **No new npm dependencies**

---

## Open Questions

1. **Should the boot ability allow booting Legendary Animals?** This draft says no (prevents griefing your own win condition accidentally). But INTENT.md's Trickster Fox can swap Legendaries, suggesting they are movable. Propose: boot cannot target Legendaries, but a future Trickster Fox can.

2. **Should Legendaries give any resources?** INTENT.md gives Lucky Toad +3 Hay and others have abilities. This draft makes all 4 Sprint 003 Legendaries plain (`abilityKind: 'none'`, 0M/0H) for simplicity. Adding Legendary abilities is a Sprint 004 enhancement.

3. **Should the fetch candidate list include Legendary Animals from the deck?** This draft excludes them (Legendaries should feel special — you draw them by luck, not by fetching). Counter-argument: the player paid for the Border Collie AND the Legendary, so fetching should be allowed. Propose: exclude for now, revisit if playtesting shows it feels punitive.

4. **Paginated vs. scrollable Trading Post?** With 12 common + 4 Legendary animals, the grid exceeds the 844px screen height. Propose: paginated with "Common Animals" (page 1) and "Legendary Animals" (page 2), navigated by tab buttons at the top. Simpler than scroll physics.

5. **Should the win condition check happen after peek/fetch resolution?** If a Sheepdog peeks a Legendary and the player accepts, the win check should fire after acceptance. If a Border Collie fetches a card that happens to be near a Legendary draw, the win check fires after the fetch enters the barn. This draft says yes: win check fires after every card-enters-barn event, regardless of how it entered.

6. **Release to the Wild**: INTENT.md describes a deck-thinning mechanic (spend 3 Mischief before a Night to permanently remove an animal). Not included in this sprint per the intent document's scope. Propose deferring to Sprint 004.

7. **Should refreshed abilities re-fire automatically?** When Cheerful Lamb refreshes abilities, the refreshed animals are already in the barn. Their `on_enter` trigger has passed. Refreshing only matters if those animals have a future interaction (e.g., if the player later draws another Cheerful Lamb, or if abilities can be manually activated). This draft treats refresh as forward-looking: it resets `abilityUsed` so that if any future mechanic re-triggers abilities, they are available. For Sprint 003, refresh primarily matters for multi-Sheepdog or multi-Stable-Hand scenarios where the same animal type is drawn twice.
