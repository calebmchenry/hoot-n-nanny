# Sprint 005 Draft: Ship It

## Overview

This sprint covers backlog items **#26 GitHub Pages CI/CD** and **#27 Final QA & Ship Polish**. The game is already mechanically complete. The repo already has a real production build, unit tests, Playwright coverage, audio integration, and a bundle-budget script. What is still missing is release engineering: a deterministic GitHub Pages deploy, a Pages-safe artifact, and a final QA pass aimed at the actual public build instead of local confidence.

Baseline at the start of this sprint:

- `npm run test` passes
- `npm run build` passes
- `npm run check:bundle` passes
- Current JS bundle is about **27 KB gzipped**, well under the existing **150 KB** hard budget

Primary outcome: **a push to `main` publishes a working GitHub Pages build, and that build survives a stranger’s first session on desktop and mobile without feeling like a prototype.**

Out of scope:

- New mechanics, new animals, or balance changes
- Visual redesigns or broad refactors
- New hosting targets beyond GitHub Pages
- Any polish work that cannot be tied to a reproducible bug or a failed QA check

## Architecture

### 1. Single release workflow, not separate CI and CD stacks

Add **`.github/workflows/deploy-pages.yml`** as the only release workflow.

Opinionated choice: keep this in one workflow with two jobs instead of splitting CI and deploy into separate files. The repo is small, the release path is linear, and duplicate workflow logic is a maintenance trap.

Structure:

- `verify` job runs on `pull_request` and `push`
- `deploy` job runs only on pushes to `main`, only after `verify` succeeds
- Use official GitHub Pages actions only:
  - `actions/setup-node`
  - `actions/configure-pages`
  - `actions/upload-pages-artifact`
  - `actions/deploy-pages`
- Use `cache: npm` and `npm ci`
- Add workflow concurrency so only the newest `main` commit can deploy
- Grant only the permissions Pages needs: `contents: read`, `pages: write`, `id-token: write`

Release gate inside `verify`:

- `npm ci`
- `npm run test`
- `npm run build`
- `npm run check:bundle`
- `npm run check:pages`
- `npm run test:e2e`

This sprint should **not** add preview environments, staging deploys, or a second hosting path. `main` is the release branch and GitHub Pages is production.

### 2. Make the artifact relocatable for GitHub Pages

GitHub Pages is the main technical risk because it serves this project from a subpath. The safest solution for this app is to make the built artifact relocatable instead of hardcoding the repository name into the build.

Change **`vite.config.ts`** to use:

- `base: './'`

Why this is the right choice here:

- The app has no client-side routes, only query params and static assets
- Relative asset URLs work both in local preview and under `/hoot-n-nanny/`
- It avoids coupling the build to the repository name
- It keeps future repo renames from silently breaking production

Add **`scripts/check-pages-artifact.mjs`** as a hard guardrail. It should inspect `dist/index.html` and fail if any of the following are true:

- a built asset URL starts with `/assets/`
- a referenced JS or CSS asset does not exist in `dist/assets`
- the built page references runtime CDN assets or other external host dependencies

Add **`check:pages`** to **`package.json`** and treat it as a required deployment gate.

### 3. Use the existing QA stack as the release harness

Do not invent a second QA system. The repo already has the right primitives:

- unit tests for game and audio logic
- Playwright end-to-end coverage
- deterministic seeded states
- bundle-size enforcement

The sprint should extend that harness only where the shipping risk is still uncovered.

New automated coverage should focus on:

- **Bust flow**: bust, pin an animal, enter shop, start next night, confirm the pinned animal is gone for one night
- **Keyboard-only loop**: complete night -> summary -> shop -> next night without using the mouse
- **Touch sanity**: verify critical controls and slots work on the mobile project, especially night invite/call, shop purchase, and continue/play-again actions
- **Production-clean console** on a loss path as well as the existing win path

Add one new deterministic seed for QA:

- **`?seed=bust`** wired through **`src/game/state.ts`** and **`src/app/App.tsx`**

The existing `shop`, `win`, and `ability` seeds already cover the other ship-critical paths. Do not add a pile of synthetic states just because they are easy to add.

### 4. Final polish is defect-driven, not open-ended

Final QA always wants to balloon. This sprint needs a hard rule: polish work is only in scope when it fixes something a stranger would immediately hit.

Allowed polish targets:

- broken or confusing deployment behavior
- touch or keyboard input failures
- layout overflow or clipped content on phone sizes
- missing focus visibility or bad focus restoration
- audio unlock/mute persistence regressions on mobile
- copy or presentation bugs that make the app read like unfinished debug UI

Not allowed:

- rebalancing the shop
- revisiting animation style
- rewriting components that already work
- aesthetic tweaks with no reproducible issue behind them

### 5. Manual QA must happen on the live Pages URL

Create **`docs/SHIP-CHECKLIST.md`** and treat it as a real deliverable.

That checklist should be run against the deployed GitHub Pages URL, not just `vite preview`, because local preview does not cover:

- the final Pages path
- real Pages caching behavior
- first-load behavior from a cold public URL
- the actual “stranger clicked the link” experience

Minimum manual checklist items:

- fresh load on desktop
- fresh load on mobile
- reload while using `?seed=win`, `?seed=shop`, and `?seed=bust`
- full win path
- full bust/pin path
- shop purchase round-trip
- portrait and landscape on phone
- keyboard-only navigation on desktop
- mute/unmute and first user-gesture audio unlock
- no horizontal overflow or inaccessible controls

If the live URL fails the checklist, the sprint is not done even if CI is green.

## Implementation Phases

### Phase 1 - Pages-safe build foundation

Update **`vite.config.ts`** to use a relocatable base and add **`scripts/check-pages-artifact.mjs`** plus a new **`check:pages`** script in **`package.json`**.

Exit criteria:

- `npm run build` succeeds with the new base strategy
- `npm run check:pages` fails on broken asset paths and passes on a correct build
- the built artifact contains only repo-local static assets

### Phase 2 - GitHub Pages workflow

Implement **`.github/workflows/deploy-pages.yml`** with a `verify` job and a `deploy` job. Use official Pages actions, `npm ci`, and a strict main-branch deploy condition.

Exit criteria:

- pull requests run the full verification stack without deploying
- pushes to `main` deploy automatically after a green verification run
- only the newest `main` commit can publish

### Phase 3 - Release-specific automated QA

Add the missing deterministic seed and create a new Playwright release smoke spec for bust/pinning, keyboard-only flow, touch sanity, and clean console output on a non-win path.

Exit criteria:

- a broken bust/pin flow is caught automatically
- a keyboard-only regression is caught automatically
- mobile critical actions are covered in Playwright
- the release smoke spec is stable enough to run in CI on every PR

### Phase 4 - Manual ship pass and targeted fixes

Run the checklist on the live Pages build and fix only the issues found there. Expected fixes are small and localized, mostly in UI components and CSS.

Exit criteria:

- checklist completed on the live URL
- no blocking issues remain on desktop or mobile
- any fixes are narrow, explainable, and covered by either an automated test or an explicit checklist item

### Phase 5 - Release closure

Do one final end-to-end verification after the last fixes: CI green, Pages updated, live URL checked again, and the release checklist committed with the final expected behavior.

Exit criteria:

- deployed build matches the latest `main`
- final verification is repeatable by another contributor
- the sprint leaves behind a stable release process, not a one-off deploy

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-pages.yml` | Single workflow that verifies the app on PRs and pushes, then deploys GitHub Pages on `main` |
| `scripts/check-pages-artifact.mjs` | Static verification that the built artifact is safe for GitHub Pages and fully self-contained |
| `tests/release-smoke.spec.ts` | Playwright coverage for ship-critical flows still missing today: bust/pinning, keyboard-only loop, touch sanity, loss-path console cleanliness |
| `docs/SHIP-CHECKLIST.md` | Manual validation checklist for the real GitHub Pages URL |

### Modified Files

| File | Changes |
|------|---------|
| `package.json` | Add `check:pages`; keep the release gate visible in the standard npm scripts |
| `vite.config.ts` | Make the build relocatable with `base: './'` |
| `playwright.config.ts` | Adjust CI-facing Playwright settings only if needed for stable release-smoke execution and artifact capture |
| `src/game/state.ts` | Add `createSeededBustState()` for deterministic release QA |
| `src/app/App.tsx` | Wire `?seed=bust` into initial state resolution |

### Likely Polish Targets

These files are not blanket rewrite candidates. They are the narrow surfaces most likely to need fixes once QA starts finding real issues.

| File | Why it is a likely target |
|------|---------------------------|
| `src/ui/BarnGrid.tsx` | Bust-state affordances, slot focus, pin-selection clarity |
| `src/ui/NightSummaryModal.tsx` | Summary continue behavior, loss-path messaging, focus restoration |
| `src/ui/TradingPostScreen.tsx` | Keyboard/touch navigation and purchase flow issues |
| `src/ui/AudioControls.tsx` | Mobile tap targets, mute state visibility, first-use clarity |
| `src/styles/app.css` | Night-phase overflow, focus ring visibility, general responsive cleanup |
| `src/styles/shop.css` | Shop grid overflow, button spacing, touch ergonomics |
| `src/styles/audio.css` | Audio controls placement and overlap fixes |
| `src/styles/win.css` | Final-screen layout cleanup on small viewports if needed |

## Definition of Done

- A push to `main` automatically deploys the static build to GitHub Pages using GitHub Actions.
- Pull requests run the full verification stack without deploying.
- The required release gate is green in CI:
  - `npm run test`
  - `npm run build`
  - `npm run check:bundle`
  - `npm run check:pages`
  - `npm run test:e2e`
- The build artifact is relocatable and does not depend on root-hosted `/assets/...` paths.
- The bundle remains under the existing **150 KB gzipped** hard budget and should stay within roughly **10 KB** of today’s baseline unless there is a documented reason.
- Automated coverage explicitly includes bust/pinning, keyboard-only navigation, and mobile critical-path interaction.
- The live GitHub Pages URL passes the manual checklist on at least:
  - one desktop Chromium browser
  - one real mobile browser
- No blocker remains in the following categories:
  - broken deploy
  - broken controls
  - console errors/warnings during normal play
  - horizontal overflow or clipped primary UI
  - obviously unfinished copy or presentation
- Another contributor can merge to `main` and get the same deploy process without tribal knowledge.

## Risks

- **Pages path bugs.** Absolute asset paths are the most likely way to ship a broken build. This is why `base: './'` and `check:pages` are mandatory.
- **Manual QA sprawl.** “Polish” can consume the whole sprint if not constrained. The sprint must stay defect-driven.
- **Mobile audio differences.** iOS Safari and mobile Chrome can still behave differently from desktop around first-gesture audio unlock and mute persistence. This is partly testable, but not fully automatable.
- **Repo settings are outside the codebase.** A correct workflow file still fails if GitHub Pages is not enabled or Actions lack permission to deploy.
- **False confidence from local preview.** A local build passing does not prove the public Pages URL feels finished. The live checklist is a hard requirement for exactly that reason.

## Dependencies

- Maintainer access to GitHub repository settings to enable GitHub Pages and Actions-based deployment.
- `main` remains the release branch for this project.
- The existing npm + lockfile workflow stays authoritative so CI can use `npm ci`.
- At least one real mobile browser is available for manual validation before the sprint is declared complete.
- No backend or external service changes are needed; the app remains a fully static browser game.
