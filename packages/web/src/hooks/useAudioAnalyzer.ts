import { useEffect, useRef, useState, useCallback } from 'react';
import { BandProcessor, ColorEngine } from '@partylight/core';
import type { ColorState } from '@partylight/core';

export type AudioSource = 'mic' | 'speaker';

export type UseAudioAnalyzerResult = {
  colorState: ColorState | null;
  frequencyData: Uint8Array | null;
  isActive: boolean;
  start: (source?: AudioSource) => Promise<void>;
  stop: () => void;
  error: string | null;
};

const FFT_SIZE = 2048;

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  const [colorState, setColorState] = useState<ColorState | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bandProcessor = useRef(new BandProcessor());
  const colorEngine = useRef(new ColorEngine());

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    sourceRef.current?.disconnect();
    contextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    sourceRef.current = null;
    contextRef.current = null;
    streamRef.current = null;
    analyzerRef.current = null;
    setIsActive(false);
  }, []);

  const start = useCallback(async (source: AudioSource = 'mic') => {
    stop();
    setError(null);
    try {
      let stream: MediaStream;
      if (source === 'speaker' && navigator.mediaDevices.getDisplayMedia) {
        // video: true is required by spec; we stop the video track immediately after
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
        displayStream.getVideoTracks().forEach((t) => t.stop());
        stream = displayStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      // AudioContext may start suspended (iOS Safari); resume ensures it's running
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      contextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyzerRef.current = analyser;

      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      src.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount); // 1024 bins

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const bands = bandProcessor.current.process(data, Date.now());
        const state = colorEngine.current.update(bands, Date.now());
        setColorState(state);
        setFrequencyData(new Uint8Array(data)); // copy so React sees new ref
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setIsActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start audio');
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { colorState, frequencyData, isActive, start, stop, error };
}
