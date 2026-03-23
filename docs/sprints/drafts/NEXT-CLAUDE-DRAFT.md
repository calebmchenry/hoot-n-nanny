# Sprint 005: Ship It

## Overview

The game is done. Sprints 001–004 delivered a complete, playable, polished browser game with full audio. This sprint answers the only remaining question: "Can a stranger visit a URL and play it?" It ships the game to GitHub Pages with automated CI/CD, then validates the deployed artifact through systematic QA.

Backlog items covered: **#26** (GitHub Pages CI/CD), **#27** (Final QA & Ship Polish).

Out of scope: New features, gameplay balance changes, new animals, new powers, visual redesigns.

### Product Rules

- **Zero new runtime dependencies.** CI/CD is infrastructure-only. QA fixes touch existing code.
- **GitHub Pages is the only deployment target.** No Docker, no Vercel, no Netlify.
- **The deployed build must be identical to `npm run build`.** No special CI-only build steps beyond what already exists.
- **QA validates the deployed artifact, not localhost.** Final playtesting happens on the real GitHub Pages URL.
- **Fixes from QA are surgical.** No refactors disguised as polish. If it's not broken for a stranger, don't touch it.
- **The game must feel finished.** No placeholder text, no broken layouts, no dead-end states, no console errors.

---

## Architecture

### 1. GitHub Actions: `.github/workflows/ci.yml`

A single workflow file handles both CI and deployment. Two jobs:

**Job 1: `test`** — Runs on every push and every pull request to `main`.

Steps:
1. Checkout repo.
2. Setup Node 22 (matches local dev; LTS at time of writing).
3. `npm ci` — deterministic install.
4. `npm run build` — type-check + Vite production build.
5. `npm run test` — Vitest unit tests.
6. `npm run check:bundle` — enforce < 150KB gzipped JS budget.
7. Install Playwright browsers (`npx playwright install --with-deps chromium`). Only Chromium — the mobile project in `playwright.config.ts` emulates Pixel 7 on Chromium, so no second browser binary is needed.
8. `npm run test:e2e` — Playwright E2E tests against the production build.

**Job 2: `deploy`** — Runs only on push to `main`, after `test` passes.

Steps:
1. Checkout repo.
2. Setup Node 22.
3. `npm ci && npm run build`.
4. Upload `dist/` as a GitHub Pages artifact using `actions/upload-pages-artifact@v3`.
5. Deploy using `actions/deploy-pages@v4`.

Requires GitHub Pages configured to deploy from GitHub Actions (not from a branch). Repository settings: **Settings → Pages → Source → GitHub Actions**.

The workflow uses the `pages` environment with `id-token: write` and `pages: write` permissions for the deploy job. The `test` job needs no special permissions.

### 2. Vite base path configuration

GitHub Pages serves the site at `https://<user>.github.io/<repo>/`. Vite must be told the base path so asset URLs resolve correctly.

In `vite.config.ts`, add:
```ts
base: process.env.GITHUB_PAGES === 'true' ? '/hoot-n-nanny/' : '/'
```

The CI workflow sets `GITHUB_PAGES=true` as an environment variable during the build step of the deploy job. Local development and `npm run build` default to `/`, preserving current behavior.

**Why an env var instead of hardcoding?** Hardcoding `/hoot-n-nanny/` would break `npm run preview` locally. The env var keeps local dev unchanged while producing correct paths in the deployed build.

### 3. QA structure

QA is not a vague "playtest and fix stuff" phase. It's a structured sweep across five dimensions:

1. **Gameplay paths** — Systematic playtesting of every reachable game state: normal win, bust on various nights, bust with pin, shop exhaustion, capacity-gated scenarios, blue ribbon strategies, edge cases (0 cash with upkeep, full barn with Rowdy, etc.).
2. **Responsive layout** — Verify every phase renders correctly at: 375×667 (iPhone SE portrait), 667×375 (landscape), 768×1024 (iPad), 1920×1080 (desktop). Focus: barn grid scaling, shop card layout, modals, audio controls.
3. **Input parity** — Full playthrough with keyboard-only, mouse-only, and touch-only. Verify focus management, hover states, activation of all powers.
4. **Performance** — Lighthouse audit on the deployed URL. Targets: Performance ≥ 90, no layout shifts, no janky animations. Check for memory leaks with a sustained ~10-night session (DevTools Performance Monitor).
5. **Cross-browser** — Manual smoke test on Chrome, Firefox, Safari (desktop), and Chrome + Safari (mobile). Audio is the most likely failure point.

Fixes discovered during QA are committed directly. Each fix is small and targeted.

### 4. 404 fallback

GitHub Pages returns a 404 for any path that doesn't match a file. Since this is a single-page app with no router, the only path that matters is `/`. But some browsers bookmark or refresh with query params (`?seed=...`). A `404.html` that redirects to `index.html` (preserving query params) ensures debug seeds and direct links work after deployment.

This is a simple HTML file with a `<meta>` redirect or a tiny JS redirect script. It lives at `public/404.html` so Vite copies it into `dist/` untouched.

---

## Implementation Phases

### Phase 1 — CI/CD pipeline

Create `.github/workflows/ci.yml` with the `test` and `deploy` jobs described above.

Update `vite.config.ts` to support the `GITHUB_PAGES` base path env var.

Create `public/404.html` with a redirect to `index.html` preserving query string.

Push to a branch, open a PR, and verify the `test` job passes. Merge to `main` and verify the `deploy` job succeeds and the game loads at the GitHub Pages URL.

**Exit criteria:**
- `test` job runs on PR and passes: build, unit tests, bundle check, E2E tests all green.
- `deploy` job runs on merge to `main` and successfully deploys.
- Game loads at `https://<user>.github.io/hoot-n-nanny/` with correct asset paths.
- `?seed=...` debug params work on the deployed URL.
- Local `npm run dev` and `npm run preview` are unaffected by the base path change.

### Phase 2 — Gameplay QA sweep

Play through every meaningful game path on the deployed GitHub Pages URL:

| Scenario | What to verify |
|----------|----------------|
| Clean win (3 blue ribbons) | Score tallies correctly, win screen triggers, fanfare plays, Play Again works |
| Bust on night 1 | Pin modal appears, pinned animal excluded from next farm, no scoring occurs |
| Bust with full barn (Rowdy forces invite over capacity) | Bust triggers correctly, not a silent failure |
| Call it a night with unused activate abilities | Abilities flash before auto-advance |
| Auto call-it-a-night at capacity with no unused activates | Transitions smoothly, no dead state |
| Upkeep with 0 cash | 5 Pop penalty applied, game continues |
| Multiple Flock animals in barn | End-of-night bonus calculated correctly |
| Stacks (Bunny/Jackalope) share a slot | Visual stacking correct, scoring counts all |
| Sneak (Mouse) doesn't fill a barn slot | Capacity tracking correct |
| Calm neutralizes Noisy | 3 Noisy but 1+ Calm prevents bust |
| Encore (Swan) accumulates across nights | Pop value increases each entry |
| Shop: buy all stock of an animal | Sold-out state displayed correctly, can't purchase |
| Shop: buy barn capacity until max | Price scaling correct, max cap handled |
| Peek → reveals next animal correctly | Peek modal matches actual next draw |
| Fetch → pick specific animal from farm | Selection UI works, chosen animal enters barn |
| Kick → remove animal from barn | Removed animal handled correctly in scoring/layout |
| Long game (10+ nights) | No memory leaks, audio still works, no performance degradation |

Fix any bugs found. Each fix is a targeted commit — not a refactor opportunity.

**Exit criteria:**
- All scenarios above pass on the deployed URL.
- No dead-end game states discovered.
- No console errors during any scenario.

### Phase 3 — Responsive & input QA

Test the deployed game at all target viewports:

**Responsive checks (Chrome DevTools device mode):**
- 375×667 (iPhone SE portrait): barn grid readable, shop cards don't overflow, modals fit
- 667×375 (iPhone SE landscape): barn grid usable, no horizontal scroll
- 768×1024 (iPad portrait): comfortable spacing, no wasted space
- 1920×1080 (desktop): centered, not stretched, text readable

**Input parity:**
- Keyboard-only: Tab through all interactive elements in order. Arrow keys navigate barn grid. Enter activates. Escape closes modals. Focus ring visible on all interactive elements.
- Mouse-only: Hover states, click targets, no elements requiring keyboard to reach.
- Touch: Tap targets ≥ 44px. No hover-only interactions. Audio controls usable. Pinch/zoom doesn't break layout.

Fix any layout or input issues found.

**Exit criteria:**
- Game is playable and visually correct at all four viewport sizes.
- Full playthrough possible with each input method independently.
- No elements are unreachable with any input method.

### Phase 4 — Performance & cross-browser

**Performance audit:**
- Run Lighthouse on the deployed URL. Target: Performance ≥ 90.
- Check `dist/` output: no unexpected large assets, JS bundle under 150KB gzipped (already enforced by CI, but verify the actual number).
- Open DevTools Performance Monitor. Play 10+ nights. Watch JS heap — it should plateau, not climb. Check for detached DOM nodes.
- Verify animations hit 60fps (no layout thrashing from barn grid updates).

**Cross-browser smoke test:**
- Chrome (desktop): full playthrough ✓ (covered by Playwright, but manual sanity check)
- Firefox (desktop): full playthrough, audio works, no visual glitches
- Safari (desktop): full playthrough, audio context unlocks, music loops correctly, volume controls work
- Chrome (Android / mobile emulation): touch playthrough, responsive layout
- Safari (iOS / BrowserStack or real device): audio context resume after background, touch playthrough

Fix any issues found. Safari audio issues are the most likely; typically they involve `AudioContext.resume()` timing.

**Exit criteria:**
- Lighthouse Performance ≥ 90 on deployed URL.
- No memory leaks over 10+ nights.
- Bundle stays under 150KB gzipped.
- Game functional in Chrome, Firefox, and Safari (desktop + mobile).
- No browser-specific CSS or JS hacks needed (or if needed, they're minimal and documented).

### Phase 5 — Final polish & hardening

Address anything surfaced in Phases 2–4 that wasn't fixed inline. Then:

- Review all console output during a full playthrough. Zero errors, zero warnings (except browser-generated ones outside our control).
- Verify `<meta>` tags in `index.html`: title, description, og:image (even a simple one), viewport. A stranger landing on the URL should see a proper browser tab title and a reasonable link preview.
- Verify favicon exists (even a minimal one — a pixel-art owl, a barn emoji, anything).
- Run the full CI pipeline one final time on `main` after all fixes are merged.
- Do one last playthrough on the deployed URL from an incognito window (clean localStorage, no cache).

**Exit criteria:**
- Clean incognito playthrough: game loads, plays, and wins with no issues.
- Zero console errors/warnings from game code.
- Browser tab shows a proper title and favicon.
- CI pipeline is green on `main`.
- The game feels finished to a stranger.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | GitHub Actions workflow: `test` job (build, unit tests, E2E, bundle check) + `deploy` job (GitHub Pages deployment on push to main) |
| `public/404.html` | Redirect to `index.html` preserving query params, so `?seed=` debug URLs and direct links work on GitHub Pages |

### Modified Files
| File | Changes |
|------|---------|
| `vite.config.ts` | Add conditional `base` path for GitHub Pages (`/hoot-n-nanny/` when `GITHUB_PAGES=true`, `/` otherwise) |
| `index.html` | Add/verify `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<link rel="icon">` for proper link previews and browser tab display |
| Various `src/` files | Targeted bug fixes from QA — specific files TBD based on issues found; each fix is surgical and committed individually |

### Untouched Files
| File | Reason |
|------|--------|
| `src/game/engine.ts` | Game logic is complete and tested — no gameplay changes |
| `src/game/types.ts` | Type definitions stable |
| `src/game/catalog.ts` | Animal definitions unchanged |
| `src/audio/engine.ts` | Audio engine complete from Sprint 004 |
| `src/audio/sounds.ts` | Sound definitions complete |
| `src/audio/deriveCues.ts` | Cue derivation complete |
| `playwright.config.ts` | E2E config unchanged — CI reuses the same config |
| `vitest.config.ts` | Unit test config unchanged |
| `package.json` | No new dependencies, no new scripts (CI uses existing npm scripts) |
| `scripts/check-bundle-budget.mjs` | Bundle check script unchanged — CI calls it via `npm run check:bundle` |

---

## Definition of Done

### CI/CD
- [ ] `.github/workflows/ci.yml` exists and is syntactically valid
- [ ] `test` job runs on every push and every PR to `main`
- [ ] `test` job runs: `npm run build`, `npm run test`, `npm run check:bundle`, `npm run test:e2e`
- [ ] `test` job installs only Chromium (no unnecessary browser downloads)
- [ ] `deploy` job runs only on push to `main`, only after `test` passes
- [ ] `deploy` job uses `actions/upload-pages-artifact` + `actions/deploy-pages`
- [ ] GitHub Pages source is configured as "GitHub Actions" in repo settings
- [ ] Game loads correctly at `https://<user>.github.io/hoot-n-nanny/`
- [ ] All asset paths (JS, CSS, sprites, fonts) resolve correctly on GitHub Pages
- [ ] `?seed=` debug params work on the deployed URL
- [ ] `public/404.html` exists and redirects to `index.html` preserving query params
- [ ] Local `npm run dev` and `npm run preview` still work with base path `/`

### Gameplay QA
- [ ] Clean win path (3 blue ribbons → win screen → Play Again) works on deployed URL
- [ ] Bust path (bust → pin → next night) works correctly
- [ ] All 11 powers function correctly: Noisy, Stacks, Calm, Fetch, Kick, Peek, Flock, Sneak, Encore, Rowdy, Upkeep
- [ ] Upkeep with insufficient cash applies 5 Pop penalty
- [ ] Shop purchases work (animals and capacity upgrades)
- [ ] Sold-out animals display correctly and can't be purchased
- [ ] Auto call-it-a-night triggers correctly at capacity with no unused activates
- [ ] No dead-end game states — every state has a valid next action
- [ ] Scoring order correct: Pop → Cash → Upkeep costs → End-of-night abilities
- [ ] Night counter displays and increments correctly
- [ ] Long session (10+ nights) shows no degradation

### Responsive & Input
- [ ] Game playable at 375×667 (phone portrait)
- [ ] Game playable at 667×375 (phone landscape)
- [ ] Game playable at 768×1024 (tablet)
- [ ] Game playable at 1920×1080 (desktop)
- [ ] No horizontal scroll at any viewport
- [ ] Full playthrough possible with keyboard only
- [ ] Full playthrough possible with mouse only
- [ ] Full playthrough possible with touch only
- [ ] Focus rings visible on all interactive elements during keyboard navigation
- [ ] Touch targets ≥ 44px on mobile

### Performance
- [ ] Lighthouse Performance score ≥ 90 on deployed URL
- [ ] JS bundle < 150KB gzipped (enforced by CI)
- [ ] No memory leaks over a sustained session (JS heap plateaus)
- [ ] Animations run at 60fps (no layout thrashing)

### Cross-Browser
- [ ] Chrome desktop: full playthrough passes
- [ ] Firefox desktop: full playthrough passes, audio works
- [ ] Safari desktop: full playthrough passes, audio context unlocks and loops
- [ ] Mobile Chrome: touch playthrough, responsive layout correct
- [ ] Mobile Safari: audio resume after background, touch playthrough

### Ship Polish
- [ ] `<title>` tag set (e.g., "Hoot N' Nanny")
- [ ] `<meta name="description">` set
- [ ] Favicon present
- [ ] Zero console errors/warnings from game code during a full playthrough
- [ ] Clean incognito playthrough succeeds (no stale cache/localStorage assumptions)
- [ ] CI pipeline green on `main` after all fixes merged

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **GitHub Pages base path breaks assets** — Vite-generated paths don't include the repo prefix, causing 404s for JS/CSS | High | Use Vite's `base` config with env var. Verify asset loading immediately after first deploy in Phase 1. If issues persist, hardcode the base path and accept the local preview inconvenience. |
| **Playwright in CI is flaky or slow** — E2E tests time out or fail intermittently in GitHub Actions due to resource constraints | Medium | Use only Chromium (skip WebKit/Firefox which are slower in CI). Set generous timeouts. If flakiness persists, add `retries: 1` in CI config only. Do not disable E2E — it's too valuable. |
| **Safari audio regressions** — Deployed build exposes audio timing issues not caught locally | Medium | Dedicate explicit time to Safari testing in Phase 4. Most Safari audio issues are `AudioContext.resume()` race conditions — the existing `visibilitychange` handler should cover it. If Safari has unique issues, add a targeted workaround. |
| **QA finds a rabbit hole** — One bug leads to a chain of "while we're here" fixes | Medium | Every QA fix must be a targeted commit. If a fix touches more than 2 files or changes game logic, stop and evaluate whether it's in scope. The game shipped 4 sprints of tested code — most "bugs" found now will be edge-case cosmetic issues, not structural problems. |
| **GitHub Actions minutes budget** — Playwright + build could be slow on the free tier | Low | Free tier includes 2000 minutes/month. A single CI run should take ~3–5 minutes. This is well within budget for a personal project. |
| **404.html redirect loses state** — The redirect approach drops hash fragments or causes a flash of wrong content | Low | Keep the redirect minimal (just a `<script>` that does `window.location.replace`). The game has no router and no hash-based state, so this is extremely unlikely to matter. |

---

## Dependencies

### Internal
- Sprint 004 complete and stable: all gameplay, UI, animation, and audio implemented and tested.
- All existing unit and E2E tests passing on `main` before this sprint begins.
- Repository hosted on GitHub (required for GitHub Pages and GitHub Actions).

### External
- GitHub Actions runner environment: `ubuntu-latest` with Node 22.
- `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` — all official GitHub Actions, well-maintained.
- GitHub Pages enabled on the repository (manual one-time configuration in Settings → Pages → Source → GitHub Actions).
- Playwright Chromium browser binary (downloaded during CI via `npx playwright install`).
- No new npm packages.

### Ordering
- Phase 1 (CI/CD) must come first — all subsequent phases test against the deployed URL.
- Phases 2, 3, and 4 can overlap but are listed sequentially because each may produce fixes that affect the others.
- Phase 5 (final polish) comes last as a hardening pass.

```
Phase 1 (CI/CD pipeline)
└── Phase 2 (Gameplay QA)
    └── Phase 3 (Responsive & Input QA)
        └── Phase 4 (Performance & Cross-browser)
            └── Phase 5 (Final polish & hardening)
```

Phases 2–4 are shown sequentially because fixes in one phase could regress another. Running them in a waterfall ensures each phase validates against the cumulative state of all prior fixes. In practice, a single developer can interleave these — the ordering constraint is "don't call Phase N done until Phase N-1's fixes are merged."
