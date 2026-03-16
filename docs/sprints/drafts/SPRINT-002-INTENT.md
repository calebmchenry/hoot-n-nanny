# Sprint 002 Intent: Playable & Beautiful Core Loop

## Seed

The game doesn't work or look good. Sprint 002 must deliver a playable, visually polished single-player core loop — draw animals from your herd, push your luck against bust conditions, score resources, shop for new animals, repeat. The user requires screenshot proof via `agent-browser` that the game is both functional and beautiful.

## Orientation Summary

- **Sprint 001 delivered**: Bare wireframe — colored rectangles for barn, 5 slots, a draw button that cycles slot colors. All infrastructure (CI, GitHub Pages, Vitest, Playwright) works.
- **No game logic exists**: No deck, shuffle, animals, bust detection, scoring, economy, or shop.
- **No visual assets**: Everything is solid-color `Phaser.GameObjects.Rectangle` primitives. No sprites, no animations, no card art.
- **Architecture is sound**: Thin scenes, pure layout helpers, LAYOUT constants, touch input model, responsive canvas scaling (390×844). This foundation supports the game logic and visual overhaul.
- **Key constraint**: App chunk must stay <100KB gzipped. Pixel art sprites are small; procedural rendering (canvas drawing) is even smaller. Both approaches are viable.

## Relevant Codebase Areas

| Area | Files | Sprint 002 Impact |
|------|-------|-------------------|
| Main scene | `src/scenes/BarnScene.ts` | Major overhaul — becomes the draw-phase gameplay scene |
| Layout | `src/scenes/barnLayout.ts`, `src/config/constants.ts` | Extend with card positions, UI elements, animations |
| Types | `src/types/index.ts` | Expand significantly — Animal, Card, GameState, etc. |
| Config | `src/config/game.ts` | Add new scenes to scene array |
| Boot | `src/scenes/BootScene.ts` | May need asset preloading |
| Game logic | `src/game/` (NEW) | Deck engine, scoring, bust detection, animal definitions |
| Trading Post | `src/scenes/TradingPostScene.ts` (NEW) | Shop phase scene |
| Assets | `public/` or procedural | Animal art, UI elements |

## Constraints

- **Phaser 3.80.x, TypeScript 5.x strict, Vite 5.x** — no new framework dependencies
- **390×844 logical canvas** — all coordinates in logical space
- **Thin scenes** — lifecycle hooks only; game logic in `src/game/`
- **Touch input** — `pointerdown` only, 44px minimum tap targets
- **App chunk < 100KB gzipped** — sprites must be small or procedurally generated
- **No new `src/` subdirectory until a second file inhabits it** — but `src/game/` will have multiple files immediately (deck, state, animals, scoring)
- **No barrel files until 3+ consumers**

## Success Criteria

1. A complete Night resolves correctly: shuffle herd → draw animals one at a time → bust or call it a night → score
2. Both bust conditions work: Farmer Wakes Up (3 NOISY!), Barn Overwhelmed (exceed capacity)
3. Visual warning at 2 NOISY! animals (farmhouse window glow)
4. Trading Post allows spending Mischief on new animals and Hay on capacity expansion
5. The game loop repeats: Night → Trading Post → Night → ...
6. Starting herd is correct: 4 Barn Cat, 4 Feral Goat, 2 Pot-Bellied Pig
7. At least 8 purchasable animals in the Trading Post
8. The game looks beautiful — pixel art style, animated card draws, polished UI
9. agent-browser screenshots prove all of the above
10. All existing tests still pass; new unit tests for game logic
11. CI green, bundle budgets met

## Verification Strategy

**Primary**: Use `agent-browser` CLI to:
1. Launch dev server, open game at 390×844 viewport
2. Screenshot the barn scene at game start
3. Play through draws by clicking "Draw Animal" / "Keep Going"
4. Screenshot NOISY! warning state (2 noisy animals)
5. Screenshot bust state (3 noisy animals)
6. Screenshot successful night scoring
7. Screenshot Trading Post / shop
8. Screenshot a second night after purchasing animals
9. Present all screenshots to user

**Secondary**: Vitest unit tests for pure game logic (deck shuffle, bust detection, scoring math, animal abilities). Playwright smoke test still passes.

## Uncertainty Assessment

| Factor | Level | Reasoning |
|--------|-------|-----------|
| **Correctness** | Medium | Game rules are well-specified in INTENT.md, but ability interactions add complexity. Subset of animals reduces risk. |
| **Scope** | High | Combining core loop + economy + visual polish + verification in one sprint is ambitious. Need clear phase boundaries and cut lines. |
| **Architecture** | Medium | New `src/game/` module is a clean extension of existing patterns. Scene transitions are straightforward. Visual approach (sprites vs procedural) is the main architectural decision. |

## Open Questions

1. **Art approach**: Should animals be rendered procedurally (canvas shapes + emoji/text) for zero asset overhead, or should we source free pixel art sprite sheets? Procedural is faster to implement and guaranteed <100KB; sprites look better but require sourcing and loading.
2. **Animal abilities**: Should Sprint 002 implement active abilities (Sheepdog peek, etc.) or just passive/triggered abilities? Active abilities require UI for player choices mid-draw.
3. **Night summary**: Should the bust/success feedback be a separate scene or an overlay within BarnScene?
4. **Persistence**: Should Mischief/Hay/Herd persist across browser sessions (localStorage) in this sprint, or is session-only state acceptable?
5. **agent-browser availability**: Need to verify `agent-browser` is installed or installable in the dev environment.
