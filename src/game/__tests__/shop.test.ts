import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng';
import { createInitialGameState } from '../state';
import { enterShop } from '../state';
import { generateShopStock, purchaseAnimal, purchaseCapacity, upgradePrice } from '../shop';

const shopReadyState = () => enterShop(createInitialGameState('shop-seed'), createSeededRng('shop-stock'));

describe('shop', () => {
  it('generates exactly 10 regular and 2 blue-ribbon offers with no duplicates', () => {
    const stock = generateShopStock(createSeededRng('gen-1'));

    expect(stock.regularOffers).toHaveLength(10);
    expect(stock.blueRibbonOffers).toHaveLength(2);

    const regularIds = stock.regularOffers.map((offer) => offer.animalId);
    const blueIds = stock.blueRibbonOffers.map((offer) => offer.animalId);

    expect(new Set(regularIds).size).toBe(regularIds.length);
    expect(new Set(blueIds).size).toBe(blueIds.length);
    expect(regularIds.includes('goat')).toBe(false);
  });

  it('purchase deducts Pop, creates owned animal, and marks regular offer sold out', () => {
    const state = { ...shopReadyState(), pop: 99 };
    const offer = state.shopState!.regularOffers[0];

    const next = purchaseAnimal(state, offer.offerId);

    expect(next.pop).toBe(state.pop - offer.costPop);
    expect(next.ownedAnimals.length).toBe(state.ownedAnimals.length + 1);
    const updatedOffer = next.shopState!.regularOffers.find((candidate) => candidate.offerId === offer.offerId)!;
    expect(updatedOffer.soldOut).toBe(true);
    expect(updatedOffer.stock).toBe(0);
  });

  it('blue-ribbon purchase does not sell out', () => {
    const state = { ...shopReadyState(), pop: 999 };
    const offer = state.shopState!.blueRibbonOffers[0];

    const next = purchaseAnimal(state, offer.offerId);
    const updatedOffer = next.shopState!.blueRibbonOffers.find((candidate) => candidate.offerId === offer.offerId)!;

    expect(updatedOffer.soldOut).toBe(false);
    expect(updatedOffer.infiniteStock).toBe(true);
    expect(next.ownedAnimals.length).toBe(state.ownedAnimals.length + 1);
  });

  it('insufficient Pop rejects purchase with unchanged state', () => {
    const state = { ...shopReadyState(), pop: 0 };
    const offer = state.shopState!.regularOffers[0];

    const next = purchaseAnimal(state, offer.offerId);

    expect(next).toEqual(state);
  });

  it('capacity upgrades follow 3, 5, 7, 9 sequence', () => {
    const state = shopReadyState();

    expect(upgradePrice(state)).toBe(3);
    const one = purchaseCapacity({ ...state, cash: 3 });
    expect(one.capacityUpgradeCount).toBe(1);
    expect(upgradePrice(one)).toBe(5);

    const two = purchaseCapacity({ ...one, cash: one.cash + 5 });
    expect(two.capacityUpgradeCount).toBe(2);
    expect(upgradePrice(two)).toBe(7);

    const three = purchaseCapacity({ ...two, cash: two.cash + 7 });
    expect(three.capacityUpgradeCount).toBe(3);
    expect(upgradePrice(three)).toBe(9);
  });

  it('rejects capacity upgrade at cap 38', () => {
    const state = {
      ...shopReadyState(),
      barnCapacity: 38,
      capacityUpgradeCount: 20,
      cash: 999
    };

    const next = purchaseCapacity(state);
    expect(next).toEqual(state);
  });

  it('rejects capacity upgrade with insufficient Cash', () => {
    const state = { ...shopReadyState(), cash: 0 };
    const next = purchaseCapacity(state);
    expect(next).toEqual(state);
  });
});
