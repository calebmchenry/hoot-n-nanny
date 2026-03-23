import { TARGETING_COPY } from '../content/copy';
import { getDefinition } from '../game/catalog';
import { findOwnedAnimal } from '../game/selectors';
import type { GameState } from '../game/types';

interface TargetingOverlayProps {
  gameState: GameState;
  onSelectTarget: (targetId: string) => void;
  onCancel: () => void;
  onHoverControl: (targetId: string, input?: 'mouse' | 'focus') => void;
  onSelectControl: () => void;
}

const targetLabel = (gameState: GameState, targetId: string): string => {
  const animal = findOwnedAnimal(gameState, targetId);
  if (!animal) {
    return targetId;
  }

  return getDefinition(animal.animalId).name;
};

export const TargetingOverlay = ({ gameState, onSelectTarget, onCancel, onHoverControl, onSelectControl }: TargetingOverlayProps) => {
  const targeting = gameState.night.targeting;
  if (!targeting) {
    return null;
  }

  const targets = targeting.kind === 'fetch' ? gameState.night.drawPileIds : gameState.night.barnResidentIds;
  const copy = TARGETING_COPY[targeting.kind];

  return (
    <div className="targeting-overlay" role="dialog" aria-modal="true" aria-label="Targeting">
      <div className="targeting-card">
        <h3>{copy.title}</h3>
        <p>{copy.support}</p>
        <div className="target-list">
          {targets.map((targetId) => (
            <button
              key={targetId}
              type="button"
              onFocus={() => onHoverControl(`target-${targetId}`, 'focus')}
              onPointerEnter={(event) => onHoverControl(`target-${targetId}`, event.pointerType === 'mouse' ? 'mouse' : 'focus')}
              onClick={() => {
                onSelectControl();
                onSelectTarget(targetId);
              }}
            >
              {targetLabel(gameState, targetId)}
            </button>
          ))}
          {targets.length === 0 ? <p>No valid targets.</p> : null}
        </div>
        {targeting.kind !== 'pin' ? (
          <button
            type="button"
            onFocus={() => onHoverControl('target-cancel', 'focus')}
            onPointerEnter={(event) => onHoverControl('target-cancel', event.pointerType === 'mouse' ? 'mouse' : 'focus')}
            onClick={() => {
              onSelectControl();
              onCancel();
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
};
