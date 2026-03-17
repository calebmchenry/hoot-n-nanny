# Sprint 003 Merge Notes

## Draft Strengths

### Claude Draft
- Precise layout coordinates and animation specs for every UI element
- Slot size increase to 96x104 — necessary for readability
- Non-zero Legendary Mischief/Hay values creating strategic tension
- Thorough test edge cases (empty deck peek, boot-self forfeit, fetch+bust)
- Penned Up generalization to array-based tracking

### Codex Draft
- Clean entry resolution pipeline (7 steps, explicit precedence)
- Concrete `PendingDecision` discriminated union
- Pragmatic scope — 4 Legendaries, 5 phases, no over-ambition
- Strong animation spec table with exact easing/duration values

### Gemini Draft
- Data-driven ability registry (`ABILITY_REGISTRY`, `AbilityKind`) — best architecture
- `tier` field instead of separate Legendary type — clean, extensible
- Explicit chain-breaking rule (fetched/peeked cards don't trigger abilities)
- Scope cut guidance and risk acknowledgment
- Separate `abilityResolver.ts` module — keeps night.ts manageable

## Valid Critiques Accepted

1. **Gemini's registry approach is better** but risky to migrate boolean fields mid-sprint. Decision: add `abilityKind` and `tier` fields alongside existing booleans. Keep both working. Remove booleans in Sprint 004. (Codex critique suggestion)
2. **Bust takes precedence over win** — all three agree. Locked.
3. **Fetched/peeked cards do NOT trigger on_enter abilities** — Gemini's chain-breaking rule adopted. Prevents infinite loops.
4. **Legendary animals should have modest Mischief/Hay** — not 0/0 (dead weight) and not +8/+9 (degenerate farming). Use moderate values: Golden Goose +3M/+1H, Giant Ox +2M/+1H, etc.
5. **Info panel overlaps action bar** — Gemini draft coordinates y:506-844 conflict with action bar at y:720. Fix: info panel replaces action bar temporarily (action bar hidden while panel is showing).
6. **Paginated Trading Post, not scrollable** — scroll physics in Phaser is fragile. Use tabs: "Animals" tab (common + ability animals) and "Legendary" tab.
7. **Refresh is partially useful** — with mixed activation (auto + manual), Cheerful Lamb resets `abilityUsed` allowing manual re-activation of abilities for animals already in barn. This gives it purpose.

## Valid Critiques Rejected

1. **"Cut info panel from Sprint 003"** (Gemini critique) — User explicitly requested it. Keeping in scope.
2. **"Cut to 2 abilities"** (Gemini critique) — User explicitly requested all 4. Full scope confirmed.
3. **"Remove boolean flags this sprint"** — Too risky. Adapter approach instead.

## Interview Refinements

1. **All 8 Legendaries** available in shop (1 stock each), win requires any 3 simultaneously in barn.
2. **Mixed activation**: Sheepdog/Border Collie auto-trigger prompts on entry. Stable Hand is tap-to-activate (player decides when to boot). Cheerful Lamb auto-triggers refresh.
3. **Full scope confirmed** — all 4 abilities, info panel, card readability, Legendaries, win condition.

## Key Design Decisions Locked

| Decision | Resolution |
|----------|-----------|
| Ability chain suppression | Fetched/peeked cards do NOT trigger abilities |
| Bust vs win precedence | Bust wins. If same entry causes both, bust triggers. |
| Penned Up stacking | Array-based. Boot + bust same Night = 2 penned. All restored after 1 Night. |
| Boot targeting | Cannot boot Legendary animals. Boot self = forfeit. |
| Fetch candidates | Show unique animal types (not individual cards). Alphabetical order. Exclude Legendaries. |
| Peek reject | Card goes to bottom of deck (deterministic, no RNG). |
| Win scoring | Win Night scores normally (unlike bust). Player gets Mischief/Hay. |
| Post-win flow | Victory overlay with "Play Again" button. Resets session. |
| Ability activation model | Mixed: Sheepdog (auto-peek on entry), Stable Hand (tap-to-boot, player chooses when), Border Collie (auto-fetch prompt on entry), Cheerful Lamb (auto-refresh on entry) |
| Trading Post layout | Paginated tabs: Common/Ability animals (tab 1), Legendary (tab 2) |
| Legendary stats | Modest non-zero values. Not dead weight, not farming machines. |
