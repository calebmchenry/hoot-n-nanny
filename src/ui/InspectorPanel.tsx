import { getDefinition } from '../game/catalog';
import { buildBarnSlots, findOwnedAnimal, getFarmWindowCounts, isAbilityUsed, isBarnAtCapacity } from '../game/selectors';
import type { AnimalId, GameState } from '../game/types';
import { AnimalSprite } from './AnimalSprite';

interface InspectorPanelProps {
  gameState: GameState;
  selectedSlotIndex: number;
  onInvite: () => void;
  onCallItANight: () => void;
  onUseAbility: (sourceId: string) => void;
}

export const InspectorPanel = ({
  gameState,
  selectedSlotIndex,
  onInvite,
  onCallItANight,
  onUseAbility
}: InspectorPanelProps) => {
  const slots = buildBarnSlots(gameState);
  const selectedSlot = slots[selectedSlotIndex] ?? slots[0];

  const canInvite = gameState.night.drawPileIds.length > 0 && !isBarnAtCapacity(gameState) && !gameState.night.targeting;

  if (selectedSlot.kind === 'window') {
    const counts = getFarmWindowCounts(gameState);
    return (
      <aside className="inspector" aria-label="Inspector">
        <h2>Farm Window</h2>
        <p>Remaining guests by species:</p>
        <div className="window-counts">
          {Object.entries(counts)
            .filter(([, count]) => count > 0)
            .map(([animalId, count]) => (
              <p key={animalId} className="window-count-row">
                <AnimalSprite animalId={animalId as AnimalId} />
                <span>
                  {getDefinition(animalId as AnimalId).name}: {count}
                </span>
              </p>
            ))}
          {Object.values(counts).every((count) => count === 0) ? <p>The farm is empty.</p> : null}
        </div>
        <button type="button" onClick={onCallItANight} data-testid="call-night">
          Call It a Night
        </button>
      </aside>
    );
  }

  if (selectedSlot.kind === 'door') {
    return (
      <aside className="inspector" aria-label="Inspector">
        <h2>Barn Door</h2>
        <p>Invite the next guest from the farm.</p>
        <button type="button" onClick={onInvite} disabled={!canInvite} data-testid="invite-button">
          Invite Guest
        </button>
        <button type="button" onClick={onCallItANight} data-testid="call-night">
          Call It a Night
        </button>
      </aside>
    );
  }

  if (selectedSlot.kind === 'animal' && selectedSlot.guestGroup) {
    const primaryId = selectedSlot.guestGroup.instanceIds[0];
    const resident = findOwnedAnimal(gameState, primaryId);
    if (!resident) {
      return null;
    }

    const definition = getDefinition(resident.animalId);
    const activatePower = definition.power === 'fetch' || definition.power === 'kick' || definition.power === 'peek';
    const used = isAbilityUsed(gameState, primaryId);

    return (
      <aside className="inspector" aria-label="Inspector">
        <h2>{definition.name}</h2>
        <p>{definition.description}</p>
        <p>
          Pop: {definition.power === 'encore' ? resident.encorePop : definition.currencies.pop} / Cash: {definition.currencies.cash}
        </p>
        <p>Power: {definition.power}</p>
        {activatePower && !used ? (
          <button type="button" onClick={() => onUseAbility(primaryId)} data-testid="use-ability">
            Use {definition.power}
          </button>
        ) : null}
        <button type="button" onClick={onCallItANight} data-testid="call-night">
          Call It a Night
        </button>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="Inspector">
      <h2>Inspector</h2>
      <p>Select a slot in the barn.</p>
      <button type="button" onClick={onCallItANight} data-testid="call-night">
        Call It a Night
      </button>
    </aside>
  );
};
