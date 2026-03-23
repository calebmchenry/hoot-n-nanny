import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { isMaxCapacity } from '../game/selectors';
import { upgradePrice } from '../game/shop';
import type { GameState, ShopOffer } from '../game/types';
import { BarnUpgradeCard } from './BarnUpgradeCard';
import { ShopCard } from './ShopCard';
import { ShopInspector } from './ShopInspector';

interface TradingPostScreenProps {
  gameState: GameState;
  onBuyOffer: (offerId: string) => void;
  onBuyCapacity: () => void;
  onStartHootenanny: () => void;
}

type FocusTarget = 'offer' | 'capacity' | 'hootenanny' | null;

export const TradingPostScreen = ({
  gameState,
  onBuyOffer,
  onBuyCapacity,
  onStartHootenanny
}: TradingPostScreenProps) => {
  const shopState = gameState.shopState;
  const offers = useMemo<ShopOffer[]>(
    () => [...(shopState?.regularOffers ?? []), ...(shopState?.blueRibbonOffers ?? [])],
    [shopState]
  );

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusIds = useMemo(() => {
    const offerIds = offers.map((offer) => `offer:${offer.offerId}`);
    return [...offerIds, 'capacity', 'hootenanny'];
  }, [offers]);

  useEffect(() => {
    setFocusedIndex((index) => {
      if (index === null) {
        return null;
      }

      return Math.max(0, Math.min(index, Math.max(0, focusIds.length - 1)));
    });
  }, [focusIds]);

  useEffect(() => {
    if (focusedIndex === null) {
      return;
    }

    const id = focusIds[focusedIndex];
    const node = id ? refs.current[id] : null;
    node?.focus();
  }, [focusedIndex, focusIds]);

  useEffect(() => {
    if (!shopState) {
      return;
    }

    sectionRef.current?.focus();
  }, [shopState]);

  if (!shopState) {
    return null;
  }

  const focusedId = focusedIndex === null ? null : focusIds[focusedIndex] ?? null;
  const focusedOfferId = focusedId?.startsWith('offer:') ? focusedId.slice('offer:'.length) : null;
  const focusedOffer = offers.find((offer) => offer.offerId === focusedOfferId) ?? null;
  const focusedTarget: FocusTarget = focusedOffer
    ? 'offer'
    : focusedId === 'capacity'
      ? 'capacity'
      : focusedId === 'hootenanny'
        ? 'hootenanny'
        : null;

  const capacityPrice = upgradePrice(gameState);
  const maxed = isMaxCapacity(gameState);

  const executeFocused = () => {
    if (focusedIndex === null) {
      return;
    }

    if (focusedOffer) {
      onBuyOffer(focusedOffer.offerId);
      return;
    }

    if (focusedTarget === 'capacity') {
      onBuyCapacity();
      return;
    }

    if (focusedTarget === 'hootenanny') {
      onStartHootenanny();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const offerCount = offers.length;
    const capacityIndex = offerCount;
    const hootenannyIndex = offerCount + 1;

    if (
      focusedIndex === null &&
      (event.key === 'Enter' ||
        event.key === ' ' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp')
    ) {
      event.preventDefault();
      setFocusedIndex(0);
      return;
    }

    if (focusedIndex === null) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      executeFocused();
      return;
    }

    let nextIndex = focusedIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = Math.min(focusIds.length - 1, focusedIndex + 1);
    }

    if (event.key === 'ArrowLeft') {
      nextIndex = Math.max(0, focusedIndex - 1);
    }

    if (event.key === 'ArrowDown') {
      if (focusedIndex < offerCount) {
        const down = focusedIndex + 4;
        if (down < offerCount) {
          nextIndex = down;
        } else if (focusedIndex % 4 === 1) {
          nextIndex = hootenannyIndex;
        } else {
          nextIndex = capacityIndex;
        }
      }
    }

    if (event.key === 'ArrowUp') {
      if (focusedIndex === capacityIndex || focusedIndex === hootenannyIndex) {
        nextIndex = Math.max(0, offerCount - 4 + (focusedIndex === hootenannyIndex ? 1 : 0));
      } else {
        nextIndex = Math.max(0, focusedIndex - 4);
      }
    }

    if (nextIndex !== focusedIndex) {
      event.preventDefault();
      setFocusedIndex(nextIndex);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setFocusedIndex(null);
      sectionRef.current?.focus();
    }
  };

  return (
    <section
      className="trading-post"
      tabIndex={0}
      ref={sectionRef}
      onKeyDown={(event) => {
        onKeyDown(event as unknown as KeyboardEvent);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setFocusedIndex(null);
        }
      }}
    >
      <header className="shop-header">
        <h1>Trading Post</h1>
        <p>Night {gameState.nightNumber}</p>
        <p>Pop {gameState.pop}</p>
        <p>Cash {gameState.cash}</p>
      </header>

      <div className="shop-grid">
        {offers.map((offer, index) => {
          const affordable = gameState.pop >= offer.costPop;
          return (
            <ShopCard
              key={offer.offerId}
              offer={offer}
              affordable={affordable}
              focused={focusedId === `offer:${offer.offerId}`}
              onFocusCard={() => setFocusedIndex(index)}
              onPurchase={() => onBuyOffer(offer.offerId)}
              buttonRef={(element: HTMLButtonElement | null) => {
                refs.current[`offer:${offer.offerId}`] = element;
              }}
            />
          );
        })}
      </div>

      <div className="shop-lower-row">
        <BarnUpgradeCard
          barnCapacity={gameState.barnCapacity}
          price={capacityPrice}
          cash={gameState.cash}
          maxed={maxed}
          focused={focusedId === 'capacity'}
          onFocusCard={() => setFocusedIndex(offers.length)}
          onPurchase={onBuyCapacity}
          buttonRef={(element: HTMLButtonElement | null) => {
            refs.current.capacity = element;
          }}
        />

        <button
          type="button"
          className={`hootenanny-button${focusedId === 'hootenanny' ? ' focused' : ''}`}
          onFocus={() => setFocusedIndex(offers.length + 1)}
          onMouseEnter={() => setFocusedIndex(offers.length + 1)}
          onClick={onStartHootenanny}
          data-testid="start-next-night"
          ref={(element) => {
            refs.current.hootenanny = element;
          }}
        >
          Hootenanny
        </button>
      </div>

      <ShopInspector focusedOffer={focusedOffer} focusedTarget={focusedTarget} />
    </section>
  );
};
