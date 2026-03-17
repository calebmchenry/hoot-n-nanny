# Sprint 007: UI Polish & Ability Tooltips

## Overview

Four targeted fixes addressing user feedback: stabilize HUD positions so they don't jump during gameplay, enlarge Trading Post cards so they're readable, sharpen blurry emoji, and add ability tooltips to both Barn and Trading Post scenes.

Scope: ~6 files modified, ~1 new file. No game logic changes. `src/game/*` untouched.

---

## Use Cases

1. **Stable HUD** — Player draws cards, upgrades capacity, triggers abilities. The resource banner, noise meter, deck stack, and action bar stay put. Only a browser resize moves them.
2. **Readable shop cards** — Trading Post cards show emoji, name, cost, mischief/hay stats, ability label, and stock count without cramming. No "compact mode" hiding info.
3. **Crisp emoji** — Animal emoji have hard pixel edges matching the rest of the pixel art. No blurriness.
4. **Ability discovery** — Player hovers over (desktop) or taps (mobile) an animal card in Barn or Trading Post. A small tooltip shows the ability label, trigger type, and description. In the shop, first tap shows tooltip; second tap on same card purchases.

---

## Implementation

### Phase 1: Stabilize HUD Positioning

**Problem:** `BarnScene.applyLayout()` repositions every element (HUD included) and runs on state changes, not just resize. When capacity changes or cards are drawn, HUD elements visually jump.

**Fix:** Split `applyLayout` into two methods:

1. **`applyViewportLayout(cw, ch)`** — positions viewport-only elements: sky, walls, floor, rafter, vignette, resource banner, noise meter, deck stack, action bar, dust emitter bounds. Called from `handleResize()` and `create()` only.
2. **`applyContentLayout(cw, ch)`** — positions state-dependent elements: slot rects, card containers, card shadows, farmhouse, overlays. Called from `create()`, `handleResize()`, and state-change handlers.

Key insight: `getResourceBannerPosition`, `getNoiseMeterPosition`, `getActionBarPosition` already ignore the `capacity` parameter — they compute from `cw`/`ch` alone. The HUD is purely viewport-derived. Store `cw`/`ch` as instance fields so `applyContentLayout` can reuse them without re-reading scale.

**Files:**
- `src/scenes/BarnScene.ts` — split `applyLayout`, update `refreshDisplay` to call only `applyContentLayout`

### Phase 2: Bigger Shop Cards

**Problem:** `getShopGridPositions()` uses 3 columns on wide screens and allows cards as small as 44px tall, triggering "compact" mode that hides ability labels.

**Fix:**
- [ ] Hardcode `const columns = 2` — remove the `cw >= 500 ? 3 : 2` conditional
- [ ] Raise `cardH` clamp from `clamp(..., 44, 160)` to `clamp(..., 80, 200)`
- [ ] Change aspect ratio from `cardW * (108 / 170)` to `cardW * (130 / 170)` for taller cards
- [ ] Reduce bottom margin gap from `14/REF_H` to `8/REF_H` to reclaim vertical space
- [ ] Remove compact mode branch (`if (pos.h < 72)`) from `layoutShopCard()` — with 80px minimum it's dead code
- [ ] Ability labels are always visible in the non-compact layout path

**Files:**
- `src/scenes/tradingPostLayout.ts` — column count, card height clamp, aspect ratio, spacing
- `src/scenes/TradingPostScene.ts` — remove compact branch from `layoutShopCard`

### Phase 3: Crisp Emoji

**Problem:** Emoji textures are 64x64 with `LINEAR` filtering — looks soft/blurry against pixel art.

**Fix:**
- [ ] Bump `EMOJI_TEXTURE_SIZE` from 64 to 128
- [ ] Bump `EMOJI_FONT_SIZE` from 48 to 96 (proportional)
- [ ] Change `setFilter(Phaser.Textures.FilterMode.LINEAR)` to `setFilter(Phaser.Textures.FilterMode.NEAREST)`
- [ ] Update fallback letter-circle to match 128px canvas (font size ~80px, circle radius ~60px)

**Files:**
- `src/scenes/BootScene.ts` — texture size, font size, filter mode

### Phase 4: Ability Tooltips

**Problem:** Barn has a 300ms long-press info panel but no quick tooltip. Trading Post has no ability display at all — players buy animals blind.

**Design:** A shared tooltip helper used by both scenes.

**New file: `src/scenes/tooltipHelper.ts`**

```typescript
export function showAbilityTooltip(
  scene: Phaser.Scene,
  x: number, y: number,
  animalDef: AnimalDef,
  abilityDef: AbilityDef,
  cw: number, ch: number,
): Phaser.GameObjects.Container;

export function hideAbilityTooltip(
  scene: Phaser.Scene,
  tooltip: Phaser.GameObjects.Container,
): void;
```

**Tooltip content:**
- Ability label in bold (e.g., "Peek")
- Trigger type (e.g., "On Enter" / "Passive" / "Manual" / "On Score")
- Description text with word wrap
- Animals with `abilityKind: 'none'` show NO tooltip

**Tooltip appearance:**
- Small rounded-rect panel (~200x90px, scales proportionally)
- Semi-transparent dark background matching overlay style
- Positioned above the card; flips below if too close to top edge
- Depth above cards but below overlays
- Fade-in over 100ms, fade-out over 80ms

**Barn behavior:**
- Desktop: `pointerover` after 150ms delay shows tooltip; `pointerout` dismisses
- Mobile: Quick tap (< 300ms, no movement) shows tooltip. Tap away dismisses. Long press still opens full info panel (existing behavior unchanged).
- Tooltip and info panel are mutually exclusive

**Trading Post behavior:**
- Desktop: `pointerover` after 150ms shows tooltip; `pointerout` dismisses. Click purchases.
- Mobile: **Tap-to-preview, tap-again-to-buy.** First tap on a shop card shows tooltip. Second tap on the same card triggers purchase. Tap on a different card moves tooltip. Tap away dismisses tooltip without purchasing.
- This replaces the current single-tap-to-buy on mobile

**Files:**
- `src/scenes/tooltipHelper.ts` — **New file**: shared tooltip show/hide
- `src/scenes/BarnScene.ts` — wire tooltip to slot card pointer events
- `src/scenes/TradingPostScene.ts` — wire tooltip to shop card events, implement tap-to-preview-then-buy

---

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/scenes/BarnScene.ts` | Modify | Split `applyLayout`, add tooltip wiring |
| `src/scenes/barnLayout.ts` | No change | Layout functions already viewport-only for HUD |
| `src/scenes/TradingPostScene.ts` | Modify | Remove compact mode, add tooltip + tap-to-preview flow |
| `src/scenes/tradingPostLayout.ts` | Modify | 2 columns, bigger cards, adjusted spacing |
| `src/scenes/BootScene.ts` | Modify | 128px emoji, NEAREST filter |
| `src/scenes/tooltipHelper.ts` | **Create** | Shared ability tooltip component |
| `src/game/*` | **Untouched** | Read ability data only |

---

## Definition of Done

1. HUD elements (banner, noise meter, deck, action bar) don't jump during gameplay state changes — only reposition on viewport resize
2. Trading Post cards are large enough to show emoji, name, cost, stats, ability label, and stock on 390x844 phone
3. Compact mode branch is removed from TradingPostScene
4. Emoji textures are 128x128 with NEAREST filtering — crisp edges
5. Hovering over (desktop) or tapping (mobile) an animal card with an ability shows tooltip in both Barn and Trading Post
6. Animals with `abilityKind: 'none'` show no tooltip
7. Trading Post mobile: first tap shows tooltip, second tap on same card purchases
8. Tooltip and info panel (Barn) are mutually exclusive
9. `npm run ci` passes (typecheck, lint, tests, build, budget)
10. `src/game/*` has zero changes
11. App chunk < 100KB gzipped

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Splitting `applyLayout` misses some element | Medium | Medium | Test all game states: empty barn, full barn, capacity upgrade, bust, summary, win. All elements must be in correct positions. |
| Tap-to-preview changes feel slow on mobile | Low | Medium | The second tap is instant (no delay). Players learn the pattern quickly. |
| 128px NEAREST emoji look too chunky | Low | Low | At typical card display sizes (~40-60px), a 128px source downscaled with NEAREST still shows good detail. If too chunky, can revert to 64px NEAREST. |
| Tooltip positioning conflicts with overlays | Low | Medium | Tooltip has lower depth than overlays. When overlay opens, tooltip is hidden. |
| 2-column-always makes desktop shop feel sparse | Low | Low | Cards scale up with viewport. On desktop, larger cards with more spacing is better than cramped 3-column. |

---

## Security

No security implications. No network calls, no user input handling changes, no new dependencies.

---

## Dependencies

- No new npm dependencies
- Reads `src/game/abilities.ts` for ability descriptions (read-only)
- Reads `src/game/animals.ts` for AnimalDef (read-only)

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|-----------|
| Shop tap flow? | **Tap-to-preview, tap-again-to-buy** (user confirmed) |
| Tooltip hover delay? | **150ms** on desktop. Instant on mobile tap. |
| No-ability animals? | **No tooltip shown.** |
| Emoji texture size? | **128x128** with NEAREST filtering |
| Shared tooltip or per-scene? | **Shared** `tooltipHelper.ts` |
