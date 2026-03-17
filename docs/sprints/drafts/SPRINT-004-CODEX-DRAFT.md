# Sprint 004: Responsive Scaling, Layout Stability, and Visual Verification

## Overview

Sprint 003 improved card readability and added ability-heavy UI, but the app still inherits Sprint 001 scaling assumptions (`390x844` with `Phaser.Scale.FIT`). That causes three visible problems:

1. Desktop and wide displays show a small portrait game centered in black space.
2. Phone landscape is not intentionally handled.
3. Several dense UI states (capacity 7-8, info panel, ability overlays, Trading Post grid) can clip or overlap.

Sprint 004 makes the game responsive across desktop, phone portrait, and phone landscape while preserving deterministic gameplay and existing scene flow. It also adds repeatable visual proof using `agent-browser`.

Hard requirements for this sprint:

1. Desktop fills the browser viewport with no black bars.
2. Phone portrait scales correctly, and phone landscape is explicitly handled.
3. Clipping/overlap issues are eliminated across Barn and Trading Post.
4. Visual verification is captured with `agent-browser` across target viewports.

## Use Cases

1. **Desktop full-window play**: On `1920x1080`, the canvas fills the full browser viewport and the barn/trading UI remains readable and non-overlapping.
2. **Phone portrait baseline**: On `375x667` and `393x852`, all core controls remain visible and tappable (`>=44x44`), with no cropped cards/text.
3. **Phone landscape handling**: On `667x375`, player gets a usable compact layout (or explicit rotate UX fallback), not a tiny pillarboxed portrait.
4. **Capacity stress case**: With barn capacity 8 and multiple ability markers, cards and HUD do not collide.
5. **Overlay stress case**: Info panel, ability prompt overlays, and summary overlays do not cover critical controls unintentionally.
6. **Trading Post density**: Tabs, currency header, grid cards, and bottom actions all remain visible and non-overlapping on all target viewports.
7. **Resize continuity**: Rotating device or resizing browser reflows layout without breaking state or input.
8. **Visual proof**: Captured screenshots prove requirements in Barn and Trading Post states across required devices.

## Architecture

### 1) Phaser Scale and Resize Model

Move from fixed-fit scaling to viewport-resize scaling.

Current (`src/config/game.ts`):
- `mode: Phaser.Scale.FIT`
- `autoCenter: Phaser.Scale.CENTER_BOTH`
- black bars on wide screens

Target (`src/config/game.ts`):

```ts
scale: {
  mode: Phaser.Scale.RESIZE,
  autoCenter: Phaser.Scale.NO_CENTER,
  width: LAYOUT.CANVAS.WIDTH,
  height: LAYOUT.CANVAS.HEIGHT,
  parent: 'game-container',
},
backgroundColor: PALETTE.SKY_TOP,
```

Key behavior:
- Canvas always matches container size.
- Scenes reflow from `this.scale.width/height` on `resize` events.
- No scene reads `window.innerWidth` directly; viewport dimensions enter scene math only through layout helpers.

### 2) CSS Container and Safe-Area Contract

Update `index.html` styles to guarantee full-viewport container behavior and safe-area padding.

Target CSS shape:

```css
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
  background: #10243f;
}

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

#game-container canvas {
  display: block;
}
```

This removes body-level black bars and keeps iOS notch/home-indicator spacing correct.

### 3) Responsive Layout Engine (Pure Helpers)

Refactor `barnLayout.ts` and `tradingPostLayout.ts` from fixed coordinates to viewport-aware pure helpers:

```ts
interface ViewportMetrics {
  width: number;
  height: number;
  safeTop: number;
  safeRight: number;
  safeBottom: number;
  safeLeft: number;
  profile: 'phone-portrait' | 'phone-landscape' | 'tablet' | 'desktop';
}
```

Core design:
- Keep row structure for capacity (`5:[3,2]`, `6:[3,3]`, `7:[3,3,1]`, `8:[3,3,2]`).
- Compute card size, row gaps, and action-bar placement from available viewport region.
- Clamp dimensions to keep tap targets valid and text readable.
- Move all overlap prevention into deterministic layout math + tests.

Barn-specific changes:
- Dynamic top HUD block height.
- Dynamic slot region with guaranteed spacing from farmhouse/info/action regions.
- Info panel switches behavior by profile:
  - phone portrait: bottom sheet
  - phone landscape/desktop: centered modal panel (prevents bottom collision)

Trading Post-specific changes:
- Grid columns responsive by profile (2 on phone portrait, 3+ on landscape/tablet/desktop).
- Recompute tab/header/grid/bottom actions to avoid collisions on short heights.

### 4) Scene Reflow Lifecycle

`BarnScene` and `TradingPostScene` add resize lifecycle:

- On `create()`: compute layout once from scale metrics.
- Subscribe to `this.scale.on('resize', ...)`.
- Reflow all persistent objects in-place (positions/sizes/depth/input hit areas).
- On scene shutdown: remove resize listeners.

`BootScene` changes:
- Stop relying on single fixed-size environment textures for viewport filling.
- Draw/stretch environment layers to current viewport or use tiling for repeatable backgrounds.

### 5) Phone Landscape Handling

Primary path:
- Use `phone-landscape` profile with compact responsive layout (usable gameplay).

Fallback path:
- If viewport is too short for minimum readable/tappable constraints, show rotate overlay with a clear message and pause draw actions.

This satisfies explicit landscape handling while keeping gameplay legible.

### 6) Visual Verification Stack

Use both:
- **Playwright** for scripted regression checks across multiple projects/viewports.
- **agent-browser** for screenshot-based visual proof and quick manual diffing.

`agent-browser` command flow (from upstream README):

```bash
agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
agent-browser set viewport 1920 1080
agent-browser wait --fn "window.__GAME_READY__ === true"
agent-browser screenshot artifacts/visual/desktop-barn.png
agent-browser close
```

Repeat for all target viewport/state captures.

## Implementation

### Phase 1: Responsive Foundation (Scale + CSS + Metrics)

Tasks:

- Update `src/config/game.ts` scale mode from `FIT` to `RESIZE`; remove center-based letterboxing behavior.
- Update `index.html` CSS to enforce full viewport container, safe-area padding, and non-black page background.
- Add viewport metric helper(s) for safe-area/profile derivation.
- Introduce shared responsive breakpoints/constants in `src/config/constants.ts`.
- Add scene-level resize wiring in `BarnScene` and `TradingPostScene` (subscribe/unsubscribe + reflow entrypoint).

Tests:

- Add unit tests for viewport profile classification.
- Add Playwright assertion that canvas bounding box equals viewport for desktop and mobile projects.
- Verify no runtime errors during window resize/orientation change in e2e smoke.

### Phase 2: Barn Responsive Layout + Clipping Removal

Tasks:

- Refactor `src/scenes/barnLayout.ts` to compute all rects from `ViewportMetrics` + `capacity`.
- Replace fixed coordinates in `BarnScene` with layout outputs for:
  - header/resources/noise/deck/capacity text
  - slot rects and card containers
  - farmhouse/window glow
  - action bar/button split
  - info panel and overlays
- Ensure card text/resources/trait chips use adaptive font-size clamps where needed.
- Ensure info panel and ability overlays cannot overlap action buttons in active input states.
- Rework overlay bounds (`bust`, `summary`, `win`) for short-height and landscape cases.

Tests:

- Extend `src/scenes/barnLayout.test.ts`:
  - capacities 5-8 across required viewport set
  - slot/header/panel/action/overlay non-overlap assertions
  - in-bounds assertions
  - tap-target minimum assertions
- Add BarnScene e2e checks for `data-phase` transitions under portrait and landscape viewports.

### Phase 3: Trading Post Responsive Layout + Clipping Removal

Tasks:

- Refactor `src/scenes/tradingPostLayout.ts` to viewport-aware rect computation.
- Update `TradingPostScene` to use profile-specific grid columns and card sizing.
- Reposition tab buttons, currency header, penned-up strip, capacity upgrade, and start-night CTA to avoid overlap.
- Ensure long animal names, costs, and ability labels truncate or wrap safely without collision.

Tests:

- Add `src/scenes/tradingPostLayout.test.ts` with in-bounds/non-overlap coverage across viewport matrix.
- Add Playwright checks that bottom CTAs remain visible/tappable in all viewport projects.

### Phase 4: Phone Landscape UX Path

Tasks:

- Implement compact `phone-landscape` layout profile in both Barn and Trading Post.
- Add fallback rotate overlay when viewport height drops below minimum playable threshold.
- Pause/disable state-changing input while rotate overlay is active.
- Ensure orientation change returns to active gameplay without state loss.

Tests:

- Add e2e test for `667x375`:
  - verifies compact layout or rotate overlay behavior
  - verifies no clipped action bar/buttons
- Add e2e orientation-switch test (portrait -> landscape -> portrait) preserving session state.

### Phase 5: Multi-Viewport Visual Verification with agent-browser

Tasks:

- Install and document `agent-browser` usage for repo-local verification.
- Add script (e.g., `scripts/visual/agent-browser-capture.sh`) to capture deterministic screenshots for:
  - `375x667` (phone portrait small)
  - `393x852` (phone portrait modern)
  - `667x375` (phone landscape)
  - `768x1024` (tablet portrait)
  - `1920x1080` (desktop)
- Add deterministic seed/state route(s) for dense visual states (capacity 8, overlays visible).
- Save artifacts under `artifacts/visual/sprint-004/`.
- Add a short checklist doc for pass/fail visual review criteria.

Tests:

- Expand `playwright.config.ts` to include the same viewport projects.
- Add a regression spec that captures baseline screenshots for Barn and Trading Post.
- Run `npm run ci`, `npm run test:e2e`, and agent-browser capture script as sprint exit validation.

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/config/game.ts` | Modify | Switch Phaser scale mode to responsive viewport resize behavior |
| `index.html` | Modify | Full-viewport/safe-area CSS and canvas container contract |
| `playwright.config.ts` | Modify | Add multi-viewport projects (desktop/tablet/portrait/landscape) |
| `src/config/constants.ts` | Modify | Responsive breakpoints, spacing clamps, orientation thresholds |
| `src/scenes/barnLayout.ts` | Major rewrite | Viewport-aware Barn layout engine with overlap-safe rects |
| `src/scenes/tradingPostLayout.ts` | Major rewrite | Viewport-aware Trading Post layout engine |
| `src/scenes/BarnScene.ts` | Major rewrite | Reflow-aware rendering, compact landscape behavior, overlay fixes |
| `src/scenes/TradingPostScene.ts` | Major rewrite | Responsive grid/header/CTA positioning and resize reflow |
| `src/scenes/BootScene.ts` | Modify | Environment rendering compatible with dynamic viewport sizes |
| `src/scenes/barnLayout.test.ts` | Extend | Multi-viewport overlap, bounds, and tap-target validation |
| `src/scenes/tradingPostLayout.test.ts` | Create | Trading Post overlap/bounds tests across viewport matrix |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Orientation and phase coverage across portrait/landscape |
| `tests/e2e/responsive-layout.spec.ts` | Create | Canvas-fill and critical UI visibility checks per project |
| `scripts/visual/agent-browser-capture.sh` | Create | Automated agent-browser screenshot capture workflow |
| `docs/testing/visual-verification.md` | Create | agent-browser runbook and screenshot acceptance checklist |

## Definition of Done

1. Desktop (`1920x1080`) canvas fills the browser viewport with no black bars.
2. Phone portrait (`375x667`, `393x852`) is readable and fully usable.
3. Phone landscape (`667x375`) is explicitly handled (compact layout or rotate fallback).
4. Barn UI has no clipping/overlap at capacities 5, 6, 7, and 8.
5. Trading Post UI has no clipping/overlap for tabs, grid, and bottom actions.
6. Info panel, ability overlays, bust/summary/win overlays do not hide required controls unexpectedly.
7. All primary interactive targets meet minimum touch size (`44x44`).
8. Resize/orientation changes reflow scene layout without state reset or crashes.
9. `playwright.config.ts` includes desktop/tablet/portrait/landscape projects.
10. Agent-browser captures complete screenshot set for Barn + Trading Post across all target viewports.
11. Visual checklist passes for all captured screenshots.
12. `npm run ci` and `npm run test:e2e` pass.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| RESIZE migration causes hidden coordinate regressions | Medium | High | Route all scene placement through pure layout helpers + broad layout tests |
| Landscape compact layout increases complexity | Medium | Medium | Keep one shared rect engine with profile variants, not per-scene ad hoc math |
| Text still collides with high-density cards | Medium | Medium | Add font clamps, truncation, and explicit overlap assertions in tests |
| Resize listeners create stale objects/memory leaks | Low | Medium | Centralize listener registration/cleanup in scene lifecycle methods |
| Visual checks are inconsistent across local machines | Medium | Medium | Use deterministic seeds and fixed viewport list; store artifacts per run |
| agent-browser setup friction in CI | Medium | Low | Keep CI-required checks in Playwright; use agent-browser as required sprint verification artifact |

## Security

- No backend or auth changes; gameplay remains client-only.
- No untrusted HTML injection added; text remains from static game definitions.
- Screenshot artifacts are local build outputs and should not include user data.
- Seed/query parsing remains bounded and non-executable.
- New DOM attributes (if added) are test markers only.

## Dependencies

- Existing stack: Phaser 3.80.x, TypeScript 5.x, Vite 5.x, Vitest, Playwright.
- New verification tool: `agent-browser` CLI (`https://github.com/vercel-labs/agent-browser`).
- Environment requirement for verification: Chrome installed via `agent-browser install`.
- No gameplay-rule dependencies outside existing `src/game/*` architecture.

## Open Questions

1. For phone landscape, should we ship compact playable layout only, or keep rotate fallback for very short heights?
2. Should desktop use bounded content width (centered, with decorative sides) or fully expanded gameplay columns?
3. Do we want agent-browser screenshots committed to the repo, or generated as CI/job artifacts only?
4. Should visual verification be strict pixel-diff in CI now, or kept as sprint-level evidence only?
