import { getDefinition } from '../game/catalog';
import type { ShopOffer } from '../game/types';
import { AnimalSprite } from './AnimalSprite';

const POWER_BADGE: Record<string, string> = {
  none: '•',
  noisy: '!',
  stacks: '≣',
  calm: '☁',
  fetch: '↺',
  kick: '↯',
  peek: '◉',
  flock: '⌁',
  sneak: '⇢',
  encore: '+',
  rowdy: '↯',
  upkeep: '$'
};

interface ShopCardProps {
  offer: ShopOffer;
  affordable: boolean;
  focused: boolean;
  onFocusCard: () => void;
  onPurchase: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
}

export const ShopCard = ({
  offer,
  affordable,
  focused,
  onFocusCard,
  onPurchase,
  buttonRef
}: ShopCardProps) => {
  const definition = getDefinition(offer.animalId);
  const unavailable = offer.soldOut || !affordable;
  const className = `shop-card${definition.blueRibbon ? ' blue-ribbon' : ''}${unavailable ? ' dimmed' : ''}${focused ? ' focused' : ''}`;

  return (
    <button
      type="button"
      className={className}
      onFocus={onFocusCard}
      onMouseEnter={onFocusCard}
      onClick={onPurchase}
      disabled={offer.soldOut || !affordable}
      data-offer-id={offer.offerId}
      ref={buttonRef}
    >
      <div className="shop-sprite">
        <AnimalSprite animalId={offer.animalId} />
      </div>
      <h3>
        {definition.name}
        {definition.blueRibbon ? <span className="blue-ribbon-chip">Blue Ribbon</span> : null}
      </h3>
      <p>Cost: {offer.costPop} Pop</p>
      <p>Stock: {offer.infiniteStock ? '∞' : offer.stock}</p>
      <p>
        Power: <span className="power-badge">{POWER_BADGE[definition.power]}</span> {definition.power}
      </p>
      <p>
        Reward: +{definition.currencies.pop} Pop / +{definition.currencies.cash} Cash
      </p>
      {offer.soldOut ? <span className="chip">Sold Out</span> : null}
    </button>
  );
};
