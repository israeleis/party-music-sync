import { renderHook } from '@testing-library/react-native';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: { getStatusAsync: jest.fn().mockResolvedValue({ isRecording: true, metering: -30 }), stopAndUnloadAsync: jest.fn() },
      }),
    },
    RecordingOptionsPresets: { LOW_QUALITY: {} },
  },
}));

jest.mock('@partylight/core', () => ({
  ColorEngine: jest.fn().mockImplementation(() => ({
    update: jest.fn().mockReturnValue({ r: 100, g: 100, b: 100, beat: false, intensity: 0.5, timestamp: 1000 }),
  })),
  BandProcessor: jest.fn().mockImplementation(() => ({
    process: jest.fn().mockReturnValue({ bass: 0.5, mid: 0.5, treble: 0.5, rms: 0.5, beat: false, frequencyData: new Uint8Array(1024) }),
  })),
}));

test('isActive starts false', () => {
  const { result } = renderHook(() => useAudioAnalyzer());
  expect(result.current.isActive).toBe(false);
});

test('colorState starts null', () => {
  const { result } = renderHook(() => useAudioAnalyzer());
  expect(result.current.colorState).toBeNull();
});

test('error starts null', () => {
  const { result } = renderHook(() => useAudioAnalyzer());
  expect(result.current.error).toBeNull();
});
