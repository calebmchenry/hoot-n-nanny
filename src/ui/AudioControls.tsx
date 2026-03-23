import { useState } from 'preact/hooks';
import { UI_COPY } from '../content/copy';

interface AudioControlsProps {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  unlocked: boolean;
  onSetMuted: (muted: boolean) => void;
  onSetMusicVolume: (value: number) => void;
  onSetSfxVolume: (value: number) => void;
  onHoverControl: (targetId: string, input?: 'mouse' | 'focus') => void;
  onSelectControl: () => void;
}

const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
    <path d="M4 9h4l6-5v16l-6-5H4z" />
    {muted ? <path d="M17 9l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="2" fill="none" /> : null}
    {!muted ? <path d="M17 8c2 2 2 6 0 8m2-11c3 3 3 11 0 14" stroke="currentColor" strokeWidth="2" fill="none" /> : null}
  </svg>
);

export const AudioControls = ({
  muted,
  musicVolume,
  sfxVolume,
  unlocked,
  onSetMuted,
  onSetMusicVolume,
  onSetSfxVolume,
  onHoverControl,
  onSelectControl
}: AudioControlsProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className={`audio-controls${expanded ? ' expanded' : ''}`}
      aria-label={UI_COPY.audioControlsLabel}
      data-testid="audio-controls"
    >
      <button
        type="button"
        className="audio-toggle"
        aria-label={expanded ? UI_COPY.audioCollapseLabel : UI_COPY.audioExpandLabel}
        aria-expanded={expanded}
        onFocus={() => {
          onHoverControl('audio-toggle', 'focus');
        }}
        onPointerEnter={(event) => {
          onHoverControl('audio-toggle', event.pointerType === 'mouse' ? 'mouse' : 'focus');
        }}
        onClick={() => {
          onSelectControl();
          setExpanded((value) => !value);
        }}
        data-testid="audio-expand"
      >
        <SpeakerIcon muted={muted} />
      </button>

      {expanded ? (
        <div className="audio-panel">
          <button
            type="button"
            className="audio-mute"
            aria-label={muted ? UI_COPY.audioUnmuteLabel : UI_COPY.audioMuteLabel}
            onFocus={() => onHoverControl('audio-mute', 'focus')}
            onPointerEnter={(event) => onHoverControl('audio-mute', event.pointerType === 'mouse' ? 'mouse' : 'focus')}
            onClick={() => {
              onSelectControl();
              onSetMuted(!muted);
            }}
            data-testid="audio-mute"
          >
            {muted ? UI_COPY.audioUnmuteAction : UI_COPY.audioMuteAction}
          </button>

          <label className="audio-slider-label" htmlFor="audio-music-volume">
            {UI_COPY.audioMusicLabel}
          </label>
          <input
            id="audio-music-volume"
            data-testid="audio-music-volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={musicVolume}
            aria-label={UI_COPY.audioMusicLabel}
            onFocus={() => onHoverControl('audio-music-volume', 'focus')}
            onPointerEnter={(event) =>
              onHoverControl('audio-music-volume', event.pointerType === 'mouse' ? 'mouse' : 'focus')
            }
            onInput={(event) => {
              const target = event.currentTarget as HTMLInputElement;
              onSetMusicVolume(Number(target.value));
            }}
          />

          <label className="audio-slider-label" htmlFor="audio-sfx-volume">
            {UI_COPY.audioSfxLabel}
          </label>
          <input
            id="audio-sfx-volume"
            data-testid="audio-sfx-volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sfxVolume}
            aria-label={UI_COPY.audioSfxLabel}
            onFocus={() => onHoverControl('audio-sfx-volume', 'focus')}
            onPointerEnter={(event) => onHoverControl('audio-sfx-volume', event.pointerType === 'mouse' ? 'mouse' : 'focus')}
            onInput={(event) => {
              const target = event.currentTarget as HTMLInputElement;
              onSetSfxVolume(Number(target.value));
            }}
          />

          {!unlocked ? <p className="audio-unlocked-hint">{UI_COPY.audioUnlockHint}</p> : null}
        </div>
      ) : null}
    </section>
  );
};
