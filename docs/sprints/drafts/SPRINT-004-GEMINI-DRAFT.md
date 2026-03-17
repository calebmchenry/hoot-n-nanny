# Sprint 004: Responsive Layout & Visual Polish

## Overview

Sprint 004 fixes the game's broken desktop and landscape experiences and eliminates clipping/overlap bugs introduced as Sprint 003 packed more content into the fixed 390x844 canvas. The deliverable is a game that fills any browser window gracefully — phone portrait, phone landscape, tablet, and desktop — with zero text or image clipping at any barn capacity.

**The controversial stance of this draft:** We should abandon `Phaser.Scale.FIT` and the fixed 390x844 logical canvas entirely. Instead, we adopt `Phaser.Scale.RESIZE` with a dynamic layout system that computes positions from the actual canvas dimensions. This is more work than tweaking the existing scaling mode, but it is the only approach that avoids the fundamental problem: FIT mode always produces pillarboxing on any aspect ratio that differs from the design ratio. A 390x844 canvas FIT-scaled onto a 1920x1080 desktop will always be a narrow strip with massive black bars on the sides. A wider logical resolution (e.g., 430x932) just makes the strip slightly less narrow — it does not solve the problem.

The alternative approaches and why this draft rejects them:

- **Keep 390x844 + FIT, just scale bigger:** Still pillarboxed on desktop. The user complaint ("game should take up the whole browser") is not addressed. This is a non-fix.
- **Wider base like 430x932 + FIT:** Marginally better on modern phones. Still pillarboxed on desktop. Does not solve landscape. Churn for no payoff.
- **FIT with a "max-width" container and decorative side panels:** A CSS hack. The game itself is still a narrow strip; you are just hiding the black bars behind wood-grain borders. Players will see through it.

`RESIZE` mode means the Phaser canvas is always 100% of the container. Layout functions receive the actual canvas `width` and `height` and compute all positions dynamically. The 390x844 constants become the *minimum* supported dimensions, not the only dimensions. On a 1920x1080 desktop, the barn scene uses the full width — slots spread out, the farmhouse moves to the side, the resource banner has room to breathe. On a 375x667 iPhone SE in portrait, the layout compresses to fit. On phone landscape, we show a horizontally reorganized layout rather than a "please rotate" modal — because a "please rotate" screen is a broken product, not a feature.

**Landscape handling:** A "please rotate your device" screen is an admission that the game does not work in landscape. If users rotate their phone, they wanted landscape. This draft provides it: the barn layout reorganizes into a wider, shorter arrangement (2 rows max, 4 columns), the resource banner moves to a sidebar, and the action bar moves to the bottom-right. This takes more layout work but means the game is genuinely usable in every orientation.

**agent-browser:** This draft treats agent-browser as a manual verification tool run by the developer, not a dev dependency or CI step. It is an external Chromium automation tool — adding it to `package.json` is unnecessary and would bloat `node_modules`. Adding it to CI requires a headful browser, which is fragile and slow. The verification workflow is: developer runs agent-browser locally, captures screenshots, attaches them to the PR. Playwright handles automated regression testing for multiple viewports.

---

## Use Cases

1. **Desktop full-screen** — A player opens the game in Chrome on a 1920x1080 monitor. The game fills the entire browser viewport. The barn scene uses the extra horizontal space — slots are well-spaced, the farmhouse sits comfortably to the left, and the resource banner spans the top without crowding. No black bars anywhere.

2. **Phone portrait (iPhone SE to Pro Max)** — The game fills the screen edge-to-edge vertically, respecting safe-area insets. On smaller phones (375px wide), elements compress slightly; on larger phones (430px wide), they have more breathing room. All text remains legible, all tap targets are at least 44x44px.

3. **Phone landscape** — The player rotates their phone. The layout immediately reorganizes: slots arrange in a wider grid (up to 4 columns), the resource banner moves to a left sidebar, action buttons sit bottom-right. The farmhouse shrinks but remains visible. All interactive elements remain usable.

4. **Tablet (iPad 768x1024)** — The game scales up and uses the full viewport. Layout is similar to phone portrait but with more generous spacing and larger visual elements. Card text is comfortably readable.

5. **No clipping at any capacity** — A player upgrades to 8 barn slots. All 8 slots fit without overlapping each other, the resource banner, the noise meter, the farmhouse, or the action bar. Card names, resource badges, and ability strips render fully visible.

6. **Info panel does not overlap action bar** — The player long-presses a card to see its info panel. The panel appears above the action bar, never covering interactive buttons. On smaller screens where space is tight, the panel overlays the barn slots instead.

7. **Trading Post on all viewports** — The shop grid adapts its column count based on available width: 2 columns on narrow/portrait, 3 columns on wider/landscape. Currency header and capacity buttons remain accessible.

8. **Automated multi-viewport regression** — Playwright tests run against 5 viewport configurations. Screenshots are captured and diffed to catch layout regressions.

---

## Architecture

### Scale Mode Migration: FIT to RESIZE

The core architectural change is switching from `Phaser.Scale.FIT` (fixed logical resolution, letterboxed) to `Phaser.Scale.RESIZE` (canvas matches container, scenes receive resize events).

With RESIZE mode:
- `game.scale.width` and `game.scale.height` reflect the actual canvas pixel dimensions
- Scenes receive a `resize(gameSize)` callback whenever the browser window changes
- Layout functions accept `(width, height)` parameters instead of reading from `LAYOUT.CANVAS`
- The LAYOUT constants become minimum/reference values, not absolute positions

### Layout System Redesign

All layout functions change from "return fixed positions" to "return positions given a canvas size." The signature pattern becomes:

```typescript
getDynamicSlotRects(capacity: number, canvasW: number, canvasH: number): Rect[]
```

A new `src/scenes/layoutContext.ts` module provides a thin wrapper that scenes use:

```typescript
export interface LayoutContext {
  width: number;     // actual canvas width
  height: number;    // actual canvas height
  isLandscape: boolean;
  scale: number;     // min(w/390, h/844) — relative to reference dimensions
}

export function getLayoutContext(scene: Phaser.Scene): LayoutContext;
```

Scenes call `getLayoutContext(this)` in `create()` and on `resize` events. Layout helpers receive the context and compute positions proportionally.

### Orientation Handling: Landscape as a First-Class Layout

Instead of a "please rotate" screen, landscape gets its own layout strategy. The `LayoutContext.isLandscape` flag tells layout helpers to reorganize:

**Portrait (aspect < 1.0):**
- Standard vertical layout: banner top, slots middle, farmhouse below, action bar bottom
- Current design, proportionally scaled

**Landscape (aspect >= 1.0):**
- Left sidebar (20% width): resource banner, noise meter, deck count
- Center area (60% width): barn slots in a wider grid (4 columns max)
- Right area (20% width): farmhouse, action buttons stacked vertically
- This ensures everything fits in a wide-and-short viewport

### Responsive Slot Grid

The slot grid is the most layout-sensitive element. Current fixed positions are replaced with a proportional grid calculator:

- **Portrait:** 3 columns (current behavior), rows expand downward. Slot size scales with canvas width: `slotW = Math.min(96, (canvasW - margins) / 3 - gap)`.
- **Landscape:** Up to 4 columns. Slot size scales with canvas height: `slotH = Math.min(104, (canvasH - headerH - actionBarH) / 2 - gap)`. Slot width derived from height to maintain aspect ratio.

### Responsive Text Sizing

All font sizes become proportional. A utility function computes sizes relative to the reference canvas:

```typescript
export function fontSize(basePx: number, ctx: LayoutContext): string {
  const scaled = Math.round(basePx * ctx.scale);
  return `${Math.max(scaled, 8)}px`; // floor at 8px for legibility
}
```

### Resize Event Handling

Phaser's RESIZE mode fires `resize` events on the Scale Manager. Each scene subscribes:

```typescript
create(): void {
  this.scale.on('resize', this.handleResize, this);
  this.buildLayout(); // initial layout
}

handleResize(gameSize: Phaser.Structs.Size): void {
  this.cameras.main.setSize(gameSize.width, gameSize.height);
  this.rebuildLayout(); // tear down and rebuild all positioned elements
}

shutdown(): void {
  this.scale.off('resize', this.handleResize, this);
}
```

The `rebuildLayout` approach (destroy and recreate positioned elements) is simpler than trying to tween/reposition every element individually. Since resize events are infrequent (window drag, orientation change), the cost is negligible.

### Clipping Audit & Fix Strategy

The clipping issues stem from hard-coded positions that assumed 390x844 with generous spacing. With dynamic layout, these are fixed structurally:

1. **Resource banner text overlap** — Banner width is now `canvasW - margins`, text wraps or abbreviates based on available width
2. **Noise meter crowding** — Noise meter repositions relative to banner, with collision avoidance
3. **Info panel overlapping action bar** — Info panel Y is calculated as `actionBarY - panelH - gap`, never overlapping
4. **Card text truncation** — Card names use `setWordWrapWidth(slotW - padding)` and `setFixedSize()` for bounded text
5. **Capacity 7-8 slot overflow** — Dynamic grid calculator guarantees all slots fit within `(canvasW, canvasH - headerH - actionBarH - farmhouseH)`

### Safe Area Handling

The CSS already uses `env(safe-area-inset-bottom)` on the container. For RESIZE mode, the Phaser canvas fills the container (which respects safe areas). The layout system adds internal padding for notch/island devices:

```typescript
const safeTop = parseInt(getComputedStyle(document.documentElement)
  .getPropertyValue('--sat') || '0');
```

Alternatively (simpler): the HTML container already handles safe areas via padding. The Phaser canvas inside the container is already inset. No changes needed beyond what the CSS already provides.

### Trading Post Responsive Grid

The Trading Post switches column count based on width:

- `width < 500`: 2 columns (current)
- `width >= 500 && width < 800`: 3 columns
- `width >= 800`: 4 columns

Card sizes scale proportionally. The capacity upgrade and start-night buttons anchor to the bottom of the viewport.

---

## Implementation

### Phase 1: Scale Mode Migration & Layout Context (~30%)

**Goal:** Switch from FIT to RESIZE, introduce LayoutContext, and verify the game still boots and renders (even if positions are temporarily off).

**Files:**
- `src/config/game.ts` — Modify: change scale mode to RESIZE, remove fixed width/height
- `src/config/constants.ts` — Modify: rename CANVAS to REFERENCE_CANVAS (semantic: these are reference values, not actual sizes)
- `src/scenes/layoutContext.ts` — Create: LayoutContext interface, getLayoutContext(), fontSize() utility
- `src/scenes/barnLayout.ts` — Rewrite: all functions accept LayoutContext, compute positions proportionally
- `src/scenes/tradingPostLayout.ts` — Rewrite: all functions accept LayoutContext
- `src/scenes/barnLayout.test.ts` — Rewrite: test with multiple canvas sizes (390x844, 375x667, 430x932, 1920x1080, 667x375 landscape)

**Tasks:**
- [ ] Change `game.ts`: `mode: Phaser.Scale.RESIZE`, remove `width`/`height` from scale config (Phaser infers from parent container), keep `autoCenter: Phaser.Scale.NO_CENTER` (not needed in RESIZE mode)
- [ ] Update `index.html`: ensure `#game-container` fills viewport with `width: 100vw; height: 100dvh`
- [ ] Create `layoutContext.ts` with `LayoutContext` interface and `getLayoutContext(scene)` factory
- [ ] Rewrite `barnLayout.ts`: every function takes `(ctx: LayoutContext, ...)` instead of `(_capacity: number)`
  - `getDynamicSlotRects(capacity, ctx)` — proportional grid with orientation-aware column count
  - `getResourceBannerPosition(ctx)` — top strip, full width
  - `getNoiseMeterPosition(ctx)` — below or beside banner depending on orientation
  - `getDeckStackPosition(ctx)` — right side in portrait, sidebar in landscape
  - `getFarmhouseRect(ctx)` — below slots in portrait, right sidebar in landscape
  - `getActionBarPosition(ctx, dualButtons)` — bottom in portrait, right column in landscape
  - `getOverlayBounds(ctx)` — centered modal, scaled to canvas
  - `getInfoPanelBounds(ctx)` — anchored above action bar, never overlapping
- [ ] Rewrite `tradingPostLayout.ts`: all functions accept LayoutContext, column count adapts to width
- [ ] Rewrite `barnLayout.test.ts`: test all layout functions at 5 viewport sizes, verify no overlaps, verify in-bounds, verify 44px tap targets

**Acceptance:** Game boots at any window size. Layout functions return valid positions for all test viewports. All layout tests pass.

### Phase 2: BarnScene Responsive Rendering (~25%)

**Goal:** BarnScene creates and recreates its visual elements based on actual canvas size. Handles resize events.

**Files:**
- `src/scenes/BarnScene.ts` — Major rewrite of rendering and layout calls
- `src/scenes/BootScene.ts` — Minor: generated texture sizes may need to be maximum-size rather than fixed

**Tasks:**
- [ ] Refactor BarnScene.create() to call `getLayoutContext(this)` and pass context to all layout functions
- [ ] Add `resize` event handler that calls a `rebuildLayout()` method
- [ ] `rebuildLayout()` destroys all positioned game objects and re-creates them with fresh layout positions
  - Preserve game state (isAnimating, hasDoneFirstDraw, overlays open) across rebuilds
  - If an overlay is visible, recreate it at the new position
- [ ] Fix resource banner: text uses `fontSize()` utility, truncates with ellipsis if needed
- [ ] Fix noise meter: positioned relative to banner, scaled dots
- [ ] Fix card rendering: card name uses `setWordWrapWidth()`, badges scale with slot size
- [ ] Fix info panel: Y position is always `actionBarY - panelH - gap`
- [ ] Fix farmhouse: scales proportionally, repositions in landscape
- [ ] Ensure all `setInteractive()` hit areas update on resize
- [ ] BootScene: generate textures at a comfortable maximum size (e.g., 128x128 for cards) and use `setDisplaySize()` in scenes to scale them down. This way textures don't need regenerating on resize.

**Acceptance:** BarnScene renders correctly at all 5 reference viewports. Resizing the browser window live causes the layout to adapt. No clipping at any capacity (5-8) at any viewport.

### Phase 3: TradingPostScene Responsive Rendering (~15%)

**Goal:** Trading Post adapts its grid and buttons to the canvas size.

**Files:**
- `src/scenes/TradingPostScene.ts` — Rewrite rendering to use LayoutContext

**Tasks:**
- [ ] Refactor TradingPostScene.create() to use LayoutContext
- [ ] Shop grid: column count based on `ctx.width` breakpoints (2/3/4 columns)
- [ ] Card sizes scale with available space
- [ ] Currency header, capacity button, start-night button anchor to actual canvas edges
- [ ] Add resize handler (same pattern as BarnScene)
- [ ] Penned-up display repositions correctly

**Acceptance:** Trading Post renders cleanly at all 5 reference viewports. Purchasing and capacity upgrades still work after resize.

### Phase 4: Landscape Layout (~15%)

**Goal:** Phone landscape orientation shows a usable, reorganized layout — not a "rotate" prompt.

**Files:**
- `src/scenes/barnLayout.ts` — Extend with landscape-specific position calculations
- `src/scenes/tradingPostLayout.ts` — Extend with landscape grid
- `src/scenes/BarnScene.ts` — Landscape sidebar rendering
- `src/scenes/TradingPostScene.ts` — Landscape grid rendering

**Tasks:**
- [ ] `barnLayout.ts` landscape path: when `ctx.isLandscape`:
  - Left sidebar (20% width): resource banner (vertical stack), noise meter, deck with counter
  - Center area (60% width): slots in 4-column grid, max 2 rows
  - Right area (20% width): farmhouse (compact), action buttons (vertical stack)
- [ ] `tradingPostLayout.ts` landscape path: 3-4 column shop grid, header at top, buttons at bottom-right
- [ ] BarnScene landscape rendering: sidebar background, repositioned HUD elements
- [ ] TradingPostScene landscape rendering: wider grid, repositioned header
- [ ] Test at 667x375 (iPhone SE landscape) and 932x430 (iPhone 14 Pro landscape)
- [ ] Verify all tap targets remain >= 44x44 in landscape

**Acceptance:** Rotating a phone simulator from portrait to landscape shows a reorganized, usable layout. All interactive elements work. No clipping.

### Phase 5: Multi-Viewport Playwright Tests (~10%)

**Goal:** Automated regression tests at 5 viewport configurations catch layout breakage in CI.

**Files:**
- `playwright.config.ts` — Add viewport projects
- `tests/e2e/mobile-smoke.spec.ts` — Extend with viewport-specific assertions
- `tests/e2e/responsive.spec.ts` — Create: screenshot tests at multiple viewports

**Tasks:**
- [ ] Add Playwright projects for all reference viewports:
  - `mobile-small`: 375x667 (iPhone SE portrait)
  - `mobile-large`: 393x852 (iPhone 14 Pro portrait)
  - `tablet`: 768x1024 (iPad portrait)
  - `desktop`: 1920x1080
  - `mobile-landscape`: 667x375 (iPhone SE landscape)
- [ ] Create `responsive.spec.ts`:
  - For each viewport: load game, wait for `__GAME_READY__`, screenshot "barn-empty"
  - Draw 2 cards (via seeded game), screenshot "barn-with-cards"
  - Navigate to Trading Post, screenshot "trading-post"
  - Assert no Phaser console errors
- [ ] Extend existing smoke test: verify `data-scene` attribute at each viewport
- [ ] Run `npm run test:e2e` — all viewports pass

**Acceptance:** `npm run test:e2e` runs 5 viewport profiles. All screenshots captured. No test failures.

### Phase 6: agent-browser Verification & Hardening (~5%)

**Goal:** Manual agent-browser screenshots prove the responsive layout works across devices. All CI checks pass.

**Tasks:**
- [ ] Document agent-browser verification workflow in sprint notes (not added to package.json)
- [ ] Run agent-browser manually at all 5 viewports:
  1. `agent-browser open http://localhost:5173/hoot-n-nanny/?seed=sprint2-opening`
  2. Set viewport to each of the 5 reference sizes
  3. Capture screenshots: barn empty, barn with cards at capacity 8, Trading Post, landscape
  4. Visually inspect: no clipping, no overlap, no black bars on desktop, landscape layout is usable
- [ ] Run `npm run ci` — all green
- [ ] Run `npm run budget` — app chunk < 100KB gzipped
- [ ] Run `npm run test` — all unit tests pass (layout tests at multiple viewports)
- [ ] Attach screenshots to PR for review

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/config/game.ts` | Modify | Switch scale mode from FIT to RESIZE, remove fixed width/height |
| `src/config/constants.ts` | Modify | Rename CANVAS to REFERENCE_CANVAS, values become minimums not absolutes |
| `src/scenes/layoutContext.ts` | Create | LayoutContext interface, getLayoutContext(), fontSize() utility |
| `src/scenes/barnLayout.ts` | Rewrite | All layout functions accept LayoutContext, compute proportional positions |
| `src/scenes/tradingPostLayout.ts` | Rewrite | All layout functions accept LayoutContext, adaptive column count |
| `src/scenes/BarnScene.ts` | Major rewrite | Use LayoutContext, add resize handler, fix all clipping issues |
| `src/scenes/TradingPostScene.ts` | Major rewrite | Use LayoutContext, add resize handler, adaptive grid |
| `src/scenes/BootScene.ts` | Modify | Generate textures at maximum size, scenes scale down with setDisplaySize |
| `src/scenes/barnLayout.test.ts` | Rewrite | Test at 5 viewport sizes, verify no overlaps, in-bounds, tap targets |
| `index.html` | Modify | Ensure container fills viewport for RESIZE mode |
| `playwright.config.ts` | Extend | Add 5 viewport projects |
| `tests/e2e/responsive.spec.ts` | Create | Multi-viewport screenshot regression tests |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Viewport-specific assertions |

---

## Definition of Done

1. **Desktop fills browser**: Game occupies the full 1920x1080 viewport with no black bars or pillarboxing. Content scales and repositions to use available space.
2. **Phone portrait works at all sizes**: iPhone SE (375x667) through iPhone 14 Pro Max (430x932) — game fills the screen, all elements visible, no clipping.
3. **Phone landscape is usable**: Rotating to landscape shows a reorganized layout (sidebar + wide grid), not a "rotate your device" modal. All game functions are accessible.
4. **Tablet renders cleanly**: iPad (768x1024) shows a well-spaced layout. Cards and text are comfortably readable.
5. **No clipping at any capacity**: Barn capacities 5-8 render without text truncation, badge overlap, or element collision at all 5 reference viewports.
6. **Info panel never overlaps action bar**: At any viewport size, the info panel is positioned above the action bar with visible separation.
7. **44px minimum tap targets**: All interactive elements (slots, buttons, cards) meet the minimum tap target at every viewport size. Verified by layout tests.
8. **Resize events handled**: Resizing the browser window or rotating a device causes the layout to adapt without requiring a page reload.
9. **Playwright multi-viewport**: 5 viewport profiles run in CI. All produce screenshots. All tests pass.
10. **agent-browser screenshots**: Manual verification captures screenshots at 5 viewports proving no clipping, no pillarboxing, and usable landscape. Screenshots attached to PR.
11. **CI green**: `npm run ci` passes. Bundle budget met. No regressions in existing tests.
12. **No new npm dependencies**: agent-browser is used as an external tool, not a project dependency.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **RESIZE mode breaks existing layout assumptions** | High | High | Phase 1 focuses exclusively on migration. Run all tests before moving to Phase 2. The reference dimensions (390x844) become the floor for layout calculations — if canvas is 390x844, output matches current layout exactly. |
| **Landscape layout is ugly or unusable** | Medium | Medium | Design the landscape layout on paper first. Start with a 3-zone (sidebar/center/sidebar) approach. If landscape layout proves too complex, fall back to a simpler "wider portrait" layout (still no "rotate" screen). |
| **Rebuild-on-resize causes visual flicker** | Medium | Low | Rebuild only tears down positioned elements, not the environment background. Use a brief fade transition (100ms) to mask the rebuild. Resize events are debounced (200ms). |
| **BootScene texture sizes are wrong for larger canvases** | Medium | Medium | Generate textures at a comfortable maximum (e.g., 128x140 for cards). Use `setDisplaySize()` in scenes. Textures are crisp up to the max size and Phaser downscales cleanly with `pixelArt: true`. |
| **Scope creep into visual redesign** | Medium | High | This sprint changes positions and sizes, not visual design. Barn aesthetic, card art, color palette — all unchanged. If an element looks bad at a new size, fix its sizing, not its design. |
| **Layout tests become brittle with proportional math** | Medium | Medium | Test invariants (no overlaps, in-bounds, tap targets) rather than exact pixel positions. Exact positions only tested at the reference 390x844 size. |
| **Phaser RESIZE mode interacts poorly with pixelArt rendering** | Low | High | Phaser's RESIZE mode is well-supported. `pixelArt: true` affects texture filtering, not scaling mode. Test early in Phase 1. If RESIZE + pixelArt causes blurring, set `resolution: window.devicePixelRatio` in game config. |
| **agent-browser is not installable or is broken** | Low | Low | agent-browser is a nice-to-have verification tool. Playwright screenshot tests are the actual regression safety net. If agent-browser doesn't work, skip it and rely on Playwright + manual browser testing. |

---

## Security Considerations

- No changes to security posture. Static client-only site.
- No new dependencies added to `package.json`.
- agent-browser runs as an external tool on the developer's machine, never in production.
- No user input handling changes. Seed parameter handling unchanged.
- CSS viewport changes do not introduce any XSS or injection vectors.

---

## Dependencies

- **Existing stack**: Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x, Vitest, Playwright
- **Phaser Scale.RESIZE**: Built-in Phaser feature, no additional code required
- **No new npm dependencies**: Zero additions to package.json
- **agent-browser**: External tool (`npx @anthropic-ai/agent-browser` or installed globally). Used manually for verification. Not a project dependency.
- **Existing bundle budget**: Phaser chunk < 400KB gzipped, app chunk < 100KB gzipped — this sprint should not meaningfully change bundle size

---

## Open Questions

1. **Should the game cap its rendered size on very large monitors?** On a 4K display (3840x2160), should the game scale infinitely or cap at some maximum (e.g., 1920x1080 content area with black bars beyond that)? Uncapped means pixel art may look overly blocky. Capped means "no black bars" is not 100% true on ultrawide/4K. Proposed: cap at 1920x1080 equivalent logical area with centered layout beyond that.

2. **How aggressively should landscape reorganize?** This draft proposes a 3-zone sidebar layout. An alternative is to keep portrait layout but scroll vertically (Phaser camera scroll). Sidebar is better UX but more implementation work. Proposed: sidebar layout for landscape.

3. **Should slot sizes scale continuously or snap to breakpoints?** Continuous scaling (slot width = `canvasW * 0.22`) produces arbitrary sizes. Breakpoint snapping (small/medium/large at 80/96/112px) produces cleaner pixel-art rendering. Proposed: breakpoint snapping at 3 sizes.

4. **Should generated textures be resolution-aware?** On high-DPI devices, the canvas may have a devicePixelRatio of 2-3x. Should we generate textures at 2x and downscale, or keep 1x and rely on Phaser's scaling? Proposed: keep 1x for Sprint 004, revisit in a future sprint if pixel art looks blurry on Retina displays.

5. **How should the resize rebuild handle active animations?** If a tween is running (card draw, bust shake) and the window resizes, should we: (a) cancel the animation and snap to final state, (b) let the animation finish at old positions then rebuild, or (c) rebuild immediately and restart the animation? Proposed: option (b) — debounce resize and apply after current animation completes.
