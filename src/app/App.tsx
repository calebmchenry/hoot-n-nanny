import { useMemo, useReducer, useState } from 'preact/hooks';
import { applyIntent } from '../game/engine';
import { createInitialGameState, createSeededShopState, createSeededWinState } from '../game/state';
import { buildBarnSlots } from '../game/selectors';
import type { AppIntent, GameState } from '../game/types';
import { useControls } from '../input/useControls';
import { BarnGrid } from '../ui/BarnGrid';
import { InspectorPanel } from '../ui/InspectorPanel';
import { NightSummaryModal } from '../ui/NightSummaryModal';
import { StatusBar } from '../ui/StatusBar';
import { TargetingOverlay } from '../ui/TargetingOverlay';
import { TradingPostScreen } from '../ui/TradingPostScreen';
import { WinScreen } from '../ui/WinScreen';

const resolveInitialState = (): GameState => {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');

  if (seed === 'win') {
    return createSeededWinState();
  }

  if (seed === 'shop') {
    return createSeededShopState();
  }

  return createInitialGameState(seed ?? undefined);
};

export const App = () => {
  const initialState = useMemo(() => resolveInitialState(), []);
  const [gameState, dispatch] = useReducer((state: GameState, intent: AppIntent) => applyIntent(state, intent), initialState);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(1);

  const slots = useMemo(() => buildBarnSlots(gameState), [gameState]);

  const activateSlot = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (!slot || gameState.phase !== 'night') {
      return;
    }

    if (gameState.night.targeting && slot.kind === 'animal' && slot.guestGroup) {
      dispatch({ type: 'SELECT_TARGET', targetId: slot.guestGroup.instanceIds[0] });
      return;
    }

    if (slot.kind === 'door') {
      dispatch({ type: 'INVITE_FROM_DOOR' });
    }
  };

  useControls({
    enabled: gameState.phase === 'night',
    selectedSlotIndex,
    onSelectSlot: setSelectedSlotIndex,
    onActivateSlot: activateSlot,
    onCancel: () => dispatch({ type: 'CANCEL_TARGETING' })
  });

  if (gameState.phase === 'shop') {
    return (
      <main className="app-shell" data-phase="shop">
        <TradingPostScreen
          gameState={gameState}
          onBuyOffer={(offerId) => dispatch({ type: 'SHOP_BUY_OFFER', offerId })}
          onBuyCapacity={() => dispatch({ type: 'SHOP_BUY_CAPACITY' })}
          onStartHootenanny={() => dispatch({ type: 'SHOP_START_HOOTENANNY' })}
        />
      </main>
    );
  }

  if (gameState.phase === 'win') {
    return (
      <main className="app-shell" data-phase="win">
        <WinScreen gameState={gameState} onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })} />
      </main>
    );
  }

  return (
    <main className="app-shell" data-phase={gameState.phase}>
      <StatusBar gameState={gameState} />
      <section className="night-layout">
        <div className="barn-grid-wrap">
          <BarnGrid gameState={gameState} selectedSlotIndex={selectedSlotIndex} onSelectSlot={setSelectedSlotIndex} />
        </div>
        <InspectorPanel
          gameState={gameState}
          selectedSlotIndex={selectedSlotIndex}
          onInvite={() => dispatch({ type: 'INVITE_FROM_DOOR' })}
          onCallItANight={() => dispatch({ type: 'CALL_IT_A_NIGHT' })}
          onUseAbility={(sourceId) => dispatch({ type: 'USE_ABILITY', sourceId })}
        />
      </section>

      <TargetingOverlay
        gameState={gameState}
        onSelectTarget={(targetId) => dispatch({ type: 'SELECT_TARGET', targetId })}
        onCancel={() => dispatch({ type: 'CANCEL_TARGETING' })}
      />

      {gameState.phase === 'night-summary' && gameState.lastNightSummary ? (
        <NightSummaryModal
          summary={gameState.lastNightSummary}
          onContinue={() => dispatch({ type: 'CONTINUE_FROM_SUMMARY' })}
        />
      ) : null}
    </main>
  );
};
