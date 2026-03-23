import type { AnimalId } from '../game/types';
import { defaultAudioScheduler } from './sounds';
import {
  AUDIO_STORAGE_KEYS,
  DEFAULT_AUDIO_SETTINGS,
  type AudioCue,
  type AudioScheduler,
  type AudioSettings,
  type AudioSnapshot,
  type MusicTrackId,
  type ScheduleSfxOptions,
  type ScheduledSfxVoice,
  type SfxId
} from './types';

const MUSIC_CROSSFADE_SECONDS = 0.3;
const MUSIC_STOP_FADE_SECONDS = 0.12;
const DUCK_FADE_SECONDS = 0.04;
const DUCK_RELEASE_SECONDS = 0.22;
const POLYPHONY_LIMIT = 8;

interface MusicLayer {
  trackId: MusicTrackId;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface ActiveSfxVoice {
  startedAt: number;
  voice: ScheduledSfxVoice;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

interface AudioEngineOptions {
  createContext?: () => AudioContext;
  scheduler?: AudioScheduler;
  storage?: Storage | null;
  document?: Document | null;
}

type AudioContextCtor = {
  new (): AudioContext;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const getAudioContextCtor = (): AudioContextCtor | null => {
  const globalWithAudio = globalThis as typeof globalThis & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };

  return globalWithAudio.AudioContext ?? globalWithAudio.webkitAudioContext ?? null;
};

const parseStoredNumber = (value: string | null, fallback: number): number => {
  if (value === null) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, 0, 1);
};

const parseStoredBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value === null) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
};

const safeDisconnect = (node: AudioNode) => {
  try {
    node.disconnect();
  } catch {
    // Ignore already-disconnected nodes.
  }
};

const safeStopSource = (source: AudioScheduledSourceNode, when: number) => {
  try {
    source.stop(when);
  } catch {
    // Ignore already-stopped nodes.
  }
};

export class AudioEngine {
  private readonly createContext: () => AudioContext;

  private readonly scheduler: AudioScheduler;

  private readonly storage: Storage | null;

  private readonly documentRef: Document | null;

  private readonly subscribers = new Set<(snapshot: AudioSnapshot) => void>();

  private settings: AudioSettings;

  private unlocked = false;

  private context: AudioContext | null = null;

  private masterGain: GainNode | null = null;

  private musicGain: GainNode | null = null;

  private musicDuckGain: GainNode | null = null;

  private sfxGain: GainNode | null = null;

  private currentMusic: MusicLayer | null = null;

  private activeVoices: ActiveSfxVoice[] = [];

  private unlockListener: (() => void) | null = null;

  private visibilityListener: (() => void) | null = null;

  constructor(options: AudioEngineOptions = {}) {
    this.createContext =
      options.createContext ??
      (() => {
        const ctor = getAudioContextCtor();
        if (!ctor) {
          throw new Error('AudioContext unavailable');
        }

        return new ctor();
      });

    this.scheduler = options.scheduler ?? defaultAudioScheduler;

    this.storage =
      options.storage ??
      (() => {
        try {
          return typeof window !== 'undefined' ? window.localStorage : null;
        } catch {
          return null;
        }
      })();

    this.documentRef = options.document ?? (typeof document !== 'undefined' ? document : null);

    this.settings = this.loadSettings();

    this.installUnlockListeners();
    this.installVisibilityListener();
  }

  getSnapshot(): AudioSnapshot {
    return {
      ...this.settings,
      unlocked: this.unlocked,
      currentTrack: this.currentMusic?.trackId ?? null
    };
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  subscribe(listener: (snapshot: AudioSnapshot) => void): () => void {
    this.subscribers.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.subscribers.delete(listener);
    };
  }

  async unlock(): Promise<boolean> {
    if (this.unlocked) {
      return true;
    }

    const context = this.ensureContext();
    if (!context) {
      return false;
    }

    try {
      if (context.state === 'suspended') {
        await context.resume();
      }
    } catch {
      return false;
    }

    this.unlocked = true;
    this.removeUnlockListeners();
    this.emitSnapshot();
    return true;
  }

  playCue(cue: AudioCue): void {
    if (cue.id === 'music:stop') {
      this.stopMusic();
      return;
    }

    if (cue.id === 'music:barn-party') {
      this.playMusic('barn-party');
      return;
    }

    if (cue.id === 'music:shop') {
      this.playMusic('shop');
      return;
    }

    if (cue.id.startsWith('sfx:animal-entry:')) {
      const animalId = cue.id.slice('sfx:animal-entry:'.length) as AnimalId;
      this.playSfx('animal-entry', { animalId, delayMs: cue.delayMs });
      return;
    }

    if (cue.id === 'sfx:bust') {
      this.playSfx('bust', { delayMs: cue.delayMs });
      return;
    }

    if (cue.id === 'sfx:scoring-jingle') {
      this.playSfx('scoring-jingle', { delayMs: cue.delayMs });
      return;
    }

    if (cue.id === 'sfx:purchase') {
      this.playSfx('purchase', { delayMs: cue.delayMs });
      return;
    }

    if (cue.id === 'sfx:activate-ability') {
      this.playSfx('activate-ability', { delayMs: cue.delayMs });
      return;
    }

    if (cue.id === 'sfx:win-fanfare') {
      this.playSfx('win-fanfare', { delayMs: cue.delayMs });
      return;
    }

    if (cue.id === 'sfx:ui-hover') {
      this.playSfx('ui-hover', { delayMs: cue.delayMs });
      return;
    }

    if (cue.id === 'sfx:ui-select') {
      this.playSfx('ui-select', { delayMs: cue.delayMs });
    }
  }

  playMusic(trackId: MusicTrackId): void {
    if (!this.unlocked) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.musicGain) {
      return;
    }

    if (this.currentMusic?.trackId === trackId) {
      return;
    }

    const source = this.scheduler.createMusicSource(context, trackId);
    const layerGain = context.createGain();
    const now = context.currentTime;

    layerGain.gain.setValueAtTime(0.0001, now);
    source.connect(layerGain);
    layerGain.connect(this.musicGain);
    source.start(now);
    layerGain.gain.linearRampToValueAtTime(1, now + MUSIC_CROSSFADE_SECONDS);

    const previousLayer = this.currentMusic;
    this.currentMusic = {
      trackId,
      source,
      gain: layerGain
    };

    if (previousLayer) {
      this.fadeOutMusicLayer(previousLayer, MUSIC_CROSSFADE_SECONDS);
    }

    this.emitSnapshot();
  }

  stopMusic(): void {
    const layer = this.currentMusic;
    if (!layer) {
      return;
    }

    this.currentMusic = null;
    this.fadeOutMusicLayer(layer, MUSIC_STOP_FADE_SECONDS);
    this.emitSnapshot();
  }

  playSfx(sfxId: SfxId, options: ScheduleSfxOptions = {}): void {
    if (!this.unlocked) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.sfxGain) {
      return;
    }

    while (this.activeVoices.length >= POLYPHONY_LIMIT) {
      const oldest = this.activeVoices.shift();
      if (!oldest) {
        break;
      }

      if (oldest.cleanupTimer) {
        globalThis.clearTimeout(oldest.cleanupTimer);
      }
      oldest.voice.stop();
    }

    const voice = this.scheduler.scheduleSfx(context, this.sfxGain, sfxId, options);
    if (!voice) {
      return;
    }

    const activeVoice: ActiveSfxVoice = {
      startedAt: context.currentTime,
      voice,
      cleanupTimer: null
    };

    const cleanupDelayMs = Math.max(0, Math.round((voice.endTime - context.currentTime + 0.1) * 1000));
    activeVoice.cleanupTimer = globalThis.setTimeout(() => {
      this.activeVoices = this.activeVoices.filter((entry) => entry !== activeVoice);
    }, cleanupDelayMs);

    this.activeVoices.push(activeVoice);

    if (sfxId === 'bust') {
      this.duckMusic(0.1, 650);
    }
  }

  setMusicVolume(nextValue: number): void {
    const value = clamp(nextValue, 0, 1);
    this.settings = {
      ...this.settings,
      musicVolume: value
    };
    this.writeStorage(AUDIO_STORAGE_KEYS.musicVolume, String(value));

    if (this.context && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(value, this.context.currentTime, 0.03);
    }

    this.emitSnapshot();
  }

  setSfxVolume(nextValue: number): void {
    const value = clamp(nextValue, 0, 1);
    this.settings = {
      ...this.settings,
      sfxVolume: value
    };
    this.writeStorage(AUDIO_STORAGE_KEYS.sfxVolume, String(value));

    if (this.context && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(value, this.context.currentTime, 0.03);
    }

    this.emitSnapshot();
  }

  setMuted(muted: boolean): void {
    if (this.settings.muted === muted) {
      return;
    }

    this.settings = {
      ...this.settings,
      muted
    };
    this.writeStorage(AUDIO_STORAGE_KEYS.muted, String(muted));

    const context = this.context;
    if (context && this.masterGain) {
      const now = context.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.0001), now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0.0001 : 1, now + 0.02);

      if (muted) {
        void context.suspend().catch(() => {
          // Non-fatal.
        });
      } else if (this.isDocumentVisible()) {
        void context.resume().catch(() => {
          // Non-fatal.
        });
      }
    }

    this.emitSnapshot();
  }

  destroy(): void {
    this.removeUnlockListeners();
    this.removeVisibilityListener();

    this.stopMusic();

    for (const activeVoice of this.activeVoices) {
      if (activeVoice.cleanupTimer) {
        globalThis.clearTimeout(activeVoice.cleanupTimer);
      }
      activeVoice.voice.stop();
    }
    this.activeVoices = [];

    this.subscribers.clear();
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.subscribers) {
      listener(snapshot);
    }
  }

  private loadSettings(): AudioSettings {
    const storage = this.storage;
    if (!storage) {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }

    try {
      return {
        musicVolume: parseStoredNumber(storage.getItem(AUDIO_STORAGE_KEYS.musicVolume), DEFAULT_AUDIO_SETTINGS.musicVolume),
        sfxVolume: parseStoredNumber(storage.getItem(AUDIO_STORAGE_KEYS.sfxVolume), DEFAULT_AUDIO_SETTINGS.sfxVolume),
        muted: parseStoredBoolean(storage.getItem(AUDIO_STORAGE_KEYS.muted), DEFAULT_AUDIO_SETTINGS.muted)
      };
    } catch {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  private writeStorage(key: string, value: string): void {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(key, value);
    } catch {
      // Non-fatal.
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    try {
      const context = this.createContext();
      this.context = context;
      this.configureRouting(context);
      return context;
    } catch {
      return null;
    }
  }

  private configureRouting(context: AudioContext): void {
    const masterGain = context.createGain();
    const musicGain = context.createGain();
    const musicDuckGain = context.createGain();
    const sfxGain = context.createGain();

    musicGain.connect(musicDuckGain);
    musicDuckGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);

    const now = context.currentTime;

    musicGain.gain.setValueAtTime(this.settings.musicVolume, now);
    sfxGain.gain.setValueAtTime(this.settings.sfxVolume, now);
    musicDuckGain.gain.setValueAtTime(1, now);
    masterGain.gain.setValueAtTime(this.settings.muted ? 0.0001 : 1, now);

    this.masterGain = masterGain;
    this.musicGain = musicGain;
    this.musicDuckGain = musicDuckGain;
    this.sfxGain = sfxGain;
  }

  private fadeOutMusicLayer(layer: MusicLayer, fadeSeconds: number): void {
    const context = this.context;
    if (!context) {
      return;
    }

    const now = context.currentTime;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(Math.max(layer.gain.gain.value, 0.0001), now);
    layer.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);

    safeStopSource(layer.source, now + fadeSeconds + 0.02);

    const cleanupDelay = Math.max(0, Math.round((fadeSeconds + 0.08) * 1000));
    globalThis.setTimeout(() => {
      safeDisconnect(layer.source);
      safeDisconnect(layer.gain);
    }, cleanupDelay);
  }

  private duckMusic(targetLevel: number, holdMs: number): void {
    if (!this.context || !this.musicDuckGain) {
      return;
    }

    const now = this.context.currentTime;
    const holdSeconds = Math.max(0, holdMs) / 1000;
    const target = clamp(targetLevel, 0.01, 1);

    this.musicDuckGain.gain.cancelScheduledValues(now);
    this.musicDuckGain.gain.setValueAtTime(Math.max(this.musicDuckGain.gain.value, 0.0001), now);
    this.musicDuckGain.gain.linearRampToValueAtTime(target, now + DUCK_FADE_SECONDS);
    this.musicDuckGain.gain.setValueAtTime(target, now + holdSeconds);
    this.musicDuckGain.gain.linearRampToValueAtTime(1, now + holdSeconds + DUCK_RELEASE_SECONDS);
  }

  private installUnlockListeners(): void {
    if (!this.documentRef) {
      return;
    }

    const onGesture = () => {
      void this.unlock();
    };

    this.documentRef.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
    this.documentRef.addEventListener('keydown', onGesture, { capture: true });

    this.unlockListener = () => {
      this.documentRef?.removeEventListener('pointerdown', onGesture, { capture: true } as EventListenerOptions);
      this.documentRef?.removeEventListener('keydown', onGesture, { capture: true } as EventListenerOptions);
    };
  }

  private removeUnlockListeners(): void {
    if (!this.unlockListener) {
      return;
    }

    this.unlockListener();
    this.unlockListener = null;
  }

  private installVisibilityListener(): void {
    if (!this.documentRef) {
      return;
    }

    const onVisibilityChange = () => {
      const context = this.context;
      if (!context || !this.unlocked) {
        return;
      }

      if (this.documentRef?.visibilityState === 'hidden') {
        if (context.state === 'running') {
          void context.suspend().catch(() => {
            // Non-fatal.
          });
        }
        return;
      }

      if (!this.settings.muted && context.state === 'suspended') {
        void context.resume().catch(() => {
          // Non-fatal.
        });
      }
    };

    this.documentRef.addEventListener('visibilitychange', onVisibilityChange);
    this.visibilityListener = () => {
      this.documentRef?.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }

  private removeVisibilityListener(): void {
    if (!this.visibilityListener) {
      return;
    }

    this.visibilityListener();
    this.visibilityListener = null;
  }

  private isDocumentVisible(): boolean {
    if (!this.documentRef) {
      return true;
    }

    return this.documentRef.visibilityState !== 'hidden';
  }
}
