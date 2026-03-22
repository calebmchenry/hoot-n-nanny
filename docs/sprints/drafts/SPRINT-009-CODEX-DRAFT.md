# Sprint 009 — Codex Draft

## Overview

The current UI problems are structural, not cosmetic. At the 390x844 reference canvas, the barn still lays out cards as `96x104` slots, then renders a `128x128` emoji texture with `setScale(2)`, so the art is effectively trying to occupy `256x256` inside a near-square frame. The action area also rebuilds from one `350x56` button into two `168x56` buttons, which changes width, position, and hit targets mid-turn. In the Trading Post, `getShopGridPositions(12, 390, 844)` compresses the common market into a 2-column, 6-row grid of `170x80` cards between `y=170` and `y=680`, which is not enough vertical room for art, name, cost, stats, ability, and stock.

This sprint fixes those three roots directly:

- Make the barn use true card geometry instead of token geometry.
- Make the barn action bar a persistent two-slot control that only changes state, never layout.
- Replace the Trading Post compression grid with a masked, scrollable single-column list of readable shop rows.

No `src/game/*` files should change. This is a rendering, layout, and input-behavior sprint.

## Use Cases

1. **Barn draw feels like drawing a card.** On the reference canvas, each barn card renders at `104x146`, with a bounded art box, readable nameplate, contained resource badges, and a shadow that matches the card frame.
2. **First draw does not rewire the bottom UI.** The player always sees the same two action slots at `x=20` and `x=202`, `y=758`, `w=168`, `h=56`. Before the first draw, the right slot is disabled; after the first draw, it becomes active without moving anything.
3. **Common market is readable on a phone.** The 12 standard shop animals appear in a vertical list with a `350x500` masked viewport and `350x112` rows, so the player can read name, cost, ability label, stock, and stats without squinting.
4. **Touch scroll does not trigger accidental purchases.** Dragging the Trading Post list moves the list; tapping a stationary row buys the animal if it is affordable.
5. **Night summary clearly blocks play.** A full-canvas scrim occludes the barn and captures input, so there are no ghost buttons visible or tappable behind the overlay.

## Architecture

### 1. Card Geometry Becomes First-Class

The current barn implementation still thinks in terms of slot boxes. Sprint 009 should keep the existing `getDynamicSlotRects()` API, but the returned rects should be treated as card frames, not placeholder slots.

Proposed reference geometry:

- Barn card base size: `104x146`
- Aspect ratio: `104 / 146 = 0.712`, effectively poker-card ratio
- Column gap: `12`
- Row gap: `10`
- Reference row positions:
  - Row 1: `y=156`, `x=[27, 143, 259]`
  - Row 2 (2-card row): `y=312`, `x=[85, 201]`
  - Row 2 (3-card row): `y=312`, `x=[27, 143, 259]`
  - Row 3: `y=468`

That produces a 3-column grid width of `104*3 + 12*2 = 336`, centered with `27px` side margins at 390px width. It materially reduces dead space while still fitting capacities 5-8 on the reference canvas.

Inside the card, stop using the old `96x104`-derived ratios as if the card were still nearly square. Add explicit card-face zones:

- Art safe box: `88x72`, centered horizontally, top anchored around `y=28`
- Emoji display cap: `60x60` via `setDisplaySize`, never `setScale(2)`
- Nameplate: `84x18` visual band near the bottom
- Ability chip: `88x16` above the nameplate
- Resource badges: `28x28` corner anchors

This keeps every card element anchored to a card model instead of to arbitrary legacy percentages.

### 2. One Action Bar Layout, Multiple States

The barn action bar should stop destroying and recreating buttons. The layout helper should always return two logical button slots.

Reference action bar:

- Primary button rect: `{ x: 20, y: 758, w: 168, h: 56 }`
- Secondary button rect: `{ x: 202, y: 758, w: 168, h: 56 }`
- Gap: `14`

State changes happen by swapping label, texture, alpha, and interactivity only:

- Before first draw:
  - Left slot: enabled, label `DRAW ANIMAL`
  - Right slot: disabled, label `CALL IT A NIGHT`
- After first draw:
  - Left slot: enabled, label `KEEP GOING`
  - Right slot: enabled, label `CALL IT A NIGHT`

Button press feedback should be translation-only in both scenes: `y + 3` on `pointerdown`, restore on `pointerup` / `pointerout`, plus tint if desired. Do not tween `scaleX` / `scaleY`; that is the direct cause of the “button shrinks” complaint in `BarnScene`.

### 3. Trading Post Becomes a Scrollable Card List

The common market cannot be made readable inside a 2-column, 6-row `170x80` grid. The layout needs a different shape.

Replace the grid helper with list metrics:

- Viewport rect: `{ x: 20, y: 176, w: 350, h: 500 }`
- Row size: `350x112`
- Row gap: `12`
- Row stride: `124`

Content height formula:

- `contentHeight = itemCount * 112 + (itemCount - 1) * 12`

Reference outputs:

- 12 common animals: `1476px` content height, `minScrollY = 500 - 1476 = -976`
- 8 legendary animals: `980px` content height, `minScrollY = 500 - 980 = -480`

Each row should read as a shop card, not as a spreadsheet cell:

- Row background: `350x112` parchment/variant texture
- Left preview card: `72x100`, inset at `x=8`, `y=6`
- Preview emoji cap: `42x42`
- Right content column: starts around `x=94`, usable width about `244px`
- Cost pill: `56x24` in the top-right
- Ability chip: short label centered in the content column
- Stock pill: bottom-right, e.g. `44x20`

This preserves “card-ness” via the left preview card while giving the text enough horizontal room to be readable.

### 4. Scene-Level Phaser Responsibilities

The scene files should stay thin in the sense of conventions: lifecycle and wiring only. The layout math remains in the helper files.

Key Phaser API usage:

- Barn cards remain `Phaser.GameObjects.Container`s so existing resize scaling via `container.setScale(slot.w / baseW, slot.h / baseH)` still works.
- Card art should use `setDisplaySize()` instead of raw scale multipliers.
- Buttons should use explicit hit areas where sizes are dynamic:
  - `setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)`
- Trading Post scrolling should use:
  - `Phaser.GameObjects.Container` for the list
  - `Phaser.GameObjects.Graphics` + `createGeometryMask()` for the viewport mask
  - `pointerdown` / `pointermove` / `pointerup` to distinguish drag from tap
  - optional `wheel` support for desktop
- Overlays should use a full-screen `Phaser.GameObjects.Rectangle` scrim at `0,0,390,844` logical space, set interactive to absorb taps.

### 5. Typography Split: Bitmap for HUD, Vector Text for Cards

The pixel bitmap font is fine for HUD counters and button labels, but it is the wrong tool for dense card metadata at `10-12px`.

Use:

- `BitmapText` for HUD numerics, tabs, and button labels
- `Text` for barn nameplates and Trading Post row text

That keeps the game’s chunky HUD identity while making the actual card surfaces readable.

## Implementation (Phased)

### Phase 1 — Normalize layout constants and helper math

**`src/config/constants.ts`**

- Add explicit card geometry constants, rather than continuing to derive everything from the old slot box:
  - Barn card: `104x146`
  - Shop preview card: `72x100`
  - Shop list viewport: `350x500`
  - Shop row: `350x112`
  - Shop row gap: `12`
- Keep `LAYOUT.TAP_TARGET_MIN = 44`.
- Keep `LAYOUT.ACTION_BAR.Y = 758` and `HEIGHT = 56`, but add a derived slot width constant of `168` at the reference canvas for tests/documentation.

**`src/scenes/barnLayout.ts`**

- Update `getSlotSize()` reference size from `96x104` to `104x146`.
- Keep the existing capacity row maps.
- Reduce baseline row gap from `14` to `10` so the taller cards still fit with capacity 8.
- Change `getActionBarPosition()` so it always returns both rects.
- Increase overlay panel height modestly, but rely on a full-screen scrim for true occlusion.

**`src/scenes/tradingPostLayout.ts`**

- Replace `getShopGridPositions()` with a list-oriented helper, e.g. `getShopListLayout()`, returning:
  - `viewport`
  - `itemRects` in local list coordinates
  - `contentHeight`
  - `minScrollY`
- Clean up header stacking so the shop list begins below tabs instead of fighting the header band.

**Tests**

- Update [src/scenes/barnLayout.test.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/barnLayout.test.ts) baseline rect expectations to the new `104x146` card geometry and fixed two-slot action bar.
- Rewrite [src/scenes/tradingPostLayout.test.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/tradingPostLayout.test.ts) to validate viewport/list metrics instead of a 2-column grid.

### Phase 2 — Generate card-like textures at the new sizes

**`src/rendering/proceduralTextures.ts`**

- Stop treating `generatePaperTexture()` as the final barn-card look. Add a dedicated card-face generator or extend the existing one so barn cards get:
  - outer rounded frame
  - inset line
  - subtle inner face area
  - stronger shadow separation
- Regenerate barn card textures at `104x146`.
- Regenerate shop row textures at `350x112`.
- Update `generateCardShadow()` to `104x146`.
- Change `generateDeckBack()` from `64x82` to roughly `72x100` so the deck matches the new card language.

**`src/scenes/BootScene.ts`**

- Update `SLOT_EMPTY`, `SLOT_OCCUPIED`, noisy stripe, and ability strip generation so their widths follow the new barn card width.
- Keep all texture generation boot-time only; do not generate on resize.

### Phase 3 — Rebuild barn card composition and action-state refresh

**`src/scenes/BarnScene.ts`**

- In `renderCardInSlot()`:
  - replace `sprite.setScale(2)` with bounded `setDisplaySize()`
  - lay out the face against fixed card zones, not old `96x104` ratios
  - move card names to `Text`
  - keep `Container` ownership and per-slot base-size metadata so resize behavior remains simple
- In button creation:
  - create both button objects once
  - add a `refreshActionBarState()` method that only changes label, texture, alpha, and input
  - remove the destroy/recreate cycle tied to `hasDoneFirstDraw`
- Replace BarnScene’s scale tween press feedback with the same Y-offset model already used in Trading Post.
- Add a full-screen scrim for bust and summary overlays, and call `hideActionBar()` while those overlays are up.

### Phase 4 — Convert Trading Post cards into a masked scroll list

**`src/scenes/TradingPostScene.ts`**

- Replace `createShopGrid()` with list creation:
  - `shopListContainer`
  - viewport mask graphics
  - per-row containers
- Each row should include:
  - wide row background
  - left preview card
  - preview emoji
  - readable name text
  - short ability chip
  - stats line
  - cost pill
  - stock pill
- Preserve existing tooltip behavior, but anchor it to the row or preview card instead of the old grid cell.
- Add drag scroll with a movement threshold so a drag does not buy an animal:
  - if pointer travel is `< 8px`, treat as tap
  - if pointer travel is `>= 8px`, treat as scroll
- Keep double-tap-to-buy-on-touch behavior if desired, but the first tap should show a stable preview state on the selected row.

## Files Summary

| File | Planned change |
|------|----------------|
| [src/config/constants.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/config/constants.ts) | Add explicit card/list geometry constants; update reference card sizes |
| [src/scenes/barnLayout.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/barnLayout.ts) | Taller barn card math, persistent two-slot action bar, updated overlay bounds |
| [src/scenes/tradingPostLayout.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/tradingPostLayout.ts) | Replace 2-column grid math with scroll-list viewport/content math |
| [src/scenes/BarnScene.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/BarnScene.ts) | Recompose barn cards, remove button rebuilds, add overlay scrim behavior |
| [src/scenes/TradingPostScene.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/TradingPostScene.ts) | Build masked list rows, drag-scroll handling, row-level purchase/readability refresh |
| [src/rendering/proceduralTextures.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/rendering/proceduralTextures.ts) | New barn card, shop row, shadow, and deck-back texture sizes |
| [src/scenes/BootScene.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/BootScene.ts) | Update generated slot/stripe/chip shapes to match the new card width |
| [src/scenes/barnLayout.test.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/barnLayout.test.ts) | Update baseline geometry assertions |
| [src/scenes/tradingPostLayout.test.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/tradingPostLayout.test.ts) | Replace grid assumptions with list/scroll assertions |

## Definition of Done

- Barn cards render at approximately `104x146` on the 390x844 reference canvas.
- Barn card emoji never exceeds the card art safe box; pig/goat-sized glyphs stay contained.
- Barn action buttons always occupy the same two rects; no layout shift occurs on the first draw.
- Barn button press feedback no longer changes scale.
- Trading Post common market is no longer a `170x80` 2-column compression grid.
- Trading Post shows a readable list with at least four `350x112` rows visible in the `350x500` viewport on the reference canvas.
- Touch scrolling the shop does not trigger accidental purchases.
- Summary/bust overlays use a full-screen scrim and fully occlude the action bar.
- `src/game/*` remains unchanged.
- Layout tests are updated and passing.
- `npm run typecheck`, `npm run test`, and `npm run lint` pass.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Taller barn cards may squeeze the farmhouse at capacity 7-8 on short screens | Medium | Use `104x146` instead of a more aggressive size, and allow the farmhouse rect to shrink or simplify on cramped viewports if needed |
| Scroll-vs-tap ambiguity in the Trading Post could cause accidental buys | High | Require a movement threshold before treating a gesture as a tap; only purchase on pointer-up with low travel distance |
| Mixing `Text` and `BitmapText` may feel visually inconsistent | Low | Keep bitmap text for HUD/buttons only; use regular text strictly where legibility is currently failing |
| New wide shop row textures increase boot work | Low | The added texture area is still small and generated once at boot, not per scene or per resize |
| Reworking `tradingPostLayout.ts` breaks existing tests and assumptions | Medium | Update tests in the same sprint and keep layout math isolated to the helper module |

## Security

This sprint does not introduce new data sources, persistence, or network behavior. It only changes local layout, texture generation, and pointer handling. The only input surface affected is pointer interaction, and the main security-relevant behavior there is making overlays absorb input correctly instead of letting clicks leak through.

## Dependencies

- No new npm packages.
- Depends on existing Phaser 3.80 APIs already in use: containers, tweens, geometry masks, pointer events, and bitmap fonts.
- Depends on keeping texture generation boot-time only in [src/scenes/BootScene.ts](/Users/caleb.mchenry/code/me/hoot-n-nanny/src/scenes/BootScene.ts).
- Depends on tooltip reuse from the existing scene tooltip helper rather than inventing a second explanation system.
- Optional but useful verification: run the external validator project against reference screenshots after implementation.

## Open Questions

1. Should the disabled `CALL IT A NIGHT` button be visibly disabled from frame one, or present only as an empty reserved slot? This draft prefers visibly disabled, because it preserves both layout and affordance.
2. Should the Trading Post row purchase on first tap after a stable preview state, or should touch keep the current “preview first, buy on second tap” behavior? The scroll list works with either, but the choice affects accidental-purchase risk.
3. Is it worth promoting the new card-face generator into a general card texture utility, or is a barn-specific texture generator sufficient for this sprint? The sprint does not need a full card component framework unless a later sprint also needs one.
4. If the farmhouse becomes too cramped at `375x667` with `104x146` cards, should the scene shrink it, simplify it, or hide it at capacity 8? The draft assumes “shrink first, hide last.”
