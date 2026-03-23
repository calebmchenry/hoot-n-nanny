import { ANIMALS, STARTER_RECIPE, createOwnedAnimal } from './catalog';
import { createSeededRng, shuffle, type Rng } from './rng';
import { generateShopStock } from './shop';
import type { AnimalId, GameState, NightState, OwnedAnimal } from './types';

const defaultNightState = (): NightState => ({
  drawPileIds: [],
  barnResidentIds: [],
  usedAbilityIds: [],
  peekedNextId: null,
  bust: false,
  pinnedForNextNight: null,
  targeting: null,
  calledItNight: false,
  autoEnded: false
});

export const buildStarterOwnedAnimals = (): { animals: OwnedAnimal[]; nextInstanceNumber: number } => {
  let nextInstanceNumber = 1;
  const animals: OwnedAnimal[] = [];

  for (const item of STARTER_RECIPE) {
    for (let i = 0; i < item.count; i += 1) {
      animals.push(createOwnedAnimal(item.animalId, nextInstanceNumber));
      nextInstanceNumber += 1;
    }
  }

  return { animals, nextInstanceNumber };
};

const buildNightFromOwned = (
  gameState: Pick<GameState, 'ownedAnimals' | 'pinnedAnimalInstanceId'>,
  rng: Rng
): NightState => {
  const available = gameState.ownedAnimals
    .filter((animal) => animal.instanceId !== gameState.pinnedAnimalInstanceId)
    .map((animal) => animal.instanceId);

  return {
    ...defaultNightState(),
    drawPileIds: shuffle(available, rng)
  };
};

export const createInitialGameState = (seed?: string): GameState => {
  const { animals, nextInstanceNumber } = buildStarterOwnedAnimals();
  const rng = seed ? createSeededRng(seed) : Math.random;

  const base: GameState = {
    phase: 'night',
    nightNumber: 1,
    pop: 0,
    cash: 0,
    barnCapacity: 5,
    capacityUpgradeCount: 0,
    nextInstanceNumber,
    ownedAnimals: animals,
    pinnedAnimalInstanceId: null,
    night: defaultNightState(),
    shopState: null,
    lastNightSummary: null
  };

  return {
    ...base,
    night: buildNightFromOwned(base, rng)
  };
};

export const createSeededWinState = (): GameState => {
  const initial = createInitialGameState('seeded-win');
  const withBlueRibbons: AnimalId[] = ['chimera', 'unicorn', 'dragon'];
  let nextInstanceNumber = initial.nextInstanceNumber;
  const ownedAnimals = [...initial.ownedAnimals];

  for (const animalId of withBlueRibbons) {
    ownedAnimals.push(createOwnedAnimal(animalId, nextInstanceNumber));
    nextInstanceNumber += 1;
  }

  const fixedDrawOrder = ownedAnimals
    .filter((animal) => withBlueRibbons.includes(animal.animalId))
    .map((animal) => animal.instanceId)
    .concat(ownedAnimals.filter((animal) => !withBlueRibbons.includes(animal.animalId)).map((animal) => animal.instanceId));

  return {
    ...initial,
    nextInstanceNumber,
    ownedAnimals,
    night: {
      ...defaultNightState(),
      drawPileIds: fixedDrawOrder
    }
  };
};

export const createSeededShopState = (): GameState => ({
  ...createInitialGameState('seeded-shop'),
  pop: 120,
  cash: 20
});

export const createSeededAbilityReminderState = (): GameState => {
  const base = createInitialGameState('seeded-ability');
  let nextId = base.nextInstanceNumber;

  const owl = createOwnedAnimal('owl', nextId);
  nextId += 1;
  const goat = createOwnedAnimal('goat', nextId);
  nextId += 1;

  return {
    ...base,
    nextInstanceNumber: nextId,
    barnCapacity: 1,
    ownedAnimals: [...base.ownedAnimals, owl, goat],
    night: {
      ...base.night,
      barnResidentIds: [owl.instanceId],
      drawPileIds: [goat.instanceId]
    }
  };
};

export const createSeededBustState = (): GameState => {
  const base = createInitialGameState('seeded-bust');
  let nextId = base.nextInstanceNumber;

  const goose = createOwnedAnimal('goose', nextId);
  nextId += 1;

  const spareChicken = createOwnedAnimal('chicken', nextId);
  nextId += 1;

  const goats = base.ownedAnimals.filter((animal) => animal.animalId === 'goat').slice(0, 2);
  const goatIds = new Set(goats.map((animal) => animal.instanceId));

  const remainder = base.ownedAnimals
    .filter((animal) => !goatIds.has(animal.instanceId))
    .map((animal) => animal.instanceId);

  return {
    ...base,
    nextInstanceNumber: nextId,
    ownedAnimals: [...base.ownedAnimals, goose, spareChicken],
    night: {
      ...base.night,
      drawPileIds: [goose.instanceId, ...goats.map((goat) => goat.instanceId), spareChicken.instanceId, ...remainder]
    }
  };
};

export const startNextNight = (gameState: GameState, rng: Rng = Math.random): GameState => ({
  ...gameState,
  phase: 'night',
  nightNumber: gameState.nightNumber + 1,
  shopState: null,
  lastNightSummary: null,
  night: buildNightFromOwned(
    {
      ownedAnimals: gameState.ownedAnimals,
      pinnedAnimalInstanceId: gameState.pinnedAnimalInstanceId
    },
    rng
  )
});

export const enterShop = (gameState: GameState, rng: Rng = Math.random): GameState => {
  const shopState = gameState.shopState ?? generateShopStock(rng);
  return {
    ...gameState,
    phase: 'shop',
    shopState
  };
};

export const resetGame = (): GameState => createInitialGameState();

export const getAnimalName = (animalId: AnimalId): string => ANIMALS[animalId].name;
