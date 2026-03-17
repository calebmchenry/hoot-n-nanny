# Sprint 004 Intent — Responsive Layout & Visual Polish

## Seed Prompt (from user)

> We have some responsiveness issues. When running on a computer the game should
> take up the whole browser. When on a phone it should resize appropriately.
> While still handling landscape on the phone. There is also quite a bit of
> clipping and overlap of images/text. Lets fix that. Use
> https://github.com/vercel-labs/agent-browser to prove all these things are
> working correctly.

## Orientation Summary

- **Current scaling**: Phaser Scale.FIT + CENTER_BOTH on fixed 390x844 logical
  canvas. On desktop/landscape this creates massive black pillarboxing — the
  game floats as a small portrait rectangle in the middle of the browser.
- **Sprint 003 added density**: 96x104 cards, info panel (y=556, h=182),
  ability UI overlays, paginated Trading Post tabs, Legendary glow effects.
  These crowd the 390x844 space and cause text/image overlap at various
  capacities (7-8 slots especially).
- **No landscape mode**: Game is portrait-only. On phone landscape, it just
  shows a tiny pillarboxed version.
- **Clipping issues**: Resource banners, noise meter, deck counter, action bar
  buttons, and card text overlap at higher barn capacities. Info panel overlaps
  action bar area.
- **Verification gap**: No automated visual regression testing. Playwright
  only tests 375x667 portrait. No desktop, tablet, or landscape viewport tests.
- **agent-browser**: User wants to use Vercel Labs' agent-browser
  (https://github.com/vercel-labs/agent-browser) for visual verification across
  viewports.

## What This Sprint Must Deliver

### 1. Desktop Responsiveness
- Game fills the browser window on desktop (no massive black bars)
- On wide screens, the game should scale up while maintaining aspect ratio
- Consider: should the game stretch to fill, or cap at a maximum logical width?

### 2. Phone Responsiveness
- Portrait: game fills the screen properly on various phone sizes (iPhone SE
  through iPhone Pro Max, Android equivalent)
- Landscape: game should be usable — either rotate the layout or show a
  "rotate your device" prompt

### 3. Fix Clipping & Overlap
- Audit all layout positions for overlap at all barn capacities (5-8)
- Fix text truncation on cards, resource banners, buttons
- Ensure info panel doesn't overlap interactive elements
- Test at different viewport sizes

### 4. Visual Verification with agent-browser
- Set up agent-browser for automated screenshot capture
- Capture screenshots at multiple viewports:
  - iPhone SE (375x667)
  - iPhone 14 Pro (393x852)
  - iPad (768x1024)
  - Desktop (1920x1080)
  - Phone landscape (667x375)
- Prove no clipping/overlap in screenshots

## Relevant Codebase Areas

| Area | Files | What Changes |
|------|-------|-------------|
| Game config | `src/config/game.ts` | Scale mode, possibly dynamic resolution |
| HTML/CSS | `index.html` | Container sizing, viewport handling |
| Layout constants | `src/config/constants.ts` | Canvas dimensions, slot/panel positions |
| Barn layout | `src/scenes/barnLayout.ts` | Dynamic positioning for different sizes |
| Trading Post layout | `src/scenes/tradingPostLayout.ts` | Grid positions |
| BarnScene | `src/scenes/BarnScene.ts` | Text sizing, card rendering, overlays |
| TradingPostScene | `src/scenes/TradingPostScene.ts` | Shop card rendering |
| BootScene | `src/scenes/BootScene.ts` | Generated texture sizes |
| Layout tests | `src/scenes/barnLayout.test.ts` | Viewport-aware assertions |
| E2E tests | `tests/e2e/` | Multi-viewport testing |
| Playwright config | `playwright.config.ts` | Add viewport profiles |

## Constraints

- Phaser 3.80.x, TypeScript strict, Vite 5.x — no new npm dependencies
- App chunk must stay under 100KB gzipped
- All game logic in `src/game/` untouched — this is purely visual/layout
- Existing tests must pass
- Touch input: minimum 44x44px tap targets at all viewport sizes
- CLAUDE.md: "All coordinates are in logical space — never use window
  dimensions in scene code"

## Success Criteria

1. Game fills desktop browser with no excessive black bars
2. Game fills phone screen in portrait with proper safe-area handling
3. Landscape shows either a rotated layout or a tasteful "rotate" prompt
4. No text/image clipping or overlap at any barn capacity (5-8)
5. agent-browser screenshots prove all of the above across 5+ viewport sizes
6. All existing tests pass
7. CI green, bundle budget met

## Verification Strategy

Use agent-browser (https://github.com/vercel-labs/agent-browser) to:
1. Launch dev server
2. Open game at multiple viewport sizes
3. Capture screenshots at key states (barn with cards, Trading Post, info panel)
4. Verify no visual regressions

## Uncertainty Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| Correctness | Low | Well-understood Phaser scaling APIs |
| Scope | Medium | Clipping audit could uncover many small issues |
| Architecture | Low | Extends existing Phaser Scale + layout patterns |

## Open Questions

1. Should desktop use a wider logical resolution (e.g., 430x932 for modern
   phones) or keep 390x844 and just scale it larger?
2. Should landscape show a "rotate your device" screen or attempt a landscape
   layout?
3. How should agent-browser be integrated — as a dev dependency, a CI step,
   or a manual verification tool?
4. Should the Trading Post be redesigned for wider viewports or just scaled?
