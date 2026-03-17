# Sprint 004: Responsive Layout & Visual Polish

## Overview

Sprint 003 delivered active abilities, Legendary Animals, and card readability improvements on the fixed 390x844 logical canvas. The game is functionally complete for single-player, but it has serious presentation problems across device classes:

- **Desktop**: The game renders as a small portrait rectangle centered in the browser with massive black pillarboxing. On a 1920x1080 monitor, roughly 75% of the screen is unused black space.
- **Phone portrait**: Works on devices close to 390x844, but varies from iPhone SE (375x667) to iPhone 15 Pro Max (430x932). Safe-area insets are declared in CSS but the Phaser canvas does not account for them.
- **Phone landscape**: The game shrinks to a tiny pillarboxed strip. No landscape adaptation exists.
- **Clipping/overlap**: Sprint 003 increased card density (96x104 cards, info panel at y=556, ability UI overlays, Legendary glow effects). At barn capacities 7-8, the third row of slots (y=392) collides with the farmhouse (y=560) and the info panel (y=556). Resource banner text at the top overlaps the noise meter. The action bar buttons clip below the visible area on shorter devices like iPhone SE.

This sprint fixes all of the above with three strategies:

1. **Switch from `Scale.FIT` to `Scale.RESIZE`** so the Phaser canvas always fills 100% of the container, and layout helpers receive the actual canvas dimensions rather than a fixed 390x844.
2. **Make all layout functions viewport-aware** by accepting `(canvasWidth, canvasHeight)` and computing positions as proportional offsets rather than hardcoded pixel values.
3. **Add landscape detection** with a "rotate your device" overlay on phones, while allowing landscape to work naturally on desktop/tablet.
4. **Verify everything with agent-browser** screenshots across 5 viewport sizes.

No new npm dependencies. No game logic changes. All modifications are in config, layout, scene rendering, CSS, and testing.

---

## Use Cases

1. **Desktop full-screen** -- Player opens the game in Chrome on a 1920x1080 monitor. The game fills the browser window. The barn, cards, and UI elements scale proportionally. No black bars wider than minor pillarboxing to maintain the portrait aspect ratio. The game is centered and visually balanced.

2. **Phone portrait (various sizes)** -- Player opens on iPhone SE (375x667). All UI elements fit without clipping. The action bar is fully visible. Cards at capacity 8 do not overlap the farmhouse or info panel. Player opens on iPhone 15 Pro Max (430x932) and the game fills the taller viewport with proportional spacing.

3. **Phone landscape prompt** -- Player rotates their phone to landscape. A full-screen overlay appears: "Rotate your device" with a phone icon. The game does not attempt to render a landscape layout. On tablets (shortest dimension >= 600px), no prompt appears; the game scales naturally.

4. **Tablet scaling** -- Player opens on iPad (768x1024). The game scales up to fill the viewport height, centered horizontally. No clipping. Touch targets remain >= 44px.

5. **No clipping at any capacity** -- Player upgrades barn to capacity 8. Three rows of cards (3+3+2) render with correct spacing. The farmhouse, action bar, and info panel do not overlap card rows. Text on resource banners, noise meter, and capacity indicator does not truncate.

6. **Visual verification** -- Developer runs agent-browser scripts against the dev server and captures screenshots at 5 viewports proving all the above.

---

## Architecture

### Scaling Strategy: `Scale.RESIZE` with Proportional Layout

The current approach uses `Scale.FIT` with a fixed 390x844 logical resolution. Phaser scales the canvas uniformly to fit the container, which means the aspect ratio is locked and any viewport that does not match 390:844 gets pillarboxing.

The new approach uses `Scale.RESIZE`. In this mode, Phaser sets the canvas to match the container's pixel dimensions exactly (no pillarboxing). The logical resolution changes dynamically. Scene code must query `this.scale.width` / `this.scale.height` to get the current canvas size and position elements proportionally.

To keep layout math clean and testable:

- `LAYOUT.CANVAS.WIDTH` and `LAYOUT.CANVAS.HEIGHT` become **reference dimensions** (the baseline the proportional math is designed around), not the actual canvas size.
- All layout functions gain `(canvasWidth: number, canvasHeight: number)` parameters.
- Positions are computed as proportional offsets from the reference: `x = (refX / REF_WIDTH) * canvasWidth`.
- Slot sizes, badge sizes, and minimum tap targets have **pixel floors** to prevent them from becoming too small on tiny viewports.

### Aspect Ratio Clamping

To prevent extreme distortion on ultrawide monitors or unusual aspect ratios:

- **Min aspect ratio**: 9:16 (portrait phone). Canvas width is clamped so the game does not stretch wider than 9:16 relative to height.
- **Max aspect ratio**: 3:4 (tablet-ish). Canvas width is clamped so the game does not become too squat.

Clamping is achieved via CSS `max-width` and `max-height` on `#game-container`, not in Phaser code. The Phaser canvas fills the container; the container enforces aspect bounds.

### Landscape Detection

Rather than building a full landscape layout (high effort, low value for a portrait-designed game):

- On resize, check if `window.innerWidth > window.innerHeight` AND the shortest dimension < 600px (phone threshold).
- If true, show a CSS overlay (`#rotate-prompt`) on top of the game container. Phaser continues running underneath but is visually hidden.
- If false (portrait, or landscape on a tablet/desktop), hide the overlay.

This is pure DOM/CSS -- no Phaser code involved.

### Layout Refactoring Pattern

Before (hardcoded):
```typescript
export const getResourceBannerPosition = (_capacity: number): Rect => {
  return toRect(16, 16, 358, 64);
};
```

After (proportional):
```typescript
export const getResourceBannerPosition = (
  _capacity: number,
  cw: number,
  ch: number,
): Rect => {
  const x = Math.round(cw * 0.041);  // 16/390
  const y = Math.round(ch * 0.019);  // 16/844
  const w = Math.round(cw * 0.918);  // 358/390
  const h = Math.round(ch * 0.076);  // 64/844
  return toRect(x, y, w, h);
};
```

Slot sizes use a hybrid approach: proportional positioning, but with a minimum pixel size to maintain readability:

```typescript
const slotW = Math.max(72, Math.round(cw * (LAYOUT.SLOT.WIDTH / REF_W)));
const slotH = Math.max(78, Math.round(ch * (LAYOUT.SLOT.HEIGHT / REF_H)));
```

### Clipping Fix Strategy

The root cause of overlap at capacities 7-8 is that the third card row (y=392, h=104) extends to y=496, while the farmhouse starts at y=560 and the info panel at y=556. With only 60px between the bottom of row 3 and the farmhouse, any slight variation causes visual crowding. Additionally, the action bar at y=758 is below the fold on iPhone SE (667px viewport).

Fixes:

1. **Compress vertical spacing** at higher capacities. The `ROW_GAP` between card rows reduces from 14px to 8px when capacity >= 7 (proportional).
2. **Push farmhouse and info panel below the fold** on small viewports. The farmhouse moves to `ch * 0.70` instead of fixed y=560. The info panel anchors to the bottom of the canvas (`ch - panelHeight`).
3. **Action bar anchors to bottom** at `ch - 86` (56px button + 30px bottom safe area) instead of fixed y=758. This ensures it is always visible regardless of viewport height.
4. **Resource banner uses flex-like wrapping**: if canvas width < 360, the Legendary counter moves to a second line below the Mischief/Hay row.

### Generated Textures

`BootScene` generates textures at fixed pixel sizes (e.g., buttons at 350x56, barn plank at 390x844). With `Scale.RESIZE`, the canvas can be larger or smaller than 390x844. Two options:

- **Option A**: Generate textures at the reference size and use `setDisplaySize()` to scale them in scenes. Simpler, but pixel art may blur at large scales.
- **Option B**: Generate textures at the actual canvas size in `create()`. Crisper, but requires regeneration on resize.

**Chosen: Option A** with one exception. The full-canvas barn plank background is regenerated at actual canvas size on resize (it is the only texture that must tile to the edges). All other textures (cards, badges, buttons) are generated at reference size and scaled via `setDisplaySize()`, which Phaser handles well with `pixelArt: true` (nearest-neighbor sampling).

### Scene Resize Handling

Both `BarnScene` and `TradingPostScene` need to respond to canvas resize events. Phaser's `Scale.RESIZE` mode emits a `resize` event on the scale manager. Each scene listens:

```typescript
this.scale.on('resize', this.handleResize, this);
```

The `handleResize` method calls a full re-layout: repositions all game objects using the updated `this.scale.width` / `this.scale.height`. This is not a full `create()` -- it reuses existing game objects and just updates their positions and sizes.

### Verification with agent-browser

agent-browser (https://github.com/vercel-labs/agent-browser) is a headless browser tool for AI-driven visual testing. For this sprint:

- Install as a dev dependency (or use npx).
- Create a `tests/visual/` directory with viewport verification scripts.
- Each script: starts the dev server, sets a viewport size, waits for `__GAME_READY__`, captures a screenshot.
- Screenshots are captured at 5 viewports and manually inspected (not pixel-diff -- the game has animations).

Viewports:
| Name | Width | Height | Type |
|------|-------|--------|------|
| iPhone SE | 375 | 667 | Phone portrait |
| iPhone 14 Pro | 393 | 852 | Phone portrait |
| iPad | 768 | 1024 | Tablet portrait |
| Desktop | 1920 | 1080 | Desktop landscape |
| Phone landscape | 667 | 375 | Phone landscape |

---

## Implementation

### Phase 1: CSS Container & Landscape Overlay (~15%)

**Goal:** Make `#game-container` fill the viewport correctly and add the landscape rotation prompt.

**Files:**
- `index.html` -- Modify
- `src/main.ts` -- Modify

**Tasks:**
- [ ] Update `#game-container` CSS: remove `padding-bottom: env(safe-area-inset-bottom)` (Phaser will handle safe areas in layout math). Add `max-width` and `max-height` constraints for aspect ratio clamping. Center the container with flexbox on the body.
- [ ] Add `#rotate-prompt` div to `index.html`: hidden by default, absolute-positioned over the game container, contains "Rotate your device" text and a CSS-only phone rotation icon.
- [ ] Add CSS media query: `@media (orientation: landscape) and (max-height: 599px)` to show `#rotate-prompt` and hide the canvas.
- [ ] Add JS resize listener in `main.ts` that toggles `#rotate-prompt` visibility based on `window.innerWidth > window.innerHeight && Math.min(window.innerWidth, window.innerHeight) < 600`. This handles cases where the CSS media query is insufficient (e.g., soft keyboard changes).
- [ ] Verify: open in Chrome DevTools at 667x375 (phone landscape) -- see rotate prompt. At 1024x768 (tablet landscape) -- no prompt, game visible.

**Tests:**
- [ ] Manual verification in Chrome DevTools (Phase 1 is CSS/DOM only).

### Phase 2: Phaser Scale Mode & Config Changes (~10%)

**Goal:** Switch Phaser from `Scale.FIT` to `Scale.RESIZE` and update game config.

**Files:**
- `src/config/game.ts` -- Modify
- `src/config/constants.ts` -- Modify

**Tasks:**
- [ ] Change `scale.mode` from `Phaser.Scale.FIT` to `Phaser.Scale.RESIZE` in `createGameConfig()`.
- [ ] Remove `scale.width` and `scale.height` (not used with RESIZE mode; the canvas inherits container dimensions).
- [ ] Keep `scale.autoCenter: Phaser.Scale.CENTER_BOTH` and `scale.parent: 'game-container'`.
- [ ] In `constants.ts`, rename `LAYOUT.CANVAS.WIDTH`/`HEIGHT` to `LAYOUT.CANVAS.REF_WIDTH`/`REF_HEIGHT` (reference dimensions for proportional math). Value stays 390/844.
- [ ] Add `LAYOUT.CANVAS.MIN_SLOT_W: 72`, `LAYOUT.CANVAS.MIN_SLOT_H: 78` as pixel floor constants.
- [ ] Add `LAYOUT.CANVAS.PHONE_LANDSCAPE_THRESHOLD: 600` constant.
- [ ] Update all imports of `LAYOUT.CANVAS.WIDTH`/`HEIGHT` across the codebase (BarnScene, TradingPostScene, BootScene, layout files) to use `REF_WIDTH`/`REF_HEIGHT` or `this.scale.width`/`this.scale.height` as appropriate.

**Tests:**
- [ ] `npm run typecheck` passes after rename.
- [ ] Game boots without errors in dev server at default viewport.

### Phase 3: Layout Functions Refactoring (~25%)

**Goal:** Make all layout helper functions viewport-aware.

**Files:**
- `src/scenes/barnLayout.ts` -- Major rewrite
- `src/scenes/tradingPostLayout.ts` -- Major rewrite
- `src/scenes/barnLayout.test.ts` -- Extend
- `src/config/constants.ts` -- Minor adjustments

**Tasks:**
- [ ] Add `canvasWidth` (`cw`) and `canvasHeight` (`ch`) parameters to every exported function in `barnLayout.ts`:
  - `getDynamicSlotRects(capacity, cw, ch)`
  - `getResourceBannerPosition(capacity, cw, ch)`
  - `getNoiseMeterPosition(capacity, cw, ch)`
  - `getDeckStackPosition(capacity, cw, ch)`
  - `getFarmhouseRect(capacity, cw, ch)`
  - `getFarmhouseWindowRect(capacity, cw, ch)`
  - `getActionBarPosition(capacity, dualButtons, cw, ch)`
  - `getOverlayBounds(capacity, cw, ch)`
  - `getInfoPanelBounds(cw, ch)`
- [ ] Implement proportional math in each function:
  - Slot positions: compute column centers as `cw * (refX / 390)`, row Y positions as `ch * (refY / 844)`. Apply `MIN_SLOT_W`/`MIN_SLOT_H` floors.
  - Slot gap compression: reduce `ROW_GAP` proportionally, with extra reduction at capacity >= 7.
  - Farmhouse: anchor at `ch * 0.663` (560/844) with proportional width/height.
  - Action bar: anchor at `ch - 86` to always be visible.
  - Info panel: anchor at `ch - panelHeight` to slide up from bottom.
  - Overlay bounds: proportional, centered, with max width capped at 400px for readability on large screens.
- [ ] Add `canvasWidth` and `canvasHeight` parameters to every exported function in `tradingPostLayout.ts`:
  - `getCurrencyHeaderPosition(cw, ch)`
  - `getTabButtonPositions(cw, ch)`
  - `getShopGridPositions(itemCount, cw, ch)`
  - `getCapacityUpgradePosition(cw, ch)`
  - `getStartNightButtonPosition(cw, ch)`
  - `getPennedUpPosition(cw, ch)`
- [ ] Implement proportional math in Trading Post layout functions. Shop grid uses proportional card sizes with a minimum width of 150px. If canvas is very wide (desktop), grid recenters.
- [ ] Verify: no two layout rects overlap when called with capacities 5-8 at viewports 375x667, 393x852, 768x1024, and 1920x1080.

**Tests:**
- [ ] Update `barnLayout.test.ts`: all existing tests now pass `(capacity, 390, 844)` and produce identical results to the old hardcoded values (backward compatibility).
- [ ] Add new test: `getDynamicSlotRects(8, 375, 667)` -- all 8 slots fit within the canvas, no overlap with farmhouse or action bar.
- [ ] Add new test: `getDynamicSlotRects(8, 1920, 1080)` -- slot size is proportionally larger, slots centered horizontally.
- [ ] Add new test: `getActionBarPosition(5, false, 375, 667)` -- primary button bottom edge < 667 (visible on iPhone SE).
- [ ] Add new test: info panel does not overlap action bar at any viewport.
- [ ] Add new test: minimum tap target (44px) is respected for all interactive rects at smallest viewport (375x667).
- [ ] Add `tradingPostLayout.test.ts`: grid positions at multiple viewports, no overlap, all within canvas.

### Phase 4: Scene Updates (~30%)

**Goal:** Update BarnScene, TradingPostScene, and BootScene to use the new proportional layout and respond to resize events.

**Files:**
- `src/scenes/BarnScene.ts` -- Modify
- `src/scenes/TradingPostScene.ts` -- Modify
- `src/scenes/BootScene.ts` -- Modify

**Tasks:**

#### BootScene
- [ ] Update barn plank texture generation to use a fixed large size (e.g., 1920x1920) that can be scaled/cropped in scenes, rather than exactly 390x844.
- [ ] Alternatively, keep reference-sized textures and rely on `setDisplaySize()` in scenes. Evaluate pixel art clarity. If acceptable, keep this simpler approach.
- [ ] Update all hardcoded 390-wide textures (rafter, floor straw) to reference size and document that scenes will scale them.

#### BarnScene
- [ ] In `create()`, read `this.scale.width` and `this.scale.height` and pass to all layout functions instead of using `LAYOUT.CANVAS.WIDTH`/`HEIGHT`.
- [ ] Add `this.scale.on('resize', this.handleResize, this)` listener.
- [ ] Implement `handleResize(gameSize: Phaser.Structs.Size)`: store new width/height, reposition all HUD elements, slot images, environment images, and action bar buttons. Do NOT recreate game objects -- only update `.setPosition()` and `.setDisplaySize()`.
- [ ] Scale the barn plank background to fill the canvas: `barnPlank.setDisplaySize(cw, ch)`.
- [ ] Scale the rafter to canvas width: `rafter.setDisplaySize(cw, rafterH)`.
- [ ] Scale the floor straw to canvas width.
- [ ] Fix resource banner: use proportional text positioning. If `cw < 360`, stack Mischief/Hay and Legendary counter vertically. Use `setFontSize()` proportional to canvas scale.
- [ ] Fix noise meter: proportional position, scale dots if canvas is smaller.
- [ ] Fix action bar: always anchor to `ch - 86`. Scale button width to `cw - 40` (20px padding each side). On dual-button layout, each button gets `(cw - 54) / 2` width.
- [ ] Fix card rendering in slots: cards use `setDisplaySize(slotW, slotH)` from the proportional slot rects. Text within cards scales proportionally.
- [ ] Fix overlay containers (bust, summary, info panel, ability, win): reposition and resize on resize.
- [ ] Remove `this.scale.on('resize', ...)` listener in `shutdown` or `destroy` to prevent leaks.

#### TradingPostScene
- [ ] In `create()`, read `this.scale.width` and `this.scale.height` and pass to all layout functions.
- [ ] Add `this.scale.on('resize', this.handleResize, this)` listener.
- [ ] Implement `handleResize`: reposition header, currency display, tabs, shop grid, capacity button, start night button.
- [ ] Scale background rectangle to fill canvas.
- [ ] Shop grid: cards use proportional sizes. On wide viewports (desktop), consider 3 columns if canvas width > 600px.
- [ ] Fix text sizing: header and button text scale proportionally, with minimum font sizes for readability.
- [ ] Clean up resize listener on scene shutdown.

**Tests:**
- [ ] Manual testing at all 5 viewports in Chrome DevTools.
- [ ] Existing unit tests and Playwright test still pass (regression check).

### Phase 5: Playwright Multi-Viewport Tests (~10%)

**Goal:** Extend the Playwright configuration and tests to cover multiple viewports.

**Files:**
- `playwright.config.ts` -- Modify
- `tests/e2e/mobile-smoke.spec.ts` -- Extend
- `tests/e2e/responsive.spec.ts` -- Create

**Tasks:**
- [ ] Add viewport projects to `playwright.config.ts`:
  ```typescript
  projects: [
    { name: 'iphone-se', use: { viewport: { width: 375, height: 667 } } },
    { name: 'iphone-14-pro', use: { viewport: { width: 393, height: 852 } } },
    { name: 'ipad', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'phone-landscape', use: { viewport: { width: 667, height: 375 } } },
  ]
  ```
- [ ] Update `mobile-smoke.spec.ts` to work across all viewport projects (it should already, since it just checks for canvas and `__GAME_READY__`).
- [ ] Create `responsive.spec.ts`:
  - Test: canvas element fills the viewport (width/height within 5% of viewport dimensions, accounting for aspect ratio clamping).
  - Test: on phone-landscape viewport, `#rotate-prompt` is visible.
  - Test: on desktop viewport, `#rotate-prompt` is NOT visible.
  - Test: `data-scene="Barn"` attribute is set after boot on all viewports.
- [ ] Verify all tests pass: `npm run test:e2e`.

### Phase 6: agent-browser Visual Verification (~10%)

**Goal:** Capture screenshot proof across all 5 viewports using agent-browser.

**Files:**
- `tests/visual/capture-viewports.ts` -- Create
- `tests/visual/README.md` -- Create (only if user requests)

**Tasks:**
- [ ] Create `tests/visual/capture-viewports.ts` script that:
  1. Starts the Vite dev server (or expects it running).
  2. For each viewport (iPhone SE, iPhone 14 Pro, iPad, Desktop, Phone landscape):
     a. Opens the game URL with `?seed=sprint4-showcase`.
     b. Sets the viewport size.
     c. Waits for `__GAME_READY__`.
     d. Captures screenshot to `tests/visual/screenshots/{viewport-name}-barn.png`.
  3. For the iPhone 14 Pro viewport additionally:
     a. Draws 2 cards (clicks draw button twice with appropriate waits).
     b. Captures `iphone14-barn-2cards.png`.
     c. Navigates to Trading Post (play to summary, continue).
     d. Captures `iphone14-trading-post.png`.
- [ ] Run the capture script and verify:
  - Desktop screenshot: game fills most of the viewport, no excessive black bars.
  - iPhone SE: all UI visible, no clipping at bottom.
  - iPhone 14 Pro: clean presentation, cards readable.
  - iPad: proportional scaling, centered.
  - Phone landscape: rotate prompt visible, game behind it.
- [ ] Document viewport screenshots in the PR description.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `index.html` | Modify | Flexbox centering, aspect ratio clamping via CSS, rotate prompt overlay, landscape media query |
| `src/main.ts` | Modify | Add JS resize listener for rotate prompt visibility toggle |
| `src/config/game.ts` | Modify | Change `Scale.FIT` to `Scale.RESIZE`, remove fixed width/height |
| `src/config/constants.ts` | Modify | Rename `WIDTH`/`HEIGHT` to `REF_WIDTH`/`REF_HEIGHT`, add min size constants, phone landscape threshold |
| `src/scenes/barnLayout.ts` | Major rewrite | All functions gain `(cw, ch)` params, proportional positioning, min size floors |
| `src/scenes/tradingPostLayout.ts` | Major rewrite | All functions gain `(cw, ch)` params, proportional positioning |
| `src/scenes/BarnScene.ts` | Modify | Pass canvas dimensions to layout, add resize listener, scale environment textures, fix text sizing |
| `src/scenes/TradingPostScene.ts` | Modify | Pass canvas dimensions to layout, add resize listener, scale background, fix text sizing |
| `src/scenes/BootScene.ts` | Modify | Generate textures at reference size with documentation that scenes scale via `setDisplaySize()` |
| `src/scenes/barnLayout.test.ts` | Extend | Update calls with `(cw, ch)`, add multi-viewport overlap tests, min tap target tests |
| `src/scenes/tradingPostLayout.test.ts` | Create | Viewport-aware layout tests for Trading Post grid |
| `playwright.config.ts` | Modify | Add 5 viewport projects |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Ensure compatibility with multi-viewport projects |
| `tests/e2e/responsive.spec.ts` | Create | Canvas fill, rotate prompt, scene boot across viewports |
| `tests/visual/capture-viewports.ts` | Create | agent-browser screenshot capture script for 5 viewports |

---

## Definition of Done

1. **Desktop fills browser**: On a 1920x1080 viewport, the game canvas occupies at least 80% of the viewport area (height-limited with proportional width). No black bars wider than aspect-ratio pillarboxing.
2. **iPhone SE fits**: At 375x667, all UI elements are visible without scrolling. Action bar is fully on-screen. Cards at capacity 8 do not overlap the farmhouse or info panel.
3. **iPhone 14 Pro clean**: At 393x852, the game looks proportionally identical to the 390x844 reference design.
4. **iPad proportional**: At 768x1024, the game scales up cleanly. Touch targets are >= 44px. No blurry text.
5. **Phone landscape prompt**: At 667x375 (or any landscape viewport with shortest dimension < 600px), a "Rotate your device" overlay is visible. The game is not playable in this state.
6. **No clipping/overlap**: At all 5 viewports and all barn capacities (5-8), no text truncation, no image overlap, no UI elements extending beyond the canvas edge.
7. **Layout backward compatibility**: When called with `(capacity, 390, 844)`, all layout functions produce results within 2px of the old hardcoded values.
8. **Resize responsiveness**: Resizing the browser window live causes the game to reflow without a page reload. Elements reposition smoothly.
9. **Existing tests pass**: `npm run test` and `npm run test:e2e` green.
10. **CI green**: `npm run ci` passes. Bundle budget met (no new dependencies, layout changes are code-only).
11. **agent-browser screenshots captured**: 5 viewport screenshots plus 2 interaction screenshots captured and reviewed.
12. **Minimum tap targets**: All interactive elements (buttons, cards, tabs) maintain >= 44x44px tap area at every viewport size.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **`Scale.RESIZE` breaks pixel art rendering** | Medium | High | Test immediately in Phase 2. `pixelArt: true` + `roundPixels: true` should handle nearest-neighbor scaling. If textures blur, switch to generating textures at actual canvas size (Option B in architecture). |
| **Proportional layout produces fractional pixels causing jitter** | Medium | Low | All layout functions use `Math.round()`. Phaser's `roundPixels: true` handles sub-pixel rendering. |
| **Resize handler causes performance issues on rapid window resize** | Low | Medium | Debounce the resize handler (Phaser's scale manager already debounces to 1 frame). Do not recreate game objects on resize -- only reposition. |
| **Existing hardcoded text sizes look wrong at non-reference viewports** | High | Medium | Compute font sizes proportionally: `baseFontSize * (canvasHeight / REF_HEIGHT)`. Apply minimum font sizes (10px floor). |
| **BarnScene re-layout during active tweens causes visual glitches** | Medium | Medium | Skip resize handling while `isAnimating` is true. Queue a single re-layout for when animation completes. |
| **agent-browser API instability or breaking changes** | Low | Low | agent-browser is a verification tool, not a runtime dependency. If it does not work, fall back to manual Playwright screenshots with `page.screenshot()`. |
| **Scope creep into layout redesign** | Medium | High | This sprint changes positioning math, not visual design. No new UI elements, no redesigned panels. The aesthetic is unchanged; only the sizing/positioning adapts. |
| **Clipping fixes at one viewport introduce overlap at another** | Medium | High | Unit tests cover layout rects at all 4 portrait viewports for all capacities 5-8. Every layout change must pass all viewport tests before proceeding. |

---

## Security Considerations

- Static client-only site. No backend, auth, or secret handling.
- No new runtime dependencies. agent-browser is dev-only.
- No user input changes. The rotate prompt is pure CSS/DOM.
- CSS `env(safe-area-inset-bottom)` usage is standard and poses no security concern.

---

## Dependencies

- **Existing stack**: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Phaser `Scale.RESIZE` mode**: Built-in to Phaser 3.80.x. No additional APIs needed.
- **agent-browser**: https://github.com/vercel-labs/agent-browser -- used for visual verification only. Installed as a dev dependency or run via npx. Not bundled in production.
- **No new npm runtime dependencies.**

---

## Open Questions

1. **Should `Scale.RESIZE` replace `Scale.FIT`, or should we use `Scale.ENVELOP` instead?** `ENVELOP` fills the container without pillarboxing but may crop content. `RESIZE` changes the logical resolution, requiring all layout to be proportional. `RESIZE` is more work but gives pixel-perfect control. Proposed: `RESIZE`.

2. **Should the farmhouse be hidden at small viewports (iPhone SE)?** The farmhouse occupies ~116px of vertical space. On a 667px viewport with capacity 8, vertical space is tight. Option A: always show farmhouse but shrink it. Option B: hide farmhouse below a viewport height threshold (e.g., < 700px). Proposed: shrink proportionally, do not hide.

3. **Should desktop use a wider content area or maintain the phone-width column?** On a 1920x1080 viewport, the game could either: (A) render a phone-width column centered in the viewport (max ~500px wide), or (B) spread content across a wider area with larger cards. Proposed: (A) maintain a portrait column with aspect ratio clamping (max 9:19.5 to 3:4), centered. This avoids redesigning every layout for wide screens.

4. **How should font scaling work?** Options: (A) CSS-based rem/vw units (not available in Phaser text), (B) compute font size as `baseSize * scaleFactor` where `scaleFactor = canvasHeight / REF_HEIGHT`, (C) fixed font sizes with `setScale()` on text objects. Proposed: (B) computed font sizes, with a floor of 10px and a ceiling of 2x the base size.

5. **Should agent-browser tests run in CI or remain a manual step?** CI integration requires agent-browser to be installable in the GitHub Actions runner. Proposed: manual for Sprint 004, with CI integration deferred to a future sprint if the tool proves reliable.
