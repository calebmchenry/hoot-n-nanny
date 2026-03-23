import type { GameState, ShopOffer } from '../game/types';
import type { AudioCue } from './types';

const allOffers = (state: GameState): ShopOffer[] => {
  if (!state.shopState) {
    return [];
  }

  return [...state.shopState.regularOffers, ...state.shopState.blueRibbonOffers];
};

const hasOfferStockDecrease = (prev: GameState, next: GameState): boolean => {
  const previousOffers = new Map(allOffers(prev).map((offer) => [offer.offerId, offer]));

  for (const nextOffer of allOffers(next)) {
    const previous = previousOffers.get(nextOffer.offerId);
    if (!previous) {
      continue;
    }

    if (nextOffer.stock < previous.stock) {
      return true;
    }

    if (!previous.soldOut && nextOffer.soldOut) {
      return true;
    }
  }

  return false;
};

export const deriveCues = (prev: GameState, next: GameState): AudioCue[] => {
  const cues: AudioCue[] = [];

  if (prev.phase !== next.phase) {
    if (next.phase === 'night') {
      cues.push({ id: 'music:barn-party' });
    }

    if (next.phase === 'shop') {
      cues.push({ id: 'music:shop' });
    }

    if (next.phase === 'win') {
      cues.push({ id: 'music:stop' });
      cues.push({ id: 'sfx:win-fanfare' });
    }

    if (next.phase === 'night-summary' && next.lastNightSummary?.outcome !== 'bust-to-shop') {
      cues.push({ id: 'sfx:scoring-jingle' });
    }
  }

  const previousResidents = new Set(prev.night.barnResidentIds);
  const entrantIds = next.night.barnResidentIds.filter((id) => !previousResidents.has(id));

  if (entrantIds.length > 0) {
    const ownedLookup = new Map(next.ownedAnimals.map((animal) => [animal.instanceId, animal.animalId]));

    entrantIds.forEach((instanceId, index) => {
      const animalId = ownedLookup.get(instanceId);
      if (!animalId) {
        return;
      }

      cues.push({
        id: `sfx:animal-entry:${animalId}`,
        delayMs: index * 100
      });
    });
  }

  if (!prev.night.bust && next.night.bust) {
    cues.push({ id: 'sfx:bust' });
  }

  const previousUsedAbilities = new Set(prev.night.usedAbilityIds);
  const newlyUsedAbilities = next.night.usedAbilityIds.filter((id) => !previousUsedAbilities.has(id));

  if (newlyUsedAbilities.length > 0) {
    newlyUsedAbilities.forEach((_id, index) => {
      cues.push({ id: 'sfx:activate-ability', delayMs: index * 40 });
    });
  }

  const shopPurchaseHappened =
    prev.phase === 'shop' &&
    next.phase === 'shop' &&
    (next.ownedAnimals.length > prev.ownedAnimals.length ||
      next.capacityUpgradeCount > prev.capacityUpgradeCount ||
      hasOfferStockDecrease(prev, next));

  if (shopPurchaseHappened) {
    cues.push({ id: 'sfx:purchase' });
  }

  return cues;
};
