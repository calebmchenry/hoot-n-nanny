# Sprint 007 Intent — UI Polish & Ability Tooltips

## Seed Prompt (from user)

> I don't like all the shifting UI. I think the cards in the shop are too
> scrunched. And the emojis look blurry. I wish hovering would tell me the
> abilities of the animal.

## Orientation Summary

- **Shifting UI**: BarnScene `applyLayout()` repositions everything on resize
  and state changes. The HUD (resource banner, noise meter, action bar) uses
  proportional positioning that shifts when canvas dimensions change or when
  game state triggers re-layout. The `pendingResize` pattern defers during
  animations but doesn't prevent visual jumping during normal state transitions.
- **Scrunched shop cards**: `tradingPostLayout.ts` `getShopGridPositions()`
  uses 2 columns (cw<500) or 3 columns (cw>=500). Card height is clamped by
  the available vertical space between tabs and bottom buttons. On phone, this
  produces very small cards (44-72px tall) that trigger "compact" mode, hiding
  ability labels and scrunching resource text.
- **Blurry emoji**: Sprint 006 renders emoji at 64x64 with `LINEAR` filtering
  (`Phaser.Textures.FilterMode.LINEAR`). This makes them soft/blurry against
  the otherwise crisp `pixelArt: true` nearest-neighbor aesthetic.
- **No ability tooltips**: BarnScene has a long-press info panel (300ms hold)
  that shows full animal details including ability description. But there's no
  quick tooltip on hover/tap. TradingPostScene has NO info display at all —
  players can't see abilities before purchasing.

## What This Sprint Must Deliver

### 1. Stabilize HUD Positioning
- Resource banner, noise meter, deck stack, and action bar should not jump
  when cards are drawn, capacity changes, or state transitions happen
- Positions should only change on actual viewport resize, not on game state changes
- Audit `applyLayout()` for any state-dependent positioning that causes visual shifts

### 2. Fix Shop Card Layout
- Increase card sizes in Trading Post — cards should be large enough to show:
  animal emoji, name, cost, mischief/hay stats, ability label, and stock count
- Consider reducing to 2 columns always (even on wider screens) for better readability
- Or increase the card area by adjusting the grid bounds
- Ensure "compact" mode is rarely or never triggered on phone viewports

### 3. Fix Blurry Emoji
- Change emoji texture filtering from `LINEAR` to `NEAREST` to match pixel art
- OR render emoji at 128x128 so they stay sharp when displayed at typical card sizes
- The user wants crisp, not smooth

### 4. Add Ability Tooltips
- **Barn**: On pointer hover (desktop) or quick tap (mobile), show a small
  tooltip with the animal's ability label and description. This should be
  faster than the 300ms long-press info panel.
- **Trading Post**: On pointer hover or tap on a shop card, show the animal's
  ability description so players know what they're buying.
- Tooltip should be a small floating panel near the card, not a full-screen overlay.
- Should show: ability label (e.g., "Peek"), trigger type, and description text.
- Animals with no special ability show nothing or "No special ability."

## Relevant Codebase Areas

| Area | Files | What Changes |
|------|-------|-------------|
| HUD positioning | `src/scenes/BarnScene.ts` (`applyLayout`) | Stabilize positions |
| Barn layout | `src/scenes/barnLayout.ts` | May need position adjustments |
| Shop layout | `src/scenes/tradingPostLayout.ts` | Card sizing, grid bounds |
| Shop rendering | `src/scenes/TradingPostScene.ts` | Card layout, add tooltips |
| Emoji textures | `src/scenes/BootScene.ts` | Change filter mode or texture size |
| Ability data | `src/game/abilities.ts` | Read-only — get ability descriptions |
| Ability types | `src/game/types.ts` | Read-only — get AnimalDef.abilityKind |

## Constraints

- `src/game/*` completely untouched (read ability data but don't modify)
- No new npm dependencies
- App chunk < 100KB gzipped
- Existing tests must pass
- Touch input: minimum 44x44px tap targets
- Tooltips must work on both touch (mobile) and pointer (desktop)

## Success Criteria

1. HUD elements don't visually jump during gameplay (only reposition on resize)
2. Shop cards are large enough to read all info comfortably on phone
3. Emoji look crisp, matching the pixel art style
4. Hovering/tapping an animal card shows its ability description
5. All existing tests pass, CI green

## Uncertainty Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| Correctness | Low | Standard UI polish, well-understood patterns |
| Scope | Low | 4 focused fixes, well-bounded |
| Architecture | Low | Extends existing layout and rendering patterns |

## Open Questions

1. Should tooltips appear on hover (desktop) immediately, or after a short
   delay (100-200ms) to avoid flickering?
2. Should the Trading Post tooltip be the same component as the Barn tooltip,
   or a separate implementation?
3. For "no ability" animals, should the tooltip say "No special ability" or
   just not appear at all?
