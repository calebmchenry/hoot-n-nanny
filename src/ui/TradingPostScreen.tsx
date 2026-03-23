import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { UI_COPY, getShopQuip } from '../content/copy';
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
  onHoverControl: (targetId: string, input?: 'mouse' | 'focus') => void;
  onSelectControl: () => void;
}

type FocusTarget = 'offer' | 'capacity' | 'hootenanny' | null;

export const TradingPostScreen = ({
  gameState,
  onBuyOffer,
  onBuyCapacity,
  onStartHootenanny,
  onHoverControl,
  onSelectControl
}: TradingPostScreenProps) => {
  const shopState = gameState.shopState;
  const offers = useMemo<ShopOffer[]>(
    () => [...(shopState?.regularOffers ?? []), ...(shopState?.blueRibbonOffers ?? [])],
    [shopState]
  );

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [recentPurchaseOfferId, setRecentPurchaseOfferId] = useState<string | null>(null);
  const [pulsePop, setPulsePop] = useState(false);
  const [pulseCash, setPulseCash] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousPopRef = useRef(gameState.pop);
  const previousCashRef = useRef(gameState.cash);

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
    const focusedId = focusedIndex === null ? null : focusIds[focusedIndex] ?? null;
    if (!focusedId) {
      return;
    }

    onHoverControl(`shop-focus-${focusedId}`, 'focus');
  }, [focusIds, focusedIndex, onHoverControl]);

  useEffect(() => {
    if (!shopState) {
      return;
    }

    sectionRef.current?.focus();
  }, [shopState]);

  useEffect(() => {
    if (!recentPurchaseOfferId) {
      return;
    }

    const timer = window.setTimeout(() => setRecentPurchaseOfferId(null), 260);
    return () => window.clearTimeout(timer);
  }, [recentPurchaseOfferId]);

  useEffect(() => {
    if (previousPopRef.current === gameState.pop) {
      return;
    }

    previousPopRef.current = gameState.pop;
    setPulsePop(true);
    const timer = window.setTimeout(() => setPulsePop(false), 260);
    return () => window.clearTimeout(timer);
  }, [gameState.pop]);

  useEffect(() => {
    if (previousCashRef.current === gameState.cash) {
      return;
    }

    previousCashRef.current = gameState.cash;
    setPulseCash(true);
    const timer = window.setTimeout(() => setPulseCash(false), 260);
    return () => window.clearTimeout(timer);
  }, [gameState.cash]);

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
      setRecentPurchaseOfferId(focusedOffer.offerId);
      onBuyOffer(focusedOffer.offerId);
      return;
    }

    if (focusedTarget === 'capacity') {
      onBuyCapacity();
      return;
    }

    if (focusedTarget === 'hootenanny') {
      onSelectControl();
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
      data-testid="trading-post"
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
        <p className={`shop-counter${pulsePop ? ' count-pulse' : ''}`}>Pop {gameState.pop}</p>
        <p className={`shop-counter${pulseCash ? ' count-pulse' : ''}`}>Cash {gameState.cash}</p>
        <p>Night {gameState.nightNumber}</p>
      </header>

      <p className="shop-quip">{getShopQuip(gameState.nightNumber)}</p>

      <div
        className="shop-grid"
        onMouseLeave={() => {
          setFocusedIndex(null);
        }}
      >
        {offers.map((offer, index) => {
          const affordable = gameState.pop >= offer.costPop;
          return (
            <ShopCard
              key={offer.offerId}
              offer={offer}
              affordable={affordable}
              focused={focusedId === `offer:${offer.offerId}`}
              purchased={recentPurchaseOfferId === offer.offerId}
              entryIndex={index}
              onFocusCard={() => setFocusedIndex(index)}
              onHoverControl={onHoverControl}
              onPurchase={() => {
                setRecentPurchaseOfferId(offer.offerId);
                onBuyOffer(offer.offerId);
              }}
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
          onHoverControl={onHoverControl}
          onPurchase={onBuyCapacity}
          buttonRef={(element: HTMLButtonElement | null) => {
            refs.current.capacity = element;
          }}
        />

        <button
          type="button"
          className={`hootenanny-button${focusedId === 'hootenanny' ? ' focused' : ''}`}
          onFocus={() => setFocusedIndex(offers.length + 1)}
          onPointerEnter={(event) => {
            setFocusedIndex(offers.length + 1);
            onHoverControl('shop-hootenanny', event.pointerType === 'mouse' ? 'mouse' : 'focus');
          }}
          onClick={() => {
            onSelectControl();
            onStartHootenanny();
          }}
          data-testid="start-next-night"
          ref={(element) => {
            refs.current.hootenanny = element;
          }}
        >
          Hootenanny
        </button>
      </div>

      <ShopInspector focusedOffer={focusedOffer} focusedTarget={focusedTarget} />
      <p className="shop-footer-note">{UI_COPY.shopHootenannyBlurb}</p>
    </section>
  );
};
