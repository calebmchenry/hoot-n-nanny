# Sprint 004: Responsive Layout & Visual Polish

## Overview

Sprint 003 delivered active abilities, Legendary Animals, and a complete win condition on the fixed 390x844 logical canvas. The game is functionally complete for single-player, but the presentation is broken across device classes:

- **Desktop**: The game renders as a tiny portrait rectangle centered in the browser with ~75% black space on a 1920x1080 monitor.
- **Phone portrait**: Works on devices near 390x844 but clips on iPhone SE (375x667) — the action bar falls below the fold, resource banners overlap the noise meter, and capacity 7-8 cards crowd the farmhouse.
- **Phone landscape**: The game shrinks to a tiny pillarboxed strip. No landscape handling exists.
- **Clipping**: Sprint 003 increased card density (96x104 cards, info panel at y=556, ability overlays, Legendary glow). At capacity 7-8, the third slot row (y=392, bottom at y=496) collides with the farmhouse (y=560) and info panel (y=556). The action bar (y=758) is below the fold on shorter phones.

This sprint fixes all of the above by:

1. **Switching from `Scale.FIT` to `Scale.RESIZE`** so the Phaser canvas always fills 100% of the container. The logical resolution becomes dynamic — scenes read `this.scale.width` / `this.scale.height` for actual canvas dimensions.
2. **Making all layout functions viewport-aware** by accepting `(cw: number, ch: number)` parameters and computing positions proportionally from the 390x844 reference, with pixel floors for minimum readability.
3. **Genuinely filling the desktop browser** with a wider layout — more horizontal spacing, expanded card grid, room for the HUD to breathe — not a portrait column with decorative bars.
4. **Adding a rotate prompt** for phone landscape (shortest dimension < 600px) rather than attempting a full landscape layout redesign.
5. **Verifying everything** with multi-viewport Playwright tests and manual agent-browser screenshots across 5 device profiles.

No new npm dependencies. No game logic changes. All modifications are in config, layout, scene rendering, CSS, and testing.

---

## Use Cases

1. **Desktop full-screen** — Player opens the game in Chrome on a 1920x1080 monitor. The game fills the entire browser viewport. The barn uses the extra horizontal space — slots are well-spaced, the farmhouse sits comfortably, and the resource banner spans the top without crowding. No black bars.

2. **Phone portrait (various sizes)** — Player opens on iPhone SE (375x667). All UI elements are visible without scrolling — action bar on-screen, cards at capacity 8 don't overlap the farmhouse. Player opens on iPhone 15 Pro Max (430x932) and the game fills the taller viewport with proportional spacing.

3. **Phone landscape rotate prompt** — Player rotates their phone to landscape. A full-screen CSS overlay says "Rotate your device" with a phone icon. The game is paused underneath. On tablets (shortest dimension >= 600px), no prompt appears — the game scales naturally.

4. **Tablet scaling** — Player opens on iPad (768x1024). The game scales up to fill the viewport. Touch targets remain >= 44px. Text is comfortably readable.

5. **No clipping at any capacity** — Player upgrades barn to capacity 8. Three rows of cards (3+3+2) render with correct spacing. The farmhouse, action bar, and info panel don't overlap card rows. Text on resource banners, noise meter, and capacity indicator doesn't truncate.

6. **Info panel doesn't overlap action bar** — At any viewport size, the info panel is anchored above the action bar with visible separation. On small viewports where space is tight, the panel overlays the barn slots instead of the interactive buttons.

7. **Trading Post on all viewports** — Shop grid adapts: 2 columns on narrow/portrait phones, 3 columns on wider viewports (tablet, desktop). Currency header and capacity buttons anchor to actual canvas edges.

8. **Resize responsiveness** — Resizing the browser window causes the layout to reflow without a page reload. Elements reposition smoothly. No new game objects are created — only positions and sizes update.

9. **Visual verification** — Developer runs agent-browser manually at 5 viewports, capturing screenshots proving no clipping, no overlap, and desktop fill. Playwright multi-viewport tests run in CI.

---

## Architecture

### Scale Mode: FIT → RESIZE

The fundamental change. `Scale.FIT` locks the canvas to 390x844 and letterboxes anything that doesn't match. `Scale.RESIZE` makes the canvas match the container exactly — no letterboxing, no pillarboxing.

```typescript
// src/config/game.ts — before
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: LAYOUT.CANVAS.WIDTH,
  height: LAYOUT.CANVAS.HEIGHT,
  parent: 'game-container',
}

// src/config/game.ts — after
scale: {
  mode: Phaser.Scale.RESIZE,
  autoCenter: Phaser.Scale.NO_CENTER,
  parent: 'game-container',
}
```

With RESIZE mode:
- `this.scale.width` and `this.scale.height` are the actual canvas pixel dimensions
- Scenes receive `resize` events when the window changes
- `LAYOUT.CANVAS.WIDTH` (390) and `LAYOUT.CANVAS.HEIGHT` (844) become **reference dimensions** for proportional math, not the canvas size

### CSS Container

The container becomes a simple full-viewport box. Safe areas are handled via CSS padding — the Phaser canvas fills the padded area, so layout functions don't need safe-area awareness.

```css
#game-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  padding:
    env(safe-area-inset-top)
    env(safe-area-inset-right)
    env(safe-area-inset-bottom)
    env(safe-area-inset-left);
  box-sizing: border-box;
}
```

### Proportional Layout Pattern

All layout functions gain `(cw: number, ch: number)` parameters. Positions are computed as proportional offsets from the reference dimensions:

```typescript
// Before (hardcoded):
export const getResourceBannerPosition = (_capacity: number): Rect => {
  return toRect(16, 16, 358, 64);
};

// After (proportional):
export const getResourceBannerPosition = (_capacity: number, cw: number, ch: number): Rect => {
  const x = Math.round(cw * (16 / REF_W));
  const y = Math.round(ch * (16 / REF_H));
  const w = Math.round(cw * (358 / REF_W));
  const h = Math.round(ch * (64 / REF_H));
  return toRect(x, y, w, h);
};
```

Slot sizes use **breakpoint snapping** rather than continuous scaling, for cleaner pixel-art rendering:

```typescript
const getSlotSize = (cw: number): { w: number; h: number } => {
  if (cw >= 700) return { w: 112, h: 122 };  // large (desktop/tablet)
  if (cw >= 420) return { w: 96, h: 104 };    // medium (modern phones)
  return { w: 80, h: 87 };                     // small (iPhone SE)
};
```

### Desktop Wide Layout

On desktop (cw >= 900 or so), the layout expands horizontally:

- **Slots**: Still 3-column grid, but with wider gaps. Centered horizontally in the canvas.
- **Farmhouse**: Positioned to the right of the slot grid (not below it), freeing vertical space.
- **Resource banner**: Full canvas width with generous padding.
- **Action bar**: Wider buttons, centered, anchored to bottom.
- **Info panel**: Wider, more horizontal content area. Still anchored above action bar.
- **Overlays**: Max width capped at ~600px and centered, so they don't become comically wide on large screens.

This is NOT a different layout mode — it's the same proportional math producing more spacious results at larger dimensions. The column count stays at 3, the element hierarchy stays the same, but everything has room to breathe.

### Landscape Detection & Rotate Prompt

For phone landscape (shortest viewport dimension < 600px AND width > height):

- A CSS overlay (`#rotate-prompt`) appears over the game container
- Implemented with CSS media query + JS resize listener (for edge cases like soft keyboard)
- The Phaser game continues running underneath but is visually hidden
- No game state changes — when the user rotates back, the game is exactly where they left it

For tablet/desktop landscape (shortest dimension >= 600px), no prompt. The game renders normally.

### Clipping Fix Strategy

Root causes and fixes:

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Row 3 cards crowd farmhouse | Fixed y=392 + 104h = 496, farmhouse at y=560 (only 64px gap) | Compress ROW_GAP at capacity >= 7. Farmhouse repositions proportionally with extra clearance. |
| Action bar below fold on SE | Fixed y=758 on 667px viewport | Action bar anchors to `ch - 86` (button + bottom padding) |
| Resource banner overlaps noise | Both in top 126px with fixed coords | Proportional vertical stacking with minimum gap |
| Info panel overlaps action bar | Info panel y=556, action bar y=758 (ok at 844, tight at 667) | Info panel anchored at `actionBarY - panelH - 8`, never overlapping |
| Card text truncation | Fixed card size, long animal names | `setWordWrapWidth(slotW - 8)` with proportional font sizes |

### Resize Event Handling

Both BarnScene and TradingPostScene subscribe to resize events:

```typescript
create(): void {
  this.scale.on('resize', this.handleResize, this);
  // ... initial layout using this.scale.width / this.scale.height
}

handleResize(gameSize: Phaser.Structs.Size): void {
  if (this.isAnimating) {
    this.pendingResize = true;
    return; // skip during animations, apply after
  }
  this.applyLayout(gameSize.width, gameSize.height);
}

// applyLayout repositions existing objects — does NOT destroy/recreate them
applyLayout(cw: number, ch: number): void {
  // Reposition all HUD elements, slots, environment, action bar
  // using setPosition() and setDisplaySize() on existing game objects
}

shutdown(): void {
  this.scale.off('resize', this.handleResize, this);
}
```

Key: `applyLayout` **repositions** existing game objects. It does not destroy and recreate them. This avoids event listener leaks, lost state, and animation interruption.

### Generated Textures (BootScene)

BootScene generates textures at fixed sizes. With RESIZE mode, the canvas can be larger or smaller than 390x844. Strategy:

- Generate all textures at **reference size** (current behavior — no change to BootScene generation).
- Scenes use `setDisplaySize(targetW, targetH)` to scale textures to the proportional size for the current viewport.
- Phaser's `pixelArt: true` + `roundPixels: true` ensures nearest-neighbor filtering (no blur on upscale).
- The full-canvas barn plank background uses `setDisplaySize(cw, ch)` to stretch to the actual canvas — this is the one texture that must cover the entire canvas regardless of aspect ratio.

### Font Sizing

Proportional font sizes with a floor and ceiling:

```typescript
const scaledFont = (basePx: number, ch: number): number => {
  const scaled = Math.round(basePx * (ch / REF_H));
  return Math.max(10, Math.min(scaled, basePx * 2));
};
```

- Floor: 10px (below this, text is illegible on any device)
- Ceiling: 2x base (prevents comically large text on 4K monitors)

---

## Implementation

### Phase 1: CSS Container & Rotate Overlay (~10%)

**Goal:** Full-viewport container and phone landscape handling.

**Files:**
- `index.html` — Modify CSS, add rotate prompt markup
- `src/main.ts` — Add JS resize listener for rotate prompt

**Tasks:**
- [ ] Update `#game-container` CSS: `position: fixed; inset: 0; width: 100vw; height: 100dvh;` with safe-area padding via `env()`. Change body background from `#000` to `#10243f` (sky color, so there are no black bars during load).
- [ ] Add `#rotate-prompt` div: hidden by default, absolute-positioned over game container, contains "Rotate your device" text and CSS-only phone rotation icon.
- [ ] Add CSS: `@media (orientation: landscape) and (max-height: 599px) { #rotate-prompt { display: flex; } }`.
- [ ] Add JS resize listener in `main.ts` toggling `#rotate-prompt` visibility based on `window.innerWidth > window.innerHeight && Math.min(window.innerWidth, window.innerHeight) < 600`.
- [ ] Verify: Chrome DevTools at 667x375 shows rotate prompt. At 1024x768, no prompt.

### Phase 2: Phaser Scale Mode & Config (~10%)

**Goal:** Switch to RESIZE mode and update constants.

**Files:**
- `src/config/game.ts` — Modify scale config
- `src/config/constants.ts` — Rename WIDTH/HEIGHT to REF_WIDTH/REF_HEIGHT

**Tasks:**
- [ ] Audit all `LAYOUT.CANVAS.WIDTH` / `LAYOUT.CANVAS.HEIGHT` consumers: `game.ts`, `barnLayout.ts`, `barnLayout.test.ts`, `BarnScene.ts`, `BootScene.ts`, `TradingPostScene.ts`, `tradingPostLayout.ts`.
- [ ] In `constants.ts`: rename `LAYOUT.CANVAS.WIDTH` → `LAYOUT.CANVAS.REF_WIDTH`, `LAYOUT.CANVAS.HEIGHT` → `LAYOUT.CANVAS.REF_HEIGHT`. Value stays 390/844.
- [ ] In `game.ts`: change `mode` to `Phaser.Scale.RESIZE`, change `autoCenter` to `Phaser.Scale.NO_CENTER`, remove `width`/`height` from scale config.
- [ ] Update all consumer imports to use `REF_WIDTH`/`REF_HEIGHT` or `this.scale.width`/`this.scale.height` as appropriate.
- [ ] `npm run typecheck` passes after rename.
- [ ] Game boots without errors at default viewport.

### Phase 3: Layout Functions Refactoring (~25%)

**Goal:** All layout helpers become viewport-aware.

**Files:**
- `src/scenes/barnLayout.ts` — Major rewrite
- `src/scenes/tradingPostLayout.ts` — Major rewrite
- `src/scenes/barnLayout.test.ts` — Extend
- `src/scenes/tradingPostLayout.test.ts` — Create

**Tasks — barnLayout.ts:**
- [ ] Add `cw` and `ch` parameters to every exported function:
  - `getDynamicSlotRects(capacity, cw, ch)` — proportional grid with breakpoint-snapped slot sizes. 3 columns in portrait, wider gaps on desktop.
  - `getResourceBannerPosition(capacity, cw, ch)` — full width with proportional margins
  - `getNoiseMeterPosition(capacity, cw, ch)` — below banner with minimum gap
  - `getDeckStackPosition(capacity, cw, ch)` — right side, proportional
  - `getFarmhouseRect(capacity, cw, ch)` — below slots in portrait, right of slots when cw is large enough
  - `getFarmhouseWindowRect(capacity, cw, ch)` — relative to farmhouse
  - `getActionBarPosition(capacity, dualButtons, cw, ch)` — anchored at `ch - 86`
  - `getOverlayBounds(capacity, cw, ch)` — centered, max width 600px
  - `getInfoPanelBounds(cw, ch)` — anchored above action bar
- [ ] Implement proportional math using `REF_W = 390`, `REF_H = 844`.
- [ ] Slot gap compression: reduce `ROW_GAP` to 8px equivalent at capacity >= 7.
- [ ] All positions use `Math.round()` to prevent fractional pixel jitter.

**Tasks — tradingPostLayout.ts:**
- [ ] Add `cw` and `ch` parameters to all functions:
  - `getCurrencyHeaderPosition(cw, ch)`
  - `getTabButtonPositions(cw, ch)`
  - `getShopGridPositions(itemCount, cw, ch)` — 2 columns when cw < 500, 3 columns when cw >= 500
  - `getCapacityUpgradePosition(cw, ch)` — anchored near bottom
  - `getStartNightButtonPosition(cw, ch)` — anchored at `ch - 86`
  - `getPennedUpPosition(cw, ch)` — top, proportional width

**Tests — barnLayout.test.ts:**
- [ ] Update existing tests: pass `(capacity, 390, 844)` and verify results within 2px of old hardcoded values (backward compatibility).
- [ ] New: `getDynamicSlotRects(8, 375, 667)` — all slots fit, no overlap with farmhouse or action bar.
- [ ] New: `getDynamicSlotRects(8, 1920, 1080)` — slots proportionally larger, centered.
- [ ] New: `getActionBarPosition(5, false, 375, 667)` — button bottom edge < 667.
- [ ] New: info panel doesn't overlap action bar at any viewport.
- [ ] New: all interactive rects >= 44x44px at smallest viewport (375x667).
- [ ] New: no two layout regions overlap at capacities 5-8 × viewports [375x667, 393x852, 768x1024, 1920x1080].

**Tests — tradingPostLayout.test.ts:**
- [ ] Grid positions at multiple viewports, no overlap, all within canvas.
- [ ] 3-column grid triggers at cw >= 500.
- [ ] Start Night button visible (bottom edge < ch) at all viewports.

### Phase 4: Scene Updates — BarnScene (~25%)

**Goal:** BarnScene uses proportional layout and handles resize.

**Files:**
- `src/scenes/BarnScene.ts` — Modify

**Tasks:**
- [ ] In `create()`: read `this.scale.width` and `this.scale.height`, pass to all layout functions.
- [ ] Add `this.scale.on('resize', this.handleResize, this)`.
- [ ] Implement `handleResize`: skip if `isAnimating`, otherwise call `applyLayout(cw, ch)`.
- [ ] Implement `applyLayout(cw, ch)`: reposition all HUD elements, slot images, environment, action bar using `.setPosition()` and `.setDisplaySize()`. Do NOT recreate objects.
- [ ] Barn plank background: `setDisplaySize(cw, ch)`.
- [ ] Rafter: `setDisplaySize(cw, rafterProportionalH)`.
- [ ] Floor straw: `setDisplaySize(cw, floorH)`.
- [ ] Resource banner: proportional text positioning, proportional font sizes.
- [ ] Noise meter: proportional position, proportional dot sizing.
- [ ] Action bar: always `ch - 86`, button width `cw - 40` (single) or `(cw - 54) / 2` (dual).
- [ ] Cards in slots: `setDisplaySize(slotW, slotH)` from proportional rects. Text scales.
- [ ] Overlay containers (bust, summary, info panel, ability, win): reposition on resize. Max width 600px, centered.
- [ ] Remove resize listener in `shutdown()`.
- [ ] Handle `pendingResize` flag: after animation completes, check and apply deferred resize.

**Tests:**
- [ ] Existing unit tests pass.
- [ ] Manual verification at all 5 viewports in Chrome DevTools.

### Phase 5: Scene Updates — TradingPostScene & BootScene (~15%)

**Goal:** Trading Post uses proportional layout. BootScene textures compatible with dynamic viewports.

**Files:**
- `src/scenes/TradingPostScene.ts` — Modify
- `src/scenes/BootScene.ts` — Modify

**Tasks — TradingPostScene:**
- [ ] In `create()`: read canvas dimensions, pass to layout functions.
- [ ] Add resize handler (same pattern as BarnScene).
- [ ] Background fills canvas: `setDisplaySize(cw, ch)`.
- [ ] Shop grid: proportional card sizes, 2 or 3 columns based on width.
- [ ] Header, tabs, currency: proportional positions and font sizes.
- [ ] Capacity and Start Night buttons: anchored to bottom of canvas.
- [ ] Clean up resize listener on shutdown.

**Tasks — BootScene:**
- [ ] Keep all texture generation at current reference sizes (no changes to generation code).
- [ ] Document in a comment that scenes are responsible for scaling textures via `setDisplaySize()`.
- [ ] Verify `pixelArt: true` + `roundPixels: true` in game config produces clean scaling at 1920x1080.

**Tests:**
- [ ] Trading Post layout tests pass at multiple viewports.
- [ ] Existing Playwright test passes.

### Phase 6: Multi-Viewport Playwright Tests (~10%)

**Goal:** Automated regression tests at 5 viewport configurations.

**Files:**
- `playwright.config.ts` — Modify
- `tests/e2e/mobile-smoke.spec.ts` — Extend
- `tests/e2e/responsive.spec.ts` — Create

**Tasks:**
- [ ] Add viewport projects to `playwright.config.ts`:
  - `mobile-small`: 375x667 (iPhone SE portrait)
  - `mobile-large`: 393x852 (iPhone 14 Pro portrait)
  - `tablet`: 768x1024 (iPad portrait)
  - `desktop`: 1920x1080
  - `phone-landscape`: 667x375
- [ ] Ensure existing `mobile-smoke.spec.ts` works across all viewport projects.
- [ ] Create `responsive.spec.ts`:
  - Canvas fills viewport (width/height within 5% of viewport dimensions).
  - On phone-landscape viewport, `#rotate-prompt` is visible.
  - On desktop viewport, `#rotate-prompt` is NOT visible.
  - `data-scene="Barn"` attribute set after boot on all viewports.
- [ ] `npm run test:e2e` passes.

### Phase 7: agent-browser Visual Verification (~5%)

**Goal:** Manual screenshot proof across all viewports.

**Tasks:**
- [ ] Run agent-browser manually against dev server at 5 viewports:
  1. iPhone SE (375x667) — barn empty + barn at capacity 8
  2. iPhone 14 Pro (393x852) — barn with 2 cards + Trading Post
  3. iPad (768x1024) — barn at capacity 8
  4. Desktop (1920x1080) — barn empty + barn at capacity 8 + Trading Post
  5. Phone landscape (667x375) — rotate prompt visible
- [ ] Visually verify: no clipping, no overlap, no black bars on desktop, rotate prompt on landscape.
- [ ] Attach screenshots to PR.
- [ ] If agent-browser is unavailable, fall back to Playwright `page.screenshot()` at each viewport.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `index.html` | Modify | Full-viewport container CSS, safe-area padding, rotate prompt overlay |
| `src/main.ts` | Modify | JS resize listener for rotate prompt visibility |
| `src/config/game.ts` | Modify | Switch `Scale.FIT` → `Scale.RESIZE`, remove fixed width/height |
| `src/config/constants.ts` | Modify | Rename `WIDTH`/`HEIGHT` → `REF_WIDTH`/`REF_HEIGHT` |
| `src/scenes/barnLayout.ts` | Major rewrite | All functions gain `(cw, ch)`, proportional positioning, breakpoint-snapped slot sizes |
| `src/scenes/tradingPostLayout.ts` | Major rewrite | All functions gain `(cw, ch)`, responsive grid columns |
| `src/scenes/BarnScene.ts` | Modify | Pass canvas dims to layout, add resize handler, scale environment textures, fix text sizing |
| `src/scenes/TradingPostScene.ts` | Modify | Pass canvas dims to layout, add resize handler, scale background |
| `src/scenes/BootScene.ts` | Minor | Add comments documenting that scenes scale textures via setDisplaySize |
| `src/scenes/barnLayout.test.ts` | Extend | Multi-viewport tests: overlap, bounds, tap targets, backward compatibility |
| `src/scenes/tradingPostLayout.test.ts` | Create | Viewport-aware Trading Post layout tests |
| `playwright.config.ts` | Modify | Add 5 viewport projects |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Compatibility with multi-viewport projects |
| `tests/e2e/responsive.spec.ts` | Create | Canvas fill, rotate prompt, scene boot across viewports |

---

## Definition of Done

1. **Desktop fills browser**: On 1920x1080, the game canvas fills the entire viewport. No black bars. Content uses the available width with appropriate spacing.
2. **iPhone SE fits**: At 375x667, all UI elements visible without scrolling. Action bar on-screen. Cards at capacity 8 don't overlap farmhouse or info panel.
3. **iPhone 14 Pro clean**: At 393x852, the game looks proportionally identical to the 390x844 reference.
4. **iPad proportional**: At 768x1024, game scales up cleanly. Touch targets >= 44px. Text readable.
5. **Phone landscape prompt**: At 667x375 (any landscape with shortest dimension < 600px), "Rotate your device" overlay is visible.
6. **No clipping/overlap**: At all 5 viewports × capacities 5-8, no text truncation, no image overlap, no UI extending beyond canvas.
7. **Info panel above action bar**: At every viewport, info panel never overlaps interactive action buttons.
8. **Layout backward compatibility**: `barnLayout` functions called with `(capacity, 390, 844)` produce results within 2px of current hardcoded values.
9. **Resize responsiveness**: Resizing the browser reflows layout without page reload. Elements reposition, no new objects created.
10. **Minimum tap targets**: All interactive elements (buttons, cards, tabs) >= 44x44px at every viewport.
11. **Resize + animation safety**: Resize during active animation is deferred until animation completes. No visual glitches or state corruption.
12. **Existing tests pass**: `npm run test` and `npm run test:e2e` green.
13. **CI green**: `npm run ci` passes. Bundle budget met.
14. **Playwright multi-viewport**: 5 viewport projects run. All tests pass.
15. **agent-browser screenshots**: Screenshots at 5 viewports captured and reviewed (manual, attached to PR).
16. **No new npm dependencies**: Zero additions to package.json. agent-browser used externally.
17. **Game logic untouched**: No changes to `src/game/*` files.
18. **Performance**: Layout reflow completes in < 100ms with no frame drops below 30fps.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **RESIZE mode breaks pixel-art rendering** | Medium | High | Test immediately in Phase 2. `pixelArt: true` + `roundPixels: true` should handle nearest-neighbor scaling. If textures blur at non-integer scale factors, set `resolution: window.devicePixelRatio` in game config. |
| **Proportional math produces fractional pixel jitter** | Medium | Low | All layout functions use `Math.round()`. Phaser's `roundPixels: true` handles sub-pixel rendering. |
| **LAYOUT.CANVAS rename breaks consumers** | Medium | Medium | Phase 2 starts with an explicit consumer audit (grep all references). TypeScript compiler will catch most missed renames. |
| **Hardcoded overlay positions in BarnScene outside layout helpers** | High | Medium | BarnScene (1820 lines) has many inline coordinates. Phase 4 must audit all `setPosition()` and `toRect()` calls, not just layout function calls. Budget extra time. |
| **Resize during animation causes visual glitches** | Medium | Medium | Skip resize while `isAnimating`. Queue a single deferred resize. Apply after animation callback fires. |
| **Reposition-on-resize misses some game objects** | Medium | Medium | Keep a registry of all repositionable objects in each scene. The `applyLayout` method iterates the registry. Missed objects show up immediately in multi-viewport testing. |
| **Desktop wide layout makes cards/text too spread out** | Medium | Low | Cap overlay max width at 600px. Slot grid centers horizontally. Resource banner has max-width. Test at 1920x1080 early. |
| **Text illegible at smallest viewport (375x667)** | Medium | Medium | 10px font floor. All text uses `scaledFont()`. Test font readability at iPhone SE viewport. |
| **Existing Playwright tests break during RESIZE migration** | Medium | Medium | Keep original 375x667 viewport as a project. Run existing tests at each phase to catch regressions early. |
| **agent-browser unavailable or API changed** | Low | Low | Playwright screenshot tests are the primary safety net. agent-browser is manual and optional. |
| **Scope creep into layout redesign** | Medium | High | This sprint changes positioning math, not visual design. No new UI elements, no redesigned panels. The aesthetic is unchanged — only sizing/positioning adapts. |
| **Rotate prompt overlay doesn't suppress touch input** | Low | Medium | Add `pointer-events: all` to `#rotate-prompt`. Verify taps don't reach the Phaser canvas. |
| **Mobile browser toolbar changes viewport height dynamically** | Medium | Low | Using `100dvh` in CSS accounts for dynamic viewport. RESIZE mode fires resize events on toolbar show/hide. |

---

## Security Considerations

- Static client-only site. No backend, auth, or secret handling.
- No new runtime dependencies.
- The rotate prompt is pure CSS/DOM — no user input handling changes.
- CSS `env(safe-area-inset-*)` usage is standard and poses no security concern.
- agent-browser runs locally on the developer's machine, never in production.

---

## Dependencies

- **Existing stack**: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Phaser Scale.RESIZE**: Built-in to Phaser 3.80.x, no additional APIs needed
- **agent-browser**: External manual tool (https://github.com/vercel-labs/agent-browser). Not a project dependency.
- **No new npm dependencies.**

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|-----------|
| Should desktop use a wider layout or centered portrait column? | **Wide layout.** User confirmed: fill the entire browser. |
| Should landscape show a rotate prompt or a reorganized layout? | **Rotate prompt.** Pragmatic scope control. Landscape layout deferred. |
| How should agent-browser be integrated? | **Manual external tool.** Not a dependency or CI step. |
| Should slot sizes scale continuously or snap to breakpoints? | **Breakpoint snapping** at 80/96/112px. Cleaner pixel-art rendering. |
| How should resize interact with active animations? | **Debounce + defer.** Skip during animation, apply after completion. |
| Should font sizes scale continuously? | **Yes**, with 10px floor and 2x ceiling. |
| What about very large monitors (4K, ultrawide)? | Content scales but overlays cap at 600px width. Barn plank background tiles/stretches to fill. Revisit if pixel art looks too blocky. |
