import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../engine';
import type { AudioScheduler } from '../types';

class FakeAudioParam {
  value = 1;
  defaultValue = 1;
  minValue = 0;
  maxValue = 1;
  automationRate: AutomationRate = 'a-rate';

  setValueAtTime(value: number): this {
    this.value = value;
    return this;
  }

  linearRampToValueAtTime(value: number): this {
    this.value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number): this {
    this.value = value;
    return this;
  }

  setTargetAtTime(target: number): this {
    this.value = target;
    return this;
  }

  setValueCurveAtTime(): this {
    return this;
  }

  cancelScheduledValues(): this {
    return this;
  }

  cancelAndHoldAtTime(): this {
    return this;
  }
}

class FakeAudioNode {
  context = {} as BaseAudioContext;
  numberOfInputs = 1;
  numberOfOutputs = 1;
  channelCount = 2;
  channelCountMode: ChannelCountMode = 'max';
  channelInterpretation: ChannelInterpretation = 'speakers';

  connect(): AudioNode {
    return this;
  }

  disconnect(): void {}

  addEventListener(): void {}

  removeEventListener(): void {}

  dispatchEvent(): boolean {
    return true;
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeBufferSourceNode extends FakeAudioNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate = new FakeAudioParam();
  detune = new FakeAudioParam();

  start(): void {}

  stop(): void {}
}

class FakeAudioContext {
  baseLatency = 0;
  outputLatency = 0;
  sampleRate = 48000;
  currentTime = 0;
  state: AudioContextState = 'suspended';

  destination = new FakeAudioNode() as unknown as AudioDestinationNode;
  listener = {} as AudioListener;
  onstatechange: ((this: BaseAudioContext, ev: Event) => any) | null = null;

  audioWorklet = {} as AudioWorklet;

  createAnalyser(): AnalyserNode {
    throw new Error('not implemented');
  }

  createBiquadFilter(): BiquadFilterNode {
    throw new Error('not implemented');
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    return {
      sampleRate,
      length,
      duration: length / sampleRate,
      numberOfChannels,
      copyFromChannel: () => {},
      copyToChannel: () => {},
      getChannelData: () => new Float32Array(length)
    } as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return new FakeBufferSourceNode() as unknown as AudioBufferSourceNode;
  }

  createChannelMerger(): ChannelMergerNode {
    throw new Error('not implemented');
  }

  createChannelSplitter(): ChannelSplitterNode {
    throw new Error('not implemented');
  }

  createConstantSource(): ConstantSourceNode {
    throw new Error('not implemented');
  }

  createConvolver(): ConvolverNode {
    throw new Error('not implemented');
  }

  createDelay(): DelayNode {
    throw new Error('not implemented');
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    throw new Error('not implemented');
  }

  createGain(): GainNode {
    return new FakeGainNode() as GainNode;
  }

  createIIRFilter(): IIRFilterNode {
    throw new Error('not implemented');
  }

  createMediaElementSource(): MediaElementAudioSourceNode {
    throw new Error('not implemented');
  }

  createMediaStreamDestination(): MediaStreamAudioDestinationNode {
    throw new Error('not implemented');
  }

  createMediaStreamSource(): MediaStreamAudioSourceNode {
    throw new Error('not implemented');
  }

  createOscillator(): OscillatorNode {
    throw new Error('not implemented');
  }

  createPanner(): PannerNode {
    throw new Error('not implemented');
  }

  createPeriodicWave(): PeriodicWave {
    throw new Error('not implemented');
  }

  createScriptProcessor(): ScriptProcessorNode {
    throw new Error('not implemented');
  }

  createStereoPanner(): StereoPannerNode {
    throw new Error('not implemented');
  }

  createWaveShaper(): WaveShaperNode {
    throw new Error('not implemented');
  }

  decodeAudioData(): Promise<AudioBuffer> {
    throw new Error('not implemented');
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }

  getOutputTimestamp(): AudioTimestamp {
    return { contextTime: this.currentTime, performanceTime: 0 };
  }

  addEventListener(): void {}

  removeEventListener(): void {}

  dispatchEvent(): boolean {
    return true;
  }
}

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const makeScheduler = (calls: { scheduleCount: number; stopped: number[] }): AudioScheduler => {
  let nextVoiceId = 0;

  return {
    createMusicSource: () => new FakeBufferSourceNode() as unknown as AudioBufferSourceNode,
    scheduleSfx: () => {
      calls.scheduleCount += 1;
      const voiceId = nextVoiceId;
      nextVoiceId += 1;
      return {
        endTime: 1000,
        stop: () => {
          calls.stopped.push(voiceId);
        }
      };
    }
  };
};

describe('AudioEngine', () => {
  it('persists volume and mute settings across instances', () => {
    const storage = new MemoryStorage();
    const calls = { scheduleCount: 0, stopped: [] as number[] };

    const first = new AudioEngine({
      createContext: () => new FakeAudioContext() as unknown as AudioContext,
      scheduler: makeScheduler(calls),
      storage,
      document
    });

    first.setMusicVolume(0.31);
    first.setSfxVolume(0.82);
    first.setMuted(true);

    const second = new AudioEngine({
      createContext: () => new FakeAudioContext() as unknown as AudioContext,
      scheduler: makeScheduler(calls),
      storage,
      document
    });

    const snapshot = second.getSnapshot();
    expect(snapshot.musicVolume).toBeCloseTo(0.31, 4);
    expect(snapshot.sfxVolume).toBeCloseTo(0.82, 4);
    expect(snapshot.muted).toBe(true);

    first.destroy();
    second.destroy();
  });

  it('toggles mute state without throwing', async () => {
    const calls = { scheduleCount: 0, stopped: [] as number[] };
    const engine = new AudioEngine({
      createContext: () => new FakeAudioContext() as unknown as AudioContext,
      scheduler: makeScheduler(calls),
      storage: new MemoryStorage(),
      document
    });

    await engine.unlock();

    engine.setMuted(true);
    expect(engine.getSnapshot().muted).toBe(true);

    engine.setMuted(false);
    expect(engine.getSnapshot().muted).toBe(false);

    engine.destroy();
  });

  it('drops playback calls before unlock and allows them after unlock', async () => {
    const calls = { scheduleCount: 0, stopped: [] as number[] };
    const engine = new AudioEngine({
      createContext: () => new FakeAudioContext() as unknown as AudioContext,
      scheduler: makeScheduler(calls),
      storage: new MemoryStorage(),
      document
    });

    expect(() => engine.playSfx('ui-hover')).not.toThrow();
    expect(calls.scheduleCount).toBe(0);

    await engine.unlock();
    engine.playSfx('ui-hover');
    expect(calls.scheduleCount).toBe(1);

    engine.destroy();
  });

  it('enforces polyphony cap by stopping the oldest voice', async () => {
    const calls = { scheduleCount: 0, stopped: [] as number[] };
    const engine = new AudioEngine({
      createContext: () => new FakeAudioContext() as unknown as AudioContext,
      scheduler: makeScheduler(calls),
      storage: new MemoryStorage(),
      document
    });

    await engine.unlock();

    for (let i = 0; i < 9; i += 1) {
      engine.playSfx('ui-hover');
    }

    expect(calls.scheduleCount).toBe(9);
    expect(calls.stopped).toEqual([0]);

    engine.destroy();
  });
});
