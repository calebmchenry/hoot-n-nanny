import { describe, expect, it } from 'vitest';
import { ABILITY_REGISTRY, type AbilityKind } from './abilities';
import { ALL_ANIMALS, getAnimalDef } from './animals';
import { createCardInstance } from './deck';

describe('abilities', () => {
  it('ABILITY_REGISTRY has an entry for every AbilityKind with non-empty description', () => {
    const kinds: AbilityKind[] = [
      'none',
      'noisy_mitigation',
      'bonus_per_empty_slot',
      'bonus_per_barn_cat',
      'peek',
      'boot',
      'fetch',
      'refresh',
    ];

    for (const kind of kinds) {
      const entry = ABILITY_REGISTRY[kind];
      expect(entry).toBeDefined();
      expect(entry.kind).toBe(kind);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('getAnimalDef returns correct abilityKind and tier for all animals', () => {
    // Existing animals
    expect(getAnimalDef('BarnCat').abilityKind).toBe('none');
    expect(getAnimalDef('BarnCat').tier).toBe('common');
    expect(getAnimalDef('Bunny').abilityKind).toBe('noisy_mitigation');
    expect(getAnimalDef('HoneyBee').abilityKind).toBe('noisy_mitigation');
    expect(getAnimalDef('HermitCrab').abilityKind).toBe('bonus_per_empty_slot');
    expect(getAnimalDef('DraftPony').abilityKind).toBe('bonus_per_barn_cat');

    // Active-ability animals
    expect(getAnimalDef('Sheepdog').abilityKind).toBe('peek');
    expect(getAnimalDef('StableHand').abilityKind).toBe('boot');
    expect(getAnimalDef('BorderCollie').abilityKind).toBe('fetch');
    expect(getAnimalDef('CheerfulLamb').abilityKind).toBe('refresh');

    // Legendaries
    expect(getAnimalDef('GoldenGoose').tier).toBe('legendary');
    expect(getAnimalDef('SilverMare').abilityKind).toBe('noisy_mitigation');
    expect(getAnimalDef('GreatStag').abilityKind).toBe('boot');
    expect(getAnimalDef('BarnDragon').abilityKind).toBe('fetch');
  });

  it('CardInstance initializes with abilityUsed = false', () => {
    const card = createCardInstance('Sheepdog', 1);
    expect(card.abilityUsed).toBe(false);
  });

  it('all 8 Legendaries have tier=legendary and correct costMischief values', () => {
    const legendaries = ALL_ANIMALS.filter((a) => a.tier === 'legendary');
    expect(legendaries).toHaveLength(8);

    const costMap: Record<string, number> = {
      GoldenGoose: 30,
      GiantOx: 35,
      Jackalope: 40,
      Thunderbird: 45,
      SilverMare: 45,
      LuckyToad: 50,
      GreatStag: 50,
      BarnDragon: 55,
    };

    for (const legendary of legendaries) {
      expect(legendary.costMischief).toBe(costMap[legendary.id]);
    }
  });

  it('every animal has abilityKind that resolves to a registry entry', () => {
    for (const animal of ALL_ANIMALS) {
      const entry = ABILITY_REGISTRY[animal.abilityKind];
      expect(entry).toBeDefined();
      expect(entry.kind).toBe(animal.abilityKind);
    }
  });
});
