import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { GamePhase } from '../game/types';
import { AudioEngine } from './engine';
import type { AudioCue, AudioSnapshot } from './types';

const HOVER_THROTTLE_MS = 70;
const SAME_TARGET_COOLDOWN_MS = 450;
const TOUCH_MOUSE_SUPPRESS_MS = 450;

let sharedEngine: AudioEngine | null = null;

const getEngine = (): AudioEngine => {
  if (!sharedEngine) {
    sharedEngine = new AudioEngine();
  }

  return sharedEngine;
};

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

type HoverInput = 'mouse' | 'focus';

export interface UseAudioApi {
  snapshot: AudioSnapshot;
  playCues: (cues: AudioCue[]) => void;
  syncPhaseMusic: (phase: GamePhase) => void;
  playUiHover: (targetId: string, input?: HoverInput) => void;
  playUiSelect: () => void;
  setMuted: (muted: boolean) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
}

export const useAudio = (): UseAudioApi => {
  const engine = getEngine();
  const [snapshot, setSnapshot] = useState<AudioSnapshot>(() => engine.getSnapshot());

  const lastHoverAtRef = useRef(0);
  const lastHoverTargetRef = useRef('');
  const lastTouchAtRef = useRef(0);

  useEffect(() => engine.subscribe(setSnapshot), [engine]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onTouchStart = () => {
      lastTouchAtRef.current = nowMs();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => window.removeEventListener('touchstart', onTouchStart);
  }, []);

  const playCues = useCallback(
    (cues: AudioCue[]) => {
      for (const cue of cues) {
        engine.playCue(cue);
      }
    },
    [engine]
  );

  const syncPhaseMusic = useCallback(
    (phase: GamePhase) => {
      if (phase === 'shop') {
        engine.playMusic('shop');
        return;
      }

      if (phase === 'win') {
        engine.stopMusic();
        return;
      }

      engine.playMusic('barn-party');
    },
    [engine]
  );

  const playUiHover = useCallback(
    (targetId: string, input: HoverInput = 'focus') => {
      const now = nowMs();

      if (input === 'mouse' && now - lastTouchAtRef.current < TOUCH_MOUSE_SUPPRESS_MS) {
        return;
      }

      if (targetId === lastHoverTargetRef.current && now - lastHoverAtRef.current < SAME_TARGET_COOLDOWN_MS) {
        return;
      }

      if (now - lastHoverAtRef.current < HOVER_THROTTLE_MS) {
        return;
      }

      lastHoverTargetRef.current = targetId;
      lastHoverAtRef.current = now;
      engine.playSfx('ui-hover');
    },
    [engine]
  );

  const playUiSelect = useCallback(() => {
    engine.playSfx('ui-select');
  }, [engine]);

  const setMuted = useCallback(
    (muted: boolean) => {
      engine.setMuted(muted);
    },
    [engine]
  );

  const setMusicVolume = useCallback(
    (value: number) => {
      engine.setMusicVolume(value);
    },
    [engine]
  );

  const setSfxVolume = useCallback(
    (value: number) => {
      engine.setSfxVolume(value);
    },
    [engine]
  );

  return {
    snapshot,
    playCues,
    syncPhaseMusic,
    playUiHover,
    playUiSelect,
    setMuted,
    setMusicVolume,
    setSfxVolume
  };
};
