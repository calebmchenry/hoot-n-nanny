# Codex Critique of Claude & Gemini Drafts

## Claude Draft

### Strengths
- Clear root cause analysis with specific line numbers
- Texture at 170x200 covers the full height clamp range — safe against upscaling
- Emoji formula `min(w,h) * 0.38 / 128` is well-reasoned with geometric justification (emoji center at 30%, name at 50%, leaves room)
- Button feedback includes both tint AND translate with tweened transitions — polished feel

### Weaknesses
- **170x200 texture wastes vertical space**: Most shop cards are 130-150px tall due to the 130/170 aspect ratio. Generating at 200px height means most of the texture is downscaled by 25-35%. Not a real problem (downscaling is fine), but 176x200 or even 170x160 would be tighter.
- **Doesn't address other scale tweens**: `handleMobileCardTap` (line 232) and `onPurchase` (line 705) both use `scaleX`/`scaleY` on containers. If the button press scale is a bug, these are too.
- **Corner radius question left open**: Raises it in Open Questions but doesn't propose a default. At 170x200, the 10px radius will appear proportionally smaller than at 96x104. Worth noting that this actually makes it look *more* like a card (physical cards have tight corner radii relative to their size).

### Gaps
- Missing the mobile card-tap and purchase feedback fixes (Gemini catches these)

## Gemini Draft

### Strengths
- **Most thorough fix scope**: Addresses buttons, mobile card tap, AND purchase feedback — all three places where scale tweens cause visual issues
- **Instant tint+translate is the safest approach**: Zero chance of tween-related bugs
- Good explanation of why Nine-Slice was rejected
- Clean code examples with inline comments

### Weaknesses
- **Texture at 170x130 will upscale on tall cards**: The layout clamp allows cards up to 200px tall. If a viewport produces cards at 180px height, the 130px texture gets upscaled by 38%. This partially reproduces the original bug. Should use 200 for height.
- **Instant feedback lacks polish**: On a 60fps display, snapping between states without any easing feels abrupt. Even 60ms of `Quad.Out` makes the transition imperceptible but smooth. The Gemini draft removes all tweens to avoid the problem, but the problem was specifically `scaleX`/`scaleY` — position tweens are perfectly safe.
- **Alpha blink for purchase is less intuitive than other feedback**: A card going half-transparent on purchase could be confused with "greyed out" / "unavailable". A brief y-bounce (translate only, no scale) would be more immediately readable as "I bought this."
- **`CARD_PARCHMENT_SHOP` naming vs `SHOP_CARD_PARCHMENT`**: The naming convention differs from Claude/Codex. `SHOP_CARD_*` groups all shop keys together alphabetically in the TEXTURES object. `CARD_*_SHOP` puts them near the existing `CARD_*` keys. Either works but the team should be consistent.

### Gaps
- The `onComplete` guard for destroyed containers in the purchase alpha tween is mentioned as a risk but not shown in the code
