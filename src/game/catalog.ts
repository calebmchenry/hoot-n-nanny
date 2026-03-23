import type { AnimalDefinition, AnimalId, OwnedAnimal } from './types';

export const ANIMALS: Record<AnimalId, AnimalDefinition> = {
  goat: {
    id: 'goat',
    name: 'Goat',
    costPop: 0,
    currencies: { pop: 2, cash: 0 },
    power: 'noisy',
    powerType: 'passive',
    blueRibbon: false,
    description: 'Noisy: contributes toward busting at 3 effective Noisy.'
  },
  bull: {
    id: 'bull',
    name: 'Bull',
    costPop: 2,
    currencies: { pop: 2, cash: 0 },
    power: 'rowdy',
    powerType: 'immediate',
    blueRibbon: false,
    description: 'Rowdy: invites another guest immediately.'
  },
  goose: {
    id: 'goose',
    name: 'Goose',
    costPop: 2,
    currencies: { pop: 3, cash: 0 },
    power: 'noisy',
    powerType: 'passive',
    blueRibbon: false,
    description: 'Noisy: contributes toward busting at 3 effective Noisy.'
  },
  chicken: {
    id: 'chicken',
    name: 'Chicken',
    costPop: 3,
    currencies: { pop: 1, cash: 0 },
    power: 'none',
    powerType: 'none',
    blueRibbon: false,
    description: 'No power.'
  },
  pig: {
    id: 'pig',
    name: 'Pig',
    costPop: 3,
    currencies: { pop: 0, cash: 1 },
    power: 'none',
    powerType: 'none',
    blueRibbon: false,
    description: 'No power.'
  },
  cow: {
    id: 'cow',
    name: 'Cow',
    costPop: 4,
    currencies: { pop: 3, cash: 0 },
    power: 'upkeep',
    powerType: 'end-of-night',
    blueRibbon: false,
    description: 'Upkeep: pay 1 Cash at scoring or lose 5 Pop.'
  },
  mouse: {
    id: 'mouse',
    name: 'Mouse',
    costPop: 4,
    currencies: { pop: 0, cash: 1 },
    power: 'sneak',
    powerType: 'passive',
    blueRibbon: false,
    description: "Sneak: doesn't consume a barn slot."
  },
  owl: {
    id: 'owl',
    name: 'Owl',
    costPop: 5,
    currencies: { pop: 1, cash: 0 },
    power: 'peek',
    powerType: 'activate',
    blueRibbon: false,
    description: 'Peek: reveal the next animal in the farm.'
  },
  'barn-cat': {
    id: 'barn-cat',
    name: 'Barn Cat',
    costPop: 6,
    currencies: { pop: 0, cash: 1 },
    power: 'calm',
    powerType: 'passive',
    blueRibbon: false,
    description: 'Calm: neutralizes one Noisy animal.'
  },
  sheep: {
    id: 'sheep',
    name: 'Sheep',
    costPop: 6,
    currencies: { pop: 1, cash: 0 },
    power: 'flock',
    powerType: 'end-of-night',
    blueRibbon: false,
    description: 'Flock: gains bonus Pop for each other Flock in the barn.'
  },
  swan: {
    id: 'swan',
    name: 'Swan',
    costPop: 7,
    currencies: { pop: 0, cash: 0 },
    power: 'encore',
    powerType: 'passive',
    blueRibbon: false,
    description: 'Encore: gains +1 Pop each time it enters the barn.'
  },
  bunny: {
    id: 'bunny',
    name: 'Bunny',
    costPop: 8,
    currencies: { pop: 1, cash: 0 },
    power: 'stacks',
    powerType: 'passive',
    blueRibbon: false,
    description: 'Stacks: duplicates share one slot.'
  },
  'border-collie': {
    id: 'border-collie',
    name: 'Border Collie',
    costPop: 10,
    currencies: { pop: 1, cash: 0 },
    power: 'fetch',
    powerType: 'activate',
    blueRibbon: false,
    description: 'Fetch: pick an animal from the farm to invite.'
  },
  donkey: {
    id: 'donkey',
    name: 'Donkey',
    costPop: 12,
    currencies: { pop: 2, cash: 0 },
    power: 'kick',
    powerType: 'activate',
    blueRibbon: false,
    description: 'Kick: remove an animal from the barn.'
  },
  chimera: {
    id: 'chimera',
    name: 'Chimera',
    costPop: 40,
    currencies: { pop: 0, cash: 0 },
    power: 'none',
    powerType: 'none',
    blueRibbon: true,
    description: 'Blue ribbon guest with no power.'
  },
  jackalope: {
    id: 'jackalope',
    name: 'Jackalope',
    costPop: 45,
    currencies: { pop: 2, cash: 0 },
    power: 'stacks',
    powerType: 'passive',
    blueRibbon: true,
    description: 'Stacks: duplicates share one slot.'
  },
  unicorn: {
    id: 'unicorn',
    name: 'Unicorn',
    costPop: 50,
    currencies: { pop: 0, cash: 0 },
    power: 'calm',
    powerType: 'passive',
    blueRibbon: true,
    description: 'Calm: neutralizes one Noisy animal.'
  },
  griffin: {
    id: 'griffin',
    name: 'Griffin',
    costPop: 55,
    currencies: { pop: 1, cash: 0 },
    power: 'fetch',
    powerType: 'activate',
    blueRibbon: true,
    description: 'Fetch: pick an animal from the farm to invite.'
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    costPop: 60,
    currencies: { pop: 2, cash: 0 },
    power: 'kick',
    powerType: 'activate',
    blueRibbon: true,
    description: 'Kick: remove an animal from the barn.'
  }
};

export const ANIMAL_IDS = Object.keys(ANIMALS) as AnimalId[];

export const REGULAR_SHOP_ELIGIBLE_IDS: AnimalId[] = [
  'bull',
  'goose',
  'chicken',
  'pig',
  'cow',
  'mouse',
  'owl',
  'barn-cat',
  'sheep',
  'swan',
  'bunny',
  'border-collie',
  'donkey'
];

export const BLUE_RIBBON_IDS: AnimalId[] = ['chimera', 'jackalope', 'unicorn', 'griffin', 'dragon'];

export const STARTER_RECIPE: ReadonlyArray<{ animalId: AnimalId; count: number }> = [
  { animalId: 'goat', count: 3 },
  { animalId: 'pig', count: 2 },
  { animalId: 'chicken', count: 2 }
];

export const makeInstanceId = (n: number): string => `animal-${n}`;

export const createOwnedAnimal = (animalId: AnimalId, nextInstanceNumber: number): OwnedAnimal => ({
  instanceId: makeInstanceId(nextInstanceNumber),
  animalId,
  encorePop: 0
});

export const getDefinition = (animalId: AnimalId): AnimalDefinition => ANIMALS[animalId];
