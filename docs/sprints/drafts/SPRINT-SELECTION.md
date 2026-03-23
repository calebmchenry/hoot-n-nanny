# Sprint Selection — "Trading Post & Victory"

## Selected Backlog Items

| # | Item | Priority |
|---|------|----------|
| 7 | Game Loop — Shop Phase (Trading Post) | HIGH |
| 8 | Win Condition | HIGH |
| 11 | Shop UI | HIGH |

## Rationale

### Why these three items?

These items complete the game loop. Sprint 001 delivered a playable Hootenanny night — the player can invite animals, use powers, bust, score, and advance to the next night. But the night currently loops back to itself. Without the shop, the player's currency has no purpose and the deck never changes. Without a win condition, there's no goal. These three items turn a playable mechanic into an actual game.

**Shop mechanics (7):** The Trading Post is the second half of the core loop (night → shop → night). It gives meaning to the Pop and Cash the player earns each night — Pop buys new animals for the farm, Cash buys extra barn capacity. The shop stocks 10 regular animals and 2 blue-ribbon animals drawn from the larger pool, adding variety between runs. This item depends directly on the scoring system from Sprint 001 and is the prerequisite for the win condition.

**Win condition (8):** The game needs an ending. Blue-ribbon animals are already defined in the catalog from Sprint 001. The win trigger — having 3 blue-ribbon animals in the barn when calling it a night — connects the shop's purchasing decisions to the night's push-your-luck tension. Without this, the player has no strategic goal driving their shop purchases.

**Shop UI (11):** Inseparable from the shop mechanics. The player needs to see animal images, stock quantities, costs, ability icons, and scoring currencies to make meaningful purchase decisions. Hover/focus ability explanations, the "hootenanny" button to end shopping, and walking-in-place animations on hover are all specified as core to the shop experience — not polish.

### Why these items belong together

The dependency chain is tight and linear:

1. Shop mechanics (7) requires the scoring/currency system from Sprint 001 — already done.
2. Shop UI (11) is the presentation layer for (7) — building the shop without its UI produces the same "headless engine" problem Sprint 001 avoided.
3. Win condition (8) requires blue-ribbon animals to be purchasable in the shop — it cannot exist without (7).

Splitting these across sprints would mean delivering a shop with no win condition (no strategic purpose to buying blue-ribbon animals) or a win condition with no shop (no way to acquire them). Neither makes sense.

### What's excluded and why

- **Barn Scene Art Direction (12) & Sprite Assets (13):** Visual polish. Placeholders continue to work. Best addressed once both scenes are stable and layout is locked.
- **Responsive Layout (14):** Now that both scenes will exist, this becomes viable — but it's a separate concern. Better as its own sprint or bundled with visual polish.
- **Audio (15–23):** Zero gameplay dependencies. Can layer on at any time without touching game logic.
- **Humor & Personality (24), Animation Polish (25):** Polish work for after the full loop is solid.
- **CI/CD (26) & Final QA (27):** End-stage shipping tasks.

### What this sprint delivers

A player can:

1. Complete a Hootenanny night and transition to the Trading Post
2. Browse a shop stocked with 10 regular animals and 2 blue-ribbon animals
3. See each animal's image, stock, cost, ability, and scoring currencies
4. Hover/focus animals to read ability explanations
5. Purchase animals with Pop to add them to the farm
6. Purchase extra barn capacity with Cash (price increases per upgrade)
7. Return to the Hootenanny with the "hootenanny" button
8. Pursue a strategic goal: buy 3 blue-ribbon animals and get them all into the barn in a single night
9. Win the game and see a win state

After this sprint, the full game loop is complete: night → shop → night → ... → win. Every subsequent sprint is polish, art, audio, and shipping.
