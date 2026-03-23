import { describe, expect, it } from 'vitest';
import { createOwnedAnimal } from '../catalog';
import { applyIntent } from '../engine';
import { occupiedBarnSlots } from '../selectors';
import { createInitialGameState } from '../state';
import type { AnimalId, GameState } from '../types';

const withOwnedAnimals = (state: GameState, ids: AnimalId[]): { state: GameState; ids: string[] } => {
  let next = state.nextInstanceNumber;
  const animals = ids.map((animalId) => {
    const created = createOwnedAnimal(animalId, next);
    next += 1;
    return created;
  });

  return {
    state: {
      ...state,
      nextInstanceNumber: next,
      ownedAnimals: [...state.ownedAnimals, ...animals]
    },
    ids: animals.map((animal) => animal.instanceId)
  };
};

describe('night engine', () => {
  it('starter state is exact', () => {
    const state = createInitialGameState('starter');
    const count = (animalId: AnimalId) => state.ownedAnimals.filter((animal) => animal.animalId === animalId).length;

    expect(state.pop).toBe(0);
    expect(state.cash).toBe(0);
    expect(state.barnCapacity).toBe(5);
    expect(count('goat')).toBe(3);
    expect(count('pig')).toBe(2);
    expect(count('chicken')).toBe(2);
  });

  it('calm reduces noisy before bust check', () => {
    const base = createInitialGameState('calm');
    const { state, ids } = withOwnedAnimals(base, ['goat', 'goose', 'barn-cat', 'goat', 'goose']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        drawPileIds: [...ids]
      }
    };

    const one = applyIntent(ready, { type: 'INVITE_FROM_DOOR' });
    const two = applyIntent(one, { type: 'INVITE_FROM_DOOR' });
    const three = applyIntent(two, { type: 'INVITE_FROM_DOOR' });

    expect(three.night.bust).toBe(false);

    const four = applyIntent(three, { type: 'INVITE_FROM_DOOR' });
    expect(four.night.bust).toBe(false);

    const five = applyIntent(four, { type: 'INVITE_FROM_DOOR' });
    expect(five.night.bust).toBe(true);
  });

  it('rowdy immediately invites another guest', () => {
    const base = createInitialGameState('rowdy');
    const { state, ids } = withOwnedAnimals(base, ['bull', 'chicken']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        drawPileIds: [...ids]
      }
    };

    const next = applyIntent(ready, { type: 'INVITE_FROM_DOOR' });
    expect(next.night.barnResidentIds).toHaveLength(2);
  });

  it('fetch ability targets a specific farm animal', () => {
    const base = createInitialGameState('fetch');
    const { state, ids } = withOwnedAnimals(base, ['border-collie', 'goat', 'donkey']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        barnResidentIds: [ids[0]],
        drawPileIds: [ids[1], ids[2]]
      }
    };

    const targeting = applyIntent(ready, { type: 'USE_ABILITY', sourceId: ids[0] });
    const fetched = applyIntent(targeting, { type: 'SELECT_TARGET', targetId: ids[2] });

    expect(fetched.night.barnResidentIds.includes(ids[2])).toBe(true);
    expect(fetched.night.usedAbilityIds.includes(ids[0])).toBe(true);
  });

  it('kick removes a selected guest from the barn', () => {
    const base = createInitialGameState('kick');
    const { state, ids } = withOwnedAnimals(base, ['donkey', 'goat']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        barnResidentIds: [...ids],
        drawPileIds: []
      }
    };

    const targeting = applyIntent(ready, { type: 'USE_ABILITY', sourceId: ids[0] });
    const kicked = applyIntent(targeting, { type: 'SELECT_TARGET', targetId: ids[1] });

    expect(kicked.night.barnResidentIds).toEqual([ids[0]]);
  });

  it('peek reveals next draw and consumes ability use', () => {
    const base = createInitialGameState('peek');
    const { state, ids } = withOwnedAnimals(base, ['owl', 'goat']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        barnResidentIds: [ids[0]],
        drawPileIds: [ids[1]]
      }
    };

    const peeked = applyIntent(ready, { type: 'USE_ABILITY', sourceId: ids[0] });

    expect(peeked.night.peekedNextId).toBe(ids[1]);
    expect(peeked.night.usedAbilityIds.includes(ids[0])).toBe(true);
  });

  it('flock resolves during scoring', () => {
    const base = createInitialGameState('flock');
    const { state, ids } = withOwnedAnimals(base, ['sheep', 'sheep']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        barnResidentIds: ids,
        drawPileIds: []
      }
    };

    const scored = applyIntent(ready, { type: 'CALL_IT_A_NIGHT' });

    expect(scored.pop).toBe(4);
  });

  it('sneak does not consume barn slot and stacks collapse duplicates', () => {
    const base = createInitialGameState('sneak-stack');
    const { state, ids } = withOwnedAnimals(base, ['mouse', 'bunny', 'bunny']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        barnResidentIds: ids,
        drawPileIds: []
      }
    };

    expect(occupiedBarnSlots(ready)).toBe(1);
  });

  it('encore gains pop each entry and cannot drop below zero on upkeep penalty', () => {
    const base = createInitialGameState('encore');
    const { state, ids } = withOwnedAnimals(base, ['swan', 'cow']);
    const ready = {
      ...state,
      pop: 0,
      cash: 0,
      night: {
        ...state.night,
        drawPileIds: ids,
        barnResidentIds: []
      }
    };

    const one = applyIntent(ready, { type: 'INVITE_FROM_DOOR' });
    const two = applyIntent(one, { type: 'INVITE_FROM_DOOR' });
    const scored = applyIntent(two, { type: 'CALL_IT_A_NIGHT' });

    const swan = scored.ownedAnimals.find((animal) => animal.instanceId === ids[0])!;
    expect(swan.encorePop).toBe(1);
    expect(scored.pop).toBeGreaterThanOrEqual(0);
  });

  it('forced invite at capacity can bust', () => {
    const base = createInitialGameState('forced-bust');
    const { state, ids } = withOwnedAnimals(base, ['bull', 'goat']);
    const ready = {
      ...state,
      barnCapacity: 1,
      night: {
        ...state.night,
        drawPileIds: ids
      }
    };

    const busted = applyIntent(ready, { type: 'INVITE_FROM_DOOR' });
    expect(busted.night.bust).toBe(true);
  });
});
