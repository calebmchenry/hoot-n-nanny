# Sprint 005 Draft Critique

Reviewer: Claude Opus 4.6
Date: 2026-03-17

This critique evaluates the Codex and Gemini drafts against the Sprint 005 intent: **make the game beautiful**. Both drafts are judged on whether they will produce a game that looks *intentionally art-directed* --- not merely functional with more detail.

---

## Codex Draft

### Strengths

1. **Extraordinary texture specification depth.** The barn plank algorithm (grain lines with sine-wave offsets, clamped random walks, knot-hole deflection fields, concentric rings, hairline cracks, edge-darkening for seamless tiling) is the most production-ready procedural wood recipe I've seen in a sprint doc. If implemented faithfully, this alone could sell the visual upgrade. The straw, paper, farmhouse, and deck-back recipes are equally detailed. This draft doesn't say "make it look like wood" --- it tells you *exactly* which pixels to draw.

2. **TileSprite architecture is correct.** Switching from stretched full-screen textures to repeatable tiles rendered via `TileSprite` is the right call. It fixes the current problem where textures degrade at non-reference resolutions and makes the responsive layout from Sprint 004 actually work for visual quality, not just positioning.

3. **Deterministic seeded RNG as a first-class contract.** The fnv1a32 + mulberry32 approach with stable texture keys (`env-barn-plank`, `ui-card-parchment`) is well-specified. This isn't a nice-to-have --- it's mandatory for agent-browser screenshot verification. The Gemini draft also has seeded PRNG but treats it as a utility rather than an architectural contract.

4. **Explicit depth map with wide spacing.** Depth values spaced by 10 (0, 10, 20, ... 220) leave room for insertion without renumbering. The Gemini draft uses sequential integers (0-7) which will cause conflicts the moment someone needs a layer between "card containers" and "card shadows."

5. **Five-phase implementation is well-sequenced.** Material system first, then barn environment, then cards/overlays, then motion, then Trading Post. Each phase has concrete acceptance criteria. The dependency chain is logical: you can't polish cards until the paper texture exists.

6. **Trading Post gets real treatment.** Phase 5 gives the Trading Post its own wall/counter/floor composition. The intent doc asks whether TradingPost should get equal polish --- Codex says yes. This is the right call. A polished barn that transitions to a flat brown rectangle would make the game feel *worse*, not better, because the contrast would highlight how bad the Trading Post is.

7. **Particle specification table is complete.** Six emitter presets with exact frequency, burst count, lifespan, speed ranges, alpha/scale curves, tint arrays, and particle caps. An implementer could code these without guessing.

### Weaknesses

1. **Typography is buried.** The bitmap font is item 3 of 5 in the architecture section and doesn't appear until Phase 3 (Cards/HUD/Overlay Art Pass). Typography is the *skeleton* of the UI. Every screenshot will show text. If Phase 1 (materials) and Phase 2 (barn environment) ship but Phase 3 stalls, you have beautiful wood grain with monospace Courier New labels floating on top of it --- arguably *worse* than the current state because the contrast between textured backgrounds and flat system text is jarring. Typography should be Phase 1 or at minimum Phase 1b.

2. **The 6x8 glyph set is underspecified.** The draft says "implement a 5x7 or 6x8 pixel glyph set" and provides a hierarchy (4x/3x/2x/1x scale) but doesn't specify the actual glyph data, the registration method, or how BitmapText word-wrapping will work for overlay paragraphs. The Gemini draft is significantly more specific here (5x7 grid, column-byte encoding, RetroFont.Parse registration, explicit handling of the word-wrap limitation). For a sprint doc, "implement a bitmap font" without specifying the font is like saying "add textures" without specifying what they look like.

3. **Scope is not trimmed.** The intent doc itself flags that 10 categories is ambitious and asks for priority ordering. Codex ships all 10 categories at full depth. This includes overlay restyling (dark wood + paper inset composition for *every* overlay), full micro-interactions (long-press radial fill, card touch feedback), legendary shimmer particles, bust burst particles (28 sparks + 10 dust), and celebration particles. The total particle emitter count is 6 distinct presets. This is a lot of visual engineering for a single sprint. The risk table acknowledges "scope" as a concern but the mitigation is just "move texture recipes to a separate file." That mitigates *maintainability*, not *scope*.

4. **New file structure violates directory rules.** The draft creates `src/rendering/proceduralTextures.ts`, `src/rendering/bitmapFont.ts`, and `src/rendering/particlePresets.ts`. CLAUDE.md says: "Do not create a new src/ subdirectory until a second file would go in it." Three files justifies the directory, but the draft should *acknowledge* it's creating a new directory and explain why, since it's overriding a stated convention.

5. **"Major rewrite" on three files simultaneously.** The files summary says BootScene, BarnScene, and TradingPostScene all get "Major rewrite." BarnScene is 2179 lines. TradingPostScene is 736 lines. BootScene is 295 lines. Rewriting all three in a single sprint is a massive diff. The risk table doesn't flag "merge conflict hell if any other work touches these files" or "reviewer fatigue on a 3000+ line diff."

6. **Motion timing table lacks interrupt/cancellation semantics.** The table specifies durations and eases for 11 different motions, but doesn't address what happens when animations overlap (e.g., a card draw flip is in progress when a resize event fires, or the player taps rapidly). BarnScene already has an `isAnimating` gate --- the draft mentions "integrate through the existing animation pipeline" but doesn't specify how 11 new tween types interact with that gate.

7. **Overlay restyle scope is underestimated.** Phase 3 includes "Restyle info panel, bust overlay, summary overlay, and win overlay using dark wood + paper insert composition." The summary overlay alone is a complex multi-section layout with headers, score rows, totals, and action buttons. Restyling it with textured wood backgrounds, paper inserts, divider lines, and staggered score animations is easily a phase unto itself. Lumping it with card textures, button textures, and typography replacement makes Phase 3 the largest phase by far.

8. **No fallback strategy.** If the bitmap font looks bad at certain scales, if procedural textures look noisy instead of beautiful, if particles tank mobile performance --- the draft doesn't specify rollback points. What's the minimum viable visual upgrade? Which features can be individually reverted without breaking the rest?

### Gaps in Risk Analysis

- **No risk for "pixelArt: true" interaction with soft particles.** `pixelArt: true` forces nearest-neighbor interpolation on *all* textures. Dust motes and particle puffs that are supposed to look "soft" will instead look like chunky pixel blocks. This is either a deliberate aesthetic choice (which should be stated) or a bug waiting to happen. The particle textures are specified at 8x8 and 12x12 --- at 1x scale with nearest-neighbor, these will be very visible hard-edged squares, not atmospheric dust.
- **No risk for BitmapText limitations.** BitmapText doesn't support word wrap, rich text, or per-character styling the same way Phaser.Text does. The overlays currently use multi-line text blocks with different colors. Switching to BitmapText means splitting these into many individual BitmapText objects or keeping Phaser.Text for those cases. This is a real implementation complexity that isn't called out.
- **No risk for "TileSprite + Scale.RESIZE" interaction.** TileSprite tiling behavior under Scale.RESIZE needs validation. If the scene resizes, does the TileSprite retile correctly or does it stretch? This matters because Sprint 004 specifically implemented resize-aware layout.
- **No risk for canvas texture generation timing.** The draft proposes generating textures via raw canvas operations (`CanvasRenderingContext2D`) rather than Phaser Graphics. This is a different codepath than the existing `maybeGenerateTexture` helper. The risk of BootScene timing issues (textures not ready when scenes reference them) isn't addressed.

### Missing Edge Cases

- What happens to procedural textures when `window.devicePixelRatio > 1`? Nearest-neighbor at 2x or 3x DPR will make 128x128 tiles look blocky on Retina displays. Is this intentional pixel art aesthetic or an oversight?
- The deck-back texture is specified at 64x82 but the current deck card size is 72 (`LAYOUT.BARN.DECK_SIZE`). Size mismatch?
- The vignette texture is recommended as a radial alpha gradient, but `pixelArt: true` means no bilinear interpolation. A radial gradient will show visible banding unless manually dithered.

### Definition of Done Completeness

Strong. 15 items covering materials, determinism, particles, animations, transitions, typography, buttons, depth, screenshots, tests, and budget. The only notable gap is **no DoD item for Trading Post visual parity** --- the files summary says TradingPost gets a "Major rewrite" but the DoD doesn't have a specific criterion for the Trading Post looking good. Item 12 ("agent-browser screenshots show dramatic improvement") is the closest, but it's subjective.

---

## Gemini Draft

### Strengths

1. **Typography-first prioritization is absolutely correct.** The "controversial stance" that typography is the single most impactful change is not controversial at all --- it's right. The draft places font generation in Phase 1 before *any* texture work. This means even if the sprint stalls at Phase 2, the game already looks dramatically better because every label, counter, button, and header has a cohesive pixel font instead of platform-dependent monospace. This is the single biggest architectural decision difference between the two drafts, and Gemini gets it right.

2. **Explicit scope trimming with priority table.** The draft openly cuts overlay restyling and micro-interactions (long-press radial, card touch brighten) to Sprint 006. It estimates this removes ~30% of scope while keeping ~90% of visual impact. This is honest prioritization. A sprint that ships 7 categories well is better than a sprint that ships 10 categories in a buggy or half-finished state.

3. **The glyph specification is implementation-ready.** 5x7 pixel grid, column-byte encoding (5 bytes per glyph, 7 bits per byte), atlas layout (570x8 pixels), RetroFont.Parse registration, explicit handling of the BitmapText word-wrap limitation (keep Phaser.Text for multi-line paragraphs). An implementer can start coding Phase 1 without asking any questions.

4. **Texture algorithms are concrete with exact coordinates.** The barn plank algorithm specifies plank height (28px), grain line count (8-12 per row), grain line alpha range (0.05-0.15), knot count (5-8), knot radius (3-5px), and the specific drawing operations. The straw floor specifies stroke count (80-120), angle range (-30 to +30 degrees), length range (8-20px). These aren't vague --- they're buildable.

5. **Phase structure is pragmatic.** Six phases: Typography, Textures, Animation, Depth, Particles, Polish. Each is small enough to complete and verify independently. The phases build on each other cleanly. If the sprint runs out of time, you can cut Phase 6 (scene transitions and idle animations) and still have a dramatically improved game.

6. **Bundle size estimate is specific.** "~30-35KB after changes, well within budget." The current app chunk is 21KB. The draft accounts for ~10-14KB of new code (glyph data, texture generators, particle configs, animation code). This is plausible and shows the author actually thought about the constraint.

7. **Agent-browser workflow is fully specified.** Before/after/per-phase screenshot commands with exact viewport sizes, wait conditions, and file paths. The verification strategy is immediately executable.

### Weaknesses

1. **Texture recipes are significantly less detailed than Codex.** Compare barn planks: Codex specifies sine-wave grain offsets, clamped random walks, knot deflection fields, concentric rings, hairline cracks, and edge-darkening for seamless tiling. Gemini specifies "8-12 horizontal lines at varied Y positions" and "5-8 knot circles with highlight arcs." The Gemini textures will look *better than the current flat rectangles*, but they won't look as rich as the Codex textures. For a sprint titled "make the game beautiful," texture richness matters. Gemini's barn planks will look like "decent programmer art" while Codex's will look like "procedural art."

2. **No TileSprite conversion.** Gemini keeps the existing pattern of generating full-reference-size textures (390x844 for barn planks, 390x130 for straw) and scaling via `setDisplaySize()`. This means: (a) textures are generated at one resolution and stretched at others, losing detail on large viewports; (b) no tiling means the wood grain pattern doesn't repeat naturally; (c) at desktop resolution (1920x1080), a 390px-wide texture upscaled 5x with nearest-neighbor will look chunky. Codex's TileSprite approach is architecturally superior for a responsive game.

3. **Depth layering uses sequential integers.** Depth 0 through 7 with no spacing. If someone needs to insert a layer between "Card containers" (3) and "Card shadows" (4), they have to renumber everything. Codex's approach (spacing by 10) is more future-proof. Additionally, Gemini puts card shadows at depth 4 *above* card containers at depth 3, which is backwards --- shadows should be *behind* (lower depth than) the cards they belong to.

4. **Particle scope is too thin.** Only dust motes and card-draw puffs. No legendary shimmer, no warning sparks, no bust burst, no celebration particles. The intent doc specifically calls out legendary shimmer and warning sparks as key deliverables. A legendary card that looks like every other card except for a static gold border doesn't "announce itself" in a screenshot. The Gemini draft defers too much particle work --- legendary shimmer in particular is cheap (1 particle per 160ms per card, capped at 10) and high-impact.

5. **Trading Post gets minimal attention.** The files summary says TradingPostScene is only "MODIFY: Replace Text with BitmapText, add camera fade-in, add depth assignments." No texture upgrades, no particle effects, no enhanced backgrounds. The Trading Post will still be a flat brown rectangle with pixel font labels. The scene transition will actually make this *worse*: a polished barn fades to black, then fades in to reveal... a brown rectangle. The contrast will be jarring.

6. **No new file for texture generation.** All texture generation stays in BootScene. BootScene is currently 295 lines. After adding detailed wood grain, straw, paper, farmhouse, deck-back, rafter, card shadow, vignette, and particle textures --- plus the bitmap font generator --- BootScene could balloon to 800+ lines. The draft lists `src/config/pixelFont.ts` as a new file for glyph data, but all the drawing code stays in BootScene. This will make BootScene unwieldy and hard to test in isolation.

7. **Overlay deferral is a missed opportunity.** The draft defers overlay restyling entirely ("overlays work fine as dark panels"). They don't work fine. The black overlay backgrounds are one of the ugliest elements in the current game. You don't need full wood-texture-with-paper-inset composition --- even just a semi-transparent dark brown background with a 1px border and a textured header bar would be a massive improvement at minimal cost. Full deferral is too conservative.

8. **Farmhouse chimney is architecturally wrong.** "A small 8x16 rectangle on the right side of the roof at 0x4a3a3a." Chimneys emerge from the *roof peak or slope*, not the side. An 8x16 rectangle on the side of the roof will look like a misplaced wall segment, not a chimney. The Codex draft specifies brick patterns (6x3 units, staggered rows) which at least *look* like masonry.

### Gaps in Risk Analysis

- **No risk for `pixelArt: true` + soft particles.** Same gap as Codex. 4x4 and 6x6 circle textures with nearest-neighbor will be hard-edged blocks, not soft motes. The "atmospheric" feel described in the use cases requires some softness.
- **No risk for BitmapText `.setTint()` limitations across overlay text.** The draft notes in Open Questions that per-character styling requires splitting into separate BitmapText objects, but doesn't flag this as a risk or estimate the additional complexity. Overlays with mixed-color text (score labels in white, values in green) will require significant refactoring.
- **No risk for "resize" invalidating particle emitter positions.** BarnScene responds to `Scale.RESIZE` events. Particle emitters initialized with `x: { min: 0, max: 390 }` will emit in the wrong region after a resize. The emitter bounds need to update on resize.
- **No risk for "animation timing conflicts."** The draft adds 7 new tween types (card flip, bounce, button press/release, resource pop, noise dot, window pulse, deck float) but doesn't address how they interact with the existing `isAnimating` gate or resize-triggered relayout.
- **No risk for the vignette gradient banding.** The vignette uses 6 strips at increasing alpha to approximate a gradient. With `pixelArt: true` and nearest-neighbor, these strips will have visible hard edges. The draft even specifies the strip values (0.0, 0.03, 0.06, 0.1, 0.14, 0.2) but doesn't note that 6 steps is likely too few for a smooth vignette --- you'd need 15-20 strips at minimum, or a noise-dithered approach.

### Missing Edge Cases

- BitmapText at 18px (2.5x scale of 7px base height) will render at 17.5px, which rounds inconsistently. Scale factors should produce integer pixel sizes.
- The pixel font is white-on-transparent for tinting. What about text that currently renders with a shadow or stroke? BitmapText doesn't support stroke. Headers that rely on stroke for legibility against textured backgrounds will lose contrast.
- The card draw flip (scaleX 0 to 1 with Back.easeOut) will momentarily make the card infinitely thin. Any child objects (text, sprites) may flash or misrender at scaleX ~0. Need to handle the midpoint of the flip (hide face content when scaleX < 0.3, show deck back instead).
- The draft specifies `Phaser.Math.Easing.Bounce.Out` for card scaleY, but Bounce.Out produces multiple bounces which may look jittery on a 250ms tween. `Back.Out` with controlled overshoot is more appropriate for a single-bounce landing.

### Definition of Done Completeness

Thorough for the scoped work (17 items), but the scope is reduced so the DoD is correspondingly less ambitious. Notable gaps:

- **No DoD item for deterministic texture reproducibility.** Codex has this (item 2). If textures aren't deterministic, screenshot verification is meaningless.
- **No DoD item for Trading Post visual improvement.** The only Trading Post work is font replacement and fade-in, but there's no criterion verifying the Trading Post looks better.
- **No DoD item for particle performance.** The risk table mentions profiling but the DoD doesn't require it.
- **Item 16 estimates "~30-35KB" but doesn't specify how to measure.** The existing `npm run budget` command checks thresholds --- the DoD should reference that command.

---

## Head-to-Head Comparison

| Dimension | Codex | Gemini | Verdict |
|-----------|-------|--------|---------|
| **Texture richness** | Extraordinary detail. Production-grade wood, straw, paper recipes. | Good detail. Will improve the game but won't rival hand-drawn art. | Codex by a wide margin. |
| **Typography** | Underspecified and buried in Phase 3. | Fully specified and prioritized as Phase 1. | Gemini by a wide margin. |
| **Scope management** | Ships all 10 categories. High risk of partial delivery. | Cuts to ~7 categories. Realistic for a single sprint. | Gemini. |
| **Architecture** | TileSprite, canvas textures, `src/rendering/` module. Superior. | Keeps existing stretched-texture pattern. Will degrade at desktop. | Codex. |
| **Particle effects** | 6 full presets with exact parameters. | 2 presets (dust + puff). Defers legendary shimmer. | Codex, though Gemini's cuts are defensible. |
| **Trading Post** | Full Phase 5 treatment. | Near-zero visual improvement. | Codex. |
| **Implementation readiness** | Phases are well-sequenced but massive. | Phases are small, focused, and achievable. | Gemini. |
| **Risk analysis** | 8 risks, decent mitigations. | 6 risks, decent mitigations. Both miss pixelArt + particles. | Tie (both have gaps). |
| **Definition of Done** | 15 items, comprehensive. | 17 items, thorough for scoped work. | Codex (higher ambition), Gemini (better scoped). |
| **Will it be BEAUTIFUL?** | Yes, if fully implemented. The textures and particles would produce a genuinely atmospheric game. But the scope makes full delivery risky. | Better than today, but still programmer-art-tier in places. Trading Post will be a letdown. Desktop will show stretched textures. | See recommendation below. |

---

## Shared Blind Spots (Both Drafts)

1. **`pixelArt: true` is the elephant in the room.** Neither draft seriously reckons with the fact that the game config forces nearest-neighbor interpolation on everything. This means:
   - Soft particles are impossible without explicit multi-pixel anti-aliasing in the source texture.
   - Vignette gradients will band visibly.
   - Scaled textures will be chunky on high-DPR screens.
   - This isn't necessarily bad --- it can be a *deliberate pixel art aesthetic* --- but neither draft frames it that way. They both describe "soft dust motes" and "atmospheric vignettes" that are physically impossible under nearest-neighbor. The final sprint doc needs to either embrace the chunky pixel aesthetic (and design particles and gradients accordingly) or propose turning off `pixelArt: true` (and dealing with the animal sprite rendering consequences).

2. **Neither draft addresses the `Scale.RESIZE` + procedural texture interaction.** When the viewport resizes, scenes rebuild their layout using `(cw, ch)`. But procedural textures are generated once in BootScene at reference size. If a texture is generated at 128x128 and displayed at 256x256, nearest-neighbor will make it look like 2x pixel art. This might be fine (intentional retro aesthetic) or it might look bad (chunky wood grain at desktop resolution). Neither draft tests this or even mentions it.

3. **Neither draft has a rollback/revert strategy.** If the bitmap font looks terrible, or if the procedural textures look worse than the flat fills, what's the plan? The existing flat textures are being overwritten. A careful implementation would preserve the current `maybeGenerateTexture` calls behind a flag or at minimum commit them to a known-good state before the rewrite. Neither draft suggests this.

4. **BarnScene is 2179 lines and both drafts propose major modifications.** Neither draft considers extracting rendering logic into helper modules (the way layout logic is already in `barnLayout.ts`). After this sprint, BarnScene could be 2500-3000+ lines with particle setup, tween chains, depth management, and texture-specific rendering. A `barnRendering.ts` or similar extraction would be prudent.

5. **Neither draft specifies what "dramatic visual improvement" means objectively.** Both DoDs end with "screenshots show dramatic improvement." This is subjective. A more testable criterion would be: "Non-developer shown a before/after screenshot can identify which is 'after' within 2 seconds" or at minimum a checklist of specific visual features that must be present in the screenshot (visible wood grain, particle motion, pixel font text, etc.).

---

## Recommendation

**Neither draft should be executed as-is.** The ideal sprint doc takes Gemini's prioritization and implementation pragmatism and combines it with Codex's texture depth and architectural decisions. Specifically:

1. **Phase 1: Typography** (from Gemini). This is non-negotiable. Ship the pixel font first.
2. **Phase 2: Texture system + TileSprite conversion** (from Codex architecture, Codex texture recipes). Use `src/rendering/proceduralTextures.ts`, TileSprite, and the detailed material algorithms. But generate only the top-3 highest-impact textures first: barn planks, straw floor, card paper.
3. **Phase 3: Animation juice** (from Gemini's scoped list). Card flip, button press, resource pop. Skip the long-press radial and card touch feedback.
4. **Phase 4: Depth + shadows + vignette** (merged). Use Codex's depth spacing (by 10s). Design the vignette with awareness of `pixelArt: true` banding.
5. **Phase 5: Particles** (from Codex, but scoped). Dust motes, card puff, and legendary shimmer only. Skip bust burst and celebration particles.
6. **Phase 6: Farmhouse, deck-back, Trading Post, scene transitions** (merged). Don't leave Trading Post for last with zero visual improvement. Give it at minimum the same tile-based wall texture as the barn.

**The one thing that must be resolved before implementation:** Decide whether `pixelArt: true` is the intended aesthetic for particles and gradients, or whether it should be selectively overridden. This decision shapes every texture and particle specification in the sprint.
