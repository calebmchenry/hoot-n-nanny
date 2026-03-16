# Sprint 001: Foundation

## Overview

Sprint 001 establishes the engineering baseline for Hoot 'n Nanny: a Phaser 3 + TypeScript + Vite browser game that can be developed locally, validated automatically, and deployed safely to GitHub Pages. The visible gameplay deliverable is intentionally small: a mobile-first barn scene with a tappable "Draw Animal" control and placeholder visuals. The real objective is to remove uncertainty from the platform layer before gameplay systems arrive.

This draft emphasizes five foundations:

- **Build tooling rigor**: strict TypeScript, lint and format gates, pinned runtime expectations, deterministic scripts, and documented project conventions.
- **Bundle size optimization**: establish a measured baseline in Sprint 001, keep first-load assets minimal, and add a budget check before content growth makes regressions expensive.
- **Mobile performance**: treat iOS Safari and Android Chrome as primary targets, not afterthoughts; optimize for portrait play, touch input, resize/orientation changes, and constrained devices.
- **Test infrastructure scaffold**: add a thin unit/smoke harness now so future gameplay work lands into an existing test shape instead of forcing a later retrofit.
- **CI/CD**: automate validation on pull requests and automate GitHub Pages deployment from `main`.

Out of scope for this sprint: card rules, deck-building systems, currencies, multiplayer turns, sound, real pixel art, save data, and content-heavy UI.

## Use Cases

1. A new contributor clones the repo, runs `npm ci` and `npm run dev`, and gets a working scene without extra setup or undocumented fixes.
2. A maintainer opens a pull request and gets automatic feedback on type errors, lint failures, smoke-test breakage, and bundle budget regressions.
3. A player opens the game on an iPhone SE class viewport or Android phone and sees a stable portrait canvas with responsive touch interaction.
4. A desktop user opens the same build and sees a centered, correctly letterboxed experience without distortion or cropped UI.
5. A future sprint adds real rules and assets without reworking the build pipeline, test harness, or deployment process.

## Architecture

### Tooling and Repository Contracts

The repository should behave like a production codebase on day one:

- Pin the supported Node runtime with `.nvmrc` and `package.json` `engines`.
- Commit the `package-lock.json` and use `npm ci` in automation.
- Enable TypeScript strict mode and fail the build on type errors.
- Add lint and formatting checks as first-class scripts, not optional local habits.
- Keep all developer entry points explicit: `dev`, `build`, `preview`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, and `ci`.

This makes every future sprint cheaper. The team should never have to guess how to validate a change.

### Runtime Shape

The runtime should separate bootstrapping, platform concerns, and scene logic early.

```text
src/
├── main.ts                     # DOM mount + startup error surface
├── app/
│   └── createGame.ts           # Phaser.Game construction
├── config/
│   ├── game.ts                 # Phaser config factory
│   └── constants.ts            # Logical resolution, scene keys, budgets used by app code
├── scenes/
│   ├── BootScene.ts            # Minimal preload/setup
│   └── BarnScene.ts            # Placeholder barn shell + touch interaction
├── systems/
│   └── viewport.ts             # Resize/orientation/DPR handling
├── ui/
│   └── barnLayout.ts           # Pure layout helpers for slots and button bounds
└── test/
    └── setup.ts                # Shared test setup
```

Guiding rules:

- `main.ts` should do almost nothing beyond mounting the game and surfacing startup failures.
- Scenes stay thin. Layout calculations and platform logic live in pure helpers so they can be tested outside Phaser.
- No global gameplay store is required yet. Sprint 001 should avoid speculative state architecture.
- Placeholder visuals should be created once during scene setup, not rebuilt every frame.

### Mobile-First Rendering

The game should treat portrait mobile play as the baseline:

- Fixed logical resolution: `390 x 844`.
- Phaser scaling mode: `FIT` with `CENTER_BOTH`.
- Device pixel ratio clamp: `min(window.devicePixelRatio, 2)` to balance sharpness and mobile GPU cost.
- Touch-first input: interactive controls respond to Phaser pointer events and never depend on hover.
- Resize handling: explicitly respond to viewport changes, orientation changes, and iOS browser chrome changes.

The idle barn scene should not perform per-frame allocation or cosmetic redraw loops. Sprint 001 only needs one stable scene, but it should already behave like a mobile game shell rather than a generic web app canvas.

### Bundle Strategy

Phaser is the biggest baseline dependency, so Sprint 001 should make bundle discipline visible immediately:

- Keep external runtime dependencies to the minimum needed for the game shell.
- Separate Phaser into a vendor chunk so app code changes do not invalidate all cached JS.
- Use programmatic placeholder art in this sprint; do not add image, audio, or font payloads yet.
- Add a bundle analysis script and a budget check script that fails CI when the bootstrap bundle exceeds the agreed threshold.
- Document the baseline size generated in Sprint 001 so later sprints can compare against a real number instead of intuition.

The goal is not to over-optimize Phaser on day one. The goal is to make bundle growth measurable before content work begins.

### Test and Delivery Architecture

Sprint 001 should include a lightweight but real validation stack:

- **Vitest** for pure utilities, config validation, and boot-level checks.
- **Playwright** for one browser smoke test using a mobile viewport profile.
- **GitHub Actions CI** for pull-request and push validation.
- **GitHub Pages deploy workflow** for artifact-based deployment from `main`.

The test scaffold should prove the app boots, mounts a canvas, and reaches the initial scene. Exhaustive gameplay tests are intentionally deferred, but the project should already have a place to put them.

## Implementation

Assumption: one engineer, roughly one sprint week of focused implementation plus review. Percentages are relative effort, not calendar guarantees.

### Phase 1: Project Bootstrap and Quality Gates (20%)

Create the repo-level contracts first:

- Initialize `package.json`, lockfile, `.nvmrc`, and baseline scripts.
- Configure TypeScript strict mode for app and tooling code.
- Add ESLint and Prettier with check-only scripts for CI.
- Configure Vite for GitHub Pages base-path deployment and clean production builds.
- Add `index.html` with the correct viewport policy and a single mount container.

Primary outputs:

- `package.json`
- `package-lock.json`
- `.nvmrc`
- `tsconfig.json`
- `vite.config.ts`
- `eslint.config.js`
- `prettier.config.mjs`
- `index.html`

### Phase 2: Game Shell and Mobile Rendering Baseline (30%)

Stand up the app runtime and prove the end-to-end loop:

- Create `main.ts`, `createGame.ts`, and the Phaser config factory.
- Implement `BootScene` and `BarnScene`.
- Render a barn-colored background, five empty animal slots, and a touchable "Draw Animal" control.
- Add viewport/orientation handling and DPR clamping.
- Ensure the scene is stable on a 375px-wide viewport and centered cleanly on large desktop screens.

Primary outputs:

- `src/main.ts`
- `src/app/createGame.ts`
- `src/config/game.ts`
- `src/config/constants.ts`
- `src/scenes/BootScene.ts`
- `src/scenes/BarnScene.ts`
- `src/systems/viewport.ts`
- `src/ui/barnLayout.ts`

### Phase 3: Test Infrastructure Scaffold (20%)

Add just enough automation to validate the foundation without spending the sprint on test volume:

- Configure Vitest and shared test setup.
- Write unit tests for viewport/layout helpers and config invariants.
- Configure Playwright with a mobile device profile.
- Add one smoke test that loads the app, waits for a readiness signal, and verifies the game canvas is present.
- Expose a minimal non-sensitive readiness hook for testability if Phaser canvas state is otherwise hard to observe.

Primary outputs:

- `vitest.config.ts`
- `playwright.config.ts`
- `src/test/setup.ts`
- `src/**/*.test.ts`
- `tests/e2e/mobile-smoke.spec.ts`

### Phase 4: Bundle Budgeting and Performance Guardrails (15%)

Make performance measurable before real content arrives:

- Split Phaser into a stable vendor chunk.
- Add a bundle analysis command for local inspection.
- Add a script that checks `dist/assets` output and enforces the initial budget.
- Record the Sprint 001 baseline in docs or conventions.
- Verify the idle scene avoids continuous redraw work beyond Phaser's normal render cycle.

Suggested initial targets:

- Initial JavaScript payload stays within an agreed Sprint 001 budget after build.
- Barn scene is responsive and visibly smooth on an iPhone SE class device.
- No real asset payloads are introduced in this sprint.

Primary outputs:

- `scripts/check-bundle-budget.mjs`
- Optional analyzer config within `vite.config.ts`
- Budget note in `CLAUDE.md`

### Phase 5: CI/CD, Documentation, and Handoff (15%)

Close the sprint with repeatable delivery:

- Add `ci.yml` for install, lint, typecheck, tests, build, and bundle budget validation.
- Add `deploy.yml` for GitHub Pages deployment from `main`.
- Document conventions, scripts, structure, and baseline decisions in `CLAUDE.md`.
- Verify the deploy workflow uses the built artifact rather than rebuilding differently in production.

Primary outputs:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `CLAUDE.md`

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `package.json` | Create | Dependencies, scripts, engine constraints |
| `package-lock.json` | Commit | Deterministic installs for local and CI use |
| `.nvmrc` | Create | Pin expected Node version |
| `tsconfig.json` | Create | Strict TypeScript project config |
| `vite.config.ts` | Create | Vite build config, Pages base path, chunk strategy |
| `eslint.config.js` | Create | Lint rules and TypeScript integration |
| `prettier.config.mjs` | Create | Formatting baseline |
| `index.html` | Create | Mount point and mobile viewport policy |
| `src/main.ts` | Create | App entrypoint |
| `src/app/createGame.ts` | Create | Phaser game construction |
| `src/config/game.ts` | Create | Phaser runtime config |
| `src/config/constants.ts` | Create | Shared runtime constants |
| `src/scenes/BootScene.ts` | Create | Boot and handoff into first playable shell |
| `src/scenes/BarnScene.ts` | Create | Placeholder barn scene and interaction proof |
| `src/systems/viewport.ts` | Create | Resize, orientation, and DPR handling |
| `src/ui/barnLayout.ts` | Create | Pure layout math for scene elements |
| `vitest.config.ts` | Create | Unit test configuration |
| `playwright.config.ts` | Create | Browser smoke-test configuration |
| `src/test/setup.ts` | Create | Shared test bootstrap |
| `tests/e2e/mobile-smoke.spec.ts` | Create | Mobile-oriented app boot smoke test |
| `scripts/check-bundle-budget.mjs` | Create | CI-enforced bundle budget check |
| `.github/workflows/ci.yml` | Create | Validation pipeline for pushes and pull requests |
| `.github/workflows/deploy.yml` | Create | GitHub Pages deployment pipeline |
| `CLAUDE.md` | Create | Project conventions and baseline decisions |

## Definition of Done

- `npm ci` works on a clean clone using the documented Node version.
- `npm run ci` succeeds locally and in GitHub Actions.
- `npm run dev` starts the app and reaches the barn scene without TypeScript or runtime errors.
- `npm run build` produces a deployable `dist/` for GitHub Pages.
- The initial scene renders a barn background, five empty slots, and a visible "Draw Animal" control.
- Touch input works on mobile-class viewports; no interaction depends on hover.
- The canvas scales cleanly from 375px-wide mobile screens to 1440px desktop screens with preserved aspect ratio.
- A bundle budget is documented and enforced in CI.
- At least one Vitest suite and one Playwright smoke test exist and pass.
- GitHub Pages deployment from `main` is automated and uses the same build output validated in CI.
- `CLAUDE.md` documents scripts, structure, mobile rendering decisions, and bundle/performance expectations.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Phaser's baseline bundle is larger than expected | Early payload bloat could become normalized | Measure Sprint 001 output immediately, split vendor code, and add a budget gate before asset work begins |
| Mobile Safari viewport behavior causes clipping or jumpy resize behavior | Primary platform experience degrades | Handle resize/orientation explicitly, test on real iOS hardware if possible, and keep layout based on logical coordinates rather than DOM assumptions |
| Canvas smoke tests become brittle | CI loses trust value | Keep the smoke test narrow: app boots, readiness signal appears, canvas exists; avoid testing visual pixel detail in Sprint 001 |
| CI/deploy drift creates "works locally, fails in Pages" behavior | Deployment confidence drops | Use the same `npm ci` and `npm run build` commands in CI and deploy workflows, and configure the correct Vite base path from the start |
| Tooling scope expands too far for a foundation sprint | Barn-scene proof of life slips | Limit tests to scaffold plus smoke coverage, keep lint/format rules simple, and defer non-critical editor tooling or advanced optimization passes |

## Security Considerations

- The app is a static client-only site in Sprint 001. No backend, secrets, authentication, or remote data flows should be introduced.
- CI should use `npm ci` with a committed lockfile to reduce install drift and surprise dependency resolution.
- GitHub Actions permissions should be minimal. `deploy.yml` should only request the permissions required for Pages deployment.
- No third-party CDN scripts or runtime-loaded remote assets should be used in the foundation sprint.
- Any readiness hook added for testing should expose only a boolean or simple scene key, never internal mutable state or privileged debug actions.

## Dependencies

- Phaser 3, pinned to a current stable release suitable for TypeScript usage.
- TypeScript 5.x and Vite 5.x or newer.
- ESLint, Prettier, Vitest, and Playwright as tooling dependencies.
- GitHub repository with GitHub Pages configured for Actions-based deployment.
- Access to at least one mobile-class browser for manual verification, ideally iOS Safari and Android Chrome.
- No prior sprint dependencies; this is the initial foundation sprint.

## Open Questions

1. What exact initial JavaScript budget should Sprint 001 enforce in CI: a fixed cap, or a baseline-plus-tolerance model captured after the first successful build?
2. Should Phaser remain a full-package dependency with vendor chunking, or is there enough value in exploring narrower imports this early?
3. Should Playwright smoke tests run on every pull request, or only on `main` and release-bound branches if CI time becomes a concern?
4. Is portrait the only supported orientation for Sprint 001, or should landscape devices receive a rotate prompt instead of simple letterboxing?
5. Should `CLAUDE.md` be the sole conventions document going forward, or should repo-level agent guidance eventually be consolidated elsewhere?
