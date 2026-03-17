# Sprint 007: UI Polish — Stable HUD, Bigger Cards, Crisp Emoji, Ability Tooltips

## Overview

Four targeted fixes addressing visual polish feedback: stop HUD elements from jumping during gameplay, enlarge Trading Post shop cards, sharpen emoji rendering, and add ability tooltips to both scenes.

Scope: ~6 files changed. No game logic changes. `src/game/*` read-only.

---

## Use Cases

1. **Stable HUD.** Resource banner, noise meter, deck stack, and action bar hold position during card draws, capacity changes, and state transitions — only repositioning on actual viewport resize.
2. **Readable shop cards.** Trading Post cards are large enough to show emoji, name, cost, stats, and ability label on phone without triggering compact mode.
3. **Crisp emoji.** Emoji glyphs match the pixel art aesthetic instead of appearing blurry.
4. **Ability discovery.** Players can see what an animal does before committing — in both Barn and Trading Post.

---

## Phase 1: Stabilize HUD Positioning

### Problem

`BarnScene.applyLayout()` reads `gameStore.getState().capacity` and recomputes every position on each call. It's called on state transitions (card draw, night end, ability use) via `refreshDisplay()` — not just on resize — causing the HUD to visually jump.

### Fix

Split `applyLayout` into two concerns:

1. **`applyViewportLayout(cw, ch)`** — positions viewport-dependent elements (sky, walls, floor, resource banner, noise meter, deck stack, action bar, farmhouse). Called only from `handleResize` and `create`. Captures `cw`/`ch` as instance fields for reuse.
2. **`applySlotLayout()`** — positions slot images, card containers, and card shadows based on current capacity and the stored `cw`/`ch`. Called from both resize and state-change paths.

The key change: HUD elements (banner, noise meter, deck, action bar) are positioned **only** in `applyViewportLayout`, so they never shift on state changes. Slot grid still reflows on capacity change since the grid genuinely depends on capacity.

### Files

| File | Change |
|------|--------|
| `src/scenes/BarnScene.ts` | Split `applyLayout` into `applyViewportLayout` + `applySlotLayout`; update `refreshDisplay` to call only `applySlotLayout`; store `cw`/`ch` as instance fields |

---

## Phase 2: Bigger Shop Cards

### Problem

`tradingPostLayout.ts` `getShopGridPositions()` squeezes cards between tab buttons and bottom buttons. On 390x844 phones, cards end up 44-72px tall, triggering compact mode that hides ability labels.

### Fix

- Always use 2-column grid (remove the `cw >= 500 ? 3 : 2` branch) — phone screens don't have room for 3 readable columns.
- Give the grid more vertical space by reducing the gap between tabs and grid top, and between grid bottom and the capacity button.
- Increase `ratioCardH` aspect ratio from `108/170` (~0.64) to `128/170` (~0.75) and raise the max clamp from 160 to 200.
- Raise the compact-mode threshold so it's rarely triggered on reference viewport.

### Files

| File | Change |
|------|--------|
| `src/scenes/tradingPostLayout.ts` | Fix column count, aspect ratio, clamp values, spacing |
| `src/scenes/TradingPostScene.ts` | Adjust compact-mode threshold to match new card sizes |

---

## Phase 3: Crisp Emoji

### Problem

`BootScene.ts` generates emoji textures at 64x64 with `Phaser.Textures.FilterMode.LINEAR`. The linear interpolation makes emoji look blurry against the nearest-neighbor pixel art.

### Fix

Two changes:
1. Bump `EMOJI_TEXTURE_SIZE` from 64 to 128 (and font size proportionally) — more source pixels means less scaling blur at typical display sizes.
2. Change `setFilter(Phaser.Textures.FilterMode.LINEAR)` to `setFilter(Phaser.Textures.FilterMode.NEAREST)` — crisp edges matching the pixel art style.

### Files

| File | Change |
|------|--------|
| `src/scenes/BootScene.ts` | `EMOJI_TEXTURE_SIZE = 128`, font size to 96, filter to `NEAREST` |

---

## Phase 4: Ability Tooltips

### Problem

Barn has a 300ms long-press info panel but no quick tooltip. Trading Post has no ability display at all — players buy animals blind.

### Design

A lightweight tooltip component (shared helper function, not a class) that both scenes call:

```typescript
// src/scenes/tooltipHelper.ts
export function showAbilityTooltip(
  scene: Phaser.Scene,
  x: number, y: number,
  animalDef: AnimalDef,
  ability: AbilityDef,
): Phaser.GameObjects.Container;

export function dismissTooltip(
  scene: Phaser.Scene,
  tooltip: Phaser.GameObjects.Container,
): void;
```

**Tooltip content:** Ability label (e.g. "Peek"), trigger type icon/text ("On Enter" / "Passive" / "Manual"), and description. Animals with `abilityKind: 'none'` show no tooltip.

**Tooltip appearance:** Small rounded-rect panel (~180x80), positioned above the card (flips below if near top edge). Semi-transparent dark background, light text. Fades in over 100ms.

### Barn Behavior

- **Desktop:** `pointerover` shows tooltip after 150ms hover delay; `pointerout` dismisses.
- **Mobile:** Short tap (< 300ms) shows tooltip; second tap or tap-away dismisses. Long press still opens full info panel.
- Tooltip and info panel are mutually exclusive — showing one dismisses the other.

### Trading Post Behavior

- **Desktop:** `pointerover` on shop card shows tooltip after 150ms.
- **Mobile:** Tap on shop card shows tooltip. Second tap on the same card triggers purchase. Tap on different card moves tooltip. Tap away dismisses.
- This gives mobile users a "tap to preview, tap again to buy" flow.

### Files

| File | Change |
|------|--------|
| `src/scenes/tooltipHelper.ts` | **New file** — shared tooltip show/dismiss functions |
| `src/scenes/BarnScene.ts` | Wire tooltip to slot card pointer events |
| `src/scenes/TradingPostScene.ts` | Wire tooltip to shop card pointer events, add tap-to-preview-then-buy flow |

---

## Constraints

- `src/game/*` untouched (read ability data only)
- No new npm dependencies
- App chunk < 100KB gzipped
- Existing tests pass
- Touch: minimum 44x44px tap targets
- Tooltips work on both touch and pointer input

## Definition of Done

1. HUD elements (banner, noise meter, deck, action bar) don't jump during gameplay — only reposition on viewport resize
2. Shop cards show emoji, name, cost, stats, and ability label without compact mode on 390x844
3. Emoji look crisp with hard edges matching pixel art style
4. Hovering/tapping an animal in Barn or Trading Post shows ability tooltip
5. `npm run ci` passes
6. Visual before/after screenshots in `artifacts/visual/sprint-007/`

## Uncertainty

| Factor | Level | Notes |
|--------|-------|-------|
| Correctness | Low | Standard UI polish |
| Scope | Low | Four focused fixes |
| Architecture | Low | Extends existing patterns; one small new helper file |

## Open Questions

1. Should the Trading Post "tap to preview, tap again to buy" replace or augment the current single-tap-to-buy? (Draft assumes replace — feels better on mobile.)
2. Tooltip hover delay: 150ms proposed. Adjust if it feels sluggish or flickery during testing.
3. Should `EMOJI_TEXTURE_SIZE = 128` bump also increase the fallback letter-circle size, or keep that at 64?
