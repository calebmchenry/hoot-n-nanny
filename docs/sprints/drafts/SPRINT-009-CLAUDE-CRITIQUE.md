# Sprint 009 — Claude Critique of Gemini Draft

## Summary Verdict

The Gemini draft is well-structured and addresses the right problems, but makes several design choices that directly contradict user interview feedback. It also under-specifies key implementation details, misses important edge cases in the barn layout, and proposes a Trading Post redesign that sacrifices the existing 2-column layout the user wants to keep. The button stability approach is sound but needs refinement around the DRAW button placement.

---

## Strengths

1. **Correct problem identification.** The four use cases (card legibility, stable UI, scannable shop, overlay clarity) map cleanly to the intent document's observed issues. No scope creep into game logic.

2. **Button stability via persistent two-slot layout.** The alpha-0 / removeInteractive approach for the secondary button is the right pattern — it eliminates the destroy/recreate cycle cleanly. The 180ms fade-in is a good UX detail.

3. **Emoji scaling formula.** `Math.min(cardWidth, cardHeight) * 0.45 / 128` is a solid proportional approach that prevents overflow at any card dimension. Better than hard-coded `setScale(2)`.

4. **Phased implementation.** The Constants → Barn → Shop → Polish ordering is logical and allows incremental visual verification between phases.

5. **Overlay occlusion fix.** Correctly identifies that the current overlay bottom (y=700) doesn't reach the action bar (y=758) and proposes extending it. The belt-and-suspenders approach (overlay covers + buttons hidden) is good defensive design.

6. **Risk table.** Identifies texture memory, layout overflow, and e2e selector breakage — all real risks.

---

## Weaknesses

### W1: Wrong card aspect ratio — poker (1:1.4) vs. user-requested tarot (1:1.8)

The draft proposes 100x140 (1:1.4, poker ratio). The user interview explicitly requested **tarot-style 1:1.8 proportions**. At 100px wide, that's 180px tall — not 140px. This is the single biggest misalignment with user preferences.

At the Claude draft's 120px width, 1:1.8 gives 216px — which is too tall for 3 rows. This means the width needs to come down or the layout needs to accommodate fewer visible rows. The Gemini draft doesn't engage with this tension at all because it chose the wrong ratio.

**Impact:** The cards will still look stubby/poker-ish rather than the tall, tarot-like cards the user wants.

### W2: Single-column Trading Post — user wants 2-column with bigger cards

The draft proposes converting to a 1-column layout with horizontal strips (350x96). The user interview specifically requested a **2-column shop with bigger cards** — not a list view. The current layout is already 2-column; the fix is to make the cards taller and more card-like within that grid, not to flatten them into horizontal rows.

Horizontal strips (350x96) are wider than tall — the opposite of card proportions. This contradicts the cross-cutting goal of making everything "look like cards."

### W3: No mention of DRAW button placement or End Night positioning

The user interview specified:
- **DRAW button stays at bottom always** (this aligns with the draft's approach, but only implicitly)
- **End Night is a small persistent element near the top** — the draft puts "CALL IT A NIGHT" as a full-sized button next to DRAW at the bottom. This directly contradicts the user's stated preference.

The draft's two-equal-buttons-at-bottom approach needs to be reconsidered. The DRAW button should be the dominant bottom element. "End Night" should be a smaller, persistent control near the top of the screen.

### W4: Farmhouse sizing not addressed

The user requested to **shrink the farmhouse significantly**. The Gemini draft says "no change needed" for `getFarmhouseRect()` and only considers it as a collision risk. It should proactively reduce farmhouse dimensions to reclaim vertical space for the larger cards, especially given that taller tarot-ratio cards will need every pixel.

### W5: Card dimensions are too small even for poker ratio

100x140 is only 4px wider than the current 96px slots. At 390px canvas width, three 100px cards + two gaps = 224px — leaving 166px of dead space (43% of width). The intent document specifically calls out that cards "occupy ~25% of screen width, leaving massive dead space." At 100px, each card is still only 25.6% of width. This barely moves the needle.

The Claude draft's 120px (31% width) is a meaningful improvement. Even the Gemini draft's own card should be wider to actually address the stated problem.

---

## Gaps in Risk Analysis

### R1: No risk assessment for tarot-ratio vertical overflow

If cards are made taller (as the user wants), 3 rows of 180px cards + gaps = 560px. Starting at y~156, the grid bottom would be at y~716 — within 42px of the action bar at y~758. This leaves zero room for the farmhouse and requires either: (a) hiding the farmhouse at capacity ≥7, (b) shrinking it significantly, or (c) making the grid scroll. The draft doesn't model this scenario.

### R2: No risk for bitmap font legibility at new sizes

The draft mentions increasing font sizes but doesn't analyze whether the existing bitmap font (pixel-style) scales well to the proposed sizes. Bitmap fonts can look blurry or aliased at non-integer scales. This has been a recurring issue (intent doc issue #5, #12).

### R3: No performance risk for larger textures

The draft hand-waves texture memory as "generally safe" but doesn't calculate. If shop cards become 350x96 with RGBA at 4 bytes/pixel, that's 134KB per texture. With 3 variants × multiple animals, this could add up. The current 170x200 textures are actually larger per-unit, so this is probably fine — but the analysis should be explicit.

### R4: No consideration of the info panel / tooltip overlap

With larger barn cards, the info panel (triggered by long-press, positioned via `getInfoPanelBounds()`) may overlap with the enlarged card grid. The info panel currently uses `actionBar.y - h - gap` as its bottom bound, but doesn't account for whether it overlaps the cards above it. Taller cards push the grid bottom lower, squeezing the info panel.

---

## Missing Edge Cases

1. **Capacity 5 vs. capacity 8 visual disparity.** At capacity 5 (2 rows), the grid is short and there's a huge gap to the action bar. At capacity 8 (3 rows), it's packed tight. The draft doesn't address how the visual balance changes across capacities — should cards scale down at higher capacity, or should spacing compress?

2. **"CALL IT A NIGHT" text truncation.** The draft's open question #2 mentions verifying fit at 168px wide, but doesn't propose a fallback. At 14px bitmap font, "CALL IT A NIGHT" is ~15 characters — likely too wide. A concrete fallback label should be specified (e.g., "END NIGHT").

3. **Shop with 0 or 1 items.** Converting to single-column means 1 item fills the entire width. What does a single 350x96 horizontal strip look like centered on screen? It may look odd. The 2-column layout handles sparse grids more gracefully.

4. **Night summary content reflow.** The overlay is being extended vertically, but the content inside it (score lines, continue button) isn't repositioned. If the overlay grows but content stays at old positions, there'll be awkward bottom padding.

5. **Deck stack overlap with wider cards.** The Claude draft raises this (open question #4) but the Gemini draft ignores it entirely. At 390px canvas, the deck stack at `cw - margin - w` could overlap the rightmost card column when cards are wider.

---

## Definition of Done Assessment

| DoD Item | Adequate? | Notes |
|----------|-----------|-------|
| Barn cards at poker ratio 100x140 | Partial | Wrong ratio (should be tarot 1:1.8), too small (100px barely larger than 96px) |
| Emoji containment | Good | Formula is correct and generalizable |
| Button stability | Partial | Mechanism is sound, but layout contradicts user preference for small top-positioned End Night |
| Single-column shop | Wrong | User wants 2-column with bigger cards, not 1-column horizontal strips |
| Overlay occlusion | Good | Correctly extends bounds and hides buttons |
| Touch targets ≥ 44px | Good | Explicit check included |

**Missing from DoD:**
- No mention of farmhouse size reduction
- No before/after screenshot comparison requirement (the Claude draft includes this as item #9)
- No validator bot check against "Beautiful" and "Ergonomic" keywords (listed in intent doc success criteria #8)
- No bundle budget verification (intent doc constraint)
- No mention of CI passing as a DoD item

---

## Comparison with User Interview Preferences

| Preference | Gemini Draft | Alignment |
|-----------|-------------|-----------|
| Tarot-style 1:1.8 card proportions | Poker 1:1.4 (100x140) | **Misaligned** |
| DRAW button stays at bottom always | DRAW at bottom-left (168px) | Partial — button is at bottom but halved in width |
| End Night is small, persistent, near top | Full-sized button at bottom-right | **Misaligned** |
| 2-column shop with bigger cards | 1-column horizontal strips | **Misaligned** |
| Shrink farmhouse significantly | No farmhouse changes proposed | **Misaligned** |

4 of 5 user preferences are misaligned. This is the draft's most significant shortcoming.

---

## Recommendations

1. **Adopt tarot ratio 1:1.8.** Target ~110x198 or ~100x180. Model the vertical budget carefully — this likely requires hiding/shrinking the farmhouse at high capacity and possibly reducing to 2 visible rows with a subtle scroll or compressed third row.

2. **Keep 2-column shop, make cards taller.** Instead of horizontal strips, increase card height from 108→180+ within the existing 2-column grid. Apply the same tarot proportions and zone-based hierarchy within vertical cards.

3. **Rethink End Night as a small top-bar element.** Remove it from the action bar entirely. Make it a persistent small button or link near the resource banner. The DRAW button should span the full bottom width, becoming the single dominant action.

4. **Explicitly shrink the farmhouse.** Reduce to ~60-70% of current size, or hide it entirely at capacity ≥7 to reclaim vertical space for taller cards.

5. **Add CI, validator, and screenshot checks to DoD.** These are in the intent doc's success criteria and should be non-negotiable.
