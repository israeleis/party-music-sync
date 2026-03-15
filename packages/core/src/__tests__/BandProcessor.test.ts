import { describe, it, expect } from 'vitest';
import { BandProcessor } from '../BandProcessor.js';

function makeData(value: number = 0): Uint8Array {
  const data = new Uint8Array(1024);
  data.fill(value);
  return data;
}

function makeDataWithBass(bassValue: number, otherValue: number = 0): Uint8Array {
  const data = new Uint8Array(1024);
  data.fill(otherValue);
  // Bass bins are 1-11
  for (let i = 1; i <= 11; i++) {
    data[i] = bassValue;
  }
  return data;
}

describe('BandProcessor', () => {
  it('returns zeros for silent input after >1000ms of silence', () => {
    const bp = new BandProcessor();
    const silentData = makeData(0);
    const t0 = 1000;

    // First frame: silence starts
    bp.process(silentData, t0);

    // After 1001ms of silence
    const result = bp.process(silentData, t0 + 1001);
    expect(result.bass).toBe(0);
    expect(result.mid).toBe(0);
    expect(result.treble).toBe(0);
    expect(result.rms).toBe(0);
    expect(result.beat).toBe(false);
  });

  it('returns normalized bass/mid/treble in 0-1 range for non-silent input', () => {
    const bp = new BandProcessor();
    const data = makeData(200);
    const result = bp.process(data, 1000);

    expect(result.bass).toBeGreaterThanOrEqual(0);
    expect(result.bass).toBeLessThanOrEqual(1);
    expect(result.mid).toBeGreaterThanOrEqual(0);
    expect(result.mid).toBeLessThanOrEqual(1);
    expect(result.treble).toBeGreaterThanOrEqual(0);
    expect(result.treble).toBeLessThanOrEqual(1);
    expect(result.rms).toBeGreaterThanOrEqual(0);
    expect(result.rms).toBeLessThanOrEqual(1);
  });

  it('beat detection triggers when bass energy spikes above threshold × rolling average', () => {
    const bp = new BandProcessor();
    const t0 = 1000;

    // Prime the beat history with low bass values
    const lowData = makeDataWithBass(10, 10);
    for (let i = 0; i < 30; i++) {
      bp.process(lowData, t0 + i * 10);
    }

    // Spike the bass to well above threshold * average
    const spikeData = makeDataWithBass(255, 10);
    const result = bp.process(spikeData, t0 + 300 + 10);
    expect(result.beat).toBe(true);
  });

  it('does not trigger beat when bass energy is near average', () => {
    const bp = new BandProcessor();
    const t0 = 1000;

    // All frames at similar level
    const steadyData = makeDataWithBass(100, 100);
    let lastResult = bp.process(steadyData, t0);
    for (let i = 1; i < 35; i++) {
      lastResult = bp.process(steadyData, t0 + i * 10);
    }

    // The last frame with same value should not beat (not above threshold * avg)
    expect(lastResult.beat).toBe(false);
  });

  it('beat threshold auto-tunes up when too many beats per second', () => {
    const bp = new BandProcessor();
    const initialThreshold = bp.currentBeatThreshold;
    const t0 = 1000;

    // Force many beats: alternate very high and low bass to generate beats
    // We need >4 beats/sec over 5 seconds = >20 beats in 5000ms
    for (let i = 0; i < 5000; i += 50) {
      const bassVal = i % 100 < 50 ? 255 : 1;
      bp.process(makeDataWithBass(bassVal, 10), t0 + i);
    }

    // Trigger auto-tune by processing at t0 + 5000
    bp.process(makeDataWithBass(200, 10), t0 + 5000);

    expect(bp.currentBeatThreshold).toBeGreaterThan(initialThreshold);
  });

  it('beat threshold auto-tunes down when too few beats per second', () => {
    const bp = new BandProcessor();
    const t0 = 1000;

    // Prime with a high threshold by first auto-tuning up
    // Then process 5 seconds of steady (non-beat) signal
    const steadyData = makeDataWithBass(100, 100);
    for (let i = 0; i < 5000; i += 100) {
      bp.process(steadyData, t0 + i);
    }
    // Trigger auto-tune: at this point we have <0.5 beats/sec → threshold should decrease
    const thresholdAfter5s = bp.currentBeatThreshold;
    bp.process(steadyData, t0 + 5001);

    // Another 5s of steady
    for (let i = 5100; i < 10000; i += 100) {
      bp.process(steadyData, t0 + i);
    }
    bp.process(steadyData, t0 + 10001);

    expect(bp.currentBeatThreshold).toBeLessThanOrEqual(thresholdAfter5s);
  });

  it('rolling max normalization adjusts normalized values as max increases', () => {
    const bp = new BandProcessor();
    const t0 = 1000;

    // Process a moderate signal first to set rolling max
    const moderateData = makeData(100);
    const result1 = bp.process(moderateData, t0);

    // Process a stronger signal - rolling max should grow, keeping normalized ≤1
    const strongData = makeData(255);
    const result2 = bp.process(strongData, t0 + 100);

    // Both should be in 0-1 range
    expect(result1.rms).toBeGreaterThanOrEqual(0);
    expect(result1.rms).toBeLessThanOrEqual(1);
    expect(result2.rms).toBeGreaterThanOrEqual(0);
    expect(result2.rms).toBeLessThanOrEqual(1);

    // After the strong signal sets a new max, a moderate signal should normalize lower
    const result3 = bp.process(moderateData, t0 + 200);
    expect(result3.rms).toBeLessThan(result2.rms);
  });

  it('frequencyData is passed through in the result', () => {
    const bp = new BandProcessor();
    const data = makeData(128);
    const result = bp.process(data, 1000);
    expect(result.frequencyData).toBe(data);
  });
});
