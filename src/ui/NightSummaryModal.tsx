import type { NightSummary } from '../game/types';

interface NightSummaryModalProps {
  summary: NightSummary;
  onContinue: () => void;
}

export const NightSummaryModal = ({ summary, onContinue }: NightSummaryModalProps) => {
  return (
    <div className="summary-backdrop" role="dialog" aria-modal="true" aria-label="Night Summary">
      <div className="summary-card">
        <h2>{summary.title}</h2>
        <p>Pop: {summary.popAfter}</p>
        <p>Cash: {summary.cashAfter}</p>
        {summary.outcome === 'bust-to-shop' && summary.pinnedForNextNight ? (
          <p>Pinned for next night: {summary.pinnedForNextNight}</p>
        ) : null}
        <div className="summary-log">
          {summary.resolutionLog.length === 0 ? <p>No scoring this night.</p> : null}
          {summary.resolutionLog.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
        <button type="button" onClick={onContinue} data-testid="continue-from-summary">
          {summary.outcome === 'score-to-win' ? 'Celebrate' : 'Trading Post'}
        </button>
      </div>
    </div>
  );
};
