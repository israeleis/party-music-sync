import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useThemePersistence } from '../hooks/useThemePersistence';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

test('returns default theme', () => {
  const { result } = renderHook(() => useThemePersistence('solid-wash'));
  expect(result.current[0]).toBe('solid-wash');
});

test('setTheme updates state and calls AsyncStorage.setItem', () => {
  const { result } = renderHook(() => useThemePersistence('solid-wash'));
  act(() => result.current[1]('waveform'));
  expect(result.current[0]).toBe('waveform');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('partylight_theme', 'waveform');
});

test('loads saved theme from AsyncStorage on mount', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('particles');
  const { result } = renderHook(() => useThemePersistence('solid-wash'));
  await waitFor(() => expect(result.current[0]).toBe('particles'));
});
