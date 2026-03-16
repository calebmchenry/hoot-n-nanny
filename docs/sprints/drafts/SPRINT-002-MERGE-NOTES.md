# Sprint 002 Merge Notes

## Draft Strengths Adopted

### From Codex Draft
- **Event-driven architecture (`NightEvent[]`)** — rule functions return typed events that scenes consume as animation cues. Cleanest separation of concerns.
- **Seedable shuffles with named verification seeds** — `?seed=sprint2-warning` query params make agent-browser verification reproducible.
- **DOM data attributes** — `data-scene`, `data-phase`, `data-noisy-count`, `data-capacity` on `#game-container` for stable automated testing hooks.
- **Explicit rule lockdowns** — Penned Up = bust-causing animal, NOISY! threshold = 2/3, capacity cost curve = 2,3,4...
- **Beauty gates** — "if it still reads as flat UI blocks, the sprint is not done."
- **Richer visual specification** — night-sky palette, wood tones, straw accents, parchment UI.
- **Phase-exposed player states** — `ready_to_draw`, `animating_draw`, `player_decision`, `warning`, `bust`, `night_summary`.

### From Claude/Gemini Drafts
- **Scope discipline** — 8 purchasable animals with passive/triggered abilities only. No active abilities, no BRINGERs.
- **Module-level singleton store** (`gameStore.ts`) for cross-scene state passing (Gemini).
- **Concrete TypeScript interfaces** — copy-pasteable type definitions (Claude).
- **Phase allocation with effort percentages** (Claude).
- **Night summary as overlay Container** inside BarnScene, not a separate scene (both).
- **Edge case coverage** — deck exhaustion auto-score, Bunny stacking, negative Hay penalty, rapid-tap guard (Gemini).
- **Answered open questions** with proposed decisions (Gemini).

## Valid Critiques Accepted
- BRINGER animals excluded (too complex for Sprint 002, Barn Overwhelmed bust still possible via herd growth + capacity limit)
- No Google Font CDN — use local bitmap font or Phaser text only
- Tests front-loaded alongside rules engine (Phase 1), not deferred to end
- BootScene must handle texture/asset preloading (not "unchanged")
- Penned Up tracks card instance, not animal type
- Capacity capped at 8 for Sprint 002 to avoid layout edge cases

## Valid Critiques Rejected
- "Dead Trading Post" mitigation — user says no mitigation needed, let the player learn
- Fairness-aware shuffle rerolls — over-engineered, simple Fisher-Yates is sufficient

## Interview Refinements
- **Visual approach**: Free sprite sheets from itch.io/OpenGameArt (CC0/permissive). Best visual quality.
- **Dead shop**: No mitigation. Player busts, sees empty shop, starts next night.
- **Penned Up**: Included. Bust-causing animal penned for one Night.
- **Capacity cap**: 8 (defaulted to recommended)
- **Active abilities**: None in Sprint 002 (defaulted to recommended)
- **Persistence**: Session-only (defaulted to recommended)
