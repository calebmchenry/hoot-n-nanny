# Sprint 009: Critique of Claude Draft

## Overall Verdict
The draft correctly identifies the core issues (small cards, overflowing emojis, unstable buttons, cramped shop) and points to the right files for implementation. However, the proposed solutions strongly misalign with recent user interview preferences. The draft requires a significant pivot in its design decisions before implementation.

## Strengths
- **Codebase Comprehension**: Excellent identification of the layout constants (`src/config/constants.ts`), texture generation (`src/rendering/proceduralTextures.ts`), and scene layouts that need modification.
- **Texture Handling**: Correctly understands the constraint that textures are procedurally generated at boot and must be regenerated at the new sizes.
- **Bug Fixes**: Solid approach to fixing the emoji overflow (proportional scaling cap instead of fixed scale) and the overlay occlusion issue.

## Weaknesses & Misalignments (Critical)
The draft contradicts explicit user preferences gathered from recent interviews:

1. **Card Proportions**: The draft targets Poker proportions (1:1.4, specifically 120x156). **User Preference**: Tarot-style proportions (1:1.8). The dimensions need to be taller and narrower (e.g., 90x162 or 100x180).
2. **Button Stability / Action Bar**: The draft proposes a persistent two-slot layout at the bottom, fading in the secondary button. **User Preference**: The "DRAW" button must stay at the bottom as the *only* big button. "End Night" should be a small, persistent element near the TOP of the screen.
3. **Shop Layout**: The draft designs a complex 3-zone layout for the shop cards. **User Preference**: Keep a simple 2-column shop but with bigger cards, avoiding the 3-zone split. 
4. **Farmhouse Size**: The draft lists shrinking the farmhouse as a "fallback" or open question. **User Preference**: The farmhouse must be shrunk significantly as a primary requirement.

## Gaps in Risk Analysis & Missing Edge Cases
- **Vertical Space with Tarot Cards**: Tarot cards (1:1.8) are significantly taller. 3 rows of ~180px cards will consume ~540px plus gaps. The draft's math assumes 156px height. The risk of the card grid overlapping the top HUD or bottom button is much higher now and must be explicitly calculated and mitigated.
- **Top HUD Overlap Risk**: Moving the "End Night" button to the top of the screen introduces collision risks with the noise meter, deck stack, and resources HUD. The layout math for the top area needs a complete overhaul, which the draft misses entirely.
- **Scrollability in Shop**: Making shop cards bigger in a 2-column grid will reduce the number of visible items. The draft doesn't mention ensuring the scroll area/bounds are updated to accommodate the taller total content height.

## Definition of Done Completeness
The DoD needs to be rewritten to reflect the new requirements:
- **Change**: Card proportions must explicitly state ~1:1.8 (Tarot style), not 1:1.3.
- **Change**: Button stability must state: One massive DRAW button at the bottom; one small END NIGHT button at the top.
- **Change**: Add a criterion for the significantly shrunk farmhouse.
- **Change**: Shop layout should specify "larger 2-column cards" rather than "top/middle/bottom structure".
- **Addition**: Verify no overlap between the new top-mounted "End Night" button and existing HUD elements.