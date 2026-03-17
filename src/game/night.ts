import { getAnimalDef } from './animals';
import { drawCard } from './deck';
import { resolveOnEnter, runEntryPipeline } from './abilityResolver';
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
  // Reset abilityUsed on all cards at the start of each night
  const deck = options.deck.map((card) => ({ ...card, abilityUsed: false }));

  return {
    phase: GamePhase.ReadyToDraw,
    nightNumber: options.nightNumber,
    deck,
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
    pendingDecision: null,
    legendaryCount: 0,
    wonThisNight: false,
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

  // Run entry pipeline (steps 1-6)
  const pipelineState = { ...state, deck: drawResult.deck };
  const pipelineResult = runEntryPipeline(pipelineState, drawResult.card);

  events.push(...pipelineResult.events);
  let nextState = pipelineResult.state;

  // If bust or win, stop here
  if (nextState.complete) {
    return { state: nextState, events };
  }

  // Step 7: Resolve on_enter ability (ONLY for player-drawn cards)
  const abilityResult = resolveOnEnter(nextState, drawResult.card);
  events.push(...abilityResult.events);
  nextState = abilityResult.state;

  // If ability set a pending decision, return and wait for player input
  if (nextState.pendingDecision) {
    return { state: nextState, events };
  }

  // Normal flow: check if deck is empty, transition to appropriate phase
  const isDeckEmpty = nextState.deck.length === 0;

  return {
    state: {
      ...nextState,
      phase: isDeckEmpty ? GamePhase.NightSummary : toDecisionPhase(nextState.warning),
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
