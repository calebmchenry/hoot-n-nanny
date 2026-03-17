# Sprint 005 Merge Notes

## Draft Strengths

### Claude Draft
- Best atmosphere and hero-moment coverage (bust, warning, legendary, summary all get bespoke treatment)
- Strong overlay theming (dark barn-wood texture + visual hierarchy)
- Trading Post gets real visual identity
- Good particle variety (6 types: dust, puff, shimmer, warning, bust, celebration)
- Warm color palette additions (sunset glow, dusty rose, plum)
- Detailed depth map with wide spacing (0, 10, 20... 80)

### Codex Draft
- Extraordinary procedural texture recipes (sine-wave grain, knot deflection fields, concentric rings, hairline cracks)
- TileSprite architecture for repeatable tiles — correct for responsive viewports
- Deterministic seeded RNG as first-class architectural contract (fnv1a32 + mulberry32)
- `src/rendering/` module structure for texture/font/particle code
- Full Trading Post Phase 5 treatment with distinct visual identity
- Complete particle specification table (6 presets with exact parameters)

### Gemini Draft
- Typography-first prioritization (Phase 1 before anything else) — correct instinct
- Fully specified 5x7 glyph bitmap font (column-byte encoding, RetroFont.Parse, atlas layout)
- Explicit scope cuts with priority table (removes ~30% scope, keeps ~90% impact)
- Pragmatic phase structure (6 small, independently verifiable phases)
- Bundle size awareness (~30-35KB estimate)
- Agent-browser verification workflow with exact CLI commands

## Valid Critiques Accepted

1. **Typography must be Phase 1** (all critiques agree). Claude defers it to Sprint 006 — wrong for a beauty sprint. Gemini puts it first. Adopted: Phase 1 = bitmap font.

2. **TileSprite is architecturally superior** (Claude critique of Gemini, Gemini critique of Codex is positive). Stretched reference-size textures look chunky at desktop 1920x1080. Repeatable 128x128 tiles via TileSprite are the right approach. Adopted from Codex.

3. **Codex texture recipes are production-grade** (Claude critique). Gemini's "8-12 lines at varied Y" would look decent. Codex's grain with sine-wave offsets, knot deflection, and edge darkening would look beautiful. Adopted: Codex texture algorithms.

4. **Depth spacing by 10s** (Claude critique of Gemini). Sequential integers (0-7) with no room for insertion is fragile. Adopted: Codex's approach.

5. **Trading Post must get real polish** (Codex critique of Gemini). A polished barn that transitions to a flat brown rectangle makes the contrast worse. Adopted: Trading Post gets texture treatment.

6. **Overlays must improve** (Codex critique of Gemini). "Overlays work fine as dark panels" is wrong — they're some of the ugliest states. Adopted: At minimum, semi-transparent textured backgrounds.

7. **pixelArt + particles conflict** (all critiques). Nearest-neighbor makes "soft dust" impossible. Decision: selective smoothing — particle textures get manually anti-aliased multi-pixel soft circles. Sprites/textures stay pixelArt.

8. **Particle emitter positions must update on resize** (Claude critique of Gemini). Emitters initialized at reference coordinates will emit in wrong regions after resize.

9. **BitmapText limitations** (Claude critique of both). No word wrap, no per-character styling. Keep Phaser.Text for multi-line overlay paragraphs. Use BitmapText for labels, counters, headers, buttons.

10. **Vignette banding under pixelArt** (Claude critique of Gemini). 6 strips too few. Need 15-20+ or noise-dithered approach.

## Valid Critiques Rejected

1. **"Cut to 7 categories"** (Gemini draft stance) — User explicitly chose "beauty over safety." All 10 categories ship.

2. **"Typography is not the single most impactful change"** (Codex critique of Gemini) — The critiques disagree on this but the user confirmed pixel font. Typography IS Phase 1 because every screenshot shows text.

3. **"Defer legendary shimmer particles"** (Gemini draft) — Legendary shimmer is cheap (1 particle per 160ms per card) and high-impact. Ships in this sprint.

## Interview Refinements

1. **Pixel font (clean retro)**: Procedurally-generated 5x7 bitmap font. Phase 1 priority.
2. **All 10 categories**: Beauty over safety. Ship everything.
3. **Selective smoothing**: Particle textures get manual AA (multi-pixel soft circles). Other textures stay pixelArt nearest-neighbor.

## Key Design Decisions Locked

| Decision | Resolution |
|----------|-----------|
| Typography approach | 5x7 procedural pixel bitmap font via RetroFont.Parse. Phase 1. |
| Typography scope | BitmapText for labels/counters/headers/buttons. Keep Phaser.Text for multi-line paragraphs. |
| Texture architecture | 128x128 tileable textures via TileSprite (Codex pattern) |
| Texture algorithms | Codex-grade recipes: sine-wave grain, knot deflection, edge darkening |
| PRNG | fnv1a32 + mulberry32, per-texture seeded instances |
| Module structure | `src/rendering/proceduralTextures.ts`, glyph data in `src/config/pixelFont.ts` |
| Depth spacing | By 10s (0, 10, 20... 80) |
| Particle textures | Manually anti-aliased soft circles (4x4, 6x6, 8x8) despite pixelArt:true on sprites |
| Particle scope | All 6 types: dust, puff, shimmer, warning, bust, celebration |
| Vignette | Noise-dithered approach with 20+ gradient steps for smooth edges |
| Overlay styling | Semi-transparent dark wood texture backgrounds, not plain black |
| Trading Post | Full texture treatment — distinct "tack room" identity |
| Scope | All 10 categories. Beauty over safety. |
| Resize handling | Particle emitters update bounds on resize. TileSprite handles resize naturally. |
