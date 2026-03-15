import { renderHook, act } from '@testing-library/react';
import { useThemePersistence } from '../hooks/useThemePersistence';

test('returns default theme initially', () => {
  const { result } = renderHook(() => useThemePersistence('solid-wash'));
  expect(result.current[0]).toBe('solid-wash');
});

test('setTheme updates the state', () => {
  const { result } = renderHook(() => useThemePersistence('solid-wash'));
  act(() => result.current[1]('waveform'));
  expect(result.current[0]).toBe('waveform');
});

test('persists to localStorage', () => {
  const { result } = renderHook(() => useThemePersistence('solid-wash'));
  act(() => result.current[1]('geometric'));
  expect(localStorage.getItem('partylight_theme')).toBe('geometric');
});

test('reads from localStorage on init', () => {
  localStorage.setItem('partylight_theme', 'particles');
  const { result } = renderHook(() => useThemePersistence('solid-wash'));
  expect(result.current[0]).toBe('particles');
  localStorage.clear();
});
