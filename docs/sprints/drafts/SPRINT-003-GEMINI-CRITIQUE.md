# Sprint 003 Critique — Gemini (Contrarian Perspective)

## 1. Scope — This Is Two Sprints Wearing a Trenchcoat

Both drafts attempt to deliver four distinct systems in a single sprint: card readability overhaul, info panel, active abilities (four of them, each with unique UI flows), and a Legendary win condition with Trading Post integration. That is not a sprint; it is a roadmap milestone.

The Claude draft is the worse offender. It breaks work into **eight implementation phases**, lists **6 Legendary animals** (Codex lists 4), proposes a **new `src/game/abilities.ts` module** with 10+ exported functions, adds **Trading Post scrolling with inertia physics**, introduces **cancel support for abilities**, and demands **25+ new unit tests**. Codex is leaner but still proposes 5 phases, 12 new NightEvent variants, and a "major rewrite" of both `night.ts` and `session.ts`.

**What should be cut to make this a real sprint:**

- **Cut Trading Post scrolling.** Neither draft acknowledges how much work touch-scroll with inertia, drag thresholds, and camera manipulation is in Phaser. This is an entire feature. If you only have 4 Legendaries (Codex) or even 6 (Claude), just put them in a second "page" with a Next/Prev button or reduce the regular stock display. Scrolling is a rabbit hole.
- **Cut 2 of the 4 active abilities.** Ship Sheepdog (peek) and Stable Hand (boot) first. Border Collie (fetch) requires a selection UI over deck contents, which introduces information-revelation questions neither draft fully resolves (Claude's Open Question #4 admits this). Cheerful Lamb (refresh) is a meta-ability that only matters once you have multiple active-ability animals, which you will not in a first playthrough if only 2 exist. Defer Collie and Lamb to Sprint 004.
- **Cut the info panel from Sprint 003 scope.** The card readability overhaul (bigger badges, trait chips, NOISY banner) directly addresses the user's complaint: "It is hard to see the mischief and hay indicators." If the cards are readable at a glance, the info panel becomes a nice-to-have, not a blocker. The long-press interaction pattern introduces tricky timing conflicts with ability tap activation that both drafts acknowledge but neither fully solves. Defer to Sprint 004 when ability UX is stable.

With these cuts, the sprint becomes: card readability + 2 abilities + Legendary win condition. That is still ambitious but actually deliverable.

## 2. Complexity Budget — Abilities Are Over-Engineered for a First Pass

Both drafts model abilities through a `PendingDecision`/`PendingAbility` state machine that pauses the game loop, transitions to a new `GamePhase.AbilityPending`/`AbilityDecision`, waits for player input, then resumes with bust/win checks. This is architecturally sound for a mature game engine. It is over-engineered for the first time abilities appear in the codebase.

**Specific concerns:**

- **Claude's `cancelAbilityInSession`** (Phase 5, line ~719) adds a third resolution path (accept/reject/cancel) for boot and fetch. Cancel-without-consuming is forgiving, but it means every ability UI needs three exit paths, and the state machine has to handle "player opened a prompt and then backed out" cleanly. This will generate bugs.
- **Codex's `PendingDecision` discriminated union** (Architecture section, lines 88-91) has three variants with different payload shapes. This is correct but demands that every consumer (session reducers, scene UI, event handlers) exhaustively handle all three. For a first implementation of 4 abilities, a simpler approach would be a single `pendingAbility: { abilityId, sourceCardId, context: unknown }` with ability-specific handlers casting the context.
- **Both drafts add 10-15 new NightEvent types.** Claude adds: `ability_ready`, `ability_activated`, `peek_revealed`, `peek_accepted`, `peek_rejected`, `animal_booted`, `animal_fetched`, `abilities_refreshed`, `win_condition_met`, `info_panel_opened`, `info_panel_closed`. That is 11 new event types. Codex adds 12. Every event type needs scene-side handling (animation mapping). A simpler first pass would be 4-5 events: `ability_activated`, `ability_resolved`, `ability_cancelled`, `win_triggered`, and let the scene infer animation details from the ability ID and outcome.
- **Cheerful Lamb's refresh mechanic** is particularly premature. Claude correctly notes (Risk table, line ~907) "Scope creep into more abilities" as a risk, then proceeds to implement a meta-ability that only has strategic value when multiple active-ability animals coexist. In Sprint 003, the player is unlikely to have more than 1-2 active-ability animals in the barn simultaneously. Refresh will feel like a wasted slot 90% of the time.

## 3. UX Concerns — Mobile Experience Is Under-Examined

### Info Panel

- **Claude proposes a 300px-tall info panel** starting at y=544. On an 844px screen, that panel covers 35% of the viewport. The barn slots (Row 1 at y=156, Row 2 at y=274) will be partially or fully obscured. The player cannot see the cards they are trying to get information about while the info panel is open. Codex's panel is smaller (180px at y=556) but still covers the action bar and lower barn area.
- **Neither draft addresses what happens when the info panel is open and the game state changes** (e.g., a tween completes, an animation fires). Is the panel dismissed? Does it update? What if the card the panel describes gets booted while the panel is showing?
- **Long-press timing conflicts:** Claude uses 500ms, Codex uses 320ms. The CLAUDE.md convention says "No hover states" — both drafts introduce hover-like behavior that violates this principle. More importantly, neither draft addresses the fundamental UX ambiguity: a card in the barn can be **tapped** (to activate an ability) or **long-pressed** (to see info). Players will accidentally trigger abilities when they wanted info, and vice versa. Claude acknowledges this (Risks, line ~905) but the mitigation ("Tap always fires ability; hold always fires info panel") means a new player who wants to learn what an ability does before using it must long-press, read, dismiss, then tap. This is not intuitive.

### Ability Prompts

- **Fetch UI:** Claude proposes "a scrollable list overlay of fetchable animal names" (Phase 5, line ~721). On a 390px-wide screen, a scrollable list overlay for selecting an animal type is a poor mobile pattern. How tall is this overlay? How many items? If the deck has 15 unique animal types, the player is scrolling a list on top of a game screen. Codex does not specify the fetch UI at all beyond "selects a target animal type from available deck options" (Use Case 5), which is worse — it is undesigned.
- **Boot UI:** Both drafts highlight bootable cards with a pulsing outline, requiring the player to tap a specific card in the barn. At 88x88px (or 96x104 in Codex), barn cards at capacity 7-8 are closely packed. The tap target distinction between "I'm activating this card's ability" and "I'm selecting this card as a boot target" depends entirely on game phase. There is no visual affordance to distinguish these two tap-meaning states for a player who is not reading phase labels.

### Legendary Glow

- Both drafts specify pulsing glow animations on Legendary cards (Claude: 1200ms sine, Codex: 900ms sine + 1400ms shine sweep). On a small screen with 3 Legendaries glowing simultaneously, this will be visually noisy and distracting, especially in a game where the core mechanic is evaluating risk at a glance. The glow competes with the readability improvements.

## 4. Win Condition Balance — 3 Legendaries at 30-50 Mischief Is Poorly Analyzed

Neither draft does back-of-the-envelope math on whether this win condition is achievable in a reasonable number of Nights.

**Let me do it:**

- Legendaries cost 30, 35, 40, 45 Mischief (Codex) or 30, 35, 40, 45, 45, 50 (Claude).
- Cheapest 3 Legendaries: 30 + 35 + 40 = **105 Mischief** minimum.
- The player also needs capacity upgrades. Sprint 002 starts at capacity 5. Holding 3 Legendaries plus scoring animals requires at least capacity 6-7. Capacity upgrades cost Mischief too (costs not specified in these drafts but established in Sprint 002).
- Total Mischief budget for a win: ~120-150 minimum.
- How much Mischief does a typical Night earn? Neither draft says. Without tuning data, we are designing a win condition in the dark.
- **Legendaries have 0 Mischief and 0 Hay** (both drafts agree, except Claude's Lucky Toad at +3 Hay). This means every Legendary in the barn is a dead slot for scoring. Having 3 Legendaries in a capacity-7 barn leaves 4 slots for scoring animals. The player's earning power degrades as they approach the win condition. This creates a death spiral: the closer you are to winning, the less you earn per Night, making it harder to buy the last Legendary.
- **The Legendaries must be in the barn simultaneously during a single Night.** This means the player must draw all 3 from their herd without busting. With Legendaries at 0 Mischief, they do not contribute to Mischief-based busts (good), but they also do not contribute to Farmer Wakes Up noise. Wait — are any Legendaries NOISY? Neither draft specifies. Codex's roster table does not include a `noisy` column for Legendaries. Claude lists them with `-- / --` for Mischief/Hay but no noise data. If Legendaries are not NOISY, then they are "safe" draws that only risk Barn Overwhelmed (capacity). If they ARE noisy, the Farmer Wakes Up bust becomes a significant threat.
- **Codex's high-Mischief Legendaries** (Giant Ox at +8, Thunderbird at +9) are confusing. These values appear in the roster table but contradict "win-path cards" that should be safe to hold. If the Giant Ox adds +8 Mischief to the Night total, it actively helps you bust. Is this Mischief added to scoring or to bust threshold? The distinction is unclear. Claude's Legendaries at 0/0 are cleaner.

**Bottom line:** The win condition has not been playtested or even napkin-mathed. It could be a 10-Night achievement or a 50-Night grind, and nobody knows because earning rates are not modeled.

## 5. Missing User-Facing Considerations

### No Tutorial or Onboarding

The user's original complaint was "I can't tell if the animals have any abilities." Both drafts solve this by adding ability icons and an info panel, but neither addresses how a player learns what "tap to activate" means, what "ACTIVE" chip signifies, or why a card is pulsing amber. There is no first-use tooltip, no tutorial Night, no guided prompt.

Active abilities introduce a paradigm shift: for the first time, the player is expected to tap barn cards during a Night for reasons other than viewing info. Both drafts assume the player will discover this organically. They will not. The tap-to-activate affordance is invisible without prior knowledge.

### No Feedback on "Why Can't I Use This Ability?"

Both drafts specify conditions under which abilities cannot be activated (wrong phase, ability already used, deck empty for peek/fetch). Neither specifies what happens when a player taps an ability card that is not activatable. Does nothing happen? Is there a greyed-out visual? A shake animation? A toast message? Silent failure on tap is the worst possible mobile UX.

### No Legendary Progress Indicator Outside of Night

The win condition is "3 Legendaries in barn simultaneously during a Night." But between Nights (in Trading Post, or at Night start), how does the player know which Legendaries they own in their herd? How do they track progress toward the win condition? Neither draft addresses herd visibility or Legendary tracking in the Trading Post. The player is flying blind on their win-condition progress.

### Discoverability of Active Abilities in Trading Post

When buying a Sheepdog or Border Collie in the Trading Post, does the player see what the ability does before purchasing? Claude mentions "ability summaries" in Trading Post (Phase 6) but does not specify the UI. Codex mentions "ability summary lines on shop cards" (Phase 4 Tasks) but is equally vague. A player should not spend 4-5 Mischief on a card without knowing what it does.

## 6. Technical Risks Both Drafts Share

### Penned Up Stacking Is Under-Specified

Sprint 002 has a single `pendingPennedUpCardId` (one animal penned per Night). Boot introduces a second way to pen an animal. Both drafts acknowledge this (Claude Open Question #3, Codex `pendingPennedUpCardIds` array) but neither fully specifies the interaction: if a player boots Animal A, then busts and Animal B is penned from the bust, are both A and B penned next Night? Are both excluded from the herd for one Night each, or do they queue? What if the player boots two animals (via Cheerful Lamb refreshing Stable Hand)? The Codex draft has `activePennedUpCardIds` and `pendingPennedUpCardIds` as arrays but does not specify how multi-pen affects the next Night's deck.

### Bust Precedence Over Win

Both drafts state "bust takes precedence over win." Codex (line 195): "Win does not trigger if the same state transition also results in bust (bust precedence remains first)." But what scenario would trigger both simultaneously? If a fetched card causes capacity bust AND the fetched card is the 3rd Legendary, the player loses the Night despite having "won." This feels terrible from a player perspective and neither draft justifies the design choice or considers the alternative (win takes precedence).

### BarnScene Is Becoming a God Object

Both drafts list BarnScene as receiving: card readability rewrite, info panel, ability prompts (4 different UIs), Legendary glow effects, win overlay, and DOM phase updates. Claude's Phase 4 and Phase 5 together add ~15 tasks to BarnScene alone. The CLAUDE.md convention says "Scenes are thin: lifecycle hooks only." After Sprint 003, BarnScene will be anything but thin. Neither draft proposes extracting ability UI, info panel, or win overlay into separate modules or helper functions to keep BarnScene manageable.

### Deterministic Seed Verification Is Fragile

Both drafts propose named seeds (`sprint3-ability-peek`, `sprint3-win`, etc.) for verification. But the seed system produces deterministic deck order based on the herd composition. Adding 10 new animals to the herd/shop changes what cards appear in which order for ALL existing seeds. Neither draft addresses whether Sprint 002 seed verification will break due to the changed animal roster. If a Sprint 002 seed test expects "draw Barn Cat, then Feral Goat" and the new roster reshuffles the deck, those tests fail silently or noisily. Claude mentions "Existing seed verification patterns produce the same results" (DoD #14) but provides no analysis of whether this is actually true after adding 10 animals to the roster.

### App Chunk Budget

The current app chunk is 1.52 KB gzipped. The budget is 100 KB. Both drafts add substantial code: a new `abilities.ts` module, 10 new animal definitions, expanded type unions, expanded event handling, Trading Post scrolling (Claude), and extensive scene-side rendering logic. While 100 KB is generous, neither draft estimates the size impact or flags which additions are heaviest. The 10 new generated textures (Claude) are zero-cost on bundle but nonzero on memory — neither draft estimates texture memory impact on low-end devices.

## Summary

Both drafts are thorough architectural documents for a feature set that is too large for a single sprint. The core risk is not any individual technical decision — it is that delivering card readability + info panel + 4 active abilities + Legendary win condition + Trading Post changes in one pass will result in partial implementations across all features rather than polished delivery of any single one.

**Recommended scope for Sprint 003:** Card readability overhaul + 2 active abilities (Sheepdog, Stable Hand) + Legendary win condition (4 Legendaries, no scrolling). Defer info panel, Border Collie, Cheerful Lamb, and Trading Post scrolling to Sprint 004.
