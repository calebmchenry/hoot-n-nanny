# Sprint 003 Selection — "Personality & Polish"

## Selected Backlog Items

| # | Item | Priority |
|---|------|----------|
| 24 | Humor & Personality Pass | Low |
| 25 | Animation Polish | Low |

## Rationale

### Why these two items?

With Sprint 002 completing the full game loop (night → shop → night → win), every remaining backlog item is polish, audio, or shipping infrastructure. Items 24 and 25 are both **polish passes** over the existing, complete game and share the same goal: making Hoot N' Nanny feel alive, charming, and finished — not just functional.

### Why they belong together

**Shared surfaces.** Flavor text on animals and abilities (item 24) appears alongside the same UI elements getting animation polish (item 25) — entry animations, scoring tallies, phase transitions. Designing both together ensures they complement each other rather than collide.

**"Juice" synergy.** Animation without personality feels sterile. Personality without motion feels flat. A witty ability description that pops in with a satisfying animation lands better than either alone. The INTENT doc calls for "goofy, warm, scrappy" — achieving that requires both visual liveliness and written voice working in concert.

**No external dependencies.** Both items require only creative work on top of the existing codebase. No new assets need to be sourced, no new systems need to be built. They touch game presentation, not game logic.

**Minimizes context-switching.** Both items touch the same files and UI surfaces (animal cards, ability descriptions, phase transitions, shop interactions, scoring displays). One sprint avoids redundant passes through the same code.

### What's excluded and why

- **Audio (15–23):** Music and SFX form their own natural cluster requiring sourced or generated audio assets — a fundamentally different kind of work. No dependency on personality or animation; can follow in a later sprint.
- **CI/CD (26):** Infrastructure, not gameplay. Independent of all content work.
- **Final QA (27):** Explicitly a *final* pass. Should come last, after all content and polish is in place.

### What this sprint delivers

After this sprint:

1. All animals and abilities have flavor text and witty descriptions
2. UI copy throughout the game has personality and warmth matching the "goofy, warm, scrappy" tone
3. Phase transitions (hootenanny → scoring → shop → hootenanny) are smooth and animated
4. Animal entry into the barn has visual animation
5. Scoring tally has a counting/reveal animation
6. General "juice" — hover effects, button feedback, subtle motion — makes interactions feel responsive
7. The game feels like it has a voice and personality, not just mechanics
