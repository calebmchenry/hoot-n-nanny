import { useEffect } from 'preact/hooks';
import type { GamePhase } from '../game/types';

interface PhaseTransitionCurtainProps {
  active: boolean;
  stage: 'exiting' | 'entering';
  from: GamePhase;
  to: GamePhase;
  onSkip: () => void;
}

const phaseLabel = (phase: GamePhase): string => {
  if (phase === 'night') {
    return 'Hootenanny';
  }

  if (phase === 'night-summary') {
    return 'Night Summary';
  }

  if (phase === 'shop') {
    return 'Trading Post';
  }

  return 'Victory';
};

export const PhaseTransitionCurtain = ({ active, stage, from, to, onSkip }: PhaseTransitionCurtainProps) => {
  useEffect(() => {
    if (!active) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      onSkip();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, onSkip]);

  if (!active) {
    return null;
  }

  return (
    <button
      type="button"
      className={`phase-curtain ${stage}`}
      onClick={onSkip}
      aria-label={`Skip transition from ${phaseLabel(from)} to ${phaseLabel(to)}`}
      data-testid="phase-curtain"
    >
      <span className="phase-curtain-label">{phaseLabel(from)} → {phaseLabel(to)}</span>
    </button>
  );
};
