import type { AnimalId } from '../game/types';

export const AUDIO_STORAGE_KEYS = {
  musicVolume: 'hnn-music-vol',
  sfxVolume: 'hnn-sfx-vol',
  muted: 'hnn-muted'
} as const;

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface AudioSnapshot extends AudioSettings {
  unlocked: boolean;
  currentTrack: MusicTrackId | null;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.4,
  sfxVolume: 0.6,
  muted: false
};

export type MusicTrackId = 'barn-party' | 'shop';

export type SfxId =
  | 'animal-entry'
  | 'bust'
  | 'scoring-jingle'
  | 'purchase'
  | 'activate-ability'
  | 'win-fanfare'
  | 'ui-hover'
  | 'ui-select';

export type AudioCueId =
  | `music:${MusicTrackId}`
  | 'music:stop'
  | `sfx:animal-entry:${AnimalId}`
  | 'sfx:bust'
  | 'sfx:scoring-jingle'
  | 'sfx:purchase'
  | 'sfx:activate-ability'
  | 'sfx:win-fanfare'
  | 'sfx:ui-hover'
  | 'sfx:ui-select';

export interface AudioCue {
  id: AudioCueId;
  delayMs?: number;
}

export interface ScheduleSfxOptions {
  animalId?: AnimalId;
  delayMs?: number;
}

export interface ScheduledSfxVoice {
  endTime: number;
  stop: () => void;
}

export interface AudioScheduler {
  createMusicSource: (context: AudioContext, trackId: MusicTrackId) => AudioBufferSourceNode;
  scheduleSfx: (
    context: AudioContext,
    destination: AudioNode,
    sfxId: SfxId,
    options?: ScheduleSfxOptions
  ) => ScheduledSfxVoice | null;
}
