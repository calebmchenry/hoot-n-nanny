import { occupiedBarnSlots, getEffectiveNoisyCount } from '../game/selectors';
import type { GameState } from '../game/types';

interface StatusBarProps {
  gameState: GameState;
}

export const StatusBar = ({ gameState }: StatusBarProps) => {
  const occupied = occupiedBarnSlots(gameState);
  const effectiveNoisy = getEffectiveNoisyCount(gameState);

  return (
    <header className="status-bar" aria-label="Status">
      <div className="status-pill">Night {gameState.nightNumber}</div>
      <div className="status-pill">Pop {gameState.pop}</div>
      <div className="status-pill">Cash {gameState.cash}</div>
      <div className="status-pill">Noisy {effectiveNoisy}/3</div>
      <div className="status-pill">Capacity {occupied}/{gameState.barnCapacity}</div>
    </header>
  );
};
