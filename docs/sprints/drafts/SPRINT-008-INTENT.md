# Sprint 008 Intent: Card Shop Visual Polish

## Seed

In the card shop I want the cards to look like cards. The emojis also seem to be overflowing. The buttons are resizing on hover and clicking.

## Context

- **Phaser 3 card game** (Hoot 'n Nanny) — static site, procedurally generated textures, emoji-based animal sprites, pixel bitmap font. Logical canvas 390x844 portrait.
- **Sprint 007** (latest) added ability tooltips, bigger shop cards (2-column layout), crisper emoji (128px NEAREST), and stable HUD. The shop is functional but visually rough.
- **Trading Post scene** (`TradingPostScene.ts`) renders shop cards as `Container` objects with a background image, emoji sprite, name text, cost badge, mischief/hay labels, stock count, and optional ability label.
- **Three bugs reported**: (1) cards don't look like cards, (2) emoji overflow card bounds, (3) buttons visually resize on press/hover.

## Recent Sprint Context

- Sprint 006: replaced animal sprites with emoji glyphs (128px canvas, NEAREST filter)
- Sprint 007: enlarged shop cards (2-col forced, 80-200px height clamp, 130/170 aspect ratio), added tooltips, stabilized HUD

## Relevant Codebase Areas

| File | Role |
|------|------|
| `src/scenes/TradingPostScene.ts` | Shop scene — creates/layouts card views, button press feedback |
| `src/scenes/tradingPostLayout.ts` | Shop grid positioning — card sizes, margins |
| `src/rendering/proceduralTextures.ts` | Generates card backgrounds at `SLOT.WIDTH x SLOT.HEIGHT` (96x104) |
| `src/scenes/BootScene.ts` | Generates emoji textures at 128x128 |
| `src/config/constants.ts` | `LAYOUT.SLOT`, `TEXTURES`, `PALETTE` constants |

## Root Cause Analysis

### 1. Cards don't look like cards
Card background textures (`CARD_PARCHMENT`, `CARD_NOISY`, `CARD_LEGENDARY`) are generated at 96x104px (barn slot size) via `generatePaperTexture()`. In the shop, `layoutShopCard()` calls `bg.setDisplaySize(pos.w, pos.h)` which stretches these small textures to ~170x130+px. The rounded corners, grain, and border details become blurry and distorted. The cards look like stretched rectangles, not crisp card shapes.

### 2. Emoji overflowing
In `layoutShopCard()`, sprite scale is `Math.max(1.4, Math.min(2.4, pos.h / 44))`. With 128px source textures, scale 2.4 produces ~307px display size — far larger than the card. The emoji spills over card edges. There's no clipping on the container.

### 3. Buttons resizing on press
`addButtonPressFeedback()` tweens `scaleX`/`scaleY` to 0.97 then back to 1.0 with `Back.Out` ease. But buttons use `setDisplaySize()` which internally sets scale based on texture-to-display ratio. The button textures are generated at 350x56, but displayed at various sizes. When the tween sets scale to 0.97, it's 0.97 of the *display-adjusted* scale, which visibly shrinks/grows the button. The `Back.Out` ease overshoots to ~1.05, making it even more noticeable.

## Constraints

- Must follow project conventions (CLAUDE.md)
- Card textures are procedurally generated — no external assets
- `src/game/*` must remain untouched
- Touch input only (no hover states per CLAUDE.md, though desktop hover for tooltips was added in Sprint 007)
- Minimum tap target 44x44px
- Bundle budget: app chunk < 100KB gzipped
- All coordinates in logical space (390x844)

## Success Criteria

1. Shop cards have crisp, properly-proportioned backgrounds with visible rounded corners, paper grain, and borders at their displayed size
2. Emoji sprites are fully contained within card bounds — no overflow
3. Buttons do not visually change size on press — feedback is position-only (translate down) or tint-only
4. `npm run ci` passes
5. No visual regressions in barn scene card rendering

## Verification Strategy

- **Visual inspection**: Run `npm run dev`, navigate to shop, verify cards look like proper cards with borders and texture
- **Emoji bounds**: Verify no emoji extends beyond card edges on both Animals and Legendary tabs
- **Button press**: Tap/click every button (tabs, capacity upgrade, start night) — no size change, only subtle position shift
- **Barn scene**: Verify barn cards still render correctly (they use the original 96x104 textures)
- **Resize**: Test portrait and landscape — card textures should remain crisp
- **Tests**: `npm run ci` passes

## Uncertainty Assessment

- Correctness uncertainty: **Low** — bugs are well-understood with clear root causes
- Scope uncertainty: **Low** — three specific visual bugs to fix
- Architecture uncertainty: **Low** — extends existing procedural texture system, no new patterns needed

## Open Questions

1. Should shop card textures be generated at a single larger size, or dynamically per-layout? (Tradeoff: memory vs. crispness at all sizes)
2. Should button press feedback be removed entirely or replaced with a translate-only effect?
3. Should the emoji be clipped to card bounds via a mask, or should the scale simply be reduced enough to fit?
