import { describe, expect, it } from 'vitest';
import { createCardInstance } from './deck';
import { scoreHay, scoreMischief, scoreNight } from './scoring';

describe('scoring', () => {
  it('calculates mischief with hermit crab and draft pony bonuses', () => {
    const barn = [
      createCardInstance('HermitCrab', 1),
      createCardInstance('BarnCat', 2),
      createCardInstance('DraftPony', 3),
      createCardInstance('BarnCat', 4),
    ];

    const score = scoreMischief(barn, 5);
    expect(score.baseMischief).toBe(4);
    expect(score.bonusMischief).toBe(3);
  });

  it('tracks hay earned and hay cost separately', () => {
    const barn = [
      createCardInstance('PotBelliedPig', 1),
      createCardInstance('Hen', 2),
      createCardInstance('MilkmaidGoat', 3),
    ];

    const hay = scoreHay(barn);
    expect(hay.hayEarned).toBe(3);
    expect(hay.hayCost).toBe(1);
  });

  it('applies -7 mischief per unpaid hay and floors at zero', () => {
    const barn = [createCardInstance('MilkmaidGoat', 1)];

    const summary = scoreNight(barn, {
      capacity: 5,
      hayBank: 0,
      reason: 'called',
      bustType: null,
    });

    expect(summary.baseMischief).toBe(4);
    expect(summary.penaltyMischief).toBe(7);
    expect(summary.totalMischief).toBe(0);
    expect(summary.hayUnpaid).toBe(1);
    expect(summary.totalHay).toBe(0);
  });

  it('uses available hay bank before applying penalty', () => {
    const barn = [createCardInstance('MilkmaidGoat', 1)];

    const summary = scoreNight(barn, {
      capacity: 5,
      hayBank: 1,
      reason: 'called',
      bustType: null,
    });

    expect(summary.hayPaid).toBe(1);
    expect(summary.hayUnpaid).toBe(0);
    expect(summary.penaltyMischief).toBe(0);
    expect(summary.totalMischief).toBe(4);
    expect(summary.totalHay).toBe(0);
  });

  it('awards zero points on bust', () => {
    const summary = scoreNight([createCardInstance('WildBoar', 1)], {
      capacity: 5,
      hayBank: 3,
      reason: 'bust',
      bustType: 'farmer',
    });

    expect(summary.totalMischief).toBe(0);
    expect(summary.totalHay).toBe(3);
  });
});
