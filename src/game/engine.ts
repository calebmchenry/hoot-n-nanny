import { getDefinition } from './catalog';
import { enterShop, resetGame, startNextNight } from './state';
import { purchaseAnimal, purchaseCapacity } from './shop';
import {
  blueRibbonBarnCount,
  blueRibbonBarnIds,
  findOwnedAnimal,
  getAvailableAbilitySources,
  getBarnResidents,
  getEffectiveNoisyCount,
  getPopYieldForResident,
  hasAvailableActions,
  isBarnAtCapacity,
  occupiedBarnSlots
} from './selectors';
import type { AppIntent, GameState, NightOutcome, NightSummary, OwnedAnimal } from './types';

const addAbilityUse = (gameState: GameState, sourceId: string): GameState => ({
  ...gameState,
  night: {
    ...gameState.night,
    usedAbilityIds: [...gameState.night.usedAbilityIds, sourceId]
  }
});

const applyEncore = (gameState: GameState, instanceId: string): GameState => {
  const ownedAnimals = gameState.ownedAnimals.map((animal) => {
    if (animal.instanceId !== instanceId) {
      return animal;
    }

    const definition = getDefinition(animal.animalId);
    if (definition.power !== 'encore') {
      return animal;
    }

    return {
      ...animal,
      encorePop: animal.encorePop + 1
    };
  });

  return {
    ...gameState,
    ownedAnimals
  };
};

const completeNightSummary = (
  gameState: GameState,
  summary: Omit<NightSummary, 'popAfter' | 'cashAfter' | 'pinnedForNextNight'>,
  popAfter: number,
  cashAfter: number,
  pinnedForNextNight: string | null
): GameState => ({
  ...gameState,
  phase: 'night-summary',
  pop: popAfter,
  cash: cashAfter,
  pinnedAnimalInstanceId: pinnedForNextNight,
  night: {
    ...gameState.night,
    calledItNight: summary.outcome !== 'bust-to-shop',
    pinnedForNextNight,
    targeting: null,
    resolutionLog: summary.resolutionLog
  },
  lastNightSummary: {
    ...summary,
    popAfter,
    cashAfter,
    pinnedForNextNight
  }
});

const resolveBust = (gameState: GameState, title: string): GameState => {
  const residentIds = gameState.night.barnResidentIds;
  const base = {
    ...gameState,
    night: {
      ...gameState.night,
      bust: true,
      resolutionLog: [title]
    }
  };

  if (residentIds.length <= 1) {
    const pinnedId = residentIds[0] ?? null;
    return completeNightSummary(
      base,
      {
        outcome: 'bust-to-shop',
        title,
        resolutionLog: [title],
        winningBlueRibbonIds: []
      },
      base.pop,
      base.cash,
      pinnedId
    );
  }

  return {
    ...base,
    night: {
      ...base.night,
      targeting: {
        kind: 'pin',
        sourceId: null
      }
    }
  };
};

const autoEndIfNeeded = (gameState: GameState): GameState => {
  if (gameState.phase !== 'night') {
    return gameState;
  }

  if (gameState.night.bust || gameState.night.targeting) {
    return gameState;
  }

  if (!isBarnAtCapacity(gameState)) {
    return gameState;
  }

  if (hasAvailableActions(gameState)) {
    return gameState;
  }

  return scoreNight({
    ...gameState,
    night: {
      ...gameState.night,
      autoEnded: true
    }
  });
};

const resolveBustChecks = (gameState: GameState): GameState => {
  const effectiveNoisyCount = getEffectiveNoisyCount(gameState);
  if (effectiveNoisyCount >= 3) {
    return resolveBust(gameState, 'Bust: 3 effective Noisy animals woke up the farmer.');
  }

  if (occupiedBarnSlots(gameState) > gameState.barnCapacity) {
    return resolveBust(gameState, 'Bust: the barn was over capacity from a forced invite.');
  }

  return gameState;
};

const inviteFromDrawPile = (
  gameState: GameState,
  options: { forced: boolean; targetId?: string }
): GameState => {
  if (gameState.night.drawPileIds.length === 0) {
    return gameState;
  }

  const targetId = options.targetId ?? gameState.night.drawPileIds[0];
  if (!gameState.night.drawPileIds.includes(targetId)) {
    return gameState;
  }

  const drawPileIds = gameState.night.drawPileIds.filter((id) => id !== targetId);
  const nextBarnIds = [...gameState.night.barnResidentIds, targetId];

  let nextState: GameState = {
    ...gameState,
    night: {
      ...gameState.night,
      drawPileIds,
      barnResidentIds: nextBarnIds,
      peekedNextId: null
    }
  };

  nextState = applyEncore(nextState, targetId);
  nextState = resolveBustChecks(nextState);
  if (nextState.phase !== 'night' || nextState.night.bust) {
    return nextState;
  }

  const invited = findOwnedAnimal(nextState, targetId);
  if (!invited) {
    return nextState;
  }

  const definition = getDefinition(invited.animalId);
  if (definition.power === 'rowdy') {
    const rowdyResolved = inviteFromDrawPile(nextState, { forced: true });
    if (rowdyResolved.phase !== 'night' || rowdyResolved.night.bust) {
      return rowdyResolved;
    }

    return autoEndIfNeeded(rowdyResolved);
  }

  return autoEndIfNeeded(nextState);
};

const scoreNight = (gameState: GameState): GameState => {
  const residents = getBarnResidents(gameState);

  let pop = gameState.pop;
  let cash = gameState.cash;
  const resolutionLog: string[] = [];

  for (const resident of residents) {
    const definition = getDefinition(resident.animalId);
    const popGain = getPopYieldForResident(resident);
    pop += popGain;
    resolutionLog.push(`${definition.name}: +${popGain} Pop`);
  }

  for (const resident of residents) {
    const definition = getDefinition(resident.animalId);
    const cashGain = definition.currencies.cash;
    cash += cashGain;
    resolutionLog.push(`${definition.name}: +${cashGain} Cash`);
  }

  const upkeepAnimals = residents.filter((resident) => getDefinition(resident.animalId).power === 'upkeep');
  for (const resident of upkeepAnimals) {
    const definition = getDefinition(resident.animalId);
    if (cash > 0) {
      cash -= 1;
      resolutionLog.push(`${definition.name}: paid 1 Cash upkeep.`);
    } else {
      pop = Math.max(0, pop - 5);
      resolutionLog.push(`${definition.name}: could not pay upkeep, lost 5 Pop.`);
    }
  }

  const flockResidents = residents.filter((resident) => getDefinition(resident.animalId).power === 'flock');
  for (const resident of residents) {
    const definition = getDefinition(resident.animalId);
    if (definition.power !== 'flock') {
      continue;
    }

    const bonus = Math.max(0, flockResidents.length - 1);
    pop += bonus;
    resolutionLog.push(`${definition.name}: Flock bonus +${bonus} Pop.`);
  }

  const blueCount = blueRibbonBarnCount(gameState);
  const outcome: NightOutcome = blueCount >= 3 ? 'score-to-win' : 'score-to-shop';
  const winningBlueRibbonIds = blueCount >= 3 ? blueRibbonBarnIds(gameState) : [];

  return completeNightSummary(
    gameState,
    {
      outcome,
      title: outcome === 'score-to-win' ? 'Blue Ribbon Victory!' : 'Night Complete',
      resolutionLog,
      winningBlueRibbonIds
    },
    pop,
    cash,
    null
  );
};

const handleUseAbility = (gameState: GameState, sourceId: string): GameState => {
  if (!gameState.night.barnResidentIds.includes(sourceId)) {
    return gameState;
  }

  if (gameState.night.usedAbilityIds.includes(sourceId)) {
    return gameState;
  }

  const source = findOwnedAnimal(gameState, sourceId);
  if (!source) {
    return gameState;
  }

  const definition = getDefinition(source.animalId);

  if (definition.power === 'peek') {
    if (gameState.night.drawPileIds.length === 0) {
      return gameState;
    }

    return autoEndIfNeeded(
      addAbilityUse({
        ...gameState,
        night: {
          ...gameState.night,
          peekedNextId: gameState.night.drawPileIds[0]
        }
      }, sourceId)
    );
  }

  if (definition.power === 'fetch' || definition.power === 'kick') {
    const hasTargets =
      definition.power === 'fetch'
        ? gameState.night.drawPileIds.length > 0
        : gameState.night.barnResidentIds.length > 0;

    if (!hasTargets) {
      return gameState;
    }

    return {
      ...gameState,
      night: {
        ...gameState.night,
        targeting: {
          kind: definition.power,
          sourceId
        }
      }
    };
  }

  return gameState;
};

const handleSelectTarget = (gameState: GameState, targetId: string): GameState => {
  if (!gameState.night.targeting) {
    return gameState;
  }

  if (gameState.night.targeting.kind === 'pin') {
    if (!gameState.night.barnResidentIds.includes(targetId)) {
      return gameState;
    }

    return completeNightSummary(
      {
        ...gameState,
        night: {
          ...gameState.night,
          pinnedForNextNight: targetId,
          targeting: null
        }
      },
      {
        outcome: 'bust-to-shop',
        title: 'Farmer Woke Up!',
        resolutionLog: gameState.night.resolutionLog,
        winningBlueRibbonIds: []
      },
      gameState.pop,
      gameState.cash,
      targetId
    );
  }

  const sourceId = gameState.night.targeting.sourceId;
  if (!sourceId) {
    return gameState;
  }

  const source = findOwnedAnimal(gameState, sourceId);
  if (!source) {
    return gameState;
  }

  const power = getDefinition(source.animalId).power;

  if (power === 'fetch') {
    if (!gameState.night.drawPileIds.includes(targetId)) {
      return gameState;
    }

    const withUsedAbility = addAbilityUse(
      {
        ...gameState,
        night: {
          ...gameState.night,
          targeting: null
        }
      },
      sourceId
    );

    return inviteFromDrawPile(withUsedAbility, { forced: true, targetId });
  }

  if (power === 'kick') {
    if (!gameState.night.barnResidentIds.includes(targetId)) {
      return gameState;
    }

    const nextBarn = gameState.night.barnResidentIds.filter((id) => id !== targetId);
    return autoEndIfNeeded(
      addAbilityUse(
        {
          ...gameState,
          night: {
            ...gameState.night,
            targeting: null,
            barnResidentIds: nextBarn
          }
        },
        sourceId
      )
    );
  }

  return gameState;
};

const handleNightIntent = (gameState: GameState, intent: AppIntent): GameState => {
  if (gameState.phase !== 'night') {
    return gameState;
  }

  if (gameState.night.bust && gameState.night.targeting?.kind !== 'pin') {
    return gameState;
  }

  switch (intent.type) {
    case 'INVITE_FROM_DOOR': {
      if (gameState.night.targeting) {
        return gameState;
      }

      if (isBarnAtCapacity(gameState)) {
        return gameState;
      }

      return inviteFromDrawPile(gameState, { forced: false });
    }
    case 'CALL_IT_A_NIGHT': {
      if (gameState.night.targeting || gameState.night.bust) {
        return gameState;
      }

      return scoreNight(gameState);
    }
    case 'USE_ABILITY': {
      return handleUseAbility(gameState, intent.sourceId);
    }
    case 'SELECT_TARGET': {
      return handleSelectTarget(gameState, intent.targetId);
    }
    case 'CANCEL_TARGETING': {
      if (gameState.night.targeting?.kind === 'pin') {
        return gameState;
      }

      return {
        ...gameState,
        night: {
          ...gameState.night,
          targeting: null
        }
      };
    }
    default:
      return gameState;
  }
};

const transitionFromSummary = (gameState: GameState): GameState => {
  if (!gameState.lastNightSummary) {
    return gameState;
  }

  if (gameState.lastNightSummary.outcome === 'score-to-win') {
    return {
      ...gameState,
      phase: 'win'
    };
  }

  return enterShop(gameState);
};

const applyMetaIntent = (gameState: GameState, intent: AppIntent): GameState => {
  switch (intent.type) {
    case 'CONTINUE_FROM_SUMMARY': {
      if (gameState.phase !== 'night-summary') {
        return gameState;
      }

      return transitionFromSummary(gameState);
    }
    case 'SHOP_BUY_OFFER': {
      if (gameState.phase !== 'shop') {
        return gameState;
      }

      return purchaseAnimal(gameState, intent.offerId);
    }
    case 'SHOP_BUY_CAPACITY': {
      if (gameState.phase !== 'shop') {
        return gameState;
      }

      return purchaseCapacity(gameState);
    }
    case 'SHOP_START_HOOTENANNY': {
      if (gameState.phase !== 'shop') {
        return gameState;
      }

      return startNextNight(gameState);
    }
    case 'PLAY_AGAIN': {
      if (gameState.phase !== 'win') {
        return gameState;
      }

      return resetGame();
    }
    default:
      return gameState;
  }
};

export const applyIntent = (gameState: GameState, intent: AppIntent): GameState => {
  const afterNight = handleNightIntent(gameState, intent);
  if (afterNight !== gameState) {
    return afterNight;
  }

  return applyMetaIntent(gameState, intent);
};

export const getWinningAnimals = (gameState: GameState): OwnedAnimal[] => {
  if (!gameState.lastNightSummary?.winningBlueRibbonIds) {
    return [];
  }

  const winning = new Set(gameState.lastNightSummary.winningBlueRibbonIds);
  return getBarnResidents(gameState).filter((resident) => winning.has(resident.instanceId));
};

export const getRemainingActions = (gameState: GameState): string[] => {
  if (gameState.phase !== 'night') {
    return [];
  }

  return getAvailableAbilitySources(gameState);
};
