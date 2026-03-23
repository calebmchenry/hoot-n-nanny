import { describe, expect, it } from 'vitest';
import { createOwnedAnimal } from '../catalog';
import { applyIntent } from '../engine';
import { createInitialGameState } from '../state';
import type { AnimalId, GameState } from '../types';

const withOwnedAnimals = (state: GameState, ids: AnimalId[]): { state: GameState; instanceIds: string[] } => {
  let nextId = state.nextInstanceNumber;
  const added = ids.map((animalId) => {
    const created = createOwnedAnimal(animalId, nextId);
    nextId += 1;
    return created;
  });

  return {
    state: {
      ...state,
      nextInstanceNumber: nextId,
      ownedAnimals: [...state.ownedAnimals, ...added]
    },
    instanceIds: added.map((animal) => animal.instanceId)
  };
};

describe('win condition', () => {
  it('returns score-to-win when 3 blue-ribbon animals are in barn and player calls it a night', () => {
    const base = createInitialGameState('win-a');
    const { state, instanceIds } = withOwnedAnimals(base, ['chimera', 'unicorn', 'dragon']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        barnResidentIds: instanceIds,
        drawPileIds: []
      }
    };

    const next = applyIntent(ready, { type: 'CALL_IT_A_NIGHT' });

    expect(next.phase).toBe('night-summary');
    expect(next.lastNightSummary?.outcome).toBe('score-to-win');
    expect(next.lastNightSummary?.events.length).toBeGreaterThanOrEqual(1);
    expect(next.lastNightSummary?.popBefore).toBe(0);
    expect(next.lastNightSummary?.cashBefore).toBe(0);
  });

  it('returns score-to-shop when only 2 blue-ribbon animals are in barn', () => {
    const base = createInitialGameState('win-b');
    const { state, instanceIds } = withOwnedAnimals(base, ['chimera', 'unicorn']);
    const ready = {
      ...state,
      night: {
        ...state.night,
        barnResidentIds: instanceIds,
        drawPileIds: []
      }
    };

    const next = applyIntent(ready, { type: 'CALL_IT_A_NIGHT' });

    expect(next.phase).toBe('night-summary');
    expect(next.lastNightSummary?.outcome).toBe('score-to-shop');
  });

  it('bust path never returns score-to-win even with 3 blue-ribbon animals in barn', () => {
    const base = createInitialGameState('win-c');
    const { state, instanceIds } = withOwnedAnimals(base, ['chimera', 'jackalope', 'dragon', 'goat', 'goose', 'goat']);
    const ready = {
      ...state,
      barnCapacity: 6,
      night: {
        ...state.night,
        barnResidentIds: instanceIds.slice(0, 5),
        drawPileIds: [instanceIds[5]]
      }
    };

    const busted = applyIntent(ready, { type: 'INVITE_FROM_DOOR' });
    expect(busted.night.bust).toBe(true);

    const pinned = applyIntent(busted, { type: 'SELECT_TARGET', targetId: instanceIds[0] });
    expect(pinned.lastNightSummary?.outcome).toBe('bust-to-shop');
  });

  it('auto-end at capacity can trigger score-to-win', () => {
    const base = createInitialGameState('win-d');
    const { state, instanceIds } = withOwnedAnimals(base, ['chimera', 'unicorn', 'chimera']);
    const ready = {
      ...state,
      barnCapacity: 3,
      night: {
        ...state.night,
        drawPileIds: [...instanceIds]
      }
    };

    const one = applyIntent(ready, { type: 'INVITE_FROM_DOOR' });
    const two = applyIntent(one, { type: 'INVITE_FROM_DOOR' });
    const three = applyIntent(two, { type: 'INVITE_FROM_DOOR' });

    expect(three.phase).toBe('night-summary');
    expect(three.night.autoEnded).toBe(true);
    expect(three.lastNightSummary?.outcome).toBe('score-to-win');
  });
});
