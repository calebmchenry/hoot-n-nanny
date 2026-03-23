import { getDefinition } from '../game/catalog';
import { findOwnedAnimal } from '../game/selectors';
import type { GameState } from '../game/types';

interface TargetingOverlayProps {
  gameState: GameState;
  onSelectTarget: (targetId: string) => void;
  onCancel: () => void;
}

const targetLabel = (gameState: GameState, targetId: string): string => {
  const animal = findOwnedAnimal(gameState, targetId);
  if (!animal) {
    return targetId;
  }

  return `${getDefinition(animal.animalId).name} (${targetId})`;
};

export const TargetingOverlay = ({ gameState, onSelectTarget, onCancel }: TargetingOverlayProps) => {
  const targeting = gameState.night.targeting;
  if (!targeting) {
    return null;
  }

  const targets =
    targeting.kind === 'fetch' ? gameState.night.drawPileIds : gameState.night.barnResidentIds;

  const title =
    targeting.kind === 'fetch'
      ? 'Fetch a guest from the farm'
      : targeting.kind === 'kick'
        ? 'Kick a guest from the barn'
        : 'Pick one guest to pin for next night';

  return (
    <div className="targeting-overlay" role="dialog" aria-modal="true" aria-label="Targeting">
      <div className="targeting-card">
        <h3>{title}</h3>
        <div className="target-list">
          {targets.map((targetId) => (
            <button key={targetId} type="button" onClick={() => onSelectTarget(targetId)}>
              {targetLabel(gameState, targetId)}
            </button>
          ))}
          {targets.length === 0 ? <p>No valid targets.</p> : null}
        </div>
        {targeting.kind !== 'pin' ? (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
};
