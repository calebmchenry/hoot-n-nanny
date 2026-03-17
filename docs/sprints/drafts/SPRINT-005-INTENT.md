# Sprint 005 Intent — Make the Game Beautiful

## Seed Prompt (from user)

> This game is ugly. And I mean ugly. Make it beautiful. And don't come back
> until you know how to make it beautiful. Use agent-browser to make sure it
> is beautiful.

## Orientation Summary

- **Current visual state**: All visuals are procedurally-generated rectangles
  drawn by BootScene at runtime. Barn planks are horizontal/vertical stripes.
  Farmhouse is dark blue-gray boxes + triangle. Cards are flat rounded rects.
  Overlays are plain black with white text. Monospace font everywhere.
  Screenshots in `artifacts/visual/sprint-004-before/`.
- **Sprint 004 just shipped**: Responsive layout (Scale.RESIZE). The game now
  fills any viewport. Layout functions accept `(cw, ch)`. All positioning is
  proportional. This sprint builds on that foundation.
- **Asset inventory**: One sprite sheet (`animals.png`, 352x32, 11 animals at
  32x32). Everything else is runtime-generated via Phaser Graphics API in
  BootScene.ts (294 lines). 32+ generated textures.
- **Key constraint**: App chunk must stay under 100KB gzipped (currently 21KB).
  No external art assets. No new npm dependencies. No game logic changes
  (`src/game/*` untouched). Phaser 3.80.x, TypeScript strict, pixelArt: true.
- **Verification**: agent-browser v0.20.14 is installed. Real CLI commands:
  `agent-browser open URL`, `agent-browser set viewport W H`,
  `agent-browser wait --fn "expr"`, `agent-browser screenshot path.png`,
  `agent-browser close`.

## What This Sprint Must Deliver

### 1. Rich Procedural Textures
- Barn planks with wood grain variation, knot holes, highlight edges
- Detailed straw floor with scattered diagonal strokes, shadow depth
- Card backgrounds with paper grain texture, inner shadows
- Farmhouse with architectural detail: shingles, door, chimney, window panes
- Deck card-back with decorative pattern

### 2. Typography Upgrade
- Pixel bitmap font replacing monospace everywhere
- Proper font size hierarchy (titles, values, labels, chips)
- Crisp rendering at all viewport sizes
- Must stay under budget (~10-30KB for bitmap font atlas)

### 3. Particle Effects
- Ambient dust motes floating in barn scene
- Card draw puff (straw-colored particles on landing)
- Legendary card shimmer (gold sparkles, perpetual)
- Bust/warning sparks (red/orange particles)
- Night summary celebration (gold particles upward)

### 4. Animation Juice
- Card draw: flip effect (scaleX 0→1) + bounce landing (Back.easeOut)
- Button press: scale to 0.95 + Y offset on press, spring back on release
- Resource number changes: pop scale 1→1.3→1 + color flash
- Noise dot fill: scale 0→1 with bounce ease
- Slot occupation: brief white flash on card landing

### 5. Scene Transitions
- Camera fadeOut/fadeIn between BarnScene and TradingPostScene
- Smooth, professional feel (200ms each direction)

### 6. Visual Depth
- Drop shadows on cards (dark rounded rect offset behind)
- Drop shadows on buttons (already partially exists, enhance)
- Vignette overlay on barn scene (dark edges, transparent center)
- Proper depth layering (bg → environment → slots → cards → UI → particles)

### 7. Color Palette Enhancement
- Warm transitional tones between sky and barn
- Sunset glow accent, dusty rose highlights
- Warm shadow tones for depth
- Deep plum night sky accent

### 8. Improved Overlays
- Themed backgrounds instead of plain black (dark barn wood texture, semi-transparent)
- Visual hierarchy with headers, dividers, icons
- Score lines with subtle background strips

### 9. Micro-Interactions
- Long press radial fill indicator (arc growing during 300ms hold)
- Card touch feedback (scale 1.05 + slight brighten on press)
- Slot occupation flash (white rect fade on card landing)

### 10. Idle Animations
- Farmhouse window glow pulse (sine wave alpha 0.3→0.8, 2s cycle)
- Deck stack subtle float (y ±2px, 3s cycle)
- Legendary card border glow pulse (already exists, enhance)

## Relevant Codebase Areas

| Area | Files | What Changes |
|------|-------|-------------|
| Texture generation | `src/scenes/BootScene.ts` (294 lines) | Major rewrite — all textures get detail |
| Barn rendering | `src/scenes/BarnScene.ts` (1820 lines) | Add particles, tweens, depth, vignette |
| Trading Post rendering | `src/scenes/TradingPostScene.ts` (498 lines) | Add particles, tweens, transitions |
| Constants/palette | `src/config/constants.ts` | New palette colors, animation timings |
| Layout helpers | `src/scenes/barnLayout.ts` | No changes expected |
| Layout helpers | `src/scenes/tradingPostLayout.ts` | No changes expected |
| Game logic | `src/game/*` | **UNTOUCHED** |
| Tests | `src/scenes/barnLayout.test.ts` | No changes expected |
| E2E tests | `tests/e2e/*` | May need timing adjustments for transitions |
| Visual verification | `artifacts/visual/` | Before/after screenshots via agent-browser |

## Constraints

- App chunk < 100KB gzipped (currently 21KB, ~79KB headroom)
- No external art assets (no .png sprites beyond existing animals.png)
- No new npm dependencies
- `src/game/*` completely untouched
- Existing tests must pass
- `pixelArt: true` + `roundPixels: true` in game config (nearest-neighbor)
- All coordinates in logical space (Sprint 004 convention)
- Touch input: minimum 44x44px tap targets
- Bitmap font atlas must be generated procedurally or embedded as base64
  (no external font file downloads at runtime)

## Success Criteria

1. Side-by-side before/after screenshots show dramatic visual improvement
2. The barn scene feels warm, atmospheric, and inviting
3. Card interactions feel satisfying (juice, particles, feedback)
4. Text is crisp and readable with consistent hierarchy
5. Overlays have visual design, not just black rectangles
6. Scene transitions are smooth
7. Idle state has subtle life (floating, glowing, dust)
8. All existing tests pass
9. CI green, bundle budget met
10. agent-browser screenshots prove quality at phone, tablet, desktop viewports

## Verification Strategy

Use agent-browser to capture before/after screenshots at 3 viewports:
```bash
agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
agent-browser set viewport 393 852
agent-browser wait --fn "window.__GAME_READY__ === true"
agent-browser screenshot artifacts/visual/sprint-005-after/phone-portrait.png
agent-browser set viewport 1920 1080
agent-browser screenshot artifacts/visual/sprint-005-after/desktop.png
agent-browser close
```

Compare with `artifacts/visual/sprint-004-before/` screenshots.

## Uncertainty Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| Correctness | Low | Phaser APIs for particles, tweens, graphics are well-documented |
| Scope | High | 10 visual improvement categories is ambitious. May need to prioritize. |
| Architecture | Low | Extends existing BootScene texture gen + scene rendering patterns |

## Open Questions

1. Should we use a bitmap font generated at runtime (Phaser's
   `generateTexture` for each glyph) or embed a pre-built bitmap font atlas?
2. How aggressive should the vignette be? Subtle atmospheric or noticeable?
3. Should particles be WebGL-only or have a Canvas fallback?
4. What's the priority order if we can't fit all 10 categories?
5. Should the Trading Post get the same level of polish as the Barn scene?
