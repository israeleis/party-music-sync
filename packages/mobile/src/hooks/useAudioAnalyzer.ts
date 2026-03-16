import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import { ColorEngine } from '@partylight/core';
import type { ColorState } from '@partylight/core';

export type AudioSource = 'mic' | 'speaker';

export type UseAudioAnalyzerResult = {
  colorState: ColorState | null;
  isActive: boolean;
  audioSource: AudioSource;
  start: (source?: AudioSource) => Promise<void>;
  stop: () => void;
  error: string | null;
};

// Convert dBFS (-160 to 0) to 0-1 linear
function dbToLinear(db: number): number {
  if (db <= -60) return 0;
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

// Derive approximate band values from a single level value
function deriveApproximateBands(level: number, phase: number) {
  const bass = Math.min(1, level * (1 + 0.3 * Math.sin(phase)));
  const mid = Math.min(1, level * (1 + 0.2 * Math.sin(phase * 1.7 + 1)));
  const treble = Math.min(1, level * (1 + 0.15 * Math.sin(phase * 2.3 + 2)));
  return { bass, mid, treble };
}

const POLL_INTERVAL_MS = 33; // ~30fps
const EMPTY_FREQUENCY_DATA = new Uint8Array(1024);

const RECORDING_OPTIONS = {
  ...RecordingPresets.LOW_QUALITY,
  isMeteringEnabled: true,
};

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  const [colorState, setColorState] = useState<ColorState | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<AudioSource>('mic');

  const colorEngine = useRef(new ColorEngine());
  const phaseRef = useRef(0);
  const lastLevelRef = useRef(0);
  const beatCooldownRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(RECORDING_OPTIONS);

  // Poll recorder.getStatus() directly at 30fps — avoids relying on
  // useAudioRecorderState's change detection (which skips when metering is constant)
  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(() => {
      const status = recorder.getStatus();

      if (!status.isRecording) return;

      const raw = status.metering ?? -60;
      // expo-audio metering: if value is in 0-1 range use directly,
      // otherwise treat as dBFS (-160..0)
      const level = raw > 0 ? Math.min(1, raw) : dbToLinear(raw);

      phaseRef.current += 0.1;
      const prevLevel = lastLevelRef.current;
      const now = Date.now();
      const beat = level > prevLevel * 1.5 && level > 0.2 && now > beatCooldownRef.current;
      if (beat) beatCooldownRef.current = now + 200;
      lastLevelRef.current = level;

      const { bass, mid, treble } = deriveApproximateBands(level, phaseRef.current);
      const bands = {
        bass, mid, treble,
        rms: level,
        beat,
        frequencyData: EMPTY_FREQUENCY_DATA,
      };
      const state = colorEngine.current.update(bands, now);
      setColorState(state);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, recorder]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    recorder.stop().catch(() => {});
    setIsActive(false);
  }, [recorder]);

  const start = useCallback(async (source: AudioSource = 'mic') => {
    // Reset active so the interval useEffect cleans up and re-runs on true→false→true
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (recorder.isRecording) {
      await recorder.stop().catch(() => {});
    }
    setError(null);
    setAudioSource(source);
    // Note: 'speaker' (system audio capture) is not supported on mobile.
    // Both modes use the microphone — speaker audio in the room will be picked up.
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission denied. Please enable it in Settings.');
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start audio');
    }
  }, [recorder]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    recorder.stop().catch(() => {});
  }, [recorder]);

  return { colorState, isActive, audioSource, start, stop, error };
}
