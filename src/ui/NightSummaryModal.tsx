import { useEffect, useMemo, useState } from 'preact/hooks';
import { OUTCOME_COPY, UI_COPY, getBustQuip, getScoreQuip, getWinQuip } from '../content/copy';
import type { NightSummary, ResolutionEvent } from '../game/types';
import { useAnimatedCounter, usePrefersReducedMotion } from './useAnimatedCounter';

interface NightSummaryModalProps {
  summary: NightSummary;
  onContinue: () => void;
  onHoverControl: (targetId: string, input?: 'mouse' | 'focus') => void;
  onSelectControl: () => void;
}

const applyEventToTotals = (
  totals: { pop: number; cash: number },
  event: ResolutionEvent
): { pop: number; cash: number } => {
  if (event.kind === 'pop-gain' || event.kind === 'bonus') {
    return { ...totals, pop: totals.pop + event.amount };
  }

  if (event.kind === 'pop-penalty') {
    return { ...totals, pop: Math.max(0, totals.pop - event.amount) };
  }

  if (event.kind === 'cash-gain') {
    return { ...totals, cash: totals.cash + event.amount };
  }

  return { ...totals, cash: Math.max(0, totals.cash - event.amount) };
};

export const NightSummaryModal = ({ summary, onContinue, onHoverControl, onSelectControl }: NightSummaryModalProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [revealedCount, setRevealedCount] = useState(0);
  const [targetPop, setTargetPop] = useState(summary.popBefore);
  const [targetCash, setTargetCash] = useState(summary.cashBefore);
  const [fastForwardToken, setFastForwardToken] = useState(0);

  useEffect(() => {
    const completeImmediately = prefersReducedMotion;
    setRevealedCount(completeImmediately ? summary.events.length : 0);
    setTargetPop(completeImmediately ? summary.popAfter : summary.popBefore);
    setTargetCash(completeImmediately ? summary.cashAfter : summary.cashBefore);
    setFastForwardToken((value) => value + 1);
  }, [prefersReducedMotion, summary]);

  useEffect(() => {
    if (prefersReducedMotion || revealedCount >= summary.events.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      const event = summary.events[revealedCount];
      const nextTotals = applyEventToTotals(
        {
          pop: targetPop,
          cash: targetCash
        },
        event
      );

      setTargetPop(nextTotals.pop);
      setTargetCash(nextTotals.cash);
      setRevealedCount((count) => count + 1);
    }, 240);

    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion, revealedCount, summary.events, targetCash, targetPop]);

  useEffect(() => {
    if (revealedCount !== summary.events.length) {
      return;
    }

    setTargetPop(summary.popAfter);
    setTargetCash(summary.cashAfter);
  }, [revealedCount, summary.cashAfter, summary.events.length, summary.popAfter]);

  const displayedPop = useAnimatedCounter({
    target: targetPop,
    durationMs: 220,
    instant: prefersReducedMotion,
    fastForwardToken
  });

  const displayedCash = useAnimatedCounter({
    target: targetCash,
    durationMs: 220,
    instant: prefersReducedMotion,
    fastForwardToken
  });

  const outcomeCopy = OUTCOME_COPY[summary.outcome];
  const quip = useMemo(() => {
    const seed = summary.events.length + summary.popAfter + summary.cashAfter;
    if (summary.outcome === 'bust-to-shop') {
      return getBustQuip(seed);
    }

    if (summary.outcome === 'score-to-win') {
      return getWinQuip(seed);
    }

    return getScoreQuip(seed);
  }, [summary]);

  const tallyComplete =
    revealedCount === summary.events.length && displayedPop === summary.popAfter && displayedCash === summary.cashAfter;

  const skipTally = () => {
    if (tallyComplete) {
      return;
    }

    setRevealedCount(summary.events.length);
    setTargetPop(summary.popAfter);
    setTargetCash(summary.cashAfter);
    setFastForwardToken((value) => value + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return;
      }

      if (!tallyComplete) {
        event.preventDefault();
        onSelectControl();
        skipTally();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSelectControl, tallyComplete]);

  return (
    <div
      className="summary-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Night Summary"
      onClick={(event) => {
        if (event.target === event.currentTarget && !tallyComplete) {
          onSelectControl();
          skipTally();
        }
      }}
    >
      <div
        className="summary-card"
        data-testid="summary-card"
        data-tally-state={tallyComplete ? 'complete' : 'running'}
        onClick={() => {
          if (!tallyComplete) {
            onSelectControl();
            skipTally();
          }
        }}
      >
        <h2>{outcomeCopy.heading}</h2>
        <p className="summary-quip">{quip}</p>
        <p>{outcomeCopy.support}</p>

        <div className="summary-totals" aria-hidden="true">
          <p className="summary-total-row">
            <span>Pop</span>
            <strong data-testid="summary-pop-value">{displayedPop}</strong>
          </p>
          <p className="summary-total-row">
            <span>Cash</span>
            <strong data-testid="summary-cash-value">{displayedCash}</strong>
          </p>
        </div>

        <p className="sr-only" aria-live="polite" data-testid="summary-final-live">
          {tallyComplete ? `Final totals Pop ${summary.popAfter} Cash ${summary.cashAfter}` : ''}
        </p>

        {summary.outcome === 'bust-to-shop' && summary.pinnedForNextNight ? (
          <p>
            {UI_COPY.pinnedLabel}: {summary.pinnedForNextNight}
          </p>
        ) : null}

        <div className="summary-log">
          {summary.events.length === 0 ? <p>{UI_COPY.summaryEmpty}</p> : null}
          {summary.events.slice(0, revealedCount).map((event, index) => (
            <p
              key={`${event.description}-${index}`}
              className="summary-event"
              style={{ '--event-index': String(index) } as { '--event-index': string }}
            >
              {event.description}
            </p>
          ))}
        </div>

        <p className="summary-skip-hint">{UI_COPY.summarySkipHint}</p>

        <button
          type="button"
          onFocus={() => onHoverControl('summary-continue', 'focus')}
          onPointerEnter={(event) => onHoverControl('summary-continue', event.pointerType === 'mouse' ? 'mouse' : 'focus')}
          onClick={(event) => {
            event.stopPropagation();
            onSelectControl();
            if (!tallyComplete) {
              skipTally();
              return;
            }

            onContinue();
          }}
          data-testid="continue-from-summary"
        >
          {tallyComplete ? outcomeCopy.cta : 'Skip Tally'}
        </button>
      </div>
    </div>
  );
};
