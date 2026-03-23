import type { AnimalDefinition, AnimalId, OwnedAnimal } from './types';

export const ANIMALS: Record<AnimalId, AnimalDefinition> = {
  goat: {
    id: 'goat',
    name: 'Goat',
    costPop: 0,
    currencies: { pop: 2, cash: 0 },
    power: 'noisy',
    powerType: 'passive',
    blueRibbon: false
  },
  bull: {
    id: 'bull',
    name: 'Bull',
    costPop: 2,
    currencies: { pop: 2, cash: 0 },
    power: 'rowdy',
    powerType: 'immediate',
    blueRibbon: false
  },
  goose: {
    id: 'goose',
    name: 'Goose',
    costPop: 2,
    currencies: { pop: 3, cash: 0 },
    power: 'noisy',
    powerType: 'passive',
    blueRibbon: false
  },
  chicken: {
    id: 'chicken',
    name: 'Chicken',
    costPop: 3,
    currencies: { pop: 1, cash: 0 },
    power: 'none',
    powerType: 'none',
    blueRibbon: false
  },
  pig: {
    id: 'pig',
    name: 'Pig',
    costPop: 3,
    currencies: { pop: 0, cash: 1 },
    power: 'none',
    powerType: 'none',
    blueRibbon: false
  },
  cow: {
    id: 'cow',
    name: 'Cow',
    costPop: 4,
    currencies: { pop: 3, cash: 0 },
    power: 'upkeep',
    powerType: 'end-of-night',
    blueRibbon: false
  },
  mouse: {
    id: 'mouse',
    name: 'Mouse',
    costPop: 4,
    currencies: { pop: 0, cash: 1 },
    power: 'sneak',
    powerType: 'passive',
    blueRibbon: false
  },
  owl: {
    id: 'owl',
    name: 'Owl',
    costPop: 5,
    currencies: { pop: 1, cash: 0 },
    power: 'peek',
    powerType: 'activate',
    blueRibbon: false
  },
  'barn-cat': {
    id: 'barn-cat',
    name: 'Barn Cat',
    costPop: 6,
    currencies: { pop: 0, cash: 1 },
    power: 'calm',
    powerType: 'passive',
    blueRibbon: false
  },
  sheep: {
    id: 'sheep',
    name: 'Sheep',
    costPop: 6,
    currencies: { pop: 1, cash: 0 },
    power: 'flock',
    powerType: 'end-of-night',
    blueRibbon: false
  },
  swan: {
    id: 'swan',
    name: 'Swan',
    costPop: 7,
    currencies: { pop: 0, cash: 0 },
    power: 'encore',
    powerType: 'passive',
    blueRibbon: false
  },
  bunny: {
    id: 'bunny',
    name: 'Bunny',
    costPop: 8,
    currencies: { pop: 1, cash: 0 },
    power: 'stacks',
    powerType: 'passive',
    blueRibbon: false
  },
  'border-collie': {
    id: 'border-collie',
    name: 'Border Collie',
    costPop: 10,
    currencies: { pop: 1, cash: 0 },
    power: 'fetch',
    powerType: 'activate',
    blueRibbon: false
  },
  donkey: {
    id: 'donkey',
    name: 'Donkey',
    costPop: 12,
    currencies: { pop: 2, cash: 0 },
    power: 'kick',
    powerType: 'activate',
    blueRibbon: false
  },
  chimera: {
    id: 'chimera',
    name: 'Chimera',
    costPop: 40,
    currencies: { pop: 0, cash: 0 },
    power: 'none',
    powerType: 'none',
    blueRibbon: true
  },
  jackalope: {
    id: 'jackalope',
    name: 'Jackalope',
    costPop: 45,
    currencies: { pop: 2, cash: 0 },
    power: 'stacks',
    powerType: 'passive',
    blueRibbon: true
  },
  unicorn: {
    id: 'unicorn',
    name: 'Unicorn',
    costPop: 50,
    currencies: { pop: 0, cash: 0 },
    power: 'calm',
    powerType: 'passive',
    blueRibbon: true
  },
  griffin: {
    id: 'griffin',
    name: 'Griffin',
    costPop: 55,
    currencies: { pop: 1, cash: 0 },
    power: 'fetch',
    powerType: 'activate',
    blueRibbon: true
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    costPop: 60,
    currencies: { pop: 2, cash: 0 },
    power: 'kick',
    powerType: 'activate',
    blueRibbon: true
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
