import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { POWER_COPY } from '../content/copy';
import { getDefinition } from '../game/catalog';
import {
  buildBarnSlots,
  buildGuestGroups,
  findOwnedAnimal,
  getAvailableAbilitySources,
  isAbilityUsed,
  isBarnAtCapacity
} from '../game/selectors';
import type { GameState } from '../game/types';
import { AnimalSprite } from './AnimalSprite';

interface BarnGridProps {
  gameState: GameState;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
}

const uniq = (items: string[]): string[] => [...new Set(items)];

export const BarnGrid = ({ gameState, selectedSlotIndex, onSelectSlot }: BarnGridProps) => {
  const slots = useMemo(() => buildBarnSlots(gameState), [gameState]);
  const guestGroups = useMemo(() => buildGuestGroups(gameState), [gameState]);
  const [enteredDisplayIds, setEnteredDisplayIds] = useState<string[]>([]);
  const [stackPulseIds, setStackPulseIds] = useState<string[]>([]);
  const [abilityFiredDisplayIds, setAbilityFiredDisplayIds] = useState<string[]>([]);
  const previousGroupsRef = useRef<Map<string, number>>(new Map());
  const previousUsedRef = useRef<Set<string>>(new Set());
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      const initial = new Map<string, number>();
      for (const group of guestGroups) {
        initial.set(group.displayId, group.stackCount);
      }
      previousGroupsRef.current = initial;
      previousUsedRef.current = new Set(gameState.night.usedAbilityIds);
      isFirstRenderRef.current = false;
      return;
    }

    const previous = previousGroupsRef.current;
    const next = new Map<string, number>();
    const entered: string[] = [];
    const stackBumps: string[] = [];

    for (const group of guestGroups) {
      next.set(group.displayId, group.stackCount);
      const previousCount = previous.get(group.displayId);
      if (previousCount === undefined) {
        entered.push(group.displayId);
      } else if (group.stackCount > previousCount) {
        stackBumps.push(group.displayId);
      }
    }

    previousGroupsRef.current = next;

    const timers: number[] = [];

    if (entered.length > 0) {
      setEnteredDisplayIds((current) => uniq([...current, ...entered]));
      timers.push(
        window.setTimeout(() => {
          setEnteredDisplayIds((current) => current.filter((id) => !entered.includes(id)));
        }, 520)
      );
    }

    if (stackBumps.length > 0) {
      setStackPulseIds((current) => uniq([...current, ...stackBumps]));
      timers.push(
        window.setTimeout(() => {
          setStackPulseIds((current) => current.filter((id) => !stackBumps.includes(id)));
        }, 420)
      );
    }

    if (timers.length === 0) {
      return;
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [guestGroups]);

  useEffect(() => {
    const previousUsed = previousUsedRef.current;
    const currentUsed = new Set(gameState.night.usedAbilityIds);
    const newlyUsed = gameState.night.usedAbilityIds.filter((id) => !previousUsed.has(id));

    if (newlyUsed.length > 0) {
      const flashingDisplayIds = guestGroups
        .filter((group) => group.instanceIds.some((id) => newlyUsed.includes(id)))
        .map((group) => group.displayId);

      if (flashingDisplayIds.length > 0) {
        setAbilityFiredDisplayIds((current) => uniq([...current, ...flashingDisplayIds]));
        const timer = window.setTimeout(() => {
          setAbilityFiredDisplayIds((current) => current.filter((id) => !flashingDisplayIds.includes(id)));
        }, 380);
        previousUsedRef.current = currentUsed;
        return () => window.clearTimeout(timer);
      }
    }

    previousUsedRef.current = currentUsed;
    return;
  }, [gameState.night.usedAbilityIds, guestGroups]);

  const availableSources = useMemo(() => new Set(getAvailableAbilitySources(gameState)), [gameState]);
  const atCapacity = isBarnAtCapacity(gameState);

  return (
    <section className={`barn-grid${gameState.night.bust ? ' busted' : ''}`} aria-label="Barn Grid" data-testid="barn-grid">
      {slots.map((slot) => {
        const selected = selectedSlotIndex === slot.slotIndex;
        const group = slot.guestGroup;

        let abilityAttention = false;
        let abilityFired = false;
        let abilitySpent = false;
        let showPower = false;

        if (slot.kind === 'animal' && group) {
          const definition = getDefinition(group.animalId);
          const primaryInstanceId = group.instanceIds[0];
          abilitySpent = definition.powerType === 'activate' && isAbilityUsed(gameState, primaryInstanceId);
          showPower = definition.power !== 'none';
          abilityAttention = atCapacity && !abilitySpent && group.instanceIds.some((id) => availableSources.has(id));
          abilityFired = abilityFiredDisplayIds.includes(group.displayId);
        }

        const className = [
          'barn-slot',
          `barn-slot-${slot.kind}`,
          selected ? 'selected' : '',
          slot.kind === 'animal' && group && enteredDisplayIds.includes(group.displayId) ? 'guest-enter' : '',
          slot.kind === 'animal' && group && stackPulseIds.includes(group.displayId) ? 'stack-pulse' : '',
          slot.kind === 'animal' && abilityAttention ? 'ability-attention' : '',
          slot.kind === 'animal' && abilityFired ? 'ability-fired' : '',
          slot.kind === 'animal' ? 'idle-bob' : '',
          slot.kind === 'animal' && gameState.night.bust ? 'bust-fade' : ''
        ]
          .filter(Boolean)
          .join(' ');

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
            data-testid={slot.slotIndex === 1 ? 'door-slot' : `barn-slot-${slot.slotIndex}`}
            data-attention={abilityAttention ? 'true' : undefined}
            style={{ '--slot-index': String(slot.slotIndex) } as { '--slot-index': string }}
          >
            {slot.kind === 'animal' && group ? (
              (() => {
                const definition = getDefinition(group.animalId);
                const primaryInstanceId = group.instanceIds[0];
                const primaryResident = findOwnedAnimal(gameState, primaryInstanceId);
                const popYield = definition.power === 'encore' ? (primaryResident?.encorePop ?? 0) : definition.currencies.pop;

                return (
                  <>
                    <AnimalSprite animalId={group.animalId} className="barn-slot-sprite" />
                    <span className="slot-title">{definition.name}</span>
                    {showPower ? (
                      <span className={`slot-meta${abilitySpent ? ' ability-spent' : ''}`}>{POWER_COPY[definition.power].label}</span>
                    ) : null}
                    <span className="slot-currency">
                      +{popYield}P / +{definition.currencies.cash}C
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
