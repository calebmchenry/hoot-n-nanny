# Sprint 001 Critique: Claude Draft vs. Codex Draft

Reviewed against `docs/INTENT.md`, `docs/sprints/drafts/SPRINT-001-INTENT.md`, and both sprint drafts.

---

## Claude Draft

### Strengths

1. **Clear architectural reasoning on every decision.** Portrait resolution rationale, full-bundle import justification, singleton state recommendation — each decision is explained, not just stated. This makes the draft useful as a reference even after the sprint closes.
2. **Thin scene pattern is well-articulated.** The rule "scenes handle lifecycle hooks, delegate to imported utility functions" is the single most important pattern for keeping the codebase maintainable as it grows to 10+ scenes.
3. **Correct stance on speculative directories.** Refusing to create `state/` in Sprint 001 because no second file would inhabit it is exactly the right call. Premature structure is a form of tech debt.
4. **Accurate Phaser import analysis.** Full bundle vs. tree-shaking explanation is correct and matches real Phaser 3 behavior.
5. **Security and accessibility trade-offs documented.** Noting `user-scalable=no` as an accessibility trade-off rather than silently including it is conscientious.
6. **Scaling section is thorough.** `Scale.FIT`, `CENTER_BOTH`, `autoCenter`, parent container — complete config with reasoning.

### Weaknesses

1. **No linting.** The sprint seed explicitly calls out "project conventions including linting." Claude defers ESLint/Prettier to a future sprint. This is the most concrete gap against the stated scope.
2. **No orientation decision.** Landscape is acknowledged as a future concern but punted on entirely. This leaves a known gap in the delivered sprint. A player will hold their phone in landscape and see... what?
3. **Barn scene is underspecified.** "Five empty animal slot rectangles arranged in a grid (2 rows: 3 top, 2 bottom, centered)" is not implementable without guessing coordinates, sizes, and colors. Any implementer — human or AI — will make different choices, which breaks layout consistency with Sprint 002.
4. **`jsx: "preserve"` in tsconfig.** This project has no JSX. Including this option is cargo-cult configuration that will confuse future contributors.
5. **Simulated BootScene delay.** "Simulate with a short delay or immediately proceed" — if there are no real assets to load, a delay is artificial. BootScene should just handoff immediately. A loading indicator for nothing is misleading.
6. **State singleton recommendation is premature.** Sprint 001 shouldn't recommend a state architecture. That's Sprint 002's job. The recommendation forecloses options before they're needed.
7. **`100dvh` absent.** Uses `100vh` implicitly (no CSS is specified). iOS Safari's address bar resizes cause the barn to be taller than the visible viewport. This is the most common mobile web rendering bug for canvas games.

### Gaps in Risk Analysis

- **No iOS Safari `100vh` / address bar risk** — the highest-likelihood mobile rendering bug and it's not mentioned.
- **No Vite + Phaser HMR risk** — Phaser instantiation is not HMR-friendly; rapid file saves during development cause duplicate canvas mounts. Should be noted with mitigation (disable HMR for `main.ts`, or add a canvas cleanup check).
- **No safe-area inset risk** — "Draw Animal" button at the bottom of the screen will be occluded by iPhone home indicator without `env(safe-area-inset-bottom)` padding.
- **No Phaser TypeScript strictness friction risk** — Phaser's bundled types have known gaps under strict mode. The risk and mitigation (e.g., a `phaser-overrides.d.ts` for specific edge cases) should be noted.

### Missing Edge Cases

- Button positioned near the bottom of a notched phone screen — it will overlap the home indicator.
- Rapid repeated taps on "Draw Animal" — does the button flash stack? Does the slot color cycle break?
- BootScene transition timing — text may never visibly render if the transition is instant.
- What "Draw Animal" does to the slot state — Claude's spec says "slot color flash" but doesn't specify whether a slot changes to "occupied" state. This is important for proving the layout system works before Sprint 002 builds on it.

### Definition of Done Completeness

Mostly strong but with two gaps:
- No orientation behavior in the DoD at all.
- "GitHub Actions workflow file exists and is syntactically valid" is too weak — it should read "GitHub Pages URL is accessible and barn scene loads."

---

## Codex Draft

### Strengths

1. **Best tooling suite of any draft.** ESLint, Prettier, `format:check`, `typecheck`, `lint` scripts, `.nvmrc`, `engines` field — this is the most complete quality-gate setup. Agents need guardrails; linting provides them.
2. **Test infrastructure scaffold.** Including Vitest + Playwright in Sprint 001 is the right call. The sprint intent was too conservative. Having one unit test and one smoke test means Sprint 002 lands into an existing harness rather than retrofitting one.
3. **Bundle discipline made explicit.** Vendor chunking, budget script, baseline documentation — making Phaser's bundle visible before content arrives is exactly the right moment to do it.
4. **Pure helper extraction.** `viewport.ts` and `barnLayout.ts` as testable functions outside Phaser scenes is architecturally sound. Layout math is pure logic — it shouldn't need a Phaser mock to test.
5. **`npm ci` throughout.** Using `npm ci` everywhere (local docs, CI, deploy) for deterministic installs is correct practice that neither other draft enforces.
6. **Separate CI and deploy workflows.** `ci.yml` (all branches) + `deploy.yml` (main only) is cleaner than a single combined workflow.
7. **Readiness hook concept.** `window.__GAME_READY__` or `data-scene` attribute lets Playwright wait reliably for boot completion instead of arbitrary `sleep` calls.

### Weaknesses

1. **No concrete barn scene layout.** "Five empty slots and a Draw Animal control" with no coordinates, sizes, or colors. This is the single biggest implementation gap in the draft. An implementer will guess, and their guess will be inconsistent with whatever Sprint 002 expects.
2. **Over-engineered directory structure for Sprint 001.** `src/app/`, `src/systems/`, `src/ui/` each contain exactly one file. This is premature organization. The "thin scenes" principle can be achieved with `src/scenes/` + `src/config/` — no additional layers needed in Sprint 001.
3. **No orientation handling.** Orientation is in the open questions (Q4) but never addressed in the architecture section. The sprint delivers a landscape-broken product by default.
4. **`100dvh` absent.** Same gap as Claude. The most common iOS Safari mobile web bug is unaddressed.
5. **No safe-area inset handling.** Bottom interactive elements will be occluded on iPhones.
6. **Five phases instead of four.** The test and bundle phases could be consolidated without losing value. Five phases adds sequencing overhead without proportional benefit.
7. **CI includes Playwright on every push.** Browser-based E2E tests on every push adds minutes of CI latency from day one. Recommend gating Playwright to main-branch pushes and PR merges only.
8. **Effort estimates without tasks.** Phase descriptions but no checkbox task lists. Hard to know when a phase is done vs. over-engineered.

### Gaps in Risk Analysis

- **No iOS Safari / `100dvh` risk.**
- **No safe-area inset risk for bottom button.**
- **No Phaser TypeScript strictness friction risk.**
- **Playwright run frequency not addressed.** Running full browser E2E on every branch push could create slow-CI friction that leads to tests being skipped.
- **No risk that test scaffold adds Sprint 001 complexity beyond what's needed.** Vitest + Playwright + budget scripts is real scope. If the barn scene isn't rendered correctly, no amount of passing tests makes this sprint a success.

### Missing Edge Cases

- Bottom button occluded by home indicator — affects every iPhone since X.
- iPad landscape — the orientation prompt would trigger on a 1024×768 iPad where landscape play would be fine.
- Rapid taps / double-tap on Draw Animal.
- What the slot grid looks like after "Draw Animal" is tapped — does a slot change color? The smoke test would presumably check this but the spec doesn't define the expected visual outcome.
- `CLAUDE.md` contents are vague ("document conventions and baseline decisions") vs. Gemini's specific contents spec.

### Definition of Done Completeness

Strong on tooling criteria, weaker on UX:
- No specific slot layout or visual appearance criteria.
- No orientation behavior.
- "Barn scene renders a barn background, five empty slots, and a visible 'Draw Animal' control" — pass/fail is ambiguous without visual spec.
- Deploy criterion could be strengthened from "automated" to "Pages URL is accessible and scene loads."

---

## Head-to-Head Comparison

| Dimension | Claude | Codex | Edge |
|---|---|---|---|
| Architectural reasoning | Strong, explained decisions | Good but less explained | **Claude** |
| Scene layout spec | Vague | Vague | **Tie (both weak)** |
| Orientation handling | Deferred | Deferred | **Tie (both missing)** |
| iOS Safari handling (`100dvh`) | Missing | Missing | **Tie (both missing)** |
| Linting/quality gates | Deferred | Full (ESLint, Prettier, typecheck) | **Codex** |
| Test infrastructure | Deferred | Vitest + Playwright scaffold | **Codex** |
| Bundle discipline | Not addressed | Vendor chunking + budget script | **Codex** |
| Directory structure | Minimal, principled | Over-layered for Sprint 001 | **Claude** |
| Implementation task clarity | Checkbox tasks per phase | Phase descriptions, no tasks | **Claude** |
| `CLAUDE.md` specificity | Mentions contents | Vague "document conventions" | **Claude** |
| Tooling completeness | Scripts for dev/build/preview | Full `ci` meta-script | **Codex** |

---

## What I Would Steal for the Final Merged Sprint

### From Claude
1. **Thin scenes pattern** with explicit articulation.
2. **No speculative directories** rule — add `state/`, `systems/`, `ui/` only when a second file needs to go there.
3. **Phaser import strategy rationale** — full bundle, ~300KB gzipped, acceptable for a game.
4. **Checkbox task lists per phase** — makes done/not-done inspectable.
5. **`CLAUDE.md` content specification** including exact slot coordinates (sourced from Gemini draft).
6. **Security + accessibility trade-off documentation** — `user-scalable=no` noted conscientiously.

### From Codex
1. **ESLint + Prettier + `typecheck` + `lint` scripts** as explicit first-class Sprint 001 deliverables — the sprint seed requires it.
2. **`.nvmrc` + `engines` field** — cheap, high-value Node version enforcement.
3. **Vitest configuration** + one unit test for layout helpers.
4. **One Playwright smoke test** (main branch only) — app boots, canvas present, readiness signal fires.
5. **Vendor chunk splitting** (`manualChunks` in Vite config) — one line, prevents full cache invalidation on every app code change.
6. **Bundle budget script** — even a simple "warn if > 1.5MB gzipped" gives a baseline.
7. **Readiness hook** (`window.__GAME_READY__` or `data-scene` attribute) for reliable Playwright waits.
8. **`npm ci` as the documented install command** everywhere.

---

## Shared Gaps Neither Draft Addresses

1. **`100dvh` + `-webkit-fill-available` fallback** — critical iOS Safari fix; both drafts omit it.
2. **Safe-area insets for bottom button** — `padding-bottom: env(safe-area-inset-bottom)` on the game container or explicit slot offset.
3. **Orientation policy for tablets vs. phones** — `innerWidth > innerHeight` alone triggers on landscape iPads where play is fine.
4. **Phaser TypeScript strict mode friction** — known sharp edges in Phaser's bundled types; needs a fallback plan.
5. **Vite + Phaser HMR** — duplicate canvas on hot reload; disable HMR for Phaser entry or add a pre-init canvas cleanup.
6. **"Draw Animal" produces slot state change** — tint flash alone proves touch wiring; a slot cycling to "occupied" proves the layout data model. The merged sprint should specify the latter as the target.
