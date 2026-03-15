import { renderHook } from '@testing-library/react';
import { useSync } from '../hooks/useSync';

// Mock WebSocket to prevent real connection attempts
beforeAll(() => {
  global.WebSocket = class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 3;
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((e: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    send() {}
    close() {}
  } as any;
});

test('mode starts off', () => {
  const { result } = renderHook(() => useSync());
  expect(result.current.mode).toBe('off');
});

test('roomCode starts null', () => {
  const { result } = renderHook(() => useSync());
  expect(result.current.roomCode).toBeNull();
});

test('connected starts false', () => {
  const { result } = renderHook(() => useSync());
  expect(result.current.connected).toBe(false);
});
