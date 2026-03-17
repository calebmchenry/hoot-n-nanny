# Sprint 004 — Gemini Critique of Claude and Codex Drafts

## Critique of Claude Draft (SPRINT-004-CLAUDE-DRAFT.md)

### Strengths

1. **Thorough proportional math examples.** The before/after code snippets showing the conversion from hardcoded to proportional layout (`getResourceBannerPosition` example) are immediately actionable. An implementer could start coding from this draft with minimal ambiguity.

2. **Pixel floor strategy is well-thought-out.** The `Math.max(72, ...)` pattern for slot sizes prevents elements from becoming unusably small on tiny viewports while still allowing proportional scaling on larger ones. This is a practical balance.

3. **Option A/B analysis for generated textures.** The explicit comparison of "generate at reference size + setDisplaySize" vs. "regenerate at actual canvas size" with a clear rationale for choosing Option A (with the barn plank exception) shows architectural maturity.

4. **Phased implementation with clear acceptance criteria per phase.** Six phases, each with a distinct goal, file list, and test checklist. This is easy to execute incrementally.

5. **Clipping fix strategy is concrete.** Identifies the specific pixel ranges causing overlap (row 3 bottom at y=496, farmhouse at y=560) and proposes specific fixes (compress ROW_GAP at capacity >= 7, anchor action bar to `ch - 86`).

6. **Backward compatibility guarantee.** DoD item 7 — "When called with `(capacity, 390, 844)`, all layout functions produce results within 2px of the old hardcoded values" — is a smart regression safeguard.

### Weaknesses

1. **Aspect ratio clamping via CSS is fragile.** The draft proposes using CSS `max-width` and `max-height` on `#game-container` for aspect ratio clamping (min 9:16, max 3:4). This means the Phaser canvas fills a CSS-constrained container, which reintroduces the very pillarboxing the user complained about. On a 1920x1080 desktop with a 3:4 max aspect ratio, the game would be ~810px wide centered in 1920px — still leaving ~55% black/empty space on the sides. The user said "the game should take up the whole browser." This approach doesn't achieve that on desktop.

2. **Landscape handling is a "rotate your device" screen.** The user specifically said the game should "still handle landscape on the phone." A rotate prompt is the minimum viable approach, but it's also the least satisfying UX. The Gemini draft (and the user's request) imply the game should be *usable* in landscape, not just acknowledge it.

3. **Phase allocation is bottom-heavy.** Phase 4 (Scene Updates) is 30% of the work and modifies 3 major scene files. This single phase has more complexity than any other, and its tasks list is enormous. It would benefit from being split into BarnScene and TradingPostScene sub-phases.

4. **No discussion of high-DPI / devicePixelRatio.** On Retina displays (2x/3x), the canvas may render at physical pixel dimensions that differ from CSS pixel dimensions. `Scale.RESIZE` interacts with `resolution` in the game config. The draft doesn't address this, which could cause blurry rendering on mobile.

5. **agent-browser integration is vague.** Phase 6 creates a `capture-viewports.ts` script but the draft doesn't specify whether this uses agent-browser's API, CLI, or what. The agent-browser repository may have changed its interface. The draft should note that this is a best-effort verification step with a Playwright fallback.

6. **Missing: what happens on ultrawide monitors?** The 3:4 max aspect ratio clamp handles tablets, but what about 21:9 ultrawides (2560x1080)? The clamped container would be very narrow. No discussion of this edge case.

### Gaps in Risk Analysis

- **No risk for CSS-based aspect clamping reintroducing pillarboxing.** This is the biggest architectural risk in the draft and it's not acknowledged.
- **No risk for `Scale.RESIZE` + `autoCenter: CENTER_BOTH` interaction.** With RESIZE mode, CENTER_BOTH may behave unexpectedly since the canvas already fills the container. Should be NO_CENTER.
- **Missing risk: scene transition during resize.** If the player is transitioning from Barn to Trading Post and a resize event fires, both scenes may receive the event. The draft doesn't address this.

### Missing Edge Cases

- iPhone notch/Dynamic Island in landscape (safe area insets are asymmetric)
- Split-screen multitasking on iPad (viewport can be very narrow, like 507x1024)
- Browser toolbar appearing/disappearing on mobile (changes viewport height by ~60px dynamically)
- PWA/Add-to-Home-Screen mode (different viewport behavior than Safari)

### Definition of Done Completeness

Mostly complete. Missing:
- No criterion for ultrawide/non-standard aspect ratios
- No criterion for high-DPI rendering quality
- DoD item 1 says "80% of viewport area" but doesn't specify what counts — is it the canvas element's bounding rect, or the visible game content?

---

## Critique of Codex Draft (SPRINT-004-CODEX-DRAFT.md)

### Strengths

1. **ViewportMetrics interface with device profile classification.** The `ViewportMetrics` type with `profile: 'phone-portrait' | 'phone-landscape' | 'tablet' | 'desktop'` is a clean abstraction. It separates viewport classification from layout calculation, making the layout logic more readable and testable.

2. **Info panel behavior varies by profile.** The distinction between "bottom sheet on phone portrait" and "centered modal on landscape/desktop" is thoughtful UX design that acknowledges different interaction models.

3. **Comprehensive phase structure with dedicated landscape phase.** Phase 4 is entirely about phone landscape UX, including a fallback rotate overlay for "very short heights." This graduated approach (try compact layout first, fall back to rotate overlay) is more nuanced than either always showing a rotate screen or always attempting landscape.

4. **Explicit orientation-switch test.** Phase 4 includes "portrait -> landscape -> portrait preserving session state" — this is a critical regression test that both other drafts miss.

5. **Safe-area handling via CSS container with `env()` insets.** The CSS approach (container uses `padding: env(safe-area-inset-*)`) is simpler and more maintainable than reading safe area values in JavaScript.

6. **agent-browser treated as verification artifact, not CI dependency.** Pragmatic and avoids the fragility of headful browser tests in CI.

### Weaknesses

1. **Architecture section is too high-level.** The ViewportMetrics interface is defined, but the actual layout computation logic is barely described. How does the "responsive layout engine" compute slot positions? What's the proportional math? The Claude draft provides concrete formulas; this draft hand-waves them.

2. **"Major rewrite" on 4 files is alarming scope.** The files summary lists BarnScene and TradingPostScene as "Major rewrite" in addition to both layout files. That's the entire UI layer. The implementation plan needs to address how to verify correctness incrementally rather than doing a big-bang rewrite.

3. **No backward compatibility guarantee.** Unlike the Claude draft, there's no assertion that existing layout behavior is preserved when viewport matches the reference 390x844. This makes regression detection harder.

4. **Phase 2 and 3 (Barn and Trading Post layout) could run in parallel** but are sequenced, inflating the sprint timeline. They share no files except constants.ts.

5. **Compact landscape layout is underspecified.** Phase 4 says "implement compact phone-landscape layout profile" but doesn't describe what compact means — fewer rows? Smaller cards? Sidebar? The lack of specificity here is a risk for scope creep or an inadequate result.

6. **`docs/testing/visual-verification.md` creation violates CLAUDE.md.** The project conventions say "Do not create a new src/ subdirectory until a second file would go in it" — while this is technically docs/, creating documentation files is generally discouraged unless explicitly requested.

### Gaps in Risk Analysis

- **No risk for "compact landscape layout increases complexity" being insufficient.** The risk table says "Medium likelihood, Medium impact" but the mitigation ("keep one shared rect engine") doesn't address the design question of what the compact layout actually looks like.
- **No risk for safe-area padding interacting with Phaser's RESIZE mode.** If the container has padding, the Phaser canvas fills the padded area — but `this.scale.width/height` may or may not account for the padding, depending on how Phaser measures the parent.
- **Missing risk: text readability at very small proportional sizes.** When the viewport is 375x667, proportional fonts may drop below readable sizes. No font floor is mentioned.

### Missing Edge Cases

- Same as Claude critique: ultrawide, split-screen iPad, dynamic browser toolbar, PWA mode
- Additionally: what happens if the viewport is taller than 16:9 portrait (e.g., Samsung Galaxy Z Fold in narrow mode, ~280px wide)?
- No discussion of minimum supported viewport dimensions

### Definition of Done Completeness

Solid coverage. Notable gaps:
- No backward compatibility criterion (existing behavior preserved at reference viewport)
- "Agent-browser captures complete screenshot set" is vague — how many screenshots? What states?
- No criterion for font readability at smallest viewport
- Missing tap target verification in DoD (mentioned in body but not in the numbered DoD list... actually item 7 covers it)

---

## Comparative Summary

| Dimension | Claude Draft | Codex Draft |
|-----------|-------------|-------------|
| **Proportional math detail** | Excellent — concrete formulas | Weak — described but not specified |
| **Landscape strategy** | Rotate prompt (safe, minimal) | Compact layout + rotate fallback (ambitious, underspecified) |
| **Desktop fill** | CSS aspect clamping (still pillarboxes) | Full viewport fill (but unclear how) |
| **Backward compatibility** | Explicit 2px tolerance guarantee | Not addressed |
| **Device profile abstraction** | None — raw (cw, ch) params | ViewportMetrics with profile enum |
| **Risk analysis** | More specific to implementation | More general, misses key risks |
| **Scope realism** | More conservative, more achievable | More ambitious, higher risk of scope creep |
| **Phase granularity** | Good, but Phase 4 is too large | Good, dedicated landscape phase |

## Recommendations for Merge

1. **Use the Claude draft's proportional math** as the implementation foundation — it's the most concrete and actionable.
2. **Adopt the Codex draft's ViewportMetrics/profile abstraction** — it makes layout code more readable and testable than raw `(cw, ch)` parameters.
3. **Do NOT use CSS aspect ratio clamping on desktop.** The game should genuinely fill the browser. If the content column must be portrait-proportioned, add decorative side panels or a wider layout on desktop rather than leaving black bars.
4. **Landscape: rotate prompt for Sprint 004, landscape layout deferred.** A full landscape layout is a significant design and implementation effort. The rotate prompt is pragmatic for this sprint. Landscape layout can be Sprint 005.
5. **Add backward compatibility assertion** from the Claude draft to the final DoD.
6. **Add font floor (minimum 8-10px)** and high-DPI awareness as explicit requirements.
7. **Split Phase 4 (Scene Updates)** into separate BarnScene and TradingPostScene phases.
8. **Clarify agent-browser as best-effort** with Playwright screenshots as the primary verification mechanism.
