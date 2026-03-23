# Sprint 005 — Draft Critique

## Claude Draft: Strengths

1. **Exhaustive QA test matrix.** The gameplay QA table in Phase 2 enumerates 16 specific scenarios covering every power, edge case (0 cash upkeep, full barn + Rowdy), and long-session stability. This is directly executable as a manual test plan — no interpretation needed.

2. **Five-dimensional QA structure.** Breaking QA into gameplay paths, responsive layout, input parity, performance, and cross-browser is disciplined. Each dimension has explicit targets (Lighthouse ≥ 90, touch targets ≥ 44px, specific viewport sizes) rather than vague "test it and see."

3. **CI/CD architecture is production-ready.** Two-job design (test on every PR, deploy only on push to main after test passes) with proper permissions scoping (`id-token: write`, `pages: write` only on deploy job). The Chromium-only Playwright decision avoids wasting CI minutes on unnecessary browser binaries.

4. **Env var approach for base path is correct.** The `GITHUB_PAGES=true` conditional preserves local dev ergonomics while producing correct deployed paths. The rationale for why hardcoding would break `npm run preview` shows forethought.

5. **404.html fallback addresses a real GitHub Pages gotcha.** Single-page apps on GitHub Pages need this, and the draft correctly identifies that `?seed=` debug URLs are the specific use case that would break without it.

6. **Ship polish phase is concrete.** Meta tags, favicon, og:image, incognito playthrough, zero console errors — these are the things that make a game "feel finished to a stranger" and they're all checkboxed rather than hand-waved.

7. **Risk table is thorough with calibrated impact levels.** Six risks spanning infrastructure (base path, CI flakiness, Actions minutes), QA process (rabbit holes), and browser compat (Safari audio). The "rabbit hole" risk with its 2-file heuristic is a practical scope guard.

8. **Files Summary includes untouched files.** Listing what won't change and why provides implementation confidence and prevents scope creep — particularly important for a "ship it" sprint where the temptation to tweak is high.

## Claude Draft: Weaknesses

1. **Phases 2–4 are serialized unnecessarily.** The draft acknowledges these "can overlap" but presents them in strict waterfall. For a single developer, interleaving responsive checks during gameplay QA is natural and more efficient. The ordering constraint ("don't call Phase N done until Phase N-1's fixes are merged") is sound, but the rigid presentation may slow execution.

2. **No CI caching strategy.** `npm ci` and `npx playwright install` run on every invocation with no mention of caching `node_modules` or Playwright browser binaries. On GitHub Actions free tier, this adds 1–2 minutes per run unnecessarily. `actions/setup-node` supports built-in npm caching.

3. **No mention of `concurrency` groups.** Without a concurrency setting on the deploy job, rapid successive pushes to `main` could trigger overlapping deployments. GitHub's `concurrency` key with `cancel-in-progress: true` is a one-liner fix.

4. **Vite base path uses a custom env var instead of the standard approach.** Vite natively supports `--base` as a CLI flag and `VITE_*` environment variables. Using a custom `GITHUB_PAGES` env var works but is non-standard. A simpler approach: `base: '/hoot-n-nanny/'` in a GitHub Pages-specific build script, or detecting `GITHUB_ACTIONS` (which is set automatically).

5. **Cross-browser testing relies entirely on manual effort.** The draft lists five browser targets but every one is a manual smoke test. No mention of BrowserStack, Playwright's WebKit engine for Safari approximation, or even a simple checklist template to track pass/fail per browser.

6. **No rollback strategy.** If a deployment breaks the live site, there's no documented way to revert. GitHub Pages deployments from Actions can be rolled back by re-running a previous workflow, but this isn't mentioned.

7. **OG image is "even a simple one" — too vague.** For a game that wants to feel finished to a stranger, the link preview image matters. This should either commit to generating one or explicitly punt it with a rationale.

## Gemini Draft: Strengths

1. **Concise and focused.** At ~50 lines, the draft is lean and scannable. Every section earns its space. For a sprint that's mostly infrastructure + QA, brevity is appropriate.

2. **Audio context unlock is called out as a first-class concern.** The "Click to Start" overlay suggestion is a concrete UX solution, not just a risk to watch. This shows awareness that mobile audio is the #1 deployment-day surprise.

3. **Performance phase includes actionable compression strategies.** Mentioning WebM/Ogg compression and lazy loading for audio assets shows practical thinking about what "performance audit" actually means beyond running Lighthouse.

4. **Animation optimization is specific.** Calling out the `top`/`left` → `transform`/`opacity` migration for hardware acceleration is a concrete, implementable suggestion rather than generic "optimize animations."

5. **"Zero external instructions" as a DoD item is user-centric.** This frames polish from the player's perspective rather than the developer's, which is the right lens for a ship sprint.

## Gemini Draft: Weaknesses

1. **Severely under-specified CI/CD.** No mention of: test job vs. deploy job separation, what tests run in CI (unit? E2E? bundle check?), permissions model, trigger conditions (PR vs. push to main), or runner environment. The workflow would need to be designed from scratch during implementation.

2. **No QA test matrix.** "Conduct complete runs targeting win condition and forced bust conditions" is too vague. Which powers are tested? What edge cases? The Claude draft's 16-scenario table is directly implementable; this draft requires the implementer to design the QA plan on the fly.

3. **Definition of Done is skeletal.** Five items vs. Claude's 37 checkboxes. Missing: specific viewport sizes, input method parity, cross-browser targets, performance thresholds, bundle size, memory leaks, meta tags, favicon, console error policy. A DoD this thin can't reliably gate a release.

4. **Risk analysis is shallow.** Three risks with no impact ratings, no mitigations beyond "handle it." The Claude draft's risk table has specific mitigations and fallback strategies. Missing risks: CI flakiness, GitHub Actions minutes, QA scope creep, 404 handling, rollback.

5. **No responsive/viewport specification.** "Mobile viewport" is mentioned but no specific sizes are listed. No landscape testing. No tablet. No touch target sizes. The gap between "test on mobile" and "test at 375×667, 667×375, 768×1024, 1920×1080 with ≥44px touch targets" is the gap between vague intent and verifiable criteria.

6. **No cross-browser testing plan.** The draft mentions mobile browsers blocking audio but doesn't list which browsers to test or what "passes" means for each.

7. **Modifies `package.json` to wire bundle checks into `build`.** This changes the local dev experience for all developers — `npm run build` would now also run bundle checks. The Claude draft correctly keeps this as a separate `npm run check:bundle` step that CI calls independently.

8. **No 404.html fallback.** The `?seed=` debug URL use case is unaddressed. Any direct link or bookmark to the deployed game with query params would 404.

9. **Phase ordering puts Performance before QA.** If the performance audit surfaces issues, fixes could invalidate QA results. Claude's ordering (gameplay QA → responsive → performance) is more logical because it fixes functional bugs before measuring performance.

## Gaps in Risk Analysis

### Claude Draft
- **No CORS or mixed-content risk.** If any asset URLs are protocol-relative or absolute, GitHub Pages HTTPS enforcement could cause mixed-content blocks. Low probability given Vite's bundling, but worth a line.
- **No risk around GitHub Pages cold start / propagation delay.** First deployment and DNS propagation can take minutes. Implementers might panic-debug a working deployment.
- **No accessibility regression risk.** The QA plan tests keyboard navigation and focus rings, but doesn't mention screen reader testing or ARIA attributes. This is likely out of scope, but the risk of shipping an inaccessible game isn't acknowledged.

### Gemini Draft
- **Nearly all significant risks are missing.** No CI flakiness, no scope creep, no 404 handling, no rollback strategy, no GitHub Actions budget, no Safari-specific audio issues beyond the generic "AudioContext" mention. The risk section needs to be rewritten from scratch using Claude's as a baseline.

## Missing Edge Cases

Both drafts miss:
- **localStorage quota exhaustion.** If the game persists state to localStorage, a full quota (common on mobile Safari at 5MB) could cause silent failures or crashes.
- **Service worker interference.** If a user has a PWA or browser extension that registers a service worker on the domain, cached responses could serve stale builds.
- **GitHub Pages rate limiting.** Under sudden traffic (e.g., posted to Hacker News), GitHub Pages has undocumented rate limits that could return 429s.
- **Prefers-reduced-motion.** Neither draft mentions respecting this media query for animations — relevant for the animation polish items.

Claude draft specifically misses:
- **Dark mode / forced colors.** No mention of `prefers-color-scheme` or Windows High Contrast mode behavior.

Gemini draft specifically misses:
- **Everything in Claude's QA matrix.** Stacks sharing slots, Sneak not filling barn slots, Calm neutralizing Noisy, Encore accumulating — none of these game-specific edge cases appear.

## Definition of Done Completeness

### Claude Draft: 37 checkboxes across 6 categories
**Verdict: Comprehensive.** Covers CI/CD mechanics, all 11 powers, four viewport sizes, three input methods, performance thresholds, five browser targets, and ship polish items. Minor gap: no accessibility-specific DoD items (screen reader, ARIA). Overall, this DoD is release-gate quality.

### Gemini Draft: 5 items
**Verdict: Insufficient for release gating.** A sprint could "pass" this DoD while shipping a game that's broken on Firefox, has no favicon, leaks memory after 10 nights, and is unusable with keyboard navigation. This DoD needs to be replaced wholesale with Claude's (or a close derivative).

## Recommendations for Final Merged Sprint

1. **Use Claude's draft as the base.** It is more complete in every dimension: architecture, QA structure, DoD, risk analysis, and files summary. The Gemini draft's strengths can be folded in as enhancements.

2. **Incorporate Gemini's audio context unlock as a Phase 1 item.** If the game doesn't already have a user-interaction gate for AudioContext, adding a "Click/Tap to Start" overlay should be part of the deployment-ready checklist, not discovered during QA.

3. **Incorporate Gemini's animation optimization note.** Add a bullet to Phase 4 (Performance) to verify animations use `transform`/`opacity` rather than layout-triggering properties. This is a concrete, actionable check.

4. **Add CI caching.** Use `actions/setup-node@v4` with `cache: 'npm'` and cache the Playwright browser binary via `actions/cache`. This is a few lines in the workflow and saves 1–2 minutes per run.

5. **Add concurrency groups to the deploy job.** One line prevents overlapping deployments:
   ```yaml
   concurrency:
     group: pages
     cancel-in-progress: false
   ```

6. **Add a rollback note to the Risks section.** Document that reverting to a previous deployment means re-running the last successful workflow run from the Actions tab.

7. **Adopt Gemini's "zero external instructions" DoD item.** Add it to Claude's Ship Polish section — it's a valuable user-centric gate that Claude's draft implies but doesn't state explicitly.

8. **Keep Claude's phase ordering but allow interleaving.** The waterfall presentation is correct for dependency tracking, but add a note that a single developer can interleave phases as long as fixes are merged before the next phase is "called done."

9. **Use `GITHUB_ACTIONS` env var instead of custom `GITHUB_PAGES`.** It's automatically set in GitHub Actions runners, reducing configuration surface. Alternatively, just set `base: '/hoot-n-nanny/'` in a dedicated `build:deploy` npm script.

10. **Strengthen the OG image commitment.** Either create a simple 1200×630 card (game title + pixel-art owl on a colored background) or explicitly decide "no OG image for v1" with a rationale. "Even a simple one" is not a plan.
