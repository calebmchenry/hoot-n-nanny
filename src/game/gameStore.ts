import { createSession, startNextNight } from './session';
import type { GameSession } from './types';

let sessionState: GameSession = startNextNight(createSession());

export const getState = (): GameSession => {
  return sessionState;
};

export const setState = (nextState: GameSession): void => {
  sessionState = nextState;
};

export const reset = (seed?: string): GameSession => {
  sessionState = startNextNight(createSession(seed));
  return sessionState;
};
