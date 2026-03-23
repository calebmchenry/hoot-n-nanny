import { getDefinition } from '../game/catalog';
import type { GameState } from '../game/types';
import { AnimalSprite } from './AnimalSprite';

interface WinScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
}

export const WinScreen = ({ gameState, onPlayAgain }: WinScreenProps) => {
  const winners = gameState.lastNightSummary?.winningBlueRibbonIds ?? [];

  return (
    <section className="win-screen">
      <h1>Blue Ribbon Victory</h1>
      <p>Won on Night {gameState.nightNumber}</p>
      <p>Final Pop: {gameState.pop}</p>
      <p>Final Cash: {gameState.cash}</p>
      <div className="win-ribbons">
        {winners.map((instanceId) => {
          const resident = gameState.ownedAnimals.find((animal) => animal.instanceId === instanceId);
          const label = resident ? getDefinition(resident.animalId).name : instanceId;
          return (
            <span key={instanceId} className="win-ribbon-pill">
              {resident ? <AnimalSprite animalId={resident.animalId} /> : null}
              <span>{label}</span>
            </span>
          );
        })}
      </div>
      <button type="button" onClick={onPlayAgain} data-testid="play-again">
        Play Again
      </button>
    </section>
  );
};
