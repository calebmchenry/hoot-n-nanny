# Sprint 009: Tarot Cards, Stable Draw Button, Readable Shop

## Overview

Cards don't look like cards — they're 96x104 near-square tokens with overflowing emoji and illegible labels. The action bar destabilises when a single wide button splits into two narrow buttons mid-turn. Trading Post shop cells cram 6+ data points into tiny rectangles. This sprint addresses three core problems: **cards should look and feel like real tarot-style cards** (~1:1.8 proportions), **the DRAW button should be the sole dominant bottom action** (with End Night as a small persistent element at the top), and **the shop should have larger, scannable 2-column cards**.

**Approach**: Resize barn card slots to ~106x190 (tarot 1:1.8), contain emoji within padded bounds, replace the metamorphosing dual-button bar with a single persistent DRAW button at the bottom + a small "End Night" element near the resource banner, enlarge shop cards to ~170x190 within the existing 2-column grid, and shrink the farmhouse significantly. No game logic changes. `src/game/*` untouched.

Scope: ~7 files modified, 0 new files. Estimated ~300 net lines changed.

---

## Use Cases

1. **Real tarot-style cards in the barn** — Player draws an animal and sees a tall card (~1:1.8 ratio) with a visible parchment background, drop shadow, centered emoji that never overflows, and a legible name below. Cards take up meaningful screen width (~27% each, 82% for the 3-column grid).
2. **Stable DRAW button** — The DRAW button occupies the full bottom action bar and never moves, shrinks, or splits. After the first draw, tapping it draws another animal. No layout shift ever.
3. **Persistent End Night option** — "End Night" appears as a small, persistent button near the resource banner at the top of the screen after the first draw. It's always reachable but never competes with DRAW for visual dominance.
4. **Scannable shop cards** — Trading Post cards are taller (~170x190 within the 2-column grid) with clear visual hierarchy: large emoji + name at top, cost in the middle, stats/ability at the bottom. Cards look like actual cards, not data cells.
5. **Clean overlays** — Night summary and bust overlays fully occlude the underlying action bar and buttons.
6. **No regressions** — Touch targets ≥44px. Bundle budget holds. CI passes. Validator "Beautiful" and "Ergonomic" checks improve.

---

## Architecture

### Card Proportions: Tarot-style ~106x190

Current barn slots are 96x104 — nearly square, reading as "token." Tarot cards are ~1:1.8. At 106px wide, that gives 190px tall.

**Vertical budget at 390x844 (capacity 5, 2 rows):**
```
Resource banner + noise meter:  y=0 → y~114
End Night button area:          y~120 → y~150  (30px)
Slot grid:                      y~156 → y~546  (190*2 + 12 gap = 392px)
Farmhouse (shrunk):             y~560 → y~640  (80px, down from 116px)
Action bar:                     y~758 → y~814  (56px)
```
This fits comfortably with breathing room between each zone.

**Vertical budget at capacity 7–8 (3 rows):**
```
Resource banner + noise meter:  y=0 → y~114
End Night button:               y~120 → y~150
Slot grid:                      y~150 → y~740  (190*3 + 10*2 gap = 590px)
[Farmhouse hidden]
Action bar:                     y~758 → y~814
```
3 rows fit tightly (18px clearance to action bar). Farmhouse is hidden at capacity ≥7. Row gap compressed from 14→10 at capacity ≥7.

**Grid width:** 106*3 + 12*2 = 342px → centered in 390px canvas with 24px margins each side. This eliminates the vast dead space flanking the current 312px grid.

**Texture regeneration:** Barn card textures (`CARD_PARCHMENT`, `CARD_NOISY`, `CARD_LEGENDARY`) regenerated at 106x190. Shadow texture likewise. Shop textures already at 170x200 — no change needed.

### Button Architecture: Single DRAW + Top End Night

Current approach destroys and recreates buttons when switching between 1 and 2 buttons, causing position/size jumps.

**New approach:**
- **DRAW button**: Always occupies the full-width bottom action bar (`cw - 40` wide, 56px tall, y = ch - 86). It starts as "DRAW ANIMAL". After the first draw, its label changes to "KEEP GOING" but it stays in place. It never moves, shrinks, or disappears during gameplay.
- **End Night button**: A small secondary button (120x36px) positioned in the HUD area near the resource banner. It starts invisible and fades in (180ms) after the first draw. It uses `BUTTON_SECONDARY` texture and subdued styling. Position: right-aligned, y ≈ between noise meter and slot grid start.
- **`getActionBarPosition()`** always returns a single primary rect (never null secondary). The `dualButtons` parameter is removed.
- **`getEndNightPosition()`** — new function returning the small top button rect.

This eliminates the destroy/recreate cycle, all positional jumps, and the confusing button split.

### Shop Cards: Taller 2-Column Grid

Current shop cards are 170x108 — wider than tall, the opposite of card proportions. The textures are already generated at 170x200.

**New approach:**
- Increase `LAYOUT.SHOP.CARD_HEIGHT` from 108 → 190
- Cards rendered at 170x190 within the existing 2-column grid
- Visual hierarchy within each card:
  ```
  ┌─────────────────┐
  │                  │
  │     🐱 emoji     │  Top 40%: Large emoji, centered
  │                  │
  │    Barn Cat      │  Name below emoji, 12px font
  ├──────────────────┤
  │  💎3   +2M  +1H  │  Middle: Cost left, yields right
  ├──────────────────┤
  │   Early Bird     │  Bottom: Ability label
  │      x2          │  Stock count
  └─────────────────┘
  ```
- With taller cards, the grid shows ~3 rows visible (190*3 + 10*2 = 590px fits in the ~640px available between header and bottom buttons). Scrolling handles overflow.

### Farmhouse: Shrink Significantly

- Reduce farmhouse to ~60% of current size: width 85px (from 142px), height 70px (from 116px)
- At capacity 5–6: visible but small, tucked below the card grid
- At capacity ≥7: hidden entirely (cards need the vertical space)
- Window glow animation preserved at smaller scale

### Overlay Occlusion Fix

Current overlay bottom = y + h = 120 + 580 = 700. Action bar is at y=758. Gap of 58px lets buttons show through.

Fix: Extend `getOverlayBounds()` bottom margin from 144→60 (in reference coords), pushing the overlay bottom to ~784, fully covering the action bar. Belt-and-suspenders: also hide action buttons when overlays are shown.

---

## Implementation

### Phase 1: Card Dimensions & Textures (~25% of effort)

**`src/config/constants.ts`:**
- Update `LAYOUT.SLOT`:
  ```typescript
  SLOT: {
    WIDTH: 106,
    HEIGHT: 190,
    GAP: 12,
    COLUMNS: 3,
    START_Y: 156,
    ROW_GAP: 12,
    MAX_ROWS: 3,
  },
  ```
- Update `LAYOUT.FARMHOUSE` to reduced size:
  ```typescript
  FARMHOUSE: {
    X: 24,
    Y: 560,
    WIDTH: 85,
    HEIGHT: 70,
    WINDOW: {
      WIDTH: 20,
      HEIGHT: 14,
      OFFSET_X: 32,
      OFFSET_Y: 17,
    },
  },
  ```
- Update `LAYOUT.SHOP.CARD_HEIGHT` from 108 → 190
- Add `LAYOUT.END_NIGHT_BUTTON`:
  ```typescript
  END_NIGHT_BUTTON: {
    WIDTH: 120,
    HEIGHT: 36,
  },
  ```

**`src/rendering/proceduralTextures.ts`:**
- Barn card textures pick up new `LAYOUT.SLOT.WIDTH/HEIGHT` (106x190) automatically if they already reference the constants. Verify and fix any hardcoded 96/104 values.
- Generate card shadow at new dimensions.
- Add a small button texture variant for End Night if needed (or reuse `BUTTON_SECONDARY` scaled down).

**`src/scenes/BootScene.ts`:**
- Verify emoji texture generation (128x128) is unchanged — emoji scale will be handled proportionally in the scene.

### Phase 2: Barn Layout & Button Stability (~30% of effort)

**`src/scenes/barnLayout.ts`:**

Update `getSlotSize()`:
```typescript
const getSlotSize = (cw: number, ch: number): { w: number; h: number } => {
  if (cw >= 700) {
    return { w: 130, h: 234 };  // 1:1.8 for desktop
  }
  if (cw >= 420 || ch >= 820) {
    return { w: 106, h: 190 };  // 1:1.8 baseline
  }
  return { w: 88, h: 158 };     // 1:1.8 for small screens
};
```

Update `getActionBarPosition()` — always return single full-width button:
```typescript
export const getActionBarPosition = (
  _capacity: number,
  _dualButtons: boolean,  // kept for signature compat, ignored
  cw: number,
  ch: number,
): ActionBarLayout => {
  const y = round(ch - 86);
  const h = 56;
  const x = 20;
  const w = Math.max(LAYOUT.TAP_TARGET_MIN, cw - 40);
  return {
    primary: toRect(x, y, w, h),
    secondary: null,  // no longer used at bottom
  };
};
```

Add `getEndNightPosition()`:
```typescript
export const getEndNightPosition = (capacity: number, cw: number, ch: number): Rect => {
  const noise = getNoiseMeterPosition(capacity, cw, ch);
  const w = LAYOUT.END_NIGHT_BUTTON.WIDTH;
  const h = LAYOUT.END_NIGHT_BUTTON.HEIGHT;
  const x = cw - round((20 / REF_W) * cw) - w;  // right-aligned
  const y = noise.y + round((noise.h - h) / 2);  // vertically centered with noise meter
  return toRect(x, y, w, h);
};
```

Update `getFarmhouseRect()`:
- Use new smaller `LAYOUT.FARMHOUSE` dimensions
- At capacity ≥7, return a rect with `w: 0, h: 0` (scene checks this to skip rendering)

Update `getSlotLayout()`:
- Compress `rowGap` to 10 at capacity ≥7 (from current 14→8 conditional)
- Raise `topY` slightly for capacity ≥7 to use space freed by End Night being in the HUD area

Update `getOverlayBounds()`:
- Reduce bottom margin: `const bottom = round((60 / REF_H) * ch)` (was 144)
- This extends overlay to y≈784, covering the action bar

**`src/scenes/BarnScene.ts`:**

Refactor `createActionButtons()`:
- Always create one DRAW button at full bottom width. Label starts as "DRAW ANIMAL".
- Create a separate End Night button at the position from `getEndNightPosition()`. Starts at `alpha=0`, `removeInteractive()`.
- After first draw: update DRAW label to "KEEP GOING", fade in End Night button (180ms, `Quad.Out`).
- End Night button uses `BUTTON_SECONDARY` texture, smaller font.
- Remove all `this.primaryButton.destroy()` / `this.secondaryButton.destroy()` patterns.
- Add `revealEndNightButton()` and `hideEndNightButton()` methods.

Fix emoji scale in `renderCardInSlot()`:
```typescript
const maxEmojiSize = Math.min(slot.w, slot.h) * 0.38;
const spriteScale = maxEmojiSize / 128;
sprite.setScale(spriteScale);
```
At 106x190, `maxEmojiSize = 106 * 0.38 ≈ 40px`. The emoji renders at 40px — well within bounds.

Increase card name font: `scaledFont(12, ch)` (from 10).

Position emoji at `slot.y + slot.h * 0.35` (upper portion of taller card).
Position name at `slot.y + slot.h * 0.70`.
Position resource badges at `slot.y + slot.h * 0.85`.

In `showNightSummaryOverlay()` and `showBustOverlay()`:
- Call `hideActionBar()` before displaying overlay
- Call `showActionBar()` on dismissal

### Phase 3: Shop Card Polish (~25% of effort)

**`src/scenes/tradingPostLayout.ts`:**
- Update `getShopGridPositions()` to use the new `CARD_HEIGHT` (190). The existing clamp logic (`clamp(ratioH, 80, 200)`) accommodates 190.
- Adjust the `ratioCardH` computation: `cardW * (190/170)` to match the new target height at reference width.

**`src/scenes/TradingPostScene.ts`:**
- Refactor `layoutShopCard()` for the taller card:
  - **Top zone (0–45%)**: Emoji centered at `pos.h * 0.25`, scaled to `min(pos.w, pos.h) * 0.35 / 128`. Name at `pos.h * 0.48`, font 11px.
  - **Middle zone (45–65%)**: Cost badge at left (`8, pos.h * 0.55`). Yield values (+M, +H) at right of same row.
  - **Bottom zone (65–100%)**: Ability label centered at `pos.h * 0.75`, font 10px. Stock count `xN` at `pos.h * 0.88`.
- Star badge for legendary stays in top-right corner.
- `setMaxWidth(pos.w - 16)` on name text for padding.
- The 2-column, 10px-gap layout stays. Scrolling is already handled by the existing scroll region logic.

### Phase 4: Polish & Verification (~20% of effort)

**Font legibility pass:**
- Barn card names: `scaledFont(12, ch)` (was 10)
- Barn resource badges on cards: `scaledFont(10, ch)` (was 8)
- Shop card names: `scaledFont(11, ch)`
- End Night button: `scaledFont(11, ch)`

**Farmhouse at high capacity:**
- In `BarnScene`, check `getFarmhouseRect()` dimensions. If `w === 0` or `h === 0`, skip farmhouse and window glow rendering entirely.

**Deck stack verification:**
- At 390px canvas, the 3-column grid (342px) leaves 48px on the right. The deck stack (64px wide) is positioned at `cw - margin - w = 390 - 20 - 64 = 306`. The rightmost card column starts at `(390-342)/2 + 106*2 + 12*2 = 24 + 236 = 260`, ends at `260 + 106 = 366`. Deck at x=306 overlaps card column by 60px.
- **Fix**: Reposition deck stack above the card grid (y ≈ noise meter row) rather than beside it. Or shrink deck width to 48px and position at `cw - 12 - 48 = 330`.
- Best approach: move deck to align with noise meter row, right-aligned. `getDeckStackPosition()` already places it near this area — verify it doesn't overlap at new card sizes.

**Playwright screenshots:**
- Capture before/after at: empty barn (capacity 5), mid-draw (3 animals), full barn, night summary, trading post (animals tab, legendary tab).
- Compare visually for card proportions, emoji containment, button stability, overlay occlusion.

**Validator integration:**
- Run `npm run bot` in the `hoot-n-nanny-validator` project after deployment to verify the "Beautiful" and "Ergonomic" quality checks against the updated UI.

---

## Files Summary

| File | Changes |
|------|---------|
| `src/config/constants.ts` | Update `LAYOUT.SLOT` to 106x190, `LAYOUT.FARMHOUSE` to 85x70, `LAYOUT.SHOP.CARD_HEIGHT` to 190, add `LAYOUT.END_NIGHT_BUTTON` |
| `src/scenes/barnLayout.ts` | Enlarge `getSlotSize()` to 1:1.8 ratios, add `getEndNightPosition()`, simplify `getActionBarPosition()` to always-single, extend `getOverlayBounds()`, shrink `getFarmhouseRect()`, hide farmhouse at capacity ≥7 |
| `src/scenes/tradingPostLayout.ts` | Adjust `ratioCardH` for taller shop cards |
| `src/scenes/BarnScene.ts` | Fix emoji scale (proportional cap), refactor to single DRAW button + top End Night, add `revealEndNightButton()`/`hideEndNightButton()`, hide action bar under overlays, adjust card element positions for taller cards |
| `src/scenes/TradingPostScene.ts` | Refactor `layoutShopCard()` for taller cards with visual hierarchy zones |
| `src/rendering/proceduralTextures.ts` | Verify barn card textures use `LAYOUT.SLOT` dimensions (fix any hardcoded 96/104) |
| `src/scenes/BootScene.ts` | Verify texture generation picks up new dimensions |

---

## Definition of Done

1. **Card proportions**: Barn cards render at ~106x190 (1:1.8 tarot ratio, ±4px for responsive scaling).
2. **Emoji containment**: No animal emoji overflows its card bounds at any capacity (5–8) at 390x844.
3. **DRAW button stability**: The DRAW button occupies the full bottom action bar at all times. It never moves, shrinks, or splits. Label changes to "KEEP GOING" after first draw.
4. **End Night positioning**: "End Night" appears as a small button near the resource banner (top area) after first draw. It fades in smoothly and never displaces other elements.
5. **Farmhouse shrunk**: Farmhouse is visibly smaller (~60% of original). Hidden entirely at capacity ≥7.
6. **Shop readability**: Trading Post cards are ~170x190 with visible top (emoji+name) / middle (cost) / bottom (ability+stock) hierarchy. Name and cost readable at 390x844.
7. **Overlay occlusion**: Night summary and bust overlays fully cover the action bar and all buttons beneath.
8. **Touch targets**: All interactive elements ≥44x44px. DRAW button: full width × 56px. End Night: 120×36px (≥44px constraint may require height bump to 44px — verify). Shop cards: 170×190.
9. **No game logic changes**: `src/game/*` files have zero modifications.
10. **CI green**: `npm run ci` passes — typecheck, lint, format, unit tests, e2e, bundle budget.
11. **Visual validation**: Before/after Playwright screenshots at key states (empty barn, mid-draw 3 cards, full barn capacity 5 and capacity 8, night summary, trading post both tabs).
12. **Validator check**: Run hoot-n-nanny-validator bot and confirm "Beautiful" and "Ergonomic" quality checks show improvement.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 3-row grid (capacity 7–8) tight vertical fit | High | Medium | Compress rowGap to 10, raise topY slightly, hide farmhouse. 18px clearance to action bar is tight but workable. If insufficient, reduce card height to 180 at capacity ≥7. |
| Deck stack overlaps wider card grid | Medium | Medium | Verify `getDeckStackPosition()` at new sizes. If overlap, shrink deck or move it above the card grid aligned with noise meter. |
| End Night button collides with HUD elements | Medium | Low | Position relative to noise meter. Verify against resource banner at all viewport sizes. If collision, move to right of noise meter row. |
| Card name truncation with BitmapText | Low | Low | `setMaxWidth()` truncates at card width - 16px. Long names like "Legendary Phoenix" may truncate. Acceptable — truncation is better than overflow. Could also reduce font for long names. |
| End Night button height (36px) below 44px tap target minimum | Medium | Medium | If testing reveals miss-taps, increase to 44px. The 36px height is a starting point for visual proportion — tap target can have invisible padding. |
| Shop card scroll regression | Low | Low | Taller cards mean fewer visible at once. Existing scroll logic handles this. Test with full animal roster (12+ items). |
| E2e tests break due to button layout change | Low | Medium | E2e tests use `data-phase` attributes and `window.__GAME_READY__`. Button count/position changes shouldn't affect these. Run full e2e suite. |

---

## Security

No security implications. This sprint modifies only layout constants, procedural texture dimensions, and Phaser scene rendering code. No user input handling changes, no network calls, no DOM manipulation beyond existing `data-` attribute writes.

---

## Dependencies

- **Phaser 3.80.x**: All APIs used (`setDisplaySize`, `setScale`, `setAlpha`, `BitmapText`, `Tween`) are stable.
- **No new npm packages**.
- **No external images** — all textures remain procedurally generated at boot.
- **Sprint 008 complete**: Builds on shop card textures (`SHOP_CARD_PARCHMENT`, etc.) from Sprint 008.
- **hoot-n-nanny-validator**: Used for verification (not a build dependency). Must have coordinates updated if slot positions change significantly.

---

## Open Questions

1. **End Night button height**: 36px fits visually but is below the 44px tap target minimum. Options: (a) bump to 44px, (b) keep 36px visual size but add invisible tap padding via `setInteractive({ hitArea: ... })`. Recommend (b).
2. **Deck stack repositioning**: The wider card grid may push the deck stack into overlap territory. If so, should the deck move above the grid (aligned with noise meter) or shrink to fit in the margin?
3. **Capacity-adaptive card sizing**: Should cards shrink slightly at capacity 7–8 (e.g., 100x180 instead of 106x190) to give more breathing room, or should the tight 18px clearance be accepted?
4. **Validator coordinate update**: The hoot-n-nanny-validator hardcodes slot positions in `coordinates.ts`. These will drift after this sprint. Should we update validator coordinates as part of this sprint or defer?
