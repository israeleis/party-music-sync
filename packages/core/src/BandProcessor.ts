const SAMPLE_RATE = 44100;
const FFT_SIZE = 2048;
const HZ_PER_BIN = SAMPLE_RATE / FFT_SIZE; // ~21.53

const BASS_START = Math.max(1, Math.floor(20 / HZ_PER_BIN));    // bin 1
const BASS_END = Math.floor(250 / HZ_PER_BIN);                  // bin 11
const MID_START = BASS_END;
const MID_END = Math.floor(4000 / HZ_PER_BIN);                  // bin 185
const TREBLE_START = MID_END;
const TREBLE_END = Math.min(929, Math.floor(20000 / HZ_PER_BIN)); // bin 929

const ROLLING_MAX_FRAMES = 300;
const BEAT_HISTORY_FRAMES = 30;
const ROLLING_MAX_FLOOR = 0.01;
const SILENCE_RMS_THRESHOLD = 0.001;
const SILENCE_DURATION_MS = 1000;
const BEAT_AUTO_TUNE_INTERVAL_MS = 5000;

function bandAverage(data: Uint8Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i];
  return sum / (end - start) / 255;
}

function rollingMax(window: number[], value: number, maxSize: number): number {
  window.push(value);
  if (window.length > maxSize) window.shift();
  return Math.max(ROLLING_MAX_FLOOR, ...window);
}

export type BandResult = {
  bass: number;
  mid: number;
  treble: number;
  rms: number;
  beat: boolean;
  frequencyData: Uint8Array;
};

export class BandProcessor {
  private bassWindow: number[] = [];
  private midWindow: number[] = [];
  private trebleWindow: number[] = [];
  private rmsWindow: number[] = [];
  private beatHistory: number[] = [];
  private beatThreshold = 1.4;
  private beatCountInWindow = 0;
  private lastAutoTuneTime = 0;
  private silenceStartTime: number | null = null;

  process(frequencyData: Uint8Array, now: number = Date.now()): BandResult {
    const rawBass = bandAverage(frequencyData, BASS_START, BASS_END);
    const rawMid = bandAverage(frequencyData, MID_START, MID_END);
    const rawTreble = bandAverage(frequencyData, TREBLE_START, TREBLE_END);

    // RMS from raw bin values
    let sumSq = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const v = frequencyData[i] / 255;
      sumSq += v * v;
    }
    const rawRms = Math.sqrt(sumSq / frequencyData.length);

    // Silence detection
    if (rawRms < SILENCE_RMS_THRESHOLD) {
      if (this.silenceStartTime === null) this.silenceStartTime = now;
    } else {
      this.silenceStartTime = null;
    }
    const isSilent =
      this.silenceStartTime !== null && now - this.silenceStartTime > SILENCE_DURATION_MS;

    if (isSilent) {
      return { bass: 0, mid: 0, treble: 0, rms: 0, beat: false, frequencyData };
    }

    // Normalize using rolling max
    const bassMax = rollingMax(this.bassWindow, rawBass, ROLLING_MAX_FRAMES);
    const midMax = rollingMax(this.midWindow, rawMid, ROLLING_MAX_FRAMES);
    const trebleMax = rollingMax(this.trebleWindow, rawTreble, ROLLING_MAX_FRAMES);
    const rmsMax = rollingMax(this.rmsWindow, rawRms, ROLLING_MAX_FRAMES);

    const bass = Math.min(1, rawBass / bassMax);
    const mid = Math.min(1, rawMid / midMax);
    const treble = Math.min(1, rawTreble / trebleMax);
    const rms = Math.min(1, rawRms / rmsMax);

    // Beat detection on raw bass energy
    this.beatHistory.push(rawBass);
    if (this.beatHistory.length > BEAT_HISTORY_FRAMES) this.beatHistory.shift();
    const avgBass =
      this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const beat = rawBass > this.beatThreshold * avgBass;

    if (beat) this.beatCountInWindow++;

    // Auto-tune beat threshold every 5 seconds
    if (this.lastAutoTuneTime === 0) this.lastAutoTuneTime = now;
    if (now - this.lastAutoTuneTime >= BEAT_AUTO_TUNE_INTERVAL_MS) {
      const beatsPerSec = this.beatCountInWindow / 5;
      if (beatsPerSec > 4) this.beatThreshold = Math.min(2.0, this.beatThreshold + 0.05);
      else if (beatsPerSec < 0.5) this.beatThreshold = Math.max(1.2, this.beatThreshold - 0.05);
      this.beatCountInWindow = 0;
      this.lastAutoTuneTime = now;
    }

    return { bass, mid, treble, rms, beat, frequencyData };
  }

  /** Expose for testing */
  get currentBeatThreshold(): number { return this.beatThreshold; }
}
