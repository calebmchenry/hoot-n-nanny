# Sprint 001: Foundation

## Overview

This sprint bootstraps Hoot 'n Nanny from zero to a running Phaser 3 application deployed on GitHub Pages. The goal is to wire together every layer of the stack — TypeScript compilation, Vite bundling, Phaser scene management, responsive canvas scaling, and CI/CD — and prove it works end-to-end with a minimal interactive barn scene.

The barn scene is intentionally simple: a colored background, five empty animal slots, and a "Draw Animal" button that responds to touch/click. No game logic, no deck engine, no scoring. The value of this sprint is in the architectural decisions it locks in — scene lifecycle, module boundaries, scaling strategy, and project conventions — which every future sprint will build on.

A `CLAUDE.md` file will be established at the end of this sprint to codify the conventions and patterns chosen here, serving as the canonical reference for all future work.

## Use Cases

1. **Developer bootstrap**: Clone the repo, run `npm install && npm run dev`, and see the barn scene in a browser within 60 seconds.
2. **Mobile verification**: Open the deployed GitHub Pages URL on an iPhone SE (375px) or Android phone and see a correctly scaled, non-overflowing barn scene with tappable UI.
3. **Desktop verification**: Open the same URL on a 1440px desktop browser and see the scene centered with letterboxing, no stretching.
4. **Touch interaction**: Tap "Draw Animal" on a phone and see a visible response (placeholder animation or text feedback), confirming touch input is wired.
5. **CI/CD**: Push to `main` and have GitHub Actions automatically build and deploy to GitHub Pages without manual intervention.

## Architecture

### Scene Lifecycle

Phaser scenes are the primary unit of organization. Sprint 001 establishes two scenes that model the pattern all future scenes will follow:

```
BootScene (preload) --> BarnScene (gameplay)
```

- **BootScene**: Handles asset preloading (placeholder rectangles/text for now) and displays a minimal loading indicator. Transitions to BarnScene when complete. Future sprints add assets here without changing the pattern.
- **BarnScene**: The first "playable" scene. Renders the barn background, animal slots, and draw button. Future sprints will extract game logic into separate systems that scenes _compose_ rather than _contain_.

Scenes are registered in the Phaser config array, not dynamically added. This keeps the scene graph predictable and debuggable.

### Module Structure

```
src/
├── main.ts                 — Creates Phaser.Game instance, nothing else
├── config/
│   └── game.ts             — Phaser.Types.Core.GameConfig factory
├── scenes/
│   ├── BootScene.ts        — Preloading + loading screen
│   └── BarnScene.ts        — Barn rendering + placeholder interaction
├── scaling/
│   └── responsive.ts       — Canvas scaling logic + resize handler
└── types/
    └── index.ts            — Shared type definitions
```

Key principles:
- **One export per file** for scenes and config. No barrel files yet — premature until there are enough modules to warrant them.
- **Scenes are thin**. Scene files handle Phaser lifecycle hooks (`preload`, `create`, `update`) and delegate to imported utility functions. Game logic (decks, scoring, state) will live in dedicated directories added in future sprints.
- **`types/` is a seam, not a dump**. Sprint 001 places only genuinely shared types here. Scene-local types stay in their scene file.
- **`scaling/` is extracted** because it's cross-cutting and will be reused by every scene.

### Canvas Scaling Strategy

The game uses a **fixed logical resolution** with Phaser's `Scale.FIT` mode and automatic letterboxing.

**Logical resolution: 390 x 844 (portrait)**. This matches modern phone aspect ratios (roughly 9:19.5) and ensures the primary mobile experience is native-feeling. Desktop users see the same portrait layout centered horizontally with pillarboxing.

Portrait is the correct choice for this game because:
- The card-game layout (barn slots stacked vertically, draw button at bottom) maps naturally to portrait.
- Mobile is the primary platform and users hold phones in portrait.
- Pass-and-play is the core multiplayer mode — phones are passed in portrait orientation.

Scaling implementation:

```typescript
// config/game.ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 390,
  height: 844,
  parent: 'game-container',
}
```

Phaser's `Scale.FIT` handles the math: the canvas is rendered at the logical resolution and CSS-scaled to fit the viewport while preserving aspect ratio. Letterboxing/pillarboxing fills the remaining space. A `resize` event listener on the scale manager ensures correct behavior on orientation change and dynamic viewport changes (e.g., iOS Safari address bar show/hide).

The `index.html` includes viewport meta tags to prevent pinch-zoom and ensure `width=device-width`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### Game State Management (Forward-Looking)

Sprint 001 does not implement game state, but the module structure deliberately leaves room for it. The intent doc's Open Question #3 asks whether state should live in Phaser's scene registry, a singleton, or a store like Zustand.

**Recommendation for future sprints**: A plain TypeScript singleton class (e.g., `src/state/GameState.ts`) that scenes import directly. Rationale:
- Phaser's registry is stringly-typed and hard to refactor.
- Zustand adds a dependency for a problem that doesn't yet exist — the game has no reactive UI outside the canvas.
- A singleton class with typed methods is the simplest thing that works, is fully testable, and can be replaced later if needed.

Sprint 001 creates the `src/` directory structure but does **not** create a `state/` directory. That directory is added in Sprint 002 when the deck engine is built. This avoids empty placeholder files.

### Phaser Import Strategy

**Full bundle import** (`import Phaser from 'phaser'`). Rationale:
- Phaser 3 does not officially support tree-shaking. The modular `phaser3-rex-plugins` ecosystem exists but adds complexity inappropriate for Sprint 001.
- The full Phaser bundle is ~1MB minified / ~300KB gzipped. Acceptable for a game deployed on GitHub Pages.
- Vite's code-splitting and gzip compression handle the rest.

If bundle size becomes a concern in later sprints, the migration path is to switch to `phaser` subpath imports (available in Phaser 3.60+), which is a mechanical refactor.

## Implementation

### Phase 1: Project Scaffolding (~30% of effort)

**Files:**
- `package.json` — Project manifest with Phaser 3, TypeScript, Vite dependencies
- `tsconfig.json` — TypeScript strict mode config targeting ES2020+
- `vite.config.ts` — Vite config with base path for GitHub Pages
- `index.html` — Entry HTML with viewport meta, `#game-container` div
- `.gitignore` — Standard Node + dist ignores
- `src/main.ts` — Phaser.Game instantiation
- `src/config/game.ts` — GameConfig factory with scaling settings

**Tasks:**
- [ ] Initialize `package.json` with `npm init -y`
- [ ] Install dependencies: `phaser@^3.80`, `typescript`, `vite`, `@types/node`
- [ ] Configure `tsconfig.json` with `strict: true`, `moduleResolution: "bundler"`, `target: "ES2020"`, `jsx: "preserve"` (not needed now, but doesn't hurt)
- [ ] Configure `vite.config.ts` with `base: '/hoot-n-nanny/'` for GitHub Pages subpath
- [ ] Create `index.html` with viewport meta tags, `#game-container` div, and Vite module script entry
- [ ] Create `src/main.ts` that imports config and instantiates `new Phaser.Game(config)`
- [ ] Create `src/config/game.ts` that exports the `GameConfig` with Scale.FIT, 390x844 resolution, CENTER_BOTH, and scene array
- [ ] Verify `npm run dev` launches Vite and shows a black Phaser canvas

### Phase 2: Scenes + Barn Rendering (~35% of effort)

**Files:**
- `src/scenes/BootScene.ts` — Preloading scene with loading indicator
- `src/scenes/BarnScene.ts` — Barn background, animal slots, draw button
- `src/types/index.ts` — Shared type stubs

**Tasks:**
- [ ] Create `BootScene` extending `Phaser.Scene` with `key: 'Boot'`
  - `preload()`: No real assets yet; simulate with a short delay or immediately proceed
  - `create()`: Display "Loading..." text, then transition to BarnScene via `this.scene.start('Barn')`
- [ ] Create `BarnScene` extending `Phaser.Scene` with `key: 'Barn'`
  - `create()`: Render barn background (filled rectangle, warm red/brown color, full canvas)
  - Render 5 empty animal slot rectangles arranged in a grid (2 rows: 3 top, 2 bottom, centered)
  - Render "Draw Animal" button at bottom of screen (rectangle + text, interactive)
  - Add pointer event (`pointerdown`) on the button that triggers a visible response: brief color flash on a random empty slot + console log
- [ ] Create `src/types/index.ts` with placeholder type exports (e.g., `AnimalSlot` interface with `x`, `y`, `occupied` fields)
- [ ] Register both scenes in the `GameConfig` scene array (BootScene first)
- [ ] Verify the full scene flow: black canvas -> BootScene "Loading..." -> BarnScene with barn + slots + button

### Phase 3: Responsive Scaling + Touch (~20% of effort)

**Files:**
- `src/scaling/responsive.ts` — Resize handler utility

**Tasks:**
- [ ] Create `src/scaling/responsive.ts` that exports a function to attach a `resize` listener to the Phaser scale manager, handling iOS Safari viewport quirks (address bar, safe area)
- [ ] Call the scaling setup function from `main.ts` after game instantiation
- [ ] Add CSS in `index.html` to set `body { margin: 0; overflow: hidden; background: #000; }` and `#game-container` to fill viewport
- [ ] Test that the "Draw Animal" button responds to `pointerdown` (not `click`) — Phaser's input system handles this natively, but verify on touch
- [ ] Verify no hover-only interactions exist (all interactive elements use `pointerdown` or `pointerup`)
- [ ] Test canvas at 375px width (iPhone SE viewport), 390px (logical), and 1440px (desktop) — no overflow, no distortion, correct letterboxing

### Phase 4: GitHub Pages CI + Project Conventions (~15% of effort)

**Files:**
- `.github/workflows/deploy.yml` — GitHub Actions workflow
- `CLAUDE.md` — Project conventions document

**Tasks:**
- [ ] Create `.github/workflows/deploy.yml`:
  - Trigger on push to `main`
  - Use `actions/setup-node@v4` + `actions/configure-pages@v4` + `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`
  - Steps: checkout, install, build (`npm run build`), upload `dist/` as artifact, deploy
  - Use the newer GitHub Pages deployment via artifacts (no `gh-pages` branch needed)
- [ ] Add `build` and `dev` scripts to `package.json`: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`
- [ ] Verify `npm run build` produces `dist/` with no TypeScript errors
- [ ] Create `CLAUDE.md` documenting:
  - Tech stack and versions
  - Directory structure and conventions
  - Scene naming pattern (`XxxScene.ts`, key matches class name minus "Scene")
  - Build/run commands
  - Scaling config (390x844 portrait, Scale.FIT)
  - Module style (one export per file, scenes are thin, no barrel files)
  - Placeholder asset convention (colored rectangles + text, no external images in Sprint 001)

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Create | Project manifest, dependencies, scripts |
| `tsconfig.json` | Create | TypeScript strict config |
| `vite.config.ts` | Create | Vite build config with GitHub Pages base path |
| `index.html` | Create | Entry HTML with viewport meta + game container |
| `.gitignore` | Create | Standard ignores for Node, dist, IDE files |
| `src/main.ts` | Create | Phaser.Game instantiation entry point |
| `src/config/game.ts` | Create | Phaser GameConfig with scaling settings |
| `src/scenes/BootScene.ts` | Create | Asset preloading scene |
| `src/scenes/BarnScene.ts` | Create | Barn background, slots, draw button |
| `src/scaling/responsive.ts` | Create | Canvas resize handler for mobile viewports |
| `src/types/index.ts` | Create | Shared TypeScript type definitions |
| `.github/workflows/deploy.yml` | Create | GitHub Actions CI/CD to GitHub Pages |
| `CLAUDE.md` | Create | Project conventions and patterns |

## Definition of Done

- [ ] `npm run dev` launches a local Vite server showing the barn scene
- [ ] `npm run build` produces `dist/` with zero TypeScript errors and zero warnings
- [ ] GitHub Actions workflow file exists and is syntactically valid (deploys on first push to `main`)
- [ ] BootScene displays briefly, then transitions to BarnScene automatically
- [ ] BarnScene renders: barn-colored background, 5 empty animal slot rectangles, "Draw Animal" button with text
- [ ] Tapping/clicking "Draw Animal" produces a visible response (slot color flash + console log)
- [ ] Canvas scales correctly at 375px viewport width (iPhone SE) — no horizontal overflow, no content clipping
- [ ] Canvas scales correctly at 1440px viewport width (desktop) — centered with pillarboxing, no stretching
- [ ] All interactions use pointer events (no hover-only or click-only patterns)
- [ ] No external image/audio assets are required — all visuals are programmatic (rectangles, text)
- [ ] `CLAUDE.md` exists and documents stack, conventions, directory structure, and build commands
- [ ] All source files pass TypeScript strict mode compilation

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| iOS Safari viewport quirks (address bar resize, safe area insets) break scaling | Medium | Medium | Use Phaser's Scale.FIT which handles most cases; add explicit `resize` listener; test on real iOS device or simulator before closing sprint |
| Phaser 3.80+ has breaking changes vs. examples found online | Low | Low | Pin to a specific Phaser patch version in `package.json`; reference official Phaser 3 docs and TypeScript definitions, not blog posts |
| GitHub Pages deployment fails due to base path mismatch | Medium | Low | Set `base: '/hoot-n-nanny/'` in Vite config; verify deployed asset paths in CI build output |
| 390x844 portrait resolution feels wrong on tablets or landscape desktop | Low | Medium | Acceptable for Sprint 001 — revisit in a later sprint if user testing reveals issues. Scale.FIT with pillarboxing is non-destructive |
| Phaser full bundle size (~1MB) concerns | Low | Low | Acceptable for a game. Gzip brings it to ~300KB. Tree-shaking can be explored in a later sprint if needed |

## Security Considerations

- **No user input** is processed beyond pointer events on fixed UI elements. No text input, no network calls, no localStorage writes in this sprint.
- **No external assets** are loaded — all visuals are programmatic. This eliminates XSS risk from malicious asset URLs.
- **GitHub Pages deployment** uses the official `actions/deploy-pages` action with default permissions. No custom tokens or secrets are required.
- **Viewport meta** disables user scaling (`user-scalable=no`) — this is standard for games to prevent accidental zoom but should be noted as an accessibility trade-off.

## Dependencies

- **Phaser 3** (^3.80) — game framework
- **TypeScript** (^5.4) — language
- **Vite** (^5.0 or ^6.0) — build tool
- **No prior sprints** — this is Sprint 001
- **GitHub repository** must exist with Pages enabled (Settings > Pages > Source: GitHub Actions)

## Open Questions

1. **Repository name on GitHub**: Is the repo name `hoot-n-nanny` or `hoot-n-nanny`? The Vite `base` path must match exactly for GitHub Pages asset loading. (Assumed `hoot-n-nanny` based on directory name.)
2. **Portrait lock**: Should the game display an "please rotate" message in landscape, or just scale the portrait layout into the landscape viewport with pillarboxing? Pillarboxing is simpler and adequate for Sprint 001; an orientation prompt can be added later.
3. **Node version**: Should the GitHub Actions workflow pin a specific Node version (e.g., 20 LTS), or use `latest`? Recommend pinning to 20 LTS for reproducibility.
4. **ESLint/Prettier**: The intent doc mentions "linting" in the seed. Should Sprint 001 include ESLint + Prettier setup, or defer to Sprint 002? This draft defers it — the scaffolding sprint is already scoped tightly, and linting can be added without disrupting existing code.
