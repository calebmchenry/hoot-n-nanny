# Sprint 007: UI Polish and Ability Tooltips

## Overview

This is a small UI-only sprint. Keep gameplay and `src/game/*` untouched. The work is limited to scene/layout polish in Barn and Trading Post: stabilize the HUD, make shop cards larger, make emoji crisp, and add fast ability tooltips.

## Plan

### 1. Stable Barn HUD

- Split `BarnScene.applyLayout()` into viewport-stable HUD placement and capacity-dependent barn layout.
- Keep slots, farmhouse, and other board elements responsive to capacity, but make the resource banner, noise meter, deck stack, and action bar depend only on canvas size or only update on resize.
- Preserve existing overlay resizing so the long-press info panel and other full overlays still fit the viewport correctly.

### 2. Bigger Trading Post Cards

- Rework `src/scenes/tradingPostLayout.ts` so the grid prioritizes readable cards over density.
- Use a roomier 2-column layout for normal portrait play and reclaim more vertical space between tabs, grid, and bottom buttons.
- Keep `TradingPostScene.layoutShopCard()` out of compact mode on phone-sized layouts so emoji, name, cost, gains, ability label, and stock all remain visible.

### 3. Crisp Emoji

- In `src/scenes/BootScene.ts`, keep the existing emoji map and fallback path, but generate higher-resolution emoji textures and switch filtering away from `LINEAR` to `NEAREST`.
- The result should look sharp in Barn cards, Trading Post cards, and the existing Barn info panel.

### 4. Ability Tooltips

- Add a small shared tooltip panel that shows ability label, trigger, and description.
- Barn: keep short card tap reserved for manual abilities and long-press reserved for the full info panel. The quick tooltip should come from the ability chip or a small info hotspot, with optional `pointerover` support on desktop.
- Trading Post: keep card tap reserved for purchase. Show the same tooltip from the ability label or info hotspot, with optional desktop hover, so players can inspect before buying.
- Animals with `ability.kind === 'none'` should not show a tooltip.

## Expected Touch Points

- `src/scenes/BarnScene.ts`
- `src/scenes/barnLayout.ts`
- `src/scenes/TradingPostScene.ts`
- `src/scenes/tradingPostLayout.ts`
- `src/scenes/BootScene.ts`
- Optional shared scene helper if the tooltip implementation is reused across both scenes

## Acceptance

1. Barn HUD elements no longer jump during normal gameplay updates; they only move on actual resize.
2. Trading Post cards are visibly larger and no longer hide ability labels on standard phone portrait layouts.
3. Animal emoji render sharply instead of looking blurred.
4. Players can inspect abilities quickly in both Barn and Trading Post without breaking manual-ability taps or purchase taps.
5. `npm run typecheck`, `npm run test`, and `npm run build` pass.
