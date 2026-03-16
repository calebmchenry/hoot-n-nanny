import { describe, expect, it } from 'vitest';
import { createCardInstance } from './deck';
import { callItANight, countUnmitigatedNoisy, drawAnimal, startNight } from './night';
import { GamePhase } from './types';
import type { AnimalId, CardInstance } from './types';

const makeDeck = (animalIds: AnimalId[]): CardInstance[] => {
  return animalIds.map((animalId, index) => createCardInstance(animalId, index + 1));
};

describe('night', () => {
  it('triggers warning at 2 unmitigated noisy and bust at 3', () => {
    let state = startNight({
      deck: makeDeck(['FeralGoat', 'FeralGoat', 'FeralGoat']),
      capacity: 5,
      nightNumber: 1,
    });

    state = drawAnimal(state).state;
    expect(state.noisyCount).toBe(1);
    expect(state.warning).toBe(false);
    expect(state.bust).toBeNull();

    state = drawAnimal(state).state;
    expect(state.noisyCount).toBe(2);
    expect(state.warning).toBe(true);
    expect(state.phase).toBe(GamePhase.Warning);
    expect(state.bust).toBeNull();

    state = drawAnimal(state).state;
    expect(state.noisyCount).toBe(3);
    expect(state.bust?.type).toBe('farmer');
    expect(state.phase).toBe(GamePhase.Bust);
  });

  it('bunny mitigates one noisy animal', () => {
    let state = startNight({
      deck: makeDeck(['FeralGoat', 'FeralGoat', 'Bunny', 'FeralGoat']),
      capacity: 5,
      nightNumber: 1,
    });

    for (let i = 0; i < 4; i += 1) {
      state = drawAnimal(state).state;
    }

    expect(countUnmitigatedNoisy(state.barn)).toBe(2);
    expect(state.bust).toBeNull();
  });

  it('honey bee stacks with bunny mitigation', () => {
    let state = startNight({
      deck: makeDeck(['FeralGoat', 'FeralGoat', 'Bunny', 'HoneyBee', 'FeralGoat', 'FeralGoat']),
      capacity: 7,
      nightNumber: 1,
    });

    for (let i = 0; i < 6; i += 1) {
      state = drawAnimal(state).state;
      if (state.bust) {
        break;
      }
    }

    expect(countUnmitigatedNoisy(state.barn)).toBe(2);
    expect(state.bust).toBeNull();
  });

  it('triggers barn overwhelmed when animal count exceeds capacity', () => {
    let state = startNight({
      deck: makeDeck([
        'BarnCat',
        'BarnCat',
        'BarnCat',
        'PotBelliedPig',
        'PotBelliedPig',
        'BarnCat',
      ]),
      capacity: 5,
      nightNumber: 1,
    });

    for (let i = 0; i < 5; i += 1) {
      state = drawAnimal(state).state;
      expect(state.bust).toBeNull();
    }

    state = drawAnimal(state).state;
    expect(state.bust?.type).toBe('barn');
  });

  it('auto-scores when deck is exhausted without busting', () => {
    let state = startNight({
      deck: makeDeck(['BarnCat', 'PotBelliedPig']),
      capacity: 5,
      nightNumber: 1,
    });

    state = drawAnimal(state).state;
    expect(state.complete).toBe(false);

    state = drawAnimal(state).state;
    expect(state.complete).toBe(true);
    expect(state.autoScored).toBe(true);
    expect(state.phase).toBe(GamePhase.NightSummary);
  });

  it('does not allow calling it a night before first draw', () => {
    const start = startNight({
      deck: makeDeck(['BarnCat']),
      capacity: 5,
      nightNumber: 1,
    });

    const calledEarly = callItANight(start);
    expect(calledEarly.state.complete).toBe(false);

    const afterDraw = drawAnimal(start).state;
    const called = callItANight(afterDraw).state;
    expect(called.complete).toBe(true);
    expect(called.phase).toBe(GamePhase.NightSummary);
  });
});
