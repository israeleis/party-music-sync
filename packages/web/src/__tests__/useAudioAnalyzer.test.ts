import { renderHook } from '@testing-library/react';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';

test('isActive starts false', () => {
  const { result } = renderHook(() => useAudioAnalyzer());
  expect(result.current.isActive).toBe(false);
});

test('error starts null', () => {
  const { result } = renderHook(() => useAudioAnalyzer());
  expect(result.current.error).toBeNull();
});

test('colorState starts null', () => {
  const { result } = renderHook(() => useAudioAnalyzer());
  expect(result.current.colorState).toBeNull();
});
