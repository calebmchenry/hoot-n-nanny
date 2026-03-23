interface BarnUpgradeCardProps {
  barnCapacity: number;
  price: number;
  cash: number;
  maxed: boolean;
  focused: boolean;
  onFocusCard: () => void;
  onPurchase: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
}

export const BarnUpgradeCard = ({
  barnCapacity,
  price,
  cash,
  maxed,
  focused,
  onFocusCard,
  onPurchase,
  buttonRef
}: BarnUpgradeCardProps) => {
  const disabled = maxed || cash < price;

  return (
    <button
      type="button"
      className={`upgrade-card${disabled ? ' dimmed' : ''}${focused ? ' focused' : ''}`}
      onFocus={onFocusCard}
      onMouseEnter={onFocusCard}
      onClick={onPurchase}
      disabled={disabled}
      data-testid="capacity-upgrade"
      ref={buttonRef}
    >
      <h3>Barn Capacity</h3>
      <p>Current: {barnCapacity}</p>
      {maxed ? <p>Maxed</p> : <p>Cost: {price} Cash</p>}
    </button>
  );
};
