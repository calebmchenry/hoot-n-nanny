# Sprint 009 — Gemini Draft

## Overview
This sprint focuses on a comprehensive visual and UX polish of *Hoot 'n Nanny*. The core objective is to replace the cramped, disjointed UI with a layout that feels ergonomic, tactile, and game-like. We will redesign the cards to use standard poker-style aspect ratios, overhaul the Trading Post to use a highly readable single-column list, and stabilize the action bar to prevent jarring UI shifts during gameplay. 

## Use Cases
1. **Card Legibility:** As a player, I want cards to look like real playing cards (with clear borders, aspect ratios, and shadows) and for the animal emoji to be fully contained within the card boundaries.
2. **Stable Gameplay UI:** As a player, I want the action buttons to remain in a consistent location and size so I don't misclick when the game state changes.
3. **Scannable Shop:** As a player, I want to quickly evaluate animals in the Trading Post without squinting at tiny text packed into a small grid cell.
4. **Overlay Clarity:** As a player, I want the end-of-night summary to clearly block out the background so I know I must acknowledge it before continuing.

## Architecture & Design Decisions

### 1. Card Proportions & Rendering
- **Dimensions:** Change barn card slots from `96x104` to a standard poker ratio of `100x140` (1:1.4). 
- **Emoji Scaling:** Constrain emoji sprites dynamically to fit within `Math.min(cardWidth, cardHeight) * 0.45` so they never overflow the card bounds, even for large emojis like the pig or goat.
- **Typography:** Increase the font size of card names and resource badges, anchoring them proportionally to the new card dimensions.

### 2. Action Bar Stability
- **Fixed Layout:** Replace the metamorphosing button approach with a fixed two-button layout (`primary` and `secondary`) in `barnLayout.ts`. 
- **State Handling:** When only "DRAW ANIMAL" is valid (e.g., the very first draw), the "CALL IT A NIGHT" button will still physically exist but be fully transparent (`alpha = 0`) and un-interactive. This guarantees the "DRAW ANIMAL" button never changes size or position mid-turn.

### 3. Trading Post Overhaul
- **Single-Column List:** Change `SHOP.GRID_COLUMNS` from 2 to 1.
- **Card Format:** Shop cards will become horizontal strips (e.g., `350x96`) instead of vertical rectangles. This allows a clear left-to-right visual hierarchy: Emoji → Name & Stats → Ability Text → Cost & Buy Button.

### 4. Overlays & Z-Depth
- Add an explicit opaque or semi-transparent background block (`OVERLAY_BG` with alpha `0.85`) behind the Night Summary overlay to fully occlude the barn and action buttons underneath.

## Implementation (Phased)

### Phase 1: Constants & Textures
1. **`src/config/constants.ts`:**
   - Update `LAYOUT.SLOT.WIDTH = 100`, `LAYOUT.SLOT.HEIGHT = 140`.
   - Update `LAYOUT.SHOP_CARD.TEX_WIDTH = 350`, `LAYOUT.SHOP_CARD.TEX_HEIGHT = 96`.
   - Update `LAYOUT.SHOP.GRID_COLUMNS = 1`.
2. **`src/rendering/proceduralTextures.ts`:**
   - Ensure `generatePaperTexture` uses the new dimensions. The rounded rect drawing will naturally adapt to the new aspect ratios.

### Phase 2: Barn Layout & Stability
1. **`src/scenes/barnLayout.ts`:**
   - Update `getActionBarPosition` to always return a dual-button layout bounding box, regardless of the `dualButtons` boolean argument, or adjust the logic so `primary` and `secondary` maintain a consistent size if `dualButtons` is refactored.
   - Adjust `getFarmhouseRect` and `getSlotLayout` to ensure the 3 rows of `100x140` cards fit between the resource banner and the action bar without overlapping the farmhouse.
2. **`src/scenes/BarnScene.ts`:**
   - Update button creation logic: render both buttons initially. If `hasDoneFirstDraw` is false, hide the secondary button via `setAlpha(0)` and disable input, rather than destroying and recreating the primary button at a different size.
   - Update `renderCardInSlot`: Scale the emoji sprite based on the new slot height to prevent overflow (`sprite.setScale(Math.min(slot.w, slot.h) * 0.45 / 128)`). Increase card label font sizes.
   - Ensure the `summaryOverlay` adds a full-screen interaction blocker background.

### Phase 3: Trading Post Readability
1. **`src/scenes/tradingPostLayout.ts`:**
   - Rewrite `getShopGridPositions` to stack items vertically (1 column) with full width (`cw - margin * 2`).
2. **`src/scenes/TradingPostScene.ts`:**
   - Update `layoutShopCard` to handle a horizontal card format. 
   - Position the emoji sprite on the left, the name and badges in the middle, and the cost/stock on the right edge. 
   - Increase text sizes significantly for better readability.

## Files Summary

| File | Proposed Changes |
|------|------------------|
| `src/config/constants.ts` | Update `LAYOUT` dimensions for slots and shop. |
| `src/rendering/proceduralTextures.ts` | Adapt procedurally generated textures for new aspect ratios if necessary. |
| `src/scenes/barnLayout.ts` | Stabilize action bar sizes; tune grid spacing for larger cards. |
| `src/scenes/BarnScene.ts` | Emoji scaling, stable button lifecycle, overlay occlusion background, font scaling. |
| `src/scenes/tradingPostLayout.ts` | Convert shop grid to 1 column. |
| `src/scenes/TradingPostScene.ts` | Implement horizontal shop card layout with clear visual hierarchy. |

## Definition of Done
- Barn cards display at a clear poker ratio (e.g., 100x140) and take up more screen space.
- Animal emojis do not overflow card boundaries under any viewport size.
- The "DRAW ANIMAL" button remains completely stable in size and position after the first draw.
- Trading Post uses a single-column list with horizontal cards that are easy to read.
- Night summary completely occludes the underlying gameplay buttons.
- All touch targets remain at least `44x44px`.

## Risks
- **Layout Overflow:** Increasing card sizes might cause overlap with the farmhouse or action bar on shorter viewports. Thoroughly test `barnLayout.ts` dynamic scaling logic.
- **Texture Generation Budget:** Changing `SHOP_CARD` to `350x96` means larger texture dimensions in memory. We must ensure this does not break WebGL limits or cause performance stuttering at Boot, though procedurally generating a few 350px textures is generally safe.

## Security
- No security implications. Purely visual layout and rendering adjustments.

## Dependencies
- Relies on Phaser 3.80 text and rendering APIs. No new assets or external libraries required.

## Open Questions
- **Action Bar Transitions:** Should the "CALL IT A NIGHT" button fade in smoothly over 200ms after the first draw, or just snap to `alpha=1`? (Draft assumes a 200ms fade for better UX).
- **Shop Ability Tooltips:** With larger horizontal shop cards, there might be room to print the ability text directly on the card, avoiding the need for a tooltip on mobile altogether. We will attempt this in implementation to reduce tap fatigue.
