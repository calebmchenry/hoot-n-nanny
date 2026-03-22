# Sprint 008: Card Shop Visual Polish

## Overview

Three visual bugs in the Trading Post shop: (1) card background textures are generated at barn-slot size (96x104) but stretched to shop-card size (~170x130+), producing blurry parchment; (2) emoji sprites scale up to 2.4x on 128px textures, overflowing card bounds; (3) button and card press feedback tweens `scaleX`/`scaleY` which conflicts with `setDisplaySize()`, causing visible resize on tap.

**Approach**: Generate a second set of card textures at shop-card resolution, cap emoji scale to fit within card padding, and replace all scale-based feedback tweens with translate + tint. Barn scene textures untouched.

Scope: ~3 files modified, 0 new files. No game logic changes. `src/game/*` untouched.

---

## Use Cases

1. **Crisp shop cards** — Player opens Trading Post and sees cards with sharp rounded corners, visible paper grain, and clean borders at their displayed size. Cards look like actual cards, not stretched rectangles.
2. **Contained emoji** — Animal emoji are fully within card bounds on both Animals and Legendary tabs at any viewport size.
3. **Stable button press** — Player taps tab buttons, capacity upgrade, or Start Night. Buttons give subtle positional + tint feedback without changing size.
4. **Stable card interactions** — Mobile card-tap preview and purchase animation use tint/translate feedback, not scale. No resize artifacts.
5. **Barn unaffected** — Barn scene cards continue rendering at 96x104 with zero regressions.

---

## Architecture

### Texture Strategy: Generate at shop size once at boot

Three approaches were considered:

1. **Dynamic per-layout generation** — Regenerate textures on every resize at exact card dimensions. Rejected: `generatePaperTexture` does multi-pass canvas drawing (mottling, grain, gradients). Too expensive to run on resize.
2. **Nine-Slice** — Phaser 3.80 supports `NineSlice`, but card textures have complex full-surface effects (radial gradients, scattered mottles, grain lines) that don't tile gracefully. Rejected.
3. **Generate at shop size once** (chosen) — Call `generatePaperTexture` a second time with shop-specific texture keys at 170x200 (the maximum card size from the layout clamp). Memory cost: three additional canvas textures (~540KB uncompressed GPU). The shop scene uses shop-sized keys; the barn scene continues using slot-sized keys. Always downscaling, never upscaling.

### Emoji Containment: Proportional scale cap

Cap the sprite scale so the displayed emoji fits within card padding: `min(w, h) * 0.38 / 128`. No container masks needed. The emoji is proportional to the card at any viewport size.

### Feedback: Translate + tint (no scale)

Replace all `scaleX`/`scaleY` tweens (buttons, mobile card tap, purchase) with tweened y-translate + `setTint()`/`clearTint()`. Position tweens are safe with `setDisplaySize()`. The `Back.Out` ease is replaced with `Quad.Out` to prevent overshoot.

---

## Implementation

### Phase 1: Generate Shop-Sized Card Textures (~30% of effort)

**`src/config/constants.ts`:**
- Add `LAYOUT.SHOP_CARD` object:
  ```typescript
  SHOP_CARD: {
    TEX_WIDTH: 170,
    TEX_HEIGHT: 200,
  },
  ```
- Add three new texture keys to `TEXTURES`:
  ```typescript
  SHOP_CARD_PARCHMENT: 'ui-shop-card-parchment',
  SHOP_CARD_NOISY: 'ui-shop-card-noisy',
  SHOP_CARD_LEGENDARY: 'ui-shop-card-legendary',
  ```

**`src/rendering/proceduralTextures.ts`:**
- In `generateProceduralTextures()`, add three `generatePaperTexture()` calls after the existing barn-sized ones:
  ```typescript
  generatePaperTexture(scene, TEXTURES.SHOP_CARD_PARCHMENT, PALETTE.PARCHMENT,
    LAYOUT.SHOP_CARD.TEX_WIDTH, LAYOUT.SHOP_CARD.TEX_HEIGHT, 'parchment');
  generatePaperTexture(scene, TEXTURES.SHOP_CARD_NOISY, PALETTE.PARCHMENT,
    LAYOUT.SHOP_CARD.TEX_WIDTH, LAYOUT.SHOP_CARD.TEX_HEIGHT, 'noisy');
  generatePaperTexture(scene, TEXTURES.SHOP_CARD_LEGENDARY, 0xf5e6b8,
    LAYOUT.SHOP_CARD.TEX_WIDTH, LAYOUT.SHOP_CARD.TEX_HEIGHT, 'legendary');
  ```
- Existing 96x104 calls remain for the barn.

**`src/scenes/TradingPostScene.ts`:**
- In `createShopCard()`, change texture key selection:
  ```typescript
  if (animalDef.tier === 'legendary') {
    bgTexture = TEXTURES.SHOP_CARD_LEGENDARY;
  } else if (item.noisy) {
    bgTexture = TEXTURES.SHOP_CARD_NOISY;
  } else {
    bgTexture = TEXTURES.SHOP_CARD_PARCHMENT;
  }
  ```

### Phase 2: Contain Emoji Within Card Bounds (~20% of effort)

**`src/scenes/TradingPostScene.ts` — `layoutShopCard()`:**
- Replace the sprite scale formula:
  ```typescript
  // Before:
  const spriteScale = Math.max(1.4, Math.min(2.4, pos.h / 44));
  cardView.sprite.setPosition(pos.w / 2, spriteY).setScale(spriteScale);

  // After:
  const maxEmojiSize = Math.min(pos.w, pos.h) * 0.38;
  const spriteScale = maxEmojiSize / 128;
  cardView.sprite.setPosition(pos.w / 2, spriteY).setScale(spriteScale);
  ```
- For a typical 170x130 card: `130 * 0.38 / 128 ≈ 0.39` → ~49px display size
- For max 170x200 card: `170 * 0.38 / 128 ≈ 0.50` → ~65px display size
- Emoji is always contained with room for name text below and stats at bottom

### Phase 3: Fix All Scale-Based Feedback (~50% of effort)

**`src/scenes/TradingPostScene.ts` — `addButtonPressFeedback()`:**

Rewrite to remove all `scaleX`/`scaleY` tweens, use translate + tint:

```typescript
private addButtonPressFeedback(
  button: Phaser.GameObjects.Image,
  label: Phaser.GameObjects.BitmapText,
): void {
  if (button.getData('feedback-bound') === true) {
    return;
  }
  button.setData('feedback-bound', true);
  button.setData('baseY', button.y);
  label.setData('baseY', label.y);

  const PRESS_OFFSET = 3;

  button.on('pointerdown', () => {
    if (!button.input?.enabled) {
      return;
    }
    this.tweens.killTweensOf([button, label]);
    const baseY = Number(button.getData('baseY')) || button.y;
    const labelBaseY = Number(label.getData('baseY')) || label.y;
    button.setTint(0xdddddd);
    this.tweens.add({
      targets: button, y: baseY + PRESS_OFFSET, duration: 60, ease: 'Quad.Out',
    });
    this.tweens.add({
      targets: label, y: labelBaseY + PRESS_OFFSET, duration: 60, ease: 'Quad.Out',
    });
  });

  const release = (): void => {
    this.tweens.killTweensOf([button, label]);
    const baseY = Number(button.getData('baseY')) || button.y;
    const labelBaseY = Number(label.getData('baseY')) || label.y;
    button.clearTint();
    this.tweens.add({
      targets: button, y: baseY, duration: 100, ease: 'Quad.Out',
    });
    this.tweens.add({
      targets: label, y: labelBaseY, duration: 100, ease: 'Quad.Out',
    });
  };

  button.on('pointerup', release);
  button.on('pointerout', release);
}
```

**`src/scenes/TradingPostScene.ts` — `handleMobileCardTap()`:**

Replace the scale pulse fallback (when no tooltip is shown):

```typescript
// Before:
this.tweens.add({
  targets: cardView.container,
  scaleX: 1.04, scaleY: 1.04,
  duration: 80, yoyo: true, ease: 'Quad.Out',
});

// After:
cardView.bg.setTint(0xeeeeee);
this.time.delayedCall(120, () => {
  cardView.bg.clearTint();
});
```

**`src/scenes/TradingPostScene.ts` — `onPurchase()`:**

Replace the scale bounce with a translate yoyo:

```typescript
// Before:
this.tweens.add({
  targets: container,
  scaleX: 1.08, scaleY: 1.08,
  duration: ANIMATION.PURCHASE_FEEDBACK_MS / 2,
  yoyo: true, ease: 'Quad.easeOut',
  onComplete: () => { this.refreshDisplay(); },
});

// After:
const baseY = container.y;
this.tweens.add({
  targets: container,
  y: baseY - 4,
  duration: ANIMATION.PURCHASE_FEEDBACK_MS / 2,
  yoyo: true,
  ease: 'Quad.easeOut',
  onComplete: () => {
    container.y = baseY;
    this.refreshDisplay();
  },
});
```

---

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/config/constants.ts` | Modify | Add `LAYOUT.SHOP_CARD` (TEX_WIDTH/HEIGHT), add 3 `TEXTURES.SHOP_CARD_*` keys |
| `src/rendering/proceduralTextures.ts` | Modify | Add 3 `generatePaperTexture()` calls for shop-sized card textures at 170x200 |
| `src/scenes/TradingPostScene.ts` | Modify | Use shop texture keys in `createShopCard`, cap emoji scale in `layoutShopCard`, rewrite `addButtonPressFeedback` to translate+tint, replace scale tweens in `handleMobileCardTap` and `onPurchase` |
| `src/scenes/tradingPostLayout.ts` | No change | Layout math is correct; the issue was texture size |
| `src/scenes/BootScene.ts` | No change | Emoji textures are fine (128px from Sprint 007) |
| `src/scenes/BarnScene.ts` | No change | Uses original 96x104 textures at native slot size |
| `src/game/*` | **Untouched** | No game logic changes |

---

## Definition of Done

1. Shop card backgrounds have crisp rounded corners, paper grain, and borders at their displayed size — no blurriness from texture stretching
2. Emoji sprites are fully contained within card bounds on both Animals and Legendary tabs at 390x844 reference viewport
3. Emoji sprites remain contained at all viewport sizes within the Phaser FIT scaling range
4. Buttons (tab buttons, capacity upgrade, Start Next Night) do not visually change size on press — feedback is translate + tint only
5. Mobile card-tap preview does not scale the card — uses tint flash
6. Purchase animation does not scale the card — uses translate yoyo
7. No `Back.Out` ease overshoot on any interaction
8. Barn scene card rendering is unchanged — visual diff is zero
9. `npm run ci` passes (typecheck, lint, tests, build, budget)
10. App chunk remains < 100KB gzipped
11. `src/game/*` has zero changes

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Extra shop textures increase memory usage | Low | Low | Three 170x200 canvas textures add ~540KB uncompressed to GPU memory. Negligible on any device that runs Phaser. |
| Emoji too small after scale fix | Low | Medium | 0.38 factor gives ~49px on a 130px-tall card. If too small, increase to 0.42. Easy to tune. |
| Tint+translate feedback feels different | Low | Low | Standard mobile press pattern. More consistent than the current broken scale feedback. |
| Paper texture corner radius looks proportionally smaller at 170x200 | Low | Low | 10px radius at 170x200 actually looks *more* card-like (physical cards have tight radii relative to size). No change needed. |
| Purchase translate yoyo looks too subtle | Low | Low | 4px upward bounce with yoyo is visible. If too subtle, increase to 6px or add tint. |

---

## Security

No security implications. No network calls, no user input handling changes, no new dependencies. All changes are purely visual.

---

## Dependencies

- No new npm dependencies
- No new files created
- Depends on `generatePaperTexture()` accepting arbitrary width/height (it does)
- Depends on Sprint 007's 128px emoji textures and 2-column shop layout (already merged)

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|-----------|
| Texture size? | **170x200** — covers full height clamp, always downscales |
| Button feedback style? | **Tweened translate + tint** — polished feel, no scale |
| Fix scope? | **All scale tweens** — buttons, mobile card tap, purchase |
| Emoji containment approach? | **Proportional scale cap** (`min(w,h) * 0.38 / 128`) — no masks needed |
| Corner radius scaling? | **No change** — 10px at 170x200 looks naturally card-like |
