import { describe, expect, it } from 'vitest';
import { buildStartingDeck, createCardInstance, drawCard, parseSeedFromSearch, shuffleDeck } from './deck';

describe('deck', () => {
  it('builds the starter herd composition (4 cats, 4 goats, 2 pigs)', () => {
    const { cards } = buildStartingDeck();
    const counts = cards.reduce<Record<string, number>>((accumulator, card) => {
      accumulator[card.animalId] = (accumulator[card.animalId] ?? 0) + 1;
      return accumulator;
    }, {});

    expect(cards).toHaveLength(10);
    expect(counts.BarnCat).toBe(4);
    expect(counts.FeralGoat).toBe(4);
    expect(counts.PotBelliedPig).toBe(2);
  });

  it('shuffles deterministically by seed', () => {
    const { cards } = buildStartingDeck();
    const orderA = shuffleDeck(cards, 'same-seed').map((card) => card.id);
    const orderB = shuffleDeck(cards, 'same-seed').map((card) => card.id);
    const orderC = shuffleDeck(cards, 'different-seed').map((card) => card.id);

    expect(orderA).toEqual(orderB);
    expect(orderA).not.toEqual(orderC);
  });

  it('supports named verification seeds with stable leading cards', () => {
    const { cards } = buildStartingDeck();

    const warningOrder = shuffleDeck(cards, 'sprint2-warning').slice(0, 2).map((card) => card.animalId);
    expect(warningOrder).toEqual(['FeralGoat', 'FeralGoat']);

    const bustOrder = shuffleDeck(cards, 'sprint2-farmer-bust').slice(0, 3).map((card) => card.animalId);
    expect(bustOrder).toEqual(['FeralGoat', 'FeralGoat', 'FeralGoat']);
  });

  it('drawCard returns the top card and remaining deck', () => {
    const deck = [createCardInstance('BarnCat', 1), createCardInstance('FeralGoat', 2)];

    const first = drawCard(deck);
    expect(first.card?.id).toBe('card-0001-BarnCat');
    expect(first.deck).toHaveLength(1);

    const second = drawCard(first.deck);
    expect(second.card?.id).toBe('card-0002-FeralGoat');
    expect(second.deck).toHaveLength(0);

    const empty = drawCard(second.deck);
    expect(empty.card).toBeNull();
  });

  it('parses safe seed query params only', () => {
    expect(parseSeedFromSearch('?seed=sprint2-warning')).toBe('sprint2-warning');
    expect(parseSeedFromSearch('?seed=bad value')).toBeNull();
    expect(parseSeedFromSearch('?seed=<script>')).toBeNull();
    expect(parseSeedFromSearch('')).toBeNull();
  });
});
