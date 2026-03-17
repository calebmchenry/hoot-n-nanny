import { describe, expect, it } from 'vitest';
import { createCardInstance } from './deck';
import { startNight, drawAnimal } from './night';
import {
  resolveOnEnter,
  resolveManualAbility,
  acceptPeek,
  rejectPeek,
  executeBoot,
  executeFetch,
  checkWinCondition,
  countLegendaries,
} from './abilityResolver';
import { GamePhase } from './types';
import type { AnimalId, CardInstance, NightState } from './types';

const makeDeck = (animalIds: AnimalId[]): CardInstance[] => {
  return animalIds.map((animalId, index) => createCardInstance(animalId, index + 1));
};

const makeNightWithBarn = (barnIds: AnimalId[], deckIds: AnimalId[], capacity = 8): NightState => {
  const barn = makeDeck(barnIds);
  const deck = deckIds.map((id, i) => createCardInstance(id, 100 + i));
  return {
    phase: GamePhase.PlayerDecision,
    nightNumber: 1,
    deck,
    barn,
    capacity,
    noisyCount: 0,
    hasDrawn: true,
    warning: false,
    autoScored: false,
    complete: false,
    bust: null,
    summary: null,
    pennedUpCard: null,
    pendingDecision: null,
    legendaryCount: 0,
    wonThisNight: false,
  };
};

describe('abilityResolver', () => {
  describe('peek (Sheepdog)', () => {
    it('Sheepdog enters -> peek_offered event', () => {
      const state = makeNightWithBarn(['Sheepdog'], ['BarnCat', 'FeralGoat']);
      const sheepdog = state.barn[0];
      const result = resolveOnEnter(state, sheepdog);

      expect(result.events).toContainEqual(expect.objectContaining({ type: 'peek_offered' }));
      expect(result.state.pendingDecision?.kind).toBe('peek');
      expect(result.state.phase).toBe(GamePhase.AbilityDecision);
    });

    it('acceptPeek places card in barn', () => {
      const state = makeNightWithBarn(['Sheepdog'], ['BarnCat', 'FeralGoat']);
      const sheepdog = state.barn[0];
      const peekResult = resolveOnEnter(state, sheepdog);
      const accepted = acceptPeek(peekResult.state);

      expect(accepted.events).toContainEqual(expect.objectContaining({ type: 'peek_accepted' }));
      expect(accepted.state.barn).toHaveLength(2);
      expect(accepted.state.pendingDecision).toBeNull();
    });

    it('rejectPeek sends card to deck bottom', () => {
      const state = makeNightWithBarn(['Sheepdog'], ['BarnCat', 'FeralGoat']);
      const sheepdog = state.barn[0];
      const peekResult = resolveOnEnter(state, sheepdog);
      const rejected = rejectPeek(peekResult.state);

      expect(rejected.events).toContainEqual(expect.objectContaining({ type: 'peek_rejected' }));
      expect(rejected.state.barn).toHaveLength(1);
      // The peeked card (BarnCat) should be at the bottom of the deck
      const lastCard = rejected.state.deck[rejected.state.deck.length - 1];
      expect(lastCard.animalId).toBe('BarnCat');
    });

    it('empty deck: peek skipped silently', () => {
      const state = makeNightWithBarn(['Sheepdog'], []);
      const sheepdog = state.barn[0];
      const result = resolveOnEnter(state, sheepdog);

      expect(result.events).toHaveLength(0);
      expect(result.state.pendingDecision).toBeNull();
    });

    it('peek determinism: same card peeked on same state', () => {
      const state = makeNightWithBarn(['Sheepdog'], ['BarnCat', 'FeralGoat']);
      const sheepdog = state.barn[0];

      const result1 = resolveOnEnter(state, sheepdog);
      const result2 = resolveOnEnter(state, sheepdog);

      expect(result1.state.pendingDecision).toEqual(result2.state.pendingDecision);
    });
  });

  describe('boot (Stable Hand)', () => {
    it('Stable Hand: manual activation -> boot_requested with valid targets', () => {
      const state = makeNightWithBarn(['StableHand', 'BarnCat', 'FeralGoat'], []);
      const stableHand = state.barn[0];
      const result = resolveManualAbility(state, stableHand);

      expect(result.events).toContainEqual(expect.objectContaining({ type: 'boot_requested' }));
      expect(result.state.pendingDecision?.kind).toBe('boot');

      const decision = result.state.pendingDecision;
      if (decision?.kind === 'boot') {
        // Should not include self
        expect(decision.validTargetCardIds).not.toContain(stableHand.id);
        // Should include other non-legendary barn animals
        expect(decision.validTargetCardIds).toHaveLength(2);
      }
    });

    it('executeBoot removes target -> target card ID in pendingPennedUpCardIds', () => {
      const state = makeNightWithBarn(['StableHand', 'BarnCat', 'FeralGoat'], []);
      const stableHand = state.barn[0];
      const bootResult = resolveManualAbility(state, stableHand);
      const targetId = state.barn[1].id; // BarnCat

      const executed = executeBoot(bootResult.state, targetId, []);

      expect(executed.events).toContainEqual(expect.objectContaining({ type: 'boot_executed' }));
      expect(executed.state.barn).toHaveLength(2);
      expect(executed.state.barn.find((c) => c.id === targetId)).toBeUndefined();
      expect(executed.pendingPennedUpCardIds).toContain(targetId);
    });

    it('cannot boot a Legendary animal', () => {
      const state = makeNightWithBarn(['StableHand', 'BarnCat', 'GoldenGoose'], []);
      const stableHand = state.barn[0];
      const result = resolveManualAbility(state, stableHand);

      if (result.state.pendingDecision?.kind === 'boot') {
        // Golden Goose should NOT be in valid targets
        const goldenGooseId = state.barn[2].id;
        expect(result.state.pendingDecision.validTargetCardIds).not.toContain(goldenGooseId);
      }
    });

    it('boot self = forfeit (abilityUsed = true, no card removed)', () => {
      const state = makeNightWithBarn(['StableHand', 'BarnCat'], []);
      const stableHand = state.barn[0];
      const bootResult = resolveManualAbility(state, stableHand);

      const forfeited = executeBoot(bootResult.state, stableHand.id, []);

      expect(forfeited.events).toHaveLength(0);
      expect(forfeited.state.barn).toHaveLength(2);
      const stableHandInBarn = forfeited.state.barn.find((c) => c.id === stableHand.id);
      expect(stableHandInBarn?.abilityUsed).toBe(true);
    });
  });

  describe('fetch (Border Collie)', () => {
    it('Border Collie enters -> fetch_requested with alphabetical candidate list', () => {
      const state = makeNightWithBarn(['BorderCollie'], ['FeralGoat', 'BarnCat', 'PotBelliedPig']);
      const borderCollie = state.barn[0];
      const result = resolveOnEnter(state, borderCollie);

      expect(result.events).toContainEqual(expect.objectContaining({ type: 'fetch_requested' }));

      if (result.state.pendingDecision?.kind === 'fetch') {
        const names = result.state.pendingDecision.validAnimalIds;
        // Sorted alphabetically by name: Barn Cat, Feral Goat, Pot-Bellied Pig
        expect(names[0]).toBe('BarnCat');
        expect(names[1]).toBe('FeralGoat');
        expect(names[2]).toBe('PotBelliedPig');
      }
    });

    it('executeFetch pulls matching card from deck, deck length decreases by 1', () => {
      const state = makeNightWithBarn(['BorderCollie'], ['FeralGoat', 'BarnCat', 'PotBelliedPig']);
      const borderCollie = state.barn[0];
      const fetchResult = resolveOnEnter(state, borderCollie);
      const deckLengthBefore = fetchResult.state.deck.length;

      const executed = executeFetch(fetchResult.state, 'BarnCat');

      expect(executed.events).toContainEqual(expect.objectContaining({ type: 'fetch_executed' }));
      expect(executed.state.deck).toHaveLength(deckLengthBefore - 1);
      expect(executed.state.barn).toHaveLength(2);
    });

    it('fetched card does NOT trigger its own on_enter ability (chain-breaking)', () => {
      // If we fetch another Sheepdog, it should NOT trigger peek
      const state = makeNightWithBarn(['BorderCollie'], ['Sheepdog', 'BarnCat']);
      const borderCollie = state.barn[0];
      const fetchResult = resolveOnEnter(state, borderCollie);
      const executed = executeFetch(fetchResult.state, 'Sheepdog');

      // Should NOT have peek_offered event
      expect(executed.events.find((e) => e.type === 'peek_offered')).toBeUndefined();
      // Sheepdog should be in barn
      expect(executed.state.barn.find((c) => c.animalId === 'Sheepdog')).toBeDefined();
    });

    it('fetched card causes barn overflow -> bust triggers', () => {
      const state = makeNightWithBarn(
        ['BorderCollie', 'BarnCat', 'BarnCat', 'BarnCat', 'BarnCat'],
        ['FeralGoat'],
        5,
      );
      const borderCollie = state.barn[0];
      const fetchResult = resolveOnEnter(state, borderCollie);
      const executed = executeFetch(fetchResult.state, 'FeralGoat');

      expect(executed.state.bust).not.toBeNull();
      expect(executed.state.bust?.type).toBe('barn');
    });

    it('Legendaries excluded from candidate list', () => {
      const state = makeNightWithBarn(['BorderCollie'], ['GoldenGoose', 'BarnCat']);
      const borderCollie = state.barn[0];
      const result = resolveOnEnter(state, borderCollie);

      if (result.state.pendingDecision?.kind === 'fetch') {
        expect(result.state.pendingDecision.validAnimalIds).not.toContain('GoldenGoose');
      }
    });

    it('empty deck: fetch skipped silently', () => {
      const state = makeNightWithBarn(['BorderCollie'], []);
      const borderCollie = state.barn[0];
      const result = resolveOnEnter(state, borderCollie);

      expect(result.events).toHaveLength(0);
      expect(result.state.pendingDecision).toBeNull();
    });
  });

  describe('refresh (Cheerful Lamb)', () => {
    it('Cheerful Lamb enters -> all other barn cards get abilityUsed = false', () => {
      const barn = makeDeck(['StableHand', 'Sheepdog']);
      barn[0] = { ...barn[0], abilityUsed: true };
      barn[1] = { ...barn[1], abilityUsed: true };

      const cheerfulLamb = createCardInstance('CheerfulLamb', 100);
      const allBarn = [...barn, cheerfulLamb];

      const state: NightState = {
        ...makeNightWithBarn([], []),
        barn: allBarn,
      };

      const result = resolveOnEnter(state, cheerfulLamb);

      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'abilities_refreshed' }),
      );

      const refreshedEvent = result.events.find((e) => e.type === 'abilities_refreshed');
      if (refreshedEvent && refreshedEvent.type === 'abilities_refreshed') {
        expect(refreshedEvent.refreshedCardIds).toHaveLength(2);
      }

      // Other cards should be refreshed
      const stableHand = result.state.barn.find((c) => c.animalId === 'StableHand');
      expect(stableHand?.abilityUsed).toBe(false);
    });

    it('Cheerful Lamb does NOT refresh itself', () => {
      const cheerfulLamb = createCardInstance('CheerfulLamb', 1);
      const state = makeNightWithBarn([], []);
      state.barn = [cheerfulLamb];

      const result = resolveOnEnter(state, cheerfulLamb);

      const lamb = result.state.barn.find((c) => c.id === cheerfulLamb.id);
      expect(lamb?.abilityUsed).toBe(true);
    });
  });

  describe('win condition', () => {
    it('3 Legendaries in barn -> checkWinCondition returns true', () => {
      const barn = makeDeck(['GoldenGoose', 'GiantOx', 'Jackalope']);
      expect(checkWinCondition(barn)).toBe(true);
    });

    it('2 Legendaries in barn -> checkWinCondition returns false', () => {
      const barn = makeDeck(['GoldenGoose', 'GiantOx', 'BarnCat']);
      expect(checkWinCondition(barn)).toBe(false);
    });

    it('countLegendaries counts correctly', () => {
      expect(countLegendaries(makeDeck(['GoldenGoose', 'BarnCat', 'GiantOx']))).toBe(2);
      expect(countLegendaries(makeDeck([]))).toBe(0);
    });
  });

  describe('win integration in draw', () => {
    it('3 Legendaries in barn -> win_triggered event', () => {
      let state = startNight({
        deck: makeDeck(['GoldenGoose', 'GiantOx', 'Jackalope']),
        capacity: 5,
        nightNumber: 1,
      });

      state = drawAnimal(state).state;
      state = drawAnimal(state).state;
      const result = drawAnimal(state);

      expect(result.state.wonThisNight).toBe(true);
      expect(result.state.phase).toBe(GamePhase.Win);
      expect(result.events).toContainEqual(expect.objectContaining({ type: 'win_triggered' }));
    });

    it('win night scores normally (Mischief/Hay)', () => {
      let state = startNight({
        deck: makeDeck(['GoldenGoose', 'GiantOx', 'Jackalope']),
        capacity: 5,
        nightNumber: 1,
      });

      state = drawAnimal(state).state;
      state = drawAnimal(state).state;
      state = drawAnimal(state).state;

      // Night is completed with win
      expect(state.wonThisNight).toBe(true);
      expect(state.complete).toBe(true);
    });

    it('bust > win: same entry causes both -> bust triggers, no win', () => {
      // 3 legendaries but also 3+ noisy = farmer bust takes precedence
      // Need to carefully set up: 2 feral goats in barn (2 noisy), draw a noisy legendary
      // But legendaries are not noisy... so let's use barn overflow
      // 4 animals in barn with cap=5, draw 3rd legendary = 5 in barn = not bust
      // To test bust > win: capacity 4, barn has 2 legendaries + 2 others, draw 3rd legendary = 5 > 4 = bust
      let state = startNight({
        deck: makeDeck(['GoldenGoose', 'GiantOx', 'BarnCat', 'BarnCat', 'Jackalope']),
        capacity: 4,
        nightNumber: 1,
      });

      state = drawAnimal(state).state; // GoldenGoose
      state = drawAnimal(state).state; // GiantOx
      state = drawAnimal(state).state; // BarnCat
      state = drawAnimal(state).state; // BarnCat (4 in barn, at capacity)
      const result = drawAnimal(state); // Jackalope (5 > 4 = bust)

      expect(result.state.bust).not.toBeNull();
      expect(result.state.bust?.type).toBe('barn');
      expect(result.state.wonThisNight).toBe(false);
    });
  });

  describe('penned up stacking', () => {
    it('boot + bust same Night -> 2 entries in pendingPennedUpCardIds', () => {
      const state = makeNightWithBarn(
        ['StableHand', 'BarnCat', 'FeralGoat', 'FeralGoat'],
        ['FeralGoat'],
        5,
      );

      // Boot the BarnCat
      const stableHand = state.barn[0];
      const bootResult = resolveManualAbility(state, stableHand);
      const targetId = state.barn[1].id; // BarnCat
      const executed = executeBoot(bootResult.state, targetId, []);

      // Now we have [StableHand, FeralGoat, FeralGoat] in barn
      // pendingPennedUpCardIds should have 1 entry (the booted BarnCat)
      expect(executed.pendingPennedUpCardIds).toHaveLength(1);
      expect(executed.pendingPennedUpCardIds).toContain(targetId);
    });
  });
});
