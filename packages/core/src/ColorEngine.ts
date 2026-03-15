import type { ColorState } from './types.js';
import type { BandResult } from './BandProcessor.js';

// Time constant in ms: lower = faster response. 50ms ≈ 0.15 factor at 60fps.
const LERP_TAU_MS = 50;
const BEAT_FLASH_FRAMES = 2;

export class ColorEngine {
  private r = 0;
  private g = 0;
  private b = 0;
  private intensity = 0;
  private beatFlashRemaining = 0;
  private lastTimestamp = 0;

  update(bands: BandResult, timestamp: number): ColorState {
    const dt = this.lastTimestamp === 0 ? 16 : Math.min(100, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    // Time-delta lerp: frame-rate independent
    const alpha = 1 - Math.exp(-dt / LERP_TAU_MS);

    const targetR = bands.bass * 255;
    const targetG = bands.mid * 255;
    const targetB = bands.treble * 255;

    this.r += (targetR - this.r) * alpha;
    this.g += (targetG - this.g) * alpha;
    this.b += (targetB - this.b) * alpha;
    this.intensity = bands.rms;

    if (bands.beat) this.beatFlashRemaining = BEAT_FLASH_FRAMES;

    let r = this.r;
    let g = this.g;
    let b = this.b;

    if (this.beatFlashRemaining > 0) {
      const t = this.beatFlashRemaining / BEAT_FLASH_FRAMES;
      r += (255 - r) * t;
      g += (255 - g) * t;
      b += (255 - b) * t;
      this.beatFlashRemaining--;
    }

    return {
      r: Math.round(Math.max(0, Math.min(255, r))),
      g: Math.round(Math.max(0, Math.min(255, g))),
      b: Math.round(Math.max(0, Math.min(255, b))),
      beat: bands.beat,
      intensity: this.intensity,
      timestamp,
    };
  }

  reset(): void {
    this.r = 0; this.g = 0; this.b = 0;
    this.intensity = 0; this.beatFlashRemaining = 0; this.lastTimestamp = 0;
  }
}
