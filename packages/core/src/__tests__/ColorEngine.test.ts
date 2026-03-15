import { describe, it, expect } from 'vitest';
import { ColorEngine } from '../ColorEngine.js';
import type { BandResult } from '../BandProcessor.js';

function makeBands(overrides: Partial<BandResult> = {}): BandResult {
  return {
    bass: 0,
    mid: 0,
    treble: 0,
    rms: 0,
    beat: false,
    frequencyData: new Uint8Array(1024),
    ...overrides,
  };
}

describe('ColorEngine', () => {
  it('maps bass→r, mid→g, treble→b (0-255 range)', () => {
    const engine = new ColorEngine();
    // After many frames at full values, colors should approach 255
    const bands = makeBands({ bass: 1, mid: 1, treble: 1, rms: 1 });
    let state = engine.update(bands, 1000);
    for (let i = 0; i < 100; i++) {
      state = engine.update(bands, 1000 + i * 16);
    }
    // After many lerp steps at full target, should be very close to 255
    expect(state.r).toBeGreaterThan(250);
    expect(state.g).toBeGreaterThan(250);
    expect(state.b).toBeGreaterThan(250);
    expect(state.r).toBeLessThanOrEqual(255);
    expect(state.g).toBeLessThanOrEqual(255);
    expect(state.b).toBeLessThanOrEqual(255);
  });

  it('lerps smoothly: first frame moves partially toward target from 0', () => {
    const engine = new ColorEngine();
    const bands = makeBands({ bass: 1, mid: 0.5, treble: 0, rms: 0.5 });
    const state = engine.update(bands, 1000);

    // r should be between 0 and 255, moving toward target
    expect(state.r).toBeGreaterThan(0);
    expect(state.r).toBeLessThan(255);
    // g should be between 0 and 128, proportionally less than r
    expect(state.g).toBeGreaterThan(0);
    expect(state.g).toBeLessThan(state.r);
    // b stays at 0 (target is 0)
    expect(state.b).toBe(0);
  });

  it('beat triggers 2-frame flash boosting all channels toward 255', () => {
    const engine = new ColorEngine();
    // First set some base color
    const baseState = engine.update(makeBands({ bass: 0.5, mid: 0.5, treble: 0.5 }), 1000);

    // Now trigger a beat
    const beatBands = makeBands({ bass: 0.5, mid: 0.5, treble: 0.5, beat: true });
    const beatState = engine.update(beatBands, 1016);

    // With beatFlashRemaining=2, t=2/2=1.0, flash = lerp(current, 255, 1.0) = 255
    expect(beatState.r).toBe(255);
    expect(beatState.g).toBe(255);
    expect(beatState.b).toBe(255);
    expect(beatState.beat).toBe(true);
  });

  it('after 2 frames, flash is gone and values return toward lerped color', () => {
    const engine = new ColorEngine();
    // Set base color
    engine.update(makeBands({ bass: 0.5, mid: 0.5, treble: 0.5 }), 1000);

    // Trigger beat (frame 1 of flash: beatFlashRemaining goes 2→1, t=2/2=1)
    engine.update(makeBands({ bass: 0.5, mid: 0.5, treble: 0.5, beat: true }), 1016);

    // Frame 2 of flash: beatFlashRemaining=1→0, t=1/2=0.5, some flash
    const frame2 = engine.update(makeBands({ bass: 0.5, mid: 0.5, treble: 0.5 }), 1032);
    expect(frame2.r).toBeGreaterThan(100);
    expect(frame2.r).toBeLessThan(255);

    // Frame 3: flash is gone (beatFlashRemaining=0), back to lerped values
    const frame3 = engine.update(makeBands({ bass: 0.5, mid: 0.5, treble: 0.5 }), 1048);
    expect(frame3.r).toBeLessThan(frame2.r);
    expect(frame3.beat).toBe(false);
  });

  it('returns correct ColorState shape including timestamp and beat', () => {
    const engine = new ColorEngine();
    const state = engine.update(makeBands({ bass: 0.5, rms: 0.7, beat: true }), 99999);

    expect(state).toHaveProperty('r');
    expect(state).toHaveProperty('g');
    expect(state).toHaveProperty('b');
    expect(state).toHaveProperty('beat');
    expect(state).toHaveProperty('intensity');
    expect(state).toHaveProperty('timestamp');
    expect(state.timestamp).toBe(99999);
    expect(state.beat).toBe(true);
    expect(state.intensity).toBe(0.7);
  });

  it('silence (all-zero input) produces zeros', () => {
    const engine = new ColorEngine();
    const state = engine.update(makeBands(), 1000);

    expect(state.r).toBe(0);
    expect(state.g).toBe(0);
    expect(state.b).toBe(0);
    expect(state.beat).toBe(false);
    expect(state.intensity).toBe(0);
  });

  it('reset() clears state back to zero', () => {
    const engine = new ColorEngine();
    // Build up some color
    for (let i = 0; i < 10; i++) {
      engine.update(makeBands({ bass: 1, mid: 1, treble: 1, rms: 1 }), 1000 + i * 16);
    }
    engine.reset();
    // After reset, next frame starts from 0 again
    const state = engine.update(makeBands({ bass: 1, mid: 1, treble: 1 }), 2000);
    // After reset, lastTimestamp is 0 so dt defaults to 16ms — value is between 0 and 255
    expect(state.r).toBeGreaterThan(0);
    expect(state.r).toBeLessThan(255);
  });
});
