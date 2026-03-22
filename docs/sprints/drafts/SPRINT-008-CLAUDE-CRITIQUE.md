# Claude Critique of Codex & Gemini Drafts

## Codex Draft

### Strengths
- Thorough `setDisplaySize()` approach for emoji containment avoids the scale-confusion bug cleanly
- Good observation that 176x200 covers the maximum possible card size (accounts for the 200px height clamp)
- Clean separation: PRESS_OFFSET as a named constant
- Y-translate-only feedback is the most conservative fix — minimal risk of introducing new visual bugs

### Weaknesses
- **Emoji too small**: `min(w*0.5, h*0.3)` on a 170x130 card gives `min(85, 39) = 39px`. That's quite small for the primary visual element of a card. Claude/Gemini's `min(w,h)*0.38` gives ~49px — 25% larger and more balanced.
- **No tint on button press**: Y-translate alone at 3px may feel too subtle, especially on a small phone screen where 3px is barely perceptible. At least one visual cue (tint) should complement the positional shift.
- **Doesn't address `handleMobileCardTap` or `onPurchase` scale tweens**: These also use `scaleX`/`scaleY` on card containers. If the button scale bug matters, these should be fixed too for consistency. Gemini draft catches this.

### Gaps
- No mention of whether the `generatePaperTexture` corner radius (hardcoded 10px) should scale for the larger shop textures
- Missing the mobile card-tap and purchase feedback scale tweens

## Gemini Draft

### Strengths
- **Most comprehensive scope**: Catches and fixes `handleMobileCardTap` scale tween AND `onPurchase` scale tween — both use the same problematic scale pattern
- **Instant feedback** (no tweens) is the simplest possible fix. Zero timing bugs, zero overshoot, zero tween conflicts. Very robust.
- **Alpha blink for purchase** is a nice creative alternative that clearly signals "something happened"
- Good analysis of why Nine-Slice doesn't work for these textured surfaces
- **Texture at 170x130** (reference card size, not max) is more memory-efficient than 176x200

### Weaknesses
- **Texture at 170x130 could cause upscaling**: The card height clamp goes up to 200px. On larger viewports, cards could be taller than 130px, which means the texture would be upscaled again. The Codex/Claude approach of generating at the max clamp size (200px) is safer.
- **Instant feedback (no tweens) may feel jarring**: Snapping from pressed to released with zero animation can feel mechanical. A 60-100ms tween on release provides a smoother feel. The tween duration is so short that overshoot is not an issue with `Quad.Out`.
- **`clearTint()` racing with purchase alpha tween**: The draft acknowledges this risk but doesn't fully resolve it. If `onPurchase` triggers while tint is still applied, the card alpha tween happens on a tinted card. This is minor since `refreshDisplay()` destroys cards.

### Gaps
- The `SHOP_CARD.TEX_HEIGHT: 130` should be 200 to match the maximum clamp value, not the reference card size
- No discussion of corner radius scaling in the paper texture
