# Sprint 009: Card-like Cards, Stable Buttons, Readable Shop

## Overview

Cards don't look like cards — they're small tokens with overflowing emoji and illegible labels. The action bar destabilises when a single wide button splits into two narrow buttons mid-turn. Trading Post shop cells cram 6+ data points into ~170x108px. This sprint addresses the three core complaints: *cards should look and feel like real cards*, *buttons should never jump around*, and *the shop should be scannable at a glance*.

**Approach**: Enlarge barn card slots to ~120x156 (poker-ish 2.5:3.5 ratio), contain emoji within padded bounds, lock the action bar to a persistent two-slot layout that reveals/hides the second button in-place, and restructure shop cards with a clear visual hierarchy (name+emoji top, cost middle, stats bottom). No game logic changes. `src/game/*` untouched.

Scope: ~6 files modified, 0 new files. Estimated ~250 net lines changed.

---

## Use Cases

1. **Real cards in the barn** — Player draws an animal and sees a card with recognisable poker-style proportions (≈2.5:3.5), a visible parchment background, rounded shadow, centered emoji that never overflows, and a legible name below.
2. **Stable action bar** — The action area always occupies the same vertical strip at the bottom. On first draw, the "CALL IT A NIGHT" button fades in beside "KEEP GOING" without shifting either button's position or width.
3. **Scannable shop cards** — Trading Post cards have a clear top-down hierarchy: large emoji + name at the top, cost in a prominent badge at centre-left, stats and ability below. No more 6-way data collision.
4. **Night summary occludes buttons** — Overlay fully covers the action bar, preventing ghost taps.
5. **No regressions** — Touch targets remain ≥44px. Bundle budget holds. E2E smoke tests pass.

---

## Architecture

### Card Proportions: Poker-style ~120x156

Current barn slots are 96x104 — nearly square, which reads as "token." Real cards are taller than wide. Poker cards are 2.5:3.5 (≈1:1.4). At 120px wide, that gives 168px tall; clamped to 156px to keep 3 rows + noise meter + HUD within 844px.

The new slot dimensions fill ~31% of screen width per card (vs 25% today), and the 3-column grid spans 120*3 + 12*2 = 384px — nearly the full 390px canvas width. This eliminates the dead space flanking the grid.

**Texture regeneration**: Card parchment textures are currently generated at `LAYOUT.SLOT.WIDTH x LAYOUT.SLOT.HEIGHT` (96x104). These must be regenerated at 120x156. The shadow texture likewise. Shop textures (170x200) remain unchanged.

### Button Stability: Persistent Two-Slot Layout

The current approach destroys and recreates buttons when switching between 1-button and 2-button states. This causes position/size jumps.

New approach:
- **Always render two button slots** at equal widths: `buttonW = Math.floor((cw - 54) / 2)` = 168px each at 390px canvas. The gap between them is 14px.
- The primary button occupies the **left slot** and starts as "DRAW ANIMAL."
- The secondary button occupies the **right slot** but starts **invisible** (`setAlpha(0)`, `removeInteractive()`).
- After the first draw, the secondary button fades in (`alpha 0→1` over 180ms) and becomes interactive. The primary button label changes to "KEEP GOING." Neither button moves.
- The `getActionBarPosition()` function always returns both rects regardless of `dualButtons` param — the scene controls visibility.

This eliminates the destroy/recreate cycle and all positional jumps.

### Shop Card Hierarchy: Zone-Based Layout

Current shop cards pack emoji, name, cost, mischief, hay, stock, ability, and star badge into a flat ~170x108 rectangle. Everything competes.

New layout divides each card into three visual zones:

```
┌─────────────────────┐
│   [emoji]           │  Zone 1: Identity (top 45%)
│   Animal Name       │  Large emoji, prominent name
├─────────────────────┤
│ 💎3  +2M  +1H      │  Zone 2: Economics (middle 25%)
│                     │  Cost badge left, yields right
├─────────────────────┤
│  Ability Label      │  Zone 3: Details (bottom 30%)
│     x2              │  Ability + stock count
└─────────────────────┘
```

Card height increases from ~108px to ~140px (the layout already supports up to 200px via `SHOP_CARD.TEX_HEIGHT`). With 4 items in 2 columns and 2 rows, the vertical space from gridTop (~186) to gridBottom (~642) = ~456px easily fits 2 rows of 140px + gap.

### Overlay Occlusion Fix

The night summary overlay's bottom edge currently stops above the action bar (y=120, h=580, bottom=700, but buttons are at y=758). Fix: extend `LAYOUT.SUMMARY.HEIGHT` or compute overlay bounds to cover to `ch - 40`, ensuring the action bar is beneath the overlay.

---

## Implementation

### Phase 1: Enlarge Barn Card Slots (~35% of effort)

**`src/config/constants.ts`:**
- Update `LAYOUT.SLOT`:
  ```typescript
  SLOT: {
    WIDTH: 120,
    HEIGHT: 156,
    GAP: 12,
    COLUMNS: 3,
    START_Y: 156,
    ROW_GAP: 10,
    MAX_ROWS: 3,
  },
  ```
- `ROW_GAP` reduced from 14→10 to reclaim vertical space for taller cards.

**`src/scenes/barnLayout.ts`:**
- Update `getSlotSize()` to return larger base sizes:
  ```typescript
  const getSlotSize = (cw: number, ch: number): { w: number; h: number } => {
    if (cw >= 700) {
      return { w: 140, h: 182 };
    }
    if (cw >= 420 || ch >= 820) {
      return { w: 120, h: 156 };
    }
    return { w: 100, h: 130 };
  };
  ```
- Grid math in `getSlotLayout()` is unchanged — it already centres based on `slotW*3 + colGap*2`. The new 3-column width is 120*3+12*2 = 384px, centred at x=3 within the 390px canvas.

**`src/rendering/proceduralTextures.ts`:**
- Update the barn card texture generation calls to use the new `LAYOUT.SLOT.WIDTH` (120) and `LAYOUT.SLOT.HEIGHT` (156):
  ```typescript
  generatePaperTexture(scene, TEXTURES.CARD_PARCHMENT, PALETTE.PARCHMENT,
    LAYOUT.SLOT.WIDTH, LAYOUT.SLOT.HEIGHT, 'parchment');
  generatePaperTexture(scene, TEXTURES.CARD_NOISY, PALETTE.PARCHMENT,
    LAYOUT.SLOT.WIDTH, LAYOUT.SLOT.HEIGHT, 'noisy');
  generatePaperTexture(scene, TEXTURES.CARD_LEGENDARY, 0xf5e6b8,
    LAYOUT.SLOT.WIDTH, LAYOUT.SLOT.HEIGHT, 'legendary');
  ```
- Update `generateCardShadow()` call to use new dimensions.

**`src/scenes/BarnScene.ts`:**
- In `renderCardInSlot()`, fix emoji scale: replace `setScale(2)` with proportional capping:
  ```typescript
  const maxEmojiSize = Math.min(slot.w, slot.h) * 0.4;
  const spriteScale = maxEmojiSize / 128;
  sprite.setScale(spriteScale);
  ```
  At 120x156, this gives `maxEmojiSize = 48`, `spriteScale ≈ 0.375`. The 128px emoji texture renders at ~48px — well within the card. The old `setScale(2)` rendered emoji at 256px, far overflowing the 96px slot.
- Adjust `nameY` for taller card: `slot.h - 16` instead of `slot.h - 10`, giving more bottom padding.
- Adjust `spriteY` centre for taller card: `slot.h * 0.38` (was `slot.h / 2 - 8`).
- Badge position `badgeY` works proportionally already (uses `(4/104)*slot.h`), but verify at new dimensions.

**Farmhouse vertical adjustment:**
- With taller cards, the 3-row grid (capacity 7-8) bottom extends further. `getFarmhouseRect()` already computes `slotsBottom` dynamically and places the farmhouse below it, so no change needed. However, at capacity 5 (2 rows), the farmhouse may overlap with the taller second row. Verify and if needed, bump the minimum farmhouse Y.

### Phase 2: Stable Action Bar (~25% of effort)

**`src/scenes/barnLayout.ts`:**
- Modify `getActionBarPosition()` to always return both button rects:
  ```typescript
  export const getActionBarPosition = (
    _capacity: number,
    _dualButtons: boolean,
    cw: number,
    ch: number,
  ): ActionBarLayout => {
    const y = round(ch - 86);
    const h = 56;
    const x = 20;
    const gap = 14;
    const buttonWidth = Math.max(LAYOUT.TAP_TARGET_MIN, round((cw - 54) / 2));

    return {
      primary: toRect(x, y, buttonWidth, h),
      secondary: toRect(x + buttonWidth + gap, y, buttonWidth, h),
    };
  };
  ```
  The `dualButtons` parameter is now ignored — both rects are always computed. This ensures positions are stable.

**`src/scenes/BarnScene.ts`:**
- Refactor `createActionButtons()`: always create both buttons at scene start. The secondary button starts at `alpha=0` with `removeInteractive()`.
- Add a `revealSecondaryButton()` method:
  ```typescript
  private revealSecondaryButton(): void {
    if (!this.secondaryButton || this.secondaryButton.alpha >= 1) return;
    this.secondaryButton.setInteractive();
    this.tweens.add({
      targets: [this.secondaryButton, this.secondaryButtonText],
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out',
    });
  }
  ```
- Call `revealSecondaryButton()` after the first draw animation completes (where `createActionButtons(true)` was previously called). Instead of destroying and recreating, just update the primary label to "KEEP GOING" and fade in the secondary.
- Remove the `this.primaryButton.destroy()` / `this.secondaryButton.destroy()` pattern. Buttons persist for the scene lifetime.
- Update `updateActionButtonsLayout()` to always position both buttons using the stable layout.
- When hiding the action bar (e.g. during overlays), hide both buttons.

### Phase 3: Shop Card Visual Hierarchy (~25% of effort)

**`src/config/constants.ts`:**
- Update `LAYOUT.SHOP.CARD_HEIGHT` from 108→140:
  ```typescript
  SHOP: {
    ...existing,
    CARD_HEIGHT: 140,
  },
  ```

**`src/scenes/tradingPostLayout.ts`:**
- In `getShopGridPositions()`, the `ratioCardH` already computes from `cardW * (130/170)`. Updating to `cardW * (140/170)` matches the new target height. The `clamp(..., 80, 200)` accommodates 140 easily.

**`src/scenes/TradingPostScene.ts`:**
- Refactor `layoutShopCard()` to use the three-zone layout:
  - **Zone 1 (top 45%)**: Emoji at `pos.h * 0.22`, scaled to `min(pos.w, pos.h) * 0.32 / 128`. Name at `pos.h * 0.42`, font size 11px.
  - **Zone 2 (middle, 45%–70%)**: Cost badge at left edge (`6, pos.h * 0.52`). Mischief yield `+NM` and hay yield `+NH` at right side of same row, font 10px. Remove the separate mischief/hay rows that were stacked vertically.
  - **Zone 3 (bottom, 70%–100%)**: Ability label centred at `pos.h * 0.78`, font 9px. Stock count `x2` at `pos.h * 0.90`, font 9px. Star badge in top-right corner for legendary.
- This layout gives each piece of information dedicated space instead of the current cramped flat layout.
- Name text `setMaxWidth(pos.w - 16)` to ensure padding.

### Phase 4: Overlay Occlusion & Polish (~15% of effort)

**`src/scenes/barnLayout.ts`:**
- In `getOverlayBounds()`, extend the overlay height to cover the button area:
  ```typescript
  export const getOverlayBounds = (_capacity: number, cw: number, ch: number): Rect => {
    const margin = round((20 / REF_W) * cw);
    const top = round((100 / REF_H) * ch);
    const bottom = round((60 / REF_H) * ch);

    const w = Math.min(600, cw - margin * 2);
    const h = Math.max(220, ch - top - bottom);
    const x = round((cw - w) / 2);

    return toRect(x, top, w, h);
  };
  ```
  This extends the overlay from its current bottom of ~700 down to ~784, covering the action bar at y=758.

**`src/scenes/BarnScene.ts`:**
- In `showNightSummaryOverlay()` and `showBustOverlay()`, call `this.hideActionBar()` before displaying the overlay, and `this.showActionBar()` on dismissal. This provides a belt-and-suspenders approach: overlay covers buttons AND buttons are hidden.

**Font legibility pass:**
- In `renderCardInSlot()`, increase name text font from `fontPx(10, ch)` to `fontPx(12, ch)` — the taller card has room.
- In barn HUD, ensure bitmap text sizes scale proportionally with the layout.

---

## Files Summary

| File | Changes |
|------|---------|
| `src/config/constants.ts` | Update `LAYOUT.SLOT` dimensions to 120x156, `LAYOUT.SHOP.CARD_HEIGHT` to 140, reduce `SLOT.ROW_GAP` to 10 |
| `src/scenes/barnLayout.ts` | Enlarge `getSlotSize()` return values, stabilise `getActionBarPosition()` to always return two rects, extend `getOverlayBounds()` |
| `src/scenes/tradingPostLayout.ts` | Adjust `ratioCardH` ratio to match new target height |
| `src/scenes/BarnScene.ts` | Fix emoji scale (`setScale(2)` → proportional cap), refactor `createActionButtons()` to persist both buttons, add `revealSecondaryButton()`, hide action bar under overlays |
| `src/scenes/TradingPostScene.ts` | Refactor `layoutShopCard()` for three-zone hierarchy |
| `src/rendering/proceduralTextures.ts` | Texture generation picks up new `LAYOUT.SLOT` dimensions automatically (already references `LAYOUT.SLOT.WIDTH/HEIGHT`) |

---

## Definition of Done

1. **Card proportions**: Barn cards render at ~120x156 (±4px for responsive scaling). Visual aspect ratio ≈1:1.3 at 390x844.
2. **Emoji containment**: No animal emoji overflows its card bounds at any capacity (5–8) at 390x844.
3. **Button stability**: Action bar buttons do not change position, width, or count during a turn. The secondary button fades in after the first draw without displacing the primary.
4. **Shop readability**: Trading Post cards have a visible top (identity) / middle (cost) / bottom (details) structure. Name and cost are readable at 390x844.
5. **Overlay occlusion**: Night summary and bust overlays fully cover the action bar.
6. **Touch targets**: All interactive elements ≥44x44px. Button width 168px, height 56px. Shop card cells ≥170x140.
7. **No game logic changes**: `src/game/*` files have zero modifications.
8. **CI green**: `npm run ci` passes — typecheck, lint, format, unit tests, e2e, bundle budget.
9. **Visual validation**: Before/after Playwright screenshots at key states (empty barn, mid-draw 3 cards, full barn capacity 5, night summary, trading post animals tab).

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Larger cards push 3-row grids (capacity 7–8) below farmhouse | Medium | Medium | `getFarmhouseRect()` already computes dynamically from `slotsBottom`. Add fallback: if farmhouse overlaps action bar, hide farmhouse at capacity ≥7. |
| Card texture memory increase | Low | Low | Textures grow from 96x104 → 120x156 per variant (3 variants). Delta ~+24KB uncompressed GPU per variant. Negligible. |
| Button layout change breaks e2e selectors | Low | Medium | E2e tests use `data-phase` attributes and Playwright locators that don't depend on button count. Verify selectors after change. |
| Shop card height increase overflows grid area | Low | Low | `getShopGridPositions()` already clamps card height to fit between gridTop and capacityUpgrade button. Taller target just means the clamp kicks in with fewer items. |
| Responsive edge cases at cw=320 or cw=900+ | Medium | Low | `getSlotSize()` has explicit breakpoints. Test at 320x568 (iPhone SE) and 1024x768 (iPad landscape). |

---

## Security

No security implications. This sprint modifies only layout constants, procedural texture dimensions, and Phaser scene rendering code. No user input handling changes, no network calls, no DOM manipulation beyond existing `data-` attribute writes.

---

## Dependencies

- **Phaser 3.80.x**: All APIs used (`setDisplaySize`, `setScale`, `Container`, `BitmapText`, `Tween`) are stable in 3.80.
- **No new npm packages**.
- **No external images or assets** — all textures remain procedurally generated at boot.
- **Sprint 008 complete**: This sprint builds on shop card textures introduced in Sprint 008. Those texture keys (`SHOP_CARD_PARCHMENT`, etc.) must exist.

---

## Open Questions

1. **Capacity 7–8 at 390x844**: With 120x156 cards, 3 rows = 156*3 + 10*2 = 488px. Starting at y≈156, the grid bottom is y≈644. Action bar is at y≈758. That leaves 114px for the farmhouse. Current farmhouse is 116px tall — tight but fits. Should we shrink the farmhouse at high capacity, or accept the tight fit?
2. **Button label length**: "CALL IT A NIGHT" at 168px wide in bitmap font at 14px — verify it fits without truncation. If not, shorten to "END NIGHT."
3. **Card name wrapping**: `setMaxWidth()` on BitmapText will truncate rather than wrap. For long names like "Legendary Phoenix", should we reduce font or accept truncation?
4. **Deck stack repositioning**: With the wider card grid (384px vs 312px), the deck stack in the top-right has less horizontal clearance. Currently placed at `cw - margin - w`. Verify it doesn't overlap the rightmost card column at capacity 5+.
