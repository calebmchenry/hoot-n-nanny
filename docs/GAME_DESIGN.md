Hoot N' Nanny is a push your luck deck builder (although there are no actual cards)

Nomenclature (left side is the verbiage used in Hoot N' Nanny):
* Animal: "card"
* Invite: "draw card"
* Farm: "deck"
* Wake up the farmer: bust
* Trading post: Shop
* Call it a night: finish drawing cards and score then move onto the trading post

There are four types of powers:
1. Immediate: powers that happen immediately when drawn
2. Passive: powers are always in play
3. Activate: powers that require player to activate
4. End of night: powers that happen at the end of the night

Currency:
1. Pop - "Popularity"
2. Cash

| Power  | Description                                    |
| ------ | ---------------------------------------------- |
| Noisy  | Passive: 3 noisy animals and you bust           |
| Stacks | Passive: duplicates of this card stack on the same spot |
| Calm   | Passive: neutralizes 1 noisy animal              |
| Fetch  | Activate: pick an animal from the farm          |
| Kick   | Activate: kick out an animal from the barn      |
| Peek   | Activate: see the next animal in the farm      |
| Flock  | End of night: scores bonus Pop for each other animal with Flock in the barn |
| Sneak  | Passive: doesn't take up a barn slot            |
| Encore | Passive: gains 1 Pop each time it enters the barn (starts at 0) |
| Rowdy  | Immediate: automatically invites another guest from the farm |
| Upkeep | End of night: costs 1 Cash at scoring            |

Regular animals cost 2–12 Pop. Cheap animals have drawbacks, expensive ones have strong abilities.

| Animal        | Power  | Currency | Cost        |
| ------------- | ------ | -------- | ----------- |
| Goat          | Noisy  | 2 Pop    | not in shop |
| Bull          | Rowdy  | 2 Pop    | 2 Pop       |
| Goose         | Noisy  | 3 Pop    | 2 Pop       |
| Chicken       | None   | 1 Pop    | 3 Pop       |
| Pig           | None   | 1 Cash   | 3 Pop       |
| Cow           | Upkeep | 3 Pop    | 4 Pop       |
| Mouse         | Sneak  | 1 Cash   | 4 Pop       |
| Owl           | Peek   | 1 Pop    | 5 Pop       |
| Barn Cat      | Calm   | 1 Cash   | 6 Pop       |
| Sheep         | Flock  | 1 Pop    | 6 Pop       |
| Swan          | Encore | 0 Pop    | 7 Pop       |
| Bunny         | Stacks | 1 Pop    | 8 Pop       |
| Border Collie | Fetch  | 1 Pop    | 10 Pop      |
| Donkey        | Kick   | 2 Pop    | 12 Pop      |

Blue ribbon animals cost 25–65 Pop. A cost of 40 is the baseline: no power, no currency.

| Animal    | Power    | Currency | Cost   |
| --------- | -------- | -------- | ------ |
| Chimera   | None     | 0        | 40 Pop |
| Jackalope | Stacks   | 2 Pop    | 45 Pop |
| Unicorn   | Calm     | 0        | 50 Pop |
| Griffin   | Fetch    | 1 Pop    | 55 Pop |
| Dragon    | Kick     | 2 Pop    | 60 Pop |


Initial setup:
* 0 pop
* 0 cash
* 3 goats
* 2 pigs
* 2 chickens
* 5 barn capacity

## Controls
Should accept key controls (arrow keys + enter) or mouse

## Scoring
When the player calls it a night, scoring happens in this order:
1. Score Pop from animals in the barn
2. Score Cash from animals in the barn
3. Pay any Cash costs (e.g. Upkeep). If the player can't afford a Cash cost, they lose 5 Pop instead.
4. End of night abilities trigger (e.g. Flock)

## Game loop:
A night counter should be displayed tracking which night the player is on.

### Phase 1: Hootenanny
Starts with an empty barn. Invite animals from the farm to add them to your barn. You only score the animals in your barn. The player can choose to "call it a night" early at any time. Once your barn is at capacity you can no longer invite guests; if there are no other actions available it should auto-call it a night. If for any reason you are forced to invite another guest when you are at capacity you bust. If you bust you do not get to score and instead move straight into the trading post. When busting you get to temporarily pin one of your animals and it is removed from your farm for the next night.

#### Visuals
The background should feel like the interior of a barn being used as a makeshift party space — string lights draped between exposed rafters, hay bales shoved to the sides, a worn plank floor cleared for dancing. Scrappy and improvised but warm and inviting, like someone threw a party with whatever was lying around and it turned out better than expected. Cozy chaos.

The barn should be divided into 40 blocks (4 rows, 10 columns). Slots the player hasn't unlocked yet should be greyed out. First slot is a window; when selected it should show the animals left on the farm (not in draw order, but ordered by animal type). The second slot should be a door that when selected invites an animal. Animals occupy the first available slot. Slots fill left to right and then top down (like text on a page). If an animal is ever removed all animals after it fill in. Animals should have the same appearance as in the shops but don't need to show the stock quantity or cost. When an activate ability has been used, its icon should be hidden. When the player is at capacity, any unused activate abilities should flash tastefully to remind the player they have options before calling it a night.

### Phase 2: Shop
Use currency to buy more animals for your farm. Each shop stocks 10 regular animals and 2 blue ribbon animals, drawn from a larger pool of animal types to add variety between games. The player can also buy additional barn capacity for cash; the price increases with each upgrade.

#### Visuals
Each animal in the shop should have its image, supply quantity, cost, ability icon, and scoring currencies visible. When an animal is focused or hovered over, an explanation of its ability and scoring currencies should be available as text. When nothing is focused or hovered over, "Shop for upgrades" should be displayed. Player can end the shop phase with a "hootenanny" option. When an animal is focused or hovered it should have a walking in place animation.

### Win condition
The shop stocks 2 blue ribbon animals (unlimited supply). Have 3 blue ribbon animals in the barn when you call it a night to win the game.

# Audio
Overall feel should be retro + country.

## Music
* **Barn party track** — upbeat, short loop with a party energy. Think chiptune hoedown.
* **Shop track** — more relaxed, browsing feel. Still country but laid back.

## Sound effects
* **Animal entry** — each animal type should have a short animal noise clip when it enters the barn.
* **Bust** — a record scratch or sudden silence followed by a rooster crow (farmer waking up).
* **Scoring jingle** — short celebratory fiddle flourish when Pop/Cash tallies up.
* **Purchase** — cash register "cha-ching" or coin clink when buying at the shop.
* **Activate ability** — subtle pluck or chime when triggering an activate ability.
* **Win fanfare** — bigger celebratory tune when you get 3 blue ribbons. Hoedown breakdown.
* **UI navigation** — soft clicks or wooden tap sounds for hovering, selecting, and navigating slots.

# Art style
For now get sprite sheets for animals from [here](https://www.spriters-resource.com/pc_computer/stardewvalley)
