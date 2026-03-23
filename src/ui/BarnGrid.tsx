import { getDefinition } from '../game/catalog';
import { buildBarnSlots, isAbilityUsed } from '../game/selectors';
import type { GameState } from '../game/types';
import { AnimalSprite } from './AnimalSprite';

interface BarnGridProps {
  gameState: GameState;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
}

export const BarnGrid = ({ gameState, selectedSlotIndex, onSelectSlot }: BarnGridProps) => {
  const slots = buildBarnSlots(gameState);

  return (
    <section className="barn-grid" aria-label="Barn Grid">
      {slots.map((slot) => {
        const selected = selectedSlotIndex === slot.slotIndex;
        const className = `barn-slot barn-slot-${slot.kind}${selected ? ' selected' : ''}`;
        const group = slot.guestGroup;
        const label = (() => {
          if (slot.kind === 'window') {
            return 'Window';
          }

          if (slot.kind === 'door') {
            return 'Door';
          }

          if (slot.kind === 'locked') {
            return 'Locked slot';
          }

          if (slot.kind === 'empty') {
            return 'Empty slot';
          }

          return getDefinition(group!.animalId).name;
        })();

        return (
          <button
            type="button"
            key={slot.slotIndex}
            className={className}
            onClick={() => onSelectSlot(slot.slotIndex)}
            data-slot-index={slot.slotIndex}
            data-testid={slot.slotIndex === 1 ? 'door-slot' : undefined}
          >
            {slot.kind === 'animal' && group ? (
              (() => {
                const definition = getDefinition(group.animalId);
                const primaryInstanceId = group.instanceIds[0];
                const abilitySpent = definition.powerType === 'activate' && isAbilityUsed(gameState, primaryInstanceId);

                return (
                  <>
                    <AnimalSprite animalId={group.animalId} className="barn-slot-sprite" />
                    <span className="slot-title">{definition.name}</span>
                    {!abilitySpent && definition.power !== 'none' ? (
                      <span className="slot-meta">{definition.power.toUpperCase()}</span>
                    ) : null}
                    <span className="slot-currency">
                      +{definition.currencies.pop}P / +{definition.currencies.cash}C
                    </span>
                    {group.stackCount > 1 ? <span className="slot-stack">x{group.stackCount}</span> : null}
                  </>
                );
              })()
            ) : (
              <span className="slot-label">{label}</span>
            )}
          </button>
        );
      })}
    </section>
  );
};
