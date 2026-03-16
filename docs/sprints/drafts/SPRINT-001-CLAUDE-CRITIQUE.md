# Sprint 001 Critique: Codex Draft vs. Gemini Draft

Reviewed against `docs/INTENT.md`, `docs/sprints/drafts/SPRINT-001-INTENT.md`, and each other.

---

## Codex Draft

### Strengths

1. **Tooling depth is excellent.** ESLint, Prettier, `.nvmrc`, `engines` field, `npm ci` enforcement, format-check scripts — this is the only draft that treats developer experience as a first-class deliverable. A new contributor genuinely can't go wrong if these gates exist from day one.
2. **Bundle budgeting as a phase.** Dedicating 15% of effort to vendor chunking, a budget script, and a documented baseline is forward-thinking. Phaser is ~1MB minified; making that visible before content arrives is smart.
3. **Test infrastructure scaffold.** Vitest + Playwright in Sprint 001 directly contradicts the sprint intent's "no automated tests" note, but in a good way. The intent was written conservatively; having even one smoke test and one unit test suite means Sprint 002 lands into an existing test shape rather than retrofitting one.
4. **Pure helper extraction pattern.** Separating `viewport.ts` and `barnLayout.ts` as testable pure functions outside Phaser scenes is architecturally sound. It makes the layout math unit-testable without mocking Phaser.
5. **Security section is thorough.** Readiness hook scoping, minimal GH Actions permissions, lockfile enforcement, no CDN scripts — covers the right surface for a static site sprint.
6. **Five clear use cases** that map well to Definition of Done items.

### Weaknesses

1. **No concrete layout spec.** The barn scene is described as "five empty animal slots" and a "Draw Animal control" with no coordinates, sizes, or colors. Compare Gemini's pixel-level wireframe. Without a spec, the implementer has to make dozens of micro-decisions that won't be consistent with what Sprint 002 expects.
2. **Speculative directory structure.** `src/app/`, `src/systems/`, `src/ui/` — three subdirectories that will each contain exactly one file. This is premature organization. Gemini's "don't create a directory until a second file needs it" principle is more pragmatic.
3. **No orientation strategy.** The open questions mention it (Q4) but the architecture section is silent. The sprint intent explicitly asks about orientation support, and the product intent says "fixed aspect ratio with letterboxing." A foundation sprint that punts on orientation handling is shipping a known gap to Sprint 002.
4. **Vague effort estimates.** "20% / 30% / 20% / 15% / 15%" with no task checklists inside each phase. An implementer can't tell when a phase is done vs. when they've gold-plated it.
5. **`100dvh` is never mentioned.** iOS Safari's dynamic viewport height issue is one of the most common mobile web bugs. Codex doesn't address it at all.
6. **No `.gitignore` in the file manifest.** Minor, but conspicuous for a "repo contracts" draft.

### Gaps in Risk Analysis

- **No iOS Safari-specific viewport risk** (`100vh` vs `100dvh`, address bar resize jank). This is arguably the highest-likelihood mobile rendering bug.
- **No risk around Phaser's TypeScript typings.** Phaser's TS support has historically been rough — `@types/phaser` doesn't exist, types ship with the package but have known gaps. If strict mode hits a typing wall, the implementer needs a plan (ambient declarations, `// @ts-expect-error` policy).
- **No risk around GitHub Pages path mismatch.** The Vite `base` path must match the repo slug exactly or all asset URLs break in production. Gemini calls this out explicitly.

### Missing Edge Cases

- No mention of `user-scalable=no` in the viewport meta (standard for games, but an accessibility trade-off that should be documented).
- No mention of what happens when the "Draw Animal" button is tapped. There's no visual feedback spec.
- No mention of DPR clamping behavior on 3x displays (iPhone Pro Max). The architecture section mentions `min(dpr, 2)` but doesn't address what happens visually when clamped.

### Definition of Done Completeness

Mostly complete but has two gaps:
- No orientation behavior defined (portrait-only? letterbox in landscape? prompt?).
- "A bundle budget is documented and enforced in CI" — but no specific threshold or method for determining one. Could be satisfied by literally any number.

---

## Gemini Draft

### Strengths

1. **Pixel-level wireframe spec.** Exact coordinates, exact colors, exact sizes for every element in the barn scene. This is the single most valuable thing in either draft. An implementer (human or AI) can build BarnScene without asking a single clarifying question.
2. **Orientation prompt is fully designed.** DOM overlay approach, CSS toggling, clear behavior spec. This is a real decision, not a deferred question. It's also the simpler and more correct approach compared to trying to render a landscape layout.
3. **`100dvh` with `-webkit-fill-available` fallback.** Addresses the iOS Safari viewport bug directly with a concrete mitigation.
4. **CLAUDE.md is specified as a deliverable with contents.** The draft includes what CLAUDE.md should contain, not just "write a conventions doc." This ensures the conventions are captured, not improvised.
5. **Opinionated about structure minimalism.** "No subdirectories beyond these four in Sprint 001" and "No barrel files until 3+ exports" are rules that prevent the premature abstraction that plagues greenfield projects.
6. **Touch input spec is concrete.** `pointerdown` not `click`, 44px minimum tap target, tint flash with 100ms `delayedCall` — these are implementable specs, not guidelines.
7. **Open questions are actionable.** Each one identifies a real decision with concrete trade-offs rather than vague concerns.

### Weaknesses

1. **No test infrastructure at all.** The sprint intent says "no automated tests" but Codex is right that even a minimal test scaffold pays for itself immediately. Gemini follows the intent literally, which means Sprint 002 has to both build gameplay AND retrofit a test harness. This is the draft's biggest gap.
2. **No ESLint, no Prettier, no linting of any kind.** The CI workflow only runs `npm run build`. No typecheck script, no format check, no lint. This means code quality is entirely trust-based until someone adds tooling later. For a project that will be worked on by AI agents, this is a significant gap — agents need guardrails.
3. **No bundle budgeting or vendor chunking.** Phaser ships as a monolith; without vendor chunking, every app code change invalidates the entire cached JS payload. No budget means no alarm when someone adds a 500KB sprite sheet in Sprint 003.
4. **CI workflow is too thin.** `npm ci` + `npm run build` is necessary but not sufficient. No typecheck step (relies on build failing, which may not catch all strict errors depending on Vite config), no lint, no test.
5. **`npm install` instead of `npm ci` in the fresh-clone use case.** The Definition of Done says "`npm install && npm run dev`" — this should be `npm ci` for deterministic installs. The Codex draft gets this right.
6. **No `.nvmrc` or `engines` field.** Node version is mentioned for CI but not enforced locally. A contributor on Node 18 or 22 could hit silent incompatibilities.
7. **`src/types/index.ts` is premature.** Exporting `SlotState` and `SceneKey` in Sprint 001 when nothing consumes `SlotState` beyond a type definition is creating structure without a consumer. Scene keys can be string literals until there's a reason to centralize them.

### Gaps in Risk Analysis

- **No risk around Phaser bundle size.** The biggest runtime dependency is unmentioned. If the initial JS payload is 1.2MB gzipped, there's no mechanism to detect or discuss it.
- **No risk around CI/deploy artifact divergence.** Gemini's deploy workflow rebuilds in the deploy step — but doesn't note the risk that a build could pass CI and fail deploy (or vice versa) if environment variables or Node versions drift.
- **No risk around test regression.** With zero tests, any future sprint that introduces bugs has no automated safety net. The risk table should acknowledge this as a conscious trade-off.
- **Orientation prompt interaction with Phaser.** Hiding the canvas and showing a DOM overlay could cause Phaser to lose focus or misbehave on re-show. This is flagged as low-risk but the mitigation ("smooth transition later") doesn't address the technical concern.

### Missing Edge Cases

- No mention of what happens on tablets in landscape (iPad in landscape is a legitimate use case where `innerWidth > innerHeight` but the screen is big enough to play).
- No DPR handling at all. High-DPI devices will render at native resolution, which can be 3x on iPhone Pro — this affects GPU cost and memory on the exact devices being targeted.
- No mention of the `maximum-scale=1` viewport behavior difference between iOS 16+ and earlier versions.
- Button tap feedback is specified (tint flash) but no specification for what happens to the slots when tapped (should they be interactive in Sprint 001?).

### Definition of Done Completeness

Strong. Every item is testable and specific:
- Viewport checks at two specific widths (375px, 1440px)
- Orientation behavior specified
- Visual elements enumerated
- CLAUDE.md contents specified

One gap: no performance criterion. "Barn scene renders" doesn't say whether it should render at 60fps, or whether the idle scene should avoid continuous CPU draw. Codex's "avoid continuous redraw" criterion is missing here.

---

## Head-to-Head Comparison

| Dimension | Codex | Gemini | Edge |
|---|---|---|---|
| Tooling & quality gates | ESLint, Prettier, typecheck, format-check, `.nvmrc`, `engines` | None beyond `tsc` via build | **Codex** by a mile |
| Test infrastructure | Vitest + Playwright scaffold | Nothing | **Codex** |
| Bundle discipline | Vendor chunking, budget script, baseline doc | Not addressed | **Codex** |
| Scene specification | Vague ("five slots, a control") | Pixel-perfect wireframe with coordinates and colors | **Gemini** by a mile |
| Orientation handling | Deferred to open questions | Fully designed DOM overlay approach | **Gemini** |
| iOS Safari handling | DPR clamping mentioned, `100dvh` missing | `100dvh` + `-webkit-fill-available` fallback | **Gemini** |
| Directory structure | Over-structured (5 subdirs for 5 files) | Minimal, principle-based ("no dir until 2nd file") | **Gemini** |
| CLAUDE.md as deliverable | Mentioned as output | Contents specified | **Gemini** |
| CI/CD completeness | Full pipeline (lint, typecheck, test, build, budget, deploy) | Build + deploy only | **Codex** |
| Risk analysis breadth | 5 risks, reasonable mitigations | 4 risks with likelihood/impact ratings | **Codex** (more risks, but Gemini's format is better) |
| Implementation clarity | Phase descriptions, no task checklists | Checkbox task lists per phase | **Gemini** |
| Phase effort allocation | 20/30/20/15/15 (5 phases) | 25/40/15/20 (4 phases) | **Gemini** (more weight on the barn scene, which is the actual deliverable) |

---

## What I Would Steal for the Final Merged Sprint

### From Codex

1. **The entire test infrastructure phase.** Vitest config, one unit test suite for layout math, one Playwright smoke test with a mobile viewport. Non-negotiable. The sprint intent was too conservative here.
2. **ESLint + Prettier + typecheck as standalone scripts.** `npm run lint`, `npm run format:check`, `npm run typecheck` — all wired into a `npm run ci` meta-script and the GitHub Actions workflow.
3. **`.nvmrc` + `engines` field.** Cheap insurance.
4. **Vendor chunk splitting.** One line in `vite.config.ts` (`manualChunks`) that saves every future deploy.
5. **Bundle budget script.** Even a simple "fail if `dist/assets/*.js` total exceeds 1.5MB gzipped" is enough.
6. **The "readiness hook for testability" idea.** A `data-scene` attribute on the game container or a global `window.__GAME_READY__` boolean lets Playwright wait for boot completion without fragile timeouts.
7. **Security section framing.** Static site ≠ zero security surface. Lockfile discipline, minimal GH Actions permissions, no CDN scripts — worth documenting.

### From Gemini

1. **The pixel-level barn scene wireframe.** Coordinates, sizes, colors, exact layout grid. Copy it verbatim into the merged sprint.
2. **Orientation prompt as a DOM overlay.** Simpler than Phaser-level orientation handling, doesn't require landscape layout work, covers the real use case.
3. **`100dvh` with `-webkit-fill-available` fallback.** One CSS decision that prevents the most common iOS Safari bug.
4. **`pointerdown` + 44px minimum tap target + tint flash spec.** Concrete enough to implement without ambiguity.
5. **"No subdirectories until a second file exists" rule.** Prevents the empty-directory problem. Apply it: no `src/app/`, no `src/systems/`, no `src/ui/` in Sprint 001. `viewport.ts` and `barnLayout.ts` can live in `src/` or `src/scenes/` until they earn a directory.
6. **Checkbox task lists inside each phase.** Makes "is this phase done?" answerable by inspection.
7. **The CLAUDE.md content spec** — including exact slot coordinates and the "scenes are thin" convention.
8. **Gemini's risk table format** with likelihood and impact columns. More useful than Codex's two-column format.
9. **Open question about repo slug** — the Vite `base` path is a real deployment landmine that should be resolved before implementation starts.

---

## Shared Gaps (Neither Draft Addresses)

1. **Accessibility.** `user-scalable=no` is an accessibility trade-off. Neither draft acknowledges it or documents a future plan. At minimum, the merged sprint should note this as a known limitation.
2. **Offline/PWA.** The product intent says "works offline after first load." Neither draft sets up a service worker or even mentions offline capability. Likely Sprint 002+ but should be flagged.
3. **iPad/tablet in landscape.** The orientation prompt triggers on `innerWidth > innerHeight`, which catches iPads in landscape — but an iPad in landscape has plenty of screen real estate for a portrait game. The prompt should probably only trigger on narrow viewports (e.g., `innerWidth > innerHeight && innerHeight < 600`).
4. **Phaser TypeScript strictness friction.** Phaser's type definitions have known gaps. Neither draft has a strategy for when `strict: true` conflicts with Phaser's types (ambient declarations? `@ts-expect-error` budget? wrapper types?).
5. **Hot module replacement behavior.** Vite + Phaser HMR is known to cause duplicate canvas mounts. Neither draft addresses whether HMR should be disabled or handled with a cleanup hook.
6. **What "Draw Animal" actually does in Sprint 001.** Codex says "placeholder visuals." Gemini says "flash button fill, log to console." The merged sprint should specify exactly: tint flash + console log + maybe cycle a slot from empty to "occupied" color to prove the layout system works with state changes.
7. **No performance baseline beyond bundle size.** Neither draft defines an FPS target or idle CPU usage expectation. For a static scene this seems trivial, but it's exactly the right time to add a "barn scene idles below 5% CPU" check — before there's anything to regress against.
