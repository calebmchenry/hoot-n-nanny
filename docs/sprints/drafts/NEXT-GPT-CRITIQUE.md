# Critique of Sprint 005 Drafts

This critique compares `NEXT-CODEX-DRAFT.md` and `NEXT-GEMINI-DRAFT.md` against the current repo state for backlog items 26 and 27. Today the project already has `npm run test`, `npm run build`, `npm run test:e2e`, and `npm run check:bundle`; Playwright already covers win/shop/audio/motion flows; seeded entry states already exist for `win`, `shop`, and `ability`; and there is no GitHub Pages workflow or Pages-specific artifact check yet. The best final sprint should finish release engineering without reopening broad product or design scope.

## 1. Codex Draft

### Strengths

- Best fit with the current repo. It names the existing scripts and test posture accurately, recognizes that GitHub Pages release engineering is the missing layer, and builds on the current seeded-state seam in `src/app/App.tsx` and `src/game/state.ts`.
- Strong scope control. The out-of-scope list and "defect-driven polish only" rule are exactly the right guardrails for the last sprint.
- Strong release strategy. It treats GitHub Pages path safety, CI gating, and live-site validation as first-class deliverables instead of assuming deployment is a trivial afterthought.
- Good QA leverage. It extends the existing Playwright stack rather than inventing a parallel QA system, and it targets real current gaps such as bust/pinning, keyboard-only flow, and mobile critical actions.
- Strongest implementation detail. The phases, files, exit criteria, and Definition of Done are specific enough that another contributor could execute the sprint without guessing.

### Weaknesses

- It is slightly overcommitted to a few implementation choices before validation. `base: './'` is likely the right answer here, but the draft presents it as settled fact instead of a choice to confirm against the real Pages deploy.
- The "single workflow as the only release workflow" stance is more opinionated than necessary. The important requirement is clean verify/deploy separation with the right gates and permissions, not the exact workflow-file topology.
- `check:pages` is a good idea, but the draft scopes it mostly around `dist/index.html`. If implemented too narrowly, it could miss CSS `url()` assets, icons, manifests, or future static files outside `dist/assets`.
- The manual QA requirement is correct, but it does not explain how to prove the live Pages URL is serving the latest deploy rather than a cached older build.
- The informal "stay within roughly 10 KB of today’s baseline" guidance is useful as a review heuristic, but it is not enforceable in the same way as the existing hard budget.

### Gaps in Risk Analysis

- GitHub configuration risk is missing. The draft should explicitly call out that the repo must have GitHub Pages enabled for GitHub Actions, and that Pages/environment permissions can block the first deploy even when the workflow file is correct.
- Cache and provenance risk are underplayed. Pages or browser caching can make it unclear whether a tester is validating the latest `main` build.
- CI stability risk is light. Running the full Playwright suite on every PR is reasonable, but the draft does not discuss retries, artifacts, or what happens if the new release-smoke coverage is flaky.
- Query-param and direct-load risk should be explicit. This repo already relies on `?seed=` states for QA, so live-site reloads and copied seeded URLs are part of the actual Pages risk profile.
- Accessibility risk is present but not fully measured. Keyboard/focus checks are included, but there is no concrete threshold for touch-target quality or for summary/win-screen focus/live-region behavior.

### Missing Edge Cases

- Hard reload from the live Pages URL while on `?seed=shop`, `?seed=win`, and the proposed `?seed=bust`, not just first navigation.
- First visit with persisted audio settings in `localStorage` while the audio context is still locked.
- Bust -> pin -> shop -> next night behavior after a reload or fresh deploy, not only in one uninterrupted session.
- No-op and disabled interactions on keyboard/mobile paths staying stable and silent: full barn, sold-out offer, cancel targeting, or no valid purchase.
- Validation that the deploy still works cleanly if the repo path changes in the future, since Pages path handling is one of the sprint’s central risks.

### Definition of Done Completeness

This is the stronger Definition of Done. It covers deploy automation, CI gates, artifact safety, targeted automated QA, live manual QA, and repeatability.

What is still missing or worth tightening:

- An explicit prerequisite that GitHub Pages is configured to deploy from GitHub Actions.
- Explicit live-site checks for seeded URLs plus hard reload behavior.
- A concrete way to tie the tested Pages build back to the latest `main` commit or workflow run.
- A sharper definition of what counts as a blocking console issue, especially if warnings are treated the same as errors.

## 2. Gemini Draft

### Strengths

- It correctly identifies the three real themes of the sprint: deployment, performance/bundle discipline, and final QA.
- It calls out two genuine risks that matter here: GitHub Pages asset paths and mobile audio restrictions.
- It includes one dependency note the Codex draft should also keep: GitHub Pages has to be enabled and configured in the repository.
- It is short and easy to scan, which makes the high-level intent clear quickly.

### Weaknesses

- It is too generic for this repo. It barely engages with the existing scripts, tests, seeds, or current file seams, so much of it reads like a template for any Vite game.
- The proposed dynamic `base` using `process.env.GITHUB_REPOSITORY` is more brittle than necessary because it couples the build output to the repository name instead of making the artifact itself relocatable.
- `npm run preview` is not a meaningful deployment gate on its own. The repo already has `npm run test:e2e`, which starts preview and actually asserts browser behavior.
- Wiring `check-bundle-budget.mjs` directly into `build` would make every local build pay a release-gate tax and duplicates the existing dedicated `check:bundle` script.
- The "Polish & Juice" phase is open-ended in a way that does not match backlog item 27. It invites animation and copy work without requiring a reproducible bug or failed QA check.
- The audio unlock overlay is proposed too early. The current app already has audio controls and audio-specific Playwright coverage, so an overlay should be a conditional fix, not assumed sprint scope.
- The file summary is vague and misses important deliverables such as a Pages artifact check script or a live ship checklist.

### Gaps in Risk Analysis

- No CI orchestration risk: permissions, concurrency, PR-vs-main behavior, artifact upload, and deploy sequencing are all absent.
- No live-URL QA risk: the draft never treats testing the real Pages site as different from testing locally.
- No regression-risk framing around the repo’s current weak spots: bust/pin flow, keyboard-only loop, focus restoration, non-win console cleanliness, and seeded-state reloads.
- No risk around subjective language like "requires zero external instructions," which is difficult to measure and easy to argue about.
- No cache or deep-link risk for Pages subpaths and seeded query parameters.

### Missing Edge Cases

- Direct-load and reload behavior for existing seeded URLs: `?seed=shop`, `?seed=win`, and `?seed=ability`.
- Bust -> pin -> shop -> next night flow, which is one of the few obvious gameplay paths not already covered today.
- Keyboard-only completion of night -> summary -> shop -> next night.
- Touch interactions for the current critical controls: invite, call it a night, buy offer, start next night, and play again.
- Small-screen and landscape overflow regressions, which matter because the current suite already tests a 320px-width case.
- Console cleanliness on a loss/bust path, not only on the happy path.
- Focus restoration across transitions and reduced-motion behavior.

### Definition of Done Completeness

The Gemini DoD is incomplete for this repo. It confirms a few important outcomes, but it does not define the mechanics that make the sprint reproducible and reviewable.

Missing from the DoD:

- Pull-request verification requirements.
- The explicit release gate scripts to pass.
- Artifact relocatability or self-containment requirements.
- A live manual checklist deliverable.
- Accessibility-specific criteria for focus, keyboard navigation, and touch safety.
- A measurable definition of "zero external instructions."

As written, the sprint could satisfy the Gemini DoD and still ship with brittle Pages paths, untested regressions, or no repeatable ship process.

## 3. Recommendations for the Final Merged Sprint

1. Use the Codex draft as the base document. It is substantially more repo-aware and much closer to the actual work left by backlog items 26 and 27.
2. Keep Gemini’s explicit dependency note: the final sprint should state up front that GitHub Pages must be enabled for GitHub Actions before the workflow can succeed.
3. Keep Codex’s relocatable-artifact direction and `check:pages` gate, but strengthen it with explicit live Pages reload/deep-link checks for seeded URLs and any static asset references beyond bare JS/CSS.
4. Keep the release gate as separate scripts: `npm run test`, `npm run build`, `npm run check:bundle`, `npm run check:pages`, and `npm run test:e2e`. Do not fold bundle checking into `build`, and do not treat `npm run preview` as a test.
5. Keep Codex’s defect-driven polish rule. Reject Gemini’s open-ended "juice" phase unless a concrete bug or failed checklist item justifies the work.
6. Merge Gemini’s mobile-audio concern as a named risk, but make the fix conditional. Only add an explicit unlock overlay if the current controls plus first-gesture flow fail on real devices.
7. Add three explicit ship checks to the final merged DoD:
   - Live Pages seeded URLs hard-reload correctly.
   - The deployed site can be tied back to the latest `main` commit or workflow run.
   - GitHub Actions/Pages repository settings are documented well enough for another contributor to repeat the setup.

That merged sprint would preserve the Codex draft’s implementation clarity, absorb Gemini’s useful dependency and mobile-audio cautions, and close the remaining operational gaps around live-site verification and deploy reproducibility.
