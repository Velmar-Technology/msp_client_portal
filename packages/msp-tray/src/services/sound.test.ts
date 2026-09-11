import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playNotificationChime } from './sound';

class MockAudioParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class MockOscillator {
  type = 'sine';
  frequency = new MockAudioParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = new MockAudioParam();
  connect = vi.fn();
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];
  currentTime = 0;
  destination: Record<string, unknown> = {};
  createOscillator = vi.fn(() => new MockOscillator());
  createGain = vi.fn(() => new MockGain());

  constructor() {
    MockAudioContext.instances.push(this);
  }
}

class ThrowingAudioContext {
  constructor() {
    throw new Error('audio hardware unavailable');
  }
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).AudioContext;
  delete (window as unknown as Record<string, unknown>).webkitAudioContext;
  MockAudioContext.instances = [];
});

describe('playNotificationChime', () => {
  beforeEach(() => {
    MockAudioContext.instances = [];
  });

  it('plays a two-tone chime through the Web Audio API', () => {
    Object.defineProperty(window, 'AudioContext', {
      value: MockAudioContext,
      configurable: true,
      writable: true,
    });

    playNotificationChime();

    const ctx = MockAudioContext.instances.at(-1)!;
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    expect(ctx.createGain).toHaveBeenCalledTimes(2);

    const firstOscillator = ctx.createOscillator.mock.results[0].value;
    expect(firstOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(587.33, 0);
    expect(firstOscillator.start).toHaveBeenCalled();
    expect(firstOscillator.stop).toHaveBeenCalled();
  });

  it('falls back to the webkit prefixed context when available', () => {
    Object.defineProperty(window, 'webkitAudioContext', {
      value: MockAudioContext,
      configurable: true,
      writable: true,
    });

    playNotificationChime();

    const ctx = MockAudioContext.instances.at(-1)!;
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('silently omits playback when no audio context is available', () => {
    expect(() => playNotificationChime()).not.toThrow();
    expect(MockAudioContext.instances).toHaveLength(0);
  });

  it('swallows runtime errors from the audio graph', () => {
    Object.defineProperty(window, 'AudioContext', {
      value: ThrowingAudioContext,
      configurable: true,
      writable: true,
    });

    expect(() => playNotificationChime()).not.toThrow();
  });
});