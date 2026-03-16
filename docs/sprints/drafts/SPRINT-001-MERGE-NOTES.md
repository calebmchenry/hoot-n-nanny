# Sprint 001 Merge Notes

## Draft Strengths Summary

**Claude draft** — best architectural reasoning: thin-scenes pattern, no speculative directories, Phaser import rationale, task checkboxes per phase, canvas scaling config.

**Codex draft** — best tooling suite: ESLint + Prettier + typecheck + lint scripts, `.nvmrc` + `engines`, Vitest + Playwright test scaffold, vendor chunk splitting, bundle budget script, readiness hook for Playwright.

**Gemini draft** — best implementation spec: pixel-level barn wireframe with exact coordinates/colors, `100dvh` + webkit fallback, `pointerdown` + 44px tap target spec, `CLAUDE.md` content outline, split CI/deploy workflows, "no directory until a second file needs it" rule.

---

## Critiques Accepted / Rejected

| Critique Point | Decision |
|---|---|
| Linting (ESLint + Prettier) missing from Claude and Gemini | **Accepted** — user confirmed: include in Sprint 001 |
| Test scaffold (Vitest + Playwright) — Codex right, Claude/Gemini too conservative | **Accepted** — include thin scaffold: layout unit tests + one mobile smoke test |
| `100dvh` + `-webkit-fill-available` — both Claude and Codex drafts miss it | **Accepted** — adopt Gemini's CSS fix |
| Safe-area insets for bottom button | **Accepted** — add `env(safe-area-inset-bottom)` to game container |
| Orientation: prompt vs. letterbox | **User chose letterbox** — portrait layout scales into all viewports, no DOM overlay; simpler, no edge cases around tablets |
| "Draw Animal" should cycle a slot, not just flash button | **User chose flash + slot cycle** — proves layout state model before Sprint 002 |
| Speculative directories (`src/app/`, `src/systems/`, `src/ui/`) | **Rejected** — adopt Gemini/Claude "no dir until 2nd file" rule |
| `jsx: "preserve"` in tsconfig | **Rejected** — remove (no JSX in this project) |
| Simulated BootScene delay | **Rejected** — BootScene transitions immediately; no fake delay |
| State singleton recommendation in Sprint 001 | **Rejected** — deferred to Sprint 002 where it's needed |
| Playwright on every push (not just main) | **Rejected** — Playwright runs on main + PRs only to avoid CI latency tax |
| Phaser TS strict mode friction risk | **Accepted** — add to Risks section with mitigation |
| Vite + Phaser HMR duplicate canvas risk | **Accepted** — add to Risks section with mitigation |

---

## Interview Refinements Applied

1. **Linting in Sprint 001** — yes. Added as Phase 1 alongside TypeScript setup.
2. **Test infrastructure in Sprint 001** — yes, thin. Vitest for pure helpers, Playwright smoke test on main/PR merges only.
3. **Orientation** — letterbox. No DOM overlay, no prompt. Portrait layout scales cleanly with `Scale.FIT` + pillarboxing on landscape devices.
4. **Draw Animal behavior** — flash button fill + cycle one slot from empty (tan) to occupied (green). Proves both input wiring and slot state rendering.

---

## Final Structure Decisions

- **Directory structure**: `src/main.ts`, `src/config/`, `src/scenes/`, `src/types/` — no additional subdirs in Sprint 001.
- **`viewport.ts`** logic (from Codex) gets folded into `src/config/game.ts` since it's only one function. If it grows, it earns its own file.
- **`barnLayout.ts`** (from Codex) is created as `src/scenes/barnLayout.ts` — co-located with its consumer but still importable and testable.
- **Readiness hook**: `window.__GAME_READY__ = true` set in BarnScene.`create()` after rendering is complete. Used by Playwright to avoid flaky timeouts.
- **Bundle budget**: Initial target: app JS < 100KB gzipped, Phaser vendor chunk < 400KB gzipped. Enforced in CI.
