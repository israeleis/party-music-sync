import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { ColorEngine } from '@partylight/core';
import type { ColorState } from '@partylight/core';

export type UseAudioAnalyzerResult = {
  colorState: ColorState | null;
  isActive: boolean;
  start: () => Promise<void>;
  stop: () => void;
  error: string | null;
};

// Convert dBFS (-160 to 0) to 0-1 linear
function dbToLinear(db: number): number {
  if (db <= -60) return 0;
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

// Derive approximate band values from a single level value
// Bass is dominant for loud low-pitched sounds; use some variation
function deriveApproximateBands(level: number, phase: number) {
  // Add slight variation per band using a slowly changing phase
  const bass = Math.min(1, level * (1 + 0.3 * Math.sin(phase)));
  const mid = Math.min(1, level * (1 + 0.2 * Math.sin(phase * 1.7 + 1)));
  const treble = Math.min(1, level * (1 + 0.15 * Math.sin(phase * 2.3 + 2)));
  return { bass, mid, treble };
}

const POLL_INTERVAL_MS = 33; // ~30fps

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  const [colorState, setColorState] = useState<ColorState | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const colorEngine = useRef(new ColorEngine());
  const phaseRef = useRef(0);
  const lastLevelRef = useRef(0);
  const beatCooldownRef = useRef(0);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(null);
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY,
        undefined,
        POLL_INTERVAL_MS,
      );
      recordingRef.current = recording;

      intervalRef.current = setInterval(() => {
        const status = recording.getStatusAsync();
        status.then((s) => {
          if (!s.isRecording) return;
          const db = s.metering ?? -60;
          const level = dbToLinear(db);
          phaseRef.current += 0.1;

          // Simple beat detection: level spike
          const prevLevel = lastLevelRef.current;
          const now = Date.now();
          const beat = level > prevLevel * 1.5 && level > 0.2 && now > beatCooldownRef.current;
          if (beat) beatCooldownRef.current = now + 200; // 200ms cooldown
          lastLevelRef.current = level;

          const { bass, mid, treble } = deriveApproximateBands(level, phaseRef.current);
          const bands = {
            bass, mid, treble,
            rms: level,
            beat,
            frequencyData: new Uint8Array(1024),
          };
          const state = colorEngine.current.update(bands, now);
          setColorState(state);
        });
      }, POLL_INTERVAL_MS);

      setIsActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start audio');
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { colorState, isActive, start, stop, error };
}
