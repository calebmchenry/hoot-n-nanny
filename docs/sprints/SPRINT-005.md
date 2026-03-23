# Sprint 005: Ship It

## Overview

The game is mechanically complete after Sprints 001–004. This sprint answers one question: "Can a stranger visit a URL and play it?" It ships the game to GitHub Pages with automated CI/CD, validates the deployed artifact through structured QA, and fixes only what's broken.

Backlog items covered: **#26** (GitHub Pages CI/CD), **#27** (Final QA & Ship Polish).

Out of scope: New features, new animals, balance changes, visual redesigns, animation rework, broad refactors.

### Product Rules

- **Zero new runtime dependencies.** CI/CD is infrastructure-only. QA fixes touch existing code.
- **GitHub Pages is the only deployment target.** No Docker, no Vercel, no Netlify.
- **The deployed build must be identical to `npm run build`.** No special CI-only build steps.
- **QA validates the deployed artifact, not localhost.**
- **Polish is defect-driven.** Only fix things a stranger would immediately hit. No refactors disguised as polish.

---

## Architecture

### 1. Relocatable build artifact

Set `base: './'` in `vite.config.ts`. This makes all asset URLs relative, so the build works both locally and under `/hoot-n-nanny/` on GitHub Pages — without hardcoding the repo name.

Why relative over an env var: The app has no client-side router, only query params and static assets. Relative URLs work everywhere. No coupling to the repo name means renames and forks don't break production.

Add `scripts/check-pages-artifact.mjs` as a deployment gate. It inspects `dist/index.html` and `dist/assets/` to verify:
- No asset URLs start with `/assets/` (absolute paths break on subpath hosting)
- Every referenced JS/CSS file exists in `dist/assets/`
- No external CDN dependencies

Wire as `check:pages` in `package.json`.

### 2. GitHub Actions workflow: `.github/workflows/deploy-pages.yml`

A single workflow with two jobs:

**Job 1: `verify`** — Runs on every `push` and `pull_request`.

Steps:
1. Checkout repo
2. Setup Node 22 with `cache: 'npm'`
3. `npm ci`
4. `npm run build`
5. `npm run test`
6. `npm run check:bundle`
7. `npm run check:pages`
8. Install Playwright Chromium (`npx playwright install --with-deps chromium`)
9. `npm run test:e2e`

Cache Playwright browsers via `actions/cache` keyed on the Playwright version.

**Job 2: `deploy`** — Runs only on push to `main`, after `verify` passes.

Steps:
1. Checkout repo
2. Setup Node 22 with `cache: 'npm'`
3. `npm ci && npm run build`
4. `actions/configure-pages`
5. `actions/upload-pages-artifact@v3` (upload `dist/`)
6. `actions/deploy-pages@v4`

Permissions: `contents: read`, `pages: write`, `id-token: write` (deploy job only).

Concurrency control:
```yaml
concurrency:
  group: pages
  cancel-in-progress: false
```

Requires GitHub Pages configured to deploy from GitHub Actions in repository settings (Settings → Pages → Source → GitHub Actions). This is a one-time manual step.

### 3. 404 fallback

GitHub Pages returns 404 for unknown paths. Since `?seed=` debug URLs and bookmarks must survive reloads, add `public/404.html` — a minimal HTML file with a JS redirect to `index.html` preserving the query string. Vite copies it into `dist/` untouched.

### 4. Release-specific automated QA

Extend the existing Playwright/Vitest stack rather than inventing a parallel QA system.

New automated coverage:
- **Bust flow**: bust → pin → shop → next night (confirms pinned animal excluded)
- **Keyboard-only loop**: night → summary → shop → next night without mouse
- **Touch sanity**: critical controls work on the mobile Playwright project
- **Console cleanliness**: no errors/warnings on a loss path (existing tests cover win path)

Add `?seed=bust` deterministic state wired through `src/game/state.ts` and `src/app/App.tsx` (the existing `shop`, `win`, and `ability` seeds already cover other critical paths).

### 5. Manual QA on the live URL

Manual QA runs against the deployed GitHub Pages URL, not localhost. Local preview does not cover the actual subpath, caching behavior, or "stranger clicked the link" experience.

---

## Implementation Phases

### Phase 1 — Pages-safe build foundation

- Set `base: './'` in `vite.config.ts`
- Create `scripts/check-pages-artifact.mjs`
- Add `check:pages` script to `package.json`
- Create `public/404.html` with query-param-preserving redirect

**Exit criteria:**
- `npm run build` produces only relative asset paths
- `npm run check:pages` catches absolute paths and passes on correct builds
- Local `npm run dev` and `npm run preview` still work

### Phase 2 — GitHub Actions workflow

- Create `.github/workflows/deploy-pages.yml` with `verify` and `deploy` jobs
- Push branch, open PR, verify `verify` job passes
- Merge to `main`, verify `deploy` job succeeds

**Exit criteria:**
- PRs run full verification without deploying
- Push to `main` deploys automatically after green verification
- Game loads at `https://<user>.github.io/hoot-n-nanny/` with correct assets
- `?seed=win` and other debug params work on the deployed URL
- Only the newest `main` commit can deploy (concurrency enforced)

### Phase 3 — Release-specific automated QA

- Add `createSeededBustState()` in `src/game/state.ts`
- Wire `?seed=bust` in `src/app/App.tsx`
- Create `tests/release-smoke.spec.ts` covering bust/pin flow, keyboard-only loop, touch sanity, and loss-path console cleanliness

**Exit criteria:**
- Bust/pin regression caught automatically
- Keyboard-only regression caught automatically
- Mobile critical actions covered in Playwright
- Release smoke spec stable in CI

### Phase 4 — Manual ship pass and targeted fixes

Run a structured QA sweep against the live GitHub Pages URL across five dimensions:

**Gameplay paths:**

| Scenario | Verify |
|----------|--------|
| Clean win (3 blue ribbons) | Score tallies, win screen, fanfare, Play Again |
| Bust on night 1 | Pin modal, pinned animal excluded next farm |
| Bust with full barn (Rowdy) | Bust triggers correctly, no silent failure |
| Upkeep with 0 cash | 5 Pop penalty applied, game continues |
| Multiple Flock animals | End-of-night bonus calculated correctly |
| Stacks (Bunny/Jackalope) | Visual stacking correct, scoring counts all |
| Sneak (Mouse) | Doesn't fill barn slot, capacity correct |
| Calm neutralizes Noisy | 3 Noisy + 1 Calm prevents bust |
| Encore (Swan) | Pop accumulates across nights |
| Shop: buy all stock | Sold-out displayed, can't purchase |
| Shop: max capacity | Price scaling correct, max handled |
| Peek, Fetch, Kick | Each power UI works correctly |
| Long game (10+ nights) | No memory leaks, audio works, no degradation |

**Responsive layout** — verify at: 375×667, 667×375, 768×1024, 1920×1080. No horizontal scroll, no overflow, no clipped content.

**Input parity** — full playthrough with keyboard-only, mouse-only, and touch-only. Focus rings visible, touch targets ≥ 44px, no hover-only interactions.

**Performance** — Lighthouse ≥ 90 on deployed URL. 10+ night session with DevTools Performance Monitor (JS heap should plateau). Verify animations use `transform`/`opacity` not layout-triggering properties.

**Cross-browser** — smoke test on Chrome, Firefox, Safari (desktop), Chrome + Safari (mobile). Audio is the most likely failure point, especially Safari `AudioContext.resume()` timing.

Fix any issues found. Each fix is a targeted commit — not a refactor opportunity. If a fix touches more than 2 files or changes game logic, stop and evaluate scope.

**Exit criteria:**
- All scenarios pass on deployed URL
- No dead-end game states
- No console errors during any scenario
- Playable at all four viewport sizes
- Full playthrough possible with each input method
- Lighthouse ≥ 90
- No memory leaks
- Functional in Chrome, Firefox, Safari (desktop + mobile)

### Phase 5 — Final polish and closure

- Verify `<title>`, `<meta name="description">`, `<link rel="icon">` in `index.html`
- Zero console errors/warnings from game code during a full playthrough
- One final incognito playthrough (clean localStorage, no cache)
- CI pipeline green on `main` after all fixes

**Exit criteria:**
- Clean incognito playthrough succeeds
- Browser tab shows proper title and favicon
- CI green on `main`
- Another contributor can merge to `main` and get the same deploy without tribal knowledge

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `.github/workflows/deploy-pages.yml` | Single workflow: `verify` job (build, tests, bundle check, pages check, E2E) + `deploy` job (GitHub Pages on push to main) |
| `scripts/check-pages-artifact.mjs` | Static verification that built artifact has no absolute paths and is self-contained |
| `public/404.html` | Redirect to `index.html` preserving query params for `?seed=` URLs |
| `tests/release-smoke.spec.ts` | Playwright: bust/pin flow, keyboard-only loop, touch sanity, loss-path console cleanliness |

### Modified Files
| File | Changes |
|------|---------|
| `vite.config.ts` | Set `base: './'` for relocatable builds |
| `package.json` | Add `check:pages` script |
| `src/game/state.ts` | Add `createSeededBustState()` for deterministic QA |
| `src/app/App.tsx` | Wire `?seed=bust` into initial state resolution |
| `index.html` | Verify/add `<title>`, `<meta>` tags, favicon link |
| Various `src/` files | Targeted bug fixes from QA (specific files TBD; each fix is surgical) |

---

## Definition of Done

### CI/CD
- [ ] `.github/workflows/deploy-pages.yml` exists with `verify` and `deploy` jobs
- [ ] `verify` runs on every push and PR: build, test, check:bundle, check:pages, test:e2e
- [ ] `deploy` runs only on push to `main`, only after `verify` passes
- [ ] Workflow uses concurrency groups to prevent overlapping deployments
- [ ] npm and Playwright browser caches configured
- [ ] GitHub Pages source set to "GitHub Actions" in repo settings
- [ ] Game loads correctly at the GitHub Pages URL with all assets resolving

### Build Artifact
- [ ] `base: './'` produces only relative asset paths
- [ ] `check:pages` catches absolute path leaks and passes on correct builds
- [ ] `public/404.html` preserves query params on redirect
- [ ] `?seed=` debug URLs work on deployed URL (including after hard reload)
- [ ] Local `npm run dev` and `npm run preview` unaffected
- [ ] Bundle remains under 150KB gzipped hard budget

### Automated QA
- [ ] `?seed=bust` deterministic state exists and works
- [ ] Bust/pin flow tested in Playwright
- [ ] Keyboard-only navigation tested in Playwright
- [ ] Mobile critical-path interactions covered
- [ ] No console errors on loss path

### Gameplay QA (manual, on deployed URL)
- [ ] Clean win path works end-to-end
- [ ] Bust → pin → shop → next night works correctly
- [ ] All 11 powers function correctly
- [ ] No dead-end game states
- [ ] Long session (10+ nights) shows no degradation

### Responsive & Input (manual, on deployed URL)
- [ ] Playable at 375×667, 667×375, 768×1024, 1920×1080
- [ ] No horizontal scroll at any viewport
- [ ] Full playthrough with keyboard only, mouse only, touch only
- [ ] Focus rings visible during keyboard navigation
- [ ] Touch targets ≥ 44px on mobile

### Performance
- [ ] Lighthouse Performance ≥ 90 on deployed URL
- [ ] No memory leaks over sustained session (JS heap plateaus)

### Cross-Browser
- [ ] Chrome desktop: full playthrough
- [ ] Firefox desktop: full playthrough, audio works
- [ ] Safari desktop: audio context unlocks and loops
- [ ] Mobile Chrome: touch playthrough, responsive correct
- [ ] Mobile Safari: audio resume, touch playthrough

### Ship Polish
- [ ] `<title>` set (e.g., "Hoot N' Nanny")
- [ ] `<meta name="description">` set
- [ ] Favicon present
- [ ] Zero console errors/warnings from game code
- [ ] Clean incognito playthrough succeeds
- [ ] CI green on `main`
- [ ] The game requires zero external instructions to play
- [ ] Another contributor can repeat the deploy process without tribal knowledge

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Relative paths break in unexpected context** — `base: './'` doesn't cover CSS `url()` or dynamically constructed paths | High | `check:pages` script catches broken paths before deploy. Verify asset loading immediately after first deploy. |
| **GitHub Pages repo settings misconfigured** — correct workflow still fails without Pages enabled for Actions | High | Document the one-time manual step. Verify in Phase 2 before proceeding. |
| **Playwright in CI is flaky** — E2E tests time out or fail intermittently | Medium | Chromium only. Cache browser binaries. Generous timeouts. If flaky, add `retries: 1` in CI only. |
| **Safari audio regressions** — deployed build exposes AudioContext timing issues | Medium | Existing `visibilitychange` handler covers most cases. Dedicated Safari testing in Phase 4. Targeted workaround if needed. |
| **QA scope creep** — one bug leads to "while we're here" fixes | Medium | Every fix must be a targeted commit. If it touches >2 files or changes game logic, stop and evaluate. |
| **Cached stale build on Pages** — tester validates old deploy, not latest | Low | Vite hashes asset filenames. Verify deployed build matches latest `main` commit via workflow run. |
| **404.html redirect loses state** — redirect drops hash or causes flash | Low | Keep redirect minimal (JS `window.location.replace`). Game has no router or hash state. |

---

## Dependencies

### Internal
- Sprint 004 complete and stable: all gameplay, UI, animation, and audio implemented and tested
- All existing unit and E2E tests passing on `main`
- Existing npm scripts: `test`, `build`, `check:bundle`, `test:e2e`
- Existing seeded states: `?seed=shop`, `?seed=win`, `?seed=ability`

### External
- GitHub Actions runner: `ubuntu-latest` with Node 22
- Official GitHub Actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`
- GitHub Pages enabled in repo settings (one-time manual configuration)
- Playwright Chromium browser binary
- At least one real mobile browser for manual validation
- No new npm packages

### Phase Ordering

```
Phase 1 (build foundation)
└── Phase 2 (GitHub Actions workflow)
    └── Phase 3 (automated QA extensions)
        └── Phase 4 (manual ship pass + fixes)
            └── Phase 5 (final polish + closure)
```

Phases are sequential because each builds on the prior: Phase 2 needs the relocatable build from Phase 1, Phase 3 needs CI running from Phase 2, Phase 4 tests the live URL from Phase 2, and Phase 5 validates everything after Phase 4's fixes. A single developer can interleave work, but each phase's exit criteria must be met before the next is called done.
