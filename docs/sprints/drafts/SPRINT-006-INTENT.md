# Sprint 006 Intent — Emoji Animal Glyphs

## Seed Prompt (from user)

> I don't like the animal sprites. Let's change to emoji glyphs.

## Orientation Summary

- **Current state**: 11 of 23 animals have 32x32 pixel art sprites in
  `animals.png` (352x32). The other 12 (4 ability animals + 8 legendaries
  from Sprint 003) have NO sprites at all — they're defined in code but
  missing from the atlas, causing rendering gaps.
- **Sprint 005 just shipped**: Rich procedural textures, pixel bitmap font,
  particles, animations. The pixel art animal sprites now clash with the
  new procedural aesthetic.
- **Animal rendering**: Sprites are created via `this.add.sprite(x, y, 'animals', card.animalId)`
  in BarnScene (4 locations) and TradingPostScene (1 location). The atlas is
  loaded in BootScene via `this.load.atlas('animals', ...)`.
- **23 total animals**: 3 starting herd (BarnCat, FeralGoat, PotBelliedPig),
  12 common shop (Bunny, Hen, WildBoar, HermitCrab, DraftPony, StruttingPeacock,
  MilkmaidGoat, HoneyBee, Sheepdog, StableHand, BorderCollie, CheerfulLamb),
  8 legendary (GoldenGoose, GiantOx, Jackalope, Thunderbird, SilverMare,
  LuckyToad, GreatStag, BarnDragon).

## What This Sprint Must Deliver

### 1. Emoji-to-Texture Generation
- In BootScene, generate a texture for each of the 23 animals by rendering
  its corresponding emoji onto a canvas
- Use Phaser's text/canvas rendering to draw emoji at ~28px size onto a 32x32
  canvas, then `generateTexture()` with the animal's ID as the texture key
- Remove the `this.load.atlas('animals', ...)` call and the atlas files

### 2. Emoji Mapping
- Map each AnimalId to a specific emoji character:
  - BarnCat → 🐱, FeralGoat → 🐐, PotBelliedPig → 🐷, Bunny → 🐰
  - Hen → 🐔, WildBoar → 🐗, HermitCrab → 🦀, DraftPony → 🐴
  - StruttingPeacock → 🦚, MilkmaidGoat → 🐑, HoneyBee → 🐝
  - Sheepdog → 🐕, StableHand → 🧑‍🌾, BorderCollie → 🦮, CheerfulLamb → 🐏
  - GoldenGoose → 🪿, GiantOx → 🐂, Jackalope → 🐇, Thunderbird → 🦅
  - SilverMare → 🦄, LuckyToad → 🐸, GreatStag → 🦌, BarnDragon → 🐉

### 3. Scene Rendering Updates
- Update BarnScene and TradingPostScene to use individual texture keys
  (the animalId) instead of atlas frames
- Change `this.add.sprite(x, y, 'animals', card.animalId)` to
  `this.add.sprite(x, y, card.animalId)` (or `this.add.image(...)`)

### 4. Remove Old Assets
- Delete `public/assets/animals.png` and `public/assets/animals.json`
- Remove the atlas preload from BootScene

### 5. Verification
- Use agent-browser to capture screenshots showing emoji animals at
  phone, tablet, and desktop viewports
- Verify all 23 animals render (especially the 12 that previously had no sprite)

## Relevant Codebase Areas

| Area | Files | What Changes |
|------|-------|-------------|
| Atlas loading | `src/scenes/BootScene.ts` | Remove atlas load, add emoji texture gen |
| Barn rendering | `src/scenes/BarnScene.ts` | Change sprite creation from atlas to individual textures |
| Shop rendering | `src/scenes/TradingPostScene.ts` | Same change |
| Emoji mapping | New: `src/config/emojiMap.ts` or in constants | AnimalId → emoji character map |
| Animal types | `src/game/types.ts` | **UNTOUCHED** |
| Animal defs | `src/game/animals.ts` | **UNTOUCHED** |
| Old assets | `public/assets/animals.png`, `public/assets/animals.json` | Delete |

## Constraints

- App chunk < 100KB gzipped
- No new npm dependencies
- `src/game/*` completely untouched (types.ts, animals.ts, etc.)
- `pixelArt: true` in game config — emoji textures will be nearest-neighbor
- Emoji rendering varies by platform (iOS, Android, Windows, Linux)
- Must work in headless Chrome (for agent-browser verification)
- Existing tests must pass

## Success Criteria

1. All 23 animals render with emoji glyphs at all viewports
2. No more missing sprites (the 12 animals that had no atlas frame now work)
3. `animals.png` and `animals.json` are deleted
4. No atlas preload in BootScene
5. Emoji are centered and properly sized on cards
6. Legendary animals render their emoji just like common animals
7. All existing tests pass, CI green
8. agent-browser screenshots show emoji animals

## Verification Strategy

```bash
agent-browser open http://127.0.0.1:4173/hoot-n-nanny/
agent-browser set viewport 393 852
agent-browser wait --fn "window.__GAME_READY__ === true"
agent-browser screenshot artifacts/visual/sprint-006/phone-portrait.png
# Draw some cards, verify emoji visible
agent-browser close
```

## Uncertainty Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| Correctness | Medium | Emoji rendering varies by platform/browser. Need to verify in headless Chrome. |
| Scope | Low | Well-bounded: 23 animals, ~5 rendering call sites, 2 files to delete |
| Architecture | Low | Simple texture key change. No new patterns. |

## Open Questions

1. Should MilkmaidGoat use 🐑 (sheep) or 🐐 (goat) emoji? The name says goat
   but it's a milking animal.
2. Should emoji be rendered at native resolution or downscaled to match pixel
   art aesthetic?
3. What happens on platforms where certain emoji aren't supported (e.g., 🪿
   goose emoji is relatively new)?
4. Should we add a fallback for missing emoji (e.g., first letter of animal name)?
