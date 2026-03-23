import { getDefinition } from '../game/catalog';
import type { ShopOffer } from '../game/types';

interface ShopInspectorProps {
  focusedOffer: ShopOffer | null;
  focusedTarget: 'offer' | 'capacity' | 'hootenanny' | null;
}

export const ShopInspector = ({ focusedOffer, focusedTarget }: ShopInspectorProps) => {
  if (focusedTarget === 'capacity') {
    return (
      <aside className="shop-inspector" aria-live="polite">
        <h3>Barn Upgrade</h3>
        <p>Spend Cash to increase barn capacity by one slot.</p>
      </aside>
    );
  }

  if (focusedTarget === 'hootenanny') {
    return (
      <aside className="shop-inspector" aria-live="polite">
        <h3>Back to the Barn</h3>
        <p>Start the next hootenanny night with your updated farm.</p>
      </aside>
    );
  }

  if (focusedOffer) {
    const definition = getDefinition(focusedOffer.animalId);
    return (
      <aside className="shop-inspector" aria-live="polite">
        <h3>{definition.name}</h3>
        <p>{definition.description}</p>
        <p>
          Rewards: +{definition.currencies.pop} Pop / +{definition.currencies.cash} Cash
        </p>
      </aside>
    );
  }

  return (
    <aside className="shop-inspector" aria-live="polite">
      <h3>Inspector</h3>
      <p>Shop for upgrades.</p>
    </aside>
  );
};
