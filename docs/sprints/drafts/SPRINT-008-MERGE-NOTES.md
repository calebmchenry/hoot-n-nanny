# Sprint 008 Merge Notes

## Draft Comparison

### Core approach (all three agreed)
- Generate shop-specific card textures at a larger size under new TEXTURES keys
- Cap emoji sprite scale proportionally to card dimensions
- Remove scaleX/scaleY from button press feedback

### Claude Draft Strengths (adopted)
- Texture at 170x200 (covers full height clamp range) — confirmed by user
- Emoji formula `min(w,h) * 0.38 / 128` — balanced size
- Tweened translate + tint feedback — polished feel, confirmed by user
- Corner radius scaling question raised — addressed in final

### Codex Draft Strengths (adopted)
- `LAYOUT.SHOP_CARD` as a separate namespace object (cleaner than `LAYOUT.SHOP.CARD_TEX_*`)
- `PRESS_OFFSET` as a named constant

### Gemini Draft Strengths (adopted)
- Comprehensive scope: also fixes `handleMobileCardTap` and `onPurchase` scale tweens — confirmed by user
- Alpha blink replaced with translate-based purchase feedback (more intuitive than alpha)
- Mobile card-tap preview uses tint flash instead of scale pulse

## Valid Critiques Accepted
- All critiques correctly identified that Claude/Codex missed the mobile card-tap and purchase scale tweens
- Codex emoji formula `min(w*0.5, h*0.3)` produces too-small emoji (39px vs 49px) — rejected in favor of Claude/Gemini's formula
- Gemini texture size (170x130) risks upscaling — rejected in favor of 170x200
- Gemini instant feedback rejected — user confirmed tweened approach

## Critiques Rejected
- "176x200 texture width" from Codex — 170 matches the grid width, 176 wastes 6px for no benefit
- "Alpha blink for purchase" from Gemini — while creative, a brief translate bounce is more intuitive than opacity change. Final uses translate yoyo.

## Interview Refinements
1. Tweened translate + tint for button feedback (not instant)
2. Fix ALL scale tweens (buttons, mobile card tap, purchase) — comprehensive scope
3. 170x200 texture size (max clamp, always downscale)
