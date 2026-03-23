import type { AnimalId, AnimalPowerId, NightOutcome, TargetingKind } from '../game/types';

interface AnimalCopyEntry {
  flavor: string;
  rules: string;
  shopPitch: string;
}

interface PowerCopyEntry {
  label: string;
  rules: string;
}

interface OutcomeCopyEntry {
  heading: string;
  support: string;
  cta: string;
}

interface TargetingCopyEntry {
  title: string;
  support: string;
}

export const ANIMAL_COPY: Record<AnimalId, AnimalCopyEntry> = {
  goat: {
    flavor: 'Tin-can tenor with no inside voice and no regrets.',
    rules: 'Gives +2 Pop. Counts as Noisy, and 3 effective Noisy causes a bust.',
    shopPitch: 'Loud crowd fuel that prints quick Pop if you can manage the noise.'
  },
  bull: {
    flavor: 'Kicks down the door and drags a plus-one with it.',
    rules: 'Gives +2 Pop. Rowdy immediately invites one extra guest.',
    shopPitch: 'Fast pressure piece that snowballs invites in a hurry.'
  },
  goose: {
    flavor: 'Honk cannon in a feather coat.',
    rules: 'Gives +3 Pop. Counts as Noisy toward bust checks.',
    shopPitch: 'High Pop for cheap, but every honk pushes you toward bust.'
  },
  chicken: {
    flavor: 'Shows up early, brings vibes, forgets snacks.',
    rules: 'Gives +1 Pop. No special power.',
    shopPitch: 'Simple value body for smoothing early turns.'
  },
  pig: {
    flavor: 'Quietly works the room and leaves with a full tip jar.',
    rules: 'Gives +1 Cash. No special power.',
    shopPitch: 'Reliable cash flow that keeps upgrades online.'
  },
  cow: {
    flavor: 'Big dance floor energy, expensive rider.',
    rules: 'Gives +3 Pop. Upkeep costs 1 Cash at scoring or you lose 5 Pop.',
    shopPitch: 'Great Pop output if your cash engine can feed it.'
  },
  mouse: {
    flavor: 'Sneaks through rafters and steals the best seat anyway.',
    rules: 'Gives +1 Cash. Sneak does not use a barn slot.',
    shopPitch: 'Free slot efficiency plus cash in one tiny package.'
  },
  owl: {
    flavor: 'Knows who is next and makes sure you know it too.',
    rules: 'Gives +1 Pop. Peek reveals the next animal in the draw pile once per night.',
    shopPitch: 'Control pick that removes door randomness when timing matters.'
  },
  'barn-cat': {
    flavor: 'Professional shusher with claws for enforcement.',
    rules: 'Gives +1 Cash. Calm neutralizes 1 Noisy while in the barn.',
    shopPitch: 'Noise insurance that buys space for louder lineups.'
  },
  sheep: {
    flavor: 'Follows the flock, then charges for the encore.',
    rules: 'Gives +1 Pop. Flock gets bonus Pop for each other Flock at scoring.',
    shopPitch: 'Scaling Pop core that wants pack play.'
  },
  swan: {
    flavor: 'Arrives prettier every night and absolutely knows it.',
    rules: 'Encore gains +1 Pop each time this copy enters the barn.',
    shopPitch: 'Slow burn carry that ramps over repeated nights.'
  },
  bunny: {
    flavor: 'One bunny is cute. Eight bunnies are a logistics problem.',
    rules: 'Gives +1 Pop. Stacks copies share one barn slot.',
    shopPitch: 'Stack engine that multiplies value without eating capacity.'
  },
  'border-collie': {
    flavor: 'Looks you in the eye and fetches exactly who you called.',
    rules: 'Gives +1 Pop. Fetch lets you choose any draw-pile target once per night.',
    shopPitch: 'Precision tutor for high-control nights.'
  },
  donkey: {
    flavor: 'Bouncer boots first, asks questions never.',
    rules: 'Gives +2 Pop. Kick removes one chosen barn guest once per night.',
    shopPitch: 'Safety valve that clears noise or dead weight on demand.'
  },
  chimera: {
    flavor: 'Three heads, one glitter jacket, zero chill.',
    rules: 'Blue ribbon guest. No power and no base rewards.',
    shopPitch: 'Pure blue-ribbon progress toward the win condition.'
  },
  jackalope: {
    flavor: 'Mythical rabbit that multiplies like paperwork errors.',
    rules: 'Blue ribbon. Gives +2 Pop and uses Stacks for slot efficiency.',
    shopPitch: 'Win-condition piece that still contributes real Pop.'
  },
  unicorn: {
    flavor: 'Sparkly, smug, and weirdly good at crowd control.',
    rules: 'Blue ribbon. Calm neutralizes 1 Noisy while in the barn.',
    shopPitch: 'Premium stabilizer for loud late-game boards.'
  },
  griffin: {
    flavor: 'Half eagle, half lion, full-time talent scout.',
    rules: 'Blue ribbon. Gives +1 Pop and can Fetch once per night.',
    shopPitch: 'Blue-ribbon control tool with consistent Pop output.'
  },
  dragon: {
    flavor: 'Breathes fire and enforces a strict no-drama policy.',
    rules: 'Blue ribbon. Gives +2 Pop and can Kick once per night.',
    shopPitch: 'Blue-ribbon closer that also solves board problems.'
  }
};

export const POWER_COPY: Record<AnimalPowerId, PowerCopyEntry> = {
  none: {
    label: 'No Power',
    rules: 'No extra ability. Only the listed Pop and Cash rewards apply.'
  },
  noisy: {
    label: 'Noisy',
    rules: 'Counts toward bust checks. Bust at 3 effective Noisy after Calm.'
  },
  stacks: {
    label: 'Stacks',
    rules: 'Duplicate copies share one slot instead of using extra capacity.'
  },
  calm: {
    label: 'Calm',
    rules: 'Neutralizes 1 Noisy while this animal is in the barn.'
  },
  fetch: {
    label: 'Fetch',
    rules: 'Activate once per night to invite any chosen draw-pile animal.'
  },
  kick: {
    label: 'Kick',
    rules: 'Activate once per night to remove one chosen barn resident.'
  },
  peek: {
    label: 'Peek',
    rules: 'Activate once per night to reveal the next draw-pile animal.'
  },
  flock: {
    label: 'Flock',
    rules: 'End of night: gain bonus Pop for each other Flock resident.'
  },
  sneak: {
    label: 'Sneak',
    rules: 'This resident does not consume a barn slot.'
  },
  encore: {
    label: 'Encore',
    rules: 'This copy gains +1 Pop every time it enters the barn.'
  },
  rowdy: {
    label: 'Rowdy',
    rules: 'Immediate: invites one extra guest as soon as it enters.'
  },
  upkeep: {
    label: 'Upkeep',
    rules: 'End of night: pay 1 Cash or lose 5 Pop.'
  }
};

export const OUTCOME_COPY: Record<NightOutcome, OutcomeCopyEntry> = {
  'bust-to-shop': {
    heading: 'Farmer Woke Up!',
    support: 'No score tonight. Pin one guest, regroup, and visit the Trading Post.',
    cta: 'Trading Post'
  },
  'score-to-shop': {
    heading: 'Night Complete',
    support: 'Tallies are in. Spend your winnings before the next hootenanny.',
    cta: 'Trading Post'
  },
  'score-to-win': {
    heading: 'Blue Ribbon Victory!',
    support: 'Three blue ribbons in one barn. That party goes down in legend.',
    cta: 'Celebrate'
  }
};

export const TARGETING_COPY: Record<TargetingKind, TargetingCopyEntry> = {
  fetch: {
    title: 'Who should the collie fetch?',
    support: 'Choose one guest from the farm draw pile.'
  },
  kick: {
    title: 'Who gets the boot?',
    support: 'Choose one guest to remove from the barn.'
  },
  pin: {
    title: 'Pin one guest for next night',
    support: 'Pinned guests skip the next draw, then return after that night.'
  }
};

export const UI_COPY = {
  inspectorIdle: 'Pick a slot to inspect. Cozy chaos loves a plan.',
  doorHint: 'Door duty: invite the next guest from the draw pile.',
  windowHint: 'Window view: remaining farm guests by species.',
  abilityReadyHint: 'At capacity? Activate abilities still work before you call it.',
  abilitySpentHint: 'Ability spent for this night.',
  shopIdle: 'Shop for upgrades.',
  shopCapacityBlurb: 'Spend Cash to add one more barn slot.',
  shopHootenannyBlurb: 'Take your new lineup back into the barn.',
  summaryEmpty: 'No scoring events tonight.',
  summarySkipHint: 'Click, tap, or press Enter to skip tally.',
  pinnedLabel: 'Pinned for next night',
  winSubtitle: 'Blue ribbons, big bragging rights, same dusty barn.',
  nightStartQuips: [
    'Lanterns are lit. Let the hootenanny begin.',
    'Barn doors creak open and chaos clocks in.',
    'Another night, another chance to not wake the farmer.',
    'The hay is down and the dance floor is open.'
  ],
  scoreQuips: [
    'Count the cheers, count the coins, keep it moving.',
    'The party books are open. Let us tally.',
    'That barn did numbers tonight.',
    'Scratch marks on the ledger, stars in your eyes.'
  ],
  bustQuips: [
    'Too loud. Too late. The rooster heard everything.',
    'Barn busted. Save one friend and hit the Trading Post.',
    'The farmer is awake and not amused.',
    'Party over. Damage control starts now.'
  ],
  shopQuips: [
    'Fresh critters, fair deals, no refunds.',
    'Spend Pop smart and keep Cash for upgrades.',
    'Trading Post special: one more risky idea.',
    'Browse first. Buy loud second.'
  ],
  winQuips: [
    'Three ribbons in one barn. Unreal scenes.',
    'You threw a legendary party in a drafty shed.',
    'Blue ribbon stack achieved. Take a bow.',
    'That is how you run a hootenanny.'
  ]
} as const;

const pickFrom = <T extends string>(items: readonly T[], seed: number): T => items[Math.abs(seed) % items.length];

export const getNightStartQuip = (nightNumber: number): string => pickFrom(UI_COPY.nightStartQuips, nightNumber - 1);

export const getScoreQuip = (nightNumber: number): string => pickFrom(UI_COPY.scoreQuips, nightNumber - 1);

export const getBustQuip = (nightNumber: number): string => pickFrom(UI_COPY.bustQuips, nightNumber - 1);

export const getShopQuip = (nightNumber: number): string => pickFrom(UI_COPY.shopQuips, nightNumber - 1);

export const getWinQuip = (nightNumber: number): string => pickFrom(UI_COPY.winQuips, nightNumber - 1);
