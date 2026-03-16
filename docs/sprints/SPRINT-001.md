# Sprint 001: Foundation

## Overview

Sprint 001 bootstraps Hoot 'n Nanny from zero to a continuously deployed Phaser 3 application that works on a real phone. The visible deliverable is intentionally small — a barn scene with five animal slots and a tappable "Draw Animal" button — but the real work is wiring together every layer of the stack: TypeScript strict mode, ESLint + Prettier, Vite bundling, Phaser scene architecture, responsive canvas scaling, a thin test harness, and GitHub Pages CI/CD.

Every architectural decision made here constrains all future sprints. Getting the scene structure, scaling strategy, module boundaries, and conventions right in Sprint 001 means Sprint 002 through Sprint 11 don't have to re-litigate them. A `CLAUDE.md` written at sprint close becomes the canonical reference for all future implementation work — human or agent.

The barn scene is a code wireframe: it proves the layout system, the touch input model, and the slot state model work before any game logic fills them in. "Draw Animal" flashes the button and cycles a slot from empty to occupied — not because this is gameplay, but because it proves the layout data model is wired up correctly before Sprint 002 builds the deck engine on top of it.

## Use Cases

1. **Developer bootstrap**: Clone the repo, run `npm ci && npm run dev`, and see the barn scene in a browser within 60 seconds — no extra setup, no undocumented steps.
2. **Phone verification**: Open the GitHub Pages URL on an iPhone SE or Android and see a correctly scaled, touch-responsive barn scene in portrait. Tap "Draw Animal" and see a button flash + slot change color.
3. **Desktop verification**: Open the same URL on a 1440px desktop and see the portrait barn layout centered with pillarboxing — no distortion, no overflow.
4. **Landscape handling**: Rotate a phone to landscape and see the same portrait layout scaled to fit the narrower dimension — correctly pillarboxed, no content lost.
5. **CI/CD**: Merge to `main` and have GitHub Pages update automatically within minutes. Any push or PR triggers type checking, linting, and a build validation.
6. **Future sprint handoff**: A future Claude agent reads `CLAUDE.md` and correctly infers how to add a new scene, where to put layout helpers, and how to wire touch input — without asking clarifying questions.

## Architecture

### Canvas Scaling

**Logical resolution: 390 × 844 (portrait)**. This matches the iPhone 14/15 logical point resolution — the most common mobile form factor. All game coordinates are in this space.

```typescript
// src/config/game.ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 390,
  height: 844,
  parent: 'game-container',
}
```

`Scale.FIT` scales the canvas up or down while preserving aspect ratio. On landscape devices, the portrait layout is pillarboxed (black bars on sides). On desktop, it's pillarboxed and centered. No orientation prompt is shown — the game is playable in any orientation, just optimally experienced in portrait.

The `#game-container` uses `height: 100dvh` (dynamic viewport height) with a `-webkit-fill-available` fallback to prevent iOS Safari's address bar from causing overflow. The `Draw Animal` button area includes `padding-bottom: env(safe-area-inset-bottom)` to avoid overlap with the iPhone home indicator.

### Scene Architecture

Two scenes, transitioning linearly:

```
BootScene → BarnScene
```

- **BootScene** (`key: 'Boot'`): Handles asset preloading. In Sprint 001 there are no real assets, so it transitions to BarnScene immediately via `this.scene.start('Barn')`.
- **BarnScene** (`key: 'Barn'`): Renders the barn interior, 5 animal slots, farmhouse silhouette, and Draw Animal button. Sets `window.__GAME_READY__ = true` in `create()` after rendering is complete (used by Playwright for reliable smoke test waits).

**Scenes are thin.** Scene files handle Phaser lifecycle hooks (`preload`, `create`, `update`) only. Layout calculations live in `src/scenes/barnLayout.ts` as pure functions, importable and testable without Phaser.

### Module Structure

```
src/
├── main.ts                 — Phaser.Game instantiation only
├── config/
│   ├── game.ts             — GameConfig factory (scaling, scenes, resolution)
│   └── constants.ts        — LAYOUT constants (slot coordinates, button bounds, colors)
├── scenes/
│   ├── BootScene.ts        — Preload → start Barn
│   ├── BarnScene.ts        — Barn rendering + Draw Animal interaction
│   └── barnLayout.ts       — Pure layout helpers (slot positions, button bounds)
└── types/
    └── index.ts            — SlotState type, SceneKey enum
```

**No additional subdirectories in Sprint 001.** `state/`, `systems/`, `ui/`, `app/` are not created until a second file would inhabit them. Empty directories are premature organization.

### Barn Scene Layout

All coordinates in logical space (390 × 844):

```
┌─────────────────────────────┐  y=0
│  Barn interior (#8B3A3A)    │
│                             │
│  ┌──────┐ ┌──────┐ ┌──────┐│  y=160  Row 1 (slots 0-2)
│  │  88  │ │  88  │ │  88  ││         88×88px, 16px gap
│  └──────┘ └──────┘ └──────┘│  y=248
│       ┌──────┐ ┌──────┐    │  y=272  Row 2 (slots 3-4)
│       │  88  │ │  88  │    │         centered
│       └──────┘ └──────┘    │  y=360
│                             │
│  Farmhouse silhouette       │  y=580  390×180, #4A3728
│  [window light placeholder] │         (animated in later sprints)
│                             │
│  ┌─────────────────────────┐│  y=720  DRAW ANIMAL button
│  │    DRAW ANIMAL (#4A7C59)││         350×56, centered
│  └─────────────────────────┘│  y=776
│  [safe-area-inset padding]  │
└─────────────────────────────┘  y=844
```

**Slot colors:**
- Empty: `#D4A574` fill, `#6B4226` 2px stroke
- Occupied: `#6AAD7E` fill, `#3D7A54` 2px stroke

**Row 1 slot x-positions** (slot width 88px, 3 slots, 16px gap, centered in 390px):
- Slot 0: x = 59, Slot 1: x = 163, Slot 2: x = 267 *(left edge of each slot rect)*

**Row 2 slot x-positions** (2 slots, centered):
- Slot 3: x = 111, Slot 4: x = 215

These constants are exported from `src/config/constants.ts` as a `LAYOUT` object so CLAUDE.md references the source of truth rather than duplicating raw numbers.

### Touch Input

All interactive elements use `setInteractive()` + `on('pointerdown')`. No `click` events, no hover states.

Minimum tap target: 44 × 44px (enforced via `setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)` for any element smaller than 44px).

**Draw Animal button behavior on tap:**
1. Button fill tints to `#6AAD7E` (lighter green)
2. `scene.time.delayedCall(120, () => btn.setFillStyle(0x4A7C59))` restores original
3. One empty slot is cycled to occupied (first empty slot, left-to-right, top-to-bottom)
4. If all 5 slots are occupied, they all reset to empty (cycles for testing)

### Phaser Import Strategy

Full bundle: `import Phaser from 'phaser'`. Phaser 3 does not officially support tree-shaking. The full bundle is ~1MB minified / ~300KB gzipped — acceptable for a browser game. Phaser is split into its own vendor chunk so app code changes don't invalidate cached Phaser JS.

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: { phaser: ['phaser'] }
    }
  }
}
```

### Test Architecture

**Vitest** — unit tests for pure helpers (layout math, config invariants). No Phaser mocking needed because layout helpers are pure functions.

**Playwright** — one mobile smoke test. Runs on `main` pushes and PR merges (not every branch push). Uses `window.__GAME_READY__` to wait for BarnScene to complete rendering before assertions.

```typescript
// tests/e2e/mobile-smoke.spec.ts
test('barn scene loads on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__GAME_READY__ === true);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});
```

### HMR Note

Vite + Phaser hot module replacement causes duplicate canvas mounts. Disable HMR for the Phaser entry in dev (or add a canvas pre-init cleanup in `main.ts` that removes any existing canvas in `#game-container` before calling `new Phaser.Game()`). This avoids a frustrating development experience.

---

## Implementation

### Phase 1: Scaffolding + Quality Gates (~25% of effort)

**Files:**
- `package.json` — dependencies, scripts, `engines` field
- `package-lock.json` — committed for deterministic installs
- `.nvmrc` — pin Node 20 LTS
- `tsconfig.json` — strict mode TypeScript
- `vite.config.ts` — build config, base path, vendor chunk, ES2022 target
- `eslint.config.js` — ESLint with TypeScript plugin
- `prettier.config.mjs` — Prettier baseline
- `index.html` — viewport meta, `100dvh` body, `#game-container`, safe-area CSS
- `.gitignore` — node_modules, dist, .DS_Store, .env

**Tasks:**
- [ ] `npm init -y`, install `phaser@^3.80.1`, `typescript@^5.4`, `vite@^5.4`, `@types/node@^20`
- [ ] Install dev tools: `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `prettier`, `eslint-config-prettier`
- [ ] Install test tools: `vitest`, `@vitest/coverage-v8`, `playwright`, `@playwright/test`
- [ ] `.nvmrc`: `20`
- [ ] `package.json` `engines`: `{ "node": ">=20" }`, scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `ci`
  - `"ci": "npm run typecheck && npm run lint && npm run format:check && npm run build && npm run test"`
- [ ] `tsconfig.json`: `strict: true`, `moduleResolution: "bundler"`, `target: "ES2022"`, `lib: ["ES2022", "DOM"]` (no `jsx: preserve`)
- [ ] `vite.config.ts`: `base: '/hoot-n-nanny/'`, `build.target: 'es2022'`, `manualChunks: { phaser: ['phaser'] }`, optional `rollup-plugin-visualizer` under analyze flag
- [ ] `eslint.config.js`: TypeScript-aware rules, no-unused-vars, consistent-return; simple and not overbearing
- [ ] `prettier.config.mjs`: single quotes, 2-space indent, trailing commas, 100-char print width
- [ ] `index.html`: viewport meta (`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`), `<style>` with `body { margin:0; background:#000; height:100dvh; height:-webkit-fill-available; overflow:hidden; }`, `#game-container { width:100%; height:100%; padding-bottom:env(safe-area-inset-bottom); }`, module script pointing to `src/main.ts`
- [ ] Verify `npm run dev` shows a black Phaser canvas without TypeScript or lint errors
- [ ] Verify `npm run ci` exits 0

### Phase 2: Scenes + Barn Rendering (~35% of effort)

**Files:**
- `src/main.ts` — Phaser.Game bootstrap with HMR canvas cleanup
- `src/config/game.ts` — GameConfig factory
- `src/config/constants.ts` — LAYOUT object with all slot/button coordinates and colors
- `src/scenes/BootScene.ts` — Immediate handoff to Barn
- `src/scenes/BarnScene.ts` — Full barn wireframe + interaction
- `src/scenes/barnLayout.ts` — Pure slot/button layout helpers
- `src/types/index.ts` — `SlotState`, `SceneKey`

**Tasks:**
- [ ] `src/config/constants.ts`: Export `LAYOUT` object containing all slot positions, slot dimensions, button bounds, and color hex values from the wireframe spec above
- [ ] `src/config/game.ts`: Export `createGameConfig()` returning `Phaser.Types.Core.GameConfig` with `width: 390`, `height: 844`, `Scale.FIT`, `CENTER_BOTH`, `backgroundColor: 0x000000`, scene array `[BootScene, BarnScene]`
- [ ] `src/main.ts`: Canvas cleanup for HMR (`document.querySelector('#game-container canvas')?.remove()`), then `new Phaser.Game(createGameConfig())`
- [ ] `src/types/index.ts`: `export type SlotState = 'empty' | 'occupied'`, `export enum SceneKey { Boot = 'Boot', Barn = 'Barn' }`
- [ ] `src/scenes/barnLayout.ts`: Pure functions using `LAYOUT` constants — `getSlotRects()` returns array of 5 `{x, y, w, h}` objects, `getButtonRect()` returns button bounds. No Phaser imports.
- [ ] `src/scenes/BootScene.ts`: `key: SceneKey.Boot`, `create()` calls `this.scene.start(SceneKey.Barn)` immediately
- [ ] `src/scenes/BarnScene.ts`:
  - [ ] `create()`: render barn background rect (390×844, `#8B3A3A`)
  - [ ] Render 5 slot rects using `getSlotRects()` — empty fill `#D4A574`, stroke `#6B4226` 2px
  - [ ] Render farmhouse silhouette rect (390×180 at y=580, `#4A3728`) — store as `this.farmhouse` for later sprint use
  - [ ] Render Draw Animal button (350×56 at y=720, centered, `#4A7C59`) + centered text `'DRAW ANIMAL'`
  - [ ] `button.setInteractive()` + `on('pointerdown', this.onDraw, this)`
  - [ ] `onDraw()`: tint button `0x6AAD7E`, restore after 120ms; cycle first empty slot to occupied; if all occupied reset all to empty
  - [ ] Set `(window as any).__GAME_READY__ = true` at end of `create()`
- [ ] Verify full flow: black canvas → immediate to BarnScene → barn renders correctly at 375px and 1440px viewports
- [ ] Verify Draw Animal: button flashes, one slot turns green, second tap turns next slot, fifth tap resets all

### Phase 3: Test Infrastructure Scaffold (~20% of effort)

**Files:**
- `vitest.config.ts` — unit test config
- `playwright.config.ts` — E2E config (mobile viewport, main/PR only)
- `src/scenes/barnLayout.test.ts` — unit tests for layout helpers
- `tests/e2e/mobile-smoke.spec.ts` — mobile boot smoke test

**Tasks:**
- [ ] `vitest.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts']`, coverage via `@vitest/coverage-v8`
- [ ] `src/scenes/barnLayout.test.ts`:
  - [ ] `getSlotRects()` returns exactly 5 rects
  - [ ] No slot rect overflows the 390×844 canvas boundary
  - [ ] All rects are at least 44×44px (tap target minimum)
  - [ ] Slot rects don't overlap each other
- [ ] `playwright.config.ts`: `baseURL: 'http://localhost:4173'` (Vite preview), `projects: [{ name: 'mobile', use: { viewport: { width: 375, height: 667 } } }]`
- [ ] `tests/e2e/mobile-smoke.spec.ts`: load app, wait for `__GAME_READY__`, assert canvas visible (see Architecture section for full snippet)
- [ ] Add `npx playwright install --with-deps chromium` to CI setup step
- [ ] Run `npm run test` — Vitest passes
- [ ] Run `npm run test:e2e` against `vite preview` — Playwright smoke test passes

### Phase 4: Bundle Discipline + CI/CD + CLAUDE.md (~20% of effort)

**Files:**
- `scripts/check-bundle-budget.mjs` — CI-enforced budget check
- `.github/workflows/ci.yml` — validation on all pushes + PRs
- `.github/workflows/deploy.yml` — GitHub Pages deployment on `main` push
- `CLAUDE.md` — project conventions

**Tasks:**
- [ ] `scripts/check-bundle-budget.mjs`: scan `dist/assets/` for JS files, sum gzipped sizes, fail if Phaser chunk > 400KB or app chunk > 100KB. Log baseline in Sprint 001 run.
- [ ] Add `"budget": "node scripts/check-bundle-budget.mjs"` to package.json scripts; add to `npm run ci`
- [ ] `.github/workflows/ci.yml`:
  ```yaml
  on: [push, pull_request]
  jobs:
    validate:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci
        - run: npm run typecheck
        - run: npm run lint
        - run: npm run format:check
        - run: npm run build
        - run: npm run test
        - run: npm run budget
        # Playwright only on main/PRs to main:
        - if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
          run: npx playwright install --with-deps chromium && npm run test:e2e
  ```
- [ ] `.github/workflows/deploy.yml`:
  ```yaml
  on:
    push:
      branches: [main]
  permissions:
    pages: write
    id-token: write
  jobs:
    deploy:
      environment: github-pages
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci && npm run build
        - uses: actions/upload-pages-artifact@v3
          with: { path: dist }
        - uses: actions/deploy-pages@v4
  ```
- [ ] Enable GitHub Pages in repo settings (Source: GitHub Actions)
- [ ] Push to `main`, verify green CI + green deploy + Pages URL accessible
- [ ] `CLAUDE.md` — see contents spec below

**CLAUDE.md contents:**
```markdown
# Hoot 'n Nanny — Developer Conventions

## Stack
- Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x
- Node 20 LTS (see .nvmrc)
- No backend. Static site. GitHub Pages deployment.

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build to dist/
- `npm run typecheck` — TSC type-check only
- `npm run lint` — ESLint
- `npm run format:check` — Prettier check
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright smoke tests (requires vite preview running)
- `npm run budget` — check bundle size thresholds
- `npm run ci` — runs all of the above in sequence

## Canvas
- Logical resolution: 390 × 844 (portrait)
- Scaling: Phaser.Scale.FIT + CENTER_BOTH (pillarboxing on landscape/desktop)
- All coordinates are in logical space — never use window dimensions in scene code

## Scene Conventions
- Scene files: `XxxScene.ts`, key = `SceneKey.Xxx` enum value
- Scenes are thin: lifecycle hooks only (preload/create/update)
- All layout math lives in co-located `xxxLayout.ts` pure helper files
- No game logic (deck, state, scoring) in scene files — that goes in `src/game/` (Sprint 002+)

## Layout
- All slot/button coordinates exported from `src/config/constants.ts` as `LAYOUT` object
- Slot dimensions: 88×88px, 16px gap
- Row 1 (slots 0-2): y=160, x=[59, 163, 267]
- Row 2 (slots 3-4): y=272, x=[111, 215]
- Draw Animal button: 350×56 at y=720, centered (x=20)
- Colors: barn bg #8B3A3A, empty slot #D4A574, occupied slot #6AAD7E, button #4A7C59

## Touch Input
- All interactive elements: setInteractive() + on('pointerdown', handler, this)
- Minimum tap target: 44×44px
- No click events, no hover states

## Directory Rules
- Do not create a new src/ subdirectory until a second file would go in it
- No barrel files (index.ts re-exports) until 3+ consumers share an import

## Phaser Import
- Full bundle: `import Phaser from 'phaser'` — tree-shaking is not supported
- Phaser is split into a separate vendor chunk in Vite config

## HMR
- HMR causes duplicate Phaser canvases; main.ts cleans up existing canvas before init
- If you see a doubled canvas in dev, hard-refresh (Cmd+Shift+R)

## Testing
- Vitest: unit test pure helpers. No Phaser mocking needed.
- Playwright: mobile viewport smoke tests. Uses window.__GAME_READY__ for ready signal.
- Playwright runs on main pushes and PRs only (not every branch push)

## Bundle Budgets (Sprint 001 baseline)
- Phaser vendor chunk: < 400KB gzipped
- App chunk: < 100KB gzipped
- Update CLAUDE.md with actual Sprint 001 measurements after first successful build
```

---

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `package.json` | Create | Dependencies, scripts, Node engine constraint |
| `package-lock.json` | Commit | Deterministic installs for local and CI |
| `.nvmrc` | Create | Pin Node 20 LTS |
| `tsconfig.json` | Create | TypeScript strict config (no jsx flag) |
| `vite.config.ts` | Create | Build config: base path, vendor chunk, ES2022 target |
| `eslint.config.js` | Create | TypeScript-aware lint rules |
| `prettier.config.mjs` | Create | Formatting baseline |
| `index.html` | Create | Viewport meta, 100dvh body, safe-area CSS, game container |
| `.gitignore` | Create | node_modules, dist, .DS_Store |
| `src/main.ts` | Create | Phaser.Game bootstrap with HMR canvas cleanup |
| `src/config/game.ts` | Create | GameConfig factory (390×844, Scale.FIT, scenes) |
| `src/config/constants.ts` | Create | LAYOUT object: all coordinates, dimensions, colors |
| `src/scenes/BootScene.ts` | Create | Immediate handoff to BarnScene |
| `src/scenes/BarnScene.ts` | Create | Barn wireframe, Draw Animal interaction, ready signal |
| `src/scenes/barnLayout.ts` | Create | Pure layout helpers (getSlotRects, getButtonRect) |
| `src/types/index.ts` | Create | SlotState type, SceneKey enum |
| `vitest.config.ts` | Create | Unit test configuration |
| `playwright.config.ts` | Create | E2E test configuration (mobile viewport) |
| `src/scenes/barnLayout.test.ts` | Create | Unit tests for layout helper functions |
| `tests/e2e/mobile-smoke.spec.ts` | Create | Mobile boot smoke test with __GAME_READY__ signal |
| `scripts/check-bundle-budget.mjs` | Create | CI bundle size enforcement script |
| `.github/workflows/ci.yml` | Create | Validate all pushes and PRs |
| `.github/workflows/deploy.yml` | Create | Deploy to GitHub Pages on main push |
| `CLAUDE.md` | Create | Project conventions (canonical reference for all future sprints) |

---

## Definition of Done

- [ ] `npm ci && npm run dev` shows barn scene within 60 seconds on a clean clone — no extra steps
- [ ] `npm run ci` exits 0: typecheck, lint, format check, build, unit tests, bundle budget all pass
- [ ] Barn scene renders correctly: barn-red background, 5 slot rectangles (3-top / 2-bottom layout), farmhouse silhouette, Draw Animal button with text
- [ ] Draw Animal: button flashes lighter green on tap, first empty slot turns green; subsequent taps fill slots left-to-right; all 5 occupied resets all to empty
- [ ] All interactions use `pointerdown` — no `click` or hover-only patterns
- [ ] Canvas scales correctly at 375px viewport (iPhone SE) — no horizontal overflow, no content clipping, bottom button above home indicator
- [ ] Canvas scales correctly at 1440px viewport (desktop) — portrait layout pillarboxed and centered, no distortion
- [ ] Canvas scales acceptably in landscape on a 375px-wide phone — pillarboxed portrait visible, no content lost
- [ ] Vitest unit tests pass (layout helpers: 5 slots returned, no overflow, no overlap, 44px minimum)
- [ ] Playwright smoke test passes on mobile viewport: canvas visible, `__GAME_READY__` fires
- [ ] GitHub Actions CI workflow is green on a push to `main`
- [ ] GitHub Pages URL is accessible and barn scene loads (not just "workflow file exists")
- [ ] Bundle budget passes: Phaser chunk < 400KB gzipped, app chunk < 100KB gzipped
- [ ] `CLAUDE.md` exists and documents: stack, commands, canvas resolution, scene conventions, layout coordinates, touch input rules, directory rules, HMR note, bundle budgets

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| iOS Safari `100vh` overflow (address bar resize) | High | Medium | Use `100dvh` with `-webkit-fill-available` fallback on game container |
| Home indicator overlaps Draw Animal button on notched iPhones | High | Medium | Apply `padding-bottom: env(safe-area-inset-bottom)` to `#game-container` |
| GitHub Pages asset 404s due to base path mismatch | Medium | High | Set `base: '/hoot-n-nanny/'` in Vite config on day 1; verify on first deploy |
| Vite + Phaser HMR causes duplicate canvas mounts | Medium | Low | Canvas cleanup in `main.ts` before `new Phaser.Game()`; note in CLAUDE.md |
| Phaser TypeScript strict mode friction (type gaps in bundled types) | Medium | Low | Use `// @ts-expect-error` sparingly with a comment; escalate to `phaser-overrides.d.ts` ambient file if more than 3 instances |
| Playwright smoke test flakiness due to Phaser boot timing | Low | Low | Use `waitForFunction(() => window.__GAME_READY__)` — avoids fixed `sleep` |
| 390×844 resolution feels wrong on tablets | Low | Low | `Scale.FIT` with pillarboxing is non-destructive; revisit if user testing reveals issues |
| Phaser bundle size exceeds expected ~300KB gzipped | Low | Low | Budget check catches this in CI; vendor chunking ensures cache efficiency |

---

## Security Considerations

- Static client-only site. No backend, no auth, no network calls, no localStorage in Sprint 001.
- `npm ci` with committed lockfile — reduces install drift and surprise dependency resolution.
- GitHub Actions permissions minimized: `deploy.yml` requests only `pages: write` and `id-token: write`.
- No third-party CDN scripts or remotely-loaded assets.
- `user-scalable=no` in viewport meta is standard for games; acknowledged as an accessibility trade-off. Future consideration: test with system font size scaling.
- Playwright readiness hook (`window.__GAME_READY__`) exposes only a boolean — not internal state or debug access.

---

## Dependencies

- GitHub repository must exist with GitHub Pages enabled (Settings → Pages → Source: GitHub Actions)
- GitHub repo slug must be `hoot-n-nanny` — Vite `base` path depends on this
- Node 20 LTS available locally (`.nvmrc` enforces in CI)
- Access to at least one mobile-class browser for manual verification (iOS Safari + Android Chrome preferred)
- No prior sprint dependencies — this is Sprint 001

---

## Open Questions

1. **GitHub repo slug**: Confirm the exact GitHub repo name matches `hoot-n-nanny`. The Vite `base` path and all GitHub Pages asset URLs depend on this. If it differs, update `vite.config.ts` `base` before any other work.
2. **Farmhouse silhouette interactivity**: The farmhouse rect is stored as `this.farmhouse` for later sprint use (the window will animate as a NOISY! warning). Should it be stored on a named property in Sprint 001, or is a local variable acceptable since Sprint 002 will refactor BarnScene anyway?
3. **Slot "occupied" reset behavior**: The Draw Animal cycle (fill all 5 → reset to empty) is a test harness, not gameplay. Should this behavior be gated behind a `DEV_MODE` flag so it doesn't confuse playtesting, or is it fine as-is for a Sprint 001 proof?
