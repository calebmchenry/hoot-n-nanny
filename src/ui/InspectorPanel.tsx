import { ANIMAL_COPY, POWER_COPY, UI_COPY, getNightStartQuip } from '../content/copy';
import { getDefinition } from '../game/catalog';
import {
  buildBarnSlots,
  findOwnedAnimal,
  getAvailableAbilitySources,
  getFarmWindowCounts,
  isAbilityUsed,
  isBarnAtCapacity
} from '../game/selectors';
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
  const atCapacityWithAbilities = isBarnAtCapacity(gameState) && getAvailableAbilitySources(gameState).length > 0;
  const nightQuip = getNightStartQuip(gameState.nightNumber);

  if (selectedSlot.kind === 'window') {
    const counts = getFarmWindowCounts(gameState);
    return (
      <aside className="inspector" aria-label="Inspector">
        <h2>Farm Window</h2>
        <p className="inspector-quip">{nightQuip}</p>
        <p>{UI_COPY.windowHint}</p>
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
        <p className="inspector-quip">{nightQuip}</p>
        <p>{UI_COPY.doorHint}</p>
        {atCapacityWithAbilities ? <p className="inspector-note">{UI_COPY.abilityReadyHint}</p> : null}
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
    const animalCopy = ANIMAL_COPY[resident.animalId];
    const powerCopy = POWER_COPY[definition.power];
    const activatePower = definition.power === 'fetch' || definition.power === 'kick' || definition.power === 'peek';
    const used = isAbilityUsed(gameState, primaryId);

    return (
      <aside className="inspector" aria-label="Inspector">
        <h2>{definition.name}</h2>
        <p className="inspector-quip">{animalCopy.flavor}</p>
        <p>{animalCopy.rules}</p>
        <p>
          Power: <strong>{powerCopy.label}</strong>
        </p>
        <p>{powerCopy.rules}</p>
        <p>
          Pop: {definition.power === 'encore' ? resident.encorePop : definition.currencies.pop} / Cash: {definition.currencies.cash}
        </p>
        {activatePower && !used ? (
          <button type="button" onClick={() => onUseAbility(primaryId)} data-testid="use-ability">
            Use {powerCopy.label}
          </button>
        ) : null}
        {activatePower && used ? <p className="inspector-note">{UI_COPY.abilitySpentHint}</p> : null}
        <button type="button" onClick={onCallItANight} data-testid="call-night">
          Call It a Night
        </button>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="Inspector">
      <h2>Inspector</h2>
      <p className="inspector-quip">{nightQuip}</p>
      <p>{UI_COPY.inspectorIdle}</p>
      <button type="button" onClick={onCallItANight} data-testid="call-night">
        Call It a Night
      </button>
    </aside>
  );
};
