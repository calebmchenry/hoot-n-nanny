import { describe, expect, it } from 'vitest';
import { createCardInstance } from './deck';
import {
  callItANightInSession,
  createSession,
  drawAnimalInSession,
  purchaseAnimalInSession,
  startNextNight,
  upgradeCapacityInSession,
} from './session';

describe('session', () => {
  it('creates a session with starter herd and default resources', () => {
    const session = createSession('seed-a');

    expect(session.herd).toHaveLength(10);
    expect(session.capacity).toBe(5);
    expect(session.mischief).toBe(0);
    expect(session.hay).toBe(0);
    expect(session.shopStock.Bunny).toBe(3);
  });

  it('starts a night and auto-scores when deck is exhausted', () => {
    let session = createSession('seed-b');
    session = {
      ...session,
      herd: [createCardInstance('BarnCat', 1), createCardInstance('PotBelliedPig', 2)],
      nextCardSerial: 3,
    };

    session = startNextNight(session);

    let result = drawAnimalInSession(session);
    session = result.session;
    expect(session.currentNight?.complete).toBe(false);

    result = drawAnimalInSession(session);
    session = result.session;

    expect(session.lastSummary?.reason).toBe('deck_exhausted');
    expect(session.lastSummary?.totalMischief).toBeGreaterThanOrEqual(1);
    expect(session.lastSummary?.totalHay).toBe(1);
  });

  it('supports call it a night scoring after at least one draw', () => {
    let session = startNextNight(createSession('seed-c'));

    session = drawAnimalInSession(session).session;
    const called = callItANightInSession(session);

    expect(called.session.lastSummary).not.toBeNull();
    expect(called.events.some((event) => event.type === 'night_scored')).toBe(true);
  });

  it('handles purchases and capacity upgrades with session wrappers', () => {
    let session = createSession('seed-d');
    session = {
      ...session,
      mischief: 10,
      hay: 5,
    };

    const purchase = purchaseAnimalInSession(session, 'Bunny');
    expect(purchase.session.herd).toHaveLength(11);
    expect(purchase.session.mischief).toBe(6);

    const upgraded = upgradeCapacityInSession({
      ...purchase.session,
      capacity: 5,
      hay: 2,
    });
    expect(upgraded.session.capacity).toBe(6);
    expect(upgraded.session.hay).toBe(0);
  });

  it('penned up card is excluded for one night then returns', () => {
    let session = startNextNight(createSession('sprint2-farmer-bust'));

    session = drawAnimalInSession(session).session;
    session = drawAnimalInSession(session).session;
    session = drawAnimalInSession(session).session;

    const pennedCardId = session.pendingPennedUpCardId;
    expect(pennedCardId).not.toBeNull();

    session = startNextNight(session);
    expect(session.activePennedUpCardId).toBe(pennedCardId);
    expect(session.currentNight?.deck.some((card) => card.id === pennedCardId)).toBe(false);
    expect(session.pendingPennedUpCardId).toBeNull();

    session = drawAnimalInSession(session).session;
    session = callItANightInSession(session).session;

    session = startNextNight(session);
    expect(session.activePennedUpCardId).toBeNull();
    expect(session.currentNight?.deck.some((card) => card.id === pennedCardId)).toBe(true);
  });
});
