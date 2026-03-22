# Sprint 009 — Merge Notes

## Claude Draft Strengths
- Extremely detailed implementation with specific pixel math and code snippets
- Three-zone shop card layout is well-structured (even if user wants simpler approach)
- Thorough risk table with mitigations
- Good overlay occlusion fix (belt-and-suspenders: extend overlay + hide buttons)
- Comprehensive DoD including CI, screenshots, and validator checks
- Identified deck stack overlap risk

## Gemini Draft Strengths
- Concise and well-organized — easy to follow
- Correct emoji scaling formula: `Math.min(w,h) * 0.45 / 128`
- Good suggestion to print ability text directly on cards (reducing tooltip dependency)
- Phased implementation ordering is clean

## Codex Draft
- Not received (CLI timeout). Proceeding with 2-draft consensus.

## Valid Critiques Accepted

### From Claude's critique of Gemini:
1. ✅ Wrong card ratio (poker 1:1.4 → must be tarot 1:1.8)
2. ✅ Single-column shop contradicts user preference for 2-column
3. ✅ End Night placement at bottom contradicts user preference for top
4. ✅ No farmhouse shrinking addressed
5. ✅ 100px card width barely larger than 96px — doesn't address dead space
6. ✅ Missing DoD items: CI, validator, screenshots, farmhouse
7. ✅ Missing edge case: capacity 5 vs 8 visual disparity

### From Gemini's critique of Claude:
1. ✅ Wrong card ratio (poker 1:1.3 → must be tarot 1:1.8)
2. ✅ Dual bottom buttons contradicts user preference for single DRAW + top End Night
3. ✅ Three-zone shop over-engineered vs user's "bigger 2-column cards"
4. ✅ Farmhouse shrinking treated as fallback, not primary requirement
5. ✅ Vertical space math must be recalculated for taller tarot cards
6. ✅ Top HUD collision risk with End Night button not addressed by either draft

## Critiques Rejected
- None. Both critiques were accurate and well-targeted.

## Interview Refinements Applied
1. **Card proportions**: Tarot-style 1:1.8 ratio → ~100x180 for barn cards
2. **Button layout**: DRAW button is the sole big bottom button. End Night is a small persistent element near the resource banner at the top.
3. **Shop layout**: Keep 2-column grid, make cards taller with better visual hierarchy (not 3-zone, not single-column)
4. **Farmhouse**: Shrink significantly as a primary goal, not a fallback
5. **Vertical budget**: Must carefully model with taller cards — may need to hide farmhouse entirely at capacity ≥7

## Key Merge Decisions
1. Use Claude draft as the structural base (more detailed) but override all design choices with user preferences
2. Adopt Gemini's emoji scaling formula (cleaner than Claude's)
3. Adopt Claude's overlay fix approach (belt-and-suspenders)
4. New button architecture: single DRAW at bottom + small End Night at top (neither draft proposed this)
5. Shop cards use tarot proportions in 2-column grid with clear name/emoji at top, cost/stats below
6. Farmhouse explicitly shrunk to ~50% in Phase 1, hidden at capacity ≥7
