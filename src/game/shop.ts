import { BLUE_RIBBON_IDS, REGULAR_SHOP_ELIGIBLE_IDS, createOwnedAnimal, getDefinition } from './catalog';
import { shuffle, type Rng } from './rng';
import { MAX_BARN_CAPACITY, isMaxCapacity, upgradePrice as selectorUpgradePrice } from './selectors';
import type { GameState, ShopOffer, ShopState } from './types';

const makeOffer = (animalId: ShopOffer['animalId'], stock: number, infiniteStock: boolean): ShopOffer => ({
  offerId: `offer-${animalId}`,
  animalId,
  costPop: getDefinition(animalId).costPop,
  stock,
  infiniteStock,
  soldOut: false
});

export const generateShopStock = (rng: Rng = Math.random): ShopState => {
  const regularOffers = shuffle(REGULAR_SHOP_ELIGIBLE_IDS, rng)
    .slice(0, 10)
    .map((animalId) => makeOffer(animalId, 1, false));

  const blueRibbonOffers = shuffle(BLUE_RIBBON_IDS, rng)
    .slice(0, 2)
    .map((animalId) => makeOffer(animalId, 999, true));

  return {
    regularOffers,
    blueRibbonOffers
  };
};

const mapOffers = (shopState: ShopState): ShopOffer[] => [...shopState.regularOffers, ...shopState.blueRibbonOffers];

const patchOffer = (shopState: ShopState, nextOffer: ShopOffer): ShopState => ({
  regularOffers: shopState.regularOffers.map((offer) => (offer.offerId === nextOffer.offerId ? nextOffer : offer)),
  blueRibbonOffers: shopState.blueRibbonOffers.map((offer) => (offer.offerId === nextOffer.offerId ? nextOffer : offer))
});

export const purchaseAnimal = (gameState: GameState, offerId: string): GameState => {
  if (!gameState.shopState) {
    return gameState;
  }

  const offer = mapOffers(gameState.shopState).find((candidate) => candidate.offerId === offerId);
  if (!offer || offer.soldOut || gameState.pop < offer.costPop) {
    return gameState;
  }

  const purchasedAnimal = createOwnedAnimal(offer.animalId, gameState.nextInstanceNumber);
  const nextOffer: ShopOffer = offer.infiniteStock
    ? offer
    : {
        ...offer,
        soldOut: true,
        stock: Math.max(0, offer.stock - 1)
      };

  return {
    ...gameState,
    pop: gameState.pop - offer.costPop,
    nextInstanceNumber: gameState.nextInstanceNumber + 1,
    ownedAnimals: [...gameState.ownedAnimals, purchasedAnimal],
    shopState: patchOffer(gameState.shopState, nextOffer)
  };
};

export const upgradePrice = (gameState: GameState): number => selectorUpgradePrice(gameState);

export const purchaseCapacity = (gameState: GameState): GameState => {
  if (isMaxCapacity(gameState)) {
    return gameState;
  }

  const price = upgradePrice(gameState);
  if (gameState.cash < price) {
    return gameState;
  }

  return {
    ...gameState,
    cash: gameState.cash - price,
    barnCapacity: Math.min(MAX_BARN_CAPACITY, gameState.barnCapacity + 1),
    capacityUpgradeCount: gameState.capacityUpgradeCount + 1
  };
};
