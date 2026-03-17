import { describe, expect, it } from 'vitest';
import { createCardInstance } from './deck';
import {
  createDefaultShopStock,
  generateMarket,
  generateLegendaryMarket,
  getCapacityUpgradeCost,
  purchaseAnimal,
  upgradeCapacity,
} from './shop';

describe('shop', () => {
  it('generates market entries with affordability and stock', () => {
    const stock = createDefaultShopStock();
    const market = generateMarket(stock, 4);
    const bunny = market.find((entry) => entry.animalId === 'Bunny');
    const honeyBee = market.find((entry) => entry.animalId === 'HoneyBee');

    expect(bunny?.affordable).toBe(true);
    expect(honeyBee?.affordable).toBe(false);
    expect(bunny?.remainingStock).toBe(3);
  });

  it('supports capacity upgrade cost curve 2/3/4 and max 8', () => {
    expect(getCapacityUpgradeCost(5)).toBe(2);
    expect(getCapacityUpgradeCost(6)).toBe(3);
    expect(getCapacityUpgradeCost(7)).toBe(4);
    expect(getCapacityUpgradeCost(8)).toBeNull();

    let capacity = 5;
    let hay = 9;

    const first = upgradeCapacity({ capacity, hay });
    capacity = first.capacity;
    hay = first.hay;
    expect(capacity).toBe(6);
    expect(hay).toBe(7);

    const second = upgradeCapacity({ capacity, hay });
    capacity = second.capacity;
    hay = second.hay;
    expect(capacity).toBe(7);
    expect(hay).toBe(4);

    const third = upgradeCapacity({ capacity, hay });
    capacity = third.capacity;
    hay = third.hay;
    expect(capacity).toBe(8);
    expect(hay).toBe(0);

    const capped = upgradeCapacity({ capacity, hay });
    expect(capped.ok).toBe(false);
    expect(capped.reason).toBe('max_capacity');
  });

  it('purchase deducts mischief, adds card, and decrements stock', () => {
    const stock = createDefaultShopStock();
    const result = purchaseAnimal({
      animalId: 'WildBoar',
      shopStock: stock,
      mischief: 10,
      herd: [createCardInstance('BarnCat', 1)],
      nextCardSerial: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.mischief).toBe(7);
    expect(result.herd).toHaveLength(2);
    expect(result.shopStock.WildBoar).toBe(2);
  });

  it('rejects purchases with insufficient funds', () => {
    const stock = createDefaultShopStock();
    const result = purchaseAnimal({
      animalId: 'HoneyBee',
      shopStock: stock,
      mischief: 6,
      herd: [],
      nextCardSerial: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('insufficient_funds');
  });

  it('enforces stock limits of 3 copies per animal', () => {
    let stock = createDefaultShopStock();
    let mischief = 30;
    let herd = [] as ReturnType<typeof createCardInstance>[];
    let serial = 1;

    for (let i = 0; i < 3; i += 1) {
      const purchase = purchaseAnimal({
        animalId: 'Bunny',
        shopStock: stock,
        mischief,
        herd,
        nextCardSerial: serial,
      });
      expect(purchase.ok).toBe(true);
      stock = purchase.shopStock;
      mischief = purchase.mischief;
      herd = purchase.herd;
      serial = purchase.nextCardSerial;
    }

    const outOfStock = purchaseAnimal({
      animalId: 'Bunny',
      shopStock: stock,
      mischief,
      herd,
      nextCardSerial: serial,
    });

    expect(outOfStock.ok).toBe(false);
    expect(outOfStock.reason).toBe('out_of_stock');
  });

  // Sprint 003 tests

  it('Legendary items in market with correct costs', () => {
    const stock = createDefaultShopStock();
    const market = generateLegendaryMarket(stock, 100);

    const costs = market.map((item) => item.costMischief);
    expect(costs).toEqual([30, 35, 40, 45, 45, 50, 50, 55]);
  });

  it('Legendary stock = 1 per animal', () => {
    const stock = createDefaultShopStock();
    const market = generateLegendaryMarket(stock, 100);

    for (const item of market) {
      expect(item.remainingStock).toBe(1);
    }
  });

  it('Purchasing a Legendary reduces stock to 0, item no longer available', () => {
    let stock = createDefaultShopStock();
    const result = purchaseAnimal({
      animalId: 'GoldenGoose',
      shopStock: stock,
      mischief: 100,
      herd: [],
      nextCardSerial: 1,
    });

    expect(result.ok).toBe(true);
    stock = result.shopStock;
    expect(stock.GoldenGoose).toBe(0);

    const secondTry = purchaseAnimal({
      animalId: 'GoldenGoose',
      shopStock: stock,
      mischief: 100,
      herd: result.herd,
      nextCardSerial: result.nextCardSerial,
    });

    expect(secondTry.ok).toBe(false);
    expect(secondTry.reason).toBe('out_of_stock');
  });

  it('Active-ability animals appear with stock = 3', () => {
    const stock = createDefaultShopStock();
    expect(stock.Sheepdog).toBe(3);
    expect(stock.StableHand).toBe(3);
    expect(stock.BorderCollie).toBe(3);
    expect(stock.CheerfulLamb).toBe(3);
  });
});
