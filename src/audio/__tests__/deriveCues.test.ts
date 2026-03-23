import { describe, expect, it } from 'vitest';
import { createOwnedAnimal } from '../../game/catalog';
import { createInitialGameState } from '../../game/state';
import type { GameState, NightSummary } from '../../game/types';
import { deriveCues } from '../deriveCues';

const makeSummary = (overrides: Partial<NightSummary> = {}): NightSummary => ({
  outcome: 'score-to-shop',
  popBefore: 0,
  popAfter: 1,
  cashBefore: 0,
  cashAfter: 0,
  events: [],
  pinnedForNextNight: null,
  winningBlueRibbonIds: [],
  ...overrides
});

const withPhase = (state: GameState, phase: GameState['phase']): GameState => ({
  ...state,
  phase
});

describe('deriveCues', () => {
  it('fires bust exactly once when bust first appears', () => {
    const base = createInitialGameState('audio-bust');
    const busted = {
      ...base,
      night: {
        ...base.night,
        bust: true
      }
    };

    const first = deriveCues(base, busted).map((cue) => cue.id);
    expect(first.filter((id) => id === 'sfx:bust')).toHaveLength(1);

    const summaryState = {
      ...busted,
      phase: 'night-summary' as const,
      lastNightSummary: makeSummary({ outcome: 'bust-to-shop' })
    };

    const second = deriveCues(busted, summaryState).map((cue) => cue.id);
    expect(second.includes('sfx:bust')).toBe(false);
  });

  it('fires purchase once for shop purchases and capacity upgrades', () => {
    const base = createInitialGameState('audio-purchase');
    const shopState: GameState = {
      ...base,
      phase: 'shop',
      shopState: {
        regularOffers: [
          {
            offerId: 'offer-chicken',
            animalId: 'chicken',
            costPop: 3,
            stock: 1,
            infiniteStock: false,
            soldOut: false
          }
        ],
        blueRibbonOffers: [
          {
            offerId: 'offer-chimera',
            animalId: 'chimera',
            costPop: 40,
            stock: 999,
            infiniteStock: true,
            soldOut: false
          }
        ]
      }
    };

    const purchasedAnimal = createOwnedAnimal('chimera', shopState.nextInstanceNumber);
    const animalPurchaseNext: GameState = {
      ...shopState,
      nextInstanceNumber: shopState.nextInstanceNumber + 1,
      ownedAnimals: [...shopState.ownedAnimals, purchasedAnimal],
      pop: shopState.pop - 40
    };

    expect(deriveCues(shopState, animalPurchaseNext).map((cue) => cue.id)).toContain('sfx:purchase');

    const capacityNext: GameState = {
      ...shopState,
      capacityUpgradeCount: shopState.capacityUpgradeCount + 1,
      cash: shopState.cash - 3,
      barnCapacity: shopState.barnCapacity + 1
    };

    expect(deriveCues(shopState, capacityNext).map((cue) => cue.id)).toContain('sfx:purchase');
  });

  it('fires activate-ability when usedAbilityIds grows', () => {
    const base = createInitialGameState('audio-ability');
    const next = {
      ...base,
      night: {
        ...base.night,
        usedAbilityIds: ['animal-99']
      }
    };

    const cues = deriveCues(base, next).map((cue) => cue.id);
    expect(cues).toContain('sfx:activate-ability');
  });

  it('fires scoring jingle once on non-bust night-summary transition', () => {
    const base = createInitialGameState('audio-summary');
    const summaryState: GameState = {
      ...base,
      phase: 'night-summary',
      lastNightSummary: makeSummary({ outcome: 'score-to-shop' })
    };

    const first = deriveCues(base, summaryState).map((cue) => cue.id);
    expect(first.filter((id) => id === 'sfx:scoring-jingle')).toHaveLength(1);

    const steadySummary = {
      ...summaryState,
      pop: summaryState.pop + 1
    };
    const second = deriveCues(summaryState, steadySummary).map((cue) => cue.id);
    expect(second.includes('sfx:scoring-jingle')).toBe(false);
  });

  it('stops music and plays fanfare when entering win', () => {
    const base = withPhase(createInitialGameState('audio-win'), 'night-summary');
    const next = withPhase(
      {
        ...base,
        lastNightSummary: makeSummary({ outcome: 'score-to-win' })
      },
      'win'
    );

    const ids = deriveCues(base, next).map((cue) => cue.id);
    expect(ids).toContain('music:stop');
    expect(ids).toContain('sfx:win-fanfare');
  });

  it('does not restart barn music from night to night-summary', () => {
    const base = withPhase(createInitialGameState('audio-music'), 'night');
    const next = withPhase(
      {
        ...base,
        lastNightSummary: makeSummary({ outcome: 'score-to-shop' })
      },
      'night-summary'
    );

    const ids = deriveCues(base, next).map((cue) => cue.id);
    expect(ids.includes('music:barn-party')).toBe(false);
  });

  it('emits staggered animal-entry cues for multiple entrants', () => {
    const base = createInitialGameState('audio-entry');
    const goat = createOwnedAnimal('goat', base.nextInstanceNumber);
    const pig = createOwnedAnimal('pig', base.nextInstanceNumber + 1);

    const next: GameState = {
      ...base,
      nextInstanceNumber: base.nextInstanceNumber + 2,
      ownedAnimals: [...base.ownedAnimals, goat, pig],
      night: {
        ...base.night,
        barnResidentIds: [goat.instanceId, pig.instanceId]
      }
    };

    const cues = deriveCues(base, next);
    expect(cues).toContainEqual({ id: 'sfx:animal-entry:goat', delayMs: 0 });
    expect(cues).toContainEqual({ id: 'sfx:animal-entry:pig', delayMs: 100 });
  });
});
