# Hoot 'n Nanny - Developer Conventions

## Stack

- Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x
- Node 20 LTS (see .nvmrc)
- No backend. Static site. GitHub Pages deployment.

## Commands

- `npm run dev` - local dev server
- `npm run build` - production build to dist/
- `npm run typecheck` - TSC type-check only
- `npm run lint` - ESLint
- `npm run format:check` - Prettier check
- `npm run test` - Vitest unit tests
- `npm run test:e2e` - Playwright smoke tests (requires vite preview running)
- `npm run budget` - check bundle size thresholds
- `npm run ci` - runs all of the above in sequence

## Canvas

- Logical resolution: 390 x 844 (portrait)
- Scaling: Phaser.Scale.FIT + CENTER_BOTH (pillarboxing on landscape/desktop)
- All coordinates are in logical space - never use window dimensions in scene code

## Scene Conventions

- Scene files: `XxxScene.ts`, key = `SceneKey.Xxx` enum value
- Scenes are thin: lifecycle hooks only (`preload`/`create`/`update`)
- All layout math lives in co-located `xxxLayout.ts` pure helper files
- No game logic (deck, state, scoring) in scene files - that goes in `src/game/` (Sprint 002+)

## Layout

- All slot/button coordinates exported from `src/config/constants.ts` as `LAYOUT` object
- Slot dimensions: 88x88px, 16px gap
- Row 1 (slots 0-2): y=160, x=[59, 163, 267]
- Row 2 (slots 3-4): y=272, x=[111, 215]
- Draw Animal button: 350x56 at y=720, centered (x=20)
- Colors: barn bg #8B3A3A, empty slot #D4A574, occupied slot #6AAD7E, button #4A7C59

## Touch Input

- All interactive elements: setInteractive() + on('pointerdown', handler, this)
- Minimum tap target: 44x44px
- No click events, no hover states

## Directory Rules

- Do not create a new `src/` subdirectory until a second file would go in it
- No barrel files (`index.ts` re-exports) until 3+ consumers share an import

## Phaser Import

- Full bundle: `import Phaser from 'phaser'` - tree-shaking is not supported
- Phaser is split into a separate vendor chunk in Vite config

## HMR

- HMR causes duplicate Phaser canvases; `main.ts` cleans up existing canvas before init
- If you see a doubled canvas in dev, hard-refresh (Cmd+Shift+R)

## Testing

- Vitest: unit test pure helpers. No Phaser mocking needed.
- Playwright: mobile viewport smoke tests. Uses `window.__GAME_READY__` for ready signal.
- Playwright runs on main pushes and PRs only (not every branch push)

## Bundle Budgets (Sprint 001 baseline)

- Phaser vendor chunk: < 400KB gzipped
- App chunk: < 100KB gzipped
- Measured baseline (2026-03-16): phaser chunk `331.72 KB` gzipped, app chunk `1.52 KB` gzipped
