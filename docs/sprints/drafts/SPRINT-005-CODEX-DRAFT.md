# Sprint 005: Visual Polish and Procedural Art Pass

## Overview

Sprint 004 fixed layout and scaling, but the game still looks like a prototype. `BootScene.ts` is generating mostly flat rectangles and stripe fills, `BarnScene.ts` is rendering those textures with minimal depth, and `TradingPostScene.ts` is still a brown rectangle with functional cards. This sprint is a full art-direction pass on top of the existing gameplay loop.

The quality bar is not "clear enough" or "readable enough." The bar is that screenshots should look intentionally art-directed at phone and desktop sizes. The barn should feel warm, dusty, and tactile. Cards should look printed on real paper, not like colored UI boxes. The Trading Post should feel like a distinct place, not a reskin of the barn.

This sprint keeps the hard constraints from prior work:

1. No gameplay changes and no edits to `src/game/*`.
2. No external art assets beyond the existing `animals` atlas.
3. No new npm dependencies.
4. App chunk remains under the existing `<100KB gzipped` budget.
5. All procedural visuals are deterministic so `agent-browser` screenshots are stable.

Primary outcomes:

1. Rich procedural materials for wood, straw, parchment, painted buttons, deck backs, overlays, and props.
2. A bitmap-font pass that replaces the current monospace placeholder look.
3. Ambient particles, one-shot impact particles, and persistent legendary shimmer.
4. Meaningful motion: draw flip, bounce, slot flash, stat pops, button compression, transitions.
5. Stronger composition through lighting, vignette, shadows, and explicit depth bands.

## Use Cases

1. **First impression in Barn**: On a fresh Night at `393x852`, the player sees a sunset-to-plum sky through the loft opening, warm plank walls with visible grain and knots, layered straw on the floor, slow dust motes in the air, and a farmhouse whose window glow feels alive instead of binary.

2. **Card draw feels premium**: Drawing an animal no longer just spawns a container. The card flips from deck edge-on to face-up, lands with a short straw puff and white slot flash, and its resource numbers pop once so the interaction reads instantly even on a phone.

3. **Warning state has tension**: When the barn enters warning, the farmhouse glow deepens, orange-red sparks spit from the window/noise area, and the scene subtly warms without obscuring state clarity.

4. **Legendary cards announce themselves**: A Legendary card reads as special even in a static screenshot. It has foil-like border treatment, moving spark particles, a better deck-back reveal, and a more deliberate gold palette than the current simple stroke + tween.

5. **Night summary looks designed**: The summary overlay uses textured dark wood plus paper inserts, score rows appear with stagger and celebration particles, and the screen feels like a crafted scene transition instead of black rectangles with text.

6. **Trading Post has its own identity**: Browsing the shop feels like moving to a lit market stall or tack room. The background, tabs, cards, and CTA buttons all share the same material language, while still reading clearly against the Barn scene.

7. **Desktop still looks intentional**: At `1920x1080`, the larger canvas reveals more atmosphere and spacing rather than exposing flat fills or repeated artifacts.

8. **Visual proof is reviewable**: `agent-browser` captures before/after screenshots for Barn, warning state, Legendary card state, summary overlay, and Trading Post at phone/tablet/desktop viewports.

## Architecture

### 1. Deterministic Procedural Texture Pipeline

`BootScene.ts` should stop treating all textures as simple `Graphics.generateTexture()` rectangles. Simple icons can stay on the graphics path, but textured surfaces should move to a deterministic canvas-texture pipeline so they can use per-pixel noise, fibers, grain lines, and gradients.

Recommended structure:

- `src/rendering/proceduralTextures.ts`: seeded RNG, shared drawing helpers, material generators.
- `src/rendering/bitmapFont.ts`: procedural bitmap font atlas generation.
- `src/rendering/particlePresets.ts`: emitter factory functions and preset constants.

Shared RNG contract:

```ts
const fnv1a32 = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
```

Rules:

1. Every texture generator takes a stable key, for example `env-barn-plank`, `ui-card-parchment`, `fx-dust`.
2. No `Math.random()` inside generation or particle preset setup.
3. Texture generation happens once in `BootScene.create()`.
4. The same texture key always produces the same pixels, which keeps screenshot review stable.

### 2. Procedural Material Recipes

#### Barn Wall Wood (`TEXTURES.BARN_PLANK_TILE`)

Replace the current full-screen stripe texture with a repeatable tile, then render it as a `TileSprite` in `BarnScene`.

Recommended texture: `128x128`.

Algorithm:

1. Fill the whole tile with a dark reddish-brown base.
2. Split it into 5 horizontal planks, each `24px` tall with a `1px` seam.
3. For each plank:
   - Jitter the plank base color by `-8..+8` lightness so boards are visibly different.
   - Draw a `1px` top highlight line at `alpha 0.28` and a `2px` bottom shadow band at `alpha 0.22`.
   - Draw grain lines every `3px` on the Y axis. Each line is a 1px stroke whose Y offset is:

```ts
offset = Math.sin((x + phaseA) * 0.09) * 1.6
  + Math.sin((x + phaseB) * 0.23) * 0.8
  + walk;
```

   - `walk` is a clamped random walk updated every `6px` with delta `-0.4..0.4`.
   - Use darker grain strokes at `alpha 0.18` and every third line add a lighter companion stroke at `alpha 0.1`.
4. Add `0-2` knots per plank:
   - Ellipse radius `rx 4-9`, `ry 2-5`.
   - Fill with a darker oval.
   - Stroke 2-3 concentric rings.
   - For grain lines within `12px` of a knot center, push the line away using `bend = 5 * exp(-(d*d)/72)`.
5. Add `18-24` 1px pores/specks and `1-2` hairline cracks per plank.
6. Add a subtle edge-darkening pass on the left/right `3px` of the tile so repeats are less obvious.

This should be used for:

- Barn wall fill
- Trading Post wall fill
- Dark overlay panel wood, with a darker palette variant

#### Rafter Beam (`TEXTURES.RAFTER`)

Recommended texture: `160x42`.

Algorithm:

1. Reuse the wood generator with only 1 plank, oriented horizontally.
2. Increase grain contrast by `+25%`.
3. Add `6-8` vertical saw marks: 1px dark lines at `alpha 0.14`.
4. Add `3-4` nail heads as `2x2` dark squares with 1px highlight offset.

This keeps rafters looking like real beams instead of flat strips.

#### Straw Floor (`TEXTURES.FLOOR_STRAW_TILE`)

Replace the current grid-like highlight/vertical stripe floor with a proper loose-straw texture rendered as a `TileSprite`.

Recommended texture: `128x64`.

Algorithm:

1. Base fill with a warm straw midtone.
2. Add a top-to-bottom value ramp using 6 translucent horizontal bands:
   - top bands slightly cooler/darker
   - center warm gold
   - bottom richer orange-brown to ground the floor
3. Draw `180` stems:
   - length `6-18px`
   - width `1px`
   - angle `-32deg..24deg`
   - color bucket: `50%` midtone, `30%` highlight, `20%` shadow
   - alpha `0.35..0.65`
4. Draw `30` short broken chaff dashes:
   - length `2-4px`
   - random rotation
   - alpha `0.22..0.4`
5. Add `10` soft shadow patches using low-alpha ellipses to prevent the tile from reading as evenly noisy.
6. Add a bottom shadow strip `6px` tall at `alpha 0.12`.
7. Add a top dust haze strip `4px` tall at `alpha 0.08` so the seam with the wall feels less harsh.

Optional enhancement for Barn only:

- Add a separate `slot-floor-shadow` texture, a wide soft ellipse under the card grid and deck stack, so cards feel grounded before any card shadows are added.

#### Paper / Parchment (`TEXTURES.CARD_PARCHMENT`, `TEXTURES.CARD_NOISY`, `TEXTURES.CARD_LEGENDARY`, overlay inserts)

Current card textures are flat rounded rectangles with a single highlight. Replace them with a material generator.

Recommended base texture size: current logical card size `96x104`. Overlays use the same algorithm at their own sizes.

Algorithm:

1. Fill rounded rect with parchment base.
2. Add mottling with 4 passes of translucent blots:
   - pass counts: `12`, `18`, `10`, `8`
   - blot radius `3-12px`
   - use 2 darker browns and 1 lighter cream
   - alpha `0.03..0.08`
3. Add `40` paper fibers:
   - 1px lines
   - length `3-10px`
   - angle fully random
   - alpha `0.08..0.14`
   - color slightly lighter or darker than base
4. Add `80` 1px speckles at `alpha 0.03..0.06`.
5. Add edge treatment:
   - outer stroke 2px
   - inner top-left highlight 1px at `alpha 0.22`
   - inner bottom-right shadow 2px at `alpha 0.18`
6. Add a faint center-light pass so the art/sprite area feels slightly lifted.

Variant rules:

- `CARD_NOISY`: apply a desaturated terracotta wash at `alpha 0.18`, then darken the bottom quarter with a red-brown gradient band that still preserves the paper grain beneath it.
- `CARD_LEGENDARY`: use warmer paper, then overlay `48` gold flecks and a 2-layer border:
  - outer dark brass stroke
  - inner bright gold stroke
  - four corner ornaments made from 1px line motifs instead of plain corners

The same paper generator should also power:

- summary score strips
- info panel insert
- Trading Post header plaques

#### Painted Buttons (`TEXTURES.BUTTON_*`)

The current buttons are serviceable but still flat. They should read as painted wood or lacquered signboards.

Algorithm:

1. Generate a dark wood base with the wood recipe at button size.
2. Overlay a solid paint fill with `alpha 0.82..0.9` so some wood variation still reads underneath.
3. Add a 2px inset bevel:
   - top-left highlight
   - bottom-right shadow
4. Add `12-20` paint chips/specks near edges at low alpha so the surface does not feel perfectly digital.
5. Keep text contrast strong; beauty must not cost button legibility.

#### Deck Back (`TEXTURES.DECK_BACK`)

Current deck back is a flat purple card with two diagonal lines. It should become a decorative card back that reads like a special deck.

Recommended size: `64x82`.

Algorithm:

1. Deep indigo base.
2. Inner panel inset `5px` from edge with lighter indigo.
3. 1px cream border, then a second brass border `2px` inward.
4. Central diamond medallion:
   - one outer diamond stroke
   - one inner diamond fill
   - four cardinal dots
5. Corner ornaments:
   - mirrored L-shaped line motifs
   - each ornament `6x6px`
6. Add `24` tiny star flecks at `alpha 0.35..0.8`.

#### Farmhouse + Window Glow (`TEXTURES.FARMHOUSE`, `TEXTURES.WINDOW_GLOW`)

The farmhouse should stop being a box + triangle.

Recommended farmhouse texture size: existing `142x116`.

Algorithm:

1. Roof:
   - 5 rows of shingles
   - each shingle `10x4px`
   - alternate row offset by `5px`
   - 1px dark cap line on each row
2. Walls:
   - horizontal clapboards every `8px`
   - top highlight line and bottom shadow line
3. Door:
   - inset panel with 1px trim
   - handle dot on the right
4. Windows:
   - visible frame and muntins
   - window glass uses a cool base; warm glow comes from separate texture
5. Chimney:
   - bricks laid in `6x3px` units
   - stagger each row by `3px`

`WINDOW_GLOW` should become a soft layered light texture, not a flat rounded rect:

1. Use a `48x36` canvas.
2. Paint three nested rounded rectangles / ellipses:
   - inner bright amber at `alpha 0.75`
   - mid orange haze at `alpha 0.32`
   - outer warm bloom at `alpha 0.12`
3. Slightly offset the bloom upward so it looks like light escaping into the night air.

### 3. Typography and Ornament

Replace the current `monospace` text with a procedural bitmap font generated in `BootScene`.

Font plan:

1. Implement a 5x7 or 6x8 pixel glyph set in `src/rendering/bitmapFont.ts`.
2. Cover:
   - uppercase A-Z
   - lowercase a-z
   - digits 0-9
   - punctuation used by the UI (`:`, `!`, `?`, `+`, `-`, `/`, `,`, `.`, `'`, `(`, `)`)
3. Build a white atlas canvas with 1px glyph padding.
4. Register it as a bitmap font once at boot.
5. Replace scene text with `BitmapText` where practical, or at minimum use the atlas for headers, buttons, badges, and value text.

Hierarchy:

- Title: 4x scale
- Overlay header: 3x scale
- Button label / resource counts: 2x scale
- Card labels / chips: 1x or 2x depending on viewport

Additional polish:

- Use a 1px duplicated offset shadow text for important labels.
- Add divider rules and small iconography instead of relying only on text grouping.

### 4. Scene Composition, Layers, and Depth Bands

Introduce explicit depth constants in `src/config/constants.ts`.

Recommended depth map:

| Layer | Depth |
|------|------:|
| sky / far background | 0 |
| wall tile / Trading Post wall | 10 |
| rafters / trim / stall props | 20 |
| floor straw / ground shadows | 30 |
| farmhouse / deck stack / static props | 40 |
| slot backgrounds | 50 |
| slot flash / card shadows | 60 |
| card containers | 70 |
| legendary glow + shimmer particles | 80 |
| ambient dust | 90 |
| HUD + buttons | 100 |
| info panels / modal overlays | 200 |
| overlay celebration particles | 210 |
| fade/vignette overlays | 220 |

Barn composition changes:

1. Use `TileSprite` for wall and straw instead of stretching one full-screen image.
2. Add a vignette texture generated procedurally with a radial alpha gradient.
3. Add shadow ellipses under deck, farmhouse, slots, and active overlays.
4. Give each card a dedicated dark rounded-rect shadow image offset by `(+4, +5)`.

Trading Post composition changes:

1. Replace the plain rectangle background with a layered wall + counter/floor composition.
2. Use the same paper and wood systems so the game still feels cohesive.
3. Give shop cards their own grounding shadow and subtle shelf shadow.

### 5. Particles and Motion

Generate dedicated particle textures in `BootScene`:

- `FX_DUST`: 8x8 soft dusty mote
- `FX_SPARK`: 8x8 diamond/star spark
- `FX_CHAFF`: 10x4 straw fragment
- `FX_PUFF`: 12x12 clustered dust puff

Emitter presets:

| Effect | Texture | Trigger | Frequency / Burst | Lifespan | Motion | Alpha / Scale | Tint | Cap |
|------|------|------|------|------|------|------|------|------:|
| Barn ambient dust | `FX_DUST` | always on in Barn | `frequency: 320ms`, `quantity: 1` | `5000-9000ms` | `speedX -4..7`, `speedY -3..2` | `alpha 0.18->0`, `scale 0.55->0.12` | cream / straw / amber | 18 |
| Card landing puff | `FX_PUFF` + `FX_CHAFF` | card lands in slot | burst `8 puff + 14 chaff` | `280-420ms` | `angle 200..340`, `speed 20..95`, `gravityY 90` | `alpha 0.7->0`, `scale 0.7->0` | straw highlight / brown dust | 22 |
| Legendary shimmer | `FX_SPARK` | active on Legendary cards | `frequency: 160ms`, `quantity: 1` | `600-1000ms` | `speed 4..14`, emit from card edge zone | `alpha 0.95->0`, `scale 0.45->0` | pale gold / bright gold / cream | 10 per card |
| Warning sparks | `FX_SPARK` | while warning state active | `frequency: 90ms`, `quantity: 2` | `260-520ms` | `angle 230..310`, `speed 30..110`, `gravityY 160` | `alpha 0.8->0`, `scale 0.5->0` | amber / orange / bust red | 16 |
| Bust burst | `FX_SPARK` + `FX_PUFF` | on bust overlay reveal | burst `28 sparks + 10 dust` | `300-650ms` | outward radial, `speed 70..170`, `gravityY 220` | `alpha 0.9->0`, `scale 0.8->0` | orange / red / pale ash | 38 |
| Summary celebration | `FX_SPARK` | summary overlay open | burst `36` then `frequency: 240ms` for 1.2s | `900-1300ms` | `speedX -60..60`, `speedY -180..-80`, `gravityY 120` | `alpha 0.9->0`, `scale 0.6->0.1` | gold / parchment / dusty rose | 36 |

Motion timings:

| Motion | Timing | Notes |
|------|------:|------|
| scene fade out / in | `200ms / 200ms` | use camera fade between Barn and Trading Post |
| card flip to face-up | `110ms` | animate `scaleX 0.15 -> 1` while moving |
| card landing bounce | `180ms` | `Back.easeOut`, slight overshoot on Y |
| slot flash | `140ms` | white rounded rect `alpha 0.45 -> 0` |
| stat pop | `180ms` | `scale 1 -> 1.28 -> 1`, color flash once |
| button press in | `70ms` | `scale 1 -> 0.97`, `y + 2` |
| button release out | `110ms` | `Back.easeOut`, return to origin |
| noise dot fill | `160ms` | `scale 0.4 -> 1.18 -> 1` |
| deck idle float | `3000ms` | `yoyo`, `y +/- 2` |
| window glow pulse | `1800ms` | alpha + slight scale breathing |
| legendary border pulse | `900ms` | stronger than current low-alpha stroke |

Micro-interaction requirements:

1. Cards on pointer-down scale to `1.03` and brighten slightly, then settle back on pointer-up.
2. Long-press radial indicator draws around the card edge over `300ms`.
3. Buttons compress on press even if the action is rejected due to disabled state.
4. Purchasable shop cards use a fast `1.0 -> 1.04 -> 1.0` pulse on successful purchase before refresh.

## Implementation (phased)

### Phase 1: Material System Foundation

Tasks:

1. Add palette ramps, depth constants, texture IDs, and new animation timings to `src/config/constants.ts`.
2. Create `src/rendering/proceduralTextures.ts` with:
   - seeded RNG helpers
   - wood generator
   - straw generator
   - paper generator
   - deck-back generator
   - farmhouse generator
   - vignette and shadow helpers
3. Create `src/rendering/bitmapFont.ts`.
4. Create `src/rendering/particlePresets.ts`.
5. Refactor `BootScene.ts` so complex materials use canvas textures and simple shapes remain on `Graphics`.

Acceptance for this phase:

1. `BootScene` generates all new textures without layout/scenes changing yet.
2. A debug scene or temporary output proves the materials tile correctly and deterministically.
3. Bundle size remains inside budget.

### Phase 2: Barn Environment Art Pass

Tasks:

1. Replace Barn wall and floor with `TileSprite` layers using the new plank/straw textures.
2. Add barn vignette, grounded shadows, and explicit depths.
3. Replace current farmhouse texture with the new architectural version.
4. Upgrade deck-back rendering and idle float.
5. Add ambient dust emitter and warning spark emitter.
6. Update the existing window glow tween to use the new glow texture plus scale pulse.

Acceptance for this phase:

1. Empty Barn screenshots already look materially richer before card interaction work lands.
2. Warning state is visually distinct without relying only on text or the current alpha pulse.

### Phase 3: Card, HUD, and Overlay Art Pass

Tasks:

1. Replace card backgrounds with paper-texture variants and add dedicated card shadows.
2. Upgrade noisy stripe, ability strips, badges, and deck-back reveal.
3. Replace card/overlay/button text with bitmap font treatment.
4. Restyle info panel, bust overlay, summary overlay, and win overlay using dark wood + paper insert composition.
5. Add score-strip backgrounds, divider lines, and better spacing hierarchy.

Acceptance for this phase:

1. A static card screenshot shows paper grain, badge depth, and readable typography.
2. Overlays no longer read as black boxes with text pasted on top.

### Phase 4: Motion and Feedback Pass

Tasks:

1. Replace simple card reveal with flip + bounce + slot flash.
2. Add draw landing puff, stat pop, and noise-dot bounce.
3. Add long-press radial fill and pointer-down feedback on cards.
4. Add button compression/release on Barn and Trading Post buttons.
5. Add Legendary shimmer emitters attached to active Legendary cards.
6. Add camera fade transitions between Barn and Trading Post.

Acceptance for this phase:

1. Draw flow feels meaningfully different even with the same underlying game logic.
2. All new tweens are interrupt-safe with the existing `isAnimating` / deferred resize model.

### Phase 5: Trading Post Polish and Final Review

Tasks:

1. Replace the Trading Post solid background rectangle with layered wall/counter/floor art.
2. Add shelf shadows and premium card presentation to shop cards.
3. Add purchase feedback particles or a stronger purchase pulse.
4. Verify tabs, capacity button, and start-night CTA use the upgraded materials and font system.
5. Capture visual artifacts with `agent-browser` at:
   - `393x852`
   - `768x1024`
   - `1920x1080`
6. Capture at least these states:
   - Barn empty
   - Barn with 3 cards including 1 Legendary
   - warning state
   - night summary overlay
   - Trading Post

Acceptance for this phase:

1. Barn and Trading Post feel like intentionally related scenes with different moods.
2. Before/after screenshots show a dramatic change in materials, lighting, and motion.

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/config/constants.ts` | Modify | Add palette ramps, depth constants, texture IDs, particle IDs, and animation timings for the art pass |
| `src/rendering/proceduralTextures.ts` | Create | Deterministic material synthesis for wood, straw, paper, deck backs, farmhouse, shadows, vignette |
| `src/rendering/bitmapFont.ts` | Create | Procedural bitmap font atlas generation and registration helpers |
| `src/rendering/particlePresets.ts` | Create | Shared emitter presets and helper factories for Barn/Trading Post effects |
| `src/scenes/BootScene.ts` | Major rewrite | Switch from mostly flat `Graphics.generateTexture()` calls to layered canvas texture generation |
| `src/scenes/BarnScene.ts` | Major rewrite | Add material layers, depth bands, particles, richer overlays, card shadows, motion polish, scene fades |
| `src/scenes/TradingPostScene.ts` | Major rewrite | Replace flat background, upgrade shop cards/buttons/tabs, add transitions and purchase polish |
| `tests/e2e/visual-polish.spec.ts` | Create | Deterministic seeded screenshots and smoke coverage for key visual states |
| `tests/e2e/mobile-smoke.spec.ts` | Extend | Account for new transitions/tween timing where needed |
| `artifacts/visual/sprint-005-after/` | Create/update | Store reviewed screenshots for phone, tablet, and desktop |
| `docs/sprints/drafts/SPRINT-005-CODEX-DRAFT.md` | Create | This sprint plan |

Explicit non-goals:

1. No changes to `src/game/*`.
2. No new third-party libraries.
3. No external `.png`/`.jpg` UI assets.

## Definition of Done

1. Barn wall, rafter, straw floor, paper cards, deck back, farmhouse, overlays, and buttons all use textured procedural materials rather than flat fills.
2. All procedural textures are deterministic from stable seeds and produce identical screenshots across repeated boots.
3. Barn scene has ambient dust motes with a live-particle cap that does not visibly hurt performance on phone-sized viewports.
4. Card draw includes flip, bounce, slot flash, and landing puff.
5. Legendary cards have persistent shimmer particles and stronger border/glow treatment than non-Legendary cards.
6. Warning and bust states have distinct particle feedback and lighting emphasis.
7. Night summary and bust/win overlays use themed wood/paper composition, not plain black backgrounds.
8. The bitmap font replaces the current placeholder monospace look in primary UI surfaces.
9. Buttons in Barn and Trading Post have press/release motion and materially richer textures.
10. Camera fade transitions are present between Barn and Trading Post and do not break scene state.
11. Depth layering prevents particles, shadows, cards, HUD, and overlays from visually fighting each other.
12. `agent-browser` screenshots at phone/tablet/desktop show a dramatic qualitative improvement over Sprint 004.
13. `npm run typecheck`, `npm run test`, and relevant e2e smoke tests pass.
14. App chunk remains below the existing budget threshold.
15. `src/game/*` remains untouched.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The new texture generation code turns `BootScene` into an unmaintainable blob | Medium | High | Move texture recipes into `src/rendering/proceduralTextures.ts` immediately instead of extending the existing 295-line `BootScene.ts` inline |
| Procedural textures look noisy rather than beautiful | Medium | High | Use layered low-frequency variation first, then add detail passes. Review actual screenshots after each material, not just live runtime feel |
| Particle counts hurt mobile performance | Medium | High | Cap live particles aggressively, use small textures, and keep emitters one-shot where possible |
| Bitmap font scope expands because of missing glyphs or wrapping issues | Medium | Medium | Support the full UI glyph set up front and keep a fallback path for edge-case body copy during the transition |
| Tile repetition becomes obvious on desktop | Medium | Medium | Use asymmetric edge darkening, large enough tiles, and overlay trim/shadow layers that break repetition |
| Visual changes regress clarity on small viewports | Medium | High | Keep contrast budgets explicit and verify at `393x852` before broadening the art treatment |
| Scene transition/tween timing conflicts with current animation sequencing | Medium | Medium | Integrate transitions through the existing animation pipeline and keep `isAnimating` as the authoritative gate |
| Manual screenshot review becomes subjective | Medium | Medium | Define named capture states and compare against Sprint 004 artifacts side by side |

## Security

1. This sprint is client-side only and introduces no new network paths, secrets, auth flows, or storage surfaces.
2. Deterministic procedural generation uses local constants only; no external content is executed or fetched.
3. `agent-browser` remains a local verification tool, not a runtime dependency.
4. No user-controlled text is being promoted into any new HTML surface; changes remain inside Phaser rendering and existing DOM attributes.

## Dependencies

1. Phaser 3.80.x built-in support for canvas textures, particle emitters, tweens, and camera fades.
2. Existing Vite/TypeScript toolchain only; no new npm packages.
3. Existing `animals` atlas remains the only non-procedural art asset.
4. `agent-browser` for manual screenshot capture during review.
5. Current responsive layout work from Sprint 004, especially `Scale.RESIZE` and scene reflow support.

## Open Questions

1. Should the bitmap font support lowercase everywhere, or should most UI move to uppercase labels to keep the atlas smaller and the look more deliberate?
2. Should the Trading Post mood stay in the same sunset palette family as the Barn, or shift cooler so scene transitions feel more distinct?
3. Should Legendary shimmer remain always-on for every visible Legendary card, or throttle to the most recently added Legendary on lower-end devices?
4. Is the preferred visual direction for overlays "dark wood with paper inset" across all overlays, or should bust/win overlays have unique compositions?
5. Do we want an explicit visual regression checklist in-repo, or are screenshot artifacts plus human review enough for this sprint?
