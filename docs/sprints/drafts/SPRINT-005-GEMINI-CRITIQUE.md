# Sprint 005 Draft Critique

## Claude Draft

### Strengths

1. **Pragmatic architecture.** Keeping the seeded PRNG and all texture generation inside `BootScene.ts` rather than creating new directories respects the existing codebase convention ("do not create a new src/ subdirectory until a second file would go in it"). This is the right call and will produce a smaller, more reviewable diff.

2. **Phased implementation with clear cut lines.** The 8-phase plan explicitly names Phase 7 (card touch feedback + long-press radial) as the first candidate to defer. When a sprint is this ambitious, knowing what to cut is almost as important as knowing what to build. The priority ranking in Open Question 4 is sound.

3. **Concrete pixel-level algorithms.** The barn plank, straw, rafter, farmhouse, and deck-back algorithms are specified down to individual draw calls with specific alpha values, pixel offsets, and color codes. An implementer can type these in directly rather than interpreting vague art direction. This is the single biggest strength of the draft -- it does not punt on the hard part.

4. **Conservative particle budgets.** Dust at 1 per 600ms, shimmer at 1 per 300ms, one-shot bursts at 6-20 particles, total active < 30. These numbers are realistic for mobile. The draft explicitly calls out profiling on throttled Chrome DevTools.

5. **Honest about what it skips.** Open Question 3 recommends deferring the bitmap font to Sprint 006. This is the right call. A procedural bitmap font is a sub-project unto itself, and trying to ship it alongside texture overhaul, particles, animations, transitions, and overlay theming is a recipe for doing everything at B-minus quality.

### Weaknesses

1. **Full-canvas textures at fixed reference size (390x844) will not tile.** The barn plank background is generated at 390x844 as a single texture, not as a repeatable tile. On a desktop viewport (1920x1080), Phaser will scale this single texture via nearest-neighbor, making every 1px grain line 5px wide and every knot hole a blocky circle. The entire texture generation strategy for the barn wall assumes phone dimensions. The draft never addresses what happens at larger viewports where `setDisplaySize(cw, ch)` stretches the reference texture. This is a showstopper for "beautiful at desktop sizes." The Codex draft's approach of using 128x128 repeatable tiles rendered as `TileSprite` is fundamentally more correct.

2. **No mention of `TileSprite`.** Related to the above: the straw floor is also generated at a fixed reference size. The intent doc's success criteria include "agent-browser screenshots prove quality at phone, tablet, desktop viewports." Scaled-up pixel textures will look terrible on tablet and desktop. The draft relies entirely on `setDisplaySize()` upscaling, which defeats the purpose of detailed procedural textures.

3. **The card flip animation is deeply nested callbacks.** Phase 5a shows 5 levels of nested tween `onComplete` callbacks. This is fragile: any interruption (scene resize, rapid draws, scene shutdown during animation) can orphan tweened objects or leave the deck-back image un-destroyed. The draft does not discuss interrupt safety or interaction with the existing `isAnimating` gate.

4. **Vignette depth is self-contradictory.** The DEPTH constants put `VIGNETTE: 80` and `OVERLAYS: 70`, which means the vignette renders above overlays. Open Question 1 catches this bug but does not resolve it -- it just says "should it be 55?" This should be a decision, not a question. An implementer might pick either value and get it wrong.

5. **No visual vocabulary for overlay theming.** Phase 6b says "replace black rectangle with `TEXTURES.OVERLAY_BG`" and adds alternating strips, but the overlay texture is just a dark rectangle with plank lines and noise (Phase 2i). There is no vision for what the overlay should *look like as a composition* -- headers, insets, paper panels within the wood frame, divider styles. The result will be "dark brown rectangle with faint lines" instead of "black rectangle," which is barely an improvement in screenshots.

6. **Button feedback has a `pointerout` bug.** The `pointerout` handler tries to read `button.getData('baseY')`, but nothing in the draft ever calls `button.setData('baseY', ...)`. This will fall through to `button.y`, which after the `pointerdown` tween has already been offset by +2, so the button will never return to its original position. A small bug, but it shows the code snippets were not tested.

7. **No color palette coherence pass.** The draft adds 14 new PALETTE entries but never describes how they relate to each other as a palette. There is no mood board, no warm-to-cool ramp, no discussion of value contrast ratios. Individual textures may look fine in isolation but clash when composed together. "Beautiful" requires palette intentionality, not just individual color picks.

8. **Missing: Trading Post gets almost no love.** Phase 6c gives it a single wood-panel background texture. No particles, no card paper texture, no button upgrades beyond "apply to all buttons in TradingPostScene." The intent doc asks "should the Trading Post get the same level of polish?" and the Claude draft mostly answers "no, not really."

### Gaps in Risk Analysis

- **No risk entry for `TileSprite` vs. single-texture scaling on larger viewports.** This is the most likely visual failure mode.
- **No risk entry for HMR interaction.** The project notes that HMR causes duplicate canvases. Adding particle emitters, idle tweens, and persistent shimmer emitters multiplies the cleanup surface area. The draft never discusses shutdown/destroy lifecycle for the new persistent objects.
- **No risk for "textures look worse than flat fills."** If the grain lines, noise, and knots are even slightly off, the barn will look dirtier rather than richer. The only mitigation is "test immediately in Phase 2," but there is no fallback plan or A/B comparison strategy.

### Missing Edge Cases

- Barn with 5 cards + 2 legendary cards: does shimmer particle cap (1 per 300ms per card) still hold with 2 simultaneous shimmer emitters?
- Window glow pulse + warning state: the draft does not enhance the window glow during warning (the intent doc says "window glow intensifies").
- Overlay open during scene fade: what happens if the bust overlay triggers while a scene fade is in progress?
- Resize during card flip animation: the nested tween chain references stale `slot.x/slot.y` values captured in closure. Sprint 004's responsive layout means these can change mid-animation.

### Definition of Done Completeness

The 23-point DoD is thorough for what the draft covers. Missing entries:

- No DoD item for "textures look correct at desktop resolution" (the most likely failure).
- No DoD item for "idle animations do not accumulate on scene restart" (leak prevention).
- No DoD item for bitmap font, which the draft explicitly defers -- this is fine, but the intent doc lists it as a hard requirement. The draft should note this is a scope exclusion, not just an open question.

---

## Codex Draft

### Strengths

1. **Tiling texture architecture is correct.** The core architectural decision to use 128x128 (or similar) repeatable tiles rendered as `TileSprite` is the right answer to multi-viewport rendering. This is the single most important technical decision in the sprint, and the Codex draft gets it right where the Claude draft gets it wrong. Wood planks, straw, and Trading Post walls all benefit from tiling.

2. **Extraordinary algorithmic detail for wood grain.** The barn plank algorithm is the most sophisticated in either draft: sinusoidal grain lines with a clamped random walk, knot holes with concentric rings and grain bending via exponential falloff, pore/speck scatter, and edge-darkening to hide tile seams. This is not placeholder -- it is a real wood grain algorithm that will produce recognizably wood-like results under nearest-neighbor scaling.

3. **Material system abstraction.** The `src/rendering/proceduralTextures.ts` module with stable texture keys and a shared seeded RNG contract means the same wood/paper/straw generators can be reused across barn walls, overlay panels, Trading Post walls, and buttons (with palette variants). This is how you get visual coherence without duplicating code.

4. **Paper/parchment algorithm is layered correctly.** Four passes of mottling blots, then fibers, then speckles, then edge treatment. This layering order (large variation first, fine detail last) is how real paper textures are built. The variant rules for noisy and legendary cards are clear modifications of the base, not separate recipes.

5. **Explicit depth band table with wide spacing.** Depths at 0, 10, 20, 30... 200, 210, 220 leave room for intermediate values. The Claude draft's tighter spacing (0, 10, 20, 30, 35, 40, 45, 50, 60, 65, 70, 80) is more fragile -- inserting a new layer between 35 and 40 is awkward.

6. **Farmhouse recipe is the most detailed in either draft.** Five shingle rows with alternating offsets, clapboard siding, door with handle, window frames with muntins, and brick chimney with staggered courses. This will actually look like a tiny farmhouse rather than a rectangle plus triangle.

7. **Five-phase implementation mirrors art production workflow.** Materials first, then environment, then cards/HUD, then motion, then final scene + review. This order means you can screenshot after Phase 2 and already see dramatic improvement, even if later phases slip.

8. **The draft has a clear visual vision.** Use cases read like art direction notes, not engineering tickets. "The barn should feel warm, dusty, and tactile" and "the Trading Post should feel like a distinct place, not a reskin of the barn" are real creative goals. The Claude draft's use cases read more like feature descriptions.

### Weaknesses

1. **Creates `src/rendering/` with three new files.** The project convention says "do not create a new src/ subdirectory until a second file would go in it." Three files is arguably past the threshold, but this directory does not exist today. More importantly, this splits texture generation across `BootScene.ts` (which still calls the generators) and `src/rendering/proceduralTextures.ts` (which contains the algorithms), plus `bitmapFont.ts` and `particlePresets.ts`. The implementer now has to maintain a calling interface between BootScene and the rendering module, which adds API surface area. The convention says "no barrel files until 3+ consumers" -- but there is only one consumer (BootScene). A pragmatic alternative is a single `proceduralTextures.ts` file co-located in `src/scenes/` and imported by BootScene.

2. **The bitmap font is in scope.** Unlike the Claude draft, which wisely defers it, the Codex draft includes a full 5x7 pixel glyph set with A-Z, a-z, 0-9, and punctuation. This is a substantial sub-project: designing 70+ pixel glyphs, building an atlas canvas, registering it as a Phaser bitmap font, then replacing every `Text` object in BarnScene (2179 lines) and TradingPostScene (736 lines) with `BitmapText`. The font hierarchy (4x, 3x, 2x, 1x scale) needs to be tuned per viewport. This alone could consume half the sprint. Including it makes the overall scope unrealistic.

3. **Particle table is dense but hard to validate.** The emitter preset table (6 effects with 9 columns each) contains exact numbers like `speedX -4..7`, `alpha 0.18->0`, `scale 0.55->0.12`, `frequency: 320ms`, `cap: 18`. These are reasonable-looking numbers, but without runtime tuning they are almost certainly not final values. The danger is that an implementer types them in verbatim and calls it done, when particle tuning is inherently an iterative visual process. The table gives false confidence.

4. **Motion timing table has the same false-precision problem.** `card flip: 110ms`, `slot flash: 140ms`, `button press: 70ms`. These timings are all plausible, but the difference between 110ms and 140ms is only noticeable through feel-testing. The draft presents them as settled constants rather than starting points. No mention of iteration or the subjective nature of timing.

5. **Scope is the largest in either draft.** Five phases, each a "major rewrite" of a different file, plus three new files, plus bitmap font, plus 6 particle effects, plus 11 motion timings, plus Trading Post overhaul, plus e2e test creation. The intent doc's uncertainty assessment says "Scope: High" and the Codex draft does not reduce scope -- it maximizes it. There is no triage order if time runs out.

6. **No priority ranking for scope cuts.** The Claude draft explicitly ranks what to cut first. The Codex draft lists everything as equally important. If Phase 3 takes twice as long as expected (likely, given the BarnScene is 2179 lines), there is no guidance on what to skip in Phase 4 or 5.

7. **Deck-back algorithm is over-designed for 64x82 pixels.** The diamond medallion with cardinal dots, corner L-motifs, inner panel with double borders, and 24 star flecks is a lot of detail for a texture that will be displayed at ~50-60px wide on phone. Under `pixelArt: true` nearest-neighbor scaling, many of these 1px details will either vanish or alias. The algorithm needs to be validated at actual display size, not at a design spec level.

8. **The "visual proof is reviewable" use case is aspirational.** The draft proposes capturing screenshots for "Barn empty, Barn with 3 cards including 1 Legendary, warning state, night summary overlay, Trading Post" at three viewports. That is 15+ screenshots. The verification strategy requires manually achieving each game state via agent-browser, which means automating gameplay inputs. The draft does not describe how to reach these states programmatically.

### Gaps in Risk Analysis

- **No risk for "bitmap font delays the entire sprint."** This is the most likely schedule risk given the scope.
- **No risk for "nearest-neighbor scaling destroys sub-pixel detail in textures."** The `pixelArt: true` constraint is acknowledged but never evaluated against the fine-detail algorithms. A 1px grain line at 0.08 alpha rendered through nearest-neighbor onto a scaled canvas may be invisible or produce aliasing artifacts.
- **No risk for "TileSprite scrolling/offset bugs."** Switching from stretched images to TileSprites can introduce seam issues, especially during viewport resize. The draft assumes TileSprite "just works" but does not note that `TileSprite` with non-power-of-two textures in WebGL can produce rendering artifacts in some browsers.
- **No fallback plan if procedural textures look worse than flat fills.** The risk table says "review actual screenshots after each material" but does not describe what happens if the review concludes "this looks bad."

### Missing Edge Cases

- `pixelArt: true` with canvas-generated textures: Phaser's `pixelArt` flag sets `antialias: false` on the renderer. Canvas textures generated via `CanvasTexture` or offscreen canvas may not respect this flag during generation, leading to anti-aliased source textures that then get nearest-neighbor scaled -- the worst of both worlds.
- Seeded RNG determinism across platforms: `Math.imul` behavior should be consistent, but the FNV-1a hash uses string keys. If any texture key changes between builds (e.g., due to a refactor), all downstream textures change. The draft does not note this fragility.
- Memory pressure from canvas textures: each 128x128 RGBA texture is 64KB in GPU memory. With 10-15 textures, this is ~1MB -- fine on desktop but worth noting for low-end mobile where texture memory is shared with the browser compositor.

### Definition of Done Completeness

The 15-point DoD is comprehensive and well-structured. Compared to the Claude draft's 23 points, it is more concise but covers the same ground with less redundancy.

Missing entries:

- No DoD item for "tiled textures show no visible seam at any viewport size." This is the most important visual quality check for the tiling approach and should be explicit.
- No DoD item for "particles do not accumulate or leak on scene restart / resize." Given the persistent shimmer and ambient dust emitters, this is a real cleanup concern.
- No DoD item for bitmap font legibility at small viewport sizes. If the 5x7 font at 1x scale is 5 pixels tall on a 393px-wide phone, it needs to be verified as readable.

---

## Comparative Assessment

### Which draft will produce better screenshots?

The **Codex draft** will produce better screenshots, primarily because of two decisions:

1. **Tiling textures** that hold up at desktop resolution instead of stretched single-canvas textures.
2. **More sophisticated material algorithms** (sinusoidal wood grain with knot bending, layered paper mottling) that will read as intentional art rather than programmatic noise.

However, the Codex draft will only produce better screenshots if it ships. Its scope is approximately 40-50% larger than the Claude draft due to the bitmap font inclusion, Trading Post overhaul depth, and the three-file rendering module. If the sprint runs out of time at Phase 3, the Claude draft's simpler approach will have delivered more total value.

### Recommendations for the final sprint plan

1. **Use the Codex draft's tiling architecture.** 128x128 repeatable tiles via TileSprite is the right technical foundation. This is non-negotiable for desktop quality.

2. **Use the Codex draft's material algorithms.** The wood grain, paper, and straw recipes are more detailed and will produce better results. But validate them at actual display size under `pixelArt: true` before committing.

3. **Defer the bitmap font to Sprint 006.** Both drafts should agree on this. The Claude draft is right to flag it as a separate sub-project.

4. **Use the Claude draft's phasing and cut-line strategy.** Explicit priority ranking and named deferral candidates are essential for a high-scope sprint.

5. **Fix the vignette depth.** It should be below overlays (depth 55 or equivalent), not above them. This should be a decision in the plan, not an open question.

6. **Add a DoD item for tile seam quality at 1920x1080.** If the tiling approach is adopted, this is the first thing that will look wrong if it fails.

7. **Cap the Trading Post polish.** Give it the same material system (wood walls, paper cards) but do not design it as a wholly distinct environment in this sprint. That is a Sprint 006 concern.

8. **Treat particle numbers as starting points, not constants.** Both drafts should note that particle tuning is iterative. The numbers in the plan are defaults, not specifications. An implementer should expect to adjust every value after seeing it at runtime.

9. **Address `TileSprite` + non-power-of-two texture risk.** The 128x128 size is a power of two, which is good. If any texture size deviates (like the 128x64 straw floor in the Codex draft), note the potential WebGL rendering issue and test in multiple browsers.

10. **Add interrupt safety to animation chains.** Both drafts propose multi-step tween sequences (card flip, button press) without discussing what happens on scene shutdown or rapid re-trigger. The final plan should require that all tween chains check for scene active state and clean up orphaned objects.
