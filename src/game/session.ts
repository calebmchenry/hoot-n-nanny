import { buildStartingDeck, shuffleDeck } from './deck';
import { callItANight, drawAnimal, startNight } from './night';
import { scoreNight } from './scoring';
import {
  purchaseAnimal,
  upgradeCapacity,
  createDefaultShopStock,
  getCapacityUpgradeCost,
} from './shop';
import type {
  GameSession,
  NightEvent,
  SessionMutation,
  ShopAnimalId,
  NightScoreSummary,
} from './types';
import { GamePhase } from './types';

const DEFAULT_SEED = 'default';

const buildNightSeed = (session: GameSession): string => {
  if (session.nightNumber === 1) {
    return session.seed;
  }

  return `${session.seed}-night-${session.nightNumber}`;
};

const finalizeNight = (
  session: GameSession,
  reason: 'called' | 'deck_exhausted' | 'bust',
): {
  session: GameSession;
  events: NightEvent[];
  summary: NightScoreSummary;
} => {
  if (!session.currentNight) {
    const summary = scoreNight([], {
      capacity: session.capacity,
      hayBank: session.hay,
      reason: 'called',
      bustType: null,
    });

    return {
      session,
      events: [],
      summary,
    };
  }

  const summary = scoreNight(session.currentNight.barn, {
    capacity: session.capacity,
    hayBank: session.hay,
    reason,
    bustType: session.currentNight.bust?.type ?? null,
  });

  const events: NightEvent[] = [{ type: 'night_scored', summary }];

  let pendingPennedUpCardId = session.pendingPennedUpCardId;
  let pendingPennedUpTurns = session.pendingPennedUpTurns;

  if (session.currentNight.bust) {
    pendingPennedUpCardId = session.currentNight.bust.card.id;
    pendingPennedUpTurns = 1;
    events.push({ type: 'animal_penned_up', card: session.currentNight.bust.card });
  }

  const finalizedNight = {
    ...session.currentNight,
    phase: GamePhase.NightSummary,
    complete: true,
    summary,
  };

  return {
    session: {
      ...session,
      mischief: session.mischief + summary.totalMischief,
      hay: summary.totalHay,
      nightNumber: session.nightNumber + 1,
      currentNight: finalizedNight,
      lastSummary: summary,
      pendingPennedUpCardId,
      pendingPennedUpTurns,
    },
    events,
    summary,
  };
};

export const createSession = (seed = DEFAULT_SEED): GameSession => {
  const starterDeck = buildStartingDeck();

  return {
    seed,
    herd: starterDeck.cards,
    nextCardSerial: starterDeck.nextSerial,
    capacity: 5,
    mischief: 0,
    hay: 0,
    nightNumber: 1,
    shopStock: createDefaultShopStock(),
    currentNight: null,
    activePennedUpCardId: null,
    pendingPennedUpCardId: null,
    pendingPennedUpTurns: 0,
    lastSummary: null,
  };
};

export const startNextNight = (session: GameSession): GameSession => {
  const activePennedUpCardId =
    session.pendingPennedUpTurns > 0 ? session.pendingPennedUpCardId : null;

  const deckPool = activePennedUpCardId
    ? session.herd.filter((card) => card.id !== activePennedUpCardId)
    : session.herd;

  const nightDeck = shuffleDeck(deckPool, buildNightSeed(session));

  const activePennedUpCard =
    activePennedUpCardId !== null
      ? (session.herd.find((card) => card.id === activePennedUpCardId) ?? null)
      : null;

  return {
    ...session,
    currentNight: startNight({
      deck: nightDeck,
      capacity: session.capacity,
      nightNumber: session.nightNumber,
      pennedUpCard: activePennedUpCard,
    }),
    activePennedUpCardId,
    pendingPennedUpCardId: activePennedUpCardId ? null : session.pendingPennedUpCardId,
    pendingPennedUpTurns: activePennedUpCardId ? 0 : session.pendingPennedUpTurns,
  };
};

export const drawAnimalInSession = (session: GameSession): SessionMutation => {
  const withNight = session.currentNight ? session : startNextNight(session);
  const drawResult = drawAnimal(withNight.currentNight!);

  let nextSession: GameSession = {
    ...withNight,
    currentNight: drawResult.state,
  };

  let events = [...drawResult.events];

  if (drawResult.state.bust) {
    const finalized = finalizeNight(nextSession, 'bust');
    nextSession = finalized.session;
    events = [...events, ...finalized.events];
  } else if (drawResult.state.autoScored && drawResult.state.complete) {
    const finalized = finalizeNight(nextSession, 'deck_exhausted');
    nextSession = finalized.session;
    events = [...events, ...finalized.events];
  }

  return {
    session: nextSession,
    events,
  };
};

export const callItANightInSession = (session: GameSession): SessionMutation => {
  if (!session.currentNight) {
    return {
      session,
      events: [],
    };
  }

  const called = callItANight(session.currentNight);
  if (!called.state.complete) {
    return {
      session,
      events: called.events,
    };
  }

  const finalized = finalizeNight(
    {
      ...session,
      currentNight: called.state,
    },
    'called',
  );

  return {
    session: finalized.session,
    events: [...called.events, ...finalized.events],
  };
};

export const purchaseAnimalInSession = (
  session: GameSession,
  animalId: ShopAnimalId,
): SessionMutation => {
  const purchase = purchaseAnimal({
    animalId,
    shopStock: session.shopStock,
    mischief: session.mischief,
    herd: session.herd,
    nextCardSerial: session.nextCardSerial,
  });

  if (!purchase.ok) {
    return {
      session,
      events: [],
    };
  }

  return {
    session: {
      ...session,
      shopStock: purchase.shopStock,
      mischief: purchase.mischief,
      herd: purchase.herd,
      nextCardSerial: purchase.nextCardSerial,
    },
    events: purchase.events,
  };
};

export const upgradeCapacityInSession = (session: GameSession): SessionMutation => {
  const upgraded = upgradeCapacity({
    capacity: session.capacity,
    hay: session.hay,
  });

  if (!upgraded.ok) {
    return {
      session,
      events: [],
    };
  }

  return {
    session: {
      ...session,
      capacity: upgraded.capacity,
      hay: upgraded.hay,
    },
    events: upgraded.events,
  };
};

export { getCapacityUpgradeCost };
