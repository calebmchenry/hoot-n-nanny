# Sprint 003: Win Condition, Active Abilities, & Card Readability

## Overview

Sprint 003 adds strategic depth and a clear end goal to Hoot 'n Nanny. The sprint delivers four interlocking systems: (1) a card readability overhaul with larger, higher-contrast resource indicators, (2) an info panel triggered by long-press/hover that displays full animal details, (3) a win condition based on collecting 3 Legendary Animals in the barn simultaneously, and (4) an active ability system starting with four ability animals (Sheepdog, Stable Hand, Border Collie, Cheerful Lamb).

Sprint 002 delivered the playable push-your-luck core loop with scoring, Trading Post, and passive/triggered abilities. Sprint 003 builds on that foundation by introducing player agency through active abilities, giving the game a clear objective through Legendary Animals and win detection, and improving moment-to-moment readability so players can make informed decisions at a glance.

**Key architectural change:** The `AnimalDef` type gains an `abilityType` discriminant and `activeAbility` field. Active abilities are modeled as a new `ActiveAbilityId` enum with dedicated handler functions in a new `src/game/abilities.ts` module. The night flow gains new event types for ability activation, and BarnScene gains UI for ability triggers and an info panel overlay. The win condition check runs after every successful Night scoring.

---

## Use Cases

1. **Read card at a glance** — Player draws an animal and immediately sees its Mischief value (large gold badge, top-left), Hay value (large green badge, top-right), NOISY! indicator (red banner across card top), and ability icon (bottom-left of card). No squinting required on a 390px-wide phone screen.

2. **Inspect animal details** — Player long-presses (500ms) or hovers over any animal card in the barn. A slide-up info panel appears at the bottom of the screen showing: animal name, large sprite, Mischief/Hay values, ability name and full text description, NOISY! status, and any keywords (Passive, Active, Triggered, BRINGER, Legendary). The panel is dismissed by tapping anywhere outside it or by a second long-press.

3. **Activate Sheepdog ability** — Player draws Sheepdog into the barn. A pulsing "PEEK" icon appears on the Sheepdog card. Player taps the Sheepdog card. The next card in the deck is revealed in a floating preview. Two buttons appear: "Accept" (card enters barn normally) and "Reject" (card is shuffled back into the deck). The Sheepdog's ability icon dims after use.

4. **Activate Stable Hand ability** — Player draws Stable Hand. A "BOOT" icon appears. Player taps the Stable Hand card. All other non-Legendary animals in the barn highlight as selectable. Player taps one to boot it — the booted animal is removed from the barn and Penned Up next Night. The Stable Hand's icon dims.

5. **Activate Border Collie ability** — Player draws Border Collie. A "FETCH" icon appears. Player taps the Border Collie card. A scrollable list of animals remaining in the deck appears (names only, not positions). Player selects one — it is removed from the deck and placed into the next empty barn slot. Bust checks run after placement.

6. **Activate Cheerful Lamb ability** — Player draws Cheerful Lamb. A "REFRESH" icon appears. Player taps the Cheerful Lamb card. All other animals in the barn that have used their active abilities this Night have their abilities restored (icons re-activate). The Cheerful Lamb's own icon dims.

7. **Purchase Legendary Animal** — In the Trading Post, the player sees a separate "Legendary Animals" section below the regular shop grid. Each Legendary has a distinct golden card border, a star icon, and a high Mischief cost. The player purchases Golden Goose for 30 Mischief. It enters the herd like any other animal.

8. **Win the game** — During a Night, the player draws their third Legendary Animal into the barn without busting. After the card enters, a win detection check fires. A victory overlay appears: "YOU WIN!" with confetti-style particle effects, total Nights played, total Mischief earned across the game, and a "Play Again" button that resets the session.

9. **Inspect Legendary in barn** — Player long-presses a Legendary Animal in the barn. The info panel shows its Legendary status with a star border, its cost, and any special ability. Legendary cards in the barn have a subtle pulsing golden glow tween to distinguish them visually.

---

## Architecture

### Type Changes

**`src/game/types.ts` additions:**

```typescript
// New ability types
export type AbilityType = 'passive' | 'active' | 'triggered' | 'bringer' | null;

export type ActiveAbilityId = 'peek' | 'boot' | 'fetch' | 'refresh';

export interface ActiveAbilityDef {
  id: ActiveAbilityId;
  name: string;
  description: string;
}

// Updated AnimalId union — add new animals
export type AnimalId =
  | 'BarnCat'
  | 'FeralGoat'
  | 'PotBelliedPig'
  | 'Bunny'
  | 'Hen'
  | 'WildBoar'
  | 'HermitCrab'
  | 'DraftPony'
  | 'StruttingPeacock'
  | 'MilkmaidGoat'
  | 'HoneyBee'
  // Sprint 003 active-ability animals
  | 'Sheepdog'
  | 'StableHand'
  | 'BorderCollie'
  | 'CheerfulLamb'
  // Sprint 003 Legendary Animals
  | 'GoldenGoose'
  | 'GiantOx'
  | 'Jackalope'
  | 'Thunderbird'
  | 'SilverMare'
  | 'LuckyToad';

export type LegendaryAnimalId =
  | 'GoldenGoose'
  | 'GiantOx'
  | 'Jackalope'
  | 'Thunderbird'
  | 'SilverMare'
  | 'LuckyToad';

// Updated ShopAnimalId — includes new purchasable animals
export type ShopAnimalId =
  | 'Bunny'
  | 'Hen'
  | 'WildBoar'
  | 'HermitCrab'
  | 'DraftPony'
  | 'StruttingPeacock'
  | 'MilkmaidGoat'
  | 'HoneyBee'
  | 'Sheepdog'
  | 'StableHand'
  | 'BorderCollie'
  | 'CheerfulLamb'
  | 'GoldenGoose'
  | 'GiantOx'
  | 'Jackalope'
  | 'Thunderbird'
  | 'SilverMare'
  | 'LuckyToad';

// Extended AnimalDef
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
  // Sprint 003 additions
  abilityType: AbilityType;
  activeAbility: ActiveAbilityId | null;
  abilityDescription: string;
  legendary: boolean;
}

// CardInstance gains ability-used tracking
export interface CardInstance {
  id: string;
  animalId: AnimalId;
  abilityUsed: boolean; // true if active ability has been used this Night
}

// New NightState fields
export interface NightState {
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
  pendingAbility: PendingAbility | null; // ability awaiting player input
  won: boolean; // true if win condition met this Night
}

// Pending ability state — tracks an active ability waiting for player input
export type PendingAbility =
  | { type: 'peek'; cardId: string; peekedCard: CardInstance }
  | { type: 'boot'; cardId: string }
  | { type: 'fetch'; cardId: string; fetchableAnimalIds: AnimalId[] }
  | { type: 'refresh'; cardId: string };

// New GamePhase values
export enum GamePhase {
  ReadyToDraw = 'ready_to_draw',
  AnimatingDraw = 'animating_draw',
  PlayerDecision = 'player_decision',
  Warning = 'warning',
  Bust = 'bust',
  NightSummary = 'night_summary',
  Shop = 'shop',
  // Sprint 003 additions
  AbilityPending = 'ability_pending',
  Victory = 'victory',
}

// New NightEvent types
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
  | { type: 'ability_ready'; cardId: string; ability: ActiveAbilityId }
  | { type: 'ability_activated'; cardId: string; ability: ActiveAbilityId }
  | { type: 'peek_revealed'; peekedCard: CardInstance }
  | { type: 'peek_accepted'; card: CardInstance; slotIndex: number }
  | { type: 'peek_rejected'; card: CardInstance }
  | { type: 'animal_booted'; bootedCard: CardInstance; slotIndex: number }
  | { type: 'animal_fetched'; fetchedCard: CardInstance; slotIndex: number }
  | { type: 'abilities_refreshed'; refreshedCardIds: string[] }
  | { type: 'win_condition_met'; legendaryCount: number }
  | { type: 'info_panel_opened'; card: CardInstance }
  | { type: 'info_panel_closed' };

// GameSession gains win state
export interface GameSession {
  seed: string;
  herd: CardInstance[];
  nextCardSerial: number;
  capacity: number;
  mischief: number;
  hay: number;
  nightNumber: number;
  shopStock: ShopStock;
  currentNight: NightState | null;
  activePennedUpCardId: string | null;
  pendingPennedUpCardId: string | null;
  pendingPennedUpTurns: number;
  lastSummary: NightScoreSummary | null;
  // Sprint 003 additions
  won: boolean; // game-level win flag
  totalMischiefEarned: number; // cumulative Mischief across all Nights
}

// Updated ShopStock type to include new animals
export type ShopStock = Record<ShopAnimalId, number>;
```

### Ability System (`src/game/abilities.ts`)

New pure-function module for active ability logic. Each ability function takes the current `NightState` plus player input and returns a new `NightState` + `NightEvent[]`.

```typescript
// Core ability definitions
export const ACTIVE_ABILITY_DEFS: Record<ActiveAbilityId, ActiveAbilityDef> = {
  peek: {
    id: 'peek',
    name: 'Peek',
    description: 'Look at the next card in the deck. Choose to accept it into the barn or reject it back into the deck.',
  },
  boot: {
    id: 'boot',
    name: 'Boot',
    description: 'Remove one non-Legendary animal from the barn. That animal is Penned Up next Night.',
  },
  fetch: {
    id: 'fetch',
    name: 'Fetch',
    description: 'Choose a specific animal from the remaining deck and bring it directly into the barn.',
  },
  refresh: {
    id: 'refresh',
    name: 'Refresh',
    description: 'Restore all used active abilities on other animals in the barn.',
  },
};

// Exported functions:
export function canActivateAbility(state: NightState, cardId: string): boolean;
export function startPeek(state: NightState, cardId: string): { state: NightState; events: NightEvent[] };
export function resolvePeekAccept(state: NightState): { state: NightState; events: NightEvent[] };
export function resolvePeekReject(state: NightState): { state: NightState; events: NightEvent[] };
export function startBoot(state: NightState, cardId: string): { state: NightState; events: NightEvent[] };
export function resolveBoot(state: NightState, targetCardId: string): { state: NightState; events: NightEvent[] };
export function startFetch(state: NightState, cardId: string): { state: NightState; events: NightEvent[] };
export function resolveFetch(state: NightState, targetAnimalId: AnimalId): { state: NightState; events: NightEvent[] };
export function activateRefresh(state: NightState, cardId: string): { state: NightState; events: NightEvent[] };
```

**Ability activation flow:**

1. After a card with an active ability enters the barn via `drawAnimal()`, a `ability_ready` event is emitted.
2. The player is in `PlayerDecision` phase and can choose to: draw another card, call it a night, or tap an ability-ready card.
3. Tapping the card calls `startPeek`/`startBoot`/`startFetch`/`activateRefresh` which sets `state.pendingAbility` and transitions to `GamePhase.AbilityPending`.
4. For peek: the peeked card is shown; player accepts or rejects. For boot: player selects a target animal. For fetch: player selects from deck list.
5. The resolve function clears `pendingAbility`, marks `abilityUsed = true` on the source card, and transitions back to `PlayerDecision`.
6. Refresh is instant: no pending state needed. It calls `activateRefresh` directly, resets `abilityUsed = false` on all other active-ability cards, and returns to `PlayerDecision`.

**Ability constraints:**
- Each active ability can be used once per Night per card instance (`abilityUsed` flag).
- Abilities can only be activated during `PlayerDecision` or `Warning` phase (not during animation or bust).
- Boot cannot target Legendary Animals.
- Fetch runs bust checks after placing the fetched card.
- Peek reject shuffles the rejected card back to a random position in the remaining deck (using the night's PRNG).
- If the deck is empty, Peek and Fetch are not activatable.

### Win Condition

**Check location:** `src/game/night.ts` — new function `checkWinCondition(barn: CardInstance[]): boolean`.

```typescript
export const LEGENDARY_WIN_COUNT = 3;

export const checkWinCondition = (barn: CardInstance[]): boolean => {
  const legendaryCount = barn.filter(
    (card) => getAnimalDef(card.animalId).legendary
  ).length;
  return legendaryCount >= LEGENDARY_WIN_COUNT;
};
```

**Integration point:** Win is checked after every successful card placement (draw, peek-accept, fetch). If `checkWinCondition` returns `true`:
1. A `win_condition_met` event is emitted.
2. `NightState.won = true`.
3. Night is auto-scored (same as `callItANight` — Mischief and Hay are earned).
4. `GameSession.won = true`.
5. Phase transitions to `GamePhase.Victory`.

Win condition is NOT checked on bust Nights (you must successfully hold 3 Legendaries without busting).

### Card Readability Overhaul

**Current problem:** Resource badges are 24x24 circles with 10px text — too small on the 88x88 card.

**New card layout (88x88 slot):**

```
+----------------------------------+
| [NOISY! BANNER if applicable]    |  y=0, h=14, full width, red bg
|  +---------+                     |
|  | MISCHIEF|     [HAY badge]     |  y=4 (or 16 if NOISY!)
|  |  +3     |       +2           |  Left badge: 32x20, Right badge: 32x20
|  +---------+                     |
|                                  |
|         [SPRITE 32x32]           |  centered, y = card center - 4
|          scaled 2x               |
|                                  |
|  [ABILITY ICON]   [Animal Name]  |  y=70, icon 16x16 bottom-left, name centered
+----------------------------------+
```

**Resource badge redesign:**
- Mischief badge: 32x20px rounded rectangle, gold fill (`#D9A441`), dark outline (`#6B3027`), 14px bold white text centered. Positioned at (4, 16) if NOISY! banner present, (4, 4) otherwise.
- Hay badge: 32x20px rounded rectangle, green fill (`#5C9B5D`), dark outline (`#2D4A2E`), 14px bold white text centered. Positioned at (52, 16) or (52, 4).
- NOISY! banner: full-width red bar (`#D94B3D`) at top of card, 14px high, white "NOISY!" text, 10px bold.
- Ability icon: 16x16 generated texture. Gold star for active abilities with available activation, grey star for used abilities. No icon for passive/triggered/null.

**New generated textures (BootScene):**
- `ui-badge-mischief-lg`: 32x20 gold badge
- `ui-badge-hay-lg`: 32x20 green badge
- `ui-noisy-banner`: 88x14 red banner
- `ui-ability-icon-active`: 16x16 gold star
- `ui-ability-icon-used`: 16x16 grey star
- `ui-card-legendary`: 88x88 golden card background with subtle shimmer border
- `ui-legendary-glow`: 96x96 golden glow sprite for pulsing tween behind Legendary cards

### Info Panel

**Position:** Slide-up panel from bottom of screen. Anchored at y=544 (above action bar area), extends to y=844 (screen bottom). Width: 350px, centered (x=20). Height: 300px.

**Layout constants (`src/config/constants.ts`):**

```typescript
INFO_PANEL: {
  X: 20,
  Y: 544,
  WIDTH: 350,
  HEIGHT: 300,
  SLIDE_DURATION_MS: 200,
}
```

**Info panel content layout (relative to panel origin):**

```
+------------------------------------------+
| [Sprite 48x48, scaled 2x]  Animal Name   |  y=12
|                             Legendary *   |  y=36 (if legendary)
|                                           |
|  Mischief: +3        Hay: +2             |  y=72
|  NOISY!  [red text if applicable]         |  y=96
|                                           |
|  Ability: Peek (Active)                   |  y=128
|  "Look at the next card in the deck.      |  y=152, wordWrap 310px
|   Choose to accept or reject."            |
|                                           |
|  Keywords: [Passive] [Active] [NOISY!]    |  y=230
+------------------------------------------+
```

**Interaction:**
- **Mobile:** Long-press (500ms hold via `pointerdown` + timer, canceled by `pointerup` before 500ms). The 500ms threshold avoids conflict with regular taps (which fire ability activation).
- **Desktop:** Also long-press (no separate hover behavior — keeps mobile parity per CLAUDE.md "No hover states").
- **Dismissal:** Tap anywhere outside the panel, or tap the panel's close area.
- **During ability pending:** Info panel is disabled to avoid conflicting inputs.

**Implementation:** The info panel is a `Phaser.GameObjects.Container` managed as a singleton property on BarnScene. `showInfoPanel(card: CardInstance)` creates/updates it; `hideInfoPanel()` destroys it. The panel slides up via a 200ms tween from y=844 to y=544.

### Legendary Animals in Trading Post

**Visual treatment:**
- Separate section below regular shop grid, labeled "LEGENDARY ANIMALS" with a gold divider line.
- Each Legendary card uses `ui-card-legendary` texture (golden border instead of parchment/noisy).
- A star icon (`ui-legendary-star`) appears in the top-right corner of each Legendary shop card.
- Cost text is larger (14px bold) and gold-colored.

**Trading Post layout changes (`src/scenes/tradingPostLayout.ts`):**

```typescript
export const getLegendaryShopPosition = (): Rect => {
  // Below the regular shop grid. Regular grid: 4 rows * (108 + 10) = 472px + 152 start = 624.
  // Legendary section starts at y=630 with a "LEGENDARY ANIMALS" header.
  return rect(20, 630, 350, 30); // header position
};

export const getLegendaryGridPositions = (itemCount: number): Rect[] => {
  // 2-column grid starting at y=664
  const positions: Rect[] = [];
  for (let i = 0; i < itemCount; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    positions.push(rect(
      20 + col * (LAYOUT.SHOP.CARD_WIDTH + LAYOUT.SHOP.GRID_GAP_X),
      664 + row * (LAYOUT.SHOP.CARD_HEIGHT + LAYOUT.SHOP.GRID_GAP_Y),
      LAYOUT.SHOP.CARD_WIDTH,
      LAYOUT.SHOP.CARD_HEIGHT,
    ));
  }
  return positions;
};
```

**Scrolling:** With 8 regular animals (4 rows) + 6 Legendary Animals (3 rows), the Trading Post content exceeds 844px. The TradingPostScene must implement vertical scrolling. Use a Phaser camera with bounds set to the full content height. Touch drag (pointer move while down) scrolls the camera vertically. Scroll bounds: y=0 to y=(content bottom - 844 + padding).

**Shop stock for Legendaries:** 1 copy each (not 3 like regular animals). Tracked in the same `ShopStock` record.

### Session Flow Updates

**Victory detection in session.ts:**
- After `drawAnimalInSession`, if `nightState.won === true`, finalize the Night with scoring (player earns resources) and set `session.won = true`.
- After peek-accept and fetch resolve, also check win condition.
- `GameSession.totalMischiefEarned` is incremented on every successful Night scoring.

**New session functions:**
```typescript
export function activateAbilityInSession(session: GameSession, cardId: string): SessionMutation;
export function resolveAbilityInSession(session: GameSession, input: AbilityInput): SessionMutation;
```

Where `AbilityInput` is:
```typescript
export type AbilityInput =
  | { type: 'peek_accept' }
  | { type: 'peek_reject' }
  | { type: 'boot'; targetCardId: string }
  | { type: 'fetch'; targetAnimalId: AnimalId };
```

### DOM Phase Updates

New DOM data attributes:
- `data-phase="ability_pending"` when an ability is awaiting resolution
- `data-phase="victory"` when win overlay is shown
- `data-legendary-count="0"|"1"|"2"|"3"` on `#game-container` — tracks Legendary Animals currently in barn

### Verification Seeds

New named seeds for Sprint 003:
- `sprint3-ability-peek`: Sheepdog in herd, draws Sheepdog early, next card is a Feral Goat (good peek test)
- `sprint3-ability-boot`: Stable Hand in herd, draws Stable Hand after 2 animals (boot test)
- `sprint3-win`: 3 Legendary Animals in herd, draws all 3 without busting (win condition test)
- `sprint3-legendary-shop`: Successful Night earning 30+ Mischief for Legendary purchase test

---

## Implementation

### Phase 1: Type & Data Layer (~15%)

**Goal:** Extend types, define new animals, update existing AnimalDef to include new fields with backward-compatible defaults.

**Files:**
- `src/game/types.ts` — Modify
- `src/game/animals.ts` — Modify
- `src/game/deck.ts` — Modify (add `abilityUsed: false` to `createCardInstance`)

**Tasks:**
- [ ] Add `AbilityType`, `ActiveAbilityId`, `ActiveAbilityDef`, `PendingAbility`, `AbilityInput` types to `types.ts`
- [ ] Add `LegendaryAnimalId` type
- [ ] Extend `AnimalId` and `ShopAnimalId` unions with new animal IDs
- [ ] Add `abilityType`, `activeAbility`, `abilityDescription`, `legendary` fields to `AnimalDef`
- [ ] Add `abilityUsed` field to `CardInstance` (default `false`)
- [ ] Add `pendingAbility`, `won` fields to `NightState`
- [ ] Add `AbilityPending`, `Victory` to `GamePhase` enum
- [ ] Add new `NightEvent` variants for abilities and win condition
- [ ] Add `won`, `totalMischiefEarned` to `GameSession`
- [ ] Update all existing `AnimalDef` entries in `animals.ts` to include new fields with appropriate defaults (`abilityType: null`, `activeAbility: null`, `abilityDescription: ''`, `legendary: false`)
- [ ] Define Bunny's existing mitigation as `abilityType: 'passive'`, `abilityDescription: 'Cancels NOISY! from one animal'`
- [ ] Define Hermit Crab as `abilityType: 'triggered'`, Draft Pony as `abilityType: 'triggered'`
- [ ] Add 4 active-ability animal definitions to `animals.ts`:
  - Sheepdog: cost 4, mischief +2, hay 0, `activeAbility: 'peek'`
  - Stable Hand: cost 4, mischief 0, hay 0, `activeAbility: 'boot'`
  - Border Collie: cost 5, mischief +2, hay -1, `activeAbility: 'fetch'`
  - Cheerful Lamb: cost 5, mischief +1, hay 0, `activeAbility: 'refresh'`
- [ ] Add 6 Legendary animal definitions to `animals.ts`:
  - Golden Goose: cost 30, mischief 0, hay 0, legendary, no ability
  - Giant Ox: cost 35, mischief 0, hay 0, legendary, no ability
  - Jackalope: cost 40, mischief 0, hay 0, legendary, no ability
  - Thunderbird: cost 45, mischief 0, hay 0, legendary, no ability
  - Silver Mare: cost 45, mischief 0, hay 0, legendary, `noisyMitigation: 1`, `abilityType: 'passive'`
  - Lucky Toad: cost 50, mischief 0, hay +3, legendary, no ability
- [ ] Add `LEGENDARY_ANIMALS` and `ABILITY_ANIMALS` export arrays in `animals.ts`
- [ ] Update `SHOP_ANIMALS`, `SHOP_ANIMAL_IDS` to include new animals
- [ ] Update `createCardInstance` in `deck.ts` to include `abilityUsed: false`
- [ ] Add Sprint 003 verification seed patterns to `deck.ts`
- [ ] Update `ShopStock` default creation to include new animals (1 stock for Legendaries, 3 for ability animals)

**Tests:**
- [ ] New animal definitions have correct fields
- [ ] `createCardInstance` returns `abilityUsed: false`
- [ ] Legendary animals have `legendary: true`
- [ ] Active ability animals have correct `activeAbility` IDs
- [ ] Silver Mare has `noisyMitigation: 1`
- [ ] All existing tests still pass (backward compat)

### Phase 2: Ability Engine (~25%)

**Goal:** Implement all four active abilities as pure functions. Fully unit-testable without Phaser.

**Files:**
- `src/game/abilities.ts` — Create
- `src/game/abilities.test.ts` — Create
- `src/game/night.ts` — Modify (integrate ability-ready detection)

**Tasks:**
- [ ] Create `abilities.ts` with `ACTIVE_ABILITY_DEFS` constant
- [ ] Implement `canActivateAbility(state, cardId)`: checks card is in barn, has active ability, `abilityUsed === false`, phase is `PlayerDecision` or `Warning`, no `pendingAbility`, deck not empty (for peek/fetch)
- [ ] Implement `startPeek(state, cardId)`:
  - Draws top card from deck into `pendingAbility.peekedCard` (does NOT add to barn)
  - Sets `pendingAbility: { type: 'peek', cardId, peekedCard }`
  - Sets phase to `AbilityPending`
  - Emits `ability_activated` + `peek_revealed`
- [ ] Implement `resolvePeekAccept(state)`:
  - Places peeked card into barn
  - Runs bust check — if bust, emit `bust_triggered`
  - Runs win check — if win, emit `win_condition_met`
  - Marks source card `abilityUsed = true`
  - Clears `pendingAbility`
  - Returns to `PlayerDecision` (or `Bust`/`Victory`)
  - Emits `peek_accepted`
- [ ] Implement `resolvePeekReject(state)`:
  - Shuffles peeked card back into deck at random position (using night PRNG from seed)
  - Marks source card `abilityUsed = true`
  - Clears `pendingAbility`
  - Returns to `PlayerDecision`
  - Emits `peek_rejected`
- [ ] Implement `startBoot(state, cardId)`:
  - Sets `pendingAbility: { type: 'boot', cardId }`
  - Sets phase to `AbilityPending`
  - Emits `ability_activated`
- [ ] Implement `resolveBoot(state, targetCardId)`:
  - Validates target is in barn, is not Legendary, is not the boot source
  - Removes target from barn
  - Target gets Penned Up (add to session's pending penned-up tracking)
  - Recalculates noisy count
  - Marks source card `abilityUsed = true`
  - Clears `pendingAbility`
  - Returns to `PlayerDecision`
  - Emits `animal_booted`
- [ ] Implement `startFetch(state, cardId)`:
  - Computes list of unique `AnimalId`s in the deck
  - Sets `pendingAbility: { type: 'fetch', cardId, fetchableAnimalIds }`
  - Sets phase to `AbilityPending`
  - Emits `ability_activated`
- [ ] Implement `resolveFetch(state, targetAnimalId)`:
  - Finds first CardInstance with matching AnimalId in deck
  - Removes it from deck, adds to barn
  - Runs bust check
  - Runs win check
  - Marks source card `abilityUsed = true`
  - Clears `pendingAbility`
  - Emits `animal_fetched`
- [ ] Implement `activateRefresh(state, cardId)`:
  - Sets `abilityUsed = false` on all OTHER cards in barn that have active abilities
  - Marks source (Cheerful Lamb) `abilityUsed = true`
  - No pending state needed (instant)
  - Emits `ability_activated` + `abilities_refreshed`
  - Stays in current phase
- [ ] Update `drawAnimal` in `night.ts`: after a card with an active ability is drawn without bust, emit `ability_ready` event

**Tests (abilities.test.ts):**
- [ ] `canActivateAbility` returns `false` if card not in barn
- [ ] `canActivateAbility` returns `false` if `abilityUsed === true`
- [ ] `canActivateAbility` returns `false` during `AbilityPending` phase
- [ ] `canActivateAbility` returns `false` for cards with no active ability
- [ ] Peek: reveals top card, accept places it in barn
- [ ] Peek: reject puts card back in deck (deck length unchanged)
- [ ] Peek accept + bust: 3 NOISY! after peek accept triggers farmer bust
- [ ] Peek accept + win: 3rd Legendary via peek accept triggers win
- [ ] Boot: removes target from barn, reduces barn count
- [ ] Boot: cannot target Legendary animals
- [ ] Boot: cannot target the boot source card itself
- [ ] Boot: recalculates noisy count (booting a NOISY! animal reduces count)
- [ ] Fetch: moves specific animal from deck to barn
- [ ] Fetch: deck shrinks by 1, barn grows by 1
- [ ] Fetch + bust: fetching into full barn triggers barn overwhelmed
- [ ] Fetch + win: fetching 3rd Legendary triggers win
- [ ] Fetch: `fetchableAnimalIds` contains only animals actually in deck
- [ ] Refresh: resets `abilityUsed` on all other active-ability cards
- [ ] Refresh: does not reset its own `abilityUsed`
- [ ] Refresh: no-op if no other active abilities present

### Phase 3: Win Condition & Session Integration (~15%)

**Goal:** Wire abilities and win condition into session flow. Victory state is fully managed.

**Files:**
- `src/game/night.ts` — Modify
- `src/game/session.ts` — Modify
- `src/game/session.test.ts` — Extend
- `src/game/scoring.ts` — Modify (Legendary animals score 0 Mischief/Hay, no changes needed unless Legendaries get scoring bonuses later)

**Tasks:**
- [ ] Add `checkWinCondition` function to `night.ts`
- [ ] Integrate win check into `drawAnimal`: after card_revealed, if win condition met, emit `win_condition_met`, set `night.won = true`, auto-score the Night
- [ ] Add `activateAbilityInSession(session, cardId)` to `session.ts`:
  - Delegates to appropriate `startXxx` or `activateRefresh` based on the card's `activeAbility`
  - Returns `SessionMutation`
- [ ] Add `resolveAbilityInSession(session, input: AbilityInput)` to `session.ts`:
  - Delegates to `resolvePeekAccept`, `resolvePeekReject`, `resolveBoot`, or `resolveFetch`
  - After resolve, check for bust/win
  - If win: finalize Night with scoring, set `session.won = true`
  - If bust: finalize Night with bust
  - Returns `SessionMutation`
- [ ] Update `finalizeNight` to increment `session.totalMischiefEarned`
- [ ] Add `won: false`, `totalMischiefEarned: 0` to `createSession`
- [ ] Update `startNextNight` to not start if `session.won === true`
- [ ] Handle boot's Penned Up: when `resolveBoot` boots an animal, set `session.pendingPennedUpCardId` to the booted card's ID

**Tests:**
- [ ] `checkWinCondition` returns `true` with 3 Legendaries in barn
- [ ] `checkWinCondition` returns `false` with 2 Legendaries
- [ ] `checkWinCondition` returns `false` with 0 Legendaries
- [ ] Win during draw: session.won becomes true, Night is scored
- [ ] Win via peek-accept: session.won becomes true
- [ ] Win via fetch: session.won becomes true
- [ ] Abilities in session: activate and resolve round-trip correctly
- [ ] Boot in session: booted animal is penned up
- [ ] Cannot start next Night when `session.won === true`
- [ ] `totalMischiefEarned` accumulates across Nights

### Phase 4: Card Readability & Info Panel (~20%)

**Goal:** Redesign card rendering for readability. Implement info panel. Generate new textures.

**Files:**
- `src/scenes/BootScene.ts` — Modify (new generated textures)
- `src/scenes/BarnScene.ts` — Modify (card rendering, info panel, ability UI)
- `src/scenes/barnLayout.ts` — Modify (info panel position)
- `src/config/constants.ts` — Modify (new texture keys, layout constants, colors)

**Tasks:**
- [ ] Add new texture key constants to `constants.ts`:
  ```
  BADGE_MISCHIEF_LG: 'ui-badge-mischief-lg'
  BADGE_HAY_LG: 'ui-badge-hay-lg'
  NOISY_BANNER: 'ui-noisy-banner'
  ABILITY_ICON_ACTIVE: 'ui-ability-icon-active'
  ABILITY_ICON_USED: 'ui-ability-icon-used'
  CARD_LEGENDARY: 'ui-card-legendary'
  LEGENDARY_GLOW: 'ui-legendary-glow'
  LEGENDARY_STAR: 'ui-legendary-star'
  INFO_PANEL_BG: 'ui-info-panel-bg'
  ```
- [ ] Add `INFO_PANEL` layout constants to `LAYOUT` in `constants.ts`
- [ ] Add `LEGENDARY` palette colors to `PALETTE`: `LEGENDARY_GOLD: 0xFFD700`, `LEGENDARY_BORDER: 0xC5A030`, `LEGENDARY_GLOW: 0xFFF4B0`
- [ ] Generate new textures in `BootScene`:
  - `ui-badge-mischief-lg`: 32x20 rounded rect, gold fill, 2px dark border
  - `ui-badge-hay-lg`: 32x20 rounded rect, green fill, 2px dark border
  - `ui-noisy-banner`: 88x14 red rectangle with "NOISY!" text baked in
  - `ui-ability-icon-active`: 16x16 gold circle with inner star shape
  - `ui-ability-icon-used`: 16x16 grey circle with inner star shape
  - `ui-card-legendary`: 88x88 card background with golden border (4px gold stroke, cream interior)
  - `ui-legendary-glow`: 96x96 radial gradient gold-to-transparent
  - `ui-legendary-star`: 20x20 gold star shape
  - `ui-info-panel-bg`: 350x300 dark panel with subtle wood grain tint
- [ ] Rewrite `renderCardInSlot` in `BarnScene`:
  - Use Legendary card background for Legendary animals
  - Add Legendary glow sprite behind Legendary cards (pulsing tween, alpha 0.3-0.7, 1200ms period)
  - Use large resource badges (32x20) instead of small ones
  - Resource badge text: 14px bold, white, centered in badge
  - Add NOISY! banner at top of card if applicable
  - Add ability icon at bottom-left (16x16): gold if active ability available, grey if used, omit if none
  - Animal name: 10px bold, bottom-center
  - Sprite: centered, scaled 2x as before
- [ ] Add `getInfoPanelPosition` to `barnLayout.ts`:
  ```typescript
  export const getInfoPanelPosition = (): Rect => {
    return toRect(20, 544, 350, 300);
  };
  ```
- [ ] Implement info panel in `BarnScene`:
  - Add `infoPanelContainer: Phaser.GameObjects.Container | null` property
  - Add `longPressTimer: ReturnType<typeof setTimeout> | null` property
  - On `pointerdown` on any card: start 500ms timer. On `pointerup` before 500ms: cancel timer (tap = ability activation or normal interaction). On timer fire: show info panel.
  - `showInfoPanel(card: CardInstance)`: creates Container at info panel position with: large sprite, name text, Mischief/Hay values, ability name + description (word-wrapped), NOISY! status, keyword badges. Slide-up animation from y=844 to y=544, 200ms.
  - `hideInfoPanel()`: slide-down animation, then destroy.
  - Tap anywhere outside panel dismisses it.
  - Emit `info_panel_opened`/`info_panel_closed` events (informational, not game-logic).

**Tests:**
- [ ] `getInfoPanelPosition` returns rect within canvas bounds
- [ ] Info panel rect does not overlap with action bar

### Phase 5: Ability UI in BarnScene (~10%)

**Goal:** Wire ability activation and resolution into BarnScene interaction handlers.

**Files:**
- `src/scenes/BarnScene.ts` — Modify

**Tasks:**
- [ ] Add ability activation handler:
  - When a card with `activeAbility !== null && abilityUsed === false` is tapped (short tap, not long-press), call `activateAbilityInSession`.
  - Disable draw/callItANight buttons during `AbilityPending`.
- [ ] Implement Peek UI:
  - Show a floating card preview in the center of the screen (150x196 scaled card).
  - Two buttons below: "Accept" (green, primary) and "Reject" (red, secondary).
  - On accept: call `resolveAbilityInSession({ type: 'peek_accept' })`, animate card from preview to slot.
  - On reject: call `resolveAbilityInSession({ type: 'peek_reject' })`, animate card fading out.
- [ ] Implement Boot UI:
  - Highlight all bootable cards (non-Legendary, not the boot source) with a pulsing blue outline.
  - On tap of a highlighted card: call `resolveAbilityInSession({ type: 'boot', targetCardId })`.
  - Animate booted card sliding off-screen.
  - Cancel button to abort boot (if player changes mind — sets `abilityUsed = true` anyway to prevent abuse, or alternatively: cancel does NOT use the ability — design decision: cancel does not consume the ability).
  - **Decision: Cancel does not consume the ability.** Player can cancel and the ability remains available. This mirrors the "haven't committed" principle. Implement by adding a `cancelAbility(state)` function that clears `pendingAbility` without marking used, returning to previous phase.
- [ ] Implement Fetch UI:
  - Show a scrollable list overlay of fetchable animal names (from `pendingAbility.fetchableAnimalIds`).
  - Each entry is a tappable row: animal name + sprite icon.
  - On tap: call `resolveAbilityInSession({ type: 'fetch', targetAnimalId })`.
  - Animate fetched card appearing in barn slot.
  - Cancel button to dismiss without using.
- [ ] Implement Refresh visual feedback:
  - Brief flash animation on all refreshed cards (scale pop 1.0 -> 1.1 -> 1.0, 150ms).
  - Ability icons on refreshed cards transition from grey back to gold.
- [ ] Update ability icon rendering: after any ability activation/resolution, refresh all card ability icons.
- [ ] Add `cancelAbilityInSession(session)` to session.ts for cancel support.

### Phase 6: Trading Post Legendary Section & Scrolling (~10%)

**Goal:** Add Legendary Animals to the Trading Post with distinct visual treatment and scrollable layout.

**Files:**
- `src/scenes/TradingPostScene.ts` — Modify
- `src/scenes/tradingPostLayout.ts` — Modify

**Tasks:**
- [ ] Add `getLegendaryShopPosition()` and `getLegendaryGridPositions()` to `tradingPostLayout.ts`
- [ ] Add `getContentHeight(regularCount, legendaryCount)` to compute total scrollable height
- [ ] Update `TradingPostScene` to render Legendary section:
  - Gold divider line at y=626
  - "LEGENDARY ANIMALS" header text: 16px bold, gold color, y=632
  - Legendary cards rendered with `ui-card-legendary` background and star icon
  - Cost displayed in 14px bold gold text
  - Same affordability/interactivity logic as regular cards
- [ ] Implement vertical scroll:
  - Create a dedicated Phaser Camera for the shop content area (mask out header/buttons if needed, or scroll entire scene)
  - On `pointerdown` + `pointermove`: track deltaY, scroll camera
  - Clamp scroll bounds: 0 to `max(0, contentHeight - 844)`
  - Inertia scrolling: on `pointerup`, apply decaying velocity over 300ms
  - Minimum drag threshold: 8px before scroll activates (to distinguish from taps)
- [ ] Update `generateMarket` in `shop.ts` to separate regular and Legendary items, or add `legendary` field to `MarketItem`
- [ ] Add `legendary: boolean` field to `MarketItem` interface

### Phase 7: Victory Overlay & Polish (~5%)

**Goal:** Victory screen, Legendary glow in barn, final animations.

**Files:**
- `src/scenes/BarnScene.ts` — Modify

**Tasks:**
- [ ] Implement victory overlay:
  - Full-screen semi-transparent gold overlay (0x000000, alpha 0.8)
  - "YOU WIN!" text: 36px bold, gold color (`#FFD700`), centered, y=200
  - Star particle burst: use Phaser's particle emitter with a small gold particle texture (4x4 gold square). Emit 50 particles in a burst pattern from center, gravity pull down, lifespan 2000ms, scale 0.5-1.5, alpha fading.
  - Stats display: "Nights Played: X" and "Total Mischief Earned: X" at y=320, y=350
  - "Play Again" button at y=500: resets session via `gameStore.reset()`, transitions to BarnScene
- [ ] Add Legendary glow tweens to `renderCardInSlot`:
  - Behind each Legendary card, add `ui-legendary-glow` sprite
  - Pulsing alpha tween: 0.3 -> 0.7, 1200ms, yoyo, infinite repeat, Sine.easeInOut
- [ ] Add `data-legendary-count` DOM attribute updates in `updateDomPhase`
- [ ] Add `data-phase="victory"` handling in `updateDomPhase`
- [ ] Update Night Summary overlay to show Legendary count: "Legendary Animals in Barn: X/3"

### Phase 8: Verification & Hardening (~5%)

**Goal:** All tests pass, bundle budget met, verification seeds work.

**Files:**
- `src/game/abilities.test.ts` — Already created in Phase 2
- `src/game/night.test.ts` — Extend
- `src/game/session.test.ts` — Extend
- `src/scenes/barnLayout.test.ts` — Extend

**Tasks:**
- [ ] Ensure all new unit tests pass: `npm run test`
- [ ] Ensure all existing unit tests pass (backward compat)
- [ ] Run `npm run typecheck` — zero errors
- [ ] Run `npm run lint` — zero errors
- [ ] Run `npm run format:check` — passes
- [ ] Run `npm run budget` — app chunk < 100KB gzipped
- [ ] Run `npm run ci` — all green
- [ ] Verify Sprint 003 seeds produce expected states:
  - `sprint3-ability-peek`: Sheepdog drawn, peek shows Feral Goat
  - `sprint3-ability-boot`: Stable Hand drawn after 2 animals, boot target available
  - `sprint3-win`: 3 Legendaries drawn, win overlay appears
  - `sprint3-legendary-shop`: Earn enough Mischief to see Legendary purchase flow
- [ ] Extend Playwright smoke test: assert `data-scene="Barn"` and `__GAME_READY__` still work
- [ ] Manual playthrough: complete game from start through win condition

---

## Animal Roster (Sprint 003 Additions)

### Active-Ability Animals (4)

| Animal | Cost | Mischief | Hay | Ability Type | Ability | Strategic Role |
|--------|------|----------|-----|-------------|---------|----------------|
| Sheepdog | 4 | +2 | -- | Active | Peek: see next card, accept or reject | Risk reduction |
| Stable Hand | 4 | -- | -- | Active | Boot: remove one non-Legendary animal (Penned Up) | Danger removal |
| Border Collie | 5 | +2 | -1 | Active | Fetch: pull specific animal from deck to barn | Combo enabler |
| Cheerful Lamb | 5 | +1 | -- | Active | Refresh: restore used active abilities | Ability extender |

### Legendary Animals (6)

| Animal | Cost | Mischief | Hay | Ability | Notes |
|--------|------|----------|-----|---------|-------|
| Golden Goose | 30 | -- | -- | None | Cheapest Legendary |
| Giant Ox | 35 | -- | -- | None | |
| Jackalope | 40 | -- | -- | None | |
| Thunderbird | 45 | -- | -- | None | |
| Silver Mare | 45 | -- | -- | Passive: cancels 1 NOISY! | Defensive Legendary |
| Lucky Toad | 50 | -- | +3 | None | Expensive but gives Hay |

Six Legendaries are available (not the full 8 from INTENT.md). Win requires collecting any 3 of the 6 into the barn simultaneously. This gives the player meaningful choice about which Legendaries to pursue based on cost and utility.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/game/types.ts` | Modify | Add AbilityType, ActiveAbilityId, PendingAbility, LegendaryAnimalId, extend AnimalDef/CardInstance/NightState/GameSession/NightEvent/GamePhase |
| `src/game/animals.ts` | Modify | Add 4 active-ability animals, 6 Legendary animals, extend existing defs with new fields |
| `src/game/abilities.ts` | Create | Active ability engine: peek/boot/fetch/refresh pure functions |
| `src/game/abilities.test.ts` | Create | Unit tests for all ability logic and edge cases |
| `src/game/night.ts` | Modify | Win condition check, ability-ready event emission |
| `src/game/night.test.ts` | Extend | Win condition tests |
| `src/game/session.ts` | Modify | activateAbilityInSession, resolveAbilityInSession, cancelAbilityInSession, win state tracking |
| `src/game/session.test.ts` | Extend | Ability + win integration tests |
| `src/game/scoring.ts` | Modify | No functional changes expected; verify Legendary animals score correctly (0/0) |
| `src/game/shop.ts` | Modify | Legendary animals in market, separate stock (1 each), add `legendary` to MarketItem |
| `src/game/shop.test.ts` | Extend | Legendary purchase tests, stock limit tests |
| `src/game/deck.ts` | Modify | Add `abilityUsed` to createCardInstance, Sprint 003 verification seeds |
| `src/game/deck.test.ts` | Extend | Verify new card instance shape |
| `src/game/gameStore.ts` | No change | Singleton pattern unchanged |
| `src/scenes/BootScene.ts` | Modify | Generate new textures (Legendary card, glow, badges, ability icons, info panel bg) |
| `src/scenes/BarnScene.ts` | Modify | Card readability rewrite, info panel, ability UI, victory overlay, Legendary glow |
| `src/scenes/barnLayout.ts` | Modify | Add getInfoPanelPosition |
| `src/scenes/barnLayout.test.ts` | Extend | Info panel position tests |
| `src/scenes/TradingPostScene.ts` | Modify | Legendary section, scrolling, ability descriptions |
| `src/scenes/tradingPostLayout.ts` | Modify | Legendary grid positions, content height calculation |
| `src/config/constants.ts` | Modify | New textures, info panel layout, Legendary palette, animation timings |
| `src/types/index.ts` | No change | SceneKey enum unchanged |

---

## Definition of Done

1. **Card readability**: Mischief and Hay badges are 32x20px with 14px text, clearly visible on 88x88 cards. NOISY! banner spans full card width at top. No player should need to long-press just to see basic resource values.

2. **Info panel**: Long-pressing (500ms) any animal card in the barn shows a slide-up panel at screen bottom with: name, sprite, Mischief, Hay, NOISY! status, ability name and description, keywords. Panel dismisses on outside tap.

3. **Sheepdog ability**: Tapping Sheepdog card shows next deck card. Accept places it in barn (with bust/win check). Reject shuffles it back. Ability usable once per Night per Sheepdog instance.

4. **Stable Hand ability**: Tapping Stable Hand card highlights bootable (non-Legendary) animals. Tapping one removes it from barn and marks it Penned Up. Usable once per Night per instance.

5. **Border Collie ability**: Tapping Border Collie card shows list of animals in deck. Selecting one fetches it into the barn (with bust/win check). Usable once per Night per instance.

6. **Cheerful Lamb ability**: Tapping Cheerful Lamb card instantly restores all other used active abilities. Visual confirmation via icon refresh. Usable once per Night per instance.

7. **Legendary Animals in Trading Post**: 6 Legendaries displayed in a separate gold-bordered section below regular shop. Each costs 30-50 Mischief. 1 stock each. Golden card border and star icon distinguish them.

8. **Win condition**: Having 3 Legendary Animals in the barn simultaneously (via draw, peek-accept, or fetch) triggers a victory overlay with "YOU WIN!", particle effects, stats, and "Play Again" button.

9. **Legendary visual treatment**: Legendary cards in barn use golden card background with pulsing glow tween. Clearly distinguishable from regular cards.

10. **Ability icons on cards**: Active-ability cards show a 16x16 gold icon when ability is available, grey when used. Players can tell at a glance which abilities are ready.

11. **Cancel support**: Player can cancel a pending boot or fetch without consuming the ability.

12. **Trading Post scrolling**: Full shop (8 regular + 6 Legendary) is scrollable on the 844px screen. Touch drag scrolls content.

13. **DOM verification markers**: `data-phase="ability_pending"`, `data-phase="victory"`, `data-legendary-count` attributes maintained.

14. **Backward compatibility**: All Sprint 002 unit tests pass without modification. Existing seed verification patterns produce the same results.

15. **New unit tests**: Minimum 25 new tests covering abilities (all 4), win condition, Legendary animals, and card instance shape.

16. **CI green**: `npm run ci` passes. App chunk under 100KB gzipped.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Ability interactions create edge cases** | High | Medium | Each ability is a pure function returning new state. Comprehensive unit tests cover: ability + bust, ability + win, ability + empty deck, ability + cancel. Test all 4 abilities in isolation and in combination (e.g., Cheerful Lamb refreshing a Sheepdog). |
| **Card readability changes break layout at capacity 7-8** | Medium | Medium | Existing `getDynamicSlotRects` tests already verify 5-8. New card content must fit within 88x88. Badges (32x20) + sprite (32x32 scaled 2x = 64x64 visual, but Origin-centered) + name (10px) are manually verified to fit. |
| **Trading Post scrolling conflicts with tap detection** | Medium | Medium | Implement 8px drag threshold before scroll activates. Taps below threshold fire purchase handlers normally. Test on actual mobile viewport. |
| **Info panel interferes with ability activation** | Medium | High | Long-press (500ms) is clearly distinct from tap. Info panel is disabled during `AbilityPending` phase. Tap always fires ability; hold always fires info panel. |
| **Bundle size growth from new textures** | Low | Medium | All textures are generated via Graphics, not loaded as files. Generated textures add ~0 bytes to bundle. Monitor with `npm run budget`. |
| **Scope creep into more abilities** | Medium | High | Strict scope: only 4 active abilities (peek, boot, fetch, refresh) and 6 Legendaries. No BRINGER animals, no scaling animals, no scenario selection. |
| **Win condition too easy/hard** | Medium | Low | 3 Legendaries at 30-50 Mischief each requires 105-150 total Mischief spent on Legendaries alone, plus capacity upgrades to hold them. This is a late-game achievement requiring 10+ Nights of careful play. Tuning is a future concern. |
| **`abilityUsed` field breaks existing CardInstance serialization** | Medium | Medium | All existing `createCardInstance` calls gain `abilityUsed: false` default. Existing tests create CardInstances directly — update those to include the field. Search-and-replace is straightforward. |

---

## Security Considerations

- Static client-only site. No backend, auth, or secret handling.
- No new runtime network dependencies.
- Seed query parameter validation unchanged (bounded string, regex-validated).
- Ability resolution functions validate all inputs (card exists, target exists, target is valid). Invalid inputs return unchanged state with empty events — no thrown exceptions that could crash the game.
- No eval or dynamic code execution in ability handlers.
- All new assets are generated textures (no external file loading).

---

## Dependencies

- **Existing stack**: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Existing canvas contract**: 390x844 logical resolution with Scale.FIT
- **Existing bundle budget**: Phaser chunk < 400KB gzipped, app chunk < 100KB gzipped
- **Sprint 002 deliverables**: All game logic in `src/game/`, event-driven animation, gameStore singleton, DOM verification markers, pixel art assets
- **No new npm dependencies**

---

## Open Questions

1. **Legendary animal sprites**: Do we need new sprite frames in the animal atlas for the 6 Legendaries and 4 ability animals, or can we reuse existing sprites with color tinting? Reusing with tinting is faster but less visually distinct. Proposed: Source or create new sprite frames for the 10 new animals.

2. **Ability cancel behavior**: When a player starts a boot/fetch but cancels, should the ability remain available or be consumed? Proposed: Remain available (cancel is free). This is more forgiving and avoids punishing exploration.

3. **Boot Penned Up stacking**: If a player boots an animal AND busts in the same Night, are two animals Penned Up? Proposed: Yes, but only 1 Penned Up slot exists per Night. The bust-causing animal takes priority for Penned Up; the booted animal is Penned Up separately. This requires extending the Penned Up system to support 2 simultaneous penned cards. Alternative: only the bust-causing animal is penned; the booted animal simply returns to the herd. **Recommended: booted animal is penned, bust-causing animal is also penned. Extend `pendingPennedUpCardId` to `pendingPennedUpCardIds: string[]`.**

4. **Fetch information asymmetry**: Should the Fetch UI show the exact cards in the deck (revealing remaining draw order) or only the set of available animal types? Proposed: Show only unique animal types with counts (e.g., "Barn Cat x2, Feral Goat x1"), not the deck order. This preserves draw-order uncertainty while giving enough info to make a meaningful choice.

5. **Legendary scoring**: INTENT.md shows Legendaries with 0 Mischief / 0 Hay. Drawing Legendaries into the barn occupies slots but provides no resource income. Is this intended? Proposed: Yes, this is the cost of pursuing the win condition — Legendary cards are dead weight for scoring, creating tension between resource accumulation and victory pursuit. Lucky Toad's +3 Hay is the exception.

6. **Maximum capacity for Legendaries**: With capacity 5-8, holding 3 Legendaries means 2-5 slots for scoring animals. Should the max capacity increase beyond 8 for Sprint 003? Proposed: No, keep max at 8. The constraint is intentional — players must expand capacity and manage barn space carefully.
