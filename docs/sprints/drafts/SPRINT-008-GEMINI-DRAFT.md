# Sprint 008 — Card Shop Visual Polish

## Overview

Three visual bugs in the Trading Post shop: (1) card background textures are
generated at barn-slot size (96x104) but stretched to shop-card size (~170x130+),
producing blurry parchment; (2) emoji sprites scale up to 2.4x on 128px
textures, overflowing card bounds; (3) button press feedback tweens
`scaleX`/`scaleY` which conflicts with `setDisplaySize()`, causing visible
resize on tap.

**Approach**: generate a second set of card textures at shop-card resolution,
cap emoji scale to fit within card padding, and replace scale tweens with
alpha/tint feedback. This keeps the barn scene textures untouched and avoids
fragile runtime clipping.

**Scope**: ~3 files modified, 0 new files. No game logic changes. `src/game/*`
is completely untouched. No new npm dependencies.

## Use Cases

1. **Player browses shop** -- card backgrounds are crisp with visible rounded
   corners, paper grain, and border details at their displayed size. No blurry
   stretching.

2. **Player views animals** -- emoji sprites are fully contained within card
   bounds on both Animals and Legendary tabs, at any viewport size within the
   supported range.

3. **Player taps any button** -- buttons provide tactile feedback (brief tint
   flash + subtle y-translate) without changing size. No overshoot. Works
   identically for tab buttons, capacity upgrade, and start night.

4. **Player uses barn scene** -- barn cards continue rendering at 96x104 with
   no visual regressions. The original textures remain unchanged.

5. **Player resizes viewport** -- shop cards remain crisp because the texture
   matches the display size. No re-stretching artifacts.

## Architecture

### Decision: Separate shop-sized textures (not dynamic, not Nine-Slice)

Three approaches were considered:

1. **Dynamic per-layout generation**: generate textures on every resize at
   exact card dimensions. Too expensive -- `generatePaperTexture` does
   multi-pass canvas drawing with mottling, grain, and gradients. Regenerating
   on every resize creates jank.

2. **Nine-Slice**: split the card texture into 9 regions that scale
   independently. Phaser 3.80 supports `NineSlice`, but the existing card
   textures have complex full-surface effects (radial center gradient, scattered
   mottles, grain lines) that do not tile or stretch gracefully in the middle
   region. Nine-Slice works best for simple bordered panels, not textured
   surfaces.

3. **Generate at shop size once at boot** (chosen): call
   `generatePaperTexture` a second time with shop-specific texture keys at the
   shop card's reference dimensions. Memory cost is three additional small
   canvas textures (~170x130 each, ~88KB uncompressed total). The shop scene
   uses the shop-sized keys; the barn scene continues using the slot-sized keys.
   Crisp at the intended display size with zero runtime cost.

### Decision: Cap emoji scale (not container mask)

Container masks in Phaser 3 require a Graphics or Geometry mask object, add
draw calls, and can interact poorly with the existing depth sorting. Simply
capping the sprite scale so the displayed emoji fits within card padding is
simpler, cheaper, and deterministic.

### Decision: Alpha/tint + translate feedback (not scale)

The root cause of the button resize bug is that `setDisplaySize()` sets an
internal scale factor, and the tween then multiplies against that factor
unpredictably. Rather than calculating and storing "base scale" for every
button, replace the feedback entirely. A brief `setTint(0xdddddd)` darkening
plus the existing 2px y-translate provides clear tactile feedback without
touching scale at all.

## Implementation

### Phase 1: Shop-sized card textures

**File: `src/config/constants.ts`**

Add three new texture keys to the `TEXTURES` object:

```typescript
CARD_PARCHMENT_SHOP: 'ui-card-parchment-shop',
CARD_NOISY_SHOP: 'ui-card-noisy-shop',
CARD_LEGENDARY_SHOP: 'ui-card-legendary-shop',
```

Add a `SHOP_CARD` entry to `LAYOUT` to define the reference texture size for
shop cards:

```typescript
SHOP_CARD: {
  TEX_WIDTH: 170,
  TEX_HEIGHT: 130,
},
```

These dimensions match the shop's reference card size (the `LAYOUT.SHOP`
values `CARD_WIDTH: 170` and approximate displayed height after the Sprint 007
aspect ratio change). The textures will be generated once and stretched
minimally by `setDisplaySize` at runtime -- far less distortion than the
current 96x104 -> 170x130 stretch.

**File: `src/rendering/proceduralTextures.ts`**

In `generateProceduralTextures`, after the existing three
`generatePaperTexture` calls, add three more:

```typescript
generatePaperTexture(
  scene,
  TEXTURES.CARD_PARCHMENT_SHOP,
  PALETTE.PARCHMENT,
  LAYOUT.SHOP_CARD.TEX_WIDTH,
  LAYOUT.SHOP_CARD.TEX_HEIGHT,
  'parchment',
);
generatePaperTexture(
  scene,
  TEXTURES.CARD_NOISY_SHOP,
  PALETTE.PARCHMENT,
  LAYOUT.SHOP_CARD.TEX_WIDTH,
  LAYOUT.SHOP_CARD.TEX_HEIGHT,
  'noisy',
);
generatePaperTexture(
  scene,
  TEXTURES.CARD_LEGENDARY_SHOP,
  0xf5e6b8,
  LAYOUT.SHOP_CARD.TEX_WIDTH,
  LAYOUT.SHOP_CARD.TEX_HEIGHT,
  'legendary',
);
```

No changes to the existing barn-sized texture generation. The `createCanvasTexture`
helper already short-circuits if a key exists, so there is no risk of collision.

**File: `src/scenes/TradingPostScene.ts`**

In `createShopCard`, change the texture key selection to use the shop variants:

```typescript
// Before:
bgTexture = TEXTURES.CARD_LEGENDARY;
bgTexture = TEXTURES.CARD_NOISY;
bgTexture = TEXTURES.CARD_PARCHMENT;

// After:
bgTexture = TEXTURES.CARD_LEGENDARY_SHOP;
bgTexture = TEXTURES.CARD_NOISY_SHOP;
bgTexture = TEXTURES.CARD_PARCHMENT_SHOP;
```

### Phase 2: Cap emoji sprite scale

**File: `src/scenes/TradingPostScene.ts`**

In `layoutShopCard`, replace the sprite scale calculation:

```typescript
// Before:
const spriteScale = Math.max(1.4, Math.min(2.4, pos.h / 44));

// After:
const maxEmojiDisplay = Math.min(pos.w, pos.h) * 0.38;
const spriteScale = maxEmojiDisplay / 128;
```

This computes a scale that makes the emoji occupy at most 38% of the card's
smaller dimension. For a 170x130 card, that is `130 * 0.38 / 128 = 0.386`,
producing a ~49px display -- comfortably within the card with room for text
above and below. The old formula (`pos.h / 44` clamped 1.4-2.4) yielded
display sizes of 179-307px, far exceeding card bounds.

The 0.38 ratio was chosen because:
- The emoji center is at `pos.h * 0.3` (30% down the card)
- Name text starts at `pos.h * 0.5` (50% down)
- 38% of the smaller dimension keeps the emoji between the top padding and the
  name text, with ~4px margin on each side

No container mask needed. The emoji will not overflow at any supported card size
because the scale is proportional to the card dimensions.

### Phase 3: Replace button press feedback

**File: `src/scenes/TradingPostScene.ts`**

Replace the `addButtonPressFeedback` method entirely:

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

  button.on('pointerdown', () => {
    if (!button.input?.enabled) {
      return;
    }
    const baseY = Number(button.getData('baseY')) || button.y;
    const labelBaseY = Number(label.getData('baseY')) || label.y;

    // Tint darkening instead of scale
    button.setTint(0xdddddd);

    // Translate down 2px
    button.y = baseY + 2;
    label.y = labelBaseY + 2;
  });

  const release = (): void => {
    const baseY = Number(button.getData('baseY')) || button.y;
    const labelBaseY = Number(label.getData('baseY')) || label.y;

    // Clear tint
    button.clearTint();

    // Snap back immediately (no tween, no overshoot)
    button.y = baseY;
    label.y = labelBaseY;
  };

  button.on('pointerup', release);
  button.on('pointerout', release);
}
```

Key changes:
- **Removed all `scaleX`/`scaleY` tweens.** No tweens at all -- instant
  feedback avoids the `setDisplaySize` conflict entirely.
- **Added `setTint(0xdddddd)`** on press, `clearTint()` on release. This
  darkens the button texture by ~13%, providing clear visual feedback.
- **Kept the 2px y-translate** for positional feedback, but applied instantly
  (no tween). The `Back.Out` ease on the old release tween was overshooting
  past scale 1.0, causing the visible resize. Instant snap-back eliminates this.
- **Removed `killTweensOf` calls** since no tweens are created.

This also applies to the tab button feedback and the mobile card-tap pulse in
`handleMobileCardTap`. The container `scaleX`/`scaleY` tween at line 232-237
should also be removed or replaced with a tint flash, since the same
scale-vs-displaySize conflict applies to shop card containers.

In `handleMobileCardTap`, replace the scale tween fallback:

```typescript
// Before:
this.tweens.add({
  targets: cardView.container,
  scaleX: 1.04,
  scaleY: 1.04,
  duration: 80,
  yoyo: true,
  ease: 'Quad.Out',
});

// After:
cardView.bg.setTint(0xeeeeee);
this.time.delayedCall(120, () => {
  cardView.bg.clearTint();
});
```

Similarly, in `onPurchase`, the purchase feedback tween scales the container:

```typescript
// Before:
this.tweens.add({
  targets: container,
  scaleX: 1.08,
  scaleY: 1.08,
  ...
});

// After:
const origAlpha = container.alpha;
this.tweens.add({
  targets: container,
  alpha: 0.5,
  duration: ANIMATION.PURCHASE_FEEDBACK_MS / 2,
  yoyo: true,
  ease: 'Quad.easeOut',
  onComplete: () => {
    container.setAlpha(origAlpha);
    this.refreshDisplay();
  },
});
```

This blinks the card to half-opacity and back, clearly indicating a purchase
without touching scale.

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/config/constants.ts` | Modify | Add `TEXTURES.CARD_*_SHOP` keys, add `LAYOUT.SHOP_CARD` |
| `src/rendering/proceduralTextures.ts` | Modify | Generate three additional shop-sized paper textures |
| `src/scenes/TradingPostScene.ts` | Modify | Use shop texture keys, cap emoji scale, replace all scale-based feedback with tint/alpha/translate |

`src/game/*` is **completely untouched**. No new files. No new npm dependencies.

## Definition of Done

- [ ] Shop card backgrounds are crisp with visible rounded corners, paper grain,
      and parchment stroke at displayed size (170x130 reference)
- [ ] Emoji sprites are fully contained within card bounds on both Animals and
      Legendary tabs at 390x844 viewport
- [ ] No button (tabs, capacity, start night) changes size on press -- feedback
      is tint + translate only
- [ ] Purchase feedback is alpha blink, not scale
- [ ] Mobile card-tap preview feedback is tint flash, not scale
- [ ] Barn scene card rendering is unaffected (still uses 96x104 textures)
- [ ] Visual inspection at 390x844, 412x915, and 768x1024 viewports shows no
      regression
- [ ] `npm run ci` passes (typecheck, lint, tests, bundle budget)
- [ ] No new `src/` subdirectories created

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Three extra canvas textures increase memory | Low | Low | ~88KB uncompressed total (170x130x4 bytes x 3). Negligible on any device that can run Phaser. |
| Tint feedback feels less tactile than scale | Low | Low | The 2px translate provides physical motion. Tint adds visual dimming. Together they feel responsive. Can adjust tint value (e.g. 0xcccccc for stronger darkening) if feedback feels weak. |
| Emoji scale too small on large cards | Low | Low | Scale is proportional (38% of smaller dimension). On 200px-tall cards, emoji displays at ~76px -- still clearly visible. If too small, raise the 0.38 ratio. |
| Bundle size increase from new texture generation code | Very Low | Very Low | Three additional `generatePaperTexture` calls with existing function. ~6 lines of new code. No measurable bundle impact. |
| `clearTint()` on release races with purchase alpha tween | Low | Medium | Purchase handler calls `refreshDisplay()` which destroys and recreates cards, so any lingering tint is moot. But the alpha tween's `onComplete` should guard against destroyed containers. |

## Security

No security implications. All changes are purely visual -- procedural texture
generation at a different size, sprite scale capping, and tween replacement.
No user input is parsed. No network requests. No data persistence changes.

## Dependencies

- Phaser 3.80.x (existing) -- `setTint`, `clearTint`, `setDisplaySize` APIs
- No new npm packages
- No external assets
- Depends on Sprint 007 being merged (shop layout, 128px emoji textures)

## Open Questions

1. **Should the shop texture size match the layout exactly or use a fixed
   reference size?** This draft uses a fixed 170x130 reference from the layout
   constants. If the layout grid changes in a future sprint, the texture size
   should be updated to match. An alternative is to generate textures
   dynamically on first shop entry at the actual computed card size, but this
   adds complexity for little benefit since the layout is stable.

2. **Should the barn scene also adopt tint-based feedback?** The barn scene's
   card interactions (long-press, draw animation) use different feedback
   patterns. This sprint only fixes the Trading Post buttons. If barn buttons
   have the same scale issue, a follow-up sprint should address them.

3. **Should the emoji scale ratio (0.38) be a named constant?** It could live
   in `LAYOUT.SHOP_CARD.EMOJI_RATIO` for discoverability. This draft inlines
   it in `layoutShopCard` for simplicity, but extracting it would be consistent
   with the existing pattern of layout constants.
