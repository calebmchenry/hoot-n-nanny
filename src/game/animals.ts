import type { AnimalDef, AnimalId, ShopAnimalId } from './types';

const animalDefs: Record<AnimalId, AnimalDef> = {
  BarnCat: {
    id: 'BarnCat',
    name: 'Barn Cat',
    costMischief: null,
    mischief: 1,
    hay: 0,
    noisy: false,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: false,
  },
  FeralGoat: {
    id: 'FeralGoat',
    name: 'Feral Goat',
    costMischief: null,
    mischief: 2,
    hay: 0,
    noisy: true,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: false,
  },
  PotBelliedPig: {
    id: 'PotBelliedPig',
    name: 'Pot-Bellied Pig',
    costMischief: null,
    mischief: 0,
    hay: 1,
    noisy: false,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: false,
  },
  Bunny: {
    id: 'Bunny',
    name: 'Bunny',
    costMischief: 4,
    mischief: 1,
    hay: 0,
    noisy: false,
    noisyMitigation: 1,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: true,
  },
  Hen: {
    id: 'Hen',
    name: 'Hen',
    costMischief: 4,
    mischief: -1,
    hay: 2,
    noisy: false,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: true,
  },
  WildBoar: {
    id: 'WildBoar',
    name: 'Wild Boar',
    costMischief: 3,
    mischief: 4,
    hay: 0,
    noisy: true,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: true,
  },
  HermitCrab: {
    id: 'HermitCrab',
    name: 'Hermit Crab',
    costMischief: 4,
    mischief: 1,
    hay: 0,
    noisy: false,
    noisyMitigation: 0,
    givesHermitCrabBonus: true,
    givesDraftPonyBonus: false,
    inShop: true,
  },
  DraftPony: {
    id: 'DraftPony',
    name: 'Draft Pony',
    costMischief: 5,
    mischief: 1,
    hay: 0,
    noisy: false,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: true,
    inShop: true,
  },
  StruttingPeacock: {
    id: 'StruttingPeacock',
    name: 'Strutting Peacock',
    costMischief: 5,
    mischief: 3,
    hay: 2,
    noisy: true,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: true,
  },
  MilkmaidGoat: {
    id: 'MilkmaidGoat',
    name: 'Milkmaid Goat',
    costMischief: 5,
    mischief: 4,
    hay: -1,
    noisy: false,
    noisyMitigation: 0,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: true,
  },
  HoneyBee: {
    id: 'HoneyBee',
    name: 'Honey Bee',
    costMischief: 7,
    mischief: 2,
    hay: 0,
    noisy: false,
    noisyMitigation: 1,
    givesHermitCrabBonus: false,
    givesDraftPonyBonus: false,
    inShop: true,
  },
};

export const STARTING_HERD = [
  { animalId: 'BarnCat', quantity: 4 },
  { animalId: 'FeralGoat', quantity: 4 },
  { animalId: 'PotBelliedPig', quantity: 2 },
] as const satisfies ReadonlyArray<{ animalId: AnimalId; quantity: number }>;

export const SHOP_ANIMALS = [
  animalDefs.Bunny,
  animalDefs.Hen,
  animalDefs.WildBoar,
  animalDefs.HermitCrab,
  animalDefs.DraftPony,
  animalDefs.StruttingPeacock,
  animalDefs.MilkmaidGoat,
  animalDefs.HoneyBee,
] as const;

export const SHOP_ANIMAL_IDS = SHOP_ANIMALS.map((animal) => animal.id) as ReadonlyArray<ShopAnimalId>;

export const ALL_ANIMALS = Object.values(animalDefs) as ReadonlyArray<AnimalDef>;

export const getAnimalDef = (animalId: AnimalId): AnimalDef => {
  return animalDefs[animalId];
};

export const isShopAnimalId = (animalId: AnimalId): animalId is ShopAnimalId => {
  return SHOP_ANIMAL_IDS.includes(animalId as ShopAnimalId);
};
