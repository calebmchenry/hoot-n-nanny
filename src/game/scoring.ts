import { getAnimalDef } from './animals';
import type { CardInstance, NightScoreLine, NightScoreSummary } from './types';

const HAY_PENALTY_PER_UNPAID = 7;

export interface MischiefScore {
  lines: NightScoreLine[];
  baseMischief: number;
  bonusMischief: number;
}

export interface HayScore {
  hayEarned: number;
  hayCost: number;
}

export const scoreHay = (barn: CardInstance[]): HayScore => {
  let hayEarned = 0;
  let hayCost = 0;

  for (const card of barn) {
    const animal = getAnimalDef(card.animalId);
    if (animal.hay >= 0) {
      hayEarned += animal.hay;
    } else {
      hayCost += Math.abs(animal.hay);
    }
  }

  return {
    hayEarned,
    hayCost,
  };
};

export const scoreMischief = (barn: CardInstance[], capacity: number): MischiefScore => {
  const barnCatCount = barn.filter((card) => card.animalId === 'BarnCat').length;
  const emptySlots = Math.max(0, capacity - barn.length);

  let baseMischief = 0;
  let bonusMischief = 0;

  const lines = barn.map((card) => {
    const animal = getAnimalDef(card.animalId);
    let lineBonus = 0;

    if (animal.givesHermitCrabBonus) {
      lineBonus += emptySlots;
    }

    if (animal.givesDraftPonyBonus) {
      lineBonus += barnCatCount;
    }

    baseMischief += animal.mischief;
    bonusMischief += lineBonus;

    return {
      cardId: card.id,
      animalId: card.animalId,
      name: animal.name,
      mischief: animal.mischief,
      hay: animal.hay,
      bonusMischief: lineBonus,
    };
  });

  return {
    lines,
    baseMischief,
    bonusMischief,
  };
};

export const scoreNight = (
  barn: CardInstance[],
  options: {
    capacity: number;
    hayBank: number;
    reason: 'called' | 'deck_exhausted' | 'bust';
    bustType: 'farmer' | 'barn' | null;
  },
): NightScoreSummary => {
  if (options.reason === 'bust') {
    return {
      reason: 'bust',
      bustType: options.bustType,
      lines: [],
      baseMischief: 0,
      bonusMischief: 0,
      penaltyMischief: 0,
      totalMischief: 0,
      hayEarned: 0,
      hayCost: 0,
      hayPaid: 0,
      hayUnpaid: 0,
      totalHay: options.hayBank,
    };
  }

  const mischiefScore = scoreMischief(barn, options.capacity);
  const hayScore = scoreHay(barn);
  const hayAvailable = options.hayBank + hayScore.hayEarned;
  const hayPaid = Math.min(hayAvailable, hayScore.hayCost);
  const hayUnpaid = Math.max(0, hayScore.hayCost - hayPaid);
  const penaltyMischief = hayUnpaid * HAY_PENALTY_PER_UNPAID;
  const totalMischief = Math.max(
    0,
    mischiefScore.baseMischief + mischiefScore.bonusMischief - penaltyMischief,
  );

  return {
    reason: options.reason,
    bustType: options.bustType,
    lines: mischiefScore.lines,
    baseMischief: mischiefScore.baseMischief,
    bonusMischief: mischiefScore.bonusMischief,
    penaltyMischief,
    totalMischief,
    hayEarned: hayScore.hayEarned,
    hayCost: hayScore.hayCost,
    hayPaid,
    hayUnpaid,
    totalHay: hayAvailable - hayPaid,
  };
};
