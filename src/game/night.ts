import { getAnimalDef } from './animals';
import { drawCard } from './deck';
import {
  GamePhase,
  type BustType,
  type CardInstance,
  type NightEvent,
  type NightState,
} from './types';

export const countUnmitigatedNoisy = (barn: CardInstance[]): number => {
  const noisyCount = barn.filter((card) => getAnimalDef(card.animalId).noisy).length;
  const mitigation = barn.reduce((total, card) => {
    return total + getAnimalDef(card.animalId).noisyMitigation;
  }, 0);

  return Math.max(0, noisyCount - mitigation);
};

export const checkBust = (
  barn: CardInstance[],
  capacity: number,
  noisyCount = countUnmitigatedNoisy(barn),
): BustType | null => {
  if (noisyCount >= 3) {
    return 'farmer';
  }

  if (barn.length > capacity) {
    return 'barn';
  }

  return null;
};

export const startNight = (options: {
  deck: CardInstance[];
  capacity: number;
  nightNumber: number;
  pennedUpCard?: CardInstance | null;
}): NightState => {
  return {
    phase: GamePhase.ReadyToDraw,
    nightNumber: options.nightNumber,
    deck: [...options.deck],
    barn: [],
    capacity: options.capacity,
    noisyCount: 0,
    hasDrawn: false,
    warning: false,
    autoScored: false,
    complete: false,
    bust: null,
    summary: null,
    pennedUpCard: options.pennedUpCard ?? null,
  };
};

const toDecisionPhase = (warning: boolean): GamePhase => {
  return warning ? GamePhase.Warning : GamePhase.PlayerDecision;
};

export const drawAnimal = (
  state: NightState,
): {
  state: NightState;
  events: NightEvent[];
} => {
  if (state.complete) {
    return {
      state,
      events: [],
    };
  }

  const drawResult = drawCard(state.deck);

  if (!drawResult.card) {
    return {
      state: {
        ...state,
        phase: GamePhase.NightSummary,
        complete: true,
        autoScored: true,
      },
      events: [],
    };
  }

  const events: NightEvent[] = [{ type: 'card_draw_started' }];
  const nextBarn = [...state.barn, drawResult.card];
  const nextNoisyCount = countUnmitigatedNoisy(nextBarn);
  const nextWarning = nextNoisyCount >= 2;

  events.push({
    type: 'card_revealed',
    card: drawResult.card,
    slotIndex: nextBarn.length - 1,
  });

  if (nextNoisyCount !== state.noisyCount || nextWarning !== state.warning) {
    events.push({
      type: 'warning_state_changed',
      noisyCount: nextNoisyCount,
      warning: nextWarning,
    });
  }

  const bustType = checkBust(nextBarn, state.capacity, nextNoisyCount);

  if (bustType) {
    events.push({
      type: 'bust_triggered',
      bustType,
      card: drawResult.card,
    });

    return {
      state: {
        ...state,
        phase: GamePhase.Bust,
        deck: drawResult.deck,
        barn: nextBarn,
        noisyCount: nextNoisyCount,
        warning: nextWarning,
        hasDrawn: true,
        complete: true,
        bust: {
          type: bustType,
          card: drawResult.card,
        },
      },
      events,
    };
  }

  const isDeckEmpty = drawResult.deck.length === 0;

  return {
    state: {
      ...state,
      phase: isDeckEmpty ? GamePhase.NightSummary : toDecisionPhase(nextWarning),
      deck: drawResult.deck,
      barn: nextBarn,
      noisyCount: nextNoisyCount,
      warning: nextWarning,
      hasDrawn: true,
      autoScored: isDeckEmpty,
      complete: isDeckEmpty,
    },
    events,
  };
};

export const callItANight = (
  state: NightState,
): {
  state: NightState;
  events: NightEvent[];
} => {
  if (state.complete || !state.hasDrawn) {
    return {
      state,
      events: [],
    };
  }

  return {
    state: {
      ...state,
      phase: GamePhase.NightSummary,
      complete: true,
    },
    events: [],
  };
};
