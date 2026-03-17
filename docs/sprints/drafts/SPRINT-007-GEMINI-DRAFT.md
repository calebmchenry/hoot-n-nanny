# Sprint 007 — UI Polish & Ability Tooltips

## Overview

Four targeted fixes: stabilize HUD positioning, enlarge Trading Post cards,
switch emoji textures to NEAREST filtering, and add a shared ability tooltip
component used by both BarnScene and TradingPostScene.

**Scope**: ~5 files modified, ~1 new file. No game logic changes.
`src/game/*` is completely untouched. No new npm dependencies.

## Fix 1: Stable HUD Positioning

### Problem

`BarnScene.applyLayout()` repositions every element -- HUD included -- and it
runs on `create()`, on `handleResize()`, and after deferred resize flushes.
The resource banner, noise meter, and action bar use proportional layout math
that reads `capacity` from game state. When capacity changes mid-game (upgrade
purchased), these elements jump to new positions even though the viewport has
not changed.

### Solution

Split `applyLayout` into two methods:

1. **`applyViewportLayout(cw, ch)`** -- positions everything that depends only
   on canvas dimensions: sky, wall, floor, rafter, vignette, resource banner,
   noise meter, deck stack, action bar, dust emitter. Called from
   `handleResize()` and `create()`.

2. **`applyContentLayout(cw, ch)`** -- positions elements that depend on game
   state: slot rects, card containers, card shadows, farmhouse, overlays.
   Called from `create()` and any state-change handler that mutates capacity or
   slot count.

The key insight: `getResourceBannerPosition`, `getNoiseMeterPosition`, and
`getActionBarPosition` already take `_capacity` (unused parameter) or compute
from `cw`/`ch` alone. They do NOT actually depend on capacity. The HUD
positions are purely viewport-derived. Moving them into a viewport-only path
eliminates the jumping.

### Changes

| File | What |
|------|------|
| `src/scenes/BarnScene.ts` | Split `applyLayout` into `applyViewportLayout` + `applyContentLayout`. `handleResize` and `flushPendingResize` call both. State-change handlers (capacity upgrade, card draw) call only `applyContentLayout`. |
| `src/scenes/barnLayout.ts` | No changes needed. Layout functions already separate viewport-only from state-dependent concerns. |

### Verification

- Draw cards, upgrade capacity, trigger night -- HUD elements (banner, noise
  dots, action buttons) must not shift position.
- Resize browser window -- everything repositions correctly.
- Open DevTools, toggle device toolbar between phone sizes -- layout adapts.

## Fix 2: Bigger Shop Cards

### Problem

`getShopGridPositions()` uses 2 or 3 columns depending on viewport width
(`cw >= 500 ? 3 : 2`). On phone (390px logical width), this produces 2-column
cards that are still cramped because `cardH` is clamped by vertical space
between the tab bar and the capacity/start-night buttons. Cards frequently hit
`compact` mode (`pos.h < 72`), which hides the ability label entirely.

### Solution

Force 2 columns always. Remove the `cw >= 500 ? 3 : 2` conditional. Then
increase the available vertical space by adjusting grid bounds:

1. **Always 2 columns.** Delete the `columns` conditional. Hardcode `const
   columns = 2`.

2. **Raise the card height floor.** Change the `cardH` clamp from
   `clamp(..., 44, 160)` to `clamp(..., 80, 180)`. A minimum of 80px
   guarantees ability labels are always visible (no compact mode on phone).

3. **Reduce bottom margin.** The current gap between grid bottom and capacity
   button is `Math.max(10, round((14 / REF_H) * ch))`. Reduce to
   `Math.max(6, round((8 / REF_H) * ch))` to reclaim ~8px of vertical space.

4. **Adjust aspect ratio target.** The current `ratioCardH = round(cardW *
   (108 / 170))` targets a ~1.57:1 width-to-height ratio. Change to
   `round(cardW * (130 / 170))` (~1.31:1) for taller cards that give more room
   to ability text.

5. **Remove compact mode from `layoutShopCard`.** With the 80px minimum,
   `compact` mode (the `pos.h < 72` branch) is dead code. Remove it entirely
   so ability labels are always laid out in the non-compact path. Keep the
   `abilityLabel` positioning as-is in the non-compact branch.

### Changes

| File | What |
|------|------|
| `src/scenes/tradingPostLayout.ts` | `getShopGridPositions`: hardcode 2 columns, raise `cardH` min to 80, adjust ratio and bottom margin. |
| `src/scenes/TradingPostScene.ts` | `layoutShopCard`: remove `compact` branch. Ability label is always visible. |

### Verification

- Open Trading Post on 390x844 viewport. Cards should be large enough to show
  emoji, name, cost, mischief/hay, ability label, and stock count without
  truncation.
- Scroll is NOT needed -- the grid fits within the available space.
- On wider viewports (tablet/desktop), 2 columns still look fine because card
  width scales with available space.

## Fix 3: Crisp Emoji (NEAREST Filtering)

### Problem

Sprint 006 renders emoji at 64x64 and applies `LINEAR` (bilinear) filtering.
This was intentional to avoid jagged edges, but the result looks blurry and
soft against the otherwise crisp `pixelArt: true` aesthetic. The user wants
chunky-crisp, not smooth.

### Solution

One-line change in `BootScene.ts`:

```typescript
// Before:
texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);

// After:
texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);
```

At 64x64 source displayed at ~40-50px on cards, NEAREST filtering produces a
chunky, pixel-art-adjacent look. The emoji curves become blocky steps, which
matches the procedural texture style of the rest of the game. This is a
deliberate aesthetic choice, not a bug.

### Changes

| File | What |
|------|------|
| `src/scenes/BootScene.ts` | Line ~264: change `LINEAR` to `NEAREST`. |

### Verification

- Emoji on barn cards and shop cards should look sharp/blocky, not blurry.
- Compare before/after screenshots at 1x and 2x device pixel ratios.

## Fix 4: Shared Ability Tooltip

### Problem

BarnScene has a long-press info panel (300ms hold) that shows full animal
details. But there is no quick tooltip for hover or tap. TradingPostScene has
zero ability info display -- players cannot see what an animal does before
purchasing.

### Solution

Create a **shared tooltip helper** in `src/scenes/abilityTooltip.ts` that both
scenes import. This is a single file with pure functions that create and
position a tooltip container. Not a class, not a manager -- just functions.

Per CLAUDE.md directory rules: this is the first shared scene helper, so it
lives in `src/scenes/` alongside the existing layout helpers. No new
subdirectory needed.

### Tooltip API

```typescript
// src/scenes/abilityTooltip.ts

export interface TooltipHandle {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
}

/** Create and show a tooltip near the given anchor position. */
export function showAbilityTooltip(
  scene: Phaser.Scene,
  animalId: AnimalId,
  anchorX: number,
  anchorY: number,
  canvasW: number,
  canvasH: number,
): TooltipHandle | null;

/** Destroy an existing tooltip if present. */
export function hideAbilityTooltip(handle: TooltipHandle | null): null;
```

`showAbilityTooltip` returns `null` if the animal has `abilityKind: 'none'`
(no tooltip for animals without abilities -- nothing useful to show).

### Tooltip Rendering

The tooltip is a Phaser Container with:
- A rounded-rect background (Graphics object), fill `#1a1a1a` at alpha 0.92.
- **Ability label** in bold bitmap text (e.g., "Peek"), positioned at top.
- **Trigger type** in smaller text (e.g., "On Enter"), right of label.
- **Description** in wrapped bitmap text below.
- Panel width: `min(220, canvasW - 32)`. Height: auto based on text content,
  clamped to `max 120px`.
- Depth: `DEPTH.OVERLAY` (above cards, below full overlays).

### Positioning Logic

The tooltip appears **above** the anchor point by default. If that would clip
the top of the canvas, it flips below. Horizontal position is centered on the
anchor, clamped to stay within `16px` of canvas edges.

```
anchorY - tooltipH - 8   (preferred: above)
anchorY + anchorH + 8    (fallback: below, if above clips top)
```

### Integration: BarnScene

Add `pointerover` / `pointerout` events to each card's hit area (desktop).
For mobile, add a quick-tap handler: if the pointer is released within 150ms
and has not moved more than 8px, show the tooltip for 2 seconds then auto-hide.
This coexists with the existing 300ms long-press info panel -- the long-press
still works as before.

```typescript
// In the card hit-area setup (around line ~1338):
hitArea.on('pointerover', () => {
  this.abilityTooltip = showAbilityTooltip(
    this, card.animalId, slot.x + slot.w / 2, slot.y, cw, ch
  );
});
hitArea.on('pointerout', () => {
  this.abilityTooltip = hideAbilityTooltip(this.abilityTooltip);
});
```

Add a `private abilityTooltip: TooltipHandle | null = null` field to
BarnScene. Clean it up in `shutdown()`.

### Integration: TradingPostScene

Add `pointerover` / `pointerout` to each shop card background (which is
already interactive for affordable cards). For non-affordable cards, make the
background interactive for hover only (no purchase action). On mobile, use the
same quick-tap pattern as BarnScene.

```typescript
// In refreshShopCardInteractivity:
cardView.bg.on('pointerover', () => {
  this.abilityTooltip = showAbilityTooltip(
    this, cardView.item.animalId,
    pos.x + pos.w / 2, pos.y, cw, ch
  );
});
cardView.bg.on('pointerout', () => {
  this.abilityTooltip = hideAbilityTooltip(this.abilityTooltip);
});
```

Important: non-affordable cards (alpha 0.4) must ALSO be interactive for
hover/tap tooltip -- only the purchase action is gated on affordability. Call
`setInteractive()` on all card backgrounds, but only bind `pointerdown` for
purchase on affordable ones.

### Changes

| File | What |
|------|------|
| `src/scenes/abilityTooltip.ts` | **Create.** `showAbilityTooltip` + `hideAbilityTooltip` functions. |
| `src/scenes/BarnScene.ts` | Import tooltip functions. Add `pointerover`/`pointerout` to card hit areas. Add `abilityTooltip` field. Quick-tap handler for mobile. Cleanup in `shutdown`. |
| `src/scenes/TradingPostScene.ts` | Import tooltip functions. Add hover/tap to shop card backgrounds. Make non-affordable cards interactive for hover. Add `abilityTooltip` field. Cleanup in `shutdown`. |

### Answers to Open Questions from Intent

1. **Hover delay**: No delay on desktop. Tooltip appears immediately on
   `pointerover`. Flickering is not a concern because the tooltip is small and
   positioned near the pointer target, not across the screen.
2. **Shared component**: Yes. One implementation in `abilityTooltip.ts`, used
   by both scenes. This is a hard requirement, not a suggestion.
3. **No-ability animals**: Tooltip does not appear. `showAbilityTooltip`
   returns `null` for `abilityKind: 'none'`. Showing "No special ability" is
   wasted screen space and tap effort.

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/scenes/BarnScene.ts` | Modify | Split `applyLayout`, add tooltip integration |
| `src/scenes/barnLayout.ts` | None | No changes needed |
| `src/scenes/TradingPostScene.ts` | Modify | Remove compact mode, add tooltip integration |
| `src/scenes/tradingPostLayout.ts` | Modify | Hardcode 2 columns, raise card height min |
| `src/scenes/BootScene.ts` | Modify | `LINEAR` to `NEAREST` on emoji textures |
| `src/scenes/abilityTooltip.ts` | **Create** | Shared tooltip show/hide functions |

`src/game/*` is **completely untouched**. No new npm dependencies.

## Definition of Done

1. HUD elements do not jump during card draws, capacity upgrades, or night transitions.
2. Shop cards always show ability labels on 390x844 viewport. No compact mode.
3. Emoji textures are crisp/blocky with NEAREST filtering.
4. Hovering a barn card or shop card shows ability tooltip (desktop).
5. Quick-tapping a card shows ability tooltip for 2 seconds (mobile).
6. Animals with `abilityKind: 'none'` show no tooltip.
7. Tooltip is implemented once in `abilityTooltip.ts`, imported by both scenes.
8. `npm run ci` passes (typecheck, lint, tests, bundle budget).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| NEAREST emoji looks too blocky on high-DPI screens | Low | Low | This is the desired aesthetic. If it reads poorly, bump source to 96x96 in a follow-up. |
| Quick-tap tooltip conflicts with long-press info panel | Low | Medium | 150ms tap threshold is well below 300ms long-press. Pointer distance check (8px) prevents false triggers during scrolling. |
| 2-column shop grid wastes space on tablet/desktop | Low | Low | Cards scale to fill available width. On wider screens they simply get wider, which improves readability. |
| Tooltip text overflows on very small viewports | Low | Low | Width clamped to `canvasW - 32`, height clamped to 120px. Description text wraps via bitmap text word-wrap. |
