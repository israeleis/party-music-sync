import { renderHook } from '@testing-library/react-native';
import { useSync } from '../hooks/useSync';

// Mock SyncManager
jest.mock('@partylight/core', () => ({
  SyncManager: jest.fn().mockImplementation(() => ({
    createRoom: jest.fn(),
    joinRoom: jest.fn(),
    publishFrame: jest.fn(),
    destroy: jest.fn(),
  })),
}));

test('mode starts as off', () => {
  const { result } = renderHook(() => useSync());
  expect(result.current.mode).toBe('off');
});

test('roomCode starts as null', () => {
  const { result } = renderHook(() => useSync());
  expect(result.current.roomCode).toBeNull();
});

test('connected starts as false', () => {
  const { result } = renderHook(() => useSync());
  expect(result.current.connected).toBe(false);
});
