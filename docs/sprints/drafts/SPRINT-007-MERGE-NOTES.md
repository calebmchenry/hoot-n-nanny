# Sprint 007 Merge Notes

## Consensus across all three drafts
- Split `applyLayout` into viewport-only + content-only methods
- Force 2-column shop grid, raise card height minimum, remove compact mode
- Switch emoji filter from LINEAR to NEAREST (Claude also bumps to 128x128)
- Shared tooltip helper file used by both scenes

## Key decisions
- **Emoji**: 128x128 + NEAREST (Claude approach — more source pixels + crisp edges)
- **Shop**: Always 2 columns, cardH min 80px, remove compact branch (Gemini detail)
- **Tooltip**: Shared `src/scenes/tooltipHelper.ts` (all three agree)
- **Shop tap flow**: Tap-to-preview, tap-again-to-buy (user confirmed)
- **No tooltip for `abilityKind: 'none'`** animals (all three agree)
- **Tooltip delay**: 150ms hover on desktop, instant on tap (Claude/Gemini)
- Critiques skipped — low uncertainty, all drafts aligned
