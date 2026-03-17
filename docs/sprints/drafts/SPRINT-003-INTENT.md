# Sprint 003 Intent — Win Condition, Abilities, & Card Readability

## Seed Prompt (from user)

> It is hard to see the mischief and hay indicators on the cards. Another issue
> is that I can't tell if the animals have any abilities. There should be some
> kind of information at the bottom of the screen on hover or long press. There
> doesn't seem to be an end goal yet. It should be to have 3 "star" animals in
> your barn at the same time. Where star animals are expensive end-goal animals
> to get. Add abilities too. Look at Party House for ability guidance.

## Orientation Summary

- **Sprint 002 delivered**: playable push-your-luck core loop — draw animals,
  bust detection (Farmer Wakes Up / Barn Overwhelmed), NOISY! warning, scoring
  with Mischief/Hay, Trading Post with 8 purchasable animals, capacity upgrades,
  penned-up mechanic, pixel art visuals, 30 unit tests, CI green.
- **Card readability gap**: Resource badges (24x24 circles with numbers) are
  too small and lack contrast on the 88x88 card slots. Players can't quickly
  parse mischief/hay values or identify abilities.
- **No ability system**: All animals currently have only passive traits encoded
  as boolean flags (noisyMitigation, givesHermitCrabBonus, givesDraftPonyBonus).
  Active abilities (peek, boot, fetch, refresh) are fully designed in INTENT.md
  but not implemented.
- **No win condition**: The game loops indefinitely. INTENT.md specifies
  collecting 4 Legendary Animals simultaneously; user requests 3 "star" animals.
- **Key files involved**: `src/game/types.ts`, `src/game/animals.ts`,
  `src/game/night.ts`, `src/game/scoring.ts`, `src/game/session.ts`,
  `src/game/shop.ts`, `src/scenes/BarnScene.ts`, `src/scenes/TradingPostScene.ts`,
  `src/config/constants.ts`

## What This Sprint Must Deliver

### 1. Card Readability Overhaul
- Larger, higher-contrast resource indicators on cards
- Ability icons/text visible on cards at a glance
- NOISY! indicator must be unmistakable
- Trait keywords (Passive, Active, Triggered, BRINGER) visible

### 2. Info Panel (Long-Press / Hover)
- Bottom-of-screen detail panel showing full animal info on long-press (mobile)
  or hover (desktop)
- Shows: animal name, sprite, mischief value, hay value, ability description,
  NOISY! status, any special traits
- Must not interfere with gameplay; dismissible

### 3. Win Condition — Legendary Animals
- Add Legendary Animals to the game (expensive, powerful "star" animals)
- Win condition: have 3 Legendary Animals in the barn simultaneously during a
  single Night
- User specified 3 (not 4 from INTENT.md) — use 3 as the target
- Legendary Animals need distinct visual treatment (glow, animation, special
  card border)
- Win detection triggers a victory screen/overlay
- Available in the Trading Post at high Mischief costs

### 4. Active Abilities
- Implement the active ability system from INTENT.md
- Active abilities trigger once when the animal enters the barn (or on player
  choice)
- Priority abilities for Sprint 003 (based on Party House guidance):
  - **Sheepdog**: Peek at next card; accept or reject
  - **Stable Hand**: Boot one animal from barn (Penned Up next Night)
  - **Border Collie**: Fetch a specific animal from herd into barn
  - **Cheerful Lamb**: Refresh all other animals' used active abilities
- UI for ability activation: tap the animal card to trigger, or auto-trigger
  with confirmation
- Each active ability usable once per Night per animal instance

## Relevant Codebase Areas

| Area | Files | What Changes |
|------|-------|-------------|
| Game types | `src/game/types.ts` | Add AbilityType enum, active ability fields to AnimalDef, Legendary flag, win event, ability events to NightEvent |
| Animal roster | `src/game/animals.ts` | Add Legendary Animals, add new purchasable animals with active abilities |
| Night logic | `src/game/night.ts` | Ability triggers on draw, peek/boot/fetch mechanics, win condition check |
| Session | `src/game/session.ts` | Win state tracking, Legendary animal management |
| Shop | `src/game/shop.ts` | Legendary Animals in market at high costs |
| BarnScene | `src/scenes/BarnScene.ts` | Card redesign, info panel, ability activation UI, win overlay, Legendary glow |
| TradingPostScene | `src/scenes/TradingPostScene.ts` | Legendary Animals in shop, ability descriptions |
| Constants | `src/config/constants.ts` | New colors for Legendary, ability icons, info panel layout |
| BootScene | `src/scenes/BootScene.ts` | Generate Legendary card textures, ability icon textures |

## Constraints

- Phaser 3.80.x, TypeScript strict, Vite 5.x — no new npm dependencies
- 390x844 logical canvas, mobile-first touch input
- App chunk must stay under 100KB gzipped
- All game logic in `src/game/` — scenes are thin views
- Event-driven animation: rule functions return NightEvent[], scenes consume
- No hover states that don't also work on mobile (long-press equivalent required)
- Existing tests must continue to pass
- Seedable determinism must be preserved

## Success Criteria

1. Player can see mischief/hay values clearly on every card without squinting
2. Long-pressing any animal card shows a detailed info panel
3. Legendary Animals appear in the Trading Post at high costs
4. Drawing 3 Legendary Animals into the barn in one Night triggers a win screen
5. At least 4 active-ability animals are purchasable and their abilities function
6. Active ability UI is intuitive on mobile (tap to activate, clear feedback)
7. All existing tests pass + new tests for abilities and win condition
8. CI green, bundle budget met

## Verification Strategy

- Unit tests for all new game logic (abilities, win condition, Legendary animals)
- Seeded deterministic tests for ability interactions
- agent-browser screenshots showing: card readability, info panel, Legendary
  cards, ability activation, win screen
- Manual playthrough verifying the full loop including win condition

## Uncertainty Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| Correctness | Medium | Active ability interactions (peek, boot, fetch) have edge cases |
| Scope | Medium | 4 systems (readability, info panel, win condition, abilities) — could be large |
| Architecture | Medium | Active abilities need new event types and UI patterns not yet in codebase |

## Open Questions

1. **Which Legendary Animals?** INTENT.md lists 8, with 4 per scenario. For
   Sprint 003, should we pick a fixed set of 4-6 Legendaries, or implement the
   scenario-selection system?
2. **How many active-ability animals?** Should we implement all active abilities
   from INTENT.md or a subset? User said "add abilities" — minimum viable set
   vs full roster.
3. **Info panel visual design**: Slide-up panel from bottom? Modal overlay?
   Tooltip near the card?
4. **Ability activation timing**: Auto-trigger on entry (like BRINGER) vs player
   tap to activate? Party House uses auto-trigger for most.
5. **Release to the Wild**: INTENT.md mentions a deck-thinning mechanic (spend
   3 Mischief to remove an animal). Include in Sprint 003 or defer?
