import { getDefinition } from './catalog';
import type { AnimalId, BarnSlotView, GameState, GuestGroupView, OwnedAnimal } from './types';

export const MAX_BARN_CAPACITY = 38;

export const findOwnedAnimal = (gameState: GameState, instanceId: string): OwnedAnimal | undefined =>
  gameState.ownedAnimals.find((animal) => animal.instanceId === instanceId);

export const getBarnResidents = (gameState: GameState): OwnedAnimal[] =>
  gameState.night.barnResidentIds
    .map((id) => findOwnedAnimal(gameState, id))
    .filter((animal): animal is OwnedAnimal => Boolean(animal));

export const getDrawPileAnimals = (gameState: GameState): OwnedAnimal[] =>
  gameState.night.drawPileIds
    .map((id) => findOwnedAnimal(gameState, id))
    .filter((animal): animal is OwnedAnimal => Boolean(animal));

export const getNoisyCount = (gameState: GameState): number =>
  getBarnResidents(gameState).filter((resident) => getDefinition(resident.animalId).power === 'noisy').length;

export const getCalmCount = (gameState: GameState): number =>
  getBarnResidents(gameState).filter((resident) => getDefinition(resident.animalId).power === 'calm').length;

export const getEffectiveNoisyCount = (gameState: GameState): number =>
  Math.max(0, getNoisyCount(gameState) - getCalmCount(gameState));

export const blueRibbonBarnCount = (gameState: GameState): number =>
  getBarnResidents(gameState).filter((resident) => getDefinition(resident.animalId).blueRibbon).length;

export const blueRibbonBarnIds = (gameState: GameState): string[] =>
  getBarnResidents(gameState)
    .filter((resident) => getDefinition(resident.animalId).blueRibbon)
    .map((resident) => resident.instanceId);

export const canAfford = (gameState: GameState, costPop: number): boolean => gameState.pop >= costPop;

export const isMaxCapacity = (gameState: GameState): boolean => gameState.barnCapacity >= MAX_BARN_CAPACITY;

export const upgradePriceFromCount = (upgradeCount: number): number => 3 + 2 * upgradeCount;

export const upgradePrice = (gameState: GameState): number => upgradePriceFromCount(gameState.capacityUpgradeCount);

const isSneak = (animal: OwnedAnimal): boolean => getDefinition(animal.animalId).power === 'sneak';

const isStacks = (animal: OwnedAnimal): boolean => getDefinition(animal.animalId).power === 'stacks';

export const buildGuestGroups = (gameState: GameState): GuestGroupView[] => {
  const residents = getBarnResidents(gameState);
  const groups: GuestGroupView[] = [];

  for (const resident of residents) {
    if (isSneak(resident)) {
      continue;
    }

    if (isStacks(resident)) {
      const existing = groups.find((group) => group.animalId === resident.animalId);
      if (existing) {
        existing.instanceIds.push(resident.instanceId);
        existing.stackCount = existing.instanceIds.length;
        continue;
      }
    }

    groups.push({
      displayId: resident.instanceId,
      animalId: resident.animalId,
      instanceIds: [resident.instanceId],
      stackCount: 1
    });
  }

  return groups;
};

export const occupiedBarnSlots = (gameState: GameState): number => buildGuestGroups(gameState).length;

export const isBarnAtCapacity = (gameState: GameState): boolean => occupiedBarnSlots(gameState) >= gameState.barnCapacity;

export const getFarmWindowCounts = (gameState: GameState): Record<AnimalId, number> => {
  const counts: Record<AnimalId, number> = {
    goat: 0,
    bull: 0,
    goose: 0,
    chicken: 0,
    pig: 0,
    cow: 0,
    mouse: 0,
    owl: 0,
    'barn-cat': 0,
    sheep: 0,
    swan: 0,
    bunny: 0,
    'border-collie': 0,
    donkey: 0,
    chimera: 0,
    jackalope: 0,
    unicorn: 0,
    griffin: 0,
    dragon: 0
  };

  for (const resident of getDrawPileAnimals(gameState)) {
    counts[resident.animalId] += 1;
  }

  return counts;
};

export const isAbilityUsed = (gameState: GameState, instanceId: string): boolean =>
  gameState.night.usedAbilityIds.includes(instanceId);

export const getAbilityTargets = (gameState: GameState, sourceId: string): string[] => {
  const source = findOwnedAnimal(gameState, sourceId);
  if (!source) {
    return [];
  }

  const power = getDefinition(source.animalId).power;

  if (power === 'fetch') {
    return gameState.night.drawPileIds;
  }

  if (power === 'kick') {
    return gameState.night.barnResidentIds;
  }

  if (power === 'peek') {
    return gameState.night.drawPileIds.length > 0 ? [gameState.night.drawPileIds[0]] : [];
  }

  return [];
};

export const getAvailableAbilitySources = (gameState: GameState): string[] =>
  gameState.night.barnResidentIds.filter((instanceId) => {
    if (isAbilityUsed(gameState, instanceId)) {
      return false;
    }

    const resident = findOwnedAnimal(gameState, instanceId);
    if (!resident) {
      return false;
    }

    const power = getDefinition(resident.animalId).power;
    if (power !== 'fetch' && power !== 'kick' && power !== 'peek') {
      return false;
    }

    if (power === 'fetch' || power === 'peek') {
      return gameState.night.drawPileIds.length > 0;
    }

    return gameState.night.barnResidentIds.length > 0;
  });

export const hasAvailableActions = (gameState: GameState): boolean => {
  if (gameState.night.drawPileIds.length > 0 && !isBarnAtCapacity(gameState)) {
    return true;
  }

  return getAvailableAbilitySources(gameState).length > 0;
};

export const getPopYieldForResident = (resident: OwnedAnimal): number => {
  const definition = getDefinition(resident.animalId);
  if (definition.power === 'encore') {
    return resident.encorePop;
  }

  return definition.currencies.pop;
};

export const buildBarnSlots = (gameState: GameState): BarnSlotView[] => {
  const slots: BarnSlotView[] = [];
  const groups = buildGuestGroups(gameState);

  for (let index = 0; index < 40; index += 1) {
    if (index === 0) {
      slots.push({ slotIndex: index, kind: 'window', guestGroup: null });
      continue;
    }

    if (index === 1) {
      slots.push({ slotIndex: index, kind: 'door', guestGroup: null });
      continue;
    }

    const guestSlotIndex = index - 2;
    if (guestSlotIndex >= gameState.barnCapacity) {
      slots.push({ slotIndex: index, kind: 'locked', guestGroup: null });
      continue;
    }

    const group = groups[guestSlotIndex] ?? null;
    if (group) {
      slots.push({ slotIndex: index, kind: 'animal', guestGroup: group });
    } else {
      slots.push({ slotIndex: index, kind: 'empty', guestGroup: null });
    }
  }

  return slots;
};

export const getAbilityLabel = (gameState: GameState, instanceId: string): string | null => {
  const animal = findOwnedAnimal(gameState, instanceId);
  if (!animal) {
    return null;
  }

  const definition = getDefinition(animal.animalId);
  if (definition.power === 'none') {
    return null;
  }

  return definition.power;
};
