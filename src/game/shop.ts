import { getAnimalDef, SHOP_ANIMAL_IDS } from './animals';
import { createCardInstance } from './deck';
import type { CardInstance, MarketItem, NightEvent, ShopAnimalId, ShopStock } from './types';

export const SHOP_STOCK_PER_ANIMAL = 3;
const MAX_CAPACITY = 8;

const CAPACITY_COST_BY_CURRENT: Partial<Record<number, number>> = {
  5: 2,
  6: 3,
  7: 4,
};

export const createDefaultShopStock = (): ShopStock => {
  return {
    Bunny: SHOP_STOCK_PER_ANIMAL,
    Hen: SHOP_STOCK_PER_ANIMAL,
    WildBoar: SHOP_STOCK_PER_ANIMAL,
    HermitCrab: SHOP_STOCK_PER_ANIMAL,
    DraftPony: SHOP_STOCK_PER_ANIMAL,
    StruttingPeacock: SHOP_STOCK_PER_ANIMAL,
    MilkmaidGoat: SHOP_STOCK_PER_ANIMAL,
    HoneyBee: SHOP_STOCK_PER_ANIMAL,
  };
};

export const generateMarket = (shopStock: ShopStock, mischief: number): MarketItem[] => {
  return SHOP_ANIMAL_IDS.map((animalId) => {
    const definition = getAnimalDef(animalId);
    const remainingStock = shopStock[animalId];
    const costMischief = definition.costMischief ?? 0;

    return {
      animalId,
      name: definition.name,
      costMischief,
      mischief: definition.mischief,
      hay: definition.hay,
      noisy: definition.noisy,
      remainingStock,
      affordable: remainingStock > 0 && mischief >= costMischief,
    };
  });
};

export const purchaseAnimal = (options: {
  animalId: ShopAnimalId;
  shopStock: ShopStock;
  mischief: number;
  herd: CardInstance[];
  nextCardSerial: number;
}): {
  ok: boolean;
  reason: 'insufficient_funds' | 'out_of_stock' | null;
  shopStock: ShopStock;
  mischief: number;
  herd: CardInstance[];
  nextCardSerial: number;
  events: NightEvent[];
} => {
  const definition = getAnimalDef(options.animalId);
  const cost = definition.costMischief ?? 0;
  const stock = options.shopStock[options.animalId];

  if (stock <= 0) {
    return {
      ok: false,
      reason: 'out_of_stock',
      shopStock: options.shopStock,
      mischief: options.mischief,
      herd: options.herd,
      nextCardSerial: options.nextCardSerial,
      events: [],
    };
  }

  if (options.mischief < cost) {
    return {
      ok: false,
      reason: 'insufficient_funds',
      shopStock: options.shopStock,
      mischief: options.mischief,
      herd: options.herd,
      nextCardSerial: options.nextCardSerial,
      events: [],
    };
  }

  const purchasedCard = createCardInstance(options.animalId, options.nextCardSerial);
  const nextShopStock: ShopStock = {
    ...options.shopStock,
    [options.animalId]: options.shopStock[options.animalId] - 1,
  };

  return {
    ok: true,
    reason: null,
    shopStock: nextShopStock,
    mischief: options.mischief - cost,
    herd: [...options.herd, purchasedCard],
    nextCardSerial: options.nextCardSerial + 1,
    events: [{ type: 'purchase_completed', animalId: options.animalId, card: purchasedCard }],
  };
};

export const getCapacityUpgradeCost = (capacity: number): number | null => {
  return CAPACITY_COST_BY_CURRENT[capacity] ?? null;
};

export const upgradeCapacity = (options: {
  capacity: number;
  hay: number;
}): {
  ok: boolean;
  reason: 'max_capacity' | 'insufficient_hay' | null;
  capacity: number;
  hay: number;
  events: NightEvent[];
} => {
  if (options.capacity >= MAX_CAPACITY) {
    return {
      ok: false,
      reason: 'max_capacity',
      capacity: options.capacity,
      hay: options.hay,
      events: [],
    };
  }

  const cost = getCapacityUpgradeCost(options.capacity);
  if (cost === null) {
    return {
      ok: false,
      reason: 'max_capacity',
      capacity: options.capacity,
      hay: options.hay,
      events: [],
    };
  }

  if (options.hay < cost) {
    return {
      ok: false,
      reason: 'insufficient_hay',
      capacity: options.capacity,
      hay: options.hay,
      events: [],
    };
  }

  const nextCapacity = options.capacity + 1;

  return {
    ok: true,
    reason: null,
    capacity: nextCapacity,
    hay: options.hay - cost,
    events: [{ type: 'capacity_upgraded', capacity: nextCapacity }],
  };
};
