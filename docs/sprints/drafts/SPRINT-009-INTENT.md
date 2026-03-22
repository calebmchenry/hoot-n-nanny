# Sprint 009 — Intent Document

## Seed Prompt

The user reports: "I don't know how the app looks at all. Things aren't sized right. They don't look like cards. Buttons shrink and move around. A big button becomes two buttons." The goal is a comprehensive visual/UX polish sprint to make the app feel **polished and fun** — specifically making cards look and feel like real cards, stabilizing button behavior, and improving layout proportions across both scenes.

## Orientation Summary

- **Recent history**: Sprints 5–8 have all been visual polish (procedural textures, emoji glyphs, tooltip system, shop card textures). Despite four polish sprints, fundamental sizing and proportion issues persist.
- **Current state**: Barn scene has 96x104px card slots with 128x128 emoji that overflow. Trading Post has a 2-column grid of tiny data-packed cells. Buttons morph from 1 wide button to 2 narrow buttons. Dead space between card area and action bar.
- **Validator tool**: The `hoot-n-nanny-validator` project validates against 5 quality keywords: **Beautiful**, **Ergonomic**, **Easy to Understand**, **Fun to Play**, **Clever Strategies Are Rewarded**. It uses Playwright to bot-play the game and capture screenshots. It can be used to verify this sprint's visual changes.
- **Key constraint**: All textures are procedurally generated — no image assets. 390x844 logical canvas. Phaser 3.80.

## Observed Issues (from live screenshots)

### Barn Scene
1. **Card slots are too small (96x104)** — cards occupy ~25% of screen width, leaving massive dead space. They don't read as "cards" — more like tiny tokens.
2. **Emoji overflow** — 128x128 emoji textures display at sizes that visibly overflow the 96x104 slot bounds, especially larger animals (pig, goat).
3. **Button metamorphosis** — The single "DRAW ANIMAL" button (350x56) splits into two "KEEP GOING" / "CALL IT A NIGHT" buttons (~168px each). This causes visual instability — the action area completely rearranges mid-turn.
4. **Dead space** — Large gap between card grid (ending ~y=330) and action bar (~y=720). The farmhouse fills some of this but it's decorative, not interactive.
5. **Card labels are illegible** — Animal names below cards are tiny pixel-font text, hard to read.
6. **Overlay bleed** — Night summary overlay doesn't fully occlude underlying buttons.

### Trading Post
7. **Shop cards are cramped data cells** — 2-column grid with ~170x130 cells packing emoji, name, cost, stats, ability, and stock count. Nothing reads as a "card."
8. **Information overload** — Each shop "card" has 6+ data points visible simultaneously in a tiny space.
9. **No visual hierarchy** — All information at the same size/weight. Cost, name, and stats compete for attention.

### Cross-cutting
10. **No card-like proportions** — Neither barn cards nor shop cards have the visual language of cards (borders, shadows, clear face, consistent aspect ratio).
11. **Button stability** — Buttons change count, size, and position across game states without visual continuity.
12. **Font scaling** — Pixel bitmap font doesn't scale well across different information densities.

## Relevant Codebase Areas

| File | Role |
|------|------|
| `src/config/constants.ts` | All layout dimensions, palette, animation timings |
| `src/scenes/barnLayout.ts` | Barn slot grid, action bar, HUD positioning |
| `src/scenes/tradingPostLayout.ts` | Shop grid, button positioning |
| `src/scenes/BarnScene.ts` | Barn scene lifecycle, card rendering, button creation |
| `src/scenes/TradingPostScene.ts` | Shop scene lifecycle, card rendering |
| `src/rendering/proceduralTextures.ts` | All texture generation (cards, buttons, backgrounds) |
| `src/scenes/BootScene.ts` | Texture generation at boot, emoji rendering |

## Constraints

- **No external images** — all textures must remain procedurally generated
- **390x844 logical canvas** — Phaser.Scale.FIT, pillarboxing on desktop
- **Touch-first** — minimum 44x44 tap targets, pointerdown only
- **Bundle budget** — app chunk < 100KB gzipped
- **Backward compatibility** — game logic in `src/game/` must not be touched
- **Procedural texture cost** — complex textures are expensive; generate once at boot, not on resize

## Success Criteria

1. Cards look and feel like cards — clear borders, shadows, readable proportions, consistent aspect ratio
2. Barn card slots are significantly larger, filling more of the available screen
3. Emoji are properly contained within card bounds at all viewport sizes
4. Button area is visually stable — no jarring layout shifts when transitioning between 1-button and 2-button states
5. Trading post cards are scannable — clear visual hierarchy with name, cost, and ability at a glance
6. Night summary overlay fully occludes underlying UI
7. No regressions in touch target sizes (44px minimum)
8. Passes the validator's "Beautiful" and "Ergonomic" keyword checks

## Verification Strategy

1. **Visual screenshots** — Playwright screenshots at each game state (empty barn, mid-draw, full barn, night summary, trading post animals tab, legendary tab) compared before/after
2. **Validator bot** — Run the hoot-n-nanny-validator bot and verify screenshots show improved card rendering
3. **Manual review** — Dev server at 390x844 viewport
4. **Regression** — `npm run ci` passes (typecheck, lint, test, e2e, bundle budget)

## Uncertainty Assessment

| Factor | Level | Rationale |
|--------|-------|-----------|
| **Correctness** | Low | Visual changes only, no game logic |
| **Scope** | Medium | Touches layout across both scenes, textures, and button behavior — risk of scope creep |
| **Architecture** | Medium | May need to rethink card rendering approach (current slot-based system vs. a proper card component pattern) |

## Open Questions

1. Should the barn use a stacked/overlapping card layout (like a hand of cards) instead of a grid of slots?
2. Should the dual-button transition be animated, or should we use a single button that changes label?
3. What card aspect ratio feels right — poker-style (2.5:3.5), tarot-style (2.75:4.75), or something custom?
4. Should the trading post switch from 2-column grid to a scrollable single-column list for better readability?
5. How much of the farmhouse decoration should be kept vs. sacrificed for larger cards?
