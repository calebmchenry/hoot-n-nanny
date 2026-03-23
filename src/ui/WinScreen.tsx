import { useEffect, useMemo, useRef } from 'preact/hooks';
import { UI_COPY, getWinQuip } from '../content/copy';
import { getDefinition } from '../game/catalog';
import type { GameState } from '../game/types';
import { AnimalSprite } from './AnimalSprite';

interface WinScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
}

export const WinScreen = ({ gameState, onPlayAgain }: WinScreenProps) => {
  const winners = gameState.lastNightSummary?.winningBlueRibbonIds ?? [];
  const playAgainRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      playAgainRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  const winQuip = useMemo(() => getWinQuip(gameState.nightNumber), [gameState.nightNumber]);

  return (
    <section className="win-screen" style={{ '--winner-count': String(winners.length) } as { '--winner-count': string }}>
      <h1 className="win-title">Blue Ribbon Victory</h1>
      <p className="win-quip">{winQuip}</p>
      <p>{UI_COPY.winSubtitle}</p>
      <p>Won on Night {gameState.nightNumber}</p>
      <p>Final Pop: {gameState.pop}</p>
      <p>Final Cash: {gameState.cash}</p>
      <div className="win-ribbons">
        {winners.map((instanceId, index) => {
          const resident = gameState.ownedAnimals.find((animal) => animal.instanceId === instanceId);
          const label = resident ? getDefinition(resident.animalId).name : instanceId;
          return (
            <span
              key={instanceId}
              className="win-ribbon-pill"
              style={{ '--ribbon-index': String(index) } as { '--ribbon-index': string }}
            >
              {resident ? <AnimalSprite animalId={resident.animalId} /> : null}
              <span>{label}</span>
            </span>
          );
        })}
      </div>
      <button type="button" className="win-play-again" onClick={onPlayAgain} data-testid="play-again" ref={playAgainRef}>
        Play Again
      </button>
    </section>
  );
};
