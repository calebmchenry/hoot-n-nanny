# Sprint 008: Card Shop Visual Polish

## Overview

Three targeted visual bug fixes in the Trading Post scene: (1) shop card backgrounds are blurry because 96x104 textures are stretched to ~170x130+, (2) emoji sprites overflow card bounds due to aggressive scaling, and (3) buttons visually resize on press because scale tweens interact badly with `setDisplaySize`.

Scope: ~3 files modified, 0 new files. No game logic changes. `src/game/*` untouched.

---

## Use Cases

1. **Crisp shop cards** — Player opens Trading Post and sees cards with sharp rounded corners, visible paper grain, and clean borders at their displayed size. Cards look like actual cards, not stretched rectangles.
2. **Contained emoji** — Animal emoji are fully within card bounds on both Animals and Legendary tabs. No overflow at any viewport size.
3. **Stable button press** — Player taps tab buttons, capacity upgrade, or Start Night. Buttons give subtle positional feedback (translate down) without changing size. No overshoot/bounce artifacts.

---

## Architecture

No new architectural patterns. All changes extend the existing procedural texture generation system and touch only rendering/layout code.

**Key design decision: Generate shop card textures at a dedicated larger size.**

Rather than dynamically generating textures per-layout (complex, memory-heavy for resize), we generate a second set of card textures at shop-appropriate dimensions. The shop cards use these larger textures; barn cards continue using the existing 96x104 textures. This costs ~3 additional canvas textures in memory but keeps the code simple and deterministic.

**Alternative considered:** Generating textures dynamically at whatever size the layout computes. Rejected because layout dimensions change on resize, which would require texture regeneration and cache invalidation — too complex for the benefit.

---

## Implementation

### Phase 1: Generate Shop-Sized Card Textures

**Problem:** `generatePaperTexture()` creates `CARD_PARCHMENT`, `CARD_NOISY`, and `CARD_LEGENDARY` at `LAYOUT.SLOT.WIDTH x LAYOUT.SLOT.HEIGHT` (96x104). In the shop, `layoutShopCard()` stretches these to ~170x130+ via `setDisplaySize()`, making rounded corners, grain, and borders blurry.

**Fix:** Add three new shop-specific card texture keys and generate them at a larger resolution that won't need upscaling.

**`src/config/constants.ts`:**
- Add to `LAYOUT.SHOP`: `CARD_TEX_WIDTH: 170` and `CARD_TEX_HEIGHT: 200` — these are the max display dimensions shop cards can reach (matching the `clamp(..., 80, 200)` and the 2-column layout width). Generating at max size means downscaling is always crisp.
- Add three new texture keys to `TEXTURES`:
  ```
  SHOP_CARD_PARCHMENT: 'ui-shop-card-parchment'
  SHOP_CARD_NOISY: 'ui-shop-card-noisy'
  SHOP_CARD_LEGENDARY: 'ui-shop-card-legendary'
  ```

**`src/rendering/proceduralTextures.ts`:**
- In `generateProceduralTextures()`, add three more `generatePaperTexture()` calls using the new keys and `LAYOUT.SHOP.CARD_TEX_WIDTH/HEIGHT`:
  ```typescript
  generatePaperTexture(scene, TEXTURES.SHOP_CARD_PARCHMENT, PALETTE.PARCHMENT,
    LAYOUT.SHOP.CARD_TEX_WIDTH, LAYOUT.SHOP.CARD_TEX_HEIGHT, 'parchment');
  generatePaperTexture(scene, TEXTURES.SHOP_CARD_NOISY, PALETTE.PARCHMENT,
    LAYOUT.SHOP.CARD_TEX_WIDTH, LAYOUT.SHOP.CARD_TEX_HEIGHT, 'noisy');
  generatePaperTexture(scene, TEXTURES.SHOP_CARD_LEGENDARY, 0xf5e6b8,
    LAYOUT.SHOP.CARD_TEX_WIDTH, LAYOUT.SHOP.CARD_TEX_HEIGHT, 'legendary');
  ```

**`src/scenes/TradingPostScene.ts`:**
- In `createShopCard()`, change texture selection to use shop-specific keys:
  ```typescript
  // Before:
  bgTexture = TEXTURES.CARD_PARCHMENT;  // (and CARD_NOISY, CARD_LEGENDARY)
  // After:
  bgTexture = TEXTURES.SHOP_CARD_PARCHMENT;  // (and SHOP_CARD_NOISY, SHOP_CARD_LEGENDARY)
  ```
- The existing `setDisplaySize(pos.w, pos.h)` call remains — but now it's downscaling from 170x200 to the actual card size (e.g., 170x130), which preserves detail instead of upscaling from 96x104.

**Barn scene is unaffected** — it continues using `TEXTURES.CARD_PARCHMENT` etc. at the original 96x104 slot size.

### Phase 2: Contain Emoji Within Card Bounds

**Problem:** In `layoutShopCard()` (line 615), sprite scale is:
```typescript
const spriteScale = Math.max(1.4, Math.min(2.4, pos.h / 44));
```
With 128px source textures, scale 2.4 produces ~307px display size — far larger than the card. The emoji spills over card edges.

**Fix:** Replace the scale calculation with one that respects card dimensions.

**`src/scenes/TradingPostScene.ts` — `layoutShopCard()`:**
- Replace the sprite scale formula:
  ```typescript
  // Before:
  const spriteScale = Math.max(1.4, Math.min(2.4, pos.h / 44));
  // After:
  const maxEmojiSize = Math.min(pos.w, pos.h) * 0.38;
  const spriteScale = maxEmojiSize / 128;  // 128 = emoji texture size
  ```
  This caps the emoji display size to 38% of the smaller card dimension. For a typical 170x130 card, that's `130 * 0.38 = ~49px` display size from a 128px source → scale ~0.39. The emoji will be comfortably contained.

- The 0.38 factor is chosen so that the emoji is prominent but leaves room for the name text below it and cost/stats at the bottom. The sprite Y position (`pos.h * 0.3`) places it in the upper third of the card.

### Phase 3: Fix Button Press Feedback

**Problem:** `addButtonPressFeedback()` (lines 109-155) tweens `scaleX`/`scaleY` to 0.97 on press and back to 1.0 with `Back.Out` ease on release. But buttons use `setDisplaySize()` which internally sets scale relative to the texture-to-display ratio. For example, a 350x56 texture displayed at 170x36 has internal scale ~0.486. Tweening to 0.97 sets absolute scale to 0.97, not 97% of 0.486 — making the button jump to nearly full texture size, then spring back.

Additionally, the `Back.Out` ease overshoots to ~1.05, causing visible size bounce.

**Fix:** Replace the scale tween with a translate-only effect.

**`src/scenes/TradingPostScene.ts` — `addButtonPressFeedback()`:**
- Remove `scaleX`/`scaleY` tweens entirely
- Keep the Y-translate (shift down 2px on press, return on release)
- Change the release ease from `Back.Out` to `Quad.Out` to prevent overshoot on position
- Add a subtle tint darkening on press (multiply tint to 0xdddddd) and clear on release (reset to 0xffffff) for visual feedback without size change

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
    this.tweens.killTweensOf([button, label]);
    const baseY = Number(button.getData('baseY')) || button.y;
    const labelBaseY = Number(label.getData('baseY')) || label.y;
    button.setTint(0xdddddd);
    this.tweens.add({
      targets: button, y: baseY + 2, duration: 70, ease: 'Quad.Out',
    });
    this.tweens.add({
      targets: label, y: labelBaseY + 2, duration: 70, ease: 'Quad.Out',
    });
  });

  const release = (): void => {
    this.tweens.killTweensOf([button, label]);
    const baseY = Number(button.getData('baseY')) || button.y;
    const labelBaseY = Number(label.getData('baseY')) || label.y;
    button.clearTint();
    this.tweens.add({
      targets: button, y: baseY, duration: 110, ease: 'Quad.Out',
    });
    this.tweens.add({
      targets: label, y: labelBaseY, duration: 110, ease: 'Quad.Out',
    });
  };

  button.on('pointerup', release);
  button.on('pointerout', release);
}
```

---

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/config/constants.ts` | Modify | Add `SHOP.CARD_TEX_WIDTH/HEIGHT` to `LAYOUT`, add 3 shop card texture keys to `TEXTURES` |
| `src/rendering/proceduralTextures.ts` | Modify | Add 3 `generatePaperTexture()` calls for shop-sized card textures in `generateProceduralTextures()` |
| `src/scenes/TradingPostScene.ts` | Modify | Use shop texture keys in `createShopCard()`, fix sprite scale formula in `layoutShopCard()`, rewrite `addButtonPressFeedback()` to translate+tint only |
| `src/scenes/tradingPostLayout.ts` | No change | Layout math is correct; the issue was texture size, not positioning |
| `src/scenes/BootScene.ts` | No change | Emoji texture generation is fine (128px from Sprint 007) |
| `src/scenes/BarnScene.ts` | No change | Uses original 96x104 textures at native slot size |
| `src/game/*` | **Untouched** | No game logic changes |

---

## Definition of Done

1. Shop card backgrounds have crisp rounded corners, paper grain, and borders at their displayed size — no blurriness from texture stretching
2. Emoji sprites are fully contained within card bounds on both Animals and Legendary tabs at the 390x844 reference viewport
3. Emoji sprites remain contained at all viewport sizes within the Phaser FIT scaling range
4. Buttons (tab buttons, capacity upgrade, Start Next Night) do not visually change size on press — feedback is translate-down + tint-darken only
5. No `Back.Out` ease overshoot on any button release
6. Barn scene card rendering is unchanged — visual diff is zero
7. `npm run ci` passes (typecheck, lint, tests, build, budget)
8. App chunk remains < 100KB gzipped
9. `src/game/*` has zero changes

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Extra shop textures increase memory usage | Low | Low | Three additional 170x200 canvas textures add ~400KB uncompressed to GPU memory. Negligible on any device that runs a Phaser game. |
| Shop card texture size doesn't match all possible layout sizes | Low | Low | 170x200 is the maximum card size from the layout clamp (w ≈ cardW from 2-column layout, h clamped to 200). `setDisplaySize` downscales from this max — always sharp. If layout changes in future sprints, update `CARD_TEX_WIDTH/HEIGHT`. |
| Emoji too small after scale fix | Low | Medium | 38% of card height gives ~49px emoji on a 130px-tall card, which is prominent. If too small, increase the 0.38 factor. Easy to tune. |
| Tint-darken feedback feels different from scale feedback | Low | Low | Translate + tint is the standard mobile button pattern. More consistent and less distracting than scale. |
| `generatePaperTexture` radius=10 looks too round on larger textures | Low | Low | The corner radius is absolute (10px), so it will appear proportionally smaller on the 170x200 shop textures — actually more card-like. May want to scale radius proportionally: `Math.round(10 * (width / 96))` ≈ 18px. Worth testing both. |

---

## Security

No security implications. No network calls, no user input handling changes, no new dependencies.

---

## Dependencies

- No new npm dependencies
- No new files created
- Depends on `generatePaperTexture()` already accepting arbitrary width/height (it does — see signature at `proceduralTextures.ts:429`)
- Depends on Sprint 007's 128px emoji textures (already merged)

---

## Open Questions

| # | Question | Context |
|---|----------|---------|
| 1 | Should the paper texture corner radius scale with texture size? | Currently hardcoded to `10px` in `generatePaperTexture`. At 170x200 this will look proportionally smaller than at 96x104. Scaling to ~18px may look better. Needs visual testing. |
| 2 | Should button press feedback include tint darkening, or just translate? | The draft proposes translate + tint. Translate-only is simpler but may feel like nothing happened. Tint adds visual confirmation without size change. User preference. |
| 3 | Is 0.38 the right emoji containment factor? | Depends on visual balance between emoji size and text readability. May need tuning to 0.35 or 0.42 based on how it looks with different emoji (some emoji have more whitespace than others). |
| 4 | Should the legendary card texture `corner` ornaments scale up? | `generatePaperTexture` draws corner flourishes at fixed pixel offsets (6px from edge). At 170x200 these will be proportionally smaller. May want to scale flourish positions proportionally for the shop textures. |
