import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import { applyIntent } from '../game/engine';
import {
  createInitialGameState,
  createSeededAbilityReminderState,
  createSeededShopState,
  createSeededWinState
} from '../game/state';
import { buildBarnSlots } from '../game/selectors';
import type { AppIntent, GamePhase, GameState } from '../game/types';
import { useControls } from '../input/useControls';
import { BarnGrid } from '../ui/BarnGrid';
import { InspectorPanel } from '../ui/InspectorPanel';
import { NightSummaryModal } from '../ui/NightSummaryModal';
import { PhaseTransitionCurtain } from '../ui/PhaseTransitionCurtain';
import { StatusBar } from '../ui/StatusBar';
import { TargetingOverlay } from '../ui/TargetingOverlay';
import { TradingPostScreen } from '../ui/TradingPostScreen';
import { WinScreen } from '../ui/WinScreen';
import { usePrefersReducedMotion } from '../ui/useAnimatedCounter';

const TRANSITION_EXIT_MS = 300;
const TRANSITION_ENTER_MS = 280;

interface SceneTransition {
  from: GamePhase;
  to: GamePhase;
  stage: 'exiting' | 'entering';
  intent: AppIntent;
  intentDispatched: boolean;
}

const resolveInitialState = (): GameState => {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');

  if (seed === 'win') {
    return createSeededWinState();
  }

  if (seed === 'shop') {
    return createSeededShopState();
  }

  if (seed === 'ability') {
    return createSeededAbilityReminderState();
  }

  return createInitialGameState(seed ?? undefined);
};

export const App = () => {
  const initialState = useMemo(() => resolveInitialState(), []);
  const [gameState, dispatch] = useReducer((state: GameState, intent: AppIntent) => applyIntent(state, intent), initialState);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(1);
  const [sceneTransition, setSceneTransition] = useState<SceneTransition | null>(null);
  const transitionTimerIds = useRef<number[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  const slots = useMemo(() => buildBarnSlots(gameState), [gameState]);
  const transitionActive = sceneTransition !== null;

  const clearTransitionTimers = () => {
    for (const id of transitionTimerIds.current) {
      window.clearTimeout(id);
    }
    transitionTimerIds.current = [];
  };

  useEffect(() => {
    return () => clearTransitionTimers();
  }, []);

  const dispatchIfReady = (intent: AppIntent) => {
    if (transitionActive) {
      return;
    }

    dispatch(intent);
  };

  const beginSceneTransition = (intent: AppIntent, to: GamePhase) => {
    if (transitionActive) {
      return;
    }

    if (prefersReducedMotion) {
      dispatch(intent);
      return;
    }

    clearTransitionTimers();

    setSceneTransition({
      from: gameState.phase,
      to,
      stage: 'exiting',
      intent,
      intentDispatched: false
    });

    const exitTimer = window.setTimeout(() => {
      dispatch(intent);

      setSceneTransition((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          stage: 'entering',
          intentDispatched: true
        };
      });

      const enterTimer = window.setTimeout(() => {
        setSceneTransition(null);
      }, TRANSITION_ENTER_MS);
      transitionTimerIds.current.push(enterTimer);
    }, TRANSITION_EXIT_MS);

    transitionTimerIds.current.push(exitTimer);
  };

  const skipSceneTransition = () => {
    if (!sceneTransition) {
      return;
    }

    clearTransitionTimers();

    if (!sceneTransition.intentDispatched) {
      dispatch(sceneTransition.intent);
    }

    setSceneTransition(null);
  };

  const activateSlot = (slotIndex: number) => {
    if (transitionActive) {
      return;
    }

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
    enabled: gameState.phase === 'night' && !transitionActive,
    selectedSlotIndex,
    onSelectSlot: setSelectedSlotIndex,
    onActivateSlot: activateSlot,
    onCancel: () => dispatchIfReady({ type: 'CANCEL_TARGETING' })
  });

  useEffect(() => {
    if (gameState.phase !== 'night') {
      return;
    }

    setSelectedSlotIndex(1);

    const focusTimer = window.setTimeout(() => {
      const door = document.querySelector<HTMLButtonElement>('[data-slot-index="1"]');
      door?.focus();
    }, prefersReducedMotion ? 0 : 80);

    return () => window.clearTimeout(focusTimer);
  }, [gameState.phase, prefersReducedMotion]);

  const onContinueFromSummary = () => {
    if (!gameState.lastNightSummary || gameState.phase !== 'night-summary') {
      return;
    }

    const toPhase: GamePhase = gameState.lastNightSummary.outcome === 'score-to-win' ? 'win' : 'shop';
    beginSceneTransition({ type: 'CONTINUE_FROM_SUMMARY' }, toPhase);
  };

  return (
    <main
      className="app-shell"
      data-phase={gameState.phase}
      data-transition={sceneTransition?.stage ?? 'idle'}
      data-transition-to={sceneTransition?.to ?? undefined}
    >
      {gameState.phase === 'shop' ? (
        <TradingPostScreen
          gameState={gameState}
          onBuyOffer={(offerId) => dispatchIfReady({ type: 'SHOP_BUY_OFFER', offerId })}
          onBuyCapacity={() => dispatchIfReady({ type: 'SHOP_BUY_CAPACITY' })}
          onStartHootenanny={() => beginSceneTransition({ type: 'SHOP_START_HOOTENANNY' }, 'night')}
        />
      ) : null}

      {gameState.phase === 'win' ? (
        <WinScreen gameState={gameState} onPlayAgain={() => dispatchIfReady({ type: 'PLAY_AGAIN' })} />
      ) : null}

      {gameState.phase !== 'shop' && gameState.phase !== 'win' ? (
        <>
          <StatusBar gameState={gameState} />
          <section className="night-layout">
            <div className="barn-grid-wrap">
              <BarnGrid gameState={gameState} selectedSlotIndex={selectedSlotIndex} onSelectSlot={setSelectedSlotIndex} />
            </div>
            <InspectorPanel
              gameState={gameState}
              selectedSlotIndex={selectedSlotIndex}
              onInvite={() => dispatchIfReady({ type: 'INVITE_FROM_DOOR' })}
              onCallItANight={() => dispatchIfReady({ type: 'CALL_IT_A_NIGHT' })}
              onUseAbility={(sourceId) => dispatchIfReady({ type: 'USE_ABILITY', sourceId })}
            />
          </section>

          <TargetingOverlay
            gameState={gameState}
            onSelectTarget={(targetId) => dispatchIfReady({ type: 'SELECT_TARGET', targetId })}
            onCancel={() => dispatchIfReady({ type: 'CANCEL_TARGETING' })}
          />

          {gameState.phase === 'night-summary' && gameState.lastNightSummary ? (
            <NightSummaryModal summary={gameState.lastNightSummary} onContinue={onContinueFromSummary} />
          ) : null}
        </>
      ) : null}

      <PhaseTransitionCurtain
        active={!prefersReducedMotion && transitionActive && sceneTransition !== null}
        from={sceneTransition?.from ?? gameState.phase}
        to={sceneTransition?.to ?? gameState.phase}
        stage={sceneTransition?.stage ?? 'entering'}
        onSkip={skipSceneTransition}
      />
    </main>
  );
};
