import { ABILITY_REGISTRY } from './abilities';
import { getAnimalDef } from './animals';
import { countUnmitigatedNoisy, checkBust } from './night';
import type { AnimalId, CardInstance, NightEvent, NightState } from './types';
import { GamePhase } from './types';

/**
 * Count legendary animals in barn.
 */
export const countLegendaries = (barn: CardInstance[]): number => {
  return barn.filter((card) => getAnimalDef(card.animalId).tier === 'legendary').length;
};

/**
 * Check win condition: 3+ Legendaries simultaneously in barn.
 */
export const checkWinCondition = (barn: CardInstance[]): boolean => {
  return countLegendaries(barn) >= 3;
};

/**
 * Run entry pipeline steps 1-6 for a card entering the barn.
 * Used by peek-accept, fetch, and the main draw path.
 * Does NOT run step 7 (on_enter ability resolution).
 *
 * Returns updated state and events.
 */
export const runEntryPipeline = (
  state: NightState,
  card: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  const events: NightEvent[] = [];

  // Step 1: Card enters barn
  const nextBarn = [...state.barn, card];
  const slotIndex = nextBarn.length - 1;
  events.push({ type: 'card_revealed', card, slotIndex });

  // Step 2: Update noise state
  const nextNoisyCount = countUnmitigatedNoisy(nextBarn);
  const nextWarning = nextNoisyCount >= 2;

  if (nextNoisyCount !== state.noisyCount || nextWarning !== state.warning) {
    events.push({
      type: 'warning_state_changed',
      noisyCount: nextNoisyCount,
      warning: nextWarning,
    });
  }

  // Step 3: Check bust
  const bustType = checkBust(nextBarn, state.capacity, nextNoisyCount);

  if (bustType) {
    // Step 4: If bust, stop
    events.push({ type: 'bust_triggered', bustType, card });
    return {
      state: {
        ...state,
        phase: GamePhase.Bust,
        barn: nextBarn,
        noisyCount: nextNoisyCount,
        warning: nextWarning,
        hasDrawn: true,
        complete: true,
        bust: { type: bustType, card },
      },
      events,
    };
  }

  // Step 5: Recompute legendary count
  const nextLegendaryCount = countLegendaries(nextBarn);
  if (nextLegendaryCount !== state.legendaryCount) {
    events.push({
      type: 'legendary_count_changed',
      count: nextLegendaryCount,
      required: 3,
    });
  }

  // Step 6: Check win
  if (nextLegendaryCount >= 3) {
    const legendaryCardIds = nextBarn
      .filter((c) => getAnimalDef(c.animalId).tier === 'legendary')
      .map((c) => c.id);
    events.push({
      type: 'win_triggered',
      legendaryCardIds,
      nightNumber: state.nightNumber,
    });
    return {
      state: {
        ...state,
        phase: GamePhase.Win,
        barn: nextBarn,
        noisyCount: nextNoisyCount,
        warning: nextWarning,
        hasDrawn: true,
        complete: true,
        legendaryCount: nextLegendaryCount,
        wonThisNight: true,
      },
      events,
    };
  }

  return {
    state: {
      ...state,
      barn: nextBarn,
      noisyCount: nextNoisyCount,
      warning: nextWarning,
      hasDrawn: true,
      legendaryCount: nextLegendaryCount,
    },
    events,
  };
};

// ---- Private resolve helpers ----

const resolvePeek = (
  state: NightState,
  enteredCard: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  if (state.deck.length === 0) {
    // Empty deck: skip silently
    return { state, events: [] };
  }

  const previewCard = state.deck[0];
  const remainingDeck = state.deck.slice(1);

  const events: NightEvent[] = [
    { type: 'ability_triggered', cardId: enteredCard.id, abilityKind: 'peek' },
    { type: 'peek_offered', sourceCardId: enteredCard.id, previewCard },
  ];

  return {
    state: {
      ...state,
      deck: remainingDeck,
      phase: GamePhase.AbilityDecision,
      pendingDecision: {
        kind: 'peek',
        sourceCardId: enteredCard.id,
        previewCard,
      },
    },
    events,
  };
};

const resolveFetch = (
  state: NightState,
  enteredCard: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  // Build candidate list: unique AnimalId values in deck, excluding Legendaries, sorted by name
  const seen = new Set<AnimalId>();
  const validAnimalIds: AnimalId[] = [];

  for (const card of state.deck) {
    const def = getAnimalDef(card.animalId);
    if (def.tier !== 'legendary' && !seen.has(card.animalId)) {
      seen.add(card.animalId);
      validAnimalIds.push(card.animalId);
    }
  }

  if (validAnimalIds.length === 0) {
    // Empty deck or no valid candidates: skip silently
    return { state, events: [] };
  }

  // Sort alphabetically by animal name
  validAnimalIds.sort((a, b) => getAnimalDef(a).name.localeCompare(getAnimalDef(b).name));

  const events: NightEvent[] = [
    { type: 'ability_triggered', cardId: enteredCard.id, abilityKind: 'fetch' },
    { type: 'fetch_requested', sourceCardId: enteredCard.id, validAnimalIds },
  ];

  return {
    state: {
      ...state,
      phase: GamePhase.AbilityDecision,
      pendingDecision: {
        kind: 'fetch',
        sourceCardId: enteredCard.id,
        validAnimalIds,
      },
    },
    events,
  };
};

const resolveRefresh = (
  state: NightState,
  enteredCard: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  const refreshedCardIds: string[] = [];
  const nextBarn = state.barn.map((card) => {
    if (card.id === enteredCard.id) {
      // Mark self as used
      return { ...card, abilityUsed: true };
    }
    const def = getAnimalDef(card.animalId);
    const ability = ABILITY_REGISTRY[def.abilityKind];
    // Only refresh cards with active abilities (on_enter or manual) that have been used
    if ((ability.trigger === 'on_enter' || ability.trigger === 'manual') && card.abilityUsed) {
      refreshedCardIds.push(card.id);
      return { ...card, abilityUsed: false };
    }
    return card;
  });

  const events: NightEvent[] = [
    { type: 'ability_triggered', cardId: enteredCard.id, abilityKind: 'refresh' },
    { type: 'abilities_refreshed', sourceCardId: enteredCard.id, refreshedCardIds },
  ];

  return {
    state: {
      ...state,
      barn: nextBarn,
    },
    events,
  };
};

/**
 * Called after a card enters the barn via normal draw.
 * CHAIN-BREAKING RULE: Only called for cards drawn by DRAW ANIMAL action.
 */
export const resolveOnEnter = (
  state: NightState,
  enteredCard: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  const def = getAnimalDef(enteredCard.animalId);
  const ability = ABILITY_REGISTRY[def.abilityKind];

  if (ability.trigger !== 'on_enter') {
    return { state, events: [] };
  }

  switch (ability.kind) {
    case 'peek':
      return resolvePeek(state, enteredCard);
    case 'fetch':
      return resolveFetch(state, enteredCard);
    case 'refresh':
      return resolveRefresh(state, enteredCard);
    default:
      return { state, events: [] };
  }
};

/**
 * Called when a player taps a card with a manual ability (e.g., Stable Hand boot).
 */
export const resolveManualAbility = (
  state: NightState,
  sourceCard: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  const def = getAnimalDef(sourceCard.animalId);
  const ability = ABILITY_REGISTRY[def.abilityKind];

  if (ability.trigger !== 'manual' || sourceCard.abilityUsed) {
    return { state, events: [] };
  }

  switch (ability.kind) {
    case 'boot':
      return resolveBoot(state, sourceCard);
    default:
      return { state, events: [] };
  }
};

const resolveBoot = (
  state: NightState,
  sourceCard: CardInstance,
): { state: NightState; events: NightEvent[] } => {
  // Valid targets: all barn cards except Legendaries and the source card itself
  const validTargetCardIds = state.barn
    .filter((card) => {
      if (card.id === sourceCard.id) return false;
      const def = getAnimalDef(card.animalId);
      return def.tier !== 'legendary';
    })
    .map((card) => card.id);

  const events: NightEvent[] = [
    { type: 'ability_triggered', cardId: sourceCard.id, abilityKind: 'boot' },
    { type: 'boot_requested', sourceCardId: sourceCard.id, validTargetCardIds },
  ];

  return {
    state: {
      ...state,
      phase: GamePhase.AbilityDecision,
      pendingDecision: {
        kind: 'boot',
        sourceCardId: sourceCard.id,
        validTargetCardIds,
      },
    },
    events,
  };
};

/**
 * Accept a peeked card — place it in barn via entry pipeline (steps 1-6, NOT step 7).
 */
export const acceptPeek = (state: NightState): { state: NightState; events: NightEvent[] } => {
  if (!state.pendingDecision || state.pendingDecision.kind !== 'peek') {
    return { state, events: [] };
  }

  const { previewCard, sourceCardId } = state.pendingDecision;
  const clearedState: NightState = {
    ...state,
    pendingDecision: null,
  };

  // Mark source card's ability as used
  const withUsedAbility: NightState = {
    ...clearedState,
    barn: clearedState.barn.map((c) => (c.id === sourceCardId ? { ...c, abilityUsed: true } : c)),
  };

  // Run entry pipeline (steps 1-6, NOT step 7 — chain-breaking)
  const pipelineResult = runEntryPipeline(withUsedAbility, previewCard);

  const events: NightEvent[] = [
    { type: 'peek_accepted', card: previewCard, slotIndex: pipelineResult.state.barn.length - 1 },
    ...pipelineResult.events,
  ];

  // Determine phase after pipeline
  let nextState = pipelineResult.state;
  if (!nextState.complete) {
    const isDeckEmpty = nextState.deck.length === 0;
    if (isDeckEmpty) {
      nextState = {
        ...nextState,
        phase: GamePhase.NightSummary,
        complete: true,
        autoScored: true,
      };
    } else {
      const phase = nextState.warning ? GamePhase.Warning : GamePhase.PlayerDecision;
      nextState = { ...nextState, phase };
    }
  }

  return { state: nextState, events };
};

/**
 * Reject a peeked card — send it to the bottom of the deck.
 */
export const rejectPeek = (state: NightState): { state: NightState; events: NightEvent[] } => {
  if (!state.pendingDecision || state.pendingDecision.kind !== 'peek') {
    return { state, events: [] };
  }

  const { previewCard, sourceCardId } = state.pendingDecision;

  // Mark source card's ability as used
  const nextBarn = state.barn.map((c) => (c.id === sourceCardId ? { ...c, abilityUsed: true } : c));

  // Place card at bottom of deck
  const nextDeck = [...state.deck, previewCard];

  const phase = state.warning ? GamePhase.Warning : GamePhase.PlayerDecision;

  const events: NightEvent[] = [{ type: 'peek_rejected', card: previewCard }];

  return {
    state: {
      ...state,
      barn: nextBarn,
      deck: nextDeck,
      pendingDecision: null,
      phase,
    },
    events,
  };
};

/**
 * Execute a boot — remove target from barn, add to pendingPennedUpCardIds.
 */
export const executeBoot = (
  state: NightState,
  targetCardId: string,
  pendingPennedUpCardIds: string[],
): { state: NightState; events: NightEvent[]; pendingPennedUpCardIds: string[] } => {
  if (!state.pendingDecision || state.pendingDecision.kind !== 'boot') {
    return { state, events: [], pendingPennedUpCardIds };
  }

  const { sourceCardId } = state.pendingDecision;

  // Boot self = forfeit
  if (targetCardId === sourceCardId) {
    const nextBarn = state.barn.map((c) =>
      c.id === sourceCardId ? { ...c, abilityUsed: true } : c,
    );
    const phase = state.warning ? GamePhase.Warning : GamePhase.PlayerDecision;
    return {
      state: {
        ...state,
        barn: nextBarn,
        pendingDecision: null,
        phase,
      },
      events: [],
      pendingPennedUpCardIds,
    };
  }

  const bootedCard = state.barn.find((c) => c.id === targetCardId);
  if (!bootedCard) {
    return { state, events: [], pendingPennedUpCardIds };
  }

  // Remove target from barn
  const nextBarn = state.barn
    .filter((c) => c.id !== targetCardId)
    .map((c) => (c.id === sourceCardId ? { ...c, abilityUsed: true } : c));

  // Recompute noise after removal
  const nextNoisyCount = countUnmitigatedNoisy(nextBarn);
  const nextWarning = nextNoisyCount >= 2;
  const nextLegendaryCount = countLegendaries(nextBarn);

  const events: NightEvent[] = [{ type: 'boot_executed', sourceCardId, bootedCard }];

  if (nextNoisyCount !== state.noisyCount || nextWarning !== state.warning) {
    events.push({
      type: 'warning_state_changed',
      noisyCount: nextNoisyCount,
      warning: nextWarning,
    });
  }

  if (nextLegendaryCount !== state.legendaryCount) {
    events.push({
      type: 'legendary_count_changed',
      count: nextLegendaryCount,
      required: 3,
    });
  }

  const phase = nextWarning ? GamePhase.Warning : GamePhase.PlayerDecision;

  return {
    state: {
      ...state,
      barn: nextBarn,
      noisyCount: nextNoisyCount,
      warning: nextWarning,
      legendaryCount: nextLegendaryCount,
      pendingDecision: null,
      phase,
    },
    events,
    pendingPennedUpCardIds: [...pendingPennedUpCardIds, targetCardId],
  };
};

/**
 * Execute a fetch — pull matching card from deck, run entry pipeline (steps 1-6).
 */
export const executeFetch = (
  state: NightState,
  selectedAnimalId: AnimalId,
): { state: NightState; events: NightEvent[] } => {
  if (!state.pendingDecision || state.pendingDecision.kind !== 'fetch') {
    return { state, events: [] };
  }

  const { sourceCardId } = state.pendingDecision;

  // Find first matching card in deck
  const matchIndex = state.deck.findIndex((c) => c.animalId === selectedAnimalId);
  if (matchIndex === -1) {
    return { state, events: [] };
  }

  const fetchedCard = state.deck[matchIndex];
  const nextDeck = [...state.deck.slice(0, matchIndex), ...state.deck.slice(matchIndex + 1)];

  // Mark source card as used, clear decision
  const clearedState: NightState = {
    ...state,
    deck: nextDeck,
    pendingDecision: null,
    barn: state.barn.map((c) => (c.id === sourceCardId ? { ...c, abilityUsed: true } : c)),
  };

  // Run entry pipeline (steps 1-6, NOT step 7 — chain-breaking)
  const pipelineResult = runEntryPipeline(clearedState, fetchedCard);

  const events: NightEvent[] = [
    {
      type: 'fetch_executed',
      sourceCardId,
      fetchedCard,
      slotIndex: pipelineResult.state.barn.length - 1,
    },
    ...pipelineResult.events,
  ];

  // Determine phase after pipeline
  let nextState = pipelineResult.state;
  if (!nextState.complete) {
    const isDeckEmpty = nextState.deck.length === 0;
    if (isDeckEmpty) {
      nextState = {
        ...nextState,
        phase: GamePhase.NightSummary,
        complete: true,
        autoScored: true,
      };
    } else {
      const phase = nextState.warning ? GamePhase.Warning : GamePhase.PlayerDecision;
      nextState = { ...nextState, phase };
    }
  }

  return { state: nextState, events };
};
