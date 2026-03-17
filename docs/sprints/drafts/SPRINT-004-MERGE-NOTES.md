# Sprint 004 Merge Notes

## Draft Strengths

### Claude Draft
- Most implementation-ready: concrete proportional math formulas, before/after code snippets
- Pixel floor strategy (`Math.max(72, ...)`) for slot sizes — prevents tiny elements
- Backward compatibility guarantee (2px tolerance at 390x844)
- Option A/B texture analysis with clear rationale for setDisplaySize approach
- Phase-by-phase acceptance criteria with specific test checklists
- Clipping fix strategy with pixel-level root cause analysis (row 3 at y=496 vs farmhouse at y=560)

### Codex Draft
- ViewportMetrics interface with device profile enum (`phone-portrait | phone-landscape | tablet | desktop`)
- Info panel behavior varies by profile (bottom sheet vs centered modal)
- Dual verification strategy: Playwright for CI, agent-browser for sprint evidence
- Orientation-switch test (portrait → landscape → portrait preserving state)
- Explicit safe-area fields in viewport metrics
- Dedicated landscape phase with graduated fallback (compact layout → rotate overlay)

### Gemini Draft
- Strongest architectural stance: explicitly argued against FIT + portrait clamping with 3 rejected alternatives
- LayoutContext abstraction is lean and sufficient (width, height, isLandscape, scale)
- fontSize() utility with 8px floor for readability
- BootScene texture strategy: generate at max size, setDisplaySize in scenes
- Slot sizing breakpoints (80/96/112px) over continuous scaling — better for pixel art
- rebuildLayout approach explicitly justified for infrequent resize events
- No new npm dependencies — agent-browser as external tool only

## Valid Critiques Accepted

1. **CSS aspect-ratio clamping reintroduces pillarboxing** (all three critiques). The user said "take up the whole browser." A clamped portrait column on a 1920x1080 screen is still 55%+ black space. The final sprint uses Scale.RESIZE with a genuine wide-screen layout on desktop. Adopted from Gemini's architecture.

2. **Destroy-and-rebuild on resize is risky in BarnScene** (Claude critique of Gemini). BarnScene has ~530 lines with interactive objects, event listeners, active tweens, and overlay state. The final sprint uses **reposition-existing-objects** approach (Claude/Codex pattern) instead of destroy-and-rebuild.

3. **Landscape sidebar layout doesn't physically fit on small phones** (Claude critique of Gemini). At 667x375, a 20% sidebar = 133px — not enough for resource banner + noise meter + deck counter. Final sprint uses a rotate prompt for phone landscape instead.

4. **Missing backward compatibility criterion** (Gemini critique of Codex). Final DoD includes: layout functions at (390, 844) produce results within 2px of old hardcoded values.

5. **LAYOUT.CANVAS consumer audit needed** (Claude critique). Before renaming WIDTH/HEIGHT to REF_WIDTH/REF_HEIGHT, all consumers must be mapped. Added as explicit Phase 1 task.

6. **Resize + animation interaction must be defined** (Claude critique of Codex). Final sprint: debounce resize, apply after current animation completes. Skip resize handling while `isAnimating` is true.

7. **agent-browser CLI syntax is speculative** (Claude critique of Codex). The Codex draft fabricated CLI commands. Final sprint treats agent-browser as manual verification with Playwright screenshots as the primary automated check.

8. **Safe-area CSS padding vs layout math contradiction** (Claude critique of Codex). Pick one: CSS container padding handles safe areas (simpler), OR layout math handles them. Final sprint: CSS container padding via `env(safe-area-inset-*)`, Phaser canvas fills the padded container. Layout functions don't need safe-area fields.

9. **Font readability floor needed** (Gemini critique of both). Final sprint: proportional font sizing with 10px minimum floor.

10. **No performance criterion** (all critiques). Final DoD: resize reflow < 100ms, no frame drops below 30fps.

## Valid Critiques Rejected

1. **"Landscape should be a first-class layout"** (Gemini draft stance) — User confirmed rotate prompt is acceptable for this sprint. Landscape layout deferred to future sprint.

2. **"layoutContext.ts violates directory rules"** (Claude critique of Gemini) — We won't create this file. LayoutContext type goes in `src/config/constants.ts` alongside existing layout constants.

3. **"Split into Sprint 004a and 004b"** (Claude critique recommendation) — User wants a single sprint. We'll manage scope by keeping the rotate prompt for landscape and focusing on desktop + portrait + clipping fixes.

## Interview Refinements

1. **Desktop fills the entire browser** — genuine wide layout, not a centered portrait column. On desktop, content area expands: wider card grid, more horizontal spacing, side decorative areas with game-relevant content.
2. **Phone landscape shows rotate prompt** — pragmatic scope control. Full landscape layout is future work.
3. **agent-browser is manual verification** — not a project dependency or CI step. Developer captures screenshots, attaches to PR.

## Key Design Decisions Locked

| Decision | Resolution |
|----------|-----------|
| Scale mode | `Phaser.Scale.RESIZE` — canvas always fills container |
| Desktop layout | Wide layout using full browser width. Card grid expands, spacing increases, HUD has room to breathe. |
| Portrait phone layout | Proportional scaling from 390x844 reference. Pixel floors prevent tiny elements. |
| Phone landscape | Rotate prompt overlay (CSS + JS). Phaser pauses underneath. |
| Tablet landscape | No rotate prompt (shortest dimension >= 600px). Game scales naturally. |
| Aspect ratio | No CSS clamping. Container is 100vw x 100dvh. |
| Layout function signatures | All gain `(cw: number, ch: number)` parameters for canvas width/height |
| Slot sizing | Breakpoint snapping: 80px (small), 96px (medium), 112px (large) based on canvas width |
| Font sizing | Proportional: `basePx * (canvasHeight / REF_HEIGHT)`, floor at 10px, ceiling at 2x base |
| Texture generation | Generate at reference/max size in BootScene, scale via setDisplaySize() in scenes |
| Resize strategy | Reposition existing objects (not destroy-and-rebuild). Debounce. Skip during animations. |
| Safe areas | CSS `env(safe-area-inset-*)` padding on container. Layout functions don't handle safe areas. |
| agent-browser | Manual external tool. Playwright is primary automated verification. |
| Backward compatibility | Layout functions at (390, 844) produce results within 2px of old values |
