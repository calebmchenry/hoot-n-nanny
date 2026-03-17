# Sprint 004 Draft Critique

Reviewer: Claude (Opus 4.6)
Date: 2026-03-17

This critique evaluates the Codex and Gemini drafts against the Sprint 004 Intent
document and the actual codebase state. Both drafts propose the same fundamental
architectural move (FIT → RESIZE), which is correct. They diverge significantly in
how they handle landscape, agent-browser, scope management, and risk.

---

## Codex Draft

### Strengths

1. **Well-structured phasing.** Five phases with clear ordering and dependency
   chains. Phase 1 (foundation) is correctly isolated so the RESIZE migration
   can be validated before layout work begins. This is the right sequencing.

2. **ViewportMetrics with explicit safe-area fields.** The `safeTop/Right/Bottom/Left`
   fields in the interface acknowledge that CSS `env(safe-area-inset-*)` values
   need to flow into layout math. This is more honest than relying solely on CSS
   container padding — Phaser's canvas fills the container, and if the container
   has padding, the canvas coordinates still start at (0,0) inside the canvas.
   Layout functions need to know about the insets to avoid placing interactive
   elements under the notch or home indicator.

3. **Profile enum (`phone-portrait | phone-landscape | tablet | desktop`).**
   Discrete profiles rather than continuous breakpoints make layout tests
   deterministic and reduce the combinatorial testing surface. This is pragmatic.

4. **Explicit info panel behavior per profile.** "Bottom sheet on phone portrait,
   centered modal on landscape/desktop" shows the author thought about how the
   panel interacts with the action bar at different aspect ratios. This directly
   addresses one of the key clipping complaints.

5. **Dual verification strategy.** Keeping Playwright for CI regression and
   agent-browser for sprint-level evidence is the right split. Neither tool alone
   covers both needs.

6. **Trading Post layout test file creation.** Currently `tradingPostLayout.test.ts`
   doesn't exist. Codex explicitly creates it, which is a real gap being filled.

7. **Security section is appropriately scoped.** Acknowledges the static-site
   posture and calls out seed/query parsing bounds — relevant given that
   agent-browser screenshots use URL parameters.

### Weaknesses

1. **Landscape handling is underspecified.** Phase 4 says "implement compact
   `phone-landscape` layout profile" but provides zero detail on what that layout
   looks like. No zone breakdown, no column counts, no element redistribution.
   Compare to Gemini's 3-zone sidebar proposal. The Codex draft also includes a
   fallback "rotate overlay" for very short heights, which is reasonable, but the
   threshold for switching between compact layout and rotate overlay is never
   defined. This is the hardest layout problem in the sprint and it gets the
   least specification.

2. **"Major rewrite" on four files simultaneously.** The files summary marks
   `barnLayout.ts`, `BarnScene.ts`, `tradingPostLayout.ts`, and
   `TradingPostScene.ts` as "Major rewrite." In the current codebase, BarnScene
   is ~530 lines and TradingPostScene is ~500 lines with deeply interleaved
   rendering and game-state logic. Rewriting all four in a single sprint without
   intermediate checkpoints or rollback strategy is risky. The phasing helps, but
   no phase has its own "this phase is shippable if we stop here" escape hatch.

3. **CSS safe-area approach has a Phaser interaction gap.** The draft specifies
   `padding: env(safe-area-inset-*)` on `#game-container` with `box-sizing:
   border-box`. This means the container shrinks by the safe-area amounts, and
   Phaser's RESIZE canvas will fill the smaller container. That's fine — but then
   the `ViewportMetrics.safeTop/Bottom` fields become redundant, because the
   canvas never extends into safe areas. The draft doesn't resolve this
   contradiction. Either safe areas are handled in CSS (simpler, and the
   ViewportMetrics safe fields are always 0) or in layout math (more control, but
   the container should NOT have safe-area padding). Pick one.

4. **No discussion of BootScene texture sizing.** BootScene generates 32+
   textures at fixed pixel sizes (buttons at 350x56, slots at 96x104, full
   backgrounds at 390x844). Under RESIZE mode with dynamic canvas dimensions,
   these textures will either be too small (blurry when scaled up on desktop) or
   the wrong aspect ratio (390x844 background on a 1920x1080 canvas). The Codex
   draft mentions BootScene should "stop relying on single fixed-size environment
   textures" but doesn't specify what to do instead. This is a critical
   implementation detail — if textures are generated at the wrong size, every
   scene looks broken on day one of Phase 1.

5. **`agent-browser` command syntax is speculative.** The draft shows commands
   like `agent-browser open`, `agent-browser set viewport`, etc. The
   agent-browser repo (vercel-labs/agent-browser) is an AI-powered browser agent,
   not a CLI screenshot tool with those specific subcommands. The draft
   fabricated a CLI interface. This will cause implementation confusion.

6. **No debounce or animation-interrupt strategy for resize events.** The
   "Resize listeners create stale objects/memory leaks" risk is identified, but
   the mitigation ("centralize listener registration/cleanup") doesn't address
   what happens when a resize fires during an active tween or overlay animation.
   BarnScene has card-draw animations, bust shake effects, and timed overlays.
   Rebuilding layout mid-animation will cause visual glitches or broken state.

7. **Deterministic seed/state routes mentioned but not designed.** Phase 5 says
   "add deterministic seed/state route(s) for dense visual states" without
   specifying how. The game currently uses `gameStore` with runtime state.
   Getting to "capacity 8 with overlays visible" requires either a URL parameter
   that initializes game state or a programmatic way to force state. This is
   non-trivial and unscoped.

### Gaps in Risk Analysis

- **No risk for "RESIZE + pixelArt interaction."** Phaser's `pixelArt: true`
  config sets texture filtering to NEAREST. Under RESIZE mode with non-integer
  scale factors, this can produce uneven pixel scaling (some pixels are 2x, some
  are 3x). This is a known Phaser issue that affects visual quality.
- **No risk for "existing Playwright tests break during migration."** The current
  Playwright tests assume 375x667 with FIT mode. Under RESIZE mode, the canvas
  coordinates change. Existing `data-phase` assertions may still work, but any
  coordinate-based assertions will break.
- **No risk for "dynamic canvas dimensions break `LAYOUT.CANVAS` consumers."**
  The codebase has `LAYOUT.CANVAS.WIDTH` (390) and `LAYOUT.CANVAS.HEIGHT` (844)
  used in multiple files. Under RESIZE mode these become reference values, not
  actual dimensions. Any code still reading these as "current canvas size" will
  produce incorrect positions. The migration needs an audit of all
  `LAYOUT.CANVAS` consumers.

### Missing Edge Cases

- iPad Split View / Slide Over (canvas is ~507x1024 or ~320x1024)
- Browser dev tools open (reduces viewport unpredictably)
- Very tall, narrow viewports (e.g., Galaxy Fold inner screen at 280x653)
- Canvas size of 0x0 or near-zero during window minimize
- `devicePixelRatio > 1` interaction with RESIZE mode canvas resolution
- What happens if a scene transition fires during a resize rebuild?

### Definition of Done Completeness

The 12 items are solid. Missing:

- No criterion for "existing game logic is unchanged" — the intent doc says
  "All game logic in `src/game/` untouched." DoD should verify this.
- No criterion for "landscape layout is *usable*" beyond "explicitly handled."
  What does usable mean? Can the player complete a full night cycle in landscape?
- No criterion for performance — resize/reflow should not cause frame drops
  below 30fps.

---

## Gemini Draft

### Strengths

1. **Opinionated and well-argued architectural stance.** The opening section
   explicitly rejects three alternative approaches (keep FIT, wider base + FIT,
   FIT + decorative panels) with clear reasoning for each rejection. This is
   exactly what a sprint doc should do — make the case for the chosen approach
   and explain why alternatives were dismissed. The Codex draft just asserts
   RESIZE without defending the choice.

2. **Landscape as a first-class layout, not a fallback.** The 3-zone sidebar
   proposal (20% left sidebar / 60% center / 20% right) is concrete and
   implementable. The argument that "a 'please rotate' screen is a broken
   product, not a feature" is correct for a game — players who rotate their phone
   expect the game to work. This is the draft's strongest design decision.

3. **LayoutContext abstraction is well-designed.** The `LayoutContext` interface
   (`width`, `height`, `isLandscape`, `scale`) is lean and sufficient. The
   `scale` field (relative to reference dimensions) gives layout functions a
   single multiplier for proportional calculations. The `fontSize()` utility with
   an 8px floor prevents illegible text. This is more practical than the Codex
   draft's `ViewportMetrics` which has 6 fields including safe areas that may
   be redundant (see Codex weakness #3).

4. **Explicit clipping fix strategy.** Section "Clipping Audit & Fix Strategy"
   maps each known clipping issue to a specific layout fix (banner width =
   `canvasW - margins`, info panel Y = `actionBarY - panelH - gap`, etc.). This
   makes the fixes auditable and testable. The Codex draft says "fix clipping"
   without specifying the fix for each element.

5. **BootScene texture strategy is specified.** "Generate textures at a
   comfortable maximum size (e.g., 128x140 for cards) and use `setDisplaySize()`
   in scenes to scale them down." This directly addresses the texture scaling
   problem that the Codex draft leaves unspecified. Generating at max size and
   scaling down is the correct Phaser pattern — textures stay crisp up to their
   native size.

6. **Resize animation interaction is addressed.** Open Question #5 explicitly
   asks how resize should interact with active animations and proposes debounce +
   apply-after-animation-completes. The Codex draft ignores this entirely.

7. **Slot sizing breakpoints over continuous scaling.** Open Question #3 proposes
   snapping to 3 slot sizes (80/96/112px) rather than continuous `canvasW * 0.22`.
   Breakpoint snapping produces cleaner pixel-art rendering and is easier to test.
   Good instinct for a pixel-art game.

8. **`rebuildLayout` approach is explicitly justified.** The draft argues that
   destroy-and-recreate is simpler than tweening/repositioning every element, and
   that resize events are infrequent enough to make the cost negligible. This is
   the right call for a Phaser game with procedurally-generated textures.

9. **No new npm dependencies stance.** Explicitly states agent-browser is an
   external tool, not a `package.json` entry. This respects the intent doc's
   constraint ("no new npm dependencies") which the Codex draft slightly muddles
   by talking about "install and document agent-browser usage for repo-local
   verification."

### Weaknesses

1. **Scope is enormous and underestimated.** This draft proposes:
   - Rewriting `barnLayout.ts` with 8+ new function signatures
   - Rewriting `tradingPostLayout.ts` with responsive columns
   - Major rewriting BarnScene (~530 lines) with resize lifecycle
   - Major rewriting TradingPostScene (~500 lines) with resize lifecycle
   - Modifying BootScene texture generation
   - Creating `layoutContext.ts`
   - Rewriting `barnLayout.test.ts` at 5 viewports
   - Creating `responsive.spec.ts` for Playwright
   - Adding 5 Playwright viewport projects
   - Implementing a full landscape sidebar layout for both scenes

   The percentages (30%/25%/15%/15%/10%/5%) are aspirational. Phase 1 alone
   requires rewriting both layout files and all their tests at 5 viewports. The
   landscape sidebar layout (Phase 4 at "15%") is a UI design project in itself —
   repositioning the resource banner, noise meter, deck, farmhouse, and action
   buttons into a sidebar requires new visual design, not just coordinate math.
   This sprint is realistically 2-3 sprints of work.

2. **The `layoutContext.ts` file violates the project's directory rules.** From
   CLAUDE.md: "Do not create a new `src/` subdirectory until a second file would
   go in it" and "No barrel files until 3+ consumers." While this doesn't create
   a new directory, it creates a new module in `src/scenes/` that is really a
   shared utility. If both `barnLayout.ts` and `tradingPostLayout.ts` import it,
   it's a shared dependency that arguably belongs in `src/config/` alongside the
   existing constants. Minor point, but shows the draft didn't cross-reference
   CLAUDE.md conventions.

3. **Landscape sidebar layout is designed but not validated.** The 20%/60%/20%
   split sounds reasonable on paper, but consider: on a 667x375 iPhone SE
   landscape, 20% width is 133px. The resource banner, noise meter, and deck
   counter need to fit in a 133px-wide sidebar. The noise meter currently has 5
   dots (each ~12px with gaps), plus a label. The deck stack is 50x68. Resource
   badges are 24px each with text. This will be extremely tight. No mockup or
   pixel-level analysis accompanies the layout proposal. The draft may be
   designing a layout that doesn't physically fit.

4. **`rebuildLayout()` that "destroys all positioned game objects and re-creates
   them" is dangerous in BarnScene.** BarnScene has interactive objects with
   event listeners, active tweens, overlay state, and game-state bindings (e.g.,
   card objects reference `gameStore` animals). Destroying and recreating all
   objects means:
   - Re-registering all event listeners (risk of double-registration if cleanup
     is imperfect)
   - Losing any local state stored on game objects (e.g., `isAnimating` flags)
   - Potentially triggering game-state side effects if destruction callbacks fire
   - Needing to re-apply the current game phase (draw, bust, summary) visually

   The draft says "preserve game state across rebuilds" but the mechanism is
   hand-waved. This is where most of the Phase 2 bugs will come from.

5. **No fallback for landscape at all.** The draft categorically rejects a
   "rotate your device" screen. But what about extremely short viewports? An
   iPhone SE in landscape is 375px tall. After safe-area insets, it's ~345px.
   The action bar needs ~56px, the header needs ~40px, and a 2-row slot grid
   needs ~220px minimum. That leaves ~29px for the farmhouse and any spacing.
   If the layout physically cannot fit, there should be a minimum-height
   threshold below which a fallback is triggered. Refusing to ever show a
   fallback is principled but may not be practical.

6. **Open questions are too open.** Five open questions, some of which are
   architectural (should slot sizes snap to breakpoints? how should resize
   interact with animations?). A sprint doc that goes to implementation with 5
   unresolved architecture questions will accumulate ad-hoc decisions that may
   conflict. At least questions #2, #3, and #5 should be resolved before Phase 1
   begins — they affect the layout engine's core API.

7. **No mention of `LAYOUT.CANVAS` consumer audit.** The draft renames `CANVAS`
   to `REFERENCE_CANVAS` in constants.ts, which is a good semantic signal. But
   it doesn't enumerate the consumers of `LAYOUT.CANVAS` that need updating.
   A grep of the codebase shows `LAYOUT.CANVAS` is used in `game.ts`,
   `barnLayout.ts`, `barnLayout.test.ts`, `BarnScene.ts`, `BootScene.ts`, and
   `TradingPostScene.ts`. Missing even one consumer means a runtime bug.

8. **Phase allocation is front-loaded.** Phase 1 is 30% but contains the hardest
   work (RESIZE migration + both layout file rewrites + all layout tests). Phase
   4 (landscape) is 15% but is the most design-intensive. Phase 6 (agent-browser)
   is 5% but may take longer if the tool doesn't work as expected. The
   percentages suggest a predictability that the actual work won't have.

### Gaps in Risk Analysis

- **No risk for "BarnScene object destruction causes event listener leaks."**
  The `rebuildLayout()` approach creates a class of bugs where `destroy()` on
  Phaser game objects doesn't properly clean up all subscriptions, especially
  custom event listeners on the scene's event emitter.
- **No risk for "landscape layout doesn't physically fit on small phones."**
  The 3-zone sidebar on a 667x375 viewport is untested. If it doesn't fit,
  Phase 4 needs significant redesign.
- **No risk for "LAYOUT.CANVAS rename breaks consumers."** A find-and-replace
  rename across 6+ files is mechanical but error-prone, especially if any
  consumer uses destructured imports.
- **No risk for "Playwright screenshot tests are flaky across platforms."**
  Screenshot comparison tests are notoriously flaky due to font rendering
  differences between macOS and Linux CI. If CI runs on Linux and developers
  run on macOS, screenshots will never match.
- **"agent-browser is not installable or is broken" risk is rated Low/Low.**
  The intent document explicitly requires agent-browser verification as a
  success criterion. If agent-browser doesn't work, success criterion #5 is
  unmet. This should be Medium/Medium.

### Missing Edge Cases

- Same as Codex: iPad Split View, Galaxy Fold, near-zero canvas, DPR > 1
- Scene transitions during resize (what if the player navigates Barn →
  Trading Post while a resize event is pending?)
- What happens to the Phaser camera if RESIZE mode produces a canvas larger
  than the world bounds?
- Landscape layout with overlays (bust overlay, summary overlay, win overlay)
  — these are full-screen overlays designed for portrait. How do they render
  in landscape?
- HMR interaction with RESIZE mode — the CLAUDE.md notes that HMR already
  causes duplicate canvases. RESIZE mode may exacerbate this.

### Definition of Done Completeness

The 12 items are comprehensive and more specific than Codex's. Notable additions:

- "No new npm dependencies" (item 12) — good to codify
- "Phone landscape is usable" with specific detail about reorganized layout
- "Tablet renders cleanly" — Codex mentions tablet but doesn't DoD-gate it

Missing:

- No performance criterion (same gap as Codex)
- No criterion for "game logic untouched"
- No criterion for "existing Playwright tests still pass in their original
  viewport" — the draft adds 5 new viewport projects but doesn't guarantee
  the original 375x667 tests remain green during migration
- "Screenshots attached to PR" (item 10) — how are screenshots stored? As
  git-tracked artifacts? PR comment attachments? This matters for
  reproducibility.

---

## Head-to-Head Comparison

| Dimension | Codex | Gemini | Winner |
|-----------|-------|--------|--------|
| Architectural clarity | Good — RESIZE + ViewportMetrics | Excellent — RESIZE + LayoutContext + opinionated argument | Gemini |
| Landscape handling | Underspecified, includes rotate fallback | Detailed 3-zone layout, no fallback | Gemini (design), Codex (pragmatism) |
| Clipping fix specificity | Generic "fix overlap" | Per-element fix strategy | Gemini |
| Texture handling (BootScene) | Unspecified | Explicit max-size + setDisplaySize | Gemini |
| Risk analysis | 6 risks, reasonable | 8 risks, more detailed | Gemini |
| Scope realism | Ambitious but phased | More ambitious, less realistic | Codex |
| Safe-area handling | CSS + layout (contradictory) | CSS-only (simpler) | Gemini |
| agent-browser accuracy | Fabricated CLI commands | Treated as manual external tool | Gemini |
| Escape hatches | None explicit | None explicit | Tie (both weak) |
| Open questions | 4, all reasonable | 5, some should be pre-resolved | Codex (fewer unknowns) |
| CLAUDE.md compliance | Good | Minor violation (layoutContext.ts placement) | Codex |
| DoD completeness | 12 items, some gaps | 12 items, slightly more specific | Gemini |

---

## Recommendations for the Final Sprint Doc

1. **Use Gemini's architecture as the base.** The LayoutContext abstraction,
   opinionated RESIZE justification, BootScene texture strategy, and per-element
   clipping fixes are all superior. But temper the scope.

2. **Add Codex's rotate-overlay fallback.** Gemini's refusal to ever show a
   "rotate" screen is admirable but impractical. Add a minimum-height threshold
   (e.g., `canvasH < 320`) below which a rotate overlay appears. This covers
   edge cases where the layout physically cannot fit without making "rotate" the
   default experience.

3. **Resolve open questions before implementation.** At minimum: slot size
   snapping (yes — breakpoints), resize + animation interaction (debounce +
   apply after animation), and landscape column count (start with 4-col grid,
   iterate from there). Unresolved architectural questions create churn.

4. **Reduce scope to be shippable.** Cut the sprint into two:
   - **Sprint 004a:** RESIZE migration, dynamic portrait layout (all viewports),
     clipping fixes, multi-viewport Playwright. This alone delivers the core
     user value (desktop fills browser, phone portrait works, no clipping).
   - **Sprint 004b:** Landscape layout, agent-browser verification, tablet
     optimization. This can ship independently.

   Both drafts try to do everything in one sprint. The landscape sidebar layout
   alone is a design + implementation project that could consume the sprint.

5. **Add a `LAYOUT.CANVAS` consumer audit to Phase 1.** Before renaming anything,
   grep every reference and map the migration path. This is a 30-minute task
   that prevents hours of debugging.

6. **Specify the `rebuildLayout()` contract.** What state must be preserved?
   What objects are safe to destroy? What event listeners must be re-registered?
   The BarnScene has ~15 distinct UI regions and multiple overlay states. A
   rebuild function without a clear contract will be the #1 source of bugs.

7. **Add a performance DoD criterion.** "Layout reflow completes in < 100ms
   with no frame drops below 30fps" or similar. On a low-end phone, destroying
   and recreating 30+ game objects during resize could cause a visible hitch.

8. **Validate the landscape sidebar with actual pixel math.** Before committing
   to the 3-zone layout, calculate whether the resource banner, noise meter,
   and deck counter physically fit in a 133px sidebar on iPhone SE landscape.
   If they don't, the design needs revision before implementation starts.

9. **Clarify agent-browser integration.** Neither draft actually researched
   what agent-browser's API looks like. Before writing the sprint doc, someone
   should `npx @anthropic-ai/agent-browser --help` (or read the repo README)
   and document the real commands. The Codex draft's fabricated CLI commands will
   waste implementor time.

10. **Add "existing tests pass at original viewport" as an explicit DoD item.**
    The RESIZE migration will change canvas coordinate space. The existing
    375x667 Playwright tests must continue to pass — not just "existing tests
    pass" generically, but specifically the original viewport configuration.
