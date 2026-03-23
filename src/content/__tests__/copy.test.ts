import { describe, expect, it } from 'vitest';
import { ANIMAL_IDS } from '../../game/catalog';
import { ANIMAL_POWER_IDS, NIGHT_OUTCOMES, TARGETING_KINDS } from '../../game/types';
import { ANIMAL_COPY, OUTCOME_COPY, POWER_COPY, TARGETING_COPY } from '../copy';

const sorted = (values: readonly string[]) => [...values].sort();

describe('copy coverage', () => {
  it('is exhaustive for animals, powers, outcomes, and targeting kinds', () => {
    expect(sorted(Object.keys(ANIMAL_COPY))).toEqual(sorted(ANIMAL_IDS));
    expect(sorted(Object.keys(POWER_COPY))).toEqual(sorted(ANIMAL_POWER_IDS));
    expect(sorted(Object.keys(OUTCOME_COPY))).toEqual(sorted(NIGHT_OUTCOMES));
    expect(sorted(Object.keys(TARGETING_COPY))).toEqual(sorted(TARGETING_KINDS));
  });

  it('keeps animal copy concise for inspector layout', () => {
    for (const animalId of ANIMAL_IDS) {
      expect(ANIMAL_COPY[animalId].flavor.length).toBeLessThanOrEqual(120);
      expect(ANIMAL_COPY[animalId].shopPitch.length).toBeLessThanOrEqual(120);
    }
  });

  it('keeps power rules concise', () => {
    for (const powerId of ANIMAL_POWER_IDS) {
      expect(POWER_COPY[powerId].rules.length).toBeLessThanOrEqual(80);
    }
  });
});
