import type { AnimalId } from '../game/types';
import type {
  AudioScheduler,
  MusicTrackId,
  ScheduleSfxOptions,
  ScheduledSfxVoice,
  SfxId
} from './types';

type WaveShape = 'sine' | 'square' | 'triangle' | 'sawtooth';

type AnimalProfileId =
  | 'poultry-cluck'
  | 'ruminant-bleat'
  | 'bird-call'
  | 'pig-snort'
  | 'horse-whinny'
  | 'cat-meow';

interface ScheduledPart {
  source: AudioScheduledSourceNode;
  nodes: AudioNode[];
}

const MIN_ENVELOPE_SECONDS = 0.005;

const musicBufferCache = new Map<string, AudioBuffer>();
const noiseBufferCache = new Map<string, AudioBuffer>();

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

const waveSample = (phase: number, shape: WaveShape): number => {
  if (shape === 'sine') {
    return Math.sin(phase);
  }

  if (shape === 'square') {
    return Math.sin(phase) >= 0 ? 1 : -1;
  }

  if (shape === 'triangle') {
    return (2 / Math.PI) * Math.asin(Math.sin(phase));
  }

  const wrapped = phase % (Math.PI * 2);
  return wrapped / Math.PI - 1;
};

const addWaveNote = (
  channel: Float32Array,
  sampleRate: number,
  startSeconds: number,
  durationSeconds: number,
  frequency: number,
  shape: WaveShape,
  gain: number,
  options: {
    attackSeconds?: number;
    releaseSeconds?: number;
    endFrequency?: number;
  } = {}
) => {
  const attack = Math.max(MIN_ENVELOPE_SECONDS, options.attackSeconds ?? Math.min(0.016, durationSeconds * 0.28));
  const release = Math.max(MIN_ENVELOPE_SECONDS, options.releaseSeconds ?? Math.min(0.065, durationSeconds * 0.42));
  const sustain = Math.max(0, durationSeconds - attack - release);

  const startIndex = Math.max(0, Math.floor(startSeconds * sampleRate));
  const endIndex = Math.min(channel.length, Math.ceil((startSeconds + durationSeconds) * sampleRate));

  let phase = 0;

  for (let index = startIndex; index < endIndex; index += 1) {
    const elapsed = (index - startIndex) / sampleRate;
    let envelope = 0;

    if (elapsed < attack) {
      envelope = elapsed / attack;
    } else if (elapsed < attack + sustain) {
      envelope = 1;
    } else {
      const releaseElapsed = elapsed - attack - sustain;
      envelope = clamp(1 - releaseElapsed / release, 0, 1);
    }

    const progress = clamp(elapsed / durationSeconds, 0, 1);
    const currentFrequency = options.endFrequency
      ? frequency + (options.endFrequency - frequency) * progress
      : frequency;

    phase += (Math.PI * 2 * currentFrequency) / sampleRate;
    channel[index] += waveSample(phase, shape) * gain * envelope;
  }
};

const addNoiseBurst = (
  channel: Float32Array,
  sampleRate: number,
  startSeconds: number,
  durationSeconds: number,
  gain: number
) => {
  const attack = Math.max(MIN_ENVELOPE_SECONDS, Math.min(0.012, durationSeconds * 0.3));
  const release = Math.max(MIN_ENVELOPE_SECONDS, Math.min(0.05, durationSeconds * 0.7));
  const sustain = Math.max(0, durationSeconds - attack - release);

  const startIndex = Math.max(0, Math.floor(startSeconds * sampleRate));
  const endIndex = Math.min(channel.length, Math.ceil((startSeconds + durationSeconds) * sampleRate));

  for (let index = startIndex; index < endIndex; index += 1) {
    const elapsed = (index - startIndex) / sampleRate;
    let envelope = 0;

    if (elapsed < attack) {
      envelope = elapsed / attack;
    } else if (elapsed < attack + sustain) {
      envelope = 1;
    } else {
      envelope = clamp(1 - (elapsed - attack - sustain) / release, 0, 1);
    }

    channel[index] += (Math.random() * 2 - 1) * gain * envelope;
  }
};

const finalizeLoopBuffer = (channel: Float32Array, sampleRate: number) => {
  const edgeFadeSamples = Math.max(1, Math.floor(sampleRate * 0.005));
  for (let i = 0; i < edgeFadeSamples && i < channel.length; i += 1) {
    const fadeIn = i / edgeFadeSamples;
    const fadeOut = (edgeFadeSamples - i) / edgeFadeSamples;
    channel[i] *= fadeIn;
    channel[channel.length - 1 - i] *= fadeOut;
  }

  let peak = 0;
  for (const sample of channel) {
    peak = Math.max(peak, Math.abs(sample));
  }

  if (peak <= 0) {
    return;
  }

  const gain = peak > 0.85 ? 0.85 / peak : 1;
  if (gain === 1) {
    return;
  }

  for (let i = 0; i < channel.length; i += 1) {
    channel[i] *= gain;
  }
};

const buildBarnPartyBuffer = (context: AudioContext): AudioBuffer => {
  const bpm = 140;
  const beatsPerBar = 4;
  const bars = 8;
  const totalBeats = beatsPerBar * bars;
  const beatSeconds = 60 / bpm;
  const durationSeconds = totalBeats * beatSeconds;

  const length = Math.ceil(durationSeconds * context.sampleRate);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);

  const melodyPhrase = [0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2];
  const chordRoots = [0, 2, -3, 0];

  for (let segment = 0; segment < 4; segment += 1) {
    const transposition = chordRoots[segment];
    for (let step = 0; step < melodyPhrase.length; step += 1) {
      const globalStep = segment * melodyPhrase.length + step;
      const start = globalStep * beatSeconds * 0.5;
      const semitone = melodyPhrase[step] + transposition;
      const pitch = midiToFrequency(72 + semitone);
      addWaveNote(channel, context.sampleRate, start, beatSeconds * 0.42, pitch, 'square', 0.11, {
        attackSeconds: 0.008,
        releaseSeconds: 0.06,
        endFrequency: pitch * 0.985
      });
    }
  }

  const bassPattern = [0, 0, -5, -5, -3, -3, -5, -5];
  for (let beat = 0; beat < totalBeats; beat += 1) {
    const segment = Math.floor(beat / 8);
    const transposition = chordRoots[segment % chordRoots.length];
    const bassSemitone = bassPattern[beat % bassPattern.length] + transposition;
    const pitch = midiToFrequency(45 + bassSemitone);
    addWaveNote(channel, context.sampleRate, beat * beatSeconds, beatSeconds * 0.92, pitch, 'triangle', 0.15, {
      attackSeconds: 0.01,
      releaseSeconds: 0.08
    });

    addNoiseBurst(channel, context.sampleRate, beat * beatSeconds, 0.028, 0.02);
    if (beat % 2 === 1) {
      addNoiseBurst(channel, context.sampleRate, beat * beatSeconds + beatSeconds * 0.5, 0.018, 0.014);
    }
  }

  finalizeLoopBuffer(channel, context.sampleRate);
  return buffer;
};

const buildShopLoopBuffer = (context: AudioContext): AudioBuffer => {
  const bpm = 92;
  const beatsPerBar = 4;
  const bars = 8;
  const totalBeats = beatsPerBar * bars;
  const beatSeconds = 60 / bpm;
  const durationSeconds = totalBeats * beatSeconds;

  const length = Math.ceil(durationSeconds * context.sampleRate);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);

  const melodyPattern: Array<number | null> = [
    0,
    null,
    2,
    null,
    4,
    2,
    0,
    -3,
    0,
    null,
    2,
    null,
    5,
    4,
    2,
    0,
    2,
    null,
    4,
    null,
    7,
    5,
    4,
    2,
    0,
    null,
    -3,
    null,
    0,
    2,
    4,
    null
  ];

  for (let beat = 0; beat < melodyPattern.length; beat += 1) {
    const note = melodyPattern[beat];
    if (note === null) {
      continue;
    }

    const pitch = midiToFrequency(67 + note);
    addWaveNote(channel, context.sampleRate, beat * beatSeconds, beatSeconds * 0.88, pitch, 'triangle', 0.1, {
      attackSeconds: 0.02,
      releaseSeconds: 0.11,
      endFrequency: pitch * 0.995
    });
  }

  const bassPattern = [0, 0, -5, -5, -3, -3, -5, -5];
  for (let beat = 0; beat < totalBeats; beat += 2) {
    const semitone = bassPattern[(beat / 2) % bassPattern.length];
    const pitch = midiToFrequency(41 + semitone);
    addWaveNote(channel, context.sampleRate, beat * beatSeconds, beatSeconds * 1.8, pitch, 'triangle', 0.13, {
      attackSeconds: 0.015,
      releaseSeconds: 0.14
    });

    addWaveNote(channel, context.sampleRate, beat * beatSeconds + beatSeconds, beatSeconds * 0.45, pitch * 2, 'sine', 0.025, {
      attackSeconds: 0.01,
      releaseSeconds: 0.05
    });
  }

  for (let beat = 0; beat < totalBeats; beat += 4) {
    addNoiseBurst(channel, context.sampleRate, beat * beatSeconds + beatSeconds * 1.5, 0.03, 0.012);
  }

  finalizeLoopBuffer(channel, context.sampleRate);
  return buffer;
};

const getMusicBuffer = (context: AudioContext, trackId: MusicTrackId): AudioBuffer => {
  const key = `${trackId}:${context.sampleRate}`;
  const cached = musicBufferCache.get(key);
  if (cached) {
    return cached;
  }

  const created = trackId === 'barn-party' ? buildBarnPartyBuffer(context) : buildShopLoopBuffer(context);
  musicBufferCache.set(key, created);
  return created;
};

export const createMusicSource = (context: AudioContext, trackId: MusicTrackId): AudioBufferSourceNode => {
  const source = context.createBufferSource();
  source.buffer = getMusicBuffer(context, trackId);
  source.loop = true;
  return source;
};

const getNoiseBuffer = (context: AudioContext, durationSeconds: number): AudioBuffer => {
  const sampleRate = context.sampleRate;
  const roundedDuration = Math.ceil(durationSeconds * 1000) / 1000;
  const key = `${sampleRate}:${roundedDuration}`;
  const cached = noiseBufferCache.get(key);
  if (cached) {
    return cached;
  }

  const length = Math.max(1, Math.ceil(roundedDuration * sampleRate));
  const buffer = context.createBuffer(1, length, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }

  noiseBufferCache.set(key, buffer);
  return buffer;
};

const applyGainEnvelope = (
  parameter: AudioParam,
  startTime: number,
  durationSeconds: number,
  peak: number,
  options: { attackSeconds?: number; releaseSeconds?: number } = {}
) => {
  const attack = Math.max(MIN_ENVELOPE_SECONDS, options.attackSeconds ?? Math.min(0.015, durationSeconds * 0.35));
  const release = Math.max(MIN_ENVELOPE_SECONDS, options.releaseSeconds ?? Math.min(0.08, durationSeconds * 0.5));
  const sustain = Math.max(0, durationSeconds - attack - release);

  parameter.setValueAtTime(0.0001, startTime);
  parameter.linearRampToValueAtTime(peak, startTime + attack);
  parameter.setValueAtTime(peak, startTime + attack + sustain);
  parameter.linearRampToValueAtTime(0.0001, startTime + durationSeconds);
};

const scheduleTone = (
  context: AudioContext,
  destination: AudioNode,
  options: {
    startTime: number;
    durationSeconds: number;
    frequency: number;
    endFrequency?: number;
    gain: number;
    shape: OscillatorType;
    attackSeconds?: number;
    releaseSeconds?: number;
  }
): ScheduledPart => {
  const oscillator = context.createOscillator();
  oscillator.type = options.shape;
  oscillator.frequency.setValueAtTime(options.frequency, options.startTime);

  if (options.endFrequency !== undefined) {
    oscillator.frequency.linearRampToValueAtTime(options.endFrequency, options.startTime + options.durationSeconds);
  }

  const gainNode = context.createGain();
  applyGainEnvelope(gainNode.gain, options.startTime, options.durationSeconds, options.gain, {
    attackSeconds: options.attackSeconds,
    releaseSeconds: options.releaseSeconds
  });

  oscillator.connect(gainNode);
  gainNode.connect(destination);
  oscillator.start(options.startTime);
  oscillator.stop(options.startTime + options.durationSeconds + 0.03);

  return {
    source: oscillator,
    nodes: [oscillator, gainNode]
  };
};

const scheduleNoise = (
  context: AudioContext,
  destination: AudioNode,
  options: {
    startTime: number;
    durationSeconds: number;
    gain: number;
    attackSeconds?: number;
    releaseSeconds?: number;
    filterType?: BiquadFilterType;
    filterFrequency?: number;
  }
): ScheduledPart => {
  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context, options.durationSeconds + 0.04);

  const gainNode = context.createGain();
  applyGainEnvelope(gainNode.gain, options.startTime, options.durationSeconds, options.gain, {
    attackSeconds: options.attackSeconds,
    releaseSeconds: options.releaseSeconds
  });

  let lastNode: AudioNode = source;
  const nodes: AudioNode[] = [source, gainNode];

  if (options.filterType && options.filterFrequency) {
    const filter = context.createBiquadFilter();
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.filterFrequency, options.startTime);
    lastNode.connect(filter);
    lastNode = filter;
    nodes.push(filter);
  }

  lastNode.connect(gainNode);
  gainNode.connect(destination);

  source.start(options.startTime);
  source.stop(options.startTime + options.durationSeconds + 0.03);

  return {
    source,
    nodes
  };
};

const safeStop = (source: AudioScheduledSourceNode, when: number) => {
  try {
    source.stop(when);
  } catch {
    // Source may already be stopped.
  }
};

const safeDisconnect = (node: AudioNode) => {
  try {
    node.disconnect();
  } catch {
    // Node may already be disconnected.
  }
};

const createVoice = (
  context: AudioContext,
  destination: AudioNode
): {
  output: GainNode;
  register: (part: ScheduledPart) => void;
  finalize: (endTime: number) => ScheduledSfxVoice;
} => {
  const output = context.createGain();
  output.gain.setValueAtTime(1, context.currentTime);
  output.connect(destination);

  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [output];
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) {
      return;
    }

    cleaned = true;
    for (const node of nodes) {
      safeDisconnect(node);
    }
  };

  return {
    output,
    register: (part) => {
      sources.push(part.source);
      nodes.push(...part.nodes);
    },
    finalize: (endTime) => {
      const cleanupDelayMs = Math.max(0, Math.round((endTime - context.currentTime + 0.25) * 1000));
      const cleanupTimer = globalThis.setTimeout(cleanup, cleanupDelayMs);

      return {
        endTime,
        stop: () => {
          const now = context.currentTime;
          output.gain.cancelScheduledValues(now);
          output.gain.setValueAtTime(Math.max(output.gain.value, 0.0001), now);
          output.gain.linearRampToValueAtTime(0.0001, now + 0.02);

          for (const source of sources) {
            safeStop(source, now + 0.04);
          }

          globalThis.clearTimeout(cleanupTimer);
          globalThis.setTimeout(cleanup, 80);
        }
      };
    }
  };
};

const ANIMAL_PROFILE_BY_ID: Record<AnimalId, AnimalProfileId> = {
  goat: 'ruminant-bleat',
  bull: 'ruminant-bleat',
  goose: 'poultry-cluck',
  chicken: 'poultry-cluck',
  pig: 'pig-snort',
  cow: 'ruminant-bleat',
  mouse: 'cat-meow',
  owl: 'bird-call',
  'barn-cat': 'cat-meow',
  sheep: 'ruminant-bleat',
  swan: 'poultry-cluck',
  bunny: 'cat-meow',
  'border-collie': 'cat-meow',
  donkey: 'horse-whinny',
  chimera: 'ruminant-bleat',
  jackalope: 'horse-whinny',
  unicorn: 'ruminant-bleat',
  griffin: 'bird-call',
  dragon: 'bird-call'
};

const ANIMAL_PITCH_OFFSETS: Record<AnimalId, number> = {
  goat: -2,
  bull: -6,
  goose: 1,
  chicken: 3,
  pig: -4,
  cow: -7,
  mouse: 5,
  owl: -1,
  'barn-cat': 2,
  sheep: 0,
  swan: 4,
  bunny: 6,
  'border-collie': -1,
  donkey: -3,
  chimera: 1,
  jackalope: 3,
  unicorn: 5,
  griffin: 0,
  dragon: -5
};

const pitchWithOffset = (base: number, semitoneOffset: number): number => base * 2 ** (semitoneOffset / 12);

const scheduleAnimalEntry = (
  context: AudioContext,
  voiceOutput: AudioNode,
  startTime: number,
  animalId: AnimalId
): number => {
  const profile = ANIMAL_PROFILE_BY_ID[animalId];
  const offset = ANIMAL_PITCH_OFFSETS[animalId];
  const jitter = 1 + (Math.random() * 0.06 - 0.03);
  const pace = clamp(1 - offset * 0.01, 0.82, 1.18);

  const registerParts: ScheduledPart[] = [];

  if (profile === 'poultry-cluck') {
    const freqs = [960, 1120, 900];
    for (let i = 0; i < freqs.length; i += 1) {
      registerParts.push(
        scheduleTone(context, voiceOutput, {
          startTime: startTime + i * 0.055 * pace,
          durationSeconds: 0.05 * pace,
          frequency: pitchWithOffset(freqs[i] * jitter, offset),
          endFrequency: pitchWithOffset(freqs[i] * 0.9 * jitter, offset),
          gain: 0.11,
          shape: 'square',
          attackSeconds: 0.005,
          releaseSeconds: 0.028
        })
      );
    }

    return startTime + 0.27 * pace;
  }

  if (profile === 'ruminant-bleat') {
    const base = pitchWithOffset(270 * jitter, offset);
    registerParts.push(
      scheduleTone(context, voiceOutput, {
        startTime,
        durationSeconds: 0.15 * pace,
        frequency: base,
        endFrequency: base * 0.86,
        gain: 0.13,
        shape: 'sawtooth',
        attackSeconds: 0.008,
        releaseSeconds: 0.07
      })
    );

    registerParts.push(
      scheduleTone(context, voiceOutput, {
        startTime: startTime + 0.08 * pace,
        durationSeconds: 0.16 * pace,
        frequency: base * 1.07,
        endFrequency: base * 0.88,
        gain: 0.08,
        shape: 'triangle',
        attackSeconds: 0.01,
        releaseSeconds: 0.08
      })
    );

    for (const part of registerParts) {
      // placeholder loop to preserve style consistency
      // registered by caller
    }

    return startTime + 0.31 * pace;
  }

  if (profile === 'bird-call') {
    const base = pitchWithOffset(980 * jitter, offset);
    registerParts.push(
      scheduleTone(context, voiceOutput, {
        startTime,
        durationSeconds: 0.12 * pace,
        frequency: base,
        endFrequency: base * 0.62,
        gain: 0.1,
        shape: 'triangle',
        attackSeconds: 0.006,
        releaseSeconds: 0.04
      })
    );
    registerParts.push(
      scheduleTone(context, voiceOutput, {
        startTime: startTime + 0.085 * pace,
        durationSeconds: 0.09 * pace,
        frequency: base * 1.2,
        endFrequency: base * 0.8,
        gain: 0.06,
        shape: 'sine',
        attackSeconds: 0.005,
        releaseSeconds: 0.03
      })
    );

    return startTime + 0.24 * pace;
  }

  if (profile === 'pig-snort') {
    registerParts.push(
      scheduleNoise(context, voiceOutput, {
        startTime,
        durationSeconds: 0.12 * pace,
        gain: 0.12,
        filterType: 'bandpass',
        filterFrequency: 650
      })
    );
    registerParts.push(
      scheduleTone(context, voiceOutput, {
        startTime: startTime + 0.03 * pace,
        durationSeconds: 0.13 * pace,
        frequency: pitchWithOffset(210 * jitter, offset),
        endFrequency: pitchWithOffset(150 * jitter, offset),
        gain: 0.1,
        shape: 'sawtooth',
        attackSeconds: 0.008,
        releaseSeconds: 0.06
      })
    );

    return startTime + 0.24 * pace;
  }

  if (profile === 'horse-whinny') {
    const base = pitchWithOffset(360 * jitter, offset);
    registerParts.push(
      scheduleTone(context, voiceOutput, {
        startTime,
        durationSeconds: 0.11 * pace,
        frequency: base,
        endFrequency: base * 1.2,
        gain: 0.1,
        shape: 'triangle',
        attackSeconds: 0.007,
        releaseSeconds: 0.04
      })
    );
    registerParts.push(
      scheduleTone(context, voiceOutput, {
        startTime: startTime + 0.1 * pace,
        durationSeconds: 0.14 * pace,
        frequency: base * 1.18,
        endFrequency: base * 0.75,
        gain: 0.11,
        shape: 'square',
        attackSeconds: 0.006,
        releaseSeconds: 0.06
      })
    );

    return startTime + 0.29 * pace;
  }

  const meowBase = pitchWithOffset(520 * jitter, offset);
  registerParts.push(
    scheduleTone(context, voiceOutput, {
      startTime,
      durationSeconds: 0.11 * pace,
      frequency: meowBase,
      endFrequency: meowBase * 1.28,
      gain: 0.09,
      shape: 'sine',
      attackSeconds: 0.007,
      releaseSeconds: 0.04
    })
  );
  registerParts.push(
    scheduleTone(context, voiceOutput, {
      startTime: startTime + 0.085 * pace,
      durationSeconds: 0.12 * pace,
      frequency: meowBase * 1.24,
      endFrequency: meowBase * 0.9,
      gain: 0.08,
      shape: 'triangle',
      attackSeconds: 0.006,
      releaseSeconds: 0.05
    })
  );

  return startTime + 0.25 * pace;
};

const scheduleScoringJingle = (context: AudioContext, voiceOutput: AudioNode, startTime: number): number => {
  const notes = [659, 784, 988];

  notes.forEach((frequency, index) => {
    scheduleTone(context, voiceOutput, {
      startTime: startTime + index * 0.12,
      durationSeconds: 0.16,
      frequency,
      endFrequency: frequency * 1.02,
      gain: 0.1,
      shape: 'triangle',
      attackSeconds: 0.008,
      releaseSeconds: 0.06
    });
  });

  return startTime + 0.5;
};

const schedulePurchase = (context: AudioContext, voiceOutput: AudioNode, startTime: number): number => {
  scheduleTone(context, voiceOutput, {
    startTime,
    durationSeconds: 0.12,
    frequency: 1320,
    endFrequency: 980,
    gain: 0.14,
    shape: 'sine',
    attackSeconds: 0.006,
    releaseSeconds: 0.06
  });

  scheduleTone(context, voiceOutput, {
    startTime: startTime + 0.085,
    durationSeconds: 0.14,
    frequency: 1760,
    endFrequency: 1260,
    gain: 0.12,
    shape: 'sine',
    attackSeconds: 0.006,
    releaseSeconds: 0.07
  });

  scheduleNoise(context, voiceOutput, {
    startTime: startTime + 0.035,
    durationSeconds: 0.06,
    gain: 0.025,
    filterType: 'highpass',
    filterFrequency: 1400
  });

  return startTime + 0.32;
};

const scheduleActivateAbility = (context: AudioContext, voiceOutput: AudioNode, startTime: number): number => {
  scheduleTone(context, voiceOutput, {
    startTime,
    durationSeconds: 0.2,
    frequency: 720,
    endFrequency: 560,
    gain: 0.1,
    shape: 'triangle',
    attackSeconds: 0.008,
    releaseSeconds: 0.1
  });

  scheduleTone(context, voiceOutput, {
    startTime: startTime + 0.02,
    durationSeconds: 0.16,
    frequency: 1080,
    endFrequency: 820,
    gain: 0.05,
    shape: 'sine',
    attackSeconds: 0.005,
    releaseSeconds: 0.08
  });

  return startTime + 0.24;
};

const scheduleBust = (context: AudioContext, voiceOutput: AudioNode, startTime: number): number => {
  scheduleNoise(context, voiceOutput, {
    startTime,
    durationSeconds: 0.2,
    gain: 0.2,
    filterType: 'highpass',
    filterFrequency: 1600,
    attackSeconds: 0.005,
    releaseSeconds: 0.12
  });

  const crowStart = startTime + 0.35;

  scheduleTone(context, voiceOutput, {
    startTime: crowStart,
    durationSeconds: 0.4,
    frequency: 900,
    endFrequency: 190,
    gain: 0.16,
    shape: 'sawtooth',
    attackSeconds: 0.01,
    releaseSeconds: 0.15
  });

  scheduleTone(context, voiceOutput, {
    startTime: crowStart + 0.025,
    durationSeconds: 0.32,
    frequency: 1240,
    endFrequency: 280,
    gain: 0.07,
    shape: 'triangle',
    attackSeconds: 0.008,
    releaseSeconds: 0.12
  });

  return startTime + 0.82;
};

const scheduleWinFanfare = (context: AudioContext, voiceOutput: AudioNode, startTime: number): number => {
  const run = [523, 587, 659, 784, 880, 988];
  run.forEach((frequency, index) => {
    scheduleTone(context, voiceOutput, {
      startTime: startTime + index * 0.1,
      durationSeconds: 0.12,
      frequency,
      endFrequency: frequency * 1.01,
      gain: 0.11,
      shape: 'square',
      attackSeconds: 0.006,
      releaseSeconds: 0.05
    });

    scheduleTone(context, voiceOutput, {
      startTime: startTime + index * 0.1,
      durationSeconds: 0.14,
      frequency: frequency / 2,
      endFrequency: frequency / 2,
      gain: 0.07,
      shape: 'triangle',
      attackSeconds: 0.01,
      releaseSeconds: 0.07
    });
  });

  const chordStart = startTime + 0.75;
  [523, 659, 784].forEach((frequency) => {
    scheduleTone(context, voiceOutput, {
      startTime: chordStart,
      durationSeconds: 0.72,
      frequency,
      endFrequency: frequency,
      gain: 0.1,
      shape: 'square',
      attackSeconds: 0.02,
      releaseSeconds: 0.2
    });
  });

  const breakdownStart = startTime + 1.48;
  const breakdown = [392, 440, 523, 440, 392, 440, 523, 659];
  breakdown.forEach((frequency, index) => {
    scheduleTone(context, voiceOutput, {
      startTime: breakdownStart + index * 0.09,
      durationSeconds: 0.11,
      frequency,
      endFrequency: frequency * 0.98,
      gain: 0.11,
      shape: 'triangle',
      attackSeconds: 0.006,
      releaseSeconds: 0.06
    });
  });

  scheduleNoise(context, voiceOutput, {
    startTime: breakdownStart + 0.18,
    durationSeconds: 0.08,
    gain: 0.03,
    filterType: 'bandpass',
    filterFrequency: 1800
  });

  scheduleNoise(context, voiceOutput, {
    startTime: breakdownStart + 0.54,
    durationSeconds: 0.08,
    gain: 0.03,
    filterType: 'bandpass',
    filterFrequency: 1800
  });

  return startTime + 2.2;
};

const scheduleUiHover = (context: AudioContext, voiceOutput: AudioNode, startTime: number): number => {
  scheduleTone(context, voiceOutput, {
    startTime,
    durationSeconds: 0.03,
    frequency: 1820,
    endFrequency: 1680,
    gain: 0.045,
    shape: 'square',
    attackSeconds: 0.005,
    releaseSeconds: 0.02
  });

  return startTime + 0.06;
};

const scheduleUiSelect = (context: AudioContext, voiceOutput: AudioNode, startTime: number): number => {
  scheduleNoise(context, voiceOutput, {
    startTime,
    durationSeconds: 0.06,
    gain: 0.08,
    filterType: 'bandpass',
    filterFrequency: 920,
    attackSeconds: 0.005,
    releaseSeconds: 0.03
  });

  scheduleTone(context, voiceOutput, {
    startTime: startTime + 0.005,
    durationSeconds: 0.06,
    frequency: 640,
    endFrequency: 520,
    gain: 0.07,
    shape: 'square',
    attackSeconds: 0.005,
    releaseSeconds: 0.03
  });

  return startTime + 0.1;
};

export const scheduleSfx = (
  context: AudioContext,
  destination: AudioNode,
  sfxId: SfxId,
  options: ScheduleSfxOptions = {}
): ScheduledSfxVoice | null => {
  const delaySeconds = Math.max(0, options.delayMs ?? 0) / 1000;
  const startTime = context.currentTime + delaySeconds;

  const voice = createVoice(context, destination);
  let endTime = startTime + 0.05;

  const register = (part: ScheduledPart) => {
    voice.register(part);
  };

  if (sfxId === 'animal-entry') {
    const animalId = options.animalId;
    if (!animalId) {
      return null;
    }

    const profile = ANIMAL_PROFILE_BY_ID[animalId];

    if (profile === 'poultry-cluck') {
      const offset = ANIMAL_PITCH_OFFSETS[animalId];
      const jitter = 1 + (Math.random() * 0.06 - 0.03);
      const pace = clamp(1 - offset * 0.01, 0.82, 1.18);
      const freqs = [960, 1120, 900];
      for (let i = 0; i < freqs.length; i += 1) {
        register(
          scheduleTone(context, voice.output, {
            startTime: startTime + i * 0.055 * pace,
            durationSeconds: 0.05 * pace,
            frequency: pitchWithOffset(freqs[i] * jitter, offset),
            endFrequency: pitchWithOffset(freqs[i] * 0.9 * jitter, offset),
            gain: 0.11,
            shape: 'square',
            attackSeconds: 0.005,
            releaseSeconds: 0.028
          })
        );
      }
      endTime = startTime + 0.27 * pace;
    } else if (profile === 'ruminant-bleat') {
      const offset = ANIMAL_PITCH_OFFSETS[animalId];
      const jitter = 1 + (Math.random() * 0.06 - 0.03);
      const pace = clamp(1 - offset * 0.01, 0.82, 1.18);
      const base = pitchWithOffset(270 * jitter, offset);
      register(
        scheduleTone(context, voice.output, {
          startTime,
          durationSeconds: 0.15 * pace,
          frequency: base,
          endFrequency: base * 0.86,
          gain: 0.13,
          shape: 'sawtooth',
          attackSeconds: 0.008,
          releaseSeconds: 0.07
        })
      );
      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + 0.08 * pace,
          durationSeconds: 0.16 * pace,
          frequency: base * 1.07,
          endFrequency: base * 0.88,
          gain: 0.08,
          shape: 'triangle',
          attackSeconds: 0.01,
          releaseSeconds: 0.08
        })
      );
      endTime = startTime + 0.31 * pace;
    } else if (profile === 'bird-call') {
      const offset = ANIMAL_PITCH_OFFSETS[animalId];
      const jitter = 1 + (Math.random() * 0.06 - 0.03);
      const pace = clamp(1 - offset * 0.01, 0.82, 1.18);
      const base = pitchWithOffset(980 * jitter, offset);
      register(
        scheduleTone(context, voice.output, {
          startTime,
          durationSeconds: 0.12 * pace,
          frequency: base,
          endFrequency: base * 0.62,
          gain: 0.1,
          shape: 'triangle',
          attackSeconds: 0.006,
          releaseSeconds: 0.04
        })
      );
      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + 0.085 * pace,
          durationSeconds: 0.09 * pace,
          frequency: base * 1.2,
          endFrequency: base * 0.8,
          gain: 0.06,
          shape: 'sine',
          attackSeconds: 0.005,
          releaseSeconds: 0.03
        })
      );
      endTime = startTime + 0.24 * pace;
    } else if (profile === 'pig-snort') {
      const offset = ANIMAL_PITCH_OFFSETS[animalId];
      const jitter = 1 + (Math.random() * 0.06 - 0.03);
      const pace = clamp(1 - offset * 0.01, 0.82, 1.18);
      register(
        scheduleNoise(context, voice.output, {
          startTime,
          durationSeconds: 0.12 * pace,
          gain: 0.12,
          filterType: 'bandpass',
          filterFrequency: 650
        })
      );
      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + 0.03 * pace,
          durationSeconds: 0.13 * pace,
          frequency: pitchWithOffset(210 * jitter, offset),
          endFrequency: pitchWithOffset(150 * jitter, offset),
          gain: 0.1,
          shape: 'sawtooth',
          attackSeconds: 0.008,
          releaseSeconds: 0.06
        })
      );
      endTime = startTime + 0.24 * pace;
    } else if (profile === 'horse-whinny') {
      const offset = ANIMAL_PITCH_OFFSETS[animalId];
      const jitter = 1 + (Math.random() * 0.06 - 0.03);
      const pace = clamp(1 - offset * 0.01, 0.82, 1.18);
      const base = pitchWithOffset(360 * jitter, offset);
      register(
        scheduleTone(context, voice.output, {
          startTime,
          durationSeconds: 0.11 * pace,
          frequency: base,
          endFrequency: base * 1.2,
          gain: 0.1,
          shape: 'triangle',
          attackSeconds: 0.007,
          releaseSeconds: 0.04
        })
      );
      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + 0.1 * pace,
          durationSeconds: 0.14 * pace,
          frequency: base * 1.18,
          endFrequency: base * 0.75,
          gain: 0.11,
          shape: 'square',
          attackSeconds: 0.006,
          releaseSeconds: 0.06
        })
      );
      endTime = startTime + 0.29 * pace;
    } else {
      const offset = ANIMAL_PITCH_OFFSETS[animalId];
      const jitter = 1 + (Math.random() * 0.06 - 0.03);
      const pace = clamp(1 - offset * 0.01, 0.82, 1.18);
      const base = pitchWithOffset(520 * jitter, offset);
      register(
        scheduleTone(context, voice.output, {
          startTime,
          durationSeconds: 0.11 * pace,
          frequency: base,
          endFrequency: base * 1.28,
          gain: 0.09,
          shape: 'sine',
          attackSeconds: 0.007,
          releaseSeconds: 0.04
        })
      );
      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + 0.085 * pace,
          durationSeconds: 0.12 * pace,
          frequency: base * 1.24,
          endFrequency: base * 0.9,
          gain: 0.08,
          shape: 'triangle',
          attackSeconds: 0.006,
          releaseSeconds: 0.05
        })
      );
      endTime = startTime + 0.25 * pace;
    }

    return voice.finalize(endTime);
  }

  if (sfxId === 'bust') {
    register(
      scheduleNoise(context, voice.output, {
        startTime,
        durationSeconds: 0.2,
        gain: 0.2,
        filterType: 'highpass',
        filterFrequency: 1600,
        attackSeconds: 0.005,
        releaseSeconds: 0.12
      })
    );

    const crowStart = startTime + 0.35;
    register(
      scheduleTone(context, voice.output, {
        startTime: crowStart,
        durationSeconds: 0.4,
        frequency: 900,
        endFrequency: 190,
        gain: 0.16,
        shape: 'sawtooth',
        attackSeconds: 0.01,
        releaseSeconds: 0.15
      })
    );

    register(
      scheduleTone(context, voice.output, {
        startTime: crowStart + 0.025,
        durationSeconds: 0.32,
        frequency: 1240,
        endFrequency: 280,
        gain: 0.07,
        shape: 'triangle',
        attackSeconds: 0.008,
        releaseSeconds: 0.12
      })
    );

    endTime = startTime + 0.82;
    return voice.finalize(endTime);
  }

  if (sfxId === 'scoring-jingle') {
    const notes = [659, 784, 988];
    notes.forEach((frequency, index) => {
      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + index * 0.12,
          durationSeconds: 0.16,
          frequency,
          endFrequency: frequency * 1.02,
          gain: 0.1,
          shape: 'triangle',
          attackSeconds: 0.008,
          releaseSeconds: 0.06
        })
      );
    });

    endTime = startTime + 0.5;
    return voice.finalize(endTime);
  }

  if (sfxId === 'purchase') {
    register(
      scheduleTone(context, voice.output, {
        startTime,
        durationSeconds: 0.12,
        frequency: 1320,
        endFrequency: 980,
        gain: 0.14,
        shape: 'sine',
        attackSeconds: 0.006,
        releaseSeconds: 0.06
      })
    );

    register(
      scheduleTone(context, voice.output, {
        startTime: startTime + 0.085,
        durationSeconds: 0.14,
        frequency: 1760,
        endFrequency: 1260,
        gain: 0.12,
        shape: 'sine',
        attackSeconds: 0.006,
        releaseSeconds: 0.07
      })
    );

    register(
      scheduleNoise(context, voice.output, {
        startTime: startTime + 0.035,
        durationSeconds: 0.06,
        gain: 0.025,
        filterType: 'highpass',
        filterFrequency: 1400
      })
    );

    endTime = startTime + 0.32;
    return voice.finalize(endTime);
  }

  if (sfxId === 'activate-ability') {
    register(
      scheduleTone(context, voice.output, {
        startTime,
        durationSeconds: 0.2,
        frequency: 720,
        endFrequency: 560,
        gain: 0.1,
        shape: 'triangle',
        attackSeconds: 0.008,
        releaseSeconds: 0.1
      })
    );

    register(
      scheduleTone(context, voice.output, {
        startTime: startTime + 0.02,
        durationSeconds: 0.16,
        frequency: 1080,
        endFrequency: 820,
        gain: 0.05,
        shape: 'sine',
        attackSeconds: 0.005,
        releaseSeconds: 0.08
      })
    );

    endTime = startTime + 0.24;
    return voice.finalize(endTime);
  }

  if (sfxId === 'win-fanfare') {
    const run = [523, 587, 659, 784, 880, 988];
    run.forEach((frequency, index) => {
      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + index * 0.1,
          durationSeconds: 0.12,
          frequency,
          endFrequency: frequency * 1.01,
          gain: 0.11,
          shape: 'square',
          attackSeconds: 0.006,
          releaseSeconds: 0.05
        })
      );

      register(
        scheduleTone(context, voice.output, {
          startTime: startTime + index * 0.1,
          durationSeconds: 0.14,
          frequency: frequency / 2,
          endFrequency: frequency / 2,
          gain: 0.07,
          shape: 'triangle',
          attackSeconds: 0.01,
          releaseSeconds: 0.07
        })
      );
    });

    const chordStart = startTime + 0.75;
    [523, 659, 784].forEach((frequency) => {
      register(
        scheduleTone(context, voice.output, {
          startTime: chordStart,
          durationSeconds: 0.72,
          frequency,
          endFrequency: frequency,
          gain: 0.1,
          shape: 'square',
          attackSeconds: 0.02,
          releaseSeconds: 0.2
        })
      );
    });

    const breakdownStart = startTime + 1.48;
    const breakdown = [392, 440, 523, 440, 392, 440, 523, 659];
    breakdown.forEach((frequency, index) => {
      register(
        scheduleTone(context, voice.output, {
          startTime: breakdownStart + index * 0.09,
          durationSeconds: 0.11,
          frequency,
          endFrequency: frequency * 0.98,
          gain: 0.11,
          shape: 'triangle',
          attackSeconds: 0.006,
          releaseSeconds: 0.06
        })
      );
    });

    register(
      scheduleNoise(context, voice.output, {
        startTime: breakdownStart + 0.18,
        durationSeconds: 0.08,
        gain: 0.03,
        filterType: 'bandpass',
        filterFrequency: 1800
      })
    );

    register(
      scheduleNoise(context, voice.output, {
        startTime: breakdownStart + 0.54,
        durationSeconds: 0.08,
        gain: 0.03,
        filterType: 'bandpass',
        filterFrequency: 1800
      })
    );

    endTime = startTime + 2.2;
    return voice.finalize(endTime);
  }

  if (sfxId === 'ui-hover') {
    register(
      scheduleTone(context, voice.output, {
        startTime,
        durationSeconds: 0.03,
        frequency: 1820,
        endFrequency: 1680,
        gain: 0.045,
        shape: 'square',
        attackSeconds: 0.005,
        releaseSeconds: 0.02
      })
    );

    endTime = startTime + 0.06;
    return voice.finalize(endTime);
  }

  register(
    scheduleNoise(context, voice.output, {
      startTime,
      durationSeconds: 0.06,
      gain: 0.08,
      filterType: 'bandpass',
      filterFrequency: 920,
      attackSeconds: 0.005,
      releaseSeconds: 0.03
    })
  );

  register(
    scheduleTone(context, voice.output, {
      startTime: startTime + 0.005,
      durationSeconds: 0.06,
      frequency: 640,
      endFrequency: 520,
      gain: 0.07,
      shape: 'square',
      attackSeconds: 0.005,
      releaseSeconds: 0.03
    })
  );

  endTime = startTime + 0.1;
  return voice.finalize(endTime);
};

export const defaultAudioScheduler: AudioScheduler = {
  createMusicSource,
  scheduleSfx
};
