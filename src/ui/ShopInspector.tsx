import { ANIMAL_COPY, POWER_COPY, UI_COPY } from '../content/copy';
import { getDefinition } from '../game/catalog';
import type { ShopOffer } from '../game/types';

interface ShopInspectorProps {
  focusedOffer: ShopOffer | null;
  focusedTarget: 'offer' | 'capacity' | 'hootenanny' | null;
}

export const ShopInspector = ({ focusedOffer, focusedTarget }: ShopInspectorProps) => {
  const contentKey = focusedOffer ? focusedOffer.offerId : focusedTarget ?? 'idle';

  if (focusedTarget === 'capacity') {
    return (
      <aside className="shop-inspector" aria-live="polite">
        <div key={contentKey} className="shop-inspector-content">
          <h3>Barn Upgrade</h3>
          <p>{UI_COPY.shopCapacityBlurb}</p>
        </div>
      </aside>
    );
  }

  if (focusedTarget === 'hootenanny') {
    return (
      <aside className="shop-inspector" aria-live="polite">
        <div key={contentKey} className="shop-inspector-content">
          <h3>Back to the Barn</h3>
          <p>{UI_COPY.shopHootenannyBlurb}</p>
        </div>
      </aside>
    );
  }

  if (focusedOffer) {
    const definition = getDefinition(focusedOffer.animalId);
    const animalCopy = ANIMAL_COPY[focusedOffer.animalId];
    const powerCopy = POWER_COPY[definition.power];

    return (
      <aside className="shop-inspector" aria-live="polite">
        <div key={contentKey} className="shop-inspector-content">
          <h3>{definition.name}</h3>
          <p className="shop-inspector-flavor">{animalCopy.flavor}</p>
          <p>{animalCopy.shopPitch}</p>
          <p>
            Power: <strong>{powerCopy.label}</strong>
          </p>
          <p>{powerCopy.rules}</p>
          <p>
            Rewards: +{definition.currencies.pop} Pop / +{definition.currencies.cash} Cash
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="shop-inspector" aria-live="polite">
      <div key={contentKey} className="shop-inspector-content">
        <h3>Inspector</h3>
        <p>{UI_COPY.shopIdle}</p>
      </div>
    </aside>
  );
};
