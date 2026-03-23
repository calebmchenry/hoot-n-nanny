import { describe, expect, it } from 'vitest';
import { findOwnedAnimal } from '../selectors';
import { createSeededBustState } from '../state';

describe('seeded states', () => {
  it('creates a deterministic bust setup with a pin-worthy first bust', () => {
    const state = createSeededBustState();
    const firstThree = state.night.drawPileIds.slice(0, 3).map((id) => findOwnedAnimal(state, id)?.animalId ?? null);

    expect(firstThree).toEqual(['goose', 'goat', 'goat']);
    expect(state.ownedAnimals.filter((animal) => animal.animalId === 'goose')).toHaveLength(1);
  });
});
