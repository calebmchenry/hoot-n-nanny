# Sprint 008: Shop Card Visual Polish

## Overview

Three visual bugs make the Trading Post feel rough: card backgrounds are generated at barn-slot resolution (96x104) then stretched to shop-card size (~170x130+), emoji sprites scale beyond card bounds, and button press tweens conflict with `setDisplaySize()` causing visible resizing. This sprint generates dedicated shop-card textures at display resolution, constrains emoji within card geometry, and replaces the scale-based button feedback with a translate-only press effect.

## Use Cases

1. **Player browses shop** -- card backgrounds are crisp with visible rounded corners, paper grain, and parchment borders at every card size the layout produces.
2. **Player reads card info** -- emoji is fully contained within the card, never bleeding over edges or overlapping adjacent cards.
3. **Player taps a button** -- the button shifts down a few pixels on press and returns on release; it never changes size.
4. **Player resizes viewport** -- cards and buttons remain sharp because textures are generated at or above display resolution.
5. **Player enters barn** -- barn cards continue to render at 96x104 with no regressions.

## Architecture

### Texture strategy

Rather than stretch one small texture to many sizes, generate a second set of shop-specific card textures at a fixed resolution that covers the largest shop card the layout can produce. The layout clamps card height to 200px max and card width is derived from the 2-column grid on a 390px canvas, so the largest card is roughly 175x200. Generating shop textures at **176x200** gives a 1:1 or slight-downscale mapping for every real layout, keeping them sharp without wasting memory.

The barn cards keep their existing 96x104 textures. The shop textures are new keys (`TEXTURES.SHOP_CARD_PARCHMENT`, etc.) generated once in `BootScene`.

### Emoji containment

Instead of scaling emoji from their 128px source with an unbounded multiplier, compute a target display size that fits within the card, then use `setDisplaySize()` on the sprite. This avoids the scale-times-texture-size confusion and guarantees the emoji never exceeds a defined fraction of the card area. No Phaser masks or crops are needed.

### Button feedback

Replace the `scaleX`/`scaleY` tween with a pure Y-offset tween. The button image and label shift down 2-3px on pointerdown and return on release. No scale mutation means no conflict with `setDisplaySize()`. The `Back.Out` ease is removed to prevent overshoot.

## Implementation

### Phase 1 -- Shop card textures

**`src/config/constants.ts`**

Add shop card texture dimensions and keys:

```ts
// Inside LAYOUT, add:
SHOP_CARD: {
  TEX_WIDTH: 176,
  TEX_HEIGHT: 200,
},

// Inside TEXTURES, add:
SHOP_CARD_PARCHMENT: 'ui-shop-card-parchment',
SHOP_CARD_NOISY: 'ui-shop-card-noisy',
SHOP_CARD_LEGENDARY: 'ui-shop-card-legendary',
```

**`src/rendering/proceduralTextures.ts`**

Add three `generatePaperTexture()` calls at the end of `generateProceduralTextures()`, using the new shop card dimensions:

```ts
generatePaperTexture(
  scene,
  TEXTURES.SHOP_CARD_PARCHMENT,
  PALETTE.PARCHMENT,
  LAYOUT.SHOP_CARD.TEX_WIDTH,
  LAYOUT.SHOP_CARD.TEX_HEIGHT,
  'parchment',
);
generatePaperTexture(
  scene,
  TEXTURES.SHOP_CARD_NOISY,
  PALETTE.PARCHMENT,
  LAYOUT.SHOP_CARD.TEX_WIDTH,
  LAYOUT.SHOP_CARD.TEX_HEIGHT,
  'noisy',
);
generatePaperTexture(
  scene,
  TEXTURES.SHOP_CARD_LEGENDARY,
  0xf5e6b8,
  LAYOUT.SHOP_CARD.TEX_WIDTH,
  LAYOUT.SHOP_CARD.TEX_HEIGHT,
  'legendary',
);
```

The existing 96x104 calls remain for the barn.

**`src/scenes/TradingPostScene.ts`**

In `createShopCard()`, replace the texture key selection to use the shop-specific keys:

```ts
// Before (line ~500-506):
let bgTexture: string;
if (animalDef.tier === 'legendary') {
  bgTexture = TEXTURES.CARD_LEGENDARY;
} else if (item.noisy) {
  bgTexture = TEXTURES.CARD_NOISY;
} else {
  bgTexture = TEXTURES.CARD_PARCHMENT;
}

// After:
let bgTexture: string;
if (animalDef.tier === 'legendary') {
  bgTexture = TEXTURES.SHOP_CARD_LEGENDARY;
} else if (item.noisy) {
  bgTexture = TEXTURES.SHOP_CARD_NOISY;
} else {
  bgTexture = TEXTURES.SHOP_CARD_PARCHMENT;
}
```

### Phase 2 -- Emoji containment

**`src/scenes/TradingPostScene.ts`** -- `layoutShopCard()`

Replace the unbounded sprite scale calculation with a `setDisplaySize()` call that caps the emoji to a fraction of the card:

```ts
// Before (lines ~614-617):
const spriteScale = Math.max(1.4, Math.min(2.4, pos.h / 44));
cardView.sprite.setPosition(pos.w / 2, spriteY).setScale(spriteScale);

// After:
const maxEmojiW = Math.floor(pos.w * 0.5);
const maxEmojiH = Math.floor(pos.h * 0.3);
const emojiSize = Math.min(maxEmojiW, maxEmojiH);
cardView.sprite.setPosition(pos.w / 2, spriteY).setDisplaySize(emojiSize, emojiSize);
```

This keeps the emoji proportional to the card. At the baseline 170x130 card that gives roughly 39px display size -- recognizable but contained. At the max 175x200 card it yields 52x60, still well inside bounds.

### Phase 3 -- Button press feedback

**`src/scenes/TradingPostScene.ts`** -- `addButtonPressFeedback()`

Rewrite the method to only tween Y position, removing all `scaleX`/`scaleY` mutations:

```ts
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
    this.tweens.add({
      targets: button,
      y: baseY + PRESS_OFFSET,
      duration: 60,
      ease: 'Quad.Out',
    });
    this.tweens.add({
      targets: label,
      y: labelBaseY + PRESS_OFFSET,
      duration: 60,
      ease: 'Quad.Out',
    });
  });

  const release = (): void => {
    this.tweens.killTweensOf([button, label]);
    const baseY = Number(button.getData('baseY')) || button.y;
    const labelBaseY = Number(label.getData('baseY')) || label.y;
    this.tweens.add({
      targets: button,
      y: baseY,
      duration: 100,
      ease: 'Quad.Out',
    });
    this.tweens.add({
      targets: label,
      y: labelBaseY,
      duration: 100,
      ease: 'Quad.Out',
    });
  };

  button.on('pointerup', release);
  button.on('pointerout', release);
}
```

Key changes from the original:

- No `scaleX`/`scaleY` in any tween -- eliminates the conflict with `setDisplaySize()`.
- `Back.Out` ease replaced with `Quad.Out` to prevent overshoot.
- Press offset increased from 2 to 3px for slightly more visible tactile feedback without any size change.

## Files Summary

| File | Change |
|------|--------|
| `src/config/constants.ts` | Add `LAYOUT.SHOP_CARD` dimensions, three new `TEXTURES.SHOP_CARD_*` keys |
| `src/rendering/proceduralTextures.ts` | Three new `generatePaperTexture()` calls for shop card textures at 176x200 |
| `src/scenes/TradingPostScene.ts` | Use shop card texture keys, cap emoji via `setDisplaySize()`, rewrite button feedback to Y-only |
| `src/scenes/BootScene.ts` | No changes needed (textures generated via `generateProceduralTextures` already called there) |
| `src/scenes/tradingPostLayout.ts` | No changes needed (layout math is correct; textures were the issue) |

## Definition of Done

- [ ] Shop card backgrounds render with crisp rounded corners, grain, and borders at every layout size
- [ ] Switching between Animals and Legendary tabs shows correct card variant textures
- [ ] No emoji extends beyond card edges on either tab
- [ ] Tapping any button (tabs, capacity upgrade, start night) produces a downward shift with no visible size change
- [ ] Barn scene cards still render at 96x104 with no visual regression
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` produces app chunk < 100KB gzipped
- [ ] `npm run ci` passes

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Three extra 176x200 canvas textures increase memory | Low | Low | Adds ~210 KB uncompressed across 3 textures. Phaser already holds dozens of canvas textures; this is marginal. |
| Emoji `setDisplaySize()` looks too small on large cards | Medium | Low | The 50% width / 30% height cap can be tuned. If cards feel empty, increase the cap to 60%/40% in a follow-up. |
| Removing scale feedback makes buttons feel unresponsive | Low | Low | The 3px Y-shift is standard mobile press feedback. If insufficiently tactile, a brief tint darkening can be added as a secondary cue. |
| Shop card textures cached at fixed 176x200 look slightly downscaled on very small card layouts | Low | Low | Downscaling a larger texture stays sharp; stretching a small one does not. This is the correct tradeoff. |
| Paper texture procedural generation is slow for larger canvas | Low | Low | `generatePaperTexture` runs once at boot. 176x200 is still small; boot time increase is negligible. |

## Security

No user input is processed. All textures are procedurally generated from hardcoded constants. No network calls, no dynamic code execution, no localStorage changes. No security implications.

## Dependencies

- No new npm packages.
- No changes to `src/game/*`.
- Depends on `generatePaperTexture()` supporting arbitrary dimensions, which it already does (it takes `width` and `height` parameters).

## Open Questions

1. **Should the shop card texture size be driven by layout constants or hardcoded?** This draft hardcodes 176x200 based on current max layout output. An alternative is to compute the max card size from `tradingPostLayout.ts` at boot and generate textures dynamically, but that couples boot-time texture generation to layout math and adds complexity for minimal benefit.
2. **Should emoji use a Phaser mask/crop instead of size capping?** A `BitmapMask` on each card container would clip any overflow, but masks are expensive per-card on mobile GPUs. The `setDisplaySize()` approach avoids GPU cost entirely and is sufficient since we control the emoji source size.
3. **Should the barn also adopt larger textures?** The barn slots are close to the 96x104 texture size, so stretching is minimal there. This sprint intentionally leaves barn textures alone to avoid unnecessary risk. If barn cards are later resized, the same pattern (dedicated texture keys at display resolution) applies.
4. **Is 3px press offset enough feedback?** If playtesting shows buttons feel dead, a complementary approach is to add `button.setTint(0xdddddd)` on press and `button.clearTint()` on release, giving a slight darken without any geometry change.
