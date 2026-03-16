# Hoot 'n Nanny — Product Intent

## Seed

A browser-based push-your-luck deck builder inspired by UFO 50's *Party House*, reskinned as a farm animal theme. Players draw animals into a barn one at a time, deciding when to stop before the farmer wakes up (too noisy) or the barn overcrowds. Features classic pixel art, retro sounds, pass-and-play multiplayer for 2–6 players, and mobile-first responsive design. Deployable on GitHub Pages.

---

## Inspiration: Party House (UFO 50 #25)

The core loop, risk architecture, and card economy are directly inspired by Party House. Key mechanics to preserve:

- **Push-your-luck draw loop** — draw one animal at a time, stop voluntarily or bust
- **Two independent bust conditions** — noise and overcrowding (see below)
- **Deck-building shop phase** — spend earned resources to add new animals to your herd permanently
- **Two currencies** — Mischief (used to buy animals) and Hay (used to expand barn capacity)
- **Fast feedback** — a full Night resolves in seconds; failure doesn't sting long
- **Synergy-driven strategy** — cards that pair well together, multiple viable build paths
- **Scenario variety** — different available animal pools across scenario types forces different strategies

### What to Improve vs. Party House

| Party House Problem | Hoot 'n Nanny Approach |
|---|---|
| No deck thinning (permanent) | Add one "Release to the Wild" action per Night — permanently removes one animal from herd |
| "Implicitly lost" state with no feedback | Show a win-path tracker indicating if Legendary animal collection is still feasible |
| Wild Buddy clustering feels unfair | Mitigate via shuffle algorithm that distributes NOISY! animals more evenly |
| 5-win-streak achievement frustration | Achievements tied to cumulative milestones, not streaks |
| Mr. Popular/Celebrity are trap cards | Bringer animals clearly labeled "BRINGER" and telegraph risk |

---

## Theme Translation

| Party House | Hoot 'n Nanny |
|---|---|
| House | Barn |
| Party / Night | Night |
| Guest | Animal |
| Rolodex / Deck | Herd |
| TROUBLE! | NOISY! |
| Police bust | Farmer Wakes Up |
| Fire dept. bust | Barn Overwhelmed |
| Popularity (currency) | Mischief |
| Cash (currency) | Hay |
| Star Guests | Legendary Animals |
| Ban (1-night exclusion) | Penned Up |
| Shop phase | Trading Post |

---

## Core Gameplay Loop

### A Night (Round)

1. Player shuffles their Herd and begins drawing animals into the Barn one at a time.
2. After each animal enters, the player chooses: **Keep Going** or **Call It a Night**.
3. Bust conditions are checked after each draw (see below).
4. If the Night ends without busting, the player scores all Mischief and Hay from animals in the Barn.
5. Player enters the Trading Post to spend Mischief on new animals and Hay to expand Barn capacity.
6. One animal is Penned Up (banned from next Night) if a bust occurred.

### Bust Conditions

**Farmer Wakes Up** — Three or more unmitigated NOISY! animals are in the Barn simultaneously. A visual/audio warning triggers when two NOISY! animals are present (owl hoots, lantern light appears in farmhouse window). A third unmitigated NOISY! triggers full bust: zero scoring, one animal Penned Up.

**Barn Overwhelmed** — Total animals in the Barn exceed its capacity. Bringer animals (see below) can push the count over without warning if capacity hasn't been expanded. Buying Hay upgrades increases capacity. Starting capacity: 5 animals.

### Win Condition

Collect all 4 Legendary Animals into the Barn simultaneously during a single Night. Legendary Animals cost Mischief to acquire in the Trading Post and are available in limited supply per scenario.

### Multiplayer (Pass-and-Play)

- 2–6 players each maintain their own independent Herd.
- Players take turns performing their Night on the same device; the current player's phone is passed to the next.
- A "Pass the Phone" screen with a player-name prompt separates each turn, preventing peeking.
- All players' scores and Legendary Animal counts are visible on a shared scoreboard between turns.
- First player to win (collect all 4 Legendaries in one Night) wins the game.
- If multiple players achieve the win condition in the same round, the one with more total Mischief scored that night wins.

**Shared Trading Post (competitive market):**
- After all players have completed their Night, a single shared Trading Post opens.
- Players take turns (in turn order) selecting one animal to purchase, then passing.
- Each animal card in the market has limited stock — if one player buys a Wise Owl, there are fewer left for others.
- Legendary Animals in the market are especially contested: only 4 copies of each exist per scenario.
- The shared market creates meaningful player interaction and strategic tension without requiring real-time play.

### Single Player

- **Campaign Mode:** Five scenarios played in sequence (Old MacDonald → Harvest Moon). Each must be won to unlock the next. Mirrors Party House's structure.
- **Freeplay Mode:** Any scenario, any time. No unlock requirements.
- Win condition is the same in both modes.
- An optional "Speed Run" challenge (win in X Nights) is surfaced in Freeplay as a bonus objective.

---

## Starting Herd (All Players Begin With)

| Animal | Qty | Mischief | Hay | Ability |
|---|---|---|---|---|
| Barn Cat | 4 | +1 | — | None |
| Feral Goat | 4 | +2 | — | NOISY! (permanent, cannot be removed or acquired) |
| Pot-Bellied Pig | 2 | — | +1 | None |

*Feral Goats function like Wild Buddies — they are the core source of push-your-luck tension and cannot be removed from the Herd.*

---

## Animal Roster (Purchasable)

### Quiet Animals (No NOISY!)

| Animal | Cost | Mischief | Hay | Ability Type | Ability |
|---|---|---|---|---|---|
| Barn Cat (extra) | 2 | +1 | — | — | None |
| Pot-Bellied Pig (extra) | 3 | — | +1 | — | None |
| Bunny | 4 | +1 | — | Passive | Cancels NOISY! from one animal |
| Sheepdog | 4 | +2 | — | Active | Peek at next animal; accept or reject |
| Stable Hand (Scarecrow) | 4 | — | — | Active | Boot one animal (Penned Up next Night) |
| Hermit Crab | 4 | +1 | — | Triggered | +1 extra Mischief per empty Barn space at scoring |
| Hen | 4 | -1 | +2 | — | None |
| Border Collie | 5 | +2 | -1 | Active | Fetch a specific animal from your Herd into the Barn |
| Jester Crow | 5 | — | -1 | Triggered | +5 Mischief if Barn is completely full at end of Night |
| Magpie | 5 | +1 | -1 | Active | Score one other animal immediately; scored again at Night end |
| Draft Pony | 5 | +1 | — | Triggered | +1 Mischief per Barn Cat present at scoring |
| Milkmaid (Goat) | 5 | +4 | -1 | — | None (flat income) |
| Cheerful Lamb | 5 | +1 | — | Active | Refreshes all other animals' used active abilities |
| Trickster Fox | 5 | +1 | — | Active | Swap a non-Legendary animal in the Barn for a Legendary, or vice versa |
| Welcoming Ram | 5 | +1 | — | Triggered | Admits next animal immediately and scores it now; scored again at Night end |
| Honey Bee | 7 | +2 | — | Passive | Cancels NOISY! from one animal |
| Wise Owl | 8 | — | +2 | Active | Peek at next animal; accept or reject |
| Cupid Duck | 8 | +1 | — | Active | Boots two animals simultaneously (both Penned Up next Night) |
| Auctioneer Rooster | 9 | — | +3 | — | None |
| Wandering Mule | 9 | +2 | — | Active | Boot one animal (Penned Up next Night) |
| Harvest Mouse | 12 | Variable | — | Triggered | Mischief increases +1 each Night it enters the Barn; starts at +1; max +9 |

### NOISY! Animals (High Risk / High Reward)

| Animal | Cost | Mischief | Hay | Ability |
|---|---|---|---|---|
| Wild Boar | 3 | +4 | — | NOISY! |
| Strutting Peacock | 5 | +3 | +2 | NOISY! |
| Howling Hound | 5 | +4 | — | NOISY! on odd-numbered appearances only |
| Sneaky Raccoon | 6 | — | +4 | NOISY! |
| Stomping Bull | 7 | +2 | +3 | NOISY! |

### Synergy Animals (Reward keeping NOISY! animals)

| Animal | Cost | Mischief | Hay | Ability |
|---|---|---|---|---|
| Bard Frog | 8 | +1 | — | Triggered: +2 Mischief per unmitigated NOISY! in Barn at scoring |
| Barkeep Badger | 11 | +1 | — | Triggered: +2 Hay per unmitigated NOISY! in Barn at scoring |

### Bringer Animals (Summon Extra Animals — RISKY)

| Animal | Cost | Mischief | Hay | Ability |
|---|---|---|---|---|
| Bull Moose | 5 | +3 | — | **BRINGER:** On entry, automatically admits one random extra animal |
| Parade Llama | 11 | +2 | +3 | **BRINGER:** On entry, automatically admits two random extra animals |

*BRINGER label is always clearly displayed. These can trigger Barn Overwhelmed if capacity hasn't been expanded.*

### Scaling Animals

| Animal | Cost | Mischief | Hay | Ability |
|---|---|---|---|---|
| Piglet | 7 | Variable | — | 1 Piglet=+1, 2=+4, 3=+9, 4=+16 Mischief |
| Counselor Sheep | 7 | — | — | Active: removes NOISY! from all affected animals in Barn (disables Bard Frog/Barkeep Badger bonuses) |
| Stylist Peacock | 7 | — | -1 | Active: permanently adds +1 Mischief to one animal (max +9 total) |
| Groomsman Horse | 5 | +2 | — | Active: sends all current Barn animals back to Herd and reshuffles; resets draw order |

### Legendary Animals (Win Condition — Need All 4 Simultaneously)

| Animal | Cost | Ability |
|---|---|---|
| Golden Goose | 30 | — |
| Giant Ox | 35 | — |
| Jackalope | 40 | — |
| Thunderbird | 45 | — |
| Silver Mare | 45 | Passive: cancels NOISY! from one animal |
| Lucky Toad | 50 | — , +3 Hay |
| Great Stag | 50 | Active: boot one animal |
| Barn Dragon | 55 | Active: fetch a specific animal from Herd |

*Four of the eight Legendaries are available per scenario, randomized each game. Only those four can be purchased in that run.*

---

## Scenarios

Five scenarios with different available animal pools encourage different strategies. Scenarios vary which purchasable animals are available in the Trading Post and which Legendaries are in play.

| Scenario | Flavor | Strategy Lean |
|---|---|---|
| Old MacDonald's Farm | Default, balanced pool | Learning scenario |
| The Midnight Stampede | Heavy NOISY! pool, more synergy animals | High-risk builds |
| The Quiet Pasture | Few NOISY!, lots of mitigators | Efficiency/control builds |
| Fair Day | Many Bringer and Scaling animals | Snowball/combo builds |
| Harvest Moon | Full pool, harder Legendary costs | Expert mode |

---

## Economy

**Barn Capacity Expansion (Hay cost):**
Starting capacity: 5. Each additional slot costs 2, 3, 4, 5... Hay (incremental cost, same as Party House). Theoretical max is rarely needed.

**Inability to Pay Penalty:**
If an animal has a negative Hay cost and the player can't pay, they lose 7 Mischief per unpaid animal. (Same as Party House — this is intentional and punishing.)

**Release to the Wild (new mechanic):**
Once per Night, before drawing begins, a player may spend **3 Mischief** to permanently remove one animal from their Herd (excluding Feral Goats and Legendary Animals). This addresses the no-deck-thinning criticism while preserving the tension. The Mischief cost ensures it's a meaningful trade-off, not a free optimization.

---

## Art Direction

- **Style:** Classic pixel art, 16-bit era aesthetic (think Stardew Valley meets early Game Boy Color)
- **Palette:** Warm, earthy farm tones — barn reds, wheat yellows, grass greens, night sky blues
- **Animals:** Each animal has a small idle sprite (approx. 32×32 or 48×48px) with a simple 2-frame animation
- **UI:** Chunky pixel font, card-game-style layout
- **Night scene:** Barn interior with visible capacity slots; farmhouse in background with lantern window (NOISY! warning state)
- **Assets:** Sourced from free pixel art libraries (itch.io, OpenGameArt, Kenny.nl) under CC0 / permissive licenses

---

## Sound Direction

- **Retro SFX:** Chiptune-style 8-bit sounds for all interactions
- **Animal sounds:** Each animal type has a short, distinct retro sound on entry (rooster crow, goat bleat, dog bark, etc.)
- **Warning cue:** Distinct 2-note alert when second NOISY! animal enters (lantern light flicker + sound)
- **Bust sounds:** Farmer-wakes-up bust = loud alarm/rooster; Barn overwhelmed = crashing/thud
- **Win jingle:** Short triumphant chiptune fanfare
- **Background:** Optional looping ambient night farm ambience (crickets, wind, soft chiptune)
- **Assets:** Sourced from free SFX libraries (freesound.org, CC0 chiptune packs)

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Game framework | **Phaser 3** | Battle-tested HTML5 game framework; handles canvas, input, audio, scenes, asset loading; mobile-friendly; GitHub Pages compatible |
| Language | **TypeScript** | Type safety helps with card ability systems and game state complexity |
| Build tool | **Vite** | Fast dev server, simple GitHub Pages deployment |
| Styling | Phaser scenes (no CSS framework needed) | Game UI rendered entirely on canvas |
| Deployment | **GitHub Pages** via `gh-pages` branch | Static output from Vite build |
| Asset pipeline | Vite asset handling + Phaser asset loader | Standard |

No backend. All state is local to the browser session.

---

## Platform Requirements

- **Mobile-first:** Playable on iOS/Android browsers (Safari, Chrome). Touch input for all interactions. No hover-dependent UI.
- **Desktop:** Also fully playable via mouse. Keyboard shortcuts optional.
- **Screen sizes:** Responsive canvas scaling from 375px (iPhone SE) to 1440px desktop. Fixed aspect ratio with letterboxing.
- **Pass-and-Play:** "Pass the Phone" interstitial screen between turns — displays next player's name, blurs/hides previous state. Player taps to begin their turn.
- **No accounts, no server, no install** — pure browser, works offline after first load.

---

## Project Phases (Suggested Sprint Breakdown)

1. **Foundation** — Project scaffolding, Phaser 3 + Vite + TypeScript setup, GitHub Pages CI, basic barn scene renders
2. **Core Loop** — Herd/deck engine, draw mechanic, bust conditions, single-player Night resolves correctly
3. **Economy** — Mischief/Hay scoring, Trading Post shop, Barn capacity expansion
4. **Starting Animals + Basic Abilities** — Starting Herd working, first wave of purchasable animals with passive/triggered abilities
5. **Active Abilities + Combos** — Full active ability system (fetch, boot, peek, refresh, etc.)
6. **Legendary Animals + Win Condition** — Legendary acquisition, 4-simultaneously win check
7. **Scenarios** — Five scenario definitions with different animal pools
8. **Pass-and-Play Multiplayer** — Turn management, Pass the Phone screen, shared scoreboard, shared competitive Trading Post with limited stock
9. **Art Pass** — Replace placeholder art with pixel art assets; animal sprites with idle animations
10. **Sound Pass** — All SFX, warning cues, bust sounds, win jingle, ambient loop
11. **Polish + QA** — Mobile QA, edge cases, performance, accessibility basics, release

---

## Success Criteria (Full Product)

- A solo game can be played start-to-finish in the browser on mobile and desktop
- Pass-and-play works for 2–6 players on a single device
- All five scenarios are playable with distinct strategic feel
- No game-breaking bugs in bust conditions, scoring, or win detection
- Page loads and is playable from GitHub Pages URL
- Art and sound assets are all free/permissive licensed (documented in `/docs/CREDITS.md`)
- Local high scores persist across sessions (localStorage) for solo campaign and freeplay
- Legendary Animals have distinct animated/glowing visual treatment to signal their win-condition importance

---

## Resolved Decisions

| Question | Decision |
|---|---|
| Trading Post structure | Shared competitive market — players draft in turn order after all Nights complete |
| Release to the Wild cost | Costs 3 Mischief per use (once per Night) |
| Single-player modes | Both: sequential Campaign (5 scenarios unlocked in order) + open Freeplay |
| Local high scores | Yes — persisted in localStorage per scenario and mode |
| Legendary Animal visuals | Yes — animated/glowing treatment to distinguish from regular animals |
